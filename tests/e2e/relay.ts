import { webcrypto } from 'node:crypto';
import type { BrowserContext, Route, WebSocketRoute } from '@playwright/test';
import {
  acceptsCfg,
  acceptsGame,
  gameRowsToDrop,
  hasRoom,
  objectName,
  parseWrite,
  plansToDrop,
  signedText,
  squadHasRoom,
  squadRowsToDrop,
  type GameWrite,
  type RelayWrite,
} from '../../src/domain/relay-protocol';

/**
 * Spec 007 T013: Nachbau des eigenen Vermittlungsdienstes für E2E-Tests (contracts/relay-api.md, data-model.md).
 * `POST` prüft wie der Worker (Anfrage, Schreibnachweis, Zertifikat, Ordnung, Auswahl), `/ws` schickt `hello` und
 * danach jede angenommene Meldung als `msg`, `ping` wird mit `pong` beantwortet. Die Testschnittstelle (`inject`,
 * `all`, `messages`, `fail`, `offsetMs`, `delayMs`) bleibt wie beim früheren Nachbau von ntfy.sh.
 */

export const RELAY_ORIGIN = 'https://torticker-relay.sportvg-feuerbach.workers.dev';
const WS_ORIGIN = RELAY_ORIGIN.replace(/^http/, 'ws');
const PATH = /^\/v1\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)(\/ws)?$/;

export interface StoredMessage {
  id: string;
  /** Serverzeit in Sekunden. */
  time: number;
  message: string;
  topic: string;
}

interface Row {
  seq: number;
  /** Serverzeit (ms) des letzten Schreibens. */
  time: number;
  first: number;
  body: string;
  kind: RelayWrite['kind'] | 'raw';
  slot?: string;
  grp?: string;
  h?: number;
  at?: number;
  iat?: number;
  gone?: boolean;
}

interface Store {
  rows: Row[];
  retired: boolean;
}

interface Socket {
  topic: string;
  name: string;
  ws: WebSocketRoute;
}

const CORS = { 'access-control-allow-origin': '*' };
const subtle = webcrypto.subtle;
const enc = (s: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(s) as Uint8Array<ArrayBuffer>;
const b64 = (s: string): Uint8Array<ArrayBuffer> => new Uint8Array(Buffer.from(s, 'base64url'));
const sha256 = async (s: string): Promise<string> =>
  Buffer.from(await subtle.digest('SHA-256', enc(s))).toString('base64url');

async function verify(pub: string, text: string, sig: string): Promise<boolean> {
  try {
    const key = await subtle.importKey('raw', b64(pub), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64(sig), enc(text));
  } catch {
    return false;
  }
}

export class FakeRelay {
  /** Objekte je `<topic>.<orgPub>` (R-N4). */
  private readonly stores = new Map<string, Store>();
  /** Mit `inject` direkt abgelegte Meldungen je Topic (z. B. gefälschte); gehen an jedes Objekt dieses Topics. */
  private readonly loose = new Map<string, Row[]>();
  /** Alles je Angenommene in Reihenfolge (für Tests, die prüfen, was gesendet wurde). */
  private readonly history: StoredMessage[] = [];
  private readonly sockets = new Set<Socket>();
  /** Rohtext jeder Schreibanfrage, wie sie beim Dienst ankommt (007 SC-N05: nichts im Klartext). */
  readonly posts: string[] = [];
  /** Antwortcodes der Schreibanfragen in Reihenfolge. */
  readonly statuses: number[] = [];
  private failing = false;
  /** Verschiebung der Serveruhr (ms), z. B. um eine falsch gehende Uhr zu prüfen. */
  offsetMs = 0;
  /** Langsamer Empfang: `hello` kommt erst nach so vielen Millisekunden (echte Zeit). */
  delayMs = 0;
  private seq = 0;

  /** Netz weg: Anfragen scheitern, offene Verbindungen brechen ab, neue kommen nicht zustande. */
  get fail(): boolean {
    return this.failing;
  }
  set fail(v: boolean) {
    this.failing = v;
    if (v) for (const s of [...this.sockets]) this.drop(s);
  }

  nowMs(): number {
    return Date.now() + this.offsetMs;
  }

  /** Serverzeit in Sekunden. */
  now(): number {
    return Math.floor(this.nowMs() / 1000);
  }

  messages(topic: string): StoredMessage[] {
    return this.history.filter((m) => m.topic === topic);
  }

  /** Alle angenommenen Meldungen aller Topics (für Tests mit nur einem Live-Spieltag). */
  all(): StoredMessage[] {
    return [...this.history];
  }

  /** Vergisst alles Gespeicherte (wie ein frisch aufgesetzter Dienst). */
  clear(): void {
    this.stores.clear();
    this.loose.clear();
    this.history.length = 0;
  }

  /** Legt eine Meldung direkt ab, ohne Prüfung (z. B. eine gefälschte); geht an alle Objekte dieses Topics. */
  inject(topic: string, message: string): StoredMessage {
    const time = this.nowMs();
    const row: Row = { seq: ++this.seq, time, first: time, body: message, kind: 'raw' };
    this.loose.set(topic, [...(this.loose.get(topic) ?? []), row]);
    const m = { id: String(row.seq), time: Math.floor(time / 1000), message, topic };
    this.history.push(m);
    for (const s of this.sockets) if (s.topic === topic) this.push(s, row);
    return m;
  }

  async attach(context: BrowserContext): Promise<void> {
    await context.route(`${RELAY_ORIGIN}/**`, (route) => this.handle(route));
    await context.routeWebSocket(
      (url) => url.href.startsWith(`${WS_ORIGIN}/`),
      (ws) => this.open(ws),
    );
  }

  private store(name: string): Store {
    let s = this.stores.get(name);
    if (!s) this.stores.set(name, (s = { rows: [], retired: false }));
    return s;
  }

  private push(s: Socket, row: Row): void {
    try {
      s.ws.send(JSON.stringify({ t: 'msg', seq: row.seq, time: Math.floor(row.time / 1000), body: row.body }));
    } catch {
      this.sockets.delete(s);
    }
  }

  private drop(s: Socket): void {
    this.sockets.delete(s);
    s.ws.close({ code: 1011, reason: 'Netz weg' }).catch(() => undefined);
  }

  private async open(ws: WebSocketRoute): Promise<void> {
    const url = new URL(ws.url());
    const m = PATH.exec(url.pathname);
    const name = m ? objectName(m[1], m[2]) : null;
    if (this.failing || !m?.[3] || !name) {
      await ws.close({ code: 1011, reason: 'nicht erreichbar' }).catch(() => undefined);
      return;
    }
    const topic = m[1] as string;
    const sinceText = url.searchParams.get('since');
    const since = sinceText !== null && /^\d{1,15}$/.test(sinceText) ? Number(sinceText) : 0;
    const socket: Socket = { topic, name, ws };
    ws.onMessage((msg) => {
      if (msg === 'ping') ws.send('pong');
    });
    ws.onClose(() => this.sockets.delete(socket));
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    if (this.failing) {
      await ws.close({ code: 1011, reason: 'Netz weg' }).catch(() => undefined);
      return;
    }
    const rows = [...this.store(name).rows, ...(this.loose.get(topic) ?? [])]
      .filter((r) => r.seq > since)
      .sort((a, b) => a.seq - b.seq);
    const msgs = rows.map((r) => ({ seq: r.seq, time: Math.floor(r.time / 1000), body: r.body }));
    ws.send(JSON.stringify({ t: 'hello', time: this.now(), msgs }));
    this.sockets.add(socket);
  }

  private async handle(route: Route): Promise<void> {
    const req = route.request();
    if (this.failing) return route.abort('internetdisconnected');
    if (req.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: { ...CORS, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type' },
      });
    }
    const m = PATH.exec(new URL(req.url()).pathname);
    const name = m && !m[3] ? objectName(m[1], m[2]) : null;
    if (req.method() !== 'POST' || !m || !name) return route.fulfill({ status: 404, headers: CORS });
    const text = req.postData() ?? '';
    this.posts.push(text);
    const status = await this.write(m[1] as string, name, text);
    this.statuses.push(typeof status === 'number' ? status : 200);
    return route.fulfill(
      typeof status === 'number'
        ? { status, headers: CORS }
        : { status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(status) },
    );
  }

  /** Wie der Worker (relay/src/spieltag.ts): prüfen, ordnen, speichern, verteilen. */
  private async write(topic: string, name: string, text: string): Promise<number | { seq: number }> {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return 400;
    }
    const w = parseWrite(raw);
    if (!w) return 400;
    if (!(await this.verified(name, w))) return 403;
    const store = this.store(name);
    if (store.retired) return 409;
    const now = this.nowMs();
    const games = store.rows.filter((r) => r.kind === 'game');
    const groups = [...new Set(games.map((r) => r.grp as string))];
    let row: Row;
    if (w.kind === 'game') {
      const old = games.find((r) => r.slot === w.slot);
      if (!acceptsGame(old ? { h: old.h as number, at: old.at as number } : null, w)) return 204;
      if (!hasRoom(groups, store.rows.length, w, old !== undefined)) return 413;
      row = {
        seq: ++this.seq,
        kind: 'game',
        slot: w.slot,
        grp: w.group,
        h: w.h,
        at: w.at,
        gone: w.gone,
        first: old?.first ?? now,
        time: now,
        body: w.body,
      };
      store.rows = [...store.rows.filter((r) => r.slot !== w.slot), row];
      const drop = gameRowsToDrop(
        store.rows
          .filter((r) => r.kind === 'game')
          .map((r) => ({ slot: r.slot as string, grp: r.grp as string, gone: !!r.gone, first: r.first, time: r.time })),
        now,
      );
      store.rows = store.rows.filter((r) => !drop.includes(r.slot as string));
    } else if (w.kind === 'cfg') {
      const old = store.rows.find((r) => r.kind === 'cfg');
      if (!acceptsCfg(old?.iat ?? null, w.iat)) return 204;
      if (!hasRoom(groups, store.rows.length, w, old !== undefined)) return 413;
      row = { seq: ++this.seq, kind: 'cfg', iat: w.iat, first: now, time: now, body: w.body };
      store.rows = [...store.rows.filter((r) => r.kind !== 'cfg'), row];
    } else if (w.kind === 'squad') {
      // Spec 016: ein geteilter Kader je slot, ersetzt bei at ≥, höchstens 6 geteilte.
      const old = store.rows.find((r) => r.kind === 'squad' && r.slot === w.slot);
      if (!acceptsCfg(old?.at ?? null, w.at)) return 204;
      const active = store.rows.filter((r) => r.kind === 'squad' && !r.gone).length;
      if (!squadHasRoom(active, store.rows.length, w, old ? { gone: !!old.gone } : null)) return 413;
      row = {
        seq: ++this.seq,
        kind: 'squad',
        slot: w.slot,
        at: w.at,
        gone: w.gone,
        first: old?.first ?? now,
        time: now,
        body: w.body,
      };
      store.rows = [...store.rows.filter((r) => r.slot !== w.slot), row];
      const drop = squadRowsToDrop(
        store.rows
          .filter((r) => r.kind === 'squad')
          .map((r) => ({ slot: r.slot as string, gone: !!r.gone, time: r.time })),
        now,
      );
      store.rows = store.rows.filter((r) => !drop.includes(r.slot as string));
    } else if (w.kind === 'plan') {
      if (!hasRoom(groups, store.rows.length, w, false)) return 413;
      row = { seq: ++this.seq, kind: 'plan', first: now, time: now, body: w.body };
      store.rows = [...store.rows, row];
      const drop = plansToDrop(store.rows.filter((r) => r.kind === 'plan').map((r) => r.seq));
      store.rows = store.rows.filter((r) => !drop.includes(r.seq));
    } else {
      row = { seq: ++this.seq, kind: 'retire', first: now, time: now, body: w.body };
      store.rows = [row];
      store.retired = true;
      // Wie beim Dienst ist danach alles weg, auch direkt abgelegte Meldungen dieses Topics.
      this.loose.delete(topic);
    }
    this.history.push({ id: String(row.seq), time: Math.floor(now / 1000), message: w.body, topic });
    for (const s of this.sockets) if (s.name === name) this.push(s, row);
    return { seq: row.seq };
  }

  private async verified(name: string, w: RelayWrite): Promise<boolean> {
    const orgPub = name.slice(name.indexOf('.') + 1);
    const text = signedText(name, w, await sha256(w.body));
    if (w.kind !== 'game' || !w.cert) return verify(orgPub, text, w.sig);
    const pub = await this.leadKey(orgPub, w as GameWrite & { cert: { d: string; s: string } });
    return pub !== null && verify(pub, text, w.sig);
  }

  private async leadKey(orgPub: string, w: GameWrite & { cert: { d: string; s: string } }): Promise<string | null> {
    let cert: { pub?: unknown };
    try {
      cert = JSON.parse(w.cert.d) as { pub?: unknown };
    } catch {
      return null;
    }
    if (typeof cert.pub !== 'string' || !(await verify(orgPub, w.cert.d, w.cert.s))) return null;
    return cert.pub;
  }
}
