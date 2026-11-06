import { applyConfig, applySnapshot, emptyBoard, parseBoard, type Board } from '../domain/live-board';
import { parseSnapshot } from '../domain/live-snapshot';
import { parseConfig } from '../domain/live-spieltag';
import { isTime } from '../domain/live-validate';
import type { LiveConfig, SignedData, ViewerLink } from '../domain/types';
import { openMessage, type OpenedMessage } from './live-crypto';
import { subscribe, type RelayMessage, type RelayState, type SubscribeOptions } from './relay';

/**
 * Spec 006 US3: empfängt die Meldungen eines Live-Spieltags, prüft sie (FR-L11) und führt den
 * Stand des Dashboards. Der letzte Stand wird im Gerät gemerkt (FR-L16), Fehler dabei ignoriert.
 */

export const STORAGE_PREFIX = 'torticker-live:';
/**
 * Spec 006 FR-L22: so lange ohne neue Meldung gilt der erste Stand als geladen. ntfy schickt die
 * vorgehaltenen Meldungen direkt nach dem Verbinden, ohne Ende-Zeichen.
 */
export const SETTLE_QUIET_MS = 300;

export interface ReceiverState {
  board: Board;
  relay: RelayState;
  /** Serverzeit minus lokale Zeit in ms (R-L4). */
  skew: number;
  /** Lokale Zeit, zu der zuletzt eine Verbindung bestand ("Stand von", FR-L15). */
  liveAt: number | null;
}

type View = Pick<ViewerLink, 'topic' | 'viewKey' | 'orgPub'>;
type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export interface ReceiverDeps {
  now(): number;
  subscribe(topic: string, opts: SubscribeOptions): () => void;
  open(view: View, text: string): Promise<OpenedMessage | null>;
  storage: KeyValueStore | null;
  timeZone?: string;
  /** Spec 006 US5: jüngere signierte Konfiguration (Trainer-Handy übernimmt Titel und Mannschaften). */
  onConfig?(signed: SignedData): void;
}

export class LiveReceiver {
  private state: ReceiverState;
  private readonly listeners = new Set<() => void>();
  private stopRelay: (() => void) | null = null;
  private stopped = false;
  /** iat der jüngsten bekannten Konfiguration (vorab bekannt oder schon gemeldet). */
  private knownIat = 0;
  /** FR-L22: Meldungen, die gerade geprüft werden, und letzte Antwort oder Meldung des Dienstes. */
  private pending = 0;
  private lastActivity: number | null = null;
  private readonly waiters = new Set<() => void>();

  constructor(
    private readonly view: View,
    private readonly deps: ReceiverDeps,
  ) {
    const saved = this.load();
    this.state = { board: saved.board, relay: 'connecting', skew: 0, liveAt: saved.liveAt };
  }

  /**
   * Gemerkter Stand gilt nur für denselben Organisator-Schlüssel: Ein Link mit fremdem Schlüssel und
   * gleichem Topic darf den Stand des echten Dashboards nicht füllen (R-L12).
   */
  private get key(): string {
    return `${STORAGE_PREFIX}${this.view.topic}:${this.view.orgPub}`;
  }

  private load(): { board: Board; liveAt: number | null } {
    try {
      const raw = this.deps.storage?.getItem(this.key);
      const v = raw ? (JSON.parse(raw) as unknown) : null;
      const liveAt = (v as { liveAt?: unknown } | null)?.liveAt;
      return { board: parseBoard(v), liveAt: isTime(liveAt) ? liveAt : null };
    } catch {
      return { board: emptyBoard(), liveAt: null };
    }
  }

  private save(): void {
    try {
      this.deps.storage?.setItem(this.key, JSON.stringify({ ...this.state.board, liveAt: this.state.liveAt }));
    } catch {
      // Speicher voll oder gesperrt (privates Surfen): Anzeige läuft trotzdem.
    }
  }

  get(): ReceiverState {
    return this.state;
  }

  /** Jetzt in Serverzeit (R-L4). */
  serverNow(): number {
    return this.deps.now() + this.state.skew;
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private update(patch: Partial<ReceiverState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  start(): void {
    if (this.stopRelay || this.stopped) return;
    this.stopRelay = this.deps.subscribe(this.view.topic, {
      since: '12h',
      onMessage: (m) => {
        this.active(1);
        void this.receive(m).finally(() => this.active(-1));
      },
      onServerTime: (sec) => this.update({ skew: sec * 1000 - this.deps.now(), liveAt: this.deps.now() }),
      onAlive: () => this.update({ liveAt: this.deps.now() }),
      onState: (relay) => {
        const connected = relay === 'live' || relay === 'polling';
        if (connected) this.lastActivity = this.deps.now();
        this.update(connected ? { relay, liveAt: this.deps.now() } : { relay });
        this.wake();
      },
    });
  }

  /** Eine Meldung kommt an (+1) oder ist geprüft (-1). */
  private active(delta: 1 | -1): void {
    this.pending += delta;
    this.lastActivity = this.deps.now();
    this.wake();
  }

  private wake(): void {
    for (const w of [...this.waiters]) w();
  }

  /**
   * Spec 006 FR-L22: wartet, bis der erste Stand vom Dienst da und geprüft ist (verbunden, keine Meldung in
   * Prüfung, kurz Ruhe), höchstens `maxMs`. Ohne Netz oder nach dem Beenden sofort.
   */
  whenSettled(maxMs: number): Promise<void> {
    return new Promise((resolve) => {
      let quiet: ReturnType<typeof setTimeout> | undefined;
      const finish = (): void => {
        clearTimeout(cap);
        clearTimeout(quiet);
        this.waiters.delete(check);
        resolve();
      };
      const check = (): void => {
        clearTimeout(quiet);
        if (this.stopped || this.state.relay === 'offline') return finish();
        if (this.lastActivity === null || this.pending > 0) return;
        quiet = setTimeout(finish, Math.max(0, SETTLE_QUIET_MS - (this.deps.now() - this.lastActivity)));
      };
      const cap = setTimeout(finish, maxMs);
      this.waiters.add(check);
      check();
    });
  }

  /** Konfiguration, die das Gerät schon kennt (Organisator, Lead-Handy), bevor Meldungen kommen. */
  seed(config: LiveConfig): void {
    this.knownIat = Math.max(this.knownIat, config.iat);
    const board = applyConfig(this.state.board, config);
    if (board !== this.state.board) this.update({ board });
  }

  stop(): void {
    this.stopped = true;
    this.stopRelay?.();
    this.stopRelay = null;
    this.listeners.clear();
    this.wake();
  }

  private async receive(m: RelayMessage): Promise<void> {
    const opened = await this.deps.open(this.view, m.message).catch((): null => null);
    if (!opened || this.stopped) return;
    const at = m.time > 0 ? m.time * 1000 : this.serverNow();
    let board = this.state.board;
    const config = parseConfig(opened.config);
    if (config) board = applyConfig(board, config);
    if (config && opened.signedConfig && config.iat > this.knownIat) {
      this.knownIat = config.iat;
      this.deps.onConfig?.(opened.signedConfig);
    }
    const snap = parseSnapshot(opened.content);
    if (snap) board = applySnapshot(board, snap, at, this.deps.timeZone);
    const liveAt = this.deps.now();
    if (board === this.state.board) {
      this.update({ liveAt });
      return;
    }
    this.update({ board, liveAt });
    this.save();
  }
}

const browserStorage = (): KeyValueStore | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Empfänger für einen Zuschauer-Link mit echter Verbindung, Prüfung und Speicher. */
export function newReceiver(
  view: View,
  override: Partial<ReceiverDeps> = {},
  config: LiveConfig | null = null,
): LiveReceiver {
  const r = new LiveReceiver(view, {
    now: () => Date.now(),
    subscribe,
    open: openMessage,
    storage: browserStorage(),
    ...override,
  });
  // Bekannte Konfiguration (Organisator, Trainer-Handy) gilt sofort.
  if (config) r.seed(config);
  return r;
}
