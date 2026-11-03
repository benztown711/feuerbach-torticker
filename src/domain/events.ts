import { clockOf } from './game';
import { formatMinute } from './minute';
import { shortTeamName } from './team-name';
import type { Game, GameEvent } from './types';

export const MARK_COMMENT_MAX = 60;

const defaultId = (): string => globalThis.crypto.randomUUID();

/** Ereignisse eines Spiels; ältere Spiele haben noch keine (Spec 003). */
export const gameEvents = (game: Game): GameEvent[] => game.events ?? [];

/**
 * FR-E05: Lesezeichen mit Minute, Abschnitt und Uhrzeit; ab Anpfiff bis zum Schlusspfiff,
 * auch bei angehaltener Uhr und in der Pause (Minute = letzter Uhrstand).
 */
export function addMark(
  game: Game,
  now: number,
  newId: () => string = defaultId,
): { game: Game; event: GameEvent } | null {
  const c = clockOf(game, now);
  if (c.status === 'created' || c.status === 'finished') return null;
  const event: GameEvent = {
    id: newId(),
    kind: 'mark',
    at: now,
    section: c.section,
    minute: c.minute,
    stoppage: c.stoppage,
    comment: '',
  };
  return { game: { ...game, events: [...gameEvents(game), event] }, event };
}

/** FR-E05: Kommentar (freiwillig, getrimmt, höchstens 60 Zeichen). */
export function setMarkComment(game: Game, id: string, comment: string): Game {
  if (!gameEvents(game).some((e) => e.id === id)) return game;
  const text = comment.trim().slice(0, MARK_COMMENT_MAX);
  return { ...game, events: gameEvents(game).map((e) => (e.id === id ? { ...e, comment: text } : e)) };
}

/** FR-E05/US2-S6: Lesezeichen löschen (auch Rückgängig direkt nach dem Setzen). */
export const removeEvent = (game: Game, id: string): Game => ({
  ...game,
  events: gameEvents(game).filter((e) => e.id !== id),
});

/** FR-E08: Liste für die Videoauswertung: "7' · 10:37:12 · Kommentar"; leer ohne Lesezeichen. */
export function marksText(game: Game, timeZone?: string): string {
  const marks = gameEvents(game)
    .filter((e) => e.kind === 'mark')
    .sort((a, b) => a.at - b.at);
  if (marks.length === 0) return '';
  const tz = timeZone ? { timeZone } : {};
  const own = shortTeamName(game.ownTeam);
  const [home, away] = game.venue === 'home' ? [own, game.opponent] : [game.opponent, own];
  const day = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', ...tz });
  const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit', ...tz });
  const lines = marks.map((m) =>
    [formatMinute(m.minute, m.stoppage), time.format(m.at), ...(m.comment ? [m.comment] : [])].join(' · '),
  );
  return [`Lesezeichen ${home} - ${away}, ${day.format(marks[0]!.at)}`, ...lines].join('\n');
}
