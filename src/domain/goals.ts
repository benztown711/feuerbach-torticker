import { deriveClock } from './clock';
import { formatMinute } from './minute';
import { resolvePlayer } from './roster';
import { shortTeamName } from './team-name';
import type { Game, Goal, Player, Score, Scorer, Side, Venue } from './types';
import { validateOpponentScorerText } from './validation';

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
  if (clock.status !== 'running') return { game, added: false, reason: 'locked' };
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

/** Kaderspieler-ID des Torschützen, sonst null. */
export const scorerPlayerId = (goal: Goal): string | null =>
  goal.scorer?.kind === 'player' ? goal.scorer.playerId : null;

/** Spec 009 FR-V05: Vorlage nur an eigenen Toren mit Spieler als Torschützen und ohne Elfmeter. */
export const canHaveAssist = (goal: Goal): boolean =>
  goal.side === 'own' && scorerPlayerId(goal) !== null && goal.penalty !== true;

/** FR-V05: Eine Vorlage, die nach einer Änderung nicht mehr passt, wird entfernt. */
const validAssist = (goal: Goal): boolean => canHaveAssist(goal) && scorerPlayerId(goal) !== goal.assist;

function withValidAssist(goal: Goal): Goal {
  if (goal.assist == null) return goal;
  return validAssist(goal) ? goal : { ...goal, assist: null };
}

const patchGoal = (game: Game, goalId: string, patch: Partial<Goal>): Game => ({
  ...game,
  goals: game.goals.map((g) => (g.id === goalId ? withValidAssist({ ...g, ...patch }) : g)),
});

/** FR-008: Tor entfernen; bleibt durchgestrichen sichtbar und zählt nicht. */
export const removeGoal = (game: Game, goalId: string, now: number): Game =>
  patchGoal(game, goalId, { deletedAt: now });

/** FR-008: entferntes Tor wiederherstellen. */
export const restoreGoal = (game: Game, goalId: string): Game => patchGoal(game, goalId, { deletedAt: null });

/**
 * FR-009: Torschütze setzen. Spieler und Eigentor nur bei eigenen Toren, Freitext nur bei Gegentoren
 * (getrimmt, max. 30 Zeichen; leer = ohne). Ungültige Kombinationen ändern nichts.
 */
export function setScorer(game: Game, goalId: string, scorer: Scorer): Game {
  const goal = game.goals.find((g) => g.id === goalId);
  if (!goal) return game;
  if (scorer === null) return patchGoal(game, goalId, { scorer: null });
  if (scorer.kind === 'text') {
    if (goal.side !== 'opp') return game;
    const text = scorer.text.trim();
    if (text === '') return patchGoal(game, goalId, { scorer: null });
    if (validateOpponentScorerText(text)) return game;
    return patchGoal(game, goalId, { scorer: { kind: 'text', text } });
  }
  if (goal.side !== 'own') return game;
  // FR-E01: Elfmeter und Eigentor schließen sich aus.
  return patchGoal(game, goalId, scorer.kind === 'ownGoal' ? { scorer, penalty: false } : { scorer });
}

/** Spec 003 FR-E01: Tor als Elfmeter kennzeichnen; ein Eigentor wird dabei aufgehoben. */
export function setPenalty(game: Game, goalId: string, penalty: boolean): Game {
  const goal = game.goals.find((g) => g.id === goalId);
  if (!goal) return game;
  const clearOwnGoal = penalty && goal.scorer?.kind === 'ownGoal';
  return patchGoal(game, goalId, clearOwnGoal ? { penalty, scorer: null } : { penalty });
}

/**
 * Spec 009 FR-V02, FR-V04: Vorlagengeber setzen (Kaderspieler-ID) bzw. mit null entfernen.
 * Ungültiges (Gegentor, ohne Spieler als Torschützen, Elfmeter, Vorlagengeber = Torschütze) ändert nichts.
 */
export function setAssist(game: Game, goalId: string, playerId: string | null): Game {
  const goal = game.goals.find((g) => g.id === goalId);
  if (!goal) return game;
  if (playerId === null) return patchGoal(game, goalId, { assist: null });
  if (!canHaveAssist(goal) || scorerPlayerId(goal) === playerId) return game;
  return patchGoal(game, goalId, { assist: playerId });
}

/** Spec 009 FR-V09: Anzeigename des Vorlagengebers ohne Rückennummer, "" ohne Vorlage; gelöschte bleiben lesbar. */
export function assistLabel(goal: Goal, players: Player[]): string {
  // Auch eingelesene Daten (Sicherung) zeigen nur eine Vorlage, die FR-V05 erfüllt.
  if (goal.assist == null || !validAssist(goal)) return '';
  return resolvePlayer(players, goal.assist)?.name ?? '?';
}

/** Spec 009 FR-V06: " (Vorlage: Ben)" hinter dem Torschützen, sonst "". */
export function assistSuffix(goal: Goal, players: Player[]): string {
  const name = assistLabel(goal, players);
  return name ? ` (Vorlage: ${name})` : '';
}

/** Zusatz hinter Torschütze bzw. Minute in Liste und Teilen-Text. */
export const goalSuffix = (goal: Goal): string => (goal.penalty ? ' (Elfmeter)' : '');

/** Anzeige des Torschützen; gelöschte Spieler bleiben lesbar (FR-029). */
export function scorerLabel(goal: Goal, players: Player[]): string {
  const s = goal.scorer;
  if (s === null) return '';
  if (s.kind === 'ownGoal') return 'Eigentor';
  if (s.kind === 'text') return s.text;
  return resolvePlayer(players, s.playerId)?.name ?? '?';
}

/**
 * Spec 009 FR-V11: Beschriftung eines Tores in Torliste, Tor-Fenster und Spieldetails. Mit Torschütze ohne
 * Mannschaftsnamen ("Max (Vorlage: Ben)", Gegner "Nr. 9 (TSV Musterstadt)"), sonst die Mannschaft.
 */
export function goalWho(game: Game, goal: Goal, players: Player[]): string {
  if (goal.scorer === null)
    return (goal.side === 'own' ? shortTeamName(game.ownTeam) : game.opponent) + goalSuffix(goal);
  const opp = goal.side === 'opp' ? ` (${game.opponent})` : '';
  return `${scorerLabel(goal, players)}${opp}${assistSuffix(goal, players)}${goalSuffix(goal)}`;
}

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
