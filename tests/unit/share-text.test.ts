import { describe, expect, it } from 'vitest';
import { createGame, endSection, kickoff, pauseClock } from '../../src/domain/game';
import { addGoal, removeGoal, setScorer } from '../../src/domain/goals';
import { buildShareText } from '../../src/domain/share-text';
import type { Game, NewGameInput, Player, Side } from '../../src/domain/types';

/** 07.11.2026, 10:30 Uhr in Stuttgart. */
const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const sec = (n: number): number => n * 1000;
const min = (n: number): number => n * 60_000;
const TZ = 'Europe/Berlin';

const players: Player[] = [
  { id: 'p-max', name: 'Max', number: 7, deletedAt: null },
  { id: 'p-ben', name: 'Ben', number: 9, deletedAt: null },
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

function goal(game: Game, side: Side, at: number): [Game, string] {
  const r = addGoal(game, side, at, ids);
  if (!r.goal) throw new Error('Tor nicht erfasst');
  return [r.game, r.goal.id];
}

/** Beispiel aus contracts/share-text.md: Auswärtsspiel, 2 × 25, 1:3 (1:1). */
function contractExample(): Game {
  let g = kickoff(createGame(base, { id: 'g', now: T0 - min(5) }), T0);
  let id: string;
  [g, id] = goal(g, 'own', T0 + min(6) + sec(30));
  g = setScorer(g, id, { kind: 'player', playerId: 'p-max' });
  [g, id] = goal(g, 'opp', T0 + min(17) + sec(10));
  g = setScorer(g, id, { kind: 'text', text: 'Nr. 9' });
  g = endSection(g, T0 + min(25));
  g = kickoff(g, T0 + min(30));
  [g, id] = goal(g, 'own', T0 + min(35) + sec(10));
  g = setScorer(g, id, { kind: 'player', playerId: 'p-ben' });
  [g, id] = goal(g, 'own', T0 + min(56) + sec(30));
  g = setScorer(g, id, { kind: 'ownGoal' });
  return endSection(g, T0 + min(57));
}

describe('T078 FR-011 Teilen-Text (contracts/share-text.md)', () => {
  it('US4-S1 Beispiel aus dem Vertrag exakt: Heim zuerst, Halbzeitstand, Torschützen', () => {
    expect(buildShareText(contractExample(), players, TZ)).toBe(
      [
        '⚽ TSV Musterstadt - Sportvg Feuerbach 1:3 (1:1)',
        '07.11.2026, Anpfiff 10:30',
        "7' 0:1 Max",
        "18' 1:1 Nr. 9",
        "31' 1:2 Ben",
        "50+2' 1:3 Eigentor",
      ].join('\n'),
    );
  });

  it('Heimspiel: Feuerbach zuerst; Tor ohne Torschützen endet nach dem Stand', () => {
    let g = kickoff(createGame({ ...base, venue: 'home' }, { id: 'h', now: T0 }), T0);
    [g] = goal(g, 'own', T0 + min(3));
    g = endSection(kickoff(endSection(g, T0 + min(25)), T0 + min(30)), T0 + min(55));
    const lines = buildShareText(g, players, TZ).split('\n');
    expect(lines[0]).toBe('⚽ Sportvg Feuerbach - TSV Musterstadt 1:0 (1:0)');
    expect(lines[2]).toBe("4' 1:0");
  });

  it('entfernte Tore fehlen, der laufende Stand zählt sie nicht', () => {
    let g = kickoff(
      createGame({ ...base, venue: 'home', schema: { sections: 1, sectionMinutes: 12 } }, { id: 'e', now: T0 }),
      T0,
    );
    const [withGoal, removed] = goal(g, 'own', T0 + min(1));
    [g] = goal(withGoal, 'opp', T0 + min(2));
    g = removeGoal(g, removed, T0 + min(3));
    g = endSection(g, T0 + min(12));
    expect(buildShareText(g, players, TZ).split('\n').slice(2)).toEqual(["3' 0:1"]);
  });

  it('nur ein Abschnitt: kein Halbzeitstand; ohne Tore nur zwei Zeilen', () => {
    let g = kickoff(createGame({ ...base, schema: { sections: 1, sectionMinutes: 12 } }, { id: 'o', now: T0 }), T0);
    g = endSection(g, T0 + min(12));
    expect(buildShareText(g, players, TZ)).toBe(
      '⚽ TSV Musterstadt - Sportvg Feuerbach 0:0\n07.11.2026, Anpfiff 10:30',
    );
  });

  it('ohne Anpfiff: nur das Datum (Anlegezeit), ohne Uhrzeit', () => {
    const g = createGame(base, { id: 'n', now: T0 });
    expect(buildShareText(g, players, TZ).split('\n')[1]).toBe('07.11.2026');
    expect(buildShareText(g, players).split('\n')[1]).toMatch(/^\d\d\.\d\d\.2026$/);
  });
});

describe('T106 FR-042 Zwischenstand teilen', () => {
  const home = { ...base, venue: 'home' as const };
  const first = (g: Game, now?: number): string => buildShareText(g, players, TZ, now).split('\n')[0] ?? '';

  it('FR-042 laufend: Zusatz mit angefangener Minute, Torzeilen wie beim Ergebnis', () => {
    let g = kickoff(createGame(home, { id: 'z1', now: T0 }), T0);
    [g] = goal(g, 'own', T0 + min(6) + sec(10));
    const text = buildShareText(g, players, TZ, T0 + min(16) + sec(5));
    expect(text.split('\n')[0]).toBe("⚽ Sportvg Feuerbach - TSV Musterstadt 1:0 · Zwischenstand 17'");
    expect(text.split('\n')[2]).toBe("7' 1:0");
  });

  it('FR-042 Nachspielzeit und angehaltene Uhr', () => {
    let g = kickoff(createGame(home, { id: 'z2', now: T0 }), T0);
    expect(first(g, T0 + min(26) + sec(30))).toBe("⚽ Sportvg Feuerbach - TSV Musterstadt 0:0 · Zwischenstand 25+2'");
    g = pauseClock(g, T0 + min(10) + sec(30));
    expect(first(g, T0 + min(20))).toBe("⚽ Sportvg Feuerbach - TSV Musterstadt 0:0 · Zwischenstand 11'");
  });

  it('FR-042 Halbzeit ohne Halbzeitstand; 2. Halbzeit mit Halbzeitstand', () => {
    let g = kickoff(createGame(home, { id: 'z3', now: T0 }), T0);
    [g] = goal(g, 'opp', T0 + min(3));
    g = endSection(g, T0 + min(25));
    expect(first(g, T0 + min(30))).toBe('⚽ Sportvg Feuerbach - TSV Musterstadt 0:1 · Halbzeit');
    g = kickoff(g, T0 + min(35));
    expect(first(g, T0 + min(40))).toBe("⚽ Sportvg Feuerbach - TSV Musterstadt 0:1 (0:1) · Zwischenstand 31'");
  });

  it('FR-042 Pause bei mehr als zwei Abschnitten', () => {
    let g = kickoff(createGame({ ...home, schema: { sections: 3, sectionMinutes: 20 } }, { id: 'z4', now: T0 }), T0);
    g = endSection(g, T0 + min(20));
    expect(first(g, T0 + min(22))).toBe('⚽ Sportvg Feuerbach - TSV Musterstadt 0:0 · Pause');
  });

  it('FR-042 kein Zusatz vor dem Anpfiff und nach dem Schlusspfiff', () => {
    const created = createGame(home, { id: 'z5', now: T0 });
    expect(first(created, T0 + min(1))).toBe('⚽ Sportvg Feuerbach - TSV Musterstadt 0:0');
    let g = kickoff(createGame({ ...home, schema: { sections: 1, sectionMinutes: 12 } }, { id: 'z6', now: T0 }), T0);
    g = endSection(g, T0 + min(12));
    expect(first(g, T0 + min(15))).toBe('⚽ Sportvg Feuerbach - TSV Musterstadt 0:0');
  });
});
