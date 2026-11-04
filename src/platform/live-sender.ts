import { buildSnapshot, tombstone, type LiveSnapshot } from '../domain/live-snapshot';
import type { Game, LiveSpieltag, LiveTeamCred, Player, Settings } from '../domain/types';
import { normalizeName } from '../domain/validation';
import { findOpenGame, getPlayers, getSettings, onGameWrite, type GameChange } from './db';
import { MAX_MESSAGE, sealMessage, type MessageParts } from './live-crypto';
import { publish } from './relay';

/**
 * Spec 006 R-L3: sendet den jeweils letzten Stand jedes Spiels einer gekoppelten Mannschaft.
 * Höchstens eine Sendung je 5 s, Wiederholung nach 5, 10, 20, 30 s, Lebenszeichen alle 3 Minuten,
 * sofort beim Zurückkehren in den Vordergrund. Senden blockiert nie die Erfassung (FR-L07).
 */

export const MIN_GAP_MS = 5_000;
export const WAIT_AFTER_MS = 30_000;
export const HEARTBEAT_MS = 180_000;
export const RETRY_MS = [5_000, 10_000, 20_000, 30_000];

/** Kennzeichen im Spielbildschirm (FR-L08). */
export type LiveStatus = 'on' | 'wait' | 'off';

export interface SenderDeps {
  now(): number;
  getPlayers(): Promise<Player[]>;
  seal(viewKey: string, parts: MessageParts): Promise<string>;
  publish(topic: string, text: string): Promise<boolean>;
  visibility?: { hidden(): boolean; onChange(cb: () => void): () => void };
}

interface Pending {
  build: () => LiveSnapshot;
  /** Seit wann diese Änderung auf Übertragung wartet. */
  since: number;
}

const ACTIVE = new Set(['running', 'paused', 'break']);

export class LiveSender {
  private live: LiveSpieltag;
  private readonly pending = new Map<string, Pending>();
  private readonly teamOfPending = new Map<string, LiveTeamCred>();
  private readonly games = new Map<string, { game: Game; team: LiveTeamCred }>();
  private readonly listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly heartbeat: ReturnType<typeof setInterval>;
  private readonly offVisibility: () => void;
  private lastSend = Number.NEGATIVE_INFINITY;
  private retry = 0;
  private flushing = false;
  private players: Player[] = [];

  constructor(
    live: LiveSpieltag,
    private readonly deps: SenderDeps,
  ) {
    this.live = live;
    this.heartbeat = setInterval(() => this.resendActive(), HEARTBEAT_MS);
    this.offVisibility =
      deps.visibility?.onChange(() => {
        if (!deps.visibility?.hidden()) this.resendActive();
      }) ?? (() => undefined);
  }

  /** Neue Kopplung oder Konfiguration übernehmen. */
  updateLive(live: LiveSpieltag): void {
    this.live = live;
  }

  /** Mannschaft dieses Spiels, für die das Gerät sendet (unabhängig von "Nicht live senden"). */
  private teamFor(game: Game): LiveTeamCred | null {
    const name = normalizeName(game.ownTeam);
    return this.live.teams.find((t) => t.sends && normalizeName(t.name) === name) ?? null;
  }

  handle(change: GameChange): void {
    if (change.kind === 'delete') {
      const known = this.games.get(change.id);
      if (!known) return;
      this.games.delete(change.id);
      const at = this.deps.now();
      this.enqueue(change.id, () => tombstone(change.id, known.team.key, at), known.team);
      return;
    }
    const team = this.teamFor(change.game);
    if (!team) return;
    this.games.set(change.game.id, { game: change.game, team });
    this.enqueueGame(change.game, team);
  }

  private enqueueGame(game: Game, team: LiveTeamCred): void {
    this.enqueue(game.id, () => buildSnapshot(game, this.players, team.key, this.deps.now()), team);
  }

  private enqueue(id: string, build: () => LiveSnapshot, team: LiveTeamCred): void {
    this.pending.set(id, { build, since: this.pending.get(id)?.since ?? this.deps.now() });
    this.teamOfPending.set(id, team);
    this.schedule();
    this.notify();
  }

  private resendActive(): void {
    for (const { game, team } of this.games.values()) {
      if (ACTIVE.has(game.status) && game.live !== false && !this.pending.has(game.id)) this.enqueueGame(game, team);
    }
  }

  private schedule(delay?: number): void {
    if (this.timer !== null || this.flushing) return;
    const wait = delay ?? Math.max(0, this.lastSend + MIN_GAP_MS - this.deps.now());
    this.timer = setTimeout(() => void this.flush(), wait);
  }

  private async seal(snap: LiveSnapshot, team: LiveTeamCred): Promise<string | null> {
    const parts = { leadKey: team.leadKey, cert: team.cert };
    let text = await this.deps.seal(this.live.viewKey, {
      ...parts,
      content: JSON.stringify(snap),
      config: this.live.config,
    });
    if (text.length <= MAX_MESSAGE) return text;
    // Sehr lange Spiele: ohne Konfiguration und ohne Namen (R-L1, Grenze 4 KB je Meldung).
    const lean = snap.state === 'live' ? { ...snap, goals: snap.goals.map((g) => ({ ...g, who: null })) } : snap;
    text = await this.deps.seal(this.live.viewKey, { ...parts, content: JSON.stringify(lean) });
    return text.length <= MAX_MESSAGE ? text : null;
  }

  private async flush(): Promise<void> {
    this.timer = null;
    this.flushing = true;
    let failed = false;
    try {
      this.players = await this.deps.getPlayers();
      for (const [id, entry] of [...this.pending]) {
        const team = this.teamOfPending.get(id) as LiveTeamCred;
        const text = await this.seal(entry.build(), team);
        const ok = text === null || (await this.deps.publish(this.live.topic, text));
        if (!ok) {
          failed = true;
          continue;
        }
        // Nur entfernen, wenn während des Sendens keine neuere Änderung kam.
        if (this.pending.get(id) === entry) {
          this.pending.delete(id);
          this.teamOfPending.delete(id);
        }
      }
    } catch {
      failed = true;
    } finally {
      this.flushing = false;
    }
    this.lastSend = this.deps.now();
    if (failed) {
      this.schedule(RETRY_MS[Math.min(this.retry, RETRY_MS.length - 1)]);
      this.retry++;
    } else {
      this.retry = 0;
      if (this.pending.size > 0) this.schedule();
    }
    this.notify();
  }

  /** Sendet dieses Gerät für die Mannschaft des Spiels? (Menüeintrag "Nicht live senden") */
  covers(game: Game): boolean {
    return this.teamFor(game) !== null;
  }

  /** FR-L08: "on" übertragen, "wait" Änderung seit über 30 s offen, "off" nicht live; null = nicht gekoppelt. */
  status(gameId: string): LiveStatus | null {
    const known = this.games.get(gameId);
    if (!known) return null;
    if (known.game.live === false) return 'off';
    const p = this.pending.get(gameId);
    return p && this.deps.now() - p.since > WAIT_AFTER_MS ? 'wait' : 'on';
  }

  /** Wie `status`, auch für ein Spiel, das der Sender noch nicht gesehen hat. */
  statusFor(game: Game): LiveStatus | null {
    if (this.games.has(game.id)) return this.status(game.id);
    if (!this.covers(game)) return null;
    return game.live === false ? 'off' : 'on';
  }

  onStatus(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  stop(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    clearInterval(this.heartbeat);
    this.offVisibility();
    this.listeners.clear();
  }
}

/* ---------- Einbindung in die App ---------- */

let current: LiveSender | null = null;
let offDb: (() => void) | null = null;
const startListeners = new Set<() => void>();

const docVisibility = {
  hidden: () => document.visibilityState === 'hidden',
  onChange: (cb: () => void) => {
    document.addEventListener('visibilitychange', cb);
    return () => document.removeEventListener('visibilitychange', cb);
  },
};

export const liveSender = (): LiveSender | null => current;

/** Meldet, wenn ein Sender startet oder endet (für das Kennzeichen im Spiel). */
export function onSenderChange(cb: () => void): () => void {
  startListeners.add(cb);
  return () => startListeners.delete(cb);
}

export function stopLiveSender(): void {
  current?.stop();
  offDb?.();
  current = null;
  offDb = null;
  for (const l of startListeners) l();
}

/**
 * Startet den Sender, wenn dieses Gerät für mindestens eine Mannschaft sendet (sonst keine Verbindung,
 * FR-L05), und schickt den Stand eines offenen Spiels gleich nach dem Start (z. B. nach Neuladen).
 */
export async function startLiveSender(settings?: Settings): Promise<void> {
  const s = settings ?? (await getSettings());
  const live = s.live;
  if (!live || !live.teams.some((t) => t.sends)) {
    stopLiveSender();
    return;
  }
  if (current) {
    current.updateLive(live);
    return;
  }
  current = new LiveSender(live, {
    now: () => Date.now(),
    getPlayers,
    seal: sealMessage,
    publish: (topic, text) => publish(topic, text),
    visibility: docVisibility,
  });
  const sender = current;
  offDb = onGameWrite((c) => sender.handle(c));
  for (const l of startListeners) l();
  const open = await findOpenGame();
  if (open) sender.handle({ kind: 'put', game: open });
}
