import { parseServerFrame, type RelayWrite } from '../domain/relay-protocol';

/**
 * Spec 007 research.md R-N6, contracts/relay-api.md: eigener Vermittlungsdienst (Cloudflare Worker).
 * Senden per POST mit Ordnungsangaben und Schreibnachweis; Empfangen per WebSocket: `hello` mit allem
 * Gespeicherten nach `since`, danach je Schreibvorgang `msg`. `ping` alle 30 s, Neuverbindung nach Stille, Abbruch
 * und beim Zurückkehren in den Vordergrund. Bei verborgener Seite ruht die Verbindung.
 */

/** Adresse des Dienstes; nicht geheim (R-N8). Für Tests über `VITE_RELAY_ORIGIN` überschreibbar. */
export const RELAY_ORIGIN: string =
  (import.meta.env?.VITE_RELAY_ORIGIN as string | undefined) ?? 'https://torticker-relay.sportvg-feuerbach.workers.dev';
/** R-N6: Lebenszeichen des Clients; der Dienst antwortet `pong` ohne aufzuwachen. */
export const PING_MS = 30_000;
/** Kommt so lange gar nichts (auch kein `pong`), hängt die Verbindung: neu aufbauen, damit "Stand von" stimmt (FR-L15). */
export const STALL_MS = 90_000;
const MAX_BACKOFF_MS = 30_000;

export interface RelayMessage {
  /** Laufende Nummer beim Dienst (`seq`), für `since`. */
  seq: number;
  /** Serverzeit in Sekunden. */
  time: number;
  message: string;
}

export type RelayState = 'connecting' | 'live' | 'offline';

/** Objekt eines Live-Spieltags beim Dienst: Topic und Organisator-Schlüssel aus dem Zuschauer-Link (R-N4). */
export interface RelayTarget {
  topic: string;
  orgPub: string;
}

const objectUrl = (t: RelayTarget): string => `${RELAY_ORIGIN}/v1/${t.topic}/${t.orgPub}`;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Sendet eine signierte Schreibanfrage. true, wenn nichts mehr zu tun ist: angenommen (200), älter als der
 * gespeicherte Stand (204) oder endgültig abgelehnt (andere 4xx; erneutes Senden änderte nichts). false bei
 * fehlendem Netz, Gratis-Grenze (429) und Fehlern des Dienstes (5xx): dann später erneut.
 * Ohne `content-type` (Text) ist die Anfrage "einfach" und braucht keine CORS-Vorabfrage.
 */
export async function publish(target: RelayTarget, write: RelayWrite, fetchImpl: FetchLike = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl(objectUrl(target), { method: 'POST', body: JSON.stringify(write), cache: 'no-store' });
    return res.status < 500 && res.status !== 429 && res.status !== 408;
  } catch {
    return false;
  }
}

/** Was der Client von einer WebSocket-Verbindung braucht (Browser-`WebSocket` oder Testnachbau). */
export interface SocketLike {
  onopen: (() => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(): void;
}

export interface SubscribeOptions {
  /** Startpunkt: zuletzt empfangene `seq`; ohne: alles Gespeicherte. */
  since?: number;
  onMessage: (m: RelayMessage) => void;
  /** Serverzeit (Sekunden) aus `hello` für den Uhrenabgleich (R-L4); kommt vor den gespeicherten Meldungen. */
  onServerTime?: (seconds: number) => void;
  onState?: (s: RelayState) => void;
  /** Jedes Lebenszeichen des Dienstes (`hello`, `msg`, `pong`). */
  onAlive?: () => void;
  socket?: (url: string) => SocketLike;
  /** Sichtbarkeit der Seite; Vorgabe `document`. */
  visibility?: { hidden(): boolean; onChange(cb: () => void): () => void };
  now?: () => number;
}

const docVisibility = {
  hidden: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  onChange: (cb: () => void) => {
    if (typeof document === 'undefined') return () => undefined;
    document.addEventListener('visibilitychange', cb);
    return () => document.removeEventListener('visibilitychange', cb);
  },
};

/** Abonniert den Live-Spieltag; liefert die Funktion zum Beenden. */
export function subscribe(target: RelayTarget, opts: SubscribeOptions): () => void {
  const open = opts.socket ?? ((url: string) => new WebSocket(url) as unknown as SocketLike);
  const vis = opts.visibility ?? docVisibility;
  const now = opts.now ?? Date.now;
  const base = `${objectUrl(target).replace(/^http/, 'ws')}/ws`;
  let since = opts.since;
  let stopped = false;
  let backoff = 1000;
  let socket: SocketLike | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let beat: ReturnType<typeof setInterval> | null = null;
  let lastFrame = 0;
  let state: RelayState | null = null;

  const setState = (s: RelayState): void => {
    if (s !== state) {
      state = s;
      opts.onState?.(s);
    }
  };

  /** Verbindung schließen, ohne dass ihr `onclose` noch etwas auslöst. */
  const drop = (): void => {
    if (beat !== null) clearInterval(beat);
    beat = null;
    const s = socket;
    socket = null;
    if (!s) return;
    s.onopen = s.onmessage = s.onclose = s.onerror = null;
    try {
      s.close();
    } catch {
      // schon zu
    }
  };

  const later = (): void => {
    if (stopped || retry !== null || vis.hidden()) return;
    setState('offline');
    retry = setTimeout(() => {
      retry = null;
      connect();
    }, backoff);
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
  };

  const deliver = (m: { seq: number; time: number; body: string }): void => {
    since = Math.max(since ?? 0, m.seq);
    opts.onMessage({ seq: m.seq, time: m.time, message: m.body });
  };

  const onFrame = (data: unknown): void => {
    lastFrame = now();
    if (data === 'pong') {
      opts.onAlive?.();
      return;
    }
    const frame = typeof data === 'string' ? parseServerFrame(data) : null;
    if (!frame) return;
    if (frame.t === 'hello') {
      backoff = 1000;
      setState('live');
      opts.onServerTime?.(frame.time);
      opts.onAlive?.();
      for (const m of frame.msgs) deliver(m);
      return;
    }
    opts.onAlive?.();
    deliver(frame);
  };

  function connect(): void {
    if (stopped || socket || vis.hidden()) return;
    if (state !== 'offline') setState('connecting');
    let s: SocketLike;
    try {
      s = open(since === undefined ? base : `${base}?since=${since}`);
    } catch {
      later();
      return;
    }
    socket = s;
    lastFrame = now();
    s.onmessage = (ev) => onFrame(ev.data);
    s.onclose = s.onerror = () => {
      drop();
      later();
    };
    beat = setInterval(() => {
      if (now() - lastFrame > STALL_MS) {
        drop();
        later();
        return;
      }
      try {
        socket?.send('ping');
      } catch {
        // Verbindung bricht ab: onclose baut neu auf.
      }
    }, PING_MS);
  }

  const offVis = vis.onChange(() => {
    if (vis.hidden()) {
      // iOS trennt im Hintergrund ohnehin; beim Zurückkehren sofort neu (R-N6).
      drop();
      return;
    }
    if (retry !== null) clearTimeout(retry);
    retry = null;
    backoff = 1000;
    connect();
  });

  connect();
  return () => {
    stopped = true;
    offVis();
    if (retry !== null) clearTimeout(retry);
    drop();
  };
}
