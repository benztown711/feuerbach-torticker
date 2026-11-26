import { createGame } from '../domain/game';
import { runningElsewhere, type Board, type BoardEntry } from '../domain/live-board';
import { checkTickerName, parentAllowed } from '../domain/live-parent';
import { takeoverGame } from '../domain/live-takeover';
import type { Game, PlanEntry, Schema, Venue, ViewerLink } from '../domain/types';
import { getGame, getPlayers, getSettings, listGames, putGame, putSettings } from './db';
import { startLiveSender } from './live-sender';

/**
 * Spec 024 (research.md R-E3, R-E6): Eltern tickern über den Zuschauer-Link. Legt Spiele an bzw. übernimmt sie und
 * macht das Handy zum Eltern-Handy (`Settings.liveTicker`), damit der bestehende Sender sendet.
 */

type View = Pick<ViewerLink, 'topic' | 'viewKey' | 'orgPub'>;

const DEFAULT_SCHEMA: Schema = { sections: 2, sectionMinutes: 25 };

/** Ein Handy mit Trainer-Link tickert immer als Trainer; die Eltern-Wege gibt es dort nicht (Edge Case). */
export async function isTrainerDevice(): Promise<boolean> {
  return (await getSettings()).live !== null;
}

/** Gespeicherter Ticker-Name (FR-E09), leer = noch nie gefragt. */
export async function tickerName(): Promise<string> {
  return (await getSettings()).tickerName ?? '';
}

export async function saveTickerName(raw: string): Promise<string> {
  const check = checkTickerName(raw);
  if (!check.ok) throw new Error(check.error);
  const s = await getSettings();
  await putSettings({ ...s, tickerName: check.name });
  return check.name;
}

/** Spiele dieses Handys, die es noch selbst sendet ("Du tickerst"). */
export async function ownLiveIds(): Promise<string[]> {
  return (await listGames()).filter((g) => g.live !== false).map((g) => g.id);
}

/** Kann dieses Handy für die Mannschaft tickern? (Paket und signierte Konfiguration bekannt, Mannschaft erlaubt) */
export const canTick = (board: Board, team: string): boolean =>
  board.kit !== null &&
  board.signedConfig !== null &&
  parentAllowed(board.config, team) &&
  (board.config?.m ?? []).some(([k]) => k === team);

/** Name und Trikotfarben der Mannschaft aus der Konfiguration. */
function teamOf(board: Board, team: string): { name: string; home: string; away: string } | null {
  const d = (board.config?.m ?? []).find(([k]) => k === team);
  return d ? { name: d[1], home: d[2], away: d[3] } : null;
}

/** Gegnerfarbe, die sich vom eigenen Trikot unterscheidet (änderbar im Spiel über "Trikots ändern"). */
const oppColorFor = (own: string): string => (own === 'schwarz' ? 'weiss' : 'schwarz');

/** Speichert die Daten zum Senden und startet den Sender (R-E3). */
async function becomeTicker(view: View, board: Board): Promise<void> {
  const s = await getSettings();
  if (s.live) throw new Error('Auf diesem Handy tickerst du als Trainer.');
  if (!board.kit || !board.signedConfig) throw new Error('Noch keine Verbindung zum Live-Spieltag.');
  const next = {
    ...s,
    liveTicker: {
      topic: view.topic,
      viewKey: view.viewKey,
      orgPub: view.orgPub,
      kit: board.kit.signed,
      config: board.signedConfig,
    },
  };
  await putSettings(next);
  await startLiveSender(next);
}

/** US2-S6, US3-S3: Tickert gerade ein anderes Handy die Mannschaft? */
export async function busyWith(board: Board, team: string, serverNow: number): Promise<BoardEntry | null> {
  return runningElsewhere(board, team, await ownLiveIds(), serverNow);
}

export interface NewInput {
  team: string;
  opponent: string;
  venue: Venue;
  schema?: Schema | null;
}

/** US1, US3: Spiel anlegen (sofort live, R-E6) und die Kennung liefern. */
export async function startGame(view: View, board: Board, input: NewInput): Promise<string> {
  const team = teamOf(board, input.team);
  if (!team || !canTick(board, input.team)) throw new Error('Für diese Mannschaft dürfen Eltern nicht tickern.');
  await becomeTicker(view, board);
  const own = input.venue === 'home' ? team.home : team.away;
  const game: Game = {
    ...createGame(
      {
        ownTeam: team.name,
        opponent: input.opponent.trim(),
        venue: input.venue,
        schema: input.schema ?? DEFAULT_SCHEMA,
        ownColor: own,
        oppColor: oppColorFor(own),
      },
      { id: globalThis.crypto.randomUUID(), now: Date.now() },
    ),
    live: true,
  };
  await putGame(game);
  return game.id;
}

/** US1: Spiel aus dem Planspiel. */
export const startPlanned = (view: View, board: Board, e: PlanEntry): Promise<string> =>
  startGame(view, board, { team: e.team, opponent: e.opponent, venue: e.venue, schema: e.schema });

/**
 * US2-S4, FR-E14: laufendes Spiel aus dem letzten Live-Stand übernehmen (Eltern ohne Kader: Torschützen als
 * Freitext). Gibt es das Spiel hier schon (eigenes, lokal verloren oder abgegeben), wird es ersetzt.
 */
export async function takeOver(view: View, board: Board, entry: BoardEntry, skew: number): Promise<string> {
  const team = teamOf(board, entry.snap.team);
  if (!team || !canTick(board, entry.snap.team)) throw new Error('Für diese Mannschaft dürfen Eltern nicht tickern.');
  await becomeTicker(view, board);
  const game = takeoverGame({
    entry,
    ownTeam: team.name,
    players: [],
    skew,
    now: Date.now(),
    newId: () => globalThis.crypto.randomUUID(),
    textScorers: true,
  });
  const old = await getGame(game.id);
  await putGame(old ? { ...game, createdAt: old.createdAt } : game);
  return game.id;
}

/** Spec 024 US5-S3: beantwortete Übernahme-Fragen merken (höchstens 50). */
export async function markParentGameDone(id: string): Promise<string[]> {
  const s = await getSettings();
  const done = [...(s.parentGamesDone ?? []).filter((x) => x !== id), id].slice(-50);
  await putSettings({ ...s, parentGamesDone: done });
  return done;
}

/** Spec 024 US4-S5: Trainer-Handy holt ein Spiel vom Dashboard zurück (wie Spec 006 US6). */
export async function trainerTakeOver(entry: BoardEntry, skew: number): Promise<string> {
  const s = await getSettings();
  if (!s.live) throw new Error('Auf diesem Handy ist kein Live-Spieltag eingerichtet.');
  const team = s.live.teams.find((t) => t.key === entry.snap.team);
  const game = takeoverGame({
    entry,
    ownTeam: team?.name ?? entry.snap.own,
    players: await getPlayers(),
    skew,
    now: Date.now(),
    newId: () => globalThis.crypto.randomUUID(),
  });
  await putGame(game);
  return game.id;
}
