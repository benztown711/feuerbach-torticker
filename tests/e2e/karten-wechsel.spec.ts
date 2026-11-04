import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { MIN, SEC, acceptDraw, confirmYes, forward, seedRoster, startGame } from './helpers';

async function enable(page: Page, ...keys: ('cards' | 'subs' | 'marks')[]): Promise<void> {
  await page.goto('./#/einstellungen');
  for (const k of keys) {
    await page.getByTestId(`feature-${k}`).click();
    await expect(page.getByTestId(`feature-${k}`)).toHaveAttribute('aria-checked', 'true');
  }
}

const player = (page: Page, prefix: string, name: string) =>
  page.locator(`[data-testid^="${prefix}"]`).filter({ hasText: name });
const eventRows = (page: Page) => page.locator('[data-testid^="event-row-"]');

test.describe('Spec 003 Teil 2: Karten und Wechsel', () => {
  test('003 US3-S1 US4-S1 FR-E02 ohne Schalter keine Knöpfe "Karte" und "Wechsel"', async ({ page }) => {
    await enable(page, 'marks');
    await startGame(page);
    await expect(page.getByTestId('btn-event-mark')).toBeVisible();
    await expect(page.getByTestId('btn-event-card')).toHaveCount(0);
    await expect(page.getByTestId('btn-event-sub')).toHaveCount(0);
  });

  test('003 US3-S7 FR-E09 nur "Karten" an: "Karte" zeigt genau vier Kacheln', async ({ page }) => {
    await enable(page, 'cards');
    await startGame(page);
    const buttons = page.getByTestId('event-row').getByRole('button');
    await expect(buttons).toHaveText(['Karte']);
    await page.getByTestId('btn-event-card').click();
    const tiles = page.getByTestId('card-pick-sheet').locator('[data-testid^="event-card-"]');
    await expect(tiles).toHaveText(['Gelb', 'Gelb-Rot', 'Rot', 'Zeitstrafe']);
    for (const box of await tiles.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))) {
      expect(box.width).toBeGreaterThanOrEqual(64);
      expect(box.height).toBeGreaterThanOrEqual(64);
    }
    await expect(page.getByTestId('card-pick-sheet')).toContainText('Karte');
  });

  test('003 US4-S5 FR-E09 "Wechsel" öffnet direkt raus/rein', async ({ page }) => {
    await seedRoster(page, ['2 Ben', '3 Tom'].join('\n'));
    await enable(page, 'subs');
    await startGame(page);
    await forward(page, 4 * MIN);
    await page.getByTestId('btn-event-sub').click();
    await expect(page.getByTestId('sub-sheet')).toBeVisible();
    await expect(page.getByTestId('sub-sheet')).toContainText("Minute 5'");
    await expect(page.getByRole('dialog')).toHaveCount(1);
  });

  test('003 US3-S2 Gelb für einen eigenen Spieler mit einem Tipp auf den Namen; Rückgängig', async ({ page }) => {
    await seedRoster(page, ['2 Ben', '3 Tom', '4 Leo'].join('\n'));
    await enable(page, 'cards');
    await startGame(page);
    await forward(page, 5 * MIN);
    await page.getByTestId('btn-event-card').click();
    await page.getByTestId('event-card-gelb').click();
    await expect(page.getByTestId('card-sheet')).toContainText("Minute 6'");
    await expect(page.getByTestId('card-kind-gelb')).toHaveAttribute('aria-pressed', 'true');
    await player(page, 'card-player-', 'Tom').click();
    await expect(eventRows(page)).toHaveCount(1);
    await expect(eventRows(page)).toContainText("6'");
    await expect(eventRows(page)).toContainText('Gelb Tom');
    await expect(page.getByTestId('event-toast')).toContainText("Gelb 6' erfasst");
    await page.getByTestId('event-undo').click();
    await expect(eventRows(page)).toHaveCount(0);
  });

  test('003 US3-S3 US3-S4 Rot für den Gegner mit Freitext; Karte ohne Spieler', async ({ page }) => {
    await enable(page, 'cards');
    await startGame(page);
    await forward(page, 33 * SEC);
    await page.getByTestId('btn-event-card').click();
    await page.getByTestId('event-card-rot').click();
    await page.getByTestId('card-side-opp').click();
    await page.getByTestId('card-note').click();
    await page.getByTestId('input-card-comment').fill('Notbremse');
    await page.getByTestId('input-card-opp').fill('Nr. 9');
    await page.getByTestId('btn-save-card').click();
    await expect(eventRows(page)).toContainText('Rot Nr. 9 (TSV Musterstadt)');
    await page.getByTestId('btn-event-card').click();
    await page.getByTestId('event-card-zeit').click();
    await page.getByTestId('card-no-player').click();
    await expect(eventRows(page).first()).toContainText('Zeitstrafe (Feuerbach)');
  });

  test('003 US3-S6 Karte ändern und mit Abfrage löschen', async ({ page }) => {
    await seedRoster(page, ['2 Ben', '3 Tom'].join('\n'));
    await enable(page, 'cards');
    await startGame(page);
    await forward(page, 2 * MIN);
    await page.getByTestId('btn-event-card').click();
    await page.getByTestId('event-card-gelb').click();
    await player(page, 'card-player-', 'Tom').click();
    await forward(page, 11 * SEC);
    await eventRows(page).click();
    await page.getByTestId('event-edit').click();
    await page.getByTestId('card-kind-gelbrot').click();
    await player(page, 'card-player-', 'Ben').click();
    await expect(eventRows(page)).toContainText('Gelb-Rot Ben');
    await eventRows(page).click();
    await page.getByTestId('event-delete').click();
    await confirmYes(page);
    await expect(eventRows(page)).toHaveCount(0);
  });

  test('003 US4-S2 US4-S3 Wechsel "Leo für Ben" aus dem Aufgebot', async ({ page }) => {
    await seedRoster(page, ['2 Ben', '3 Tom', '4 Leo'].join('\n'));
    await enable(page, 'subs');
    await startGame(page);
    await forward(page, 29 * MIN + 30 * SEC);
    await page.getByTestId('btn-event-sub').click();
    await expect(page.getByTestId('btn-save-sub')).toBeDisabled();
    await player(page, 'sub-out-', 'Ben').click();
    await expect(player(page, 'sub-in-', 'Ben')).toHaveCount(0);
    await player(page, 'sub-in-', 'Leo').click();
    await expect(page.getByTestId('sub-result')).toContainText('Leo für Ben');
    await page.getByTestId('btn-save-sub').click();
    await expect(eventRows(page)).toContainText('Leo für Ben');
    await expect(page.getByTestId('event-toast')).toContainText('Wechsel');
  });

  test('003 US3-S5 US4-S4 005 US2-S1 US2-S3 Karten und Wechsel im Verlauf des Teilen-Texts', async ({
    page,
    recorded,
  }) => {
    await seedRoster(page, ['2 Ben', '3 Tom', '4 Leo'].join('\n'));
    await enable(page, 'cards', 'subs');
    await startGame(page, { sections: 1, minutes: 12 });
    await forward(page, 3 * MIN);
    await page.getByTestId('btn-event-card').click();
    await page.getByTestId('event-card-gelb').click();
    await player(page, 'card-player-', 'Tom').click();
    await forward(page, 2 * MIN);
    await page.getByTestId('btn-event-sub').click();
    await player(page, 'sub-out-', 'Ben').click();
    await player(page, 'sub-in-', 'Leo').click();
    await page.getByTestId('btn-save-sub').click();
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await acceptDraw(page);
    await page.getByTestId('btn-share').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(1);
    const lines = ((await recorded()).shares[0]?.text ?? '').split('\n');
    expect(lines).toContain("🟨 4'  Tom");
    expect(lines).toContain("🔄 6'  Leo für Ben");
    await page.getByTestId('btn-menu').click();
    await page.getByTestId('menu-details').click();
    await expect(page.getByTestId('details-timeline')).toContainText('Gelb Tom');
    await expect(page.getByTestId('details-timeline')).toContainText('Leo für Ben');
  });

  test('003 FR-E06 Griff klappt die Liste über die Uhr-Knöpfe auf; FR-033 mit allen Schaltern', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await enable(page, 'cards', 'subs', 'marks');
    await startGame(page);
    await forward(page, 2 * MIN);
    await page.getByTestId('btn-goal-own').click();
    await forward(page, 11 * SEC);
    const scroll = await page.evaluate(() => {
      const el = document.scrollingElement as HTMLElement;
      return { sh: el.scrollHeight, ih: window.innerHeight };
    });
    expect(scroll.sh).toBeLessThanOrEqual(scroll.ih);
    await expect(page.getByTestId('event-row')).toBeVisible();
    const before = (await page.getByTestId('goal-list').boundingBox())?.height ?? 0;
    await page.getByTestId('list-grip').click();
    await expect(page.getByTestId('btn-pause')).toBeHidden();
    await expect(page.getByTestId('event-row')).toBeHidden();
    await expect(page.getByTestId('score')).toBeVisible();
    const after = (await page.getByTestId('goal-list').boundingBox())?.height ?? 0;
    expect(after).toBeGreaterThan(before + 40);
    await page.getByTestId('list-grip').click();
    await expect(page.getByTestId('btn-pause')).toBeVisible();
  });
});
