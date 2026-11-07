import { DurableObject } from 'cloudflare:workers';
import { fromBase64Url, toBase64Url } from '../../src/domain/base64url';
import { MAX_KEY, isKey, isObj, isText } from '../../src/domain/live-validate';
import {
  RETENTION_MS,
  acceptsCfg,
  acceptsGame,
  gameRowsToDrop,
  hasRoom,
  parseWrite,
  plansToDrop,
  signedText,
  type GameRow,
  type GameWrite,
  type RelayWrite,
} from '../../src/domain/relay-protocol';

/**
 * Spec 007 research.md R-N2 bis R-N5, data-model.md: ein Durable Object je Live-Spieltag. Prüft Schreibnachweise,
 * hält die richtige Auswahl verschlüsselter Meldungen vor und schickt neue an alle offenen WebSockets
 * (Hibernation). Sieht nie Klartext.
 */

/** Vom Worker gesetzt: Name des Objekts (`<topic>.<orgPub>`). */
export const NAME_HEADER = 'x-relay-name';
/** Größe einer Schreibanfrage (JSON mit Meldung, Signatur, Zertifikat). */
const MAX_REQUEST = 12_000;
const EC = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIG = { name: 'ECDSA', hash: 'SHA-256' } as const;
const enc = (s: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(s) as Uint8Array<ArrayBuffer>;

const sha256 = async (text: string): Promise<string> =>
  toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc(text))));

async function verify(pub: string, text: string, sig: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey('raw', fromBase64Url(pub), EC, false, ['verify']);
    return await crypto.subtle.verify(SIG, key, fromBase64Url(sig), enc(text));
  } catch {
    return false;
  }
}

const json = (status: number, value?: unknown): Response =>
  value === undefined
    ? new Response(null, { status })
    : new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

type Row = { seq: number; time: number; body: string };

export class Spieltag extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // `ping` beantwortet die Laufzeit selbst, ohne das Objekt aufzuwecken (R-N6).
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  private get sql(): SqlStorage {
    return this.ctx.storage.sql;
  }

  /** Tabellen anlegen (auch nach `deleteAll` durch den Alarm). */
  private schema(): void {
    this.sql.exec(`CREATE TABLE IF NOT EXISTS msg (
      seq INTEGER PRIMARY KEY, kind TEXT NOT NULL, slot TEXT UNIQUE, grp TEXT, h INTEGER, at INTEGER,
      iat INTEGER, gone INTEGER, first INTEGER NOT NULL, time INTEGER NOT NULL, body TEXT NOT NULL)`);
    this.sql.exec('CREATE TABLE IF NOT EXISTS cert (hash TEXT PRIMARY KEY)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v INTEGER NOT NULL)');
  }

  private nextSeq(): number {
    this.sql.exec("INSERT INTO meta (k, v) VALUES ('seq', 1) ON CONFLICT(k) DO UPDATE SET v = v + 1");
    return this.sql.exec<{ v: number }>("SELECT v FROM meta WHERE k = 'seq'").one().v;
  }

  private retired(): boolean {
    return this.sql.exec("SELECT 1 FROM meta WHERE k = 'retired'").toArray().length > 0;
  }

  override async fetch(request: Request): Promise<Response> {
    const name = request.headers.get(NAME_HEADER) ?? '';
    // Nur der Worker kennt den Namen; er muss zu diesem Objekt gehören.
    if (!this.env.SPIELTAG.idFromName(name).equals(this.ctx.id)) return json(400);
    this.schema();
    if (new URL(request.url).pathname.endsWith('/ws')) return this.openSocket(request);
    return this.write(request, name);
  }

  /** R-N6: WebSocket annehmen und `hello` mit allen Zeilen nach `since` schicken. */
  private openSocket(request: Request): Response {
    const sinceText = new URL(request.url).searchParams.get('since');
    const since = sinceText !== null && /^\d{1,15}$/.test(sinceText) ? Number(sinceText) : 0;
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    const msgs = this.sql
      .exec<Row>('SELECT seq, time, body FROM msg WHERE seq > ? ORDER BY seq', since)
      .toArray()
      .map((r) => ({ seq: r.seq, time: Math.floor(r.time / 1000), body: r.body }));
    server.send(JSON.stringify({ t: 'hello', time: Math.floor(Date.now() / 1000), msgs }));
    return new Response(null, { status: 101, webSocket: client });
  }

  /** R-N4, R-N5: Schreibanfrage prüfen, ordnen, speichern, verteilen. */
  private async write(request: Request, name: string): Promise<Response> {
    // Größe vor dem Einlesen prüfen (Content-Length), danach noch einmal am Text.
    const declared = Number(request.headers.get('content-length') ?? '0');
    if (!Number.isFinite(declared) || declared > MAX_REQUEST) return json(413);
    const text = await request.text();
    if (text.length > MAX_REQUEST) return json(413);
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return json(400);
    }
    const w = parseWrite(raw);
    if (!w) return json(400);
    if (!(await this.verified(name, w))) return json(403);
    if (this.retired()) return json(409);
    const now = Date.now();
    const result = this.apply(w, now);
    if ('status' in result) return json(result.status);
    const { seq } = result;
    await this.ctx.storage.setAlarm(now + RETENTION_MS);
    const frame = JSON.stringify({ t: 'msg', seq, time: Math.floor(now / 1000), body: w.body });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(frame);
      } catch {
        // Verbindung schon zu: die Laufzeit räumt sie auf.
      }
    }
    return json(200, { seq });
  }

  /**
   * Signatur gegen den Organisator-Schlüssel bzw. das von ihm signierte Lead-Zertifikat (R-N4). Ein Spiel ohne
   * Zertifikat muss vom Organisator-Schlüssel signiert sein (Trainer-Handy, FR-N05).
   */
  private async verified(name: string, w: RelayWrite): Promise<boolean> {
    const orgPub = name.slice(name.indexOf('.') + 1);
    const signed = signedText(name, w, await sha256(w.body));
    if (w.kind !== 'game' || !w.cert) return verify(orgPub, signed, w.sig);
    const leadPub = await this.leadKey(orgPub, w as GameWrite & { cert: NonNullable<GameWrite['cert']> });
    return leadPub !== null && verify(leadPub, signed, w.sig);
  }

  /** Öffentlicher Lead-Schlüssel aus einem gültigen Zertifikat; geprüfte Zertifikate werden gemerkt. */
  private async leadKey(
    orgPub: string,
    w: GameWrite & { cert: NonNullable<GameWrite['cert']> },
  ): Promise<string | null> {
    let cert: unknown;
    try {
      cert = JSON.parse(w.cert.d);
    } catch {
      return null;
    }
    // Wie parseLeadCert in der App (Spec 006 R-L5) mindestens Mannschaft und Schlüssel; den Rest prüft das Dashboard.
    if (!isObj(cert) || !isText(cert.key, MAX_KEY) || !isKey(cert.pub, 65)) return null;
    const hash = await sha256(`${w.cert.d}|${w.cert.s}`);
    const known = this.sql.exec('SELECT 1 FROM cert WHERE hash = ?', hash).toArray().length > 0;
    if (!known) {
      if (!(await verify(orgPub, w.cert.d, w.cert.s))) return null;
      this.sql.exec('INSERT OR IGNORE INTO cert (hash) VALUES (?)', hash);
    }
    return cert.pub;
  }

  /** Speichert nach den Regeln aus data-model.md; liefert die neue `seq` oder einen Statuscode. */
  private apply(w: RelayWrite, now: number): { seq: number } | { status: 204 | 413 } {
    const groups = this.sql
      .exec<{ grp: string }>("SELECT DISTINCT grp FROM msg WHERE kind = 'game'")
      .toArray()
      .map((r) => r.grp);
    const rows = this.sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM msg').one().n;
    if (w.kind === 'game') {
      const old = this.sql
        .exec<{ h: number; at: number; first: number }>('SELECT h, at, first FROM msg WHERE slot = ?', w.slot)
        .toArray()[0];
      if (!acceptsGame(old ?? null, w)) return { status: 204 };
      if (!hasRoom(groups, rows, w, old !== undefined)) return { status: 413 };
      const seq = this.nextSeq();
      this.sql.exec('DELETE FROM msg WHERE slot = ?', w.slot);
      this.sql.exec(
        "INSERT INTO msg (seq, kind, slot, grp, h, at, gone, first, time, body) VALUES (?, 'game', ?, ?, ?, ?, ?, ?, ?, ?)",
        seq,
        w.slot,
        w.group,
        w.h,
        w.at,
        w.gone ? 1 : 0,
        old?.first ?? now,
        now,
        w.body,
      );
      const games = this.sql
        .exec<{ slot: string; grp: string; gone: number; first: number; time: number }>(
          "SELECT slot, grp, gone, first, time FROM msg WHERE kind = 'game'",
        )
        .toArray()
        .map((r): GameRow => ({ ...r, gone: r.gone === 1 }));
      for (const slot of gameRowsToDrop(games, now)) this.sql.exec('DELETE FROM msg WHERE slot = ?', slot);
      return { seq };
    }
    if (w.kind === 'cfg') {
      const old = this.sql.exec<{ iat: number }>("SELECT iat FROM msg WHERE kind = 'cfg'").toArray()[0];
      if (!acceptsCfg(old?.iat ?? null, w.iat)) return { status: 204 };
      if (!hasRoom(groups, rows, w, old !== undefined)) return { status: 413 };
      const seq = this.nextSeq();
      this.sql.exec("DELETE FROM msg WHERE kind = 'cfg'");
      this.sql.exec(
        "INSERT INTO msg (seq, kind, iat, first, time, body) VALUES (?, 'cfg', ?, ?, ?, ?)",
        seq,
        w.iat,
        now,
        now,
        w.body,
      );
      return { seq };
    }
    if (w.kind === 'plan') {
      if (!hasRoom(groups, rows, w, false)) return { status: 413 };
      const seq = this.nextSeq();
      this.sql.exec(
        "INSERT INTO msg (seq, kind, first, time, body) VALUES (?, 'plan', ?, ?, ?)",
        seq,
        now,
        now,
        w.body,
      );
      const seqs = this.sql
        .exec<{ seq: number }>("SELECT seq FROM msg WHERE kind = 'plan'")
        .toArray()
        .map((r) => r.seq);
      for (const s of plansToDrop(seqs)) this.sql.exec('DELETE FROM msg WHERE seq = ?', s);
      return { seq };
    }
    // retire: alles weg bis auf den Hinweis, danach nimmt das Objekt nichts mehr an (FR-N12).
    const seq = this.nextSeq();
    this.sql.exec('DELETE FROM msg');
    this.sql.exec(
      "INSERT INTO msg (seq, kind, first, time, body) VALUES (?, 'retire', ?, ?, ?)",
      seq,
      now,
      now,
      w.body,
    );
    this.sql.exec("INSERT INTO meta (k, v) VALUES ('retired', 1) ON CONFLICT(k) DO NOTHING");
    return { seq };
  }

  override async webSocketMessage(): Promise<void> {
    // Clients senden nur `ping` (Auto-Antwort); alles andere wird ignoriert.
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1005 ? 1000 : code, 'bye');
    } catch {
      // schon geschlossen
    }
  }

  /** FR-N12: ein Jahr ohne Meldung: alles löschen; "neu ausgestellt" bleibt endgültig. */
  override async alarm(): Promise<void> {
    this.schema();
    const retired = this.retired();
    await this.ctx.storage.deleteAll();
    if (retired) {
      this.schema();
      this.sql.exec("INSERT INTO meta (k, v) VALUES ('retired', 1)");
    }
  }
}
