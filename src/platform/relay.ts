/**
 * Spec 006 research.md R-L1, R-L2: Vermittlungsdienst ntfy.sh.
 * Senden per POST, Empfangen als JSON-Stream mit `fetch`; Neuverbindung mit `since=<letzte ID>`,
 * bei 429 (zu viele Verbindungen) Abfrage alle 30 s. Bei verborgener Seite ruht der Stream.
 */

export const RELAY_ORIGIN = 'https://ntfy.sh';
export const POLL_MS = 30_000;
/** Nach so vielen Abfragen (5 Minuten) wird wieder der Stream versucht. */
export const POLLS_BEFORE_STREAM = 10;
const MAX_BACKOFF_MS = 30_000;

export interface RelayMessage {
  id: string;
  /** Serverzeit in Sekunden. */
  time: number;
  message: string;
}

export type RelayState = 'connecting' | 'live' | 'offline' | 'polling';

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** Sendet einen Meldungstext; true bei Erfolg. Fehler (kein Netz, Dienst weg) ergeben false. */
export async function publish(topic: string, text: string, fetchImpl: FetchLike = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl(`${RELAY_ORIGIN}/${topic}`, { method: 'POST', body: text, cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export interface SubscribeOptions {
  /** Startpunkt: Meldungs-ID oder Dauer; Vorgabe "12h" (alles, was der Dienst vorhält). */
  since?: string;
  onMessage: (m: RelayMessage) => void;
  /** Serverzeit (Sekunden) aus `open`/`keepalive` für den Uhrenabgleich (R-L4). */
  onServerTime?: (seconds: number) => void;
  onState?: (s: RelayState) => void;
  fetchImpl?: FetchLike;
  /** Sichtbarkeit der Seite; Vorgabe `document`. */
  visibility?: { hidden(): boolean; onChange(cb: () => void): () => void };
}

const docVisibility = {
  hidden: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  onChange: (cb: () => void) => {
    if (typeof document === 'undefined') return () => undefined;
    document.addEventListener('visibilitychange', cb);
    return () => document.removeEventListener('visibilitychange', cb);
  },
};

/** Abonniert ein Topic; liefert die Funktion zum Beenden. */
export function subscribe(topic: string, opts: SubscribeOptions): () => void {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const vis = opts.visibility ?? docVisibility;
  let since = opts.since ?? '12h';
  let polling = false;
  let polls = 0;
  let stopped = false;
  let backoff = 1000;
  let ctrl: AbortController | null = null;
  let wake: (() => void) | null = null;
  let state: RelayState | null = null;

  const setState = (s: RelayState): void => {
    if (s !== state) {
      state = s;
      opts.onState?.(s);
    }
  };

  /** Wartet `ms` oder bis `wake()` (Ende, Sichtbarkeit). */
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      const t = setTimeout(done, ms);
      function done(): void {
        clearTimeout(t);
        wake = null;
        resolve();
      }
      wake = done;
    });

  const offVis = vis.onChange(() => {
    if (vis.hidden()) ctrl?.abort();
    else wake?.();
  });

  const handle = (line: string): void => {
    let ev: Record<string, unknown>;
    try {
      ev = JSON.parse(line) as Record<string, unknown>;
    } catch {
      return;
    }
    if ((ev.event === 'open' || ev.event === 'keepalive') && typeof ev.time === 'number') opts.onServerTime?.(ev.time);
    if (ev.event === 'message' && typeof ev.id === 'string' && typeof ev.message === 'string') {
      since = ev.id;
      opts.onMessage({ id: ev.id, time: typeof ev.time === 'number' ? ev.time : 0, message: ev.message });
    }
  };

  async function readLines(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl = buf.indexOf('\n');
      while (nl >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) handle(line);
        nl = buf.indexOf('\n');
      }
    }
    if (buf.trim()) handle(buf.trim());
  }

  async function run(): Promise<void> {
    setState('connecting');
    while (!stopped) {
      if (vis.hidden()) {
        await sleep(MAX_BACKOFF_MS);
        continue;
      }
      ctrl = new AbortController();
      const url = `${RELAY_ORIGIN}/${topic}/json?since=${encodeURIComponent(since)}${polling ? '&poll=1' : ''}`;
      try {
        const res = await fetchImpl(url, { signal: ctrl.signal, cache: 'no-store' });
        if (res.status === 429) {
          polling = true;
          setState('polling');
          await sleep(POLL_MS);
          continue;
        }
        if (!res.ok || !res.body) throw new Error(`Status ${res.status}`);
        setState(polling ? 'polling' : 'live');
        await readLines(res.body);
        backoff = 1000;
        if (polling && ++polls >= POLLS_BEFORE_STREAM) {
          polling = false;
          polls = 0;
        }
        await sleep(polling ? POLL_MS : 1000);
      } catch {
        if (stopped) break;
        if (vis.hidden()) continue;
        setState('offline');
        await sleep(backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      }
    }
  }

  void run();
  return () => {
    stopped = true;
    offVis();
    ctrl?.abort();
    wake?.();
  };
}
