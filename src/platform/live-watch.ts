import {
  boardView,
  lastSentAt,
  otherGames,
  runningElsewhere,
  sentLabel,
  type Board,
  type BoardCard,
  type BoardEntry,
} from '../domain/live-board';
import { configOf, viewerOf } from '../domain/live-spieltag';
import { handOver, takenOver, takeoverGame } from '../domain/live-takeover';
import type { Game, LiveSpieltag, Player } from '../domain/types';
import { newReceiver, type LiveReceiver, type ReceiverDeps } from './live-receiver';
import { adoptPlan, adoptReceived } from './live-setup';

/**
 * Spec 006 US4 und US6: Trainer-Handys hören beim Anlegen und im Spielbildschirm mit: Läuft dasselbe Spiel
 * schon auf einem anderen Handy, wurde das eigene übernommen (FR-L22 bis FR-L24), wie stehen die anderen
 * Spiele (US4)? Wird nachgeladen.
 */

export { handOver };

/**
 * Empfänger für den gekoppelten Live-Spieltag, mit bekannter Konfiguration. Eine jüngere Konfiguration eines
 * anderen Trainer-Handys übernimmt dieses Handy (US5-S1).
 */
const receiverFor = (live: LiveSpieltag, deps: Partial<ReceiverDeps>): LiveReceiver =>
  newReceiver(
    viewerOf(live),
    {
      onConfig: (signed) => void adoptReceived(signed, live),
      // Spec 015 US1-S4: Planspiele anderer Trainer-Handys übernehmen.
      onPlan: (payload, sentAt) => void adoptPlan(payload, live, sentAt),
      ...deps,
    },
    configOf(live.config),
  );

export interface LiveOverviewWatch {
  /** US5: "zuletzt gesendet …" je Mannschaft (über alle Handys). */
  sent(team: string): string;
  onChange(cb: () => void): () => void;
  stop(): void;
}

/** US5: Übersicht "Live-Spieltag" ("zuletzt gesendet" je Mannschaft), solange sie offen ist. */
export function watchLive(live: LiveSpieltag, deps: Partial<ReceiverDeps> = {}): LiveOverviewWatch {
  const r = receiverFor(live, deps);
  r.start();
  return {
    sent: (team) => sentLabel(lastSentAt(r.get().board, team), r.serverNow(), deps.timeZone),
    onChange: (cb) => r.onChange(cb),
    stop: () => r.stop(),
  };
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
  /** FR-L22: wartet höchstens `maxMs`, bis der erste Stand vom Dienst geladen ist (ohne Netz sofort). */
  ready(maxMs: number): Promise<void>;
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
    ready: (maxMs) => r.whenSettled(maxMs),
    stop: () => r.stop(),
  };
}

export interface GameWatch {
  /** US4: heutige Spiele der anderen Mannschaften (`team` eigene, `gameId` eigenes Spiel), Stand und Minute jetzt. */
  others(gameId: string, team: string | null): BoardCard[];
  /** Jetzt in Serverzeit (R-L4). */
  serverNow(): number;
  /** FR-L24 erneut prüfen, z. B. wenn das Spiel geladen ist oder dieses Handy wieder sendet. */
  check(): void;
  onChange(cb: () => void): () => void;
  stop(): void;
}

export interface GameWatchHooks {
  /** Mannschaft, für die dieses Handy das Spiel sendet; null: sendet nicht, keine Prüfung auf Übernahme. */
  team(): string | null;
  /** Aktueller Stand des Spiels auf diesem Handy. */
  current(): Game | null;
  /** FR-L24: einmal je Spiel und eigenem Übergabezähler, sobald ein anderes Handy das Spiel übernommen hat. */
  onTakenOver(): void;
}

/** Eine Verbindung je Spielbildschirm, solange er offen und das Handy gekoppelt ist (US4, FR-L24). */
export function watchGame(live: LiveSpieltag, hooks: GameWatchHooks, deps: Partial<ReceiverDeps> = {}): GameWatch {
  const r = receiverFor(live, deps);
  let reported = '';
  const check = (): void => {
    const g = hooks.current();
    const team = hooks.team();
    if (!g || g.liveHandedOver || !team || !takenOver(r.get().board, g, team)) return;
    const key = `${g.id}:${g.liveTakeover ?? 0}`;
    if (reported === key) return;
    reported = key;
    hooks.onTakenOver();
  };
  // Der Spielbildschirm zeichnet viermal je Sekunde: Karten je Stand, Sekunde und Spiel nur einmal berechnen.
  let cache: { board: Board; sec: number; key: string; cards: BoardCard[] } | null = null;
  const others = (gameId: string, team: string | null): BoardCard[] => {
    const board = r.get().board;
    const now = r.serverNow();
    const sec = Math.floor(now / 1000);
    const key = `${gameId}|${team ?? ''}`;
    if (cache?.board !== board || cache.sec !== sec || cache.key !== key)
      cache = { board, sec, key, cards: otherGames(board, gameId, team, now, deps.timeZone) };
    return cache.cards;
  };
  r.onChange(check);
  r.start();
  check();
  return {
    others,
    serverNow: () => r.serverNow(),
    check,
    onChange: (cb) => r.onChange(cb),
    stop: () => r.stop(),
  };
}

/** Spec 015 US1-S4: Spielplan-Seite hört mit, solange sie offen ist (Planspiele anderer Trainer-Handys). */
export function watchPlan(live: LiveSpieltag, deps: Partial<ReceiverDeps> = {}): { stop(): void } {
  const r = receiverFor(live, deps);
  r.start();
  return { stop: () => r.stop() };
}
