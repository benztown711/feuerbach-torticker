import { test, expect } from './fixtures';
import { MIN, SEC, confirmYes, forward, startGame } from './helpers';

test.describe('US1 Tor entfernen und wiederherstellen', () => {
  test('US1-S5 US1-S6 FR-008 Tor nach Minuten entfernen und wiederherstellen', async ({ page }) => {
    await startGame(page);
    await forward(page, 2 * MIN);
    await page.getByTestId('btn-goal-own').click();
    await forward(page, 5 * MIN);
    await page.getByTestId('goal-list').getByRole('button').first().click();
    await expect(page.getByTestId('goal-actions')).toBeVisible();
    await page.getByTestId('goal-remove').click();
    await confirmYes(page);
    await expect(page.getByTestId('score')).toHaveText('0 : 0');
    const row = page.getByTestId('goal-list').getByRole('button').first();
    await expect(row).toContainText('entfernt');
    await expect(row).toHaveClass(/goal-row--removed/);
    await row.click();
    await page.getByTestId('goal-restore').click();
    await expect(page.getByTestId('score')).toHaveText('1 : 0');
    await expect(page.getByTestId('goal-list').getByRole('button').first()).toContainText("3'");
  });

  test('US1-S7 FR-034 Torliste scrollt in sich, Uhr und Knöpfe bleiben stehen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await startGame(page);
    const before = await page.getByTestId('btn-goal-own').boundingBox();
    for (let i = 0; i < 8; i++) {
      await page.getByTestId(i % 2 ? 'btn-goal-opp' : 'btn-goal-own').click();
      await forward(page, 2 * SEC);
    }
    await expect(page.getByTestId('score')).toHaveText('4 : 4');
    const list = page.getByTestId('goal-list');
    const overflow = await list.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(overflow).toBe(true);
    await list.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    expect(await page.getByTestId('btn-goal-own').boundingBox()).toEqual(before);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);
  });
});
