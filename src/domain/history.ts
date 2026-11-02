import { clockOf } from './game';
import { goalRows, type GoalRow } from './goals';
import { formatMinute } from './minute';
import type { ClockEvent, Game } from './types';

export type ResultLetter = 'S' | 'U' | 'N';

export interface HistoryEntry {
  game: Game;
  /** Ergebnis aus Feuerbach-Sicht, eigene Tore zuerst (FR-038). */
  scoreText: string;
  result: ResultLetter | null;
  finished: boolean;
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
  const result: ResultLetter | null = !finished ? null : own > opp ? 'S' : own === opp ? 'U' : 'N';
  return {
    game,
    scoreText: `${own}:${opp}`,
    result,
    finished,
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

export type TimelineItem = { kind: 'event'; at: number; event: ClockEvent } | ({ kind: 'goal'; at: number } & GoalRow);

/** Zeitleiste der Spieldetails: Uhr-Ereignisse und Tore chronologisch, bei gleicher Zeit Ereignis zuerst. */
export function timeline(game: Game): TimelineItem[] {
  const events: TimelineItem[] = game.clockEvents.map((event) => ({ kind: 'event', at: event.at, event }));
  const goals: TimelineItem[] = goalRows(game)
    .reverse()
    .map((row) => ({ kind: 'goal', at: row.goal.at, ...row }));
  const rank = (i: TimelineItem): number => (i.kind === 'event' ? 0 : 1);
  return [...events, ...goals].sort((a, b) => a.at - b.at || rank(a) - rank(b));
}

/** Anzeige in der Navigation, solange ein Spiel läuft (FR-037). */
export function liveLabel(game: Game, now: number): string | null {
  const c = clockOf(game, now);
  if (c.status === 'running' || c.status === 'paused') return `Läuft ${formatMinute(c.minute, c.stoppage)}`;
  if (c.status === 'break') return 'Pause';
  return null;
}
