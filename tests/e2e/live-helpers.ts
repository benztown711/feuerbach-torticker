import type { Page } from '@playwright/test';
import { expect, type Recorded } from './fixtures';
import { addTeam } from './helpers';

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
