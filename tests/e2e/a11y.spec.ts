import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
import { MIN, forward, newGame, startGame } from './helpers';

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`Barrierefreiheit (${scheme === 'light' ? 'hell' : 'dunkel'})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    test('Neues Spiel ohne axe-Verstöße', async ({ page }) => {
      await page.goto('./');
      await page.getByTestId('btn-new-game').click();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });

    test('Spielbildschirm vor Anpfiff ohne axe-Verstöße', async ({ page }) => {
      await newGame(page);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });

    test('Spielbildschirm in der Nachspielzeit mit Toren ohne axe-Verstöße', async ({ page }) => {
      await startGame(page, { oppColor: 'weiss' });
      await page.getByTestId('btn-goal-own').click();
      await forward(page, 26 * MIN);
      await page.getByTestId('btn-goal-opp').click();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
