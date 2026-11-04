import { boardView, otherGames, runningElsewhere, type BoardCard, type BoardEntry } from '../domain/live-board';
import { configOf, viewerOf } from '../domain/live-spieltag';
import { handOver, takenOver, takeoverGame } from '../domain/live-takeover';
import type { Game, LiveSpieltag, Player } from '../domain/types';
import { newReceiver, type LiveReceiver, type ReceiverDeps } from './live-receiver';

/**
 * Spec 006 US4 und US6: Trainer-Handys hören beim Anlegen und im Spielbildschirm mit: Läuft dasselbe Spiel
 * schon auf einem anderen Handy, wurde das eigene übernommen (FR-L22 bis FR-L24), wie stehen die anderen
 * Spiele (US4)? Wird nachgeladen.
 */

export { handOver };

/** Empfänger für den gekoppelten Live-Spieltag, mit bekannter Konfiguration. */
const receiverFor = (live: LiveSpieltag, deps: Partial<ReceiverDeps>): LiveReceiver =>
  newReceiver(viewerOf(live), deps, configOf(live.config));

export interface RunningGame {
  entry: BoardEntry;
  /** z. B. "Feuerbach E2 1:0 TSV Musterstadt · 12'" */
  summary: string;
}

export interface LiveWatch {
  /** FR-L22: überträgt ein anderes Handy gerade ein Spiel dieser Mannschaft? */
  running(team: string, localIds: string[]): RunningGame | null;
  /** FR-L23: Spiel aus dem letzten Stand anlegen. */
  takeover(entry: BoardEntry, ownTeam: string, players: Player[], newId: () => string): Game;
  stop(): void;
}

export function watchSpieltag(live: LiveSpieltag, deps: Partial<ReceiverDeps> = {}): LiveWatch {
  const r = receiverFor(live, deps);
  r.start();
  return {
    running(team, localIds) {
      const serverNow = r.serverNow();
      const entry = runningElsewhere(r.get().board, team, localIds, serverNow);
      if (!entry) return null;
      const card = boardView({ config: null, games: [entry], removed: [] }, serverNow).cards[0];
      return card
        ? { entry, summary: `${card.home.name} ${card.score} ${card.away.name} · ${card.phase}` }
        : { entry, summary: entry.snap.opp };
    },
    takeover: (entry, ownTeam, players, newId) =>
      takeoverGame({ entry, ownTeam, players, skew: r.get().skew, now: Date.now(), newId }),
    stop: () => r.stop(),
  };
}

export interface GameWatch {
  /** US4: heutige Spiele ohne das Spiel `gameId` dieses Handys, Stand und Minute jetzt. */
  others(gameId: string): BoardCard[];
  /** Jetzt in Serverzeit (R-L4). */
  serverNow(): number;
  onChange(cb: () => void): () => void;
  stop(): void;
}

export interface GameWatchHooks {
  /** Mannschaft, für die dieses Handy das Spiel sendet; null: sendet nicht, keine Prüfung auf Übernahme. */
  team(): string | null;
  /** Aktueller Stand des Spiels auf diesem Handy. */
  current(): Game | null;
  /** FR-L24: einmal, sobald ein anderes Handy das Spiel übernommen hat (größerer Übergabezähler). */
  onTakenOver(): void;
}

/** Eine Verbindung je Spielbildschirm, solange er offen und das Handy gekoppelt ist (US4, FR-L24). */
export function watchGame(live: LiveSpieltag, hooks: GameWatchHooks, deps: Partial<ReceiverDeps> = {}): GameWatch {
  const r = receiverFor(live, deps);
  let done = false;
  const check = (): void => {
    const g = hooks.current();
    const team = hooks.team();
    if (done || !g || !team || !takenOver(r.get().board, g, team)) return;
    done = true;
    hooks.onTakenOver();
  };
  r.onChange(check);
  r.start();
  check();
  return {
    others: (gameId) => otherGames(r.get().board, gameId, r.serverNow(), deps.timeZone),
    serverNow: () => r.serverNow(),
    onChange: (cb) => r.onChange(cb),
    stop: () => r.stop(),
  };
}
