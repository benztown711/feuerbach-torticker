import { test, expect } from './fixtures';
import { MIN, SEC, forward, startGame } from './helpers';

test.describe('FR-037 Navigationsleiste unten', () => {
  test('FR-037 drei Einträge auf allen Bildschirmen, aktiver Eintrag markiert', async ({ page }) => {
    await page.goto('./');
    const nav = page.getByTestId('nav');
    await expect(nav.getByRole('link')).toHaveCount(3);
    await expect(page.getByTestId('nav-game')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('nav-game')).toContainText('Spiel');

    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('nav-history')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Historie' })).toBeVisible();

    await page.getByTestId('nav-more').click();
    await expect(page.getByTestId('nav-more')).toHaveAttribute('aria-current', 'page');
    for (const [id, heading] of [
      ['more-roster', 'Kader'],
      ['more-settings', 'Einstellungen'],
      ['more-help', 'Hilfe'],
    ] as const) {
      await page.getByTestId('nav-more').click();
      await page.getByTestId(id).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByTestId('nav-more')).toHaveAttribute('aria-current', 'page');
    }
  });

  test('FR-037 laufendes Spiel: "Läuft <Minute>" auf anderen Seiten, ein Tipp führt zurück, Uhr lief weiter', async ({
    page,
  }) => {
    await startGame(page);
    await expect(page.getByTestId('nav-live')).toHaveCount(0);
    await forward(page, 5 * MIN);
    await page.getByTestId('nav-history').click();
    await forward(page, 2 * SEC);
    await expect(page.getByTestId('nav-live')).toHaveText("Läuft 6'");
    await forward(page, 2 * MIN);
    await page.getByTestId('nav-game').click();
    await expect(page.getByTestId('btn-pause')).toBeVisible();
    await expect(page.getByTestId('clock')).toHaveText(/^1[78]:\d\d$/);
    await expect(page.getByTestId('nav-game')).toHaveAttribute('aria-current', 'page');
  });

  test('FR-037 Tipp auf "Spiel" im Spielbildschirm führt zur Startseite mit "Spiel fortsetzen"', async ({ page }) => {
    await startGame(page);
    await page.getByTestId('nav-game').click();
    await expect(page.getByTestId('btn-continue')).toBeVisible();
    await expect(page.getByTestId('btn-new-game')).toBeVisible();
  });

  test('FR-033 FR-037 Spielbildschirm mit Leiste passt auf 375 × 667 ohne Seiten-Scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await startGame(page);
    const nav = await page.getByTestId('nav').boundingBox();
    expect(nav?.height).toBeGreaterThanOrEqual(56);
    expect((nav?.y ?? 0) + (nav?.height ?? 0)).toBeLessThanOrEqual(667);
    for (const id of ['btn-goal-own', 'btn-goal-opp']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(64);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(nav?.y ?? 0);
    }
    const sh = await page.evaluate(() => (document.scrollingElement as HTMLElement).scrollHeight);
    expect(sh).toBeLessThanOrEqual(667);
  });

  test('Runde 4: Menü "…" ohne "Uhr zurücksetzen"', async ({ page }) => {
    await startGame(page);
    await page.getByTestId('btn-menu').click();
    await expect(page.getByTestId('game-menu')).toBeVisible();
    await expect(page.getByTestId('game-menu')).not.toContainText('zurücksetzen');
    await expect(page.getByTestId('menu-swap-venue')).toBeVisible();
    await expect(page.getByTestId('menu-details')).toBeVisible();
  });
});
