import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { MIN, SEC, confirmYes, forward, startGame } from './helpers';
import { sampleDashboard } from './live-helpers';

/**
 * T083 Screenshot-Vergleich der Kernbildschirme in allen Profilen (iPhone, iPhone SE, Android).
 * Referenzbilder werden in der CI-Linux-Umgebung erzeugt (research.md R-22) und liegen im Repo.
 * Kleine Toleranz für Kantenglättung; Layout- oder Farbänderungen schlagen weiterhin fehl.
 */
const shot = { animations: 'disabled' as const, maxDiffPixelRatio: 0.01 };

async function ready(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function playedFirstHalf(page: Page): Promise<void> {
  await startGame(page);
  await forward(page, 6 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await forward(page, 5 * MIN);
  await page.getByTestId('btn-goal-opp').click();
  await forward(page, 3 * MIN);
  await page.getByTestId('btn-goal-own').click();
  // Undo-Leiste (10 s) abwarten
  await forward(page, 15 * SEC);
}

test.describe('Visueller Vergleich Spielbildschirm (T083)', () => {
  test('Spiel läuft, hell', async ({ page }) => {
    await playedFirstHalf(page);
    await ready(page);
    await expect(page).toHaveScreenshot('spiel-laeuft-hell.png', shot);
  });

  test('Spiel läuft, dunkel', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await playedFirstHalf(page);
    await ready(page);
    await expect(page).toHaveScreenshot('spiel-laeuft-dunkel.png', shot);
  });

  test('Nachspielzeit, hell', async ({ page }) => {
    await playedFirstHalf(page);
    // bis etwa +0:26 Nachspielzeit: das Blinken der Schwelle bei 0:00 (3 s) ist vorbei
    await forward(page, 11 * MIN + 10 * SEC);
    await ready(page);
    await expect(page).toHaveScreenshot('spiel-nachspielzeit-hell.png', shot);
  });

  test('Halbzeitpause, hell', async ({ page }) => {
    await playedFirstHalf(page);
    await forward(page, 11 * MIN + 10 * SEC);
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await ready(page);
    await expect(page).toHaveScreenshot('spiel-halbzeit-hell.png', shot);
  });
});

test.describe('Visueller Vergleich Dashboard (006 US3)', () => {
  // Relay-Nachbau braucht blockierte Service Worker (fixtures.ts).
  test.use({ serviceWorkers: 'block' });
  for (const scheme of ['light', 'dark'] as const) {
    const name = scheme === 'light' ? 'hell' : 'dunkel';
    test(`Dashboard, ${name} (E1 aufgeklappt)`, async ({ page, recorded, relay, newDevice }) => {
      const v = await sampleDashboard(page, recorded, relay, newDevice);
      await v.emulateMedia({ colorScheme: scheme });
      await ready(v);
      await expect(v).toHaveScreenshot(`dashboard-${name}.png`, shot);
    });
  }
});
