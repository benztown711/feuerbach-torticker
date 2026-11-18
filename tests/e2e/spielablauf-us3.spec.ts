import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MIN, SEC, confirmYes, forward, startGame } from './helpers';

/** Spec 021 US3: Jede antippbare Zeile der Torliste im Spiel zeigt rechts einen Pfeil (Chevron). */

const INK_MUTED = { light: 'rgb(92, 90, 87)', dark: 'rgb(168, 166, 163)' };
const ROWS = '[data-testid^="goal-row-"], [data-testid^="mark-row-"], [data-testid^="event-row-"]';

type Box = { x: number; y: number; width: number; height: number };
async function box(l: Locator): Promise<Box> {
  const b = await l.boundingBox();
  expect(b).not.toBeNull();
  return b as Box;
}

async function enable(page: Page, ...keys: ('cards' | 'marks')[]): Promise<void> {
  await page.goto('./#/einstellungen');
  for (const k of keys) {
    await page.getByTestId(`feature-${k}`).click();
    await expect(page.getByTestId(`feature-${k}`)).toHaveAttribute('aria-checked', 'true');
  }
}

/** Tor, Gegentor, entferntes Tor und Lesezeichen (ohne Kader, also ohne Torschützen-Auswahl). */
async function mixedList(page: Page, opponent = 'TSV Musterstadt'): Promise<void> {
  await enable(page, 'marks');
  await startGame(page, { opponent });
  await forward(page, 2 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await forward(page, MIN);
  await page.getByTestId('btn-goal-opp').click();
  await forward(page, MIN);
  await page.getByTestId('btn-goal-own').click();
  await forward(page, 11 * SEC);
  await page.locator('[data-testid^="goal-row-"]').first().click();
  await page.getByTestId('goal-remove').click();
  await confirmYes(page);
  await page.getByTestId('btn-event-mark').click();
  await forward(page, 11 * SEC);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`021 US3-S1 US3-S3 SC-W03 jede Zeile mit Pfeil in ink-muted (${scheme === 'light' ? 'hell' : 'dunkel'})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await mixedList(page);
    const rows = page.getByTestId('goal-list').locator(ROWS);
    await expect(rows).toHaveCount(4);
    await expect(page.locator('.goal-row--removed')).toHaveCount(1);
    for (let i = 0; i < 4; i++) {
      const row = rows.nth(i);
      const chev = row.locator('.goal-row__chev');
      await expect(chev).toBeVisible();
      await expect(chev).toHaveAttribute('aria-hidden', 'true');
      await expect(chev).toHaveCSS('color', INK_MUTED[scheme]);
      const r = await box(row);
      const c = await box(chev);
      expect(r.height).toBeGreaterThanOrEqual(48);
      // Am rechten Rand der Zeile.
      expect(r.x + r.width - (c.x + c.width)).toBeLessThanOrEqual(12);
    }
    // Zugänglicher Name ohne Symbol, z. B. "3' 1:0 Feuerbach" bzw. Text des Lesezeichens.
    await expect(page.locator('[data-testid^="goal-row-"]').last()).toHaveAccessibleName(/^3'\s*1:0\s*Feuerbach$/);
    // Antippen öffnet wie bisher das Tor-Blatt.
    await page.locator('[data-testid^="goal-row-"]').last().click();
    await expect(page.getByTestId('goal-actions')).toBeVisible();
  });
}

test('021 US3-S2 langer Text wird vor dem Pfeil gekürzt; Pfeil ganz sichtbar (iPhone SE)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await startGame(page, { opponent: 'TSV Musterstadt Spielgemeinschaft Nord' });
  await forward(page, MIN);
  await page.getByTestId('btn-goal-opp').click();
  const row = page.locator('[data-testid^="goal-row-"]').first();
  const team = row.locator('.goal-row__team');
  await expect(team).toContainText('TSV Musterstadt Spielgemeinschaft Nord');
  expect(await team.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await expect(team).toHaveCSS('text-overflow', 'ellipsis');
  const t = await box(team);
  const c = await box(row.locator('.goal-row__chev'));
  const list = await box(page.getByTestId('goal-list'));
  expect(t.x + t.width).toBeLessThanOrEqual(c.x + 1);
  expect(c.width).toBeGreaterThanOrEqual(12);
  expect(c.x + c.width).toBeLessThanOrEqual(list.x + list.width);
});
