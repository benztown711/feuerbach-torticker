import { test, expect } from './fixtures';
import { MIN, confirmYes, forward, playFinishedGame, seedRoster, startGame } from './helpers';

test.describe('US4 Ergebnis teilen (FR-011)', () => {
  test('US4-S1 Teilen-Menü mit Text nach contracts/share-text.md, auch direkt nach dem Schlusspfiff', async ({
    page,
    recorded,
  }) => {
    await seedRoster(page, '7 Max');
    await playFinishedGame(page, [], { opponent: 'TSV Musterstadt', away: true });
    await page.getByTestId('btn-share').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(1);
    const text = (await recorded()).shares[0]?.text ?? '';
    expect(text.split('\n')[0]).toBe('⚽ TSV Musterstadt - Sportvg Feuerbach 0:0');
    expect(text.split('\n')[1]).toMatch(/^\d\d\.\d\d\.\d{4}, Anpfiff \d\d:\d\d$/);
  });

  test('US4-S1 Torschütze erscheint im Text; Vorschau in den Spieldetails', async ({ page, recorded }) => {
    await seedRoster(page, '7 Max');
    await startGame(page, { opponent: 'FC Erster', sections: 1, minutes: 12 });
    await forward(page, MIN);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true }).click();
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await page.getByTestId('nav-history').click();
    await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
    await expect(page.getByTestId('share-preview')).toContainText("2' 1:0 Max");
    await page.getByTestId('btn-share').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(1);
    expect((await recorded()).shares[0]?.text).toContain("2' 1:0 Max");
  });

  test('US4-S2 ohne Teilen-Funktion: Zwischenablage mit Bestätigung', async ({ page }) => {
    await playFinishedGame(page, ['opp'], { opponent: 'FC Erster' });
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      const w = window as unknown as { __clip: string };
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (t: string) => void (w.__clip = t) },
      });
    });
    await page.getByTestId('btn-share').click();
    await expect(page.getByTestId('share-result')).toContainText('kopiert');
    const clip = await page.evaluate(() => (window as unknown as { __clip: string }).__clip);
    expect(clip).toContain('FC Erster');
  });

  test('offenes Spiel: Spieldetails ohne Teilen, mit Rückweg zum Spiel', async ({ page }) => {
    await startGame(page, { opponent: 'FC Erster' });
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('history-list')).toContainText('läuft');
    await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
    await expect(page.getByTestId('btn-share')).toHaveCount(0);
    await page.getByTestId('btn-back-to-game').click();
    await expect(page.getByTestId('btn-pause')).toBeVisible();
  });
});
