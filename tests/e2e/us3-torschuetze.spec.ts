import { test, expect } from './fixtures';
import { MIN, SEC, forward, seedRoster, startGame } from './helpers';

test.describe('US3 Torschütze', () => {
  test.beforeEach(async ({ page }) => {
    await seedRoster(page, '7 Max\n3 Ben');
    await startGame(page);
  });

  test('US3-S1 FR-009 Schnellauswahl nach eigenem Tor', async ({ page }) => {
    await forward(page, 11 * MIN);
    await page.getByTestId('btn-goal-own').click();
    const picker = page.getByTestId('scorer-picker');
    await expect(picker).toContainText('Wer hat getroffen?');
    await picker.getByRole('button', { name: '7 Max', exact: true }).click();
    await expect(picker).toBeHidden();
    const row = page.getByTestId('goal-list').getByRole('button').first();
    await expect(row).toContainText("12'");
    await expect(row).toContainText('Feuerbach, Max');
  });

  test('US3-S2 Schnellauswahl schließt nach 8 s ohne Torschützen; Rückgängig bleibt erreichbar', async ({ page }) => {
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('scorer-picker')).toBeVisible();
    await expect(page.getByTestId('btn-undo')).toBeVisible();
    await expect(page.getByTestId('scorer-skip')).toContainText('8 s');
    await forward(page, 8 * SEC);
    await expect(page.getByTestId('scorer-picker')).toBeHidden();
    const row = page.getByTestId('goal-list').getByRole('button').first();
    await expect(row).toContainText('Feuerbach');
    await expect(row).not.toContainText(',');
  });

  test('US3-S3 Torschütze nachträglich aus dem Kader wählen', async ({ page }) => {
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-skip').click();
    await page.getByTestId('goal-list').getByRole('button').first().click();
    await page.getByTestId('goal-edit-scorer').click();
    const picker = page.getByTestId('scorer-picker');
    await expect(picker.getByTestId('scorer-skip')).toHaveCount(0);
    await picker.getByRole('button', { name: '3 Ben', exact: true }).click();
    await expect(page.getByTestId('goal-list').getByRole('button').first()).toContainText('Feuerbach, Ben');
  });

  test('US3-S4 Gegentor: Freitext mit Platzhalter "Name oder Rückennummer"', async ({ page }) => {
    await page.getByTestId('btn-goal-opp').click();
    await expect(page.getByTestId('scorer-picker')).toHaveCount(0);
    await page.getByTestId('goal-list').getByRole('button').first().click();
    await page.getByTestId('goal-edit-scorer').click();
    const input = page.getByTestId('scorer-text-input');
    await expect(input).toHaveAttribute('placeholder', 'Name oder Rückennummer');
    await input.fill('Nr. 9');
    await page.getByTestId('scorer-text-save').click();
    await expect(page.getByTestId('goal-list').getByRole('button').first()).toContainText('TSV Musterstadt, Nr. 9');
  });

  test('US3-S5 Eigentor Gegner', async ({ page }) => {
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-own-goal').click();
    await expect(page.getByTestId('score')).toHaveText('1 : 0');
    await expect(page.getByTestId('goal-list').getByRole('button').first()).toContainText('Feuerbach, Eigentor');
  });
});
