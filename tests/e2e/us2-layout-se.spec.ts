import { test, expect } from './fixtures';
import { startGame } from './helpers';

test.describe('FR-033 Layout auf kleinem iPhone', () => {
  test('FR-033 Spielbildschirm passt ohne Seiten-Scroll, Tor-Knöpfe mind. 64 × 64', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await startGame(page);
    const scroll = await page.evaluate(() => {
      const el = document.scrollingElement as HTMLElement;
      return { sh: el.scrollHeight, ih: window.innerHeight, sw: el.scrollWidth, iw: window.innerWidth };
    });
    expect(scroll.sh).toBeLessThanOrEqual(scroll.ih);
    expect(scroll.sw).toBeLessThanOrEqual(scroll.iw);
    for (const id of ['btn-goal-own', 'btn-goal-opp']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(64);
      expect(box?.height).toBeGreaterThanOrEqual(64);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(667);
    }
  });
});

test.describe('FR-040 Kopfzeile mit unterscheidbaren Namen', () => {
  const lineCount = (el: HTMLElement): number =>
    Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));

  test('FR-040 eigene Mannschaft in Kurzform', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await startGame(page, { ownTeam: 'Sportvg Feuerbach U11' });
    await expect(page.getByTestId('team-home')).toHaveText('Feuerbach U11');
    await expect(page.getByTestId('team-away')).toHaveText('TSV Musterstadt');
    expect(await page.getByTestId('team-home').evaluate(lineCount)).toBe(1);
  });

  test('FR-040 FR-033 lange Namen brechen auf höchstens zwei Zeilen um', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await startGame(page, {
      ownTeam: 'Sportvg Feuerbach U15-Juniorinnen',
      opponent: 'SGM SV Prag Stuttgart/TSV Weilimdorf',
      away: true,
    });
    const home = page.getByTestId('team-home');
    const away = page.getByTestId('team-away');
    await expect(home).toHaveText('SGM SV Prag Stuttgart/TSV Weilimdorf');
    await expect(away).toHaveText('Feuerbach U15-Juniorinnen');
    expect(await home.evaluate(lineCount)).toBe(2);
    expect(await away.evaluate(lineCount)).toBe(2);
    // "U15-Juniorinnen" bleibt vollständig sichtbar (nicht abgeschnitten)
    expect(await away.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    const scroll = await page.evaluate(() => {
      const el = document.scrollingElement as HTMLElement;
      return { sh: el.scrollHeight, ih: window.innerHeight, sw: el.scrollWidth, iw: window.innerWidth };
    });
    expect(scroll.sh).toBeLessThanOrEqual(scroll.ih);
    expect(scroll.sw).toBeLessThanOrEqual(scroll.iw);
  });
});
