import { applyConfig, applySnapshot, emptyBoard, parseBoard, type Board } from '../domain/live-board';
import { parseSnapshot } from '../domain/live-snapshot';
import { parseConfig } from '../domain/live-spieltag';
import { isTime } from '../domain/live-validate';
import type { ViewerLink } from '../domain/types';
import { openMessage, type OpenedMessage } from './live-crypto';
import { subscribe, type RelayMessage, type RelayState, type SubscribeOptions } from './relay';

/**
 * Spec 006 US3: empfängt die Meldungen eines Live-Spieltags, prüft sie (FR-L11) und führt den
 * Stand des Dashboards. Der letzte Stand wird im Gerät gemerkt (FR-L16), Fehler dabei ignoriert.
 */

export const STORAGE_PREFIX = 'torticker-live:';

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
}

export class LiveReceiver {
  private state: ReceiverState;
  private readonly listeners = new Set<() => void>();
  private stopRelay: (() => void) | null = null;
  private stopped = false;

  constructor(
    private readonly view: View,
    private readonly deps: ReceiverDeps,
  ) {
    const saved = this.load();
    this.state = { board: saved.board, relay: 'connecting', skew: 0, liveAt: saved.liveAt };
  }

  private get key(): string {
    return STORAGE_PREFIX + this.view.topic;
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
      onMessage: (m) => void this.receive(m),
      onServerTime: (sec) => this.update({ skew: sec * 1000 - this.deps.now(), liveAt: this.deps.now() }),
      onState: (relay) =>
        this.update(relay === 'live' || relay === 'polling' ? { relay, liveAt: this.deps.now() } : { relay }),
    });
  }

  stop(): void {
    this.stopped = true;
    this.stopRelay?.();
    this.stopRelay = null;
    this.listeners.clear();
  }

  private async receive(m: RelayMessage): Promise<void> {
    const opened = await this.deps.open(this.view, m.message).catch((): null => null);
    if (!opened || this.stopped) return;
    const at = m.time > 0 ? m.time * 1000 : this.serverNow();
    let board = this.state.board;
    const config = parseConfig(opened.config);
    if (config) board = applyConfig(board, config);
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
export const newReceiver = (view: View, override: Partial<ReceiverDeps> = {}): LiveReceiver =>
  new LiveReceiver(view, {
    now: () => Date.now(),
    subscribe,
    open: openMessage,
    storage: browserStorage(),
    ...override,
  });
