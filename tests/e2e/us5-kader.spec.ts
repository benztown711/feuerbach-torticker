import { test, expect } from './fixtures';
import { ROSTER_21, SEC, confirmYes, forward, newGame, seedRoster } from './helpers';

test.describe('US5 Kader und Aufgebot', () => {
  test('US5-S1 FR-029 Spieler anlegen, ändern; Hinweis bei Nachnamen', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('btn-roster').click();
    await page.getByTestId('btn-add-player').click();
    await page.getByTestId('input-player-name').fill('Max Mustermann');
    await expect(page.getByTestId('hint-first-name-only')).toBeVisible();
    await page.getByTestId('input-player-name').fill('Max');
    await expect(page.getByTestId('hint-first-name-only')).toBeHidden();
    await page.getByTestId('input-player-number').fill('7');
    await page.getByTestId('btn-save-player').click();
    await expect(page.getByTestId('roster-list')).toContainText('7Max');
    await page.getByTestId('roster-list').getByRole('button', { name: 'Max ändern' }).click();
    await page.getByTestId('input-player-name').fill('Maxi');
    await page.getByTestId('btn-save-player').click();
    await expect(page.getByTestId('roster-list')).toContainText('7Maxi');
  });

  test('US5-S2 US5-S5 Aufgebot 10 aus 21, Auswahl zeigt nur Aufgebot, "Andere …" den Rest', async ({ page }) => {
    await seedRoster(page, ROSTER_21);
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await page.getByTestId('input-opponent').fill('TSV Musterstadt');
    const picker = page.getByTestId('squad-picker');
    for (const label of [
      '10 Luis',
      '1 Max',
      '2 Ben',
      '3 Tom',
      '4 Leo',
      '5 Paul',
      '6 Maxi',
      '7 Finn',
      '8 Noah',
      '9 Emil',
    ]) {
      await picker.getByRole('button', { name: label, exact: true }).click();
    }
    await expect(page.getByTestId('squad-count')).toHaveText('AUFGEBOT · 10 VON 21');
    await page.getByTestId('btn-create').click();
    await page.getByTestId('btn-kickoff').click();
    await page.getByTestId('btn-goal-own').click();
    const scorer = page.getByTestId('scorer-picker');
    await expect(scorer).toBeVisible();
    const options = scorer.locator('[data-testid^="scorer-option-"]');
    await expect(options).toHaveCount(10);
    await expect(options.first()).toHaveAccessibleName('1 Max');
    await expect(options.last()).toHaveAccessibleName('10 Luis');
    await scorer.getByTestId('scorer-others').click();
    await expect(options).toHaveCount(21);
    await scorer.getByRole('button', { name: '21 Henri', exact: true }).click();
    await expect(page.getByTestId('goal-list')).toContainText('Henri');
  });

  test('US5-S3 Aufgebot des letzten Spiels ist vorausgewählt und per Tap übernehmbar', async ({ page }) => {
    await seedRoster(page, ROSTER_21);
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await page.getByTestId('input-opponent').fill('TSV Musterstadt');
    const picker = page.getByTestId('squad-picker');
    for (const label of ['1 Max', '2 Ben', '3 Tom']) {
      await picker.getByRole('button', { name: label, exact: true }).click();
    }
    await page.getByTestId('btn-create').click();
    await expect(page.getByTestId('btn-kickoff')).toBeVisible();

    await page.goto('./#/neu');
    await expect(page.getByTestId('squad-count')).toHaveText('AUFGEBOT · 3 VON 21');
    await picker.getByRole('button', { name: '1 Max', exact: true }).click();
    await picker.getByRole('button', { name: '4 Leo', exact: true }).click();
    await expect(picker.getByRole('button', { name: '4 Leo', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('squad-take-last').click();
    await expect(page.getByTestId('squad-count')).toHaveText('AUFGEBOT · 3 VON 21');
    await expect(picker.getByRole('button', { name: '1 Max', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(picker.getByRole('button', { name: '4 Leo', exact: true })).toHaveAttribute('aria-pressed', 'false');
  });

  test('US5-S4 ohne Aufgebot zeigt die Auswahl den ganzen Kader', async ({ page }) => {
    await seedRoster(page, '1 Max\n2 Ben\n3 Tom');
    await newGame(page);
    await page.getByTestId('btn-kickoff').click();
    await page.getByTestId('btn-goal-own').click();
    const scorer = page.getByTestId('scorer-picker');
    await expect(scorer.locator('[data-testid^="scorer-option-"]')).toHaveCount(3);
    await expect(scorer.getByTestId('scorer-others')).toHaveCount(0);
  });

  test('US5-S6 FR-029 gelöschter Spieler verschwindet, bleibt aber Torschütze im alten Spiel', async ({ page }) => {
    await seedRoster(page, '1 Max\n2 Ben');
    await newGame(page);
    await page.getByTestId('btn-kickoff').click();
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '1 Max', exact: true }).click();
    await forward(page, 2 * SEC);
    const gameUrl = page.url();

    await page.goto('./#/kader');
    await page.getByTestId('roster-list').getByRole('button', { name: 'Max löschen' }).click();
    await confirmYes(page);
    await expect(page.getByTestId('roster-list')).not.toContainText('Max');
    await expect(page.getByTestId('roster-list')).toContainText('Ben');

    await page.goto(gameUrl);
    await expect(page.getByTestId('goal-list')).toContainText('Max');
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('scorer-picker').locator('[data-testid^="scorer-option-"]')).toHaveCount(1);
  });
});
