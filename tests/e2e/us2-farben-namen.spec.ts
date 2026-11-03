import { test, expect } from './fixtures';
import { confirmYes, newGame, startGame } from './helpers';

test.describe('US2 Trikotfarben, Mannschaftsname und Tauschen', () => {
  test('FR-031 Vorgaben Rot und Schwarz, Tor-Knöpfe in Trikotfarbe', async ({ page }) => {
    await newGame(page);
    await expect(page.getByTestId('btn-goal-own')).toHaveCSS('background-color', 'rgb(235, 30, 37)');
    await expect(page.getByTestId('btn-goal-opp')).toHaveCSS('background-color', 'rgb(35, 31, 32)');
  });

  test('FR-031 nach einer Änderung gilt die eigene Farbe des letzten Spiels, Gegnerfarbe je Name', async ({ page }) => {
    await newGame(page, { ownColor: 'schwarz', oppColor: 'gelb', opponent: 'SV Beispiel' });
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await expect(page.getByTestId('color-own-schwarz')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('input-opponent').fill('SV Beispiel');
    await expect(page.getByTestId('color-opp-gelb')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('input-opponent').fill('FC Anders');
    await expect(page.getByTestId('color-opp-weiss')).toHaveAttribute('aria-pressed', 'true');
  });

  test('FR-031 Hinweis bei gleicher Farbe', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await page.getByTestId('color-opp-rot').click();
    await expect(page.getByTestId('color-clash-hint')).toBeVisible();
  });

  test('FR-032 weißer Tor-Knopf bekommt einen Rahmen', async ({ page }) => {
    await newGame(page, { oppColor: 'weiss' });
    await expect(page.getByTestId('btn-goal-opp')).toHaveClass(/goal-button--bordered/);
    await expect(page.getByTestId('btn-goal-own')).not.toHaveClass(/goal-button--bordered/);
  });

  test('FR-014 eigener Name pro Spiel, Kurzform auf dem Knopf, Schnellauswahl beim nächsten Spiel', async ({
    page,
  }) => {
    await newGame(page, { ownTeam: 'Sportvg Feuerbach E2' });
    // FR-040: Kopfzeile in Kurzform wie der Knopf
    await expect(page.getByTestId('team-home')).toHaveText('Feuerbach E2');
    await expect(page.getByTestId('btn-goal-own')).toContainText('Feuerbach E2');
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await expect(page.getByTestId('input-own-team')).toHaveValue('Sportvg Feuerbach E2');
    await expect(page.getByTestId('own-team-recent-0')).toHaveText('Sportvg Feuerbach E2');
  });

  test('FR-035 Tauschen vor dem Anpfiff direkt, danach nur über das Menü mit Abfrage', async ({ page }) => {
    await newGame(page);
    await expect(page.getByTestId('team-home')).toHaveText('Feuerbach');
    await page.getByTestId('btn-swap-venue').click();
    await expect(page.getByTestId('team-home')).toHaveText('TSV Musterstadt');
    await page.getByTestId('btn-kickoff').click();
    await expect(page.getByTestId('btn-swap-venue')).toBeHidden();
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('btn-menu').click();
    await page.getByTestId('menu-swap-venue').click();
    await confirmYes(page);
    await expect(page.getByTestId('team-home')).toHaveText('Feuerbach');
    await expect(page.getByTestId('score')).toHaveText('1 : 0');
  });

  test('FR-001 ohne Gegner geht es nicht weiter', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await page.getByTestId('input-opponent').fill('');
    await expect(page.getByTestId('btn-create')).toBeDisabled();
  });

  test('FR-016 der Spielbildschirm nutzt Textknöpfe ohne Symbole', async ({ page }) => {
    await startGame(page);
    await expect(page.getByTestId('btn-pause').locator('svg')).toHaveCount(0);
  });
});
