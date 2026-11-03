import { describe, expect, it } from 'vitest';
import { clockOf, createGame, endSection, kickoff, sectionLabel } from '../../src/domain/game';
import {
  addShot,
  canExtraTime,
  endShootout,
  needsDrawDecision,
  settleDraw,
  shootoutState,
  startExtraTime,
  startShootout,
  undoShot,
} from '../../src/domain/cup';
import { addGoal, setScorer } from '../../src/domain/goals';
import { historyEntry } from '../../src/domain/history';
import { minuteFor, sectionMinutesOf, totalSections } from '../../src/domain/minute';
import { buildShareText } from '../../src/domain/share-text';
import type { Game, NewGameInput, Player, Side } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const min = (n: number): number => n * 60_000;
const TZ = 'Europe/Berlin';
const players: Player[] = [{ id: 'p-max', name: 'Max', number: 7, deletedAt: null }];
const base: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach U11',
  opponent: 'TSV Musterstadt',
  venue: 'home',
  schema: { sections: 2, sectionMinutes: 25 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};
let n = 0;
const ids = (): string => `g-${++n}`;
const goal = (g: Game, side: Side, at: number): Game => addGoal(g, side, at, ids).game;

/** 2 × 25, 1:1 zur Halbzeit, 2:2 am Ende (Schlusspfiff bei T0 + 55 min). */
function draw22(): Game {
  let g = kickoff(createGame(base, { id: 'g', now: T0 }), T0);
  g = goal(g, 'own', T0 + min(6));
  g = goal(g, 'opp', T0 + min(17));
  g = endSection(g, T0 + min(25));
  g = kickoff(g, T0 + min(30));
  g = goal(g, 'own', T0 + min(36));
  g = goal(g, 'opp', T0 + min(49));
  return endSection(g, T0 + min(55));
}

describe('003 FR-P01 Abfrage bei Unentschieden', () => {
  it('003 US5-S1 US5-S2 nur bei Unentschieden; "Unentschieden" beendet die Abfrage', () => {
    const g = draw22();
    expect(needsDrawDecision(g)).toBe(true);
    expect(canExtraTime(g)).toBe(true);
    expect(needsDrawDecision(settleDraw(g))).toBe(false);
    const won = endSection(
      goal(
        kickoff(
          endSection(goal(kickoff(createGame(base, { id: 'w', now: T0 }), T0), 'own', T0 + min(3)), T0 + min(25)),
          T0 + min(30),
        ),
        'own',
        T0 + min(31),
      ),
      T0 + min(55),
    );
    expect(needsDrawDecision(won)).toBe(false);
    const running = kickoff(createGame(base, { id: 'r', now: T0 }), T0);
    expect(needsDrawDecision(running)).toBe(false);
  });
});

describe('003 FR-P02 Verlängerung', () => {
  it('003 US5-S3 2 × 10 Minuten: Minuten ab 51, Nachspielzeit "60+1\'", Bezeichnungen', () => {
    let g = startExtraTime(draw22(), 10, T0 + min(57));
    expect(g.schema).toEqual({ sections: 2, sectionMinutes: 25, extraMinutes: 10 });
    expect(totalSections(g.schema)).toBe(4);
    expect(sectionMinutesOf(g.schema, 3)).toBe(10);
    expect(g.status).toBe('break');
    expect(canExtraTime(g)).toBe(false);
    expect(needsDrawDecision(g)).toBe(false);
    expect(clockOf(g, T0 + min(57)).kickoffSection).toBe(3);
    expect(sectionLabel(3, 2)).toBe('1. Hälfte Verlängerung');
    expect(sectionLabel(4, 2)).toBe('2. Hälfte Verlängerung');
    g = kickoff(g, T0 + min(58));
    expect(clockOf(g, T0 + min(58) + 1000).minute).toBe(51);
    expect(clockOf(g, T0 + min(68) + 30_000)).toMatchObject({ minute: 60, stoppage: 1 });
    expect(minuteFor(4, min(2), g.schema)).toMatchObject({ minute: 63, stoppage: null });
    g = goal(g, 'own', T0 + min(63));
    expect(g.goals.at(-1)).toMatchObject({ section: 3, minute: 56 });
    g = endSection(g, T0 + min(68));
    expect(g.status).toBe('break');
    g = kickoff(g, T0 + min(69));
    g = endSection(g, T0 + min(79));
    expect(g.status).toBe('finished');
    expect(g.finalScore).toEqual({ own: 3, opp: 2 });
  });

  it('003 US5-S4 005 US3-S1 Teilen-Text "nach Verlängerung"; US5-S5 nach Unentschieden in der Verlängerung nur noch Elfmeterschießen', () => {
    let g = kickoff(startExtraTime(draw22(), 10, T0 + min(56)), T0 + min(57));
    g = goal(g, 'own', T0 + min(60));
    g = kickoff(endSection(g, T0 + min(67)), T0 + min(68));
    g = endSection(g, T0 + min(78));
    expect(buildShareText(g, [], TZ)).toBe(
      [
        '*Sportvg Feuerbach U11 3:2 TSV Musterstadt*',
        'nach Verlängerung · Halbzeit 1:1',
        'Sa, 07.11.2026, 10:30 Uhr',
        '```',
        "🔴  7'  1:0",
        "⚫ 18'  1:1",
        '··· Halbzeit ···',
        "🔴 32'  2:1",
        "⚫ 45'  2:2",
        '··· Verlängerung ···',
        "🔴 54'  3:2",
        '```',
      ].join('\n'),
    );
    let d = kickoff(startExtraTime(draw22(), 5, T0 + min(56)), T0 + min(57));
    d = kickoff(endSection(d, T0 + min(62)), T0 + min(63));
    d = endSection(d, T0 + min(68));
    expect(needsDrawDecision(d)).toBe(true);
    expect(canExtraTime(d)).toBe(false);
  });

  it('nur nach Unentschieden und nur einmal; Zwischenstand in der Pause vor der Verlängerung', () => {
    expect(() => startExtraTime(kickoff(createGame(base, { id: 'x', now: T0 }), T0), 10, T0)).toThrow();
    const g = startExtraTime(draw22(), 15, T0 + min(56));
    expect(() => startExtraTime(g, 10, T0 + min(57))).toThrow();
    expect(
      buildShareText(g, [], TZ, T0 + min(57))
        .split('\n')
        .slice(0, 2),
    ).toEqual(['*Sportvg Feuerbach U11 2:2 TSV Musterstadt*', 'vor der Verlängerung · Halbzeit 1:1']);
    const brk = endSection(kickoff(g, T0 + min(57)), T0 + min(72));
    expect(buildShareText(brk, [], TZ, T0 + min(73)).split('\n')[1]).toBe('Pause · Halbzeit 1:1');
  });
});

describe('003 FR-P03 Elfmeterschießen', () => {
  it('003 US6-S1 abwechselnd, beginnende Mannschaft wählbar; Schütze optional', () => {
    let g = startShootout(draw22(), 'opp');
    expect(shootoutState(g)).toMatchObject({ own: 0, opp: 0, next: 'opp', decided: false });
    g = addShot(g, true, { kind: 'text', text: ' Nr. 7 ' }, T0 + min(60));
    expect(g.shootout?.shots[0]).toEqual({
      side: 'opp',
      hit: true,
      who: { kind: 'text', text: 'Nr. 7' },
      at: T0 + min(60),
    });
    expect(shootoutState(g).next).toBe('own');
    g = addShot(g, false, { kind: 'player', playerId: 'p-ben' }, T0 + min(61));
    expect(shootoutState(g)).toMatchObject({ own: 0, opp: 1, next: 'opp' });
    // ungültig: Spieler beim Gegner wird ohne Namen gespeichert
    g = addShot(g, true, { kind: 'player', playerId: 'p-x' }, T0 + min(62));
    expect(g.shootout?.shots[2]?.who).toBeNull();
  });

  it('003 US6-S2 Rückgängig entfernt den letzten Schuss', () => {
    let g = startShootout(draw22(), 'own');
    g = addShot(g, true, null, T0 + min(60));
    g = undoShot(g);
    expect(g.shootout?.shots).toEqual([]);
    expect(undoShot(g)).toEqual(g);
  });

  it('entschieden, sobald eine Mannschaft nicht mehr aufholen kann; danach keine Schüsse mehr', () => {
    let g = startShootout(draw22(), 'own');
    for (const [hit] of [[true], [false], [true], [false], [true], [false]] as [boolean][])
      g = addShot(g, hit, null, T0);
    expect(shootoutState(g)).toMatchObject({ own: 3, opp: 0, decided: true, winner: 'own' });
    expect(addShot(g, true, null, T0)).toEqual(g);
  });

  it('ohne Elfmeterschießen: leerer Stand; Gegner kann gewinnen', () => {
    expect(shootoutState(draw22())).toEqual({ own: 0, opp: 0, next: 'own', decided: false, winner: null });
    let g = startShootout(draw22(), 'opp');
    for (const hit of [true, false, true, false, true, false]) g = addShot(g, hit, null, T0);
    expect(shootoutState(g)).toMatchObject({ own: 0, opp: 3, decided: true, winner: 'opp' });
  });

  it('Sudden Death nach fünf Schützen je Mannschaft', () => {
    let g = startShootout(draw22(), 'own');
    for (let i = 0; i < 10; i++) g = addShot(g, true, null, T0);
    expect(shootoutState(g)).toMatchObject({ own: 5, opp: 5, decided: false, next: 'own' });
    g = addShot(g, true, null, T0);
    expect(shootoutState(g).decided).toBe(false);
    g = addShot(g, false, null, T0);
    expect(shootoutState(g)).toMatchObject({ own: 6, opp: 5, decided: true, winner: 'own' });
  });

  it('003 US6-S4 005 US3-S2 Siegerzeile und Schussreihen im Teilen-Text, S/N in der Historie; Start nur bei Unentschieden', () => {
    let g = startShootout(draw22(), 'own');
    const seq: boolean[] = [true, true, false, true, true, false, true, true, true, false];
    for (const hit of seq) g = addShot(g, hit, null, T0);
    expect(shootoutState(g)).toMatchObject({ own: 4, opp: 3, decided: true });
    expect(historyEntry(g).result).toBeNull();
    g = endShootout(g);
    const text = buildShareText(g, [], TZ);
    expect(text.split('\n').slice(0, 3)).toEqual([
      '*Sportvg Feuerbach U11 2:2 TSV Musterstadt*',
      '*Feuerbach U11 gewinnt 4:3 im Elfmeterschießen*',
      'Halbzeit 1:1',
    ]);
    expect(text.split('\n').slice(-4)).toEqual([
      '··· Elfmeterschießen ···',
      '🔴 ✅ ❌ ✅ ✅ ✅  4',
      '⚫ ✅ ✅ ❌ ✅ ❌  3',
      '```',
    ]);
    expect(text).not.toContain('Schützen');
    expect(historyEntry(g).result).toBe('S');
    expect(needsDrawDecision(g)).toBe(false);
    const away = { ...g, venue: 'away' as const };
    const awayLines = buildShareText(away, [], TZ).split('\n');
    expect(awayLines.slice(0, 2)).toEqual([
      '*TSV Musterstadt 2:2 Sportvg Feuerbach U11*',
      '*Feuerbach U11 gewinnt 4:3 im Elfmeterschießen*',
    ]);
    expect(awayLines.slice(-3, -1)).toEqual(['⚫ ✅ ✅ ❌ ✅ ❌  3', '🔴 ✅ ❌ ✅ ✅ ✅  4']);
    const lost = endShootout(addShot(addShot(startShootout(draw22(), 'own'), false, null, T0), true, null, T0));
    expect(historyEntry(lost).result).toBe('N');
    expect(buildShareText(lost, [], TZ).split('\n')[1]).toBe('*TSV Musterstadt gewinnt 1:0 im Elfmeterschießen*');
    expect(() => startShootout(g, 'own')).toThrow();
    expect(() => startShootout(kickoff(createGame(base, { id: 'y', now: T0 }), T0), 'own')).toThrow();
    const d = draw22();
    expect(addShot(d, true, null, T0)).toEqual(d);
    expect(undoShot(d)).toEqual(d);
    expect(endShootout(d)).toEqual(d);
  });

  it('005 US3-S3 Schützen unter der Tabelle ("?" ohne Namen), danach Torschützen mit Leerzeile', () => {
    let d = draw22();
    d = setScorer(d, d.goals.find((x) => x.side === 'own')!.id, { kind: 'player', playerId: 'p-max' });
    let g = startShootout(d, 'own');
    g = addShot(g, true, { kind: 'player', playerId: 'p-max' }, T0);
    g = addShot(g, false, { kind: 'text', text: 'Nr. 7' }, T0);
    g = addShot(g, true, null, T0);
    g = endShootout(g);
    const lines = buildShareText(g, players, TZ).split('\n');
    expect(lines[1]).toBe('*Feuerbach U11 gewinnt 2:0 im Elfmeterschießen*');
    expect(lines.slice(-8)).toEqual([
      '··· Elfmeterschießen ···',
      '🔴 ✅ ✅  2',
      '⚫ ❌  0',
      '```',
      'Schützen: Max, ?',
      '',
      '*Torschützen*',
      'Max ⚽',
    ]);
  });

  it('005 US4-S3 laufendes Elfmeterschießen; ohne Entscheidung beendet', () => {
    const running = addShot(startShootout(draw22(), 'own'), true, null, T0);
    const lines = buildShareText(running, [], TZ).split('\n');
    expect(lines[1]).toBe('Halbzeit 1:1 · Elfmeterschießen läuft');
    expect(lines.slice(-4)).toEqual(['··· Elfmeterschießen ···', '🔴 ✅  1', '⚫  0', '```']);
    const undecided = buildShareText(endShootout(startShootout(draw22(), 'own')), [], TZ);
    expect(undecided.split('\n')[1]).toBe('*Elfmeterschießen 0:0*');
    expect(undecided).not.toContain('··· Elfmeterschießen');
  });
});
