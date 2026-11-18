import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { MIN, SEC, confirmYes, forward, seedRoster, shareAsText, startGame } from './helpers';

/** Spec 019 US1: Rückgängig sicher treffen (ein dunkles Band über den Tor-Knöpfen). */

const INK = { light: 'rgb(35, 31, 32)', dark: 'rgb(245, 245, 245)' };
const SURFACE = { light: 'rgb(255, 255, 255)', dark: 'rgb(20, 20, 20)' };

async function box(l: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const b = await l.boundingBox();
  expect(b).not.toBeNull();
  return b as { x: number; y: number; width: number; height: number };
}

async function expectBig(l: Locator): Promise<void> {
  const b = await box(l);
  expect(b.width).toBeGreaterThanOrEqual(64);
  expect(b.height).toBeGreaterThanOrEqual(64);
}

async function enable(page: Page, ...keys: ('cards' | 'subs' | 'marks')[]): Promise<void> {
  await page.goto('./#/einstellungen');
  for (const k of keys) {
    await page.getByTestId(`feature-${k}`).click();
    await expect(page.getByTestId(`feature-${k}`)).toHaveAttribute('aria-checked', 'true');
  }
}

/**
 * Band liegt direkt über den Tor-Knöpfen, über die Inhaltsbreite, und verdeckt weder Tor- noch Uhr-Knöpfe.
 * Nach dem Schlusspfiff steht an Stelle der Tor-Knöpfe "Nächstes Spiel" (Spec 021 FR-W01).
 */
async function expectAboveGoals(page: Page, band: Locator, below = page.getByTestId('btn-goal-own')): Promise<void> {
  const b = await box(band);
  const goal = await box(below);
  const vw = page.viewportSize()?.width ?? 0;
  expect(b.y + b.height).toBeLessThanOrEqual(goal.y + 1);
  expect(goal.y - (b.y + b.height)).toBeLessThanOrEqual(16);
  expect(b.x).toBeLessThanOrEqual(17);
  expect(b.x + b.width).toBeGreaterThanOrEqual(vw - 17);
  const controls = page.locator('.controls');
  const c = await box(controls);
  expect(b.y).toBeGreaterThanOrEqual(c.y + c.height - 1);
  const events = page.getByTestId('event-row');
  if (await events.isVisible()) {
    const e = await box(events);
    expect(b.y).toBeGreaterThanOrEqual(e.y + e.height - 1);
  }
}

test.describe('019 US1 Rückgängig sicher treffen', () => {
  test('019 US1-S1 nach einem Tor dunkles Band über den Tor-Knöpfen, Tor- und Uhr-Knöpfe frei', async ({ page }) => {
    await startGame(page);
    await forward(page, 14 * MIN);
    await page.getByTestId('btn-goal-opp').click();
    const band = page.getByTestId('undo-bar');
    await expect(band).toContainText("Tor TSV Musterstadt 15' erfasst");
    await expect(band).toHaveCSS('background-color', INK.light);
    await expect(band.locator('.band__text')).toHaveCSS('color', SURFACE.light);
    await expect(page.getByTestId('btn-undo')).toHaveCSS('background-color', SURFACE.light);
    await expect(page.getByTestId('btn-undo')).toHaveCSS('color', INK.light);
    await expectAboveGoals(page, band);
    await expect(page.getByTestId('btn-pause')).toBeVisible();
  });

  test('019 US1-S2 "Rückgängig" mindestens 64 × 64 nimmt das Tor zurück', async ({ page }) => {
    await startGame(page);
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('score')).toHaveText('1 : 0');
    await expectBig(page.getByTestId('btn-undo'));
    await page.getByTestId('btn-undo').click();
    await expect(page.getByTestId('score')).toHaveText('0 : 0');
    await expect(page.getByTestId('undo-bar')).toBeHidden();
  });

  test('019 US1-S3 Doppeltipp: "Schon gezählt" im selben Band, nur ein Band, ein Tor', async ({ page }) => {
    await startGame(page);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('score')).toHaveText('1 : 0');
    await expect(page.getByTestId('undo-bar').getByTestId('double-tap-hint')).toHaveText('Schon gezählt');
    await expect(page.locator('.band')).toHaveCount(1);
  });

  test('019 US1-S4 Lesezeichen und Karte im selben Band, Knöpfe mindestens 64 hoch, auch auf dem SE mit Ereignis-Zeile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await seedRoster(page, ['2 Ben', '3 Tom', '4 Leo'].join('\n'));
    await enable(page, 'cards', 'subs', 'marks');
    await startGame(page);
    await forward(page, 5 * MIN);

    await page.getByTestId('btn-event-mark').click();
    const mark = page.getByTestId('mark-toast');
    await expect(mark).toHaveClass(/\bband\b/);
    await expectAboveGoals(page, mark);
    for (const id of ['mark-comment', 'mark-undo']) {
      expect((await box(page.getByTestId(id))).height).toBeGreaterThanOrEqual(64);
    }
    await forward(page, 11 * SEC);
    await expect(mark).toBeHidden();

    await page.getByTestId('btn-event-card').click();
    await page.getByTestId('event-card-gelb').click();
    await page.locator('[data-testid^="card-player-"]').filter({ hasText: 'Tom' }).click();
    const ev = page.getByTestId('event-toast');
    await expect(ev).toContainText('Gelb');
    await expect(ev).toHaveClass(/\bband\b/);
    await expectAboveGoals(page, ev);
    await expectBig(page.getByTestId('event-undo'));
    await expect(page.locator('.band')).toHaveCount(1);
  });

  test('019 US1-S5 "Korrigiert. Ergebnis neu teilen?" im Band, "Teilen" mindestens 64 hoch', async ({
    page,
    recorded,
  }) => {
    await seedRoster(page, '7 Max\n3 Ben');
    await startGame(page, { sections: 1, minutes: 12 });
    await forward(page, MIN);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true }).click();
    await forward(page, 11 * MIN);
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await page.getByTestId('btn-share').click();
    await expect.poll(async () => (await recorded()).shares.length).toBeGreaterThan(0);
    await forward(page, 3 * SEC);
    await page.locator('[data-testid^="goal-row-"]').first().click();
    await page.getByTestId('goal-edit-scorer').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '3 Ben', exact: true }).click();
    const bar = page.getByTestId('reshare-bar');
    await expect(bar).toContainText('Korrigiert. Ergebnis neu teilen?');
    await expect(bar).toHaveClass(/\bband\b/);
    await expectAboveGoals(page, bar, page.getByTestId('btn-next-game'));
    expect((await box(page.getByTestId('reshare-share'))).height).toBeGreaterThanOrEqual(64);
  });

  test('019 US1-S6 dunkles Theme: Band in ink des dunklen Themes, Schrift surface', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await startGame(page);
    await page.getByTestId('btn-goal-own').click();
    const band = page.getByTestId('undo-bar');
    await expect(band).toHaveCSS('background-color', INK.dark);
    await expect(band.locator('.band__text')).toHaveCSS('color', SURFACE.dark);
    await expect(page.getByTestId('btn-undo')).toHaveCSS('background-color', SURFACE.dark);
  });

  test('019 US1 Randfall: Teilen-Hinweis ist kurz; danach erscheint "Schon gezählt" wieder', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {} } });
    });
    await shareAsText(page);
    await expect(page.getByTestId('share-result')).toContainText('kopiert');
    await forward(page, 6 * SEC);
    await expect(page.getByTestId('share-result')).toHaveCount(0);
    await expect(page.locator('.band')).toHaveCount(0);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('double-tap-hint')).toHaveText('Schon gezählt');
  });

  test('019 US1 Randfall: Band erscheint nach dem Schließen der Torschützen-Auswahl', async ({ page }) => {
    await seedRoster(page, '7 Max\n3 Ben');
    await startGame(page);
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('scorer-picker')).toBeVisible();
    await expect(page.locator('.band')).toHaveCount(0);
    await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true }).click();
    await expect(page.getByTestId('scorer-picker')).toBeHidden();
    await expect(page.getByTestId('undo-bar')).toBeVisible();
    await expect(page.getByTestId('undo-bar')).toHaveClass(/\bband\b/);
  });
});
