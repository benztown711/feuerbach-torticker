import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

test.describe('Smoke: Startbildschirm', () => {
  test('lädt mit Titel, rotem Balken und Wappen ohne Fremd-Requests', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle('Feuerbach Torticker');
    await expect(page.getByRole('heading', { level: 1, name: 'TORTICKER' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Wappen der Sportvg Feuerbach' })).toBeVisible();
    await expect(page.getByTestId('btn-new-game')).toHaveText('Neues Spiel');
  });

  test('FR-015 nutzt die Vereinsschrift und das Vereinsrot aus den Design-Tokens', async ({ page }) => {
    await page.goto('./');
    const bar = page.getByRole('heading', { level: 1 });
    await expect(bar).toHaveCSS('background-color', 'rgb(235, 30, 37)');
    const family = await bar.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toContain('Fira Sans Extra Condensed');
  });

  test('axe-core findet keine Verstöße (hell)', async ({ page }) => {
    await page.goto('./');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('axe-core findet keine Verstöße (dunkel)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('./');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('Manifest ist verlinkt und installierbar beschrieben', async ({ page, request }) => {
    await page.goto('./');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const manifest = await (await request.get(new URL(href ?? '', page.url()).toString())).json();
    expect(manifest).toMatchObject({ name: 'Feuerbach Torticker', display: 'standalone', lang: 'de' });
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  });
});
