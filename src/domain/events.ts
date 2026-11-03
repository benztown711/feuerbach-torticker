import { clockOf } from './game';
import { formatMinute } from './minute';
import { resolvePlayer } from './roster';
import { shortTeamName } from './team-name';
import type { CardColor, CardEvent, EventPerson, Game, GameEvent, MarkEvent, Player, Side, SubEvent } from './types';
import { validateOpponentScorerText } from './validation';

export const MARK_COMMENT_MAX = 60;

const defaultId = (): string => globalThis.crypto.randomUUID();

/** Ereignisse eines Spiels; ältere Spiele haben noch keine (Spec 003). */
export const gameEvents = (game: Game): GameEvent[] => game.events ?? [];

export const isMark = (e: GameEvent): e is MarkEvent => e.kind === 'mark';

/** Ereignisse sind ab Anpfiff bis zum Schlusspfiff erlaubt (Minute = letzter Uhrstand). */
function stamp(game: Game, now: number, newId: () => string) {
  const c = clockOf(game, now);
  if (c.status === 'created' || c.status === 'finished') return null;
  return { id: newId(), at: now, section: c.section, minute: c.minute, stoppage: c.stoppage };
}

const append = <E extends GameEvent>(game: Game, event: E): { game: Game; event: E } => ({
  game: { ...game, events: [...gameEvents(game), event] },
  event,
});

/**
 * FR-E05: Lesezeichen mit Minute, Abschnitt und Uhrzeit; ab Anpfiff bis zum Schlusspfiff,
 * auch bei angehaltener Uhr und in der Pause (Minute = letzter Uhrstand).
 */
export function addMark(
  game: Game,
  now: number,
  newId: () => string = defaultId,
): { game: Game; event: MarkEvent } | null {
  const base = stamp(game, now, newId);
  return base ? append(game, { ...base, kind: 'mark', comment: '' }) : null;
}

/** FR-E05: Kommentar (freiwillig, getrimmt, höchstens 60 Zeichen). */
export function setMarkComment(game: Game, id: string, comment: string): Game {
  if (!gameEvents(game).some((e) => e.id === id)) return game;
  const text = comment.trim().slice(0, MARK_COMMENT_MAX);
  return { ...game, events: gameEvents(game).map((e) => (e.id === id && isMark(e) ? { ...e, comment: text } : e)) };
}

/** FR-E03: Spieler nur bei eigenen Karten aus dem Kader, beim Gegner Freitext (≤ 30 Zeichen, leer = ohne). */
function normalizePerson(side: Side, who: EventPerson): EventPerson | undefined {
  if (who === null) return null;
  if (who.kind === 'player') return side === 'own' ? who : undefined;
  if (side !== 'opp') return undefined;
  const text = who.text.trim();
  if (text === '') return null;
  return validateOpponentScorerText(text) ? undefined : { kind: 'text', text };
}

export interface CardInput {
  side: Side;
  card: CardColor;
  who: EventPerson;
  comment?: string;
}

/** FR-E03: Karte mit Minute, Abschnitt, Uhrzeit, Mannschaft, optional Spieler und Kommentar. */
export function addCard(
  game: Game,
  input: CardInput,
  now: number,
  newId: () => string = defaultId,
): { game: Game; event: CardEvent } | null {
  const who = normalizePerson(input.side, input.who);
  const base = stamp(game, now, newId);
  if (who === undefined || !base) return null;
  const comment = (input.comment ?? '').trim().slice(0, MARK_COMMENT_MAX);
  return append(game, { ...base, kind: 'card', side: input.side, card: input.card, who, comment });
}

/** FR-E04: Wechsel der eigenen Mannschaft ("rein für raus"). */
export function addSub(
  game: Game,
  outId: string,
  inId: string,
  now: number,
  newId: () => string = defaultId,
): { game: Game; event: SubEvent } | null {
  const base = stamp(game, now, newId);
  if (outId === inId || !base) return null;
  return append(game, { ...base, kind: 'sub', outId, inId });
}

/** FR-E03: Karte bearbeiten (Art, Mannschaft, Spieler, Kommentar); ungültige Eingaben ändern nichts. */
export function updateCard(game: Game, id: string, input: CardInput): Game {
  const old = gameEvents(game).find((e) => e.id === id);
  const who = normalizePerson(input.side, input.who);
  if (old?.kind !== 'card' || who === undefined) return game;
  const comment = (input.comment ?? '').trim().slice(0, MARK_COMMENT_MAX);
  return replaceEvent(game, { ...old, side: input.side, card: input.card, who, comment });
}

/** FR-E04: Wechsel bearbeiten. */
export function updateSub(game: Game, id: string, outId: string, inId: string): Game {
  const old = gameEvents(game).find((e) => e.id === id);
  if (old?.kind !== 'sub' || outId === inId) return game;
  return replaceEvent(game, { ...old, outId, inId });
}

/** FR-E03/FR-E04: Ereignis bearbeiten (gleiche ID). */
export function replaceEvent(game: Game, event: GameEvent): Game {
  if (!gameEvents(game).some((e) => e.id === event.id)) return game;
  return { ...game, events: gameEvents(game).map((e) => (e.id === event.id ? event : e)) };
}

const CARD_LABELS: Record<CardColor, string> = { gelb: 'Gelb', gelbrot: 'Gelb-Rot', rot: 'Rot', zeit: 'Zeitstrafe' };
export const cardLabel = (c: CardColor): string => CARD_LABELS[c];

/** Anzeige eines Spielers; gelöschte Spieler bleiben lesbar (FR-029). */
export function personLabel(who: EventPerson, players: Player[]): string {
  if (who === null) return '';
  if (who.kind === 'text') return who.text;
  return resolvePlayer(players, who.playerId)?.name ?? '?';
}

const playerName = (players: Player[], id: string): string => resolvePlayer(players, id)?.name ?? '?';

/** Text einer Karte, z. B. "Rot Nr. 9 (TSV Musterstadt)", "Gelb Tom", "Zeitstrafe (Feuerbach U15)". */
export function cardText(game: Game, e: CardEvent, players: Player[]): string {
  const who = personLabel(e.who, players);
  const team = e.side === 'opp' ? game.opponent : who ? '' : shortTeamName(game.ownTeam);
  return [cardLabel(e.card), who, team && `(${team})`].filter(Boolean).join(' ');
}

export const subText = (e: SubEvent, players: Player[]): string =>
  `${playerName(players, e.inId)} für ${playerName(players, e.outId)}`;

/** FR-E07: Zeilen "Karten: …" und "Wechsel: …" für den Teilen-Text; Lesezeichen nie. */
export function eventsShareLines(game: Game, players: Player[]): string[] {
  const sorted = [...gameEvents(game)].sort((a, b) => a.at - b.at);
  const min = (e: GameEvent): string => formatMinute(e.minute, e.stoppage);
  const cards = sorted
    .filter((e): e is CardEvent => e.kind === 'card')
    .map((e) => `${min(e)} ${cardText(game, e, players)}`);
  const subs = sorted.filter((e): e is SubEvent => e.kind === 'sub').map((e) => `${min(e)} ${subText(e, players)}`);
  return [
    ...(cards.length ? [`Karten: ${cards.join(', ')}`] : []),
    ...(subs.length ? [`Wechsel: ${subs.join(', ')}`] : []),
  ];
}

/** FR-E05/US2-S6: Lesezeichen löschen (auch Rückgängig direkt nach dem Setzen). */
export const removeEvent = (game: Game, id: string): Game => ({
  ...game,
  events: gameEvents(game).filter((e) => e.id !== id),
});

/** FR-E08: Liste für die Videoauswertung: "7' · 10:37:12 · Kommentar"; leer ohne Lesezeichen. */
export function marksText(game: Game, timeZone?: string): string {
  const marks = gameEvents(game)
    .filter(isMark)
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
