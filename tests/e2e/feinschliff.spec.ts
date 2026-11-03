import { test, expect } from './fixtures';
import { confirmYes, newGame, startGame } from './helpers';

/** T088: Anforderungen ohne eigenen Test (Abgleich spec.md ↔ Tests). */
test.describe('Abdeckung FR-003, FR-013, FR-019', () => {
  test('FR-003 zwei große Tor-Knöpfe: Heim links, Gast rechts, mit Mannschaftsnamen', async ({ page }) => {
    await newGame(page, { opponent: 'TSV Musterstadt', away: true });
    const own = await page.getByTestId('btn-goal-own').boundingBox();
    const opp = await page.getByTestId('btn-goal-opp').boundingBox();
    expect(opp!.x).toBeLessThan(own!.x); // auswärts: Gegner ist Heim und steht links
    await expect(page.getByTestId('btn-goal-opp')).toContainText('TSV Musterstadt');
    await expect(page.getByTestId('btn-goal-own')).toContainText('Feuerbach');
    expect(own!.width).toBeGreaterThanOrEqual(64);
    expect(own!.height).toBeGreaterThanOrEqual(64);
  });

  test('FR-013 Bildschirm wach halten: Anforderung beim Anpfiff, Freigabe nach dem Schlusspfiff', async ({ page }) => {
    await page.addInitScript(() => {
      const log: string[] = [];
      (window as unknown as { __wake: string[] }).__wake = log;
      Object.defineProperty(navigator, 'wakeLock', {
        configurable: true,
        value: {
          request: async () => {
            log.push('request');
            const s = new EventTarget() as EventTarget & { release: () => Promise<void> };
            s.release = async () => {
              log.push('release');
            };
            return s;
          },
        },
      });
    });
    const wake = () => page.evaluate(() => (window as unknown as { __wake: string[] }).__wake);
    await startGame(page, { sections: 1, minutes: 12 });
    await expect.poll(wake).toContain('request');
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await expect.poll(wake).toContain('release');
  });

  test('FR-019 Wappen unverzerrt (Seitenverhältnis 0,84) und mindestens 24 px hoch', async ({ page }) => {
    await newGame(page);
    const box = await page.locator('img.game__wappen').boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(24);
    expect(box!.width / box!.height).toBeGreaterThan(0.8);
    expect(box!.width / box!.height).toBeLessThan(0.88);
  });
});
