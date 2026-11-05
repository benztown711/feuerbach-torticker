import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
import { MIN, forward, newGame, playFinishedGame, seedRoster, startGame } from './helpers';
import { sampleDashboard } from './live-helpers';

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`Barrierefreiheit (${scheme === 'light' ? 'hell' : 'dunkel'})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    test('014 SC-D04 Historie im Auswahlmodus und mit „Rückgängig“ ohne axe-Verstöße', async ({ page }) => {
      await playFinishedGame(page, ['own'], { opponent: 'TSV Weilimdorf' });
      await startGame(page, { opponent: 'TSG Stuttgart' });
      await page.getByTestId('nav-history').click();
      await page.getByTestId('history-select').click();
      await page.getByTestId('history-select-all').click();
      await expect(page.getByTestId('history-delete')).toHaveText('Löschen (1)');
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByTestId('history-delete').click();
      await page.getByTestId('confirm-yes').click();
      await expect(page.getByTestId('history-undo')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
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

    test('010 Hilfe: Übersicht, Treffer mit Hervorhebung und Eintrag ohne axe-Verstöße', async ({ page }) => {
      await page.goto('./#/hilfe');
      await expect(page.getByTestId('help-topic-start')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByTestId('help-search').fill('tor löschen');
      await expect(page.getByTestId('help-count')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByTestId('help-search').fill('xyz');
      await expect(page.getByTestId('help-none')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.goto('./#/hilfe/sichern');
      await expect(page.getByTestId('help-entry')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  });
}

test.describe('006 US3 Dashboard ohne axe-Verstöße', () => {
  // Relay-Nachbau braucht blockierte Service Worker (fixtures.ts).
  test.use({ serviceWorkers: 'block' });
  for (const scheme of ['light', 'dark'] as const) {
    test(`Dashboard ${scheme === 'light' ? 'hell' : 'dunkel'}, zu- und aufgeklappt`, async ({
      page,
      recorded,
      relay,
      newDevice,
    }) => {
      const v = await sampleDashboard(page, recorded, relay, newDevice, scheme);
      expect((await new AxeBuilder({ page: v }).analyze()).violations).toEqual([]);
      await v.getByTestId('dash-toggle-E3').click();
      await expect(v.getByTestId('dash-details-E3')).toBeVisible();
      expect((await new AxeBuilder({ page: v }).analyze()).violations).toEqual([]);
      // Spec 010: Eltern-Hilfe mit Leiste
      await v.getByTestId('viewer-nav-help').click();
      await v.getByTestId('help-search').fill('teilen');
      await expect(v.getByTestId('help-count')).toBeVisible();
      expect((await new AxeBuilder({ page: v }).analyze()).violations).toEqual([]);
    });
  }
});
