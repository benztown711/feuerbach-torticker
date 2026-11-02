import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
import { MIN, forward, newGame, playFinishedGame, seedRoster, startGame } from './helpers';

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

    test('US5 US7 Kader und Liste einfügen ohne axe-Verstöße', async ({ page }) => {
      await seedRoster(page, '1 Max\n2 Ben');
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByTestId('btn-paste-list').click();
      await page.getByTestId('paste-input').fill('7 Leo\n7 Paul Meier\nMax');
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

    test('US3 US5 Aufgebot und Torschützen-Auswahl ohne axe-Verstöße', async ({ page }) => {
      await seedRoster(page, '1 Max\n2 Ben\n3 Tom');
      await page.goto('./#/neu');
      await page.getByTestId('squad-picker').getByRole('button', { name: '1 Max', exact: true }).click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByTestId('input-opponent').fill('TSV Musterstadt');
      await page.getByTestId('btn-create').click();
      await page.getByTestId('btn-kickoff').click();
      await page.getByTestId('btn-goal-own').click();
      await expect(page.getByTestId('scorer-picker')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

    test('FR-037 FR-038 Historie, Spieldetails, Mehr, Einstellungen und Hilfe ohne axe-Verstöße', async ({ page }) => {
      await playFinishedGame(page, ['own', 'opp'], { ownTeam: 'Sportvg Feuerbach E1' });
      await playFinishedGame(page, ['opp'], { ownTeam: 'Sportvg Feuerbach E2' });
      await page.getByTestId('nav-history').click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
      await expect(page.getByTestId('details-timeline')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      for (const id of ['more-settings', 'more-help']) {
        await page.getByTestId('nav-more').click();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        await page.getByTestId(id).click();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      }
    });
  });
}
