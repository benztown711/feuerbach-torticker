import { test, expect } from './fixtures';
import { MIN, SEC, confirmYes, forward, newGame, playFinishedGame, seedRoster, startGame } from './helpers';

test.describe('US4 Ergebnis teilen (FR-011)', () => {
  test('US4-S1 005 US1-S1 Teilen-Menü mit Text nach contracts/share-text.md, auch direkt nach dem Schlusspfiff', async ({
    page,
    recorded,
  }) => {
    await seedRoster(page, '7 Max');
    await playFinishedGame(page, [], { opponent: 'TSV Musterstadt', away: true });
    await page.getByTestId('btn-share').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(1);
    const text = (await recorded()).shares[0]?.text ?? '';
    expect(text.split('\n')[0]).toBe('*TSV Musterstadt 0:0 Sportvg Feuerbach*');
    expect(text.split('\n')[1]).toMatch(/^\S\S, \d\d\.\d\d\.\d{4}, \d\d:\d\d Uhr$/);
  });

  test('US4-S1 005 US1-S2 US1-S4 US5-S1 Torschütze in Tabelle und Torschützen; Vorschau wie im Chat', async ({
    page,
    recorded,
  }) => {
    await seedRoster(page, '7 Max');
    await startGame(page, { opponent: 'FC Erster', sections: 1, minutes: 12 });
    await forward(page, MIN);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true }).click();
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await page.getByTestId('nav-history').click();
    await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
    const preview = page.getByTestId('share-preview');
    await expect(preview.locator('strong').first()).toHaveText('Sportvg Feuerbach 1:0 FC Erster');
    await expect(preview.locator('pre')).toHaveText("🔴 2'  1:0  Max", { useInnerText: true });
    await expect(preview).not.toContainText('*');
    await expect(preview).not.toContainText('```');
    await page.getByTestId('btn-share').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(1);
    const lines = ((await recorded()).shares[0]?.text ?? '').split('\n');
    expect(lines).toContain("🔴 2'  1:0  Max");
    expect(lines.slice(-2)).toEqual(['*Torschützen*', 'Max ⚽']);
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

test.describe('FR-042 Zwischenstand teilen', () => {
  test('FR-042 005 US4-S1 im "…"-Menü während des Spiels, nicht vor dem Anpfiff', async ({ page, recorded }) => {
    await newGame(page, { opponent: 'TSV Musterstadt' });
    await page.getByTestId('btn-menu').click();
    await expect(page.getByTestId('game-menu')).toBeVisible();
    await expect(page.getByTestId('menu-share-interim')).toHaveCount(0);
    await page.getByTestId('game-menu').getByRole('button', { name: 'Schließen' }).click();
    await page.getByTestId('btn-kickoff').click();
    await forward(page, 6 * MIN);
    await page.getByTestId('btn-goal-own').click();
    await forward(page, 11 * SEC);
    await page.getByTestId('btn-menu').click();
    await page.getByTestId('menu-share-interim').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(1);
    const lines = ((await recorded()).shares[0]?.text ?? '').split('\n');
    expect(lines.slice(0, 2)).toEqual(['*Sportvg Feuerbach 1:0 TSV Musterstadt*', "Zwischenstand 7'"]);
    expect(lines[3]).toBe("🔴 7'  1:0");
    await expect(page.getByTestId('game-menu')).toBeHidden();
  });
});
