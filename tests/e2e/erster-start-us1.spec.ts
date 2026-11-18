import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { ensureTeam } from './helpers';
import { createLive, openViewer } from './live-helpers';

/**
 * Spec 022 US1: Hinweis zur Installation auf dem Startbildschirm. Nicht installiert (Browser): kompakter Hinweis
 * unter den Aktionen, "Später" blendet ihn bis zum nächsten Kalendertag aus.
 */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const LATER = 'torticker-install-later';
const IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const hint = (page: Page) => page.getByTestId('start-install-hint');
const order = (page: Page) =>
  page.locator('.start__actions > *').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
const today = (page: Page): Promise<string> =>
  page.evaluate(() =>
    new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(Date.now()),
  );
const later = (page: Page): Promise<string | null> => page.evaluate((k) => window.localStorage.getItem(k), LATER);

test('022 US1-S1 Hinweis im Browser unter allen Aktionen, mit Satz und "Später", ohne Scrollen auf 390 x 844', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ensureTeam(page, 'Sportvg Feuerbach E1');
  await page.goto('./');
  await expect(hint(page)).toBeVisible();
  await expect(hint(page)).toContainText('Torticker auf den Home-Bildschirm legen');
  await expect(hint(page)).toContainText('Nur dann bleiben deine Spiele dauerhaft gespeichert.');
  await expect(page.getByTestId('start-install-later')).toHaveText('Später');
  // unter allen Hauptaktionen: letztes Kind der Aktionen, nach "Neues Spiel" und "Eltern live zuschauen lassen"
  const o = await order(page);
  expect(o.at(-1)).toBe('start-install-hint');
  expect(o.indexOf('btn-new-game')).toBeLessThan(o.indexOf('start-live-quick'));
  expect(o.indexOf('start-live-quick')).toBeLessThan(o.indexOf('start-install-hint'));
  // ohne Scrollen sichtbar: vollständig über der Navigationsleiste
  const box = (await hint(page).boundingBox())!;
  const nav = (await page.getByTestId('nav').boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(nav.y);
  expect((await page.getByTestId('start-install-later').boundingBox())!.height).toBeGreaterThanOrEqual(48);
});

test.describe('Anleitung nach Gerät', () => {
  test.describe('iPhone', () => {
    test.use({ userAgent: IOS });
    test('022 US1-S2 iPhone: Teilen, "Zum Home-Bildschirm"', async ({ page }) => {
      await page.goto('./');
      await expect(page.getByTestId('start-install-how')).toHaveText(
        'In Safari auf „Teilen“ tippen, dann „Zum Home-Bildschirm“.',
      );
    });
  });

  test.describe('Android', () => {
    test.use({ userAgent: ANDROID });
    test('022 US1-S3 Android: Menü, "App installieren"', async ({ page }) => {
      await page.goto('./');
      await expect(page.getByTestId('start-install-how')).toHaveText(
        'Im Browser-Menü (drei Punkte) „App installieren“ wählen.',
      );
    });
  });

  test.describe('Rechner', () => {
    test.use({ userAgent: DESKTOP });
    test('022 US1-S4 anderes Gerät: allgemeine Anleitung', async ({ page }) => {
      await page.goto('./');
      await expect(page.getByTestId('start-install-how')).toHaveText(
        'Im Menü des Browsers „App installieren“ oder „Zum Home-Bildschirm“ wählen.',
      );
    });
  });
});

test('022 US1-S5 "Später" blendet bis zum nächsten Kalendertag aus, auch nach Neuladen', async ({ page }) => {
  await page.goto('./');
  await expect(hint(page)).toBeVisible();
  expect(await later(page)).toBeNull();
  await page.getByTestId('start-install-later').click();
  await expect(hint(page)).toHaveCount(0);
  expect(await later(page)).toBe(await today(page));
  await page.reload();
  await expect(page.getByTestId('btn-new-game')).toBeVisible();
  await expect(hint(page)).toHaveCount(0);
  // am nächsten Tag wieder (gemerkt ist der Tag von gestern)
  await page.evaluate((k) => window.localStorage.setItem(k, '2000-01-01'), LATER);
  await page.reload();
  await expect(hint(page)).toBeVisible();
});

test('022 US1-S6 als installierte App erscheint der Hinweis nie', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
  });
  await page.goto('./');
  await expect(page.getByTestId('btn-new-game')).toBeVisible();
  // Nachgeladener Live-Teil ist da, bevor "nicht da" gilt: der Knopf neben dem Hinweis erscheint nach dem Nachladen.
  await ensureTeam(page, 'Sportvg Feuerbach E1');
  await page.goto('./');
  await expect(page.getByTestId('start-live-quick')).toBeVisible();
  await expect(hint(page)).toHaveCount(0);
});

test('022 US1-S7 "Verstanden" in den Einstellungen blendet auch den Start aus, "Später" ändert die Einstellungen nicht', async ({
  page,
}) => {
  await ensureTeam(page, 'Sportvg Feuerbach E1');
  await page.goto('./');
  await page.getByTestId('start-install-later').click();
  await expect(hint(page)).toHaveCount(0);
  // T074 unverändert: der Hinweis in den Einstellungen bleibt nach "Später" auf dem Start
  await page.goto('./#/einstellungen');
  await expect(page.getByTestId('install-hint')).toContainText('Home-Bildschirm');
  await page.getByTestId('install-hint-dismiss').click();
  await expect(page.getByTestId('install-hint')).toHaveCount(0);
  // "Später" von heute entfernen: nur "Verstanden" hält den Hinweis jetzt fern
  await page.evaluate((k) => window.localStorage.removeItem(k), LATER);
  await page.goto('./');
  await expect(page.getByTestId('start-live-quick')).toBeVisible();
  await expect(hint(page)).toHaveCount(0);
});

test('022 US1-S8 der Hinweis verdrängt nichts: Reihenfolge der Aktionen bleibt, "Neues Spiel" öffnet mit einem Tipp', async ({
  page,
}) => {
  await ensureTeam(page, 'Sportvg Feuerbach E1');
  await page.goto('./');
  await expect(hint(page)).toBeVisible();
  const o = await order(page);
  expect(o).toEqual(['btn-new-game', 'start-live-quick', 'start-install-hint']);
  await page.getByTestId('btn-new-game').click();
  await expect(page.getByTestId('input-opponent')).toBeVisible();
});

test('022 US1-S9 nicht in der Eltern-Ansicht und nicht im Dashboard der App', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  await page.goto('./#/live-spieltag/dashboard');
  await expect(page.getByTestId('dashboard')).toBeVisible();
  await expect(hint(page)).toHaveCount(0);
  const viewer = await openViewer(newDevice, relay, links);
  await expect(viewer.getByTestId('dashboard')).toBeVisible();
  await expect(viewer.getByTestId('start-install-hint')).toHaveCount(0);
  await expect(viewer.getByText('Home-Bildschirm legen')).toHaveCount(0);
});
