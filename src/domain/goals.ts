import { deriveClock } from './clock';
import { formatMinute } from './minute';
import type { Game, Goal, Score, Side, Venue } from './types';

/** Doppeltipp-Schutz (UI-Vertrag): zweiter Tap derselben Seite innerhalb 1,5 s zählt nicht. */
export const DOUBLE_TAP_MS = 1500;

export interface AddGoalResult {
  game: Game;
  added: boolean;
  goal?: Goal;
  reason?: 'locked' | 'double';
}

const defaultId = (): string => globalThis.crypto.randomUUID();

/** FR-004, FR-021: Tor mit Minute aus der Uhr; nur bei laufender oder angehaltener Uhr. */
export function addGoal(game: Game, side: Side, now: number, newId: () => string = defaultId): AddGoalResult {
  const clock = deriveClock(game.clockEvents, now, game.schema);
  if (clock.status !== 'running' && clock.status !== 'paused') return { game, added: false, reason: 'locked' };
  const recent = game.goals.some((g) => g.side === side && g.deletedAt === null && now - g.at < DOUBLE_TAP_MS);
  if (recent) return { game, added: false, reason: 'double' };
  const goal: Goal = {
    id: newId(),
    side,
    at: now,
    section: clock.section,
    minute: clock.minute,
    stoppage: clock.stoppage,
    scorer: null,
    deletedAt: null,
  };
  return { game: { ...game, goals: [...game.goals, goal] }, added: true, goal };
}

/** US1-S4: Rückgängig direkt nach der Erfassung entfernt das Tor vollständig (Verklicken). */
export function undoGoal(game: Game, goalId: string): Game {
  return { ...game, goals: game.goals.filter((g) => g.id !== goalId) };
}

const patchGoal = (game: Game, goalId: string, patch: Partial<Goal>): Game => ({
  ...game,
  goals: game.goals.map((g) => (g.id === goalId ? { ...g, ...patch } : g)),
});

/** FR-008: Tor entfernen; bleibt durchgestrichen sichtbar und zählt nicht. */
export const removeGoal = (game: Game, goalId: string, now: number): Game =>
  patchGoal(game, goalId, { deletedAt: now });

/** FR-008: entferntes Tor wiederherstellen. */
export const restoreGoal = (game: Game, goalId: string): Game => patchGoal(game, goalId, { deletedAt: null });

export function score(game: Game): Score {
  const active = game.goals.filter((g) => g.deletedAt === null);
  return { own: active.filter((g) => g.side === 'own').length, opp: active.filter((g) => g.side === 'opp').length };
}

export function homeAway(venue: Venue, s: Score): { home: number; away: number } {
  return venue === 'home' ? { home: s.own, away: s.opp } : { home: s.opp, away: s.own };
}

export interface GoalRow {
  goal: Goal;
  label: string;
  /** Stand nach diesem Tor aus Heimsicht, "" bei entfernten Toren. */
  score: string;
  removed: boolean;
}

/** FR-034: alle Tore, neuestes oben, mit laufendem Stand (Heim:Gast). */
export function goalRows(game: Game): GoalRow[] {
  const running: Score = { own: 0, opp: 0 };
  const rows = game.goals.map((goal) => {
    const removed = goal.deletedAt !== null;
    if (!removed) running[goal.side] += 1;
    const ha = homeAway(game.venue, running);
    return {
      goal,
      label: formatMinute(goal.minute, goal.stoppage),
      score: removed ? '' : `${ha.home}:${ha.away}`,
      removed,
    };
  });
  return rows.reverse();
}
