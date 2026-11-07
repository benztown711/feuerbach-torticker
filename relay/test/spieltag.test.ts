import { env, exports } from 'cloudflare:workers';
import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { fromBase64Url, toBase64Url } from '../../src/domain/base64url';
import {
  KEEP_PER_GROUP,
  KEEP_PLANS,
  MAX_BODY,
  signedText,
  type RelayDraft,
  type RelayWrite,
} from '../../src/domain/relay-protocol';

/**
 * Spec 007 tasks.md T006: Worker und Durable Object in workerd (Annehmen, Ablehnen, Ordnung, Auswahl,
 * WebSocket, Alarm, CORS). Signaturen wie auf den Handys (ECDSA P-256, research.md R-N4).
 */

const APP = 'https://benztown711.github.io';
const EC = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIG = { name: 'ECDSA', hash: 'SHA-256' } as const;
const enc = (s: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(s) as Uint8Array<ArrayBuffer>;

interface Key {
  pub: string;
  priv: CryptoKey;
}
async function newKey(): Promise<Key> {
  const pair = (await crypto.subtle.generateKey(EC, true, ['sign', 'verify'])) as CryptoKeyPair;
  const raw = new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer);
  return { pub: toBase64Url(raw), priv: pair.privateKey };
}
const sign = async (k: Key, text: string): Promise<string> =>
  toBase64Url(new Uint8Array(await crypto.subtle.sign(SIG, k.priv, enc(text))));
const hash = async (body: string): Promise<string> =>
  toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc(body))));
const randomId = (bytes: number): string => toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
const body = (n = 40): string => `t1.${randomId(n)}`;

/** Ein Live-Spieltag mit Organisator und einem Lead-Handy (Zertifikat vom Organisator). */
async function spieltag() {
  const org = await newKey();
  const lead = await newKey();
  const topic = randomId(16);
  const name = `${topic}.${org.pub}`;
  const certText = JSON.stringify({
    key: 'E1',
    name: 'Sportvg Feuerbach E1',
    homeColor: 'rot',
    awayColor: 'schwarz',
    pub: lead.pub,
    iat: 1,
  });
  const cert = { d: certText, s: await sign(org, certText) };
  const path = `/v1/${topic}/${org.pub}`;
  const write = async (w: RelayDraft, by: Key = w.kind === 'game' ? lead : org) => {
    const full = { ...w, sig: '', ...(w.kind === 'game' ? { cert } : {}) } as RelayWrite;
    full.sig = await sign(by, signedText(name, full, await hash(w.body)));
    return full;
  };
  const post = (payload: unknown, origin = APP) =>
    exports.default.fetch(`https://relay${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Origin: origin },
      body: typeof payload === 'string' ? payload : JSON.stringify(payload),
    });
  const game = (p: Partial<{ slot: string; group: string; h: number; at: number; gone: boolean; body: string }> = {}) =>
    write({ kind: 'game', slot: randomId(16), group: GROUP, h: 0, at: 1_000, gone: false, body: body(), ...p });
  const stub = env.SPIELTAG.get(env.SPIELTAG.idFromName(name));
  return { org, lead, topic, name, cert, path, write, post, game, stub };
}
const GROUP = randomId(16);

/** WebSocket öffnen und eingehende Nachrichten sammeln. */
async function connect(path: string, since?: number) {
  const res = await exports.default.fetch(`https://relay${path}/ws${since === undefined ? '' : `?since=${since}`}`, {
    headers: { Upgrade: 'websocket', Origin: APP },
  });
  expect(res.status).toBe(101);
  const ws = res.webSocket as WebSocket;
  const frames: unknown[] = [];
  ws.addEventListener('message', (e) => frames.push(e.data === 'pong' ? 'pong' : JSON.parse(e.data as string)));
  ws.accept();
  const next = async (count: number): Promise<unknown[]> => {
    for (let i = 0; i < 100 && frames.length < count; i++) await new Promise((r) => setTimeout(r, 10));
    return frames;
  };
  return { ws, frames, next };
}

describe('007 FR-N06 R-N4 Schreiben nur mit gültigem Nachweis', () => {
  it('Spiel vom Lead-Handy und Konfiguration vom Organisator werden angenommen', async () => {
    const s = await spieltag();
    const r1 = await s.post(await s.game());
    expect(r1.status).toBe(200);
    expect(r1.headers.get('access-control-allow-origin')).toBe(APP);
    const { seq } = (await r1.json()) as { seq: number };
    expect(seq).toBeGreaterThan(0);
    const r2 = await s.post(await s.write({ kind: 'cfg', iat: 5, body: body() }));
    expect(r2.status).toBe(200);
    expect(((await r2.json()) as { seq: number }).seq).toBeGreaterThan(seq);
  });

  it('FR-N05: Spiel ohne Zertifikat nur mit Signatur des Organisator-Schlüssels (Trainer-Handy)', async () => {
    const s = await spieltag();
    const draft = {
      kind: 'game' as const,
      slot: randomId(16),
      group: GROUP,
      h: 0,
      at: 1_000,
      gone: false,
      body: body(),
    };
    const signedBy = async (k: Key) => ({
      ...draft,
      sig: await sign(k, signedText(s.name, { ...draft, sig: '' }, await hash(draft.body))),
    });
    expect((await s.post(await signedBy(s.org))).status).toBe(200);
    // Lead-Schlüssel ohne Zertifikat: der Dienst kann ihn nicht dem Organisator zuordnen.
    expect((await s.post(await signedBy(s.lead))).status).toBe(403);
  });

  it('ungültige Anfrage 400, falsche Signatur oder fremdes Zertifikat 403', async () => {
    const s = await spieltag();
    expect((await s.post('kein json')).status).toBe(400);
    expect((await s.post({ kind: 'plan' })).status).toBe(400);
    const g = await s.game();
    expect((await s.post({ ...g, h: 1 })).status).toBe(403);
    const stranger = await newKey();
    expect((await s.post(await s.write({ kind: 'plan', body: body() }, stranger))).status).toBe(403);
    // Zertifikat eines anderen Organisators: Lead-Signatur stimmt, Zertifikat nicht.
    const other = await spieltag();
    const foreign = { ...g, cert: other.cert };
    expect((await s.post(foreign)).status).toBe(403);
    // Zuschauer haben keinen Schlüssel: Spiel mit Organisator-Zertifikat, aber eigenem Schlüssel signiert.
    expect(
      (
        await s.post(
          await s.write(
            { kind: 'game', slot: randomId(16), group: GROUP, h: 0, at: 1, gone: false, body: body() },
            stranger,
          ),
        )
      ).status,
    ).toBe(403);
  });

  it('fremde Herkunft 403, Vorab-Anfrage nur für die App, unbekannter Pfad 404', async () => {
    const s = await spieltag();
    expect((await s.post(await s.game(), 'https://example.org')).status).toBe(403);
    const pre = await exports.default.fetch(`https://relay${s.path}`, { method: 'OPTIONS', headers: { Origin: APP } });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-methods')).toContain('POST');
    const bad = await exports.default.fetch(`https://relay${s.path}`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.org' },
    });
    expect(bad.status).toBe(403);
    expect((await exports.default.fetch('https://relay/v1/zu-kurz', { headers: { Origin: APP } })).status).toBe(404);
    expect((await exports.default.fetch(`https://relay${s.path}`, { headers: { Origin: APP } })).status).toBe(405);
  });

  it('zu große Anfrage 413', async () => {
    const s = await spieltag();
    expect((await s.post('x'.repeat(20_000))).status).toBe(413);
    expect(MAX_BODY).toBe(4000);
  });
});

describe('007 FR-N02 R-N5 Ordnung und Auswahl', () => {
  it('je slot gilt der größere Übergabezähler bzw. das spätere at; ältere Stände 204', async () => {
    const s = await spieltag();
    const slot = randomId(16);
    expect((await s.post(await s.game({ slot, at: 10 }))).status).toBe(200);
    expect((await s.post(await s.game({ slot, at: 9 }))).status).toBe(204);
    expect((await s.post(await s.game({ slot, at: 11 }))).status).toBe(200);
    expect((await s.post(await s.game({ slot, h: 1, at: 2 }))).status).toBe(200);
    expect((await s.post(await s.game({ slot, h: 0, at: 99 }))).status).toBe(204);
    const rows = await runInDurableObject(s.stub, (_o, state) =>
      state.storage.sql.exec("SELECT h, at FROM msg WHERE kind = 'game'").toArray(),
    );
    expect(rows).toEqual([{ h: 1, at: 2 }]);
  });

  it('Konfiguration nur mit größerem oder gleichem iat', async () => {
    const s = await spieltag();
    expect((await s.post(await s.write({ kind: 'cfg', iat: 10, body: body() }))).status).toBe(200);
    expect((await s.post(await s.write({ kind: 'cfg', iat: 9, body: body() }))).status).toBe(204);
    expect((await s.post(await s.write({ kind: 'cfg', iat: 10, body: body() }))).status).toBe(200);
    const n = await runInDurableObject(
      s.stub,
      (_o, state) => state.storage.sql.exec("SELECT COUNT(*) AS n FROM msg WHERE kind = 'cfg'").one().n,
    );
    expect(n).toBe(1);
  });

  it('je Mannschaft bleiben die 10 jüngsten Spiele, Plan-Meldungen die 50 jüngsten', async () => {
    const s = await spieltag();
    for (let i = 0; i < KEEP_PER_GROUP + 2; i++) expect((await s.post(await s.game())).status).toBe(200);
    for (let i = 0; i < KEEP_PLANS + 1; i++) await s.post(await s.write({ kind: 'plan', body: body(8) }));
    const counts = await runInDurableObject(s.stub, (_o, state) =>
      state.storage.sql.exec('SELECT kind, COUNT(*) AS n FROM msg GROUP BY kind ORDER BY kind').toArray(),
    );
    expect(counts).toEqual([
      { kind: 'game', n: KEEP_PER_GROUP },
      { kind: 'plan', n: KEEP_PLANS },
    ]);
  });

  it('höchstens 6 Mannschaften 413', async () => {
    const s = await spieltag();
    for (let i = 0; i < 6; i++) expect((await s.post(await s.game({ group: randomId(16) }))).status).toBe(200);
    expect((await s.post(await s.game({ group: randomId(16) }))).status).toBe(413);
  });

  it('neu ausgestellt: alles weg bis auf den Hinweis, danach 409', async () => {
    const s = await spieltag();
    await s.post(await s.game());
    await s.post(await s.write({ kind: 'plan', body: body() }));
    expect((await s.post(await s.write({ kind: 'retire', body: body() }))).status).toBe(200);
    expect((await s.post(await s.game())).status).toBe(409);
    const kinds = await runInDurableObject(s.stub, (_o, state) =>
      state.storage.sql.exec('SELECT kind FROM msg').toArray(),
    );
    expect(kinds).toEqual([{ kind: 'retire' }]);
  });

  it('FR-N12 Alarm nach einem Jahr löscht alles', async () => {
    const s = await spieltag();
    await s.post(await s.game());
    const alarm = await runInDurableObject(s.stub, (_o, state) => state.storage.getAlarm());
    expect(alarm).toBeGreaterThan(Date.now() + 364 * 24 * 60 * 60_000);
    expect(await runDurableObjectAlarm(s.stub)).toBe(true);
    const c = await connect(s.path);
    const [hello] = await c.next(1);
    expect(hello).toMatchObject({ t: 'hello', msgs: [] });
    c.ws.close();
    // Danach wieder nutzbar.
    expect((await s.post(await s.game())).status).toBe(200);
  });
});

describe('016 FR-B04 FR-B11 FR-B17 geteilte Kader', () => {
  const squad = (p: Partial<{ slot: string; at: number; gone: boolean; body: string }> = {}) =>
    ({ kind: 'squad', slot: randomId(16), at: 1_000, gone: false, body: body(), ...p }) as const;

  it('je slot eine Zeile, ersetzt bei at ≥, älter 204; nur mit Signatur des Organisators', async () => {
    const s = await spieltag();
    const slot = randomId(16);
    expect((await s.post(await s.write(squad({ slot, at: 10 })))).status).toBe(200);
    expect((await s.post(await s.write(squad({ slot, at: 9 })))).status).toBe(204);
    expect((await s.post(await s.write(squad({ slot, at: 10 })))).status).toBe(200);
    expect((await s.post(await s.write(squad({ slot, at: 12, gone: true })))).status).toBe(200);
    expect((await s.post(await s.write(squad({ slot, at: 13 }), s.lead))).status).toBe(403);
    const rows = await runInDurableObject(s.stub, (_o, state) =>
      state.storage.sql.exec("SELECT at, gone FROM msg WHERE kind = 'squad'").toArray(),
    );
    expect(rows).toEqual([{ at: 12, gone: 1 }]);
  });

  it('höchstens 6 geteilte Kader 413; ein nicht mehr geteilter macht Platz', async () => {
    const s = await spieltag();
    const slots = Array.from({ length: 6 }, () => randomId(16));
    for (const slot of slots) expect((await s.post(await s.write(squad({ slot })))).status).toBe(200);
    expect((await s.post(await s.write(squad()))).status).toBe(413);
    expect((await s.post(await s.write(squad({ slot: slots[0], at: 2_000 })))).status).toBe(200);
    expect((await s.post(await s.write(squad({ slot: slots[1], at: 2_000, gone: true })))).status).toBe(200);
    expect((await s.post(await s.write(squad()))).status).toBe(200);
  });

  it('neu ausgestellt löscht auch die Kader', async () => {
    const s = await spieltag();
    await s.post(await s.write(squad()));
    await s.post(await s.write({ kind: 'retire', body: body() }));
    expect((await s.post(await s.write(squad()))).status).toBe(409);
    const kinds = await runInDurableObject(s.stub, (_o, state) =>
      state.storage.sql.exec('SELECT kind FROM msg').toArray(),
    );
    expect(kinds).toEqual([{ kind: 'retire' }]);
  });
});

describe('007 FR-N03 FR-N04 R-N6 Empfang per WebSocket', () => {
  it('hello mit allem, danach jede angenommene Meldung an alle Verbindungen; ping → pong', async () => {
    const s = await spieltag();
    const first = await s.game();
    await s.post(first);
    const a = await connect(s.path);
    const b = await connect(s.path);
    const [hello] = await a.next(1);
    expect(hello).toMatchObject({ t: 'hello', msgs: [{ body: first.body }] });
    expect(typeof (hello as { time: number }).time).toBe('number');
    const second = await s.game();
    await s.post(second);
    expect((await a.next(2))[1]).toMatchObject({ t: 'msg', body: second.body });
    expect((await b.next(2))[1]).toMatchObject({ t: 'msg', body: second.body });
    a.ws.send('ping');
    expect((await a.next(3))[2]).toBe('pong');
    a.ws.close();
    b.ws.close();
  });

  it('since: nur Zeilen mit größerer seq; ersetzte Spiele mit neuer seq', async () => {
    const s = await spieltag();
    const slot = randomId(16);
    const r = (await (await s.post(await s.game({ slot, at: 1 }))).json()) as { seq: number };
    const other = await s.game();
    await s.post(other);
    const update = await s.game({ slot, at: 2 });
    await s.post(update);
    const c = await connect(s.path, r.seq);
    const [hello] = (await c.next(1)) as { msgs: { body: string }[] }[];
    expect(hello!.msgs.map((m) => m.body)).toEqual([other.body, update.body]);
    c.ws.close();
  });

  it('WebSocket nur mit Upgrade und von der App', async () => {
    const s = await spieltag();
    expect((await exports.default.fetch(`https://relay${s.path}/ws`, { headers: { Origin: APP } })).status).toBe(426);
    const res = await exports.default.fetch(`https://relay${s.path}/ws`, {
      headers: { Upgrade: 'websocket', Origin: 'https://example.org' },
    });
    expect(res.status).toBe(403);
  });
});

describe('007 FR-N12 neu ausgestellt bleibt endgültig', () => {
  it('auch nach dem Alarm nimmt ein neu ausgestelltes Objekt nichts mehr an', async () => {
    const s = await spieltag();
    await s.post(await s.write({ kind: 'retire', body: body() }));
    expect(await runDurableObjectAlarm(s.stub)).toBe(true);
    expect((await s.post(await s.game())).status).toBe(409);
  });
});

describe('007 R-N5 Größe vor dem Einlesen', () => {
  it('Content-Length über der Grenze: 413 ohne Einlesen', async () => {
    const s = await spieltag();
    const res = await exports.default.fetch(`https://relay${s.path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '50000', Origin: APP },
      body: 'x'.repeat(50_000),
    });
    expect(res.status).toBe(413);
  });

  it('Zertifikat mit ungültigem Inhalt (keine Mannschaft) wird abgelehnt', async () => {
    const s = await spieltag();
    const lead = s.lead;
    const certText = JSON.stringify({ pub: lead.pub, iat: 1 });
    const cert = { d: certText, s: await sign(s.org, certText) };
    const g = await s.game();
    const draft = { ...g, cert, sig: '' };
    draft.sig = await sign(lead, signedText(s.name, draft, await hash(g.body)));
    expect((await s.post(draft)).status).toBe(403);
    expect(fromBase64Url(s.org.pub)).toHaveLength(65);
  });
});
