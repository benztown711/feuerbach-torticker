import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POLL_MS, publish, subscribe, type RelayMessage, type RelayState } from '../../src/platform/relay';

type Reply =
  { kind: 'lines'; chunks: string[] } | { kind: 'hang' } | { kind: 'status'; status: number } | { kind: 'error' };

/** Fake-fetch: beantwortet Anfragen der Reihe nach; "hang" hält den Stream offen, bis abgebrochen wird. */
function fakeFetch(replies: Reply[]) {
  const calls: { url: string; at: number; init?: RequestInit }[] = [];
  const impl = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, at: Date.now(), init });
    const r = replies.shift() ?? { kind: 'hang' };
    if (r.kind === 'error') throw new TypeError('Failed to fetch');
    if (r.kind === 'status') return new Response('{}', { status: r.status });
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        if (r.kind === 'lines') {
          for (const ch of r.chunks) c.enqueue(enc.encode(ch));
          c.close();
        } else {
          init?.signal?.addEventListener('abort', () => c.error(new DOMException('aborted', 'AbortError')));
        }
      },
    });
    return new Response(body, { status: 200 });
  };
  return { calls, impl };
}

function visibility(hidden = false) {
  const cbs = new Set<() => void>();
  return {
    hidden: () => hidden,
    onChange: (cb: () => void) => {
      cbs.add(cb);
      return () => cbs.delete(cb);
    },
    set(h: boolean) {
      hidden = h;
      for (const cb of cbs) cb();
    },
  };
}

const line = (o: object): string => `${JSON.stringify(o)}\n`;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.UTC(2026, 10, 7, 9, 0, 0));
});
afterEach(() => vi.useRealTimers());

describe('006 R-L1 Senden', () => {
  it('POST an https://ntfy.sh/<topic> mit dem Meldungstext; Erfolg, Fehlerstatus und kein Netz', async () => {
    const ok = vi.fn(async () => new Response('{}', { status: 200 }));
    expect(await publish('abc', 't1.xyz', ok)).toBe(true);
    expect(ok).toHaveBeenCalledWith('https://ntfy.sh/abc', expect.objectContaining({ method: 'POST', body: 't1.xyz' }));
    expect(await publish('abc', 'x', async () => new Response('', { status: 507 }))).toBe(false);
    expect(
      await publish('abc', 'x', async () => {
        throw new TypeError('offline');
      }),
    ).toBe(false);
  });
});

describe('006 FR-L07 FR-L15 SC-L08 Empfangen (research.md R-L2)', () => {
  it('liest Zeilen auch über Chunk-Grenzen, meldet Serverzeit und Meldungen, verbindet mit since=<letzte ID> neu', async () => {
    const f = fakeFetch([
      {
        kind: 'lines',
        chunks: [
          '{"id":"o1","time":1000,"event":"open","topic":"t"}\n{"id":"m1","ti',
          'me":990,"event":"message","topic":"t","message":"t1.a"}\nkein json\n',
          line({ id: 'k1', time: 1005, event: 'keepalive' }),
          line({ id: 'x', event: 'message' }),
          '{"id":"m2","time":1006,"event":"message","message":"t1.b"}',
        ],
      },
    ]);
    const msgs: RelayMessage[] = [];
    const times: number[] = [];
    const states: RelayState[] = [];
    const stop = subscribe('t', {
      fetchImpl: f.impl,
      visibility: visibility(),
      onMessage: (m) => msgs.push(m),
      onServerTime: (s) => times.push(s),
      onState: (s) => states.push(s),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(f.calls[0]?.url).toBe('https://ntfy.sh/t/json?since=12h');
    expect(msgs).toEqual([
      { id: 'm1', time: 990, message: 't1.a' },
      { id: 'm2', time: 1006, message: 't1.b' },
    ]);
    expect(times).toEqual([1000, 1005]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.calls[1]?.url).toBe('https://ntfy.sh/t/json?since=m2');
    expect(states).toEqual(['connecting', 'live']);
    stop();
  });

  it('Meldung ohne Zeit bekommt 0; eigener Startpunkt', async () => {
    const f = fakeFetch([{ kind: 'lines', chunks: [line({ id: 'm', event: 'message', message: 'x' })] }]);
    const msgs: RelayMessage[] = [];
    const stop = subscribe('t', {
      since: 'abc',
      fetchImpl: f.impl,
      visibility: visibility(),
      onMessage: (m) => msgs.push(m),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(f.calls[0]?.url).toContain('since=abc');
    expect(msgs[0]?.time).toBe(0);
    stop();
  });

  it('ohne Netz: Status offline, neue Versuche nach 1, 2, 4 … höchstens 30 s, dann wieder live', async () => {
    const f = fakeFetch([
      { kind: 'error' },
      { kind: 'error' },
      { kind: 'status', status: 502 },
      { kind: 'error' },
      { kind: 'error' },
      { kind: 'error' },
      { kind: 'error' },
      { kind: 'hang' },
    ]);
    const states: RelayState[] = [];
    const stop = subscribe('t', {
      fetchImpl: f.impl,
      visibility: visibility(),
      onMessage: () => undefined,
      onState: (s) => states.push(s),
    });
    await vi.advanceTimersByTimeAsync(0);
    for (const ms of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) await vi.advanceTimersByTimeAsync(ms);
    const t0 = f.calls[0]!.at;
    expect(f.calls.map((c) => (c.at - t0) / 1000)).toEqual([0, 1, 3, 7, 15, 31, 61, 91]);
    expect(states).toEqual(['connecting', 'offline', 'live']);
    stop();
  });

  it('429 (zu viele Verbindungen am Anschluss): Abfrage mit poll=1 alle 30 s', async () => {
    const f = fakeFetch([
      { kind: 'status', status: 429 },
      { kind: 'lines', chunks: [line({ id: 'm1', time: 1, event: 'message', message: 'a' })] },
      { kind: 'lines', chunks: [] },
    ]);
    const states: RelayState[] = [];
    const stop = subscribe('t', {
      fetchImpl: f.impl,
      visibility: visibility(),
      onMessage: () => undefined,
      onState: (s) => states.push(s),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(states).toContain('polling');
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(f.calls[1]?.url).toBe('https://ntfy.sh/t/json?since=12h&poll=1');
    await vi.advanceTimersByTimeAsync(POLL_MS - 1);
    expect(f.calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.calls[2]?.url).toBe('https://ntfy.sh/t/json?since=m1&poll=1');
    expect(states).toEqual(['connecting', 'polling']);
    stop();
  });

  it('verborgene Seite schließt den Stream; sichtbar verbindet sofort neu; stop() beendet alles', async () => {
    const f = fakeFetch([{ kind: 'hang' }, { kind: 'hang' }]);
    const vis = visibility();
    const states: RelayState[] = [];
    const stop = subscribe('t', {
      fetchImpl: f.impl,
      visibility: vis,
      onMessage: () => undefined,
      onState: (s) => states.push(s),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(f.calls).toHaveLength(1);
    vis.set(true);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(f.calls).toHaveLength(1);
    expect(states).not.toContain('offline');
    vis.set(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(f.calls).toHaveLength(2);
    stop();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(f.calls).toHaveLength(2);
  });

  it('startet die Seite verborgen, wartet der Empfang auf Sichtbarkeit', async () => {
    const f = fakeFetch([{ kind: 'hang' }]);
    const vis = visibility(true);
    const stop = subscribe('t', { fetchImpl: f.impl, visibility: vis, onMessage: () => undefined });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(f.calls).toHaveLength(0);
    vis.set(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(f.calls).toHaveLength(1);
    stop();
  });
});
