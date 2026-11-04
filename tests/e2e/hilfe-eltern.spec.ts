import type { Page } from '@playwright/test';
import { expect, test, type Recorded } from './fixtures';
import { createLive, e1At37, onMatchday, openViewer, sendAs } from './live-helpers';

/** Spec 010 US2-S6 bis S8: Eltern-Leiste "Spieltag · Teilen · Hilfe" in der Ansicht über den Zuschauer-Link. */

// Relay-Nachbau aus Spec 006 (fixtures.ts) braucht blockierte Service Worker.
test.use({ serviceWorkers: 'block' });

const rec = (v: Page): Promise<Recorded> => v.evaluate(() => (window as unknown as { __rec: Recorded }).__rec);

test('010 US2-S6 FR-H16 Eltern-Leiste mit "Spieltag", "Teilen" und "Hilfe", auch ohne Spiel', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-empty')).toBeVisible();
  const nav = v.getByTestId('viewer-nav');
  await expect(nav).toBeVisible();
  await expect(v.getByTestId('viewer-nav-dash')).toHaveText('Spieltag');
  await expect(v.getByTestId('viewer-nav-dash')).toHaveAttribute('aria-current', 'page');
  await expect(v.getByTestId('viewer-nav-share')).toHaveText('Teilen');
  await expect(v.getByTestId('viewer-nav-help')).toHaveText('Hilfe');
  // Keine Leiste der App (Spec 006 US1-S5), "Zum Torticker" bleibt auf der Seite
  await expect(v.getByTestId('nav')).toHaveCount(0);
  await expect(v.getByRole('link', { name: 'Zum Torticker' })).toBeVisible();
});

test('010 US2-S7 FR-H16 Eltern-Hilfe nur mit Eltern-Einträgen, Suche, zurück zum Spieltag ohne Neuladen', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  await sendAs(relay, links.trainer, e1At37());
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('2:1');
  await v.evaluate(() => {
    (window as unknown as { __same: boolean }).__same = true;
  });

  await v.getByTestId('viewer-nav-help').click();
  await expect(v).toHaveURL(/#\/live\/[A-Za-z0-9_-]+\/hilfe$/);
  await expect(v.getByRole('heading', { name: 'Hilfe', exact: true })).toBeVisible();
  await expect(v.getByTestId('viewer-nav-help')).toHaveAttribute('aria-current', 'page');
  const rows = v.getByTestId('help-results').locator('[data-testid^="help-row-"]');
  await expect(rows).toHaveText([
    'Wie verfolge ich die Spiele als Elternteil?',
    'Wie lege ich den Spieltag auf den Home-Bildschirm?',
    'Wie teile ich den Spieltag mit Familie und Freunden?',
    'Was bedeutet „Keine Verbindung“?',
    'Welche Daten verlassen mein Handy?',
  ]);
  // Gleiche Suche, nur über die Eltern-Einträge
  await v.getByTestId('help-search').fill('oma');
  await expect(rows.first()).toHaveAttribute('data-testid', 'help-row-eltern-teilen');
  await v.getByTestId('help-search').fill('tor löschen');
  await expect(v.getByTestId('help-none')).toBeVisible();
  // Eintrag ohne "Öffnen"-Knopf (Eltern haben keine App-Bildschirme)
  await v.getByTestId('help-search').fill('');
  await v.getByTestId('help-row-eltern-home').click();
  await expect(v.getByTestId('help-entry')).toContainText('Zum Home-Bildschirm');
  await expect(v.getByTestId('help-open')).toHaveCount(0);

  await v.getByTestId('viewer-nav-dash').click();
  await expect(v.getByTestId('dashboard')).toBeVisible();
  await expect(v.getByTestId('dash-score-E1')).toHaveText('2:1');
  await expect(v.getByTestId('viewer-nav-dash')).toHaveAttribute('aria-current', 'page');
  expect(await v.evaluate(() => (window as unknown as { __same?: boolean }).__same)).toBe(true);
});

test('010 US2-S8 FR-H17 "Teilen" öffnet das Teilen-Menü mit dem Zuschauer-Link, sonst Zwischenablage', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  const v = await openViewer(newDevice, relay, links);
  const text = `Unser Spieltag live (Sportvg Feuerbach E1 und E2). Der Link gilt die ganze Saison: ${links.viewer}`;

  await v.getByTestId('viewer-nav-share').click();
  await expect.poll(async () => (await rec(v)).shares.map((s) => s.text)).toEqual([text]);

  // Aus der Eltern-Hilfe heraus wird derselbe Link geteilt (ohne "/hilfe")
  await v.getByTestId('viewer-nav-help').click();
  await v.getByTestId('viewer-nav-share').click();
  await expect.poll(async () => (await rec(v)).shares.length).toBe(2);
  expect((await rec(v)).shares[1]?.text).toBe(text);

  // Ohne Teilen-Menü: Link in die Zwischenablage, Hinweis "Link kopiert."
  await v.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });
  await v.getByTestId('viewer-nav-share').click();
  await expect(v.getByRole('status').filter({ hasText: 'Link kopiert.' })).toBeVisible();
  expect((await rec(v)).clipboard).toBe(text);
});
