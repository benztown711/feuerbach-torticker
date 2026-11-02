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
