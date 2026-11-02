import { test, expect } from './fixtures';
import { MIN, SEC, confirmYes, forward, newGame, startGame } from './helpers';

test.describe('US1 Tor mit einem Tap erfassen', () => {
  test('US1-S1 FR-021 vor dem Anpfiff sind beide Tor-Knöpfe deaktiviert', async ({ page }) => {
    await newGame(page);
    await expect(page.getByTestId('btn-goal-own')).toBeDisabled();
    await expect(page.getByTestId('btn-goal-opp')).toBeDisabled();
  });

  test('US1-S2 FR-004 bei 6:12 gespielt: 1 : 0 und Eintrag 7. Minute', async ({ page }) => {
    await startGame(page);
    await forward(page, 6 * MIN + 12 * SEC);
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('score')).toHaveText('1 : 0');
    const row = page.getByTestId('goal-list').getByRole('button').first();
    await expect(row).toContainText("7'");
    await expect(row).toContainText('1:0');
    await expect(row).toContainText('Feuerbach');
  });

  test('US1-S3 FR-004 Gegentor erhöht den Gegner', async ({ page }) => {
    await startGame(page);
    await page.getByTestId('btn-goal-opp').click();
    await expect(page.getByTestId('score')).toHaveText('0 : 1');
  });

  test('US1-S4 FR-008 Rückgängig innerhalb von 10 s entfernt das Tor', async ({ page }) => {
    await startGame(page);
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('undo-bar')).toBeVisible();
    await page.getByTestId('btn-undo').click();
    await expect(page.getByTestId('score')).toHaveText('0 : 0');
    await expect(page.getByTestId('goal-list').getByRole('button')).toHaveCount(0);
  });

  test('US1-S4 die Rückgängig-Leiste verschwindet nach 10 s', async ({ page }) => {
    await startGame(page);
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('undo-bar')).toBeVisible();
    await forward(page, 11 * SEC);
    await expect(page.getByTestId('undo-bar')).toBeHidden();
  });

  test('Doppeltipp innerhalb 1,5 s zählt nur einmal', async ({ page }) => {
    await startGame(page);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('score')).toHaveText('1 : 0');
    await expect(page.getByTestId('double-tap-hint')).toBeVisible();
    await forward(page, 2 * SEC);
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('score')).toHaveText('2 : 0');
  });

  test('FR-004 zwei Tore direkt hintereinander (ohne Zwischen-Rendern) gehen nicht verloren', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      (document.querySelector('[data-testid="btn-goal-own"]') as HTMLButtonElement).click();
      (document.querySelector('[data-testid="btn-goal-opp"]') as HTMLButtonElement).click();
    });
    await expect(page.getByTestId('score')).toHaveText('1 : 1');
  });

  test('SC-001 Tap bis Anzeige unter 100 ms', async ({ page }) => {
    await startGame(page);
    const ms = await page.evaluate(async () => {
      const btn = document.querySelector('[data-testid="btn-goal-own"]') as HTMLButtonElement;
      const score = document.querySelector('[data-testid="score"]') as HTMLElement;
      const t0 = performance.now();
      btn.click();
      await new Promise<void>((resolve) => {
        const check = () => (score.textContent === '1 : 0' ? resolve() : queueMicrotask(check));
        check();
      });
      return performance.now() - t0;
    });
    expect(ms).toBeLessThan(100);
  });

  test('FR-021 nach dem Schlusspfiff sind die Tor-Knöpfe deaktiviert', async ({ page }) => {
    await startGame(page, { sections: 1, minutes: 12 });
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await expect(page.getByTestId('btn-goal-own')).toBeDisabled();
  });

  test('FR-022 Spieldetails zeigen Tore mit Minute und Uhrzeit sowie Uhr-Ereignisse', async ({ page }) => {
    await startGame(page);
    await forward(page, 3 * MIN);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('btn-menu').click();
    await page.getByTestId('menu-details').click();
    const timeline = page.getByTestId('details-timeline');
    await expect(timeline).toContainText("4'");
    await expect(timeline).toContainText(/\d\d:\d\d:\d\d/);
    await expect(timeline).toContainText('Anpfiff');
  });
});
