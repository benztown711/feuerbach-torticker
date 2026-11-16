import { describe, expect, it } from 'vitest';
import { createGame, endSection, kickoff, pauseClock } from '../../src/domain/game';
import { addGoal, removeGoal, setAssist, setScorer } from '../../src/domain/goals';
import { buildShareText, markShared, needsReshare, oppSymbol, shareBlocks } from '../../src/domain/share-text';
import type { Game, NewGameInput, Player, Side } from '../../src/domain/types';

/** Samstag, 07.11.2026, 10:30 Uhr in Stuttgart. */
const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const sec = (n: number): number => n * 1000;
const min = (n: number): number => n * 60_000;
const TZ = 'Europe/Berlin';
const M = '```';

const players: Player[] = [
  { id: 'p-max', name: 'Max', number: 7, deletedAt: null },
  { id: 'p-ben', name: 'Ben', number: 9, deletedAt: null },
  { id: 'p-tom', name: 'Tom', number: 3, deletedAt: null },
  { id: 'p-leo', name: 'Leo', number: 4, deletedAt: null },
];

const base: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach',
  opponent: 'TSV Musterstadt',
  venue: 'away',
  schema: { sections: 2, sectionMinutes: 25 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};

let n = 0;
const ids = () => `goal-${++n}`;

function goal(game: Game, side: Side, at: number, who?: string): Game {
  const r = addGoal(game, side, at, ids);
  if (!r.goal) throw new Error('Tor nicht erfasst');
  if (who === undefined) return r.game;
  const scorer =
    who === 'Eigentor'
      ? ({ kind: 'ownGoal' } as const)
      : who.startsWith('p-')
        ? ({ kind: 'player', playerId: who } as const)
        : ({ kind: 'text', text: who } as const);
  return setScorer(r.game, r.goal.id, scorer);
}

/** Zeilen zwischen ``` und ```. */
const table = (text: string): string[] => {
  const lines = text.split('\n');
  const a = lines.indexOf(M);
  const b = lines.lastIndexOf(M);
  return a >= 0 && b > a ? lines.slice(a + 1, b) : [];
};

/** Mockup-Beispiel: Heimspiel E1, 2 × 25, 7:4 (3:2). */
function mockupGame(): Game {
  let g = kickoff(createGame({ ...base, ownTeam: 'Sportvg Feuerbach E1', venue: 'home' }, { id: 'm', now: T0 }), T0);
  const at = (m: number): number => T0 + min(m) + sec(10);
  g = goal(g, 'own', at(3), 'p-max');
  g = goal(g, 'opp', at(8));
  g = goal(g, 'own', at(13), 'p-ben');
  g = goal(g, 'own', at(20), 'p-max');
  g = goal(g, 'opp', at(23), 'Nr. 9');
  g = endSection(g, T0 + min(25));
  g = kickoff(g, T0 + min(30));
  g = goal(g, 'own', at(32), 'p-tom');
  g = goal(g, 'opp', at(37));
  g = goal(g, 'own', at(42), 'p-max');
  g = goal(g, 'own', at(45), 'p-leo');
  g = goal(g, 'opp', at(50));
  g = goal(g, 'own', T0 + min(55) + sec(30), 'p-ben');
  return endSection(g, T0 + min(56));
}

describe('005 FR-S01 bis FR-S06 Teilen-Text als Anzeigetafel (contracts/share-text.md)', () => {
  it('005 US1-S1 US1-S2 US1-S4 Mockup-Beispiel exakt: Kopf, Halbzeit, Datum, Tabelle, Torschützen', () => {
    expect(buildShareText(mockupGame(), players, TZ)).toBe(
      [
        '*Sportvg Feuerbach E1 7:4 TSV Musterstadt*',
        'Halbzeit 3:2',
        'Sa, 07.11.2026, 10:30 Uhr',
        M,
        "🔴    4'  1:0  Max",
        "⚫    9'  1:1",
        "🔴   14'  2:1  Ben",
        "🔴   21'  3:1  Max",
        "⚫   24'  3:2  Nr. 9",
        '··· Halbzeit ···',
        "🔴   28'  4:2  Tom",
        "⚫   33'  4:3",
        "🔴   38'  5:3  Max",
        "🔴   41'  6:3  Leo",
        "⚫   46'  6:4",
        "🔴 50+1'  7:4  Ben",
        M,
        '*Torschützen*',
        'Max ⚽⚽⚽ · Ben ⚽⚽ · Tom ⚽ · Leo ⚽',
      ].join('\n'),
    );
  });

  it('005 US1-S3 Auswärtsspiel: Heim zuerst, Stände Heim:Gast; Eigentor des Gegners zählt nicht als Torschütze', () => {
    let g = kickoff(createGame(base, { id: 'g', now: T0 - min(5) }), T0);
    g = goal(g, 'own', T0 + min(6) + sec(30), 'p-max');
    g = goal(g, 'opp', T0 + min(17) + sec(10), 'Nr. 9');
    g = endSection(g, T0 + min(25));
    g = kickoff(g, T0 + min(30));
    g = goal(g, 'own', T0 + min(35) + sec(10), 'p-ben');
    g = goal(g, 'own', T0 + min(56) + sec(30), 'Eigentor');
    g = endSection(g, T0 + min(57));
    expect(buildShareText(g, players, TZ)).toBe(
      [
        '*TSV Musterstadt 1:3 Sportvg Feuerbach*',
        'Halbzeit 1:1',
        'Sa, 07.11.2026, 10:30 Uhr',
        M,
        "🔴    7'  0:1  Max",
        "⚫   18'  1:1  Nr. 9",
        '··· Halbzeit ···',
        "🔴   31'  1:2  Ben",
        "🔴 50+2'  1:3  Eigentor",
        M,
        '*Torschützen*',
        'Max ⚽ · Ben ⚽',
      ].join('\n'),
    );
  });

  it('005 US1-S5 ohne Tore nur die Kopfzeilen; Trennzeilen allein ergeben keine Tabelle', () => {
    let one = kickoff(createGame({ ...base, schema: { sections: 1, sectionMinutes: 12 } }, { id: 'o', now: T0 }), T0);
    one = endSection(one, T0 + min(12));
    expect(buildShareText(one, players, TZ)).toBe('*TSV Musterstadt 0:0 Sportvg Feuerbach*\nSa, 07.11.2026, 10:30 Uhr');
    let two = kickoff(createGame(base, { id: 't', now: T0 }), T0);
    two = endSection(kickoff(endSection(two, T0 + min(25)), T0 + min(30)), T0 + min(55));
    expect(buildShareText(two, players, TZ)).toBe(
      '*TSV Musterstadt 0:0 Sportvg Feuerbach*\nHalbzeit 0:0\nSa, 07.11.2026, 10:30 Uhr',
    );
  });

  it('entfernte Tore fehlen, der laufende Stand zählt sie nicht', () => {
    let g = kickoff(
      createGame({ ...base, venue: 'home', schema: { sections: 1, sectionMinutes: 12 } }, { id: 'e', now: T0 }),
      T0,
    );
    const r = addGoal(g, 'own', T0 + min(1), ids);
    g = goal(r.game, 'opp', T0 + min(2));
    g = removeGoal(g, r.goal!.id, T0 + min(3));
    g = endSection(g, T0 + min(12));
    expect(table(buildShareText(g, players, TZ))).toEqual(["⚫ 3'  0:1"]);
  });

  it('ohne Anpfiff: nur Wochentag und Datum (Anlegezeit)', () => {
    const g = createGame(base, { id: 'n', now: T0 });
    expect(buildShareText(g, players, TZ).split('\n')[1]).toBe('Sa, 07.11.2026');
    expect(buildShareText(g, players).split('\n')[1]).toMatch(/^\S\S, \d\d\.\d\d\.2026$/);
  });

  it('Spaltenbreiten richten sich nach dem Spiel (zweistelliger Stand)', () => {
    let g = kickoff(
      createGame({ ...base, venue: 'home', schema: { sections: 1, sectionMinutes: 12 } }, { id: 'w', now: T0 }),
      T0,
    );
    for (let i = 0; i < 10; i++) g = goal(g, 'own', T0 + min(i) + sec(10), 'p-max');
    g = goal(g, 'opp', T0 + min(10) + sec(10));
    const rows = table(buildShareText(g, players, TZ));
    expect(rows[0]).toBe("🔴  1'  1:0   Max");
    expect(rows[9]).toBe("🔴 10'  10:0  Max");
    expect(rows[10]).toBe("⚫ 11'  10:1");
    expect(buildShareText(g, players, TZ).split('\n').at(-1)).toBe(`Max ${'⚽'.repeat(10)}`);
  });

  it('mehr als zwei Abschnitte: Trennzeilen heißen wie die Abschnitte', () => {
    let g = kickoff(
      createGame({ ...base, venue: 'home', schema: { sections: 3, sectionMinutes: 20 } }, { id: 'd', now: T0 }),
      T0,
    );
    g = goal(g, 'own', T0 + min(5));
    g = kickoff(endSection(g, T0 + min(20)), T0 + min(25));
    g = kickoff(endSection(g, T0 + min(45)), T0 + min(50));
    g = goal(g, 'opp', T0 + min(55));
    expect(table(buildShareText(g, players, TZ))).toEqual([
      "🔴  6'  1:0",
      '··· 2. Drittel ···',
      '··· 3. Drittel ···',
      "⚫ 46'  1:1",
    ]);
  });

  it('005 US1-S7 FR-S04 Feuerbach immer 🔴; Gegner nach Trikotfarbe, in Rot ⭕', () => {
    let g = kickoff(
      createGame(
        { ...base, venue: 'home', ownColor: 'gelb', oppColor: 'rot', schema: { sections: 1, sectionMinutes: 12 } },
        { id: 'r', now: T0 },
      ),
      T0,
    );
    g = goal(goal(g, 'own', T0 + min(1)), 'opp', T0 + min(2));
    expect(table(buildShareText(g, players, TZ))).toEqual(["🔴 2'  1:0", "⭕ 3'  1:1"]);
    const colors = [
      'rot',
      'schwarz',
      'weiss',
      'grau',
      'gelb',
      'orange',
      'gruen',
      'hellblau',
      'blau',
      'dunkelblau',
      'lila',
      'bordeaux',
      'pink',
    ];
    expect(colors.map(oppSymbol)).toEqual([
      '⭕',
      '⚫',
      '⚪',
      '⚪',
      '🟡',
      '🟠',
      '🟢',
      '🔵',
      '🔵',
      '🔵',
      '🟣',
      '🟤',
      '⚪',
    ]);
  });
});

describe('005 US4 FR-042 Zwischenstand teilen', () => {
  const home = { ...base, venue: 'home' as const };
  const lines = (g: Game, now?: number): string[] => buildShareText(g, players, TZ, now).split('\n');

  it('005 US4-S1 laufend: Zusatz mit angefangener Minute, keine Datumszeile, Tabelle wie beim Ergebnis', () => {
    let g = kickoff(createGame(home, { id: 'z1', now: T0 }), T0);
    g = goal(g, 'own', T0 + min(6) + sec(10));
    expect(lines(g, T0 + min(16) + sec(5))).toEqual([
      '*Sportvg Feuerbach 1:0 TSV Musterstadt*',
      "Zwischenstand 17'",
      M,
      "🔴 7'  1:0",
      M,
    ]);
  });

  it('FR-042 Nachspielzeit und angehaltene Uhr', () => {
    let g = kickoff(createGame(home, { id: 'z2', now: T0 }), T0);
    expect(lines(g, T0 + min(26) + sec(30))[1]).toBe("Zwischenstand 25+2'");
    g = pauseClock(g, T0 + min(10) + sec(30));
    expect(lines(g, T0 + min(20))[1]).toBe("Zwischenstand 11'");
  });

  it('005 US4-S2 Halbzeit ohne Halbzeitstand; 2. Halbzeit mit Halbzeitstand', () => {
    let g = kickoff(createGame(home, { id: 'z3', now: T0 }), T0);
    g = goal(g, 'opp', T0 + min(3));
    g = endSection(g, T0 + min(25));
    expect(lines(g, T0 + min(30)).slice(0, 2)).toEqual(['*Sportvg Feuerbach 0:1 TSV Musterstadt*', 'Halbzeit']);
    g = kickoff(g, T0 + min(35));
    expect(lines(g, T0 + min(40))[1]).toBe("Zwischenstand 31' · Halbzeit 0:1");
  });

  it('005 US4-S2 Pause bei mehr als zwei Abschnitten', () => {
    let g = kickoff(createGame({ ...home, schema: { sections: 3, sectionMinutes: 20 } }, { id: 'z4', now: T0 }), T0);
    g = endSection(g, T0 + min(20));
    expect(lines(g, T0 + min(22))[1]).toBe('Pause');
  });

  it('kein Zusatz vor dem Anpfiff und nach dem Schlusspfiff, dann mit Datumszeile', () => {
    expect(lines(createGame(home, { id: 'z5', now: T0 }), T0 + min(1))).toEqual([
      '*Sportvg Feuerbach 0:0 TSV Musterstadt*',
      'Sa, 07.11.2026',
    ]);
    let g = kickoff(createGame({ ...home, schema: { sections: 1, sectionMinutes: 12 } }, { id: 'z6', now: T0 }), T0);
    g = endSection(g, T0 + min(12));
    expect(lines(g, T0 + min(15))).toEqual(['*Sportvg Feuerbach 0:0 TSV Musterstadt*', 'Sa, 07.11.2026, 10:30 Uhr']);
  });
});

describe('005 FR-S07 Vorschau wie im Chat', () => {
  it('005 US5-S1 fette Zeilen ohne Sternchen, Tabelle als Block, normale und leere Zeilen bleiben', () => {
    expect(shareBlocks(['*Kopf*', 'Info', M, 'a', 'b', M, '', '*', '*Torschützen*', 'Max ⚽'].join('\n'))).toEqual([
      { kind: 'line', text: 'Kopf', bold: true },
      { kind: 'line', text: 'Info', bold: false },
      { kind: 'mono', lines: ['a', 'b'] },
      { kind: 'line', text: '', bold: false },
      { kind: 'line', text: '*', bold: false },
      { kind: 'line', text: 'Torschützen', bold: true },
      { kind: 'line', text: 'Max ⚽', bold: false },
    ]);
    expect(shareBlocks(`x\n${M}\nc`)).toEqual([
      { kind: 'line', text: 'x', bold: false },
      { kind: 'mono', lines: ['c'] },
    ]);
  });
});

describe('009 FR-V07 Vorlage im Teilen-Text', () => {
  /** Heimspiel 1 × 12: Max mit Vorlage Ben (3'), Gegentor (5'), Tom ohne Vorlage (8'). */
  function withAssist(): Game {
    let g = kickoff(
      createGame({ ...base, venue: 'home', schema: { sections: 1, sectionMinutes: 12 } }, { id: 'v', now: T0 }),
      T0,
    );
    g = goal(g, 'own', T0 + min(2) + sec(10), 'p-max');
    g = setAssist(g, g.goals[0]!.id, 'p-ben');
    g = goal(g, 'opp', T0 + min(4));
    return goal(g, 'own', T0 + min(7), 'p-tom');
  }

  it('009 US3-S1 Zeile des Tores "Max (Vorlage: Ben)", ohne Rückennummer', () => {
    const g = endSection(withAssist(), T0 + min(12));
    expect(table(buildShareText(g, players, TZ))).toEqual([
      "🔴 3'  1:0  Max (Vorlage: Ben)",
      "⚫ 5'  1:1",
      "🔴 8'  2:1  Tom",
    ]);
  });

  it('009 US3-S2 Zeile "Torschützen" unverändert, keine eigene Zeile für Vorlagen', () => {
    const lines = buildShareText(endSection(withAssist(), T0 + min(12)), players, TZ).split('\n');
    expect(lines.slice(-2)).toEqual(['*Torschützen*', 'Max ⚽ · Tom ⚽']);
    expect(lines.filter((l) => l.includes('Vorlage'))).toHaveLength(1);
  });

  it('Zwischenstand enthält die Vorlage; entfernte Tore samt Vorlage fehlen', () => {
    const g = withAssist();
    expect(table(buildShareText(g, players, TZ, T0 + min(9)))[0]).toBe("🔴 3'  1:0  Max (Vorlage: Ben)");
    const removed = endSection(removeGoal(g, g.goals[0]!.id, T0 + min(9)), T0 + min(12));
    expect(buildShareText(removed, players, TZ)).not.toContain('Vorlage');
  });
});

describe('017 FR-C20 FR-C21 Erinnerung an neues Teilen', () => {
  const finished = (): Game => {
    let g = kickoff(createGame(base, { id: 'g-share', now: T0 }), T0);
    g = goal(g, 'own', T0 + min(2), 'p-max');
    g = goal(g, 'opp', T0 + min(4));
    g = endSection(g, T0 + min(26));
    g = kickoff(g, T0 + min(36));
    return endSection(g, T0 + min(62));
  };

  it('markShared merkt den Zeitpunkt des Teilens', () => {
    expect(markShared(finished(), T0 + min(70)).sharedAt).toBe(T0 + min(70));
  });

  it('nach dem Teilen: Leiste, wenn sich der Text ändert', () => {
    const before = markShared(finished(), T0 + min(70));
    const after = setScorer(before, before.goals[0]!.id, { kind: 'player', playerId: 'p-ben' });
    expect(needsReshare(before, after, players)).toBe(true);
    expect(needsReshare(before, { ...before, oppColor: 'blau' }, players)).toBe(true);
  });

  it('keine Leiste ohne Textänderung, vor dem Teilen und bei laufendem Spiel', () => {
    const shared = markShared(finished(), T0 + min(70));
    expect(needsReshare(shared, { ...shared, ownColor: 'gelb' }, players)).toBe(false);
    const unshared = finished();
    const changed = setScorer(unshared, unshared.goals[0]!.id, null);
    expect(needsReshare(unshared, changed, players)).toBe(false);
    const running = markShared(kickoff(createGame(base, { id: 'g-run', now: T0 }), T0), T0 + min(5));
    expect(needsReshare(running, goal(running, 'own', T0 + min(6)), players)).toBe(false);
  });
});
