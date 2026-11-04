import { boardView, runningElsewhere, type BoardEntry } from '../domain/live-board';
import { configOf, viewerOf } from '../domain/live-spieltag';
import { handOver, takenOver, takeoverGame } from '../domain/live-takeover';
import type { Game, LiveSpieltag, Player } from '../domain/types';
import { newReceiver, type LiveReceiver, type ReceiverDeps } from './live-receiver';

/**
 * Spec 006 US6: Trainer-Handys hören beim Anlegen und während eines Live-Spiels mit, ob ein anderes Handy
 * dasselbe Spiel überträgt bzw. das eigene übernommen hat (FR-L22 bis FR-L24). Wird nachgeladen.
 */

export { handOver };

/** Empfänger für den gekoppelten Live-Spieltag, mit bekannter Konfiguration. */
function receiverFor(live: LiveSpieltag, deps: Partial<ReceiverDeps>): LiveReceiver {
  const r = newReceiver(viewerOf(live), deps);
  const config = configOf(live.config);
  if (config) r.seed(config);
  return r;
}

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

/**
 * FR-L24: meldet einmal, sobald ein anderes Handy das Spiel übernommen hat (größerer Übergabezähler).
 * `current` liefert den aktuellen Stand des Spiels auf diesem Handy.
 */
export function watchTakeover(
  live: LiveSpieltag,
  team: string,
  current: () => Game | null,
  onTakenOver: () => void,
  deps: Partial<ReceiverDeps> = {},
): () => void {
  const r = receiverFor(live, deps);
  let done = false;
  const check = (): void => {
    const g = current();
    if (done || !g || !takenOver(r.get().board, g, team)) return;
    done = true;
    onTakenOver();
  };
  const off = r.onChange(check);
  r.start();
  check();
  return () => {
    off();
    r.stop();
  };
}
