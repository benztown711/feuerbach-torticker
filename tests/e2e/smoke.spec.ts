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

  test('FR-043 Link-Vorschau: Open-Graph-Angaben und Vorschaubild 1200 × 630 unter 300 KB', async ({
    page,
    request,
  }) => {
    await page.goto('./');
    const og = async (p: string) => page.locator(`meta[property="og:${p}"]`).getAttribute('content');
    expect(await og('title')).toContain('Torticker');
    expect(await og('description')).toBeTruthy();
    expect(await og('url')).toBe('https://benztown711.github.io/feuerbach-torticker/');
    const image = await og('image');
    expect(image).toBe('https://benztown711.github.io/feuerbach-torticker/link-vorschau.png');
    // Das Bild liegt im eigenen Build (lokal unter derselben Adresse wie auf GitHub Pages)
    const res = await request.get(new URL('link-vorschau.png', page.url()).toString());
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
    const png = await res.body();
    expect(png.length).toBeLessThan(300_000);
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
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
