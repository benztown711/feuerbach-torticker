import {
  applyConfig,
  applyPlan,
  applySnapshot,
  boardJson,
  dayKey,
  emptyBoard,
  parseBoard,
  type Board,
} from '../domain/live-board';
import { parseSnapshot } from '../domain/live-snapshot';
import { parseConfig } from '../domain/live-spieltag';
import { isTime } from '../domain/live-validate';
import { parsePayload } from '../domain/plan';
import type { LiveConfig, SignedData, ViewerLink } from '../domain/types';
import { openMessage, type OpenedMessage } from './live-crypto';
import { subscribe, type RelayMessage, type RelayState, type RelayTarget, type SubscribeOptions } from './relay';

/**
 * Spec 006 US3: empfängt die Meldungen eines Live-Spieltags, prüft sie (FR-L11) und führt den
 * Stand des Dashboards. Der letzte Stand wird im Gerät gemerkt (FR-L16), Fehler dabei ignoriert.
 * Spec 007: mit dem Stand die zuletzt verarbeitete `seq`; beim nächsten Verbinden kommt nur Neueres.
 */

export const STORAGE_PREFIX = 'torticker-live:';
/**
 * Spec 006 FR-L22: so lange ohne neue Meldung gilt der erste Stand als geladen. Der Dienst schickt alles
 * Gespeicherte gleich nach dem Verbinden (`hello`); geprüft wird nacheinander.
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
  subscribe(target: RelayTarget, opts: SubscribeOptions): () => void;
  open(view: View, text: string): Promise<OpenedMessage | null>;
  storage: KeyValueStore | null;
  timeZone?: string;
  /** Spec 006 US5: jüngere signierte Konfiguration (Trainer-Handy übernimmt Titel und Mannschaften). */
  onConfig?(signed: SignedData): void;
  /** Spec 015: geprüfte Nutzlast einer Plan-Meldung mit ihrer Sendezeit (Serverzeit, FR-P07), nur Trainer-Handys. */
  onPlan?(payload: string, sentAt: number): void;
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
  /** Spec 007: zuletzt verarbeitete `seq` (gemerkt mit dem Stand) und Kette der Prüfungen in Reihenfolge. */
  private seq: number | undefined;
  private chain: Promise<void> = Promise.resolve();

  constructor(
    private readonly view: View,
    private readonly deps: ReceiverDeps,
  ) {
    const saved = this.load();
    this.seq = saved.seq;
    this.state = { board: saved.board, relay: 'connecting', skew: 0, liveAt: saved.liveAt };
  }

  /**
   * Gemerkter Stand gilt nur für denselben Organisator-Schlüssel: Ein Link mit fremdem Schlüssel und
   * gleichem Topic darf den Stand des echten Dashboards nicht füllen (R-L12).
   */
  private get key(): string {
    return `${STORAGE_PREFIX}${this.view.topic}:${this.view.orgPub}`;
  }

  private load(): { board: Board; liveAt: number | null; seq?: number } {
    try {
      const raw = this.deps.storage?.getItem(this.key);
      const v = raw ? (JSON.parse(raw) as unknown) : null;
      const { liveAt, seq } = (v ?? {}) as { liveAt?: unknown; seq?: unknown };
      return {
        board: parseBoard(v),
        liveAt: isTime(liveAt) ? liveAt : null,
        ...(Number.isSafeInteger(seq) && (seq as number) > 0 ? { seq: seq as number } : {}),
      };
    } catch {
      return { board: emptyBoard(), liveAt: null };
    }
  }

  private save(): void {
    try {
      this.deps.storage?.setItem(
        this.key,
        JSON.stringify({ ...boardJson(this.state.board), liveAt: this.state.liveAt, seq: this.seq }),
      );
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
    this.stopRelay = this.deps.subscribe(this.view, {
      since: this.seq,
      onMessage: (m) => {
        this.active(1);
        // Nacheinander, damit die gemerkte `seq` nie vor einer noch nicht verarbeiteten Meldung steht.
        this.chain = this.chain.then(() => this.receive(m)).finally(() => this.active(-1));
      },
      onServerTime: (sec) => {
        // `hello` kommt vor den gespeicherten Meldungen: ab hier zählt die Ruhezeit.
        this.lastActivity = this.deps.now();
        this.update({ skew: sec * 1000 - this.deps.now(), liveAt: this.deps.now() });
        this.wake();
      },
      onAlive: () => this.update({ liveAt: this.deps.now() }),
      onState: (relay) => {
        this.update(relay === 'live' ? { relay, liveAt: this.deps.now() } : { relay });
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
    if (this.stopped) return;
    const opened = await this.deps.open(this.view, m.message).catch((): null => null);
    if (this.stopped) return;
    this.seq = Math.max(this.seq ?? 0, m.seq);
    if (!opened) return;
    const at = m.time > 0 ? m.time * 1000 : this.serverNow();
    let board = this.state.board;
    const config = parseConfig(opened.config);
    if (config) board = applyConfig(board, config);
    if (config && opened.signedConfig && config.iat > this.knownIat) {
      this.knownIat = config.iat;
      this.deps.onConfig?.(opened.signedConfig);
    }
    if (opened.plan) {
      // Spec 015 R-P7: auch Eltern-Dashboards führen den Spielplan (US3, US7).
      const entries = parsePayload(opened.plan);
      if (entries) board = applyPlan(board, entries, dayKey(this.serverNow(), this.deps.timeZone));
      this.deps.onPlan?.(opened.plan, at);
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
