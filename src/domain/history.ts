import { clockOf } from './game';
import { goalRows, type GoalRow } from './goals';
import { formatMinute } from './minute';
import { shootoutState } from './cup';
import { gameEvents } from './events';
import type { ClockEvent, Game, GameEvent } from './types';

export type ResultLetter = 'S' | 'U' | 'N';

export interface HistoryEntry {
  game: Game;
  /** Ergebnis aus Feuerbach-Sicht, eigene Tore zuerst (FR-038). */
  scoreText: string;
  result: ResultLetter | null;
  finished: boolean;
  /** Anzeige statt S/U/N bei offenen Spielen (FR-038). */
  openLabel: 'läuft' | 'nicht angepfiffen' | null;
  teamShort: string;
  venueLabel: 'heim' | 'auswärts';
}

/** Erster Anpfiff, sonst Anlegezeit. */
export function startedAt(game: Game): number {
  return game.clockEvents.find((e) => e.type === 'kickoff')?.at ?? game.createdAt;
}

/** Kurzform des eigenen Namens für Filter und Liste: "Sportvg Feuerbach E1" → "E1". */
export function teamShortLabel(ownTeam: string): string {
  const rest = ownTeam
    .trim()
    .replace(/^sportvg\s+/i, '')
    .replace(/^feuerbach(\s+|$)/i, '');
  return rest === '' ? 'Feuerbach' : rest;
}

export function historyEntry(game: Game): HistoryEntry {
  const active = game.goals.filter((g) => g.deletedAt === null);
  const own = active.filter((g) => g.side === 'own').length;
  const opp = active.length - own;
  const finished = game.status === 'finished';
  const so = game.shootout;
  const pens = so?.done ? shootoutState(game) : null;
  // FR-P03: S/N nach dem Elfmeterschießen; solange es läuft, noch kein Ergebnis.
  const result: ResultLetter | null =
    !finished || (so && !so.done)
      ? null
      : pens
        ? pens.own > pens.opp
          ? 'S'
          : 'N'
        : own > opp
          ? 'S'
          : own === opp
            ? 'U'
            : 'N';
  return {
    game,
    scoreText: `${own}:${opp}`,
    result,
    finished,
    openLabel: finished ? null : game.status === 'created' ? 'nicht angepfiffen' : 'läuft',
    teamShort: teamShortLabel(game.ownTeam),
    venueLabel: game.venue === 'home' ? 'heim' : 'auswärts',
  };
}

const teamKey = (ownTeam: string): string => ownTeam.trim().toLowerCase();

export interface TeamFilter {
  key: string;
  label: string;
}

/** Filter-Chips (FR-038): nur bei mehr als einem eigenen Namen; Reihenfolge wie die Liste (neueste zuerst). */
export function teamFilters(games: Game[]): TeamFilter[] {
  const seen = new Map<string, string>();
  for (const g of games) {
    const key = teamKey(g.ownTeam);
    if (!seen.has(key)) seen.set(key, teamShortLabel(g.ownTeam));
  }
  if (seen.size < 2) return [];
  return [...seen].map(([key, label]) => ({ key, label }));
}

export function filterGames(games: Game[], key: string | null): Game[] {
  return key === null ? games : games.filter((g) => teamKey(g.ownTeam) === key);
}

export type TimelineItem =
  | { kind: 'event'; at: number; event: ClockEvent }
  | ({ kind: 'goal'; at: number } & GoalRow)
  | { kind: 'ev'; at: number; ev: GameEvent };

/** Zeitleiste der Spieldetails: Uhr-Ereignisse und Tore chronologisch, bei gleicher Zeit Ereignis zuerst. */
export function timeline(game: Game): TimelineItem[] {
  const events: TimelineItem[] = game.clockEvents.map((event) => ({ kind: 'event', at: event.at, event }));
  const goals: TimelineItem[] = goalRows(game)
    .reverse()
    .map((row) => ({ kind: 'goal', at: row.goal.at, ...row }));
  const marks: TimelineItem[] = gameEvents(game).map((ev) => ({ kind: 'ev', at: ev.at, ev }));
  const rank = (i: TimelineItem): number => (i.kind === 'event' ? 0 : i.kind === 'goal' ? 1 : 2);
  return [...events, ...goals, ...marks].sort((a, b) => a.at - b.at || rank(a) - rank(b));
}

/** Anzeige in der Navigation, solange ein Spiel läuft (FR-037). */
export function liveLabel(game: Game, now: number): string | null {
  const c = clockOf(game, now);
  if (c.status === 'running' || c.status === 'paused') return `Läuft ${formatMinute(c.minute, c.stoppage)}`;
  if (c.status === 'break') return 'Pause';
  return null;
}
