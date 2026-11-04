import { webcrypto } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import type { Page } from '@playwright/test';
import { expect, type Recorded } from './fixtures';
import { addTeam } from './helpers';
import type { FakeRelay } from './relay';

/** Spec 006: Testhelfer für den Live-Spieltag (contracts/live-link.md). */

export interface LiveLinks {
  viewer: string;
  trainer: string;
}

const urlIn = (text: string | undefined): string => {
  const m = /(https?:\/\/\S+#\/(?:live|lead|trainer)\/[A-Za-z0-9_-]+)/.exec(text ?? '');
  if (!m?.[1]) throw new Error(`Kein Link im geteilten Text: ${text}`);
  return m[1];
};

/** Aufzeichnung (Teilen, Zwischenablage) eines weiteren Handys. */
export const recordedOf = (p: Page) => (): Promise<Recorded> =>
  p.evaluate(() => (window as unknown as { __rec: Recorded }).__rec);

/** Fragment eines Links als Pfad für page.goto, z. B. "./#/lead/…". */
export const asPath = (url: string): string => `./${url.slice(url.indexOf('#'))}`;

/**
 * Legt die Mannschaften an, dann über "Mehr" → "Live-Spieltag" einen Live-Spieltag mit allen Mannschaften
 * außer `without`. Teilt Zuschauer- und Trainer-Link und liefert sie. Das Handy ist danach Trainer-Handy.
 */
export async function createLive(
  page: Page,
  recorded: () => Promise<Recorded>,
  o: { teams: string[]; without?: string[]; title?: string },
): Promise<LiveLinks> {
  for (const t of o.teams) await addTeam(page, `Sportvg Feuerbach ${t}`);
  await page.goto('./#/mehr');
  await page.getByTestId('more-live').click();
  await page.getByTestId('btn-live-create').click();
  if (o.title !== undefined) await page.getByTestId('input-live-title').fill(o.title);
  for (const t of o.without ?? []) await page.getByTestId(`live-team-chip-${t}`).click();
  await page.getByTestId('btn-live-save').click();
  await expect(page.getByTestId('live-overview')).toBeVisible();
  const before = (await recorded()).shares.length;
  await page.getByTestId('btn-share-viewer').click();
  await page.getByTestId('btn-share-trainer').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(before + 2);
  const [viewer, trainer] = (await recorded()).shares.slice(before);
  return { viewer: urlIn(viewer?.text), trainer: urlIn(trainer?.text) };
}

/** Fügt einen Trainer- oder Lead-Link im Torticker ein und bestätigt die Kopplung. */
export async function pasteLink(page: Page, url: string, text = 'Hier der Link:'): Promise<void> {
  await page.goto('./#/live-spieltag');
  await page.getByTestId('btn-paste-link').click();
  await page.getByTestId('paste-link-input').fill(`${text}\n${url}\n`);
  await page.getByTestId('paste-link-apply').click();
  await expect(page.getByTestId('couple-dialog')).toBeVisible();
  await page.getByTestId('couple-yes').click();
  await expect(page.getByTestId('couple-dialog')).toBeHidden();
}

/* ---------- Vertragstest: unabhängige Umsetzung von contracts/live-message.md ---------- */

type Json = Record<string, unknown>;
/** base64url → Uint8Array mit eigenem ArrayBuffer (für Web Crypto). */
const b64 = (s: string): Uint8Array<ArrayBuffer> => new Uint8Array(Buffer.from(s, 'base64url'));
const subtle = webcrypto.subtle;

async function verify(pub: string, text: string, sig: string): Promise<boolean> {
  try {
    const key = await subtle.importKey('raw', b64(pub), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64(sig), new TextEncoder().encode(text));
  } catch {
    return false;
  }
}

export interface Decoded {
  content: Json | null;
  cert: Json | null;
  config: Json | null;
}

/** Entschlüsselt und prüft eine Meldung mit den Schlüsseln aus dem Zuschauer-Link. */
export async function decodeMessage(viewerUrl: string, text: string): Promise<Decoded> {
  const view = JSON.parse(
    Buffer.from(viewerUrl.slice(viewerUrl.indexOf('/live/') + 6), 'base64url').toString('utf8'),
  ) as Json;
  if (!text.startsWith('t1.')) throw new Error(`Meldung ohne Präfix t1.: ${text.slice(0, 10)}`);
  const all = b64(text.slice(3));
  const key = await subtle.importKey('raw', b64(view.k as string), 'AES-GCM', false, ['decrypt']);
  const packed = Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv: all.subarray(0, 12) }, key, all.subarray(12)));
  const env = JSON.parse(inflateRawSync(packed).toString('utf8')) as Json;
  const signed = (v: unknown) => v as { d: string; s: string } | undefined;
  const g = signed(env.g);
  const c = signed(env.c);
  const config = g && (await verify(view.o as string, g.d, g.s)) ? (JSON.parse(g.d) as Json) : null;
  const cert = c && (await verify(view.o as string, c.d, c.s)) ? (JSON.parse(c.d) as Json) : null;
  const ok = cert && typeof env.m === 'string' && (await verify(cert.pub as string, env.m, env.s as string));
  return { content: ok ? (JSON.parse(env.m as string) as Json) : null, cert, config };
}

/** Alle gültigen Live-Stände im Relay, älteste zuerst. */
export async function liveStates(relay: FakeRelay, viewerUrl: string): Promise<Json[]> {
  const out: Json[] = [];
  for (const m of relay.all()) {
    const d = await decodeMessage(viewerUrl, m.message);
    if (d.content) out.push(d.content);
  }
  return out;
}

/** Jüngster Live-Stand (optional eines bestimmten Spiels). */
export async function latestState(relay: FakeRelay, viewerUrl: string, gameId?: string): Promise<Json | undefined> {
  return (await liveStates(relay, viewerUrl)).filter((s) => gameId === undefined || s.gameId === gameId).at(-1);
}

/* ---------- Meldungen wie ein Lead-Handy (für Dashboard-Tests) ---------- */

/** Daten eines Zuschauer-, Trainer- oder Lead-Links (contracts/live-link.md). */
export function linkData(url: string): Json {
  const m = /#\/(?:live|lead|trainer)\/([A-Za-z0-9_-]+)/.exec(url);
  if (!m?.[1]) throw new Error(`Kein Link: ${url}`);
  return JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')) as Json;
}

async function signWith(jwk: JsonWebKey, text: string): Promise<string> {
  const key = await subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(text));
  return Buffer.from(sig).toString('base64url');
}

/**
 * Baut eine Meldung wie ein Trainer-Handy (Node-Gegenstück zu sealMessage): eigener Lead-Schlüssel, Zertifikat
 * für die Mannschaft des Inhalts, signiert mit dem Organisator-Schlüssel aus dem Trainer-Link.
 * `forge`: Inhalt mit einem fremden Schlüssel signiert (wer nur den Zuschauer-Link hat).
 * `certTeam`: Zertifikat für eine andere Mannschaft als im Inhalt.
 */
export async function leadMessage(
  trainerUrl: string,
  content: Json,
  o: { forge?: boolean; certTeam?: string } = {},
): Promise<string> {
  const link = linkData(trainerUrl);
  const q = link.q as { d: string; x: string; y: string };
  const org: JsonWebKey = { kty: 'EC', crv: 'P-256', d: q.d, x: q.x, y: q.y };
  const pair = (await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])) as CryptoKeyPair;
  const pub = Buffer.from(await subtle.exportKey('raw', pair.publicKey)).toString('base64url');
  const team = (link.m as string[][]).find((t) => t[0] === (o.certTeam ?? content.team)) ?? [
    content.team,
    'Unbekannt',
    'rot',
    'rot',
  ];
  const certText = JSON.stringify({ key: team[0], name: team[1], homeColor: team[2], awayColor: team[3], pub, iat: 1 });
  const c = { d: certText, s: await signWith(org, certText) };
  const signer = o.forge
    ? await subtle.exportKey(
        'jwk',
        ((await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])) as CryptoKeyPair)
          .privateKey,
      )
    : await subtle.exportKey('jwk', pair.privateKey);
  const m = JSON.stringify(content);
  const env = { m, s: await signWith(signer, m), c, g: link.g };
  const packed = deflateRawSync(Buffer.from(JSON.stringify(env), 'utf8'));
  const key = await subtle.importKey('raw', b64(link.k as string), 'AES-GCM', false, ['encrypt']);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, packed));
  return `t1.${Buffer.concat([iv, ct]).toString('base64url')}`;
}

/** Legt einen Live-Stand im Relay ab, als käme er von einem Trainer-Handy mit diesem Trainer-Link. */
export async function sendAs(
  relay: FakeRelay,
  trainerUrl: string,
  content: Json,
  o: { forge?: boolean; certTeam?: string } = {},
) {
  relay.inject(linkData(trainerUrl).t as string, await leadMessage(trainerUrl, content, o));
}

export type ClockSpec = [type: string, minutesAgo: number, section: number];
export interface GoalSpec {
  side: 'own' | 'opp';
  minute: number;
  section?: number;
  who?: string | null;
  penalty?: boolean;
}

/** Live-Stand (contracts/live-message.md); Zeiten relativ zu `now` in Minuten vorher. */
export function liveSnap(o: {
  team: string;
  now: number;
  gameId?: string;
  opp?: string;
  away?: boolean;
  sections?: number;
  minutes?: number;
  createdAgo?: number;
  clock?: ClockSpec[];
  goals?: GoalSpec[];
}): Json {
  const at = (ago: number): number => o.now - Math.round(ago * 60_000);
  return {
    v: 1,
    kind: 'game',
    state: 'live',
    gameId: o.gameId ?? `spiel-${o.team}`,
    team: o.team,
    sentAt: o.now,
    createdAt: at(o.createdAgo ?? 90),
    own: `Feuerbach ${o.team}`,
    opp: o.opp ?? 'TSV Musterstadt',
    venue: o.away ? 'away' : 'home',
    ownColor: 'rot',
    oppColor: 'schwarz',
    schema: { sections: o.sections ?? 2, sectionMinutes: o.minutes ?? 25 },
    clock: (o.clock ?? []).map(([type, ago, section]) => [type, at(ago), section]),
    goals: (o.goals ?? []).map((g) => ({
      side: g.side,
      minute: g.minute,
      stoppage: null,
      section: g.section ?? 1,
      who: g.who ?? null,
      penalty: g.penalty ?? false,
      ownGoal: false,
    })),
    shootout: null,
    drawSettled: false,
  };
}

/* ---------- Zuschauer-Handy am Spieltag ---------- */

/** Sa, 07.11.2026, 10:41 Uhr: Zuschauer-Uhr und Serveruhr stehen auf demselben Spieltag. */
export const MATCHDAY = Date.UTC(2026, 10, 7, 9, 41, 0);

/** Serveruhr auf T stellen (vor der ersten Meldung). */
export const onMatchday = (relay: FakeRelay): void => {
  relay.offsetMs = MATCHDAY - Date.now();
};

/** Zuschauer-Handy mit Uhr wie die Serveruhr (Spieltag T), Zuschauer-Link geöffnet. */
export async function openViewer(
  newDevice: () => Promise<Page>,
  relay: FakeRelay,
  links: LiveLinks,
  scheme: 'light' | 'dark' = 'light',
): Promise<Page> {
  if (relay.offsetMs === 0) onMatchday(relay);
  const v = await newDevice();
  // Farbschema vor dem Öffnen: ein Wechsel danach überblendet die Karten (transition) und verfälscht Messungen.
  await v.emulateMedia({ colorScheme: scheme });
  await v.clock.setSystemTime(Date.now() + relay.offsetMs);
  await v.goto(asPath(links.viewer));
  await expect(v.getByTestId('dashboard')).toBeVisible();
  return v;
}

/** Spult Zuschauer-Uhr und Serveruhr gemeinsam vor; das Lead-Handy meldet sich in der Zeit nicht. */
export async function later(v: Page, relay: FakeRelay, ms: number): Promise<void> {
  relay.offsetMs += ms;
  await v.clock.fastForward(ms);
}

/** E1 führt 2:1 in Minute 37 (2 × 25 Minuten). */
export const e1At37 = (now = MATCHDAY): Json =>
  liveSnap({
    team: 'E1',
    now,
    clock: [
      ['kickoff', 50, 1],
      ['sectionEnd', 25, 1],
      ['kickoff', 11.2, 2],
    ],
    goals: [
      { side: 'own', minute: 6, who: 'Max' },
      { side: 'opp', minute: 12 },
      { side: 'own', minute: 31, section: 2, who: 'Ben', penalty: true },
    ],
  });

/** E2 auswärts in der Halbzeitpause 0:0. */
export const e2AtHalf = (now = MATCHDAY): Json =>
  liveSnap({
    team: 'E2',
    now,
    away: true,
    opp: 'SV Beispielhausen',
    clock: [
      ['kickoff', 30, 1],
      ['sectionEnd', 4, 1],
    ],
  });

/** E3 hat 4:2 gegen SG Beispieltal gewonnen (Mockup "Eltern"). */
export const e3Ended = (now = MATCHDAY): Json =>
  liveSnap({
    team: 'E3',
    now,
    opp: 'SG Beispieltal',
    clock: [
      ['kickoff', 101, 1],
      ['sectionEnd', 89, 1],
      ['kickoff', 86, 2],
      ['fullTime', 74, 2],
    ],
    sections: 2,
    minutes: 12,
    goals: [
      { side: 'own', minute: 3, who: 'Leo' },
      { side: 'own', minute: 7, who: 'Maxi' },
      { side: 'opp', minute: 9 },
      { side: 'own', minute: 11, who: 'Max' },
      { side: 'own', minute: 14, section: 2, who: 'Paul' },
      { side: 'opp', minute: 17, section: 2, who: 'Nr. 7' },
    ],
  });

/** Dashboard wie im Mockup: E1 läuft (37'), E2 in der Halbzeit, E3 beendet; E1 aufgeklappt. */
export async function sampleDashboard(
  page: Page,
  recorded: () => Promise<Recorded>,
  relay: FakeRelay,
  newDevice: () => Promise<Page>,
  scheme: 'light' | 'dark' = 'light',
): Promise<Page> {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  onMatchday(relay);
  await sendAs(relay, links.trainer, e1At37());
  await sendAs(relay, links.trainer, { ...e2AtHalf(), goals: [goal('own', 4), goal('opp', 9)] });
  await sendAs(relay, links.trainer, e3Ended());
  const v = await openViewer(newDevice, relay, links, scheme);
  await expect(v.getByTestId('dash-card-E3')).toBeVisible();
  await v.getByTestId('dash-toggle-E1').click();
  await expect(v.getByTestId('dash-details-E1')).toBeVisible();
  return v;
}

const goal = (side: 'own' | 'opp', minute: number): Json => ({
  side,
  minute,
  stoppage: null,
  section: 1,
  who: null,
  penalty: false,
  ownGoal: false,
});
