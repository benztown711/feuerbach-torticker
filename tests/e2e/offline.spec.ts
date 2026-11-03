import { test, expect } from './fixtures';

test.describe('FR-012 Offline nach dem ersten Laden (T082)', () => {
  test('FR-012 ohne Netz: App lädt neu, Spiel anlegen, anpfeifen und Tor erfassen funktioniert', async ({
    page,
    context,
  }) => {
    await page.goto('./');
    // Service Worker installiert und precacht alles; ab dem zweiten Laden steuert er die Seite.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { timeout: 15_000 })
      .toBe(true);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId('btn-new-game')).toBeVisible();
    await page.getByTestId('btn-new-game').click();
    await page.getByTestId('input-opponent').fill('TSV Offline');
    await page.getByTestId('btn-create').click();
    await page.getByTestId('btn-kickoff').click();
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('score')).toHaveText('1 : 0');
    await context.setOffline(false);
  });
});
