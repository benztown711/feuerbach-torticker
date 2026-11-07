import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RelayWrite } from '../../src/domain/relay-protocol';
import {
  PING_MS,
  RELAY_ORIGIN,
  STALL_MS,
  publish,
  subscribe,
  type RelayMessage,
  type RelayState,
  type SocketLike,
} from '../../src/platform/relay';

/** Spec 007 T014: WebSocket-Client und Senden per POST (contracts/relay-api.md). */

const TARGET = { topic: 'T'.repeat(22), orgPub: 'O'.repeat(87) };
const BASE = `${RELAY_ORIGIN.replace(/^http/, 'ws')}/v1/${TARGET.topic}/${TARGET.orgPub}/ws`;
const body = (n: number): string => `t1.${'A'.repeat(n)}`;

class FakeSocket implements SocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  closed = false;
  constructor(readonly url: string) {}
  send(data: string): void {
    if (this.closed) throw new Error('zu');
    this.sent.push(data);
  }
  close(): void {
    this.closed = true;
  }
  /** Server schickt einen Rahmen. */
  frame(v: unknown): void {
    this.onmessage?.({ data: typeof v === 'string' ? v : JSON.stringify(v) });
  }
  /** Verbindung bricht von außen ab. */
  drop(): void {
    this.onclose?.();
  }
}

function harness(o: { since?: number; hidden?: boolean; throwOnOpen?: boolean } = {}) {
  const sockets: FakeSocket[] = [];
  const messages: RelayMessage[] = [];
  const states: RelayState[] = [];
  const times: number[] = [];
  let alive = 0;
  let hidden = o.hidden ?? false;
  const cbs = new Set<() => void>();
  const vis = {
    hidden: () => hidden,
    onChange: (cb: () => void) => {
      cbs.add(cb);
      return () => cbs.delete(cb);
    },
  };
  let failOpen = o.throwOnOpen ?? false;
  const stop = subscribe(TARGET, {
    since: o.since,
    onMessage: (m) => messages.push(m),
    onState: (s) => states.push(s),
    onServerTime: (s) => times.push(s),
    onAlive: () => alive++,
    visibility: vis,
    socket: (url) => {
      if (failOpen) throw new Error('kein Netz');
      const s = new FakeSocket(url);
      sockets.push(s);
      return s;
    },
  });
  return {
    sockets,
    messages,
    states,
    times,
    alive: () => alive,
    stop,
    last: () => sockets.at(-1)!,
    setHidden(h: boolean) {
      hidden = h;
      for (const cb of cbs) cb();
    },
    setFailOpen(f: boolean) {
      failOpen = f;
    },
  };
}

const hello = (msgs: { seq: number; time?: number; body?: string }[], time = 1_794_040_000) => ({
  t: 'hello',
  time,
  msgs: msgs.map((m) => ({ seq: m.seq, time: m.time ?? time, body: m.body ?? body(4) })),
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.UTC(2026, 10, 7, 9, 0, 0));
});
afterEach(() => vi.useRealTimers());

describe('007 FR-N01 publish: POST an den eigenen Dienst', () => {
  const write = { kind: 'plan', body: body(8), sig: 'S'.repeat(86) } as RelayWrite;

  it('POST an /v1/<topic>/<orgPub> mit der Schreibanfrage als JSON, ohne content-type (keine Vorabfrage)', async () => {
    const f = vi.fn(async () => new Response('{"seq":3}', { status: 200 }));
    expect(await publish(TARGET, write, f)).toBe(true);
    expect(f).toHaveBeenCalledWith(`${RELAY_ORIGIN}/v1/${TARGET.topic}/${TARGET.orgPub}`, {
      method: 'POST',
      body: JSON.stringify(write),
      cache: 'no-store',
    });
    expect(RELAY_ORIGIN).toBe('https://torticker-relay.sportvg-feuerbach.workers.dev');
  });

  it('200 und 204 gelten als gesendet, endgültige Ablehnungen auch; 429, 408, 5xx und kein Netz nicht', async () => {
    const reply = (status: number) => async () => new Response(status === 204 ? null : '{}', { status });
    for (const s of [200, 204, 400, 403, 409, 413])
      expect(await publish(TARGET, write, reply(s)), String(s)).toBe(true);
    for (const s of [429, 408, 500, 503]) expect(await publish(TARGET, write, reply(s)), String(s)).toBe(false);
    expect(
      await publish(TARGET, write, async () => {
        throw new TypeError('Failed to fetch');
      }),
    ).toBe(false);
  });
});

describe('007 FR-N03 FR-N04 subscribe: WebSocket mit hello, msg, since, ping', () => {
  it('hello liefert Serverzeit vor den gespeicherten Meldungen, danach einzelne msg', () => {
    const h = harness();
    expect(h.last().url).toBe(BASE);
    expect(h.states).toEqual(['connecting']);
    h.last().frame(hello([{ seq: 4 }, { seq: 7, time: 100 }]));
    expect(h.states).toEqual(['connecting', 'live']);
    expect(h.times).toEqual([1_794_040_000]);
    expect(h.messages.map((m) => [m.seq, m.time])).toEqual([
      [4, 1_794_040_000],
      [7, 100],
    ]);
    h.last().frame({ t: 'msg', seq: 9, time: 200, body: body(6) });
    expect(h.messages.at(-1)).toEqual({ seq: 9, time: 200, message: body(6) });
    expect(h.alive()).toBe(2);
    h.stop();
  });

  it('ungültige Rahmen werden ignoriert, pong zählt als Lebenszeichen', () => {
    const h = harness();
    h.last().frame('kein json');
    h.last().onmessage?.({ data: new ArrayBuffer(2) });
    h.last().frame({ t: 'msg', seq: 1, time: 1, body: 'klartext' });
    expect(h.messages).toEqual([]);
    h.last().frame('pong');
    expect(h.alive()).toBe(1);
    h.stop();
  });

  it('startet mit since und verbindet nach Abbruch mit der letzten seq neu, Abstände 1, 2, 4 … 30 s', () => {
    const h = harness({ since: 12 });
    expect(h.last().url).toBe(`${BASE}?since=12`);
    h.last().frame(hello([{ seq: 13 }]));
    h.last().drop();
    expect(h.states.at(-1)).toBe('offline');
    vi.advanceTimersByTime(999);
    expect(h.sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(h.last().url).toBe(`${BASE}?since=13`);
    // ohne Antwort erneut: 2 s, 4 s, …
    h.last().drop();
    vi.advanceTimersByTime(2_000);
    expect(h.sockets).toHaveLength(3);
    for (const wait of [4_000, 8_000, 16_000, 30_000, 30_000]) {
      h.last().drop();
      vi.advanceTimersByTime(wait - 1);
      const n = h.sockets.length;
      vi.advanceTimersByTime(1);
      expect(h.sockets).toHaveLength(n + 1);
    }
    // nach einem hello wieder ab 1 s
    h.last().frame(hello([]));
    expect(h.states.at(-1)).toBe('live');
    h.last().drop();
    vi.advanceTimersByTime(1_000);
    expect(h.sockets.at(-1)?.closed).toBe(false);
    h.stop();
  });

  it('ping alle 30 s; Stille über 90 s baut neu auf', () => {
    const h = harness();
    h.last().frame(hello([]));
    vi.advanceTimersByTime(PING_MS);
    expect(h.last().sent).toEqual(['ping']);
    h.last().frame('pong');
    vi.advanceTimersByTime(PING_MS);
    expect(h.last().sent).toEqual(['ping', 'ping']);
    const first = h.last();
    // keine Antwort mehr
    vi.advanceTimersByTime(STALL_MS);
    expect(first.closed).toBe(true);
    expect(h.states.at(-1)).toBe('offline');
    vi.advanceTimersByTime(1_000);
    expect(h.sockets).toHaveLength(2);
    h.stop();
  });

  it('ping auf einer gerade abgebrochenen Verbindung wirft nicht', () => {
    const h = harness();
    h.last().frame(hello([]));
    h.last().closed = true;
    expect(() => vi.advanceTimersByTime(PING_MS)).not.toThrow();
    h.stop();
  });

  it('Hintergrund schließt, Vordergrund verbindet sofort neu (mit since)', () => {
    const h = harness();
    h.last().frame(hello([{ seq: 5 }]));
    h.setHidden(true);
    expect(h.last().closed).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(h.sockets).toHaveLength(1);
    h.setHidden(false);
    expect(h.sockets).toHaveLength(2);
    expect(h.last().url).toBe(`${BASE}?since=5`);
    h.stop();
  });

  it('versteckt gestartet: erst beim Sichtbarwerden verbinden; ein wartender Neuversuch entfällt', () => {
    const h = harness({ hidden: true });
    expect(h.sockets).toHaveLength(0);
    h.setHidden(false);
    expect(h.sockets).toHaveLength(1);
    h.last().drop();
    expect(h.states.at(-1)).toBe('offline');
    // während des Wartens kurz weg und wieder da: sofort neu, kein zweiter Versuch aus dem Timer
    h.setHidden(true);
    h.setHidden(false);
    expect(h.sockets).toHaveLength(2);
    vi.advanceTimersByTime(5_000);
    expect(h.sockets).toHaveLength(2);
    h.stop();
  });

  it('Verbindungsaufbau scheitert sofort: offline, später erneut', () => {
    const h = harness({ throwOnOpen: true });
    expect(h.states).toEqual(['connecting', 'offline']);
    h.setFailOpen(false);
    vi.advanceTimersByTime(1_000);
    expect(h.sockets).toHaveLength(1);
    h.stop();
  });

  it('Fehler der Verbindung wie Abbruch; nach stop keine Neuverbindung, Rahmen der alten Verbindung zählen nicht', () => {
    const h = harness();
    const s = h.last();
    s.onerror?.();
    expect(h.states.at(-1)).toBe('offline');
    h.stop();
    vi.advanceTimersByTime(60_000);
    expect(h.sockets).toHaveLength(1);
    expect(s.onmessage).toBeNull();
  });

  it('stop schließt eine offene Verbindung', () => {
    const h = harness();
    h.stop();
    expect(h.last().closed).toBe(true);
    // Abmelden der Sichtbarkeit: kein Neuaufbau mehr
    h.setHidden(false);
    expect(h.sockets).toHaveLength(1);
  });

  it('close einer schon geschlossenen Verbindung wirft nicht', () => {
    const h = harness();
    h.last().close = () => {
      throw new Error('schon zu');
    };
    expect(() => h.stop()).not.toThrow();
  });
});
