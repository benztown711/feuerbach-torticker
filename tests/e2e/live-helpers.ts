import { webcrypto } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import type { Page } from '@playwright/test';
import { expect, type Recorded } from './fixtures';
import { addTeam } from './helpers';
import type { FakeRelay } from './relay';

/** Spec 006: Testhelfer für den Live-Spieltag (contracts/live-link.md). */

export interface LiveLinks {
  viewer: string;
  lead: Record<string, string>;
}

const urlIn = (text: string | undefined): string => {
  const m = /(https?:\/\/\S+#\/(?:live|lead)\/[A-Za-z0-9_-]+)/.exec(text ?? '');
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
 * außer `without`; `self` = "Dieses Handy sendet für". Teilt Zuschauer- und Lead-Links und liefert sie.
 */
export async function createLive(
  page: Page,
  recorded: () => Promise<Recorded>,
  o: { teams: string[]; self?: string; without?: string[]; title?: string },
): Promise<LiveLinks> {
  for (const t of o.teams) await addTeam(page, `Sportvg Feuerbach ${t}`);
  await page.goto('./#/mehr');
  await page.getByTestId('more-live').click();
  await page.getByTestId('btn-live-create').click();
  if (o.title !== undefined) await page.getByTestId('input-live-title').fill(o.title);
  for (const t of o.without ?? []) await page.getByTestId(`live-team-chip-${t}`).click();
  if (o.self) await page.getByTestId(`live-self-chip-${o.self}`).click();
  await page.getByTestId('btn-live-save').click();
  await expect(page.getByTestId('live-overview')).toBeVisible();
  const before = (await recorded()).shares.length;
  await page.getByTestId('btn-share-viewer').click();
  const leads = o.teams.filter((t) => t !== o.self && !(o.without ?? []).includes(t));
  for (const t of leads) await page.getByTestId(`btn-share-lead-${t}`).click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(before + 1 + leads.length);
  const shares = (await recorded()).shares.slice(before);
  const lead: Record<string, string> = {};
  leads.forEach((t, i) => (lead[t] = urlIn(shares[i + 1]?.text)));
  return { viewer: urlIn(shares[0]?.text), lead };
}

/** Fügt einen Lead-Link im Torticker ein und bestätigt die Kopplung. */
export async function pasteLeadLink(page: Page, url: string, text = 'Hier dein Lead-Link:'): Promise<void> {
  await page.goto('./#/live-spieltag');
  await page.getByTestId('btn-paste-link').click();
  await page.getByTestId('paste-link-input').fill(`${text}\n${url}\n`);
  await page.getByTestId('paste-link-apply').click();
  await expect(page.getByTestId('couple-dialog')).toBeVisible();
  await page.getByTestId('couple-yes').click();
  await expect(page.getByTestId('live-lead-info')).toBeVisible();
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
