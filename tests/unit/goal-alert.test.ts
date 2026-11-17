import { describe, expect, it } from 'vitest';
import { goalSpeech, goalTitle, latestGoal, newGoals, type GoalAlert } from '../../src/domain/goal-alert';
import type { GoalLine } from '../../src/domain/live-board';

/** Spec 020 US3 (FR-E21 bis FR-E23): neue Tore erkennen, Titel und Ansage. */

const NOW = 1_000_000;
const line = (score: string, p: Partial<GoalLine> = {}): GoalLine => ({
  side: 'own',
  minute: "6'",
  score,
  who: 'Tom',
  team: 'Feuerbach E1',
  scorer: 'Tom',
  ...p,
});
const card = (gameId: string, goals: GoalLine[], updatedAt = NOW - 1000) => ({ gameId, goals, updatedAt });
const counts = (...e: [string, number][]): Map<string, number> => new Map(e);

describe('020 US3 FR-E21 newGoals', () => {
  const two = [line('2:1'), line('1:1', { side: 'opp', team: 'TSV Musterstadt', scorer: null }), line('1:0')];

  it('020 US3-S7 erstes Laden (prev = null) meldet nichts', () => {
    expect(newGoals(null, [card('g1', two)], NOW)).toEqual([]);
  });

  it('020 US3-S1 gestiegene Toranzahl mit frischer Meldung ergibt das neueste Tor', () => {
    const got = newGoals(counts(['g1', 3]), [card('g1', [line('3:1'), ...two])], NOW);
    expect(got).toEqual([{ gameId: 'g1', team: 'Feuerbach E1', score: '3:1', scorer: 'Tom', at: NOW - 1000 }]);
  });

  it('020 US3-S7 Meldung älter als 60 Sekunden (nachgeholt) meldet nichts, genau 60 Sekunden ebenso', () => {
    const goals = [line('3:1'), ...two];
    expect(newGoals(counts(['g1', 3]), [card('g1', goals, NOW - 61_000)], NOW)).toEqual([]);
    expect(newGoals(counts(['g1', 3]), [card('g1', goals, NOW - 60_000)], NOW)).toEqual([]);
    expect(newGoals(counts(['g1', 3]), [card('g1', goals, NOW - 59_000)], NOW)).toHaveLength(1);
  });

  it('020 US3-S8 Korrektur (gleiche Anzahl) und Entfernen (kleinere Anzahl) melden nichts', () => {
    expect(newGoals(counts(['g1', 3]), [card('g1', [line('2:1', { scorer: 'Ben' }), ...two.slice(1)])], NOW)).toEqual(
      [],
    );
    expect(newGoals(counts(['g1', 4]), [card('g1', two)], NOW)).toEqual([]);
  });

  it('020 US3-S7 neu erscheinendes Spiel meldet nichts', () => {
    expect(newGoals(counts(['g1', 3]), [card('g1', two), card('g2', [line('1:0')])], NOW)).toEqual([]);
  });

  it('Karten ohne Tore bleiben still', () => {
    expect(newGoals(counts(['g1', 0], ['g2', 0]), [card('g1', []), card('g2', [])], NOW)).toEqual([]);
  });

  it('zwei Spiele gleichzeitig: zwei Tore in der Reihenfolge der Karten', () => {
    const got = newGoals(
      counts(['a', 0], ['b', 1]),
      [card('a', [line('1:0')]), card('b', [line('2:0'), line('1:0')], NOW - 500)],
      NOW,
    );
    expect(got.map((g) => g.gameId)).toEqual(['a', 'b']);
  });
});

const alert = (p: Partial<GoalAlert> = {}): GoalAlert => ({
  gameId: 'g1',
  team: 'Feuerbach E1',
  score: '3:1',
  scorer: 'Tom',
  at: 1,
  ...p,
});

describe('020 US3 FR-E22 goalTitle', () => {
  it('020 US3-S1 "Tor! Feuerbach E1 3:1", auch für den Gegner', () => {
    expect(goalTitle(alert())).toBe('Tor! Feuerbach E1 3:1');
    expect(goalTitle(alert({ team: 'TSV Musterstadt', score: '3:2' }))).toBe('Tor! TSV Musterstadt 3:2');
  });

  it('das zuletzt gemeldete Tor bestimmt den Titel, bei gleichem Zeitpunkt das spätere', () => {
    const a = alert({ gameId: 'a', at: 5 });
    const b = alert({ gameId: 'b', at: 9 });
    const c = alert({ gameId: 'c', at: 9 });
    expect(latestGoal([a, b, c])).toBe(c);
    expect(latestGoal([b, a])).toBe(b);
    expect(latestGoal([a])).toBe(a);
  });
});

describe('020 US3 FR-E23 goalSpeech', () => {
  it('020 US3-S3 mit Torschütze, ohne Torschütze und Eigentor', () => {
    expect(goalSpeech(alert())).toBe('Tor für Feuerbach E1, 3 zu 1, Tom');
    expect(goalSpeech(alert({ team: 'TSV Musterstadt', score: '3:2', scorer: null }))).toBe(
      'Tor für TSV Musterstadt, 3 zu 2',
    );
    expect(goalSpeech(alert({ scorer: 'Eigentor' }))).toBe('Tor für Feuerbach E1, 3 zu 1, Eigentor');
  });
});
