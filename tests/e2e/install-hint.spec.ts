import { test, expect } from './fixtures';

test.describe('FR-023 Installationshinweis', () => {
  test('T074 außerhalb des Home-Bildschirms: Hinweis in den Einstellungen, wegklickbar, kommt nicht wieder', async ({
    page,
  }) => {
    await page.goto('./#/einstellungen');
    const hint = page.getByTestId('install-hint');
    await expect(hint).toContainText('Home-Bildschirm');
    await page.getByTestId('install-hint-dismiss').click();
    await expect(hint).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible();
    await expect(page.getByTestId('install-hint')).toHaveCount(0);
  });
});

test.describe('FR-018 Darstellung', () => {
  test('"Dunkel" fest einstellen wirkt sofort und bleibt nach Neuladen', async ({ page }) => {
    await page.goto('./#/einstellungen');
    await expect(page.getByTestId('theme-system')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('theme-dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByTestId('theme-dark')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('theme-system').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  });
});
