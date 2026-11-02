import { describe, expect, it } from 'vitest';
import { createGame, kickoff } from '../../src/domain/game';
import { addGoal, scorerLabel, setScorer } from '../../src/domain/goals';
import type { Game, NewGameInput, Player } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const input: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach E1',
  opponent: 'TSV Musterstadt',
  venue: 'home',
  schema: { sections: 2, sectionMinutes: 25 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};
let n = 0;
const ids = () => `goal-${++n}`;

function withGoals(): Game {
  let g = kickoff(createGame(input, { id: 'g', now: T0 }), T0);
  g = addGoal(g, 'own', T0 + 60_000, ids).game;
  g = addGoal(g, 'opp', T0 + 120_000, ids).game;
  return g;
}
const players: Player[] = [
  { id: 'p1', name: 'Max', number: 7, deletedAt: null },
  { id: 'p2', name: 'Ben', number: 3, deletedAt: Date.UTC(2026, 10, 8) },
];

describe('T058 FR-009 Torschützen', () => {
  it('US3-S1 eigener Torschütze aus dem Kader', () => {
    const g = withGoals();
    const own = g.goals[0]!;
    const r = setScorer(g, own.id, { kind: 'player', playerId: 'p1' });
    expect(r.goals[0]?.scorer).toEqual({ kind: 'player', playerId: 'p1' });
    expect(scorerLabel(r.goals[0]!, players)).toBe('Max');
  });

  it('Spieler nur für eigene Tore, Freitext nur für Gegentore', () => {
    const g = withGoals();
    const [own, opp] = g.goals;
    expect(setScorer(g, opp!.id, { kind: 'player', playerId: 'p1' })).toBe(g);
    expect(setScorer(g, own!.id, { kind: 'text', text: 'Nr. 9' })).toBe(g);
    expect(setScorer(g, opp!.id, { kind: 'ownGoal' })).toBe(g);
    expect(setScorer(g, 'gibt-es-nicht', null)).toBe(g);
  });

  it('US3-S4 Gegentor: Freitext getrimmt, max. 30 Zeichen, leer bedeutet ohne', () => {
    const g = withGoals();
    const opp = g.goals[1]!;
    expect(setScorer(g, opp.id, { kind: 'text', text: '  Nr. 9 ' }).goals[1]?.scorer).toEqual({
      kind: 'text',
      text: 'Nr. 9',
    });
    expect(setScorer(g, opp.id, { kind: 'text', text: 'x'.repeat(31) })).toBe(g);
    expect(setScorer(g, opp.id, { kind: 'text', text: '   ' }).goals[1]?.scorer).toBeNull();
  });

  it('US3-S5 Eigentor des Gegners zählt für Feuerbach', () => {
    const g = withGoals();
    const r = setScorer(g, g.goals[0]!.id, { kind: 'ownGoal' });
    expect(scorerLabel(r.goals[0]!, players)).toBe('Eigentor');
  });

  it('Torschütze entfernen', () => {
    const base = withGoals();
    const id = base.goals[0]!.id;
    const g = setScorer(base, id, { kind: 'player', playerId: 'p1' });
    expect(g.goals[0]?.scorer).not.toBeNull();
    expect(setScorer(g, id, null).goals[0]?.scorer).toBeNull();
  });

  it('US5-S6 gelöschte Spieler bleiben als Torschütze lesbar; unbekannte ID zeigt Platzhalter', () => {
    const g = withGoals();
    const goal = { ...g.goals[0]!, scorer: { kind: 'player' as const, playerId: 'p2' } };
    expect(scorerLabel(goal, players)).toBe('Ben');
    expect(scorerLabel({ ...goal, scorer: { kind: 'player', playerId: 'x' } }, players)).toBe('?');
    expect(scorerLabel({ ...goal, scorer: null }, players)).toBe('');
    expect(scorerLabel({ ...goal, scorer: { kind: 'text', text: 'Nr. 9' } }, players)).toBe('Nr. 9');
  });
});
