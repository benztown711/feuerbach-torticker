import { buildSnapshot, tombstone, type LiveSnapshot } from '../domain/live-snapshot';
import { liveTeamFor, sendsFor } from '../domain/live-spieltag';
import type { Game, LiveSpieltag, LiveTeamCred, Player, Settings } from '../domain/types';
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
/** Kader höchstens so oft neu lesen (er ändert sich im Spiel kaum). */
export const PLAYERS_TTL_MS = 60_000;

/** Kennzeichen im Spielbildschirm (FR-L08; "handed": übernommen, FR-L24). */
export type LiveStatus = 'on' | 'wait' | 'off' | 'handed';

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

/** FR-L09: beim Anlegen ausgenommen und nie eingeschaltet; FR-L24: von einem anderen Handy übernommen. */
const isPrivate = (game: Game): boolean =>
  game.live === false && (game.livePrivate === true || game.liveHandedOver === true);

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
  private playersAt = Number.NEGATIVE_INFINITY;
  private stopped = false;

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

  spieltag(): LiveSpieltag {
    return this.live;
  }

  /** Neue Kopplung oder Konfiguration desselben Live-Spieltags übernehmen. */
  updateLive(live: LiveSpieltag): void {
    this.live = live;
    // Spiele von Mannschaften, für die das Gerät nicht mehr sendet, nicht weiter melden.
    for (const [id, { game }] of [...this.games]) if (!this.teamFor(game)) this.forget(id);
    for (const [id, team] of [...this.teamOfPending])
      if (!live.teams.some((t) => sendsFor(live, t) && t.key === team.key)) this.forget(id);
  }

  private forget(id: string): void {
    this.games.delete(id);
    this.pending.delete(id);
    this.teamOfPending.delete(id);
  }

  /** Mannschaft dieses Spiels, für die das Gerät sendet (unabhängig von "Nicht live senden"). */
  private teamFor(game: Game): LiveTeamCred | null {
    return liveTeamFor(game.ownTeam, this.live);
  }

  handle(change: GameChange): void {
    if (change.kind === 'delete') {
      // Auch Spiele, die dieser Sender (z. B. nach einem Neustart) noch nicht gesehen hat.
      const known = this.games.get(change.id);
      const team = known?.team ?? (change.game ? this.teamFor(change.game) : null);
      const game = known?.game ?? change.game;
      this.forget(change.id);
      // Nie gesendet: auch beim Löschen nichts melden (FR-L09).
      if (!team || (game && isPrivate(game))) return;
      const at = this.deps.now();
      this.enqueue(change.id, () => tombstone(change.id, team.key, at), team);
      return;
    }
    const team = this.teamFor(change.game);
    // Alte, beendete Spiele (z. B. aus einer Sicherung) nicht nachträglich veröffentlichen (FR-L06 "ab dem Anlegen").
    const old = change.game.status === 'finished' && change.game.createdAt < this.live.createdAt;
    if (!team || (old && !this.games.has(change.game.id))) {
      this.forget(change.game.id);
      return;
    }
    this.games.set(change.game.id, { game: change.game, team });
    // FR-L09: beim Anlegen "Live aufs Dashboard" aus und nie eingeschaltet: nichts senden, auch kein "off".
    if (isPrivate(change.game)) {
      this.pending.delete(change.game.id);
      this.notify();
      return;
    }
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
    if (this.timer !== null || this.flushing || this.stopped) return;
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
    const lean =
      snap.state === 'live'
        ? {
            ...snap,
            goals: snap.goals.map((g) => ({ ...g, who: null })),
            shootout: snap.shootout && {
              ...snap.shootout,
              shots: snap.shootout.shots.map(([side, hit]) => [side, hit, null] as [typeof side, boolean, null]),
            },
          }
        : snap;
    text = await this.deps.seal(this.live.viewKey, { ...parts, content: JSON.stringify(lean) });
    return text.length <= MAX_MESSAGE ? text : null;
  }

  private async flush(): Promise<void> {
    this.timer = null;
    this.flushing = true;
    let failed = false;
    try {
      if (this.deps.now() - this.playersAt > PLAYERS_TTL_MS) {
        this.players = await this.deps.getPlayers();
        this.playersAt = this.deps.now();
      }
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
    if (known.game.liveHandedOver && known.game.live === false) return 'handed';
    if (known.game.live === false) return 'off';
    const p = this.pending.get(gameId);
    return p && this.deps.now() - p.since > WAIT_AFTER_MS ? 'wait' : 'on';
  }

  /** Wie `status`, auch für ein Spiel, das der Sender noch nicht gesehen hat. */
  statusFor(game: Game): LiveStatus | null {
    if (this.games.has(game.id)) return this.status(game.id);
    if (!this.covers(game)) return null;
    if (game.liveHandedOver && game.live === false) return 'handed';
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
    this.stopped = true;
    this.pending.clear();
    this.teamOfPending.clear();
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

const sameSpieltag = (a: LiveSpieltag, b: LiveSpieltag): boolean =>
  a.topic === b.topic && a.viewKey === b.viewKey && a.orgPub === b.orgPub;

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
  if (!live || !live.teams.some((t) => sendsFor(live, t))) {
    stopLiveSender();
    return;
  }
  // Anderer Live-Spieltag: neuer Sender, damit nichts vom alten an das neue Topic geht.
  if (current && !sameSpieltag(current.spieltag(), live)) stopLiveSender();
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
