import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { MIN, SEC, confirmYes, forward, newGame, startGame } from './helpers';

/** Spec 019 US2: Spielstand auf einen Blick (Anzeigetafel-Zeile). */

type Box = { x: number; y: number; width: number; height: number };

async function box(l: Locator): Promise<Box> {
  const b = await l.boundingBox();
  expect(b).not.toBeNull();
  return b as Box;
}

const css = (l: Locator, prop: string): Promise<string> =>
  l.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

const lineCount = (l: Locator): Promise<number> =>
  l.evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));

/** Namen und Spielstand in einer Zeile: die senkrechte Mitte jedes Namens liegt im Bereich des Spielstands. */
async function expectOneRow(page: Page): Promise<void> {
  const score = await box(page.getByTestId('score'));
  for (const id of ['team-home', 'team-away']) {
    const n = await box(page.getByTestId(id));
    const mid = n.y + n.height / 2;
    expect(mid).toBeGreaterThanOrEqual(score.y);
    expect(mid).toBeLessThanOrEqual(score.y + score.height);
  }
  const home = await box(page.getByTestId('team-home'));
  const away = await box(page.getByTestId('team-away'));
  expect(home.x + home.width).toBeLessThanOrEqual(score.x + 1);
  expect(away.x).toBeGreaterThanOrEqual(score.x + score.width - 1);
}

async function goals(page: Page, side: 'own' | 'opp', n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await page.getByTestId(side === 'own' ? 'btn-goal-own' : 'btn-goal-opp').click();
    await forward(page, 2 * SEC);
  }
}

test.describe('019 US2 Spielstand auf einen Blick', () => {
  test('019 US2-S1 Namen, Farbmarken und Spielstand in einer Zeile, Spielstand 64 px in der Display-Schrift', async ({
    page,
  }) => {
    await startGame(page);
    await goals(page, 'own', 2);
    await goals(page, 'opp', 1);
    await expect(page.getByTestId('score')).toHaveText('2 : 1');
    await expectOneRow(page);
    const score = page.getByTestId('score');
    expect(await css(score, 'font-size')).toBe('64px');
    expect(await css(score, 'font-family')).toContain('Fira Sans Extra Condensed');
    await expect(page.locator('.scoreboard .team__mark')).toHaveCount(2);
  });

  test('019 US2-S2 Uhr darunter in derselben Schrift, kleiner als der Spielstand', async ({ page }) => {
    await startGame(page);
    const score = page.getByTestId('score');
    const clock = page.getByTestId('clock');
    const s = await box(score);
    const c = await box(clock);
    expect(c.y).toBeGreaterThanOrEqual(s.y + s.height - 1);
    expect(await css(clock, 'font-family')).toBe(await css(score, 'font-family'));
    expect(parseFloat(await css(clock, 'font-size'))).toBeLessThan(parseFloat(await css(score, 'font-size')));
    await expect(page.getByTestId('clock-caption')).toHaveText('Restzeit');
  });

  test('019 US2-S3 langer Gegnername höchstens zwei Zeilen, Spielstand ungekürzt', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await startGame(page, { opponent: 'Sportfreunde Musterstadt-Nord' });
    expect(await lineCount(page.getByTestId('team-away'))).toBeLessThanOrEqual(2);
    const score = page.getByTestId('score');
    await expect(score).toHaveText('0 : 0');
    expect(await lineCount(score)).toBe(1);
    expect(await score.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expectOneRow(page);
  });

  test('019 US2-S4 vor dem Anpfiff Doppelpfeil unter dem Spielstand; tauscht; nach dem Anpfiff weg', async ({
    page,
  }) => {
    await newGame(page);
    const swap = page.getByTestId('btn-swap-venue');
    const s = await box(page.getByTestId('score'));
    const w = await box(swap);
    expect(w.width).toBeGreaterThanOrEqual(44);
    expect(w.height).toBeGreaterThanOrEqual(44);
    expect(w.y).toBeGreaterThanOrEqual(s.y + s.height - 1);
    expect(Math.abs(w.x + w.width / 2 - (s.x + s.width / 2))).toBeLessThanOrEqual(2);
    await swap.click();
    await expect(page.getByTestId('team-home')).toHaveText('TSV Musterstadt');
    await page.getByTestId('btn-kickoff').click();
    await expect(page.getByTestId('btn-swap-venue')).toHaveCount(0);
  });

  test('019 US2-S5 10:9 passt auf dem iPhone SE in eine Zeile neben beide Namen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await startGame(page);
    await goals(page, 'own', 10);
    await goals(page, 'opp', 9);
    await forward(page, 11 * SEC);
    const score = page.getByTestId('score');
    await expect(score).toHaveText('10 : 9');
    expect(await lineCount(score)).toBe(1);
    await expectOneRow(page);
    const sw = await page.evaluate(() => (document.scrollingElement as HTMLElement).scrollWidth);
    expect(sw).toBeLessThanOrEqual(375);
  });

  test('019 US2-S7 langer Gegnername rechts: zwei Zeilen und sichtbares "…"', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 659 });
    await startGame(page, { opponent: 'SpVgg Musterstadt-Großdorf II' });
    expect(await lineCount(page.getByTestId('team-away'))).toBe(2);
    await expectOneRow(page);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page.locator('.scoreboard')).toHaveScreenshot('anzeigetafel-langer-name.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('019 US2-S6 Elfmeterschießen: Anzeigetafel mit dem Stand nach regulärer Spielzeit bleibt oben', async ({
    page,
  }) => {
    await startGame(page, { sections: 1, minutes: 12 });
    await forward(page, 2 * MIN);
    await page.getByTestId('btn-goal-own').click();
    await forward(page, 2 * MIN);
    await page.getByTestId('btn-goal-opp').click();
    await forward(page, 11 * SEC);
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await page.getByTestId('draw-shootout').click();
    await page.getByTestId('first-own').click();
    await expect(page.getByTestId('section-label')).toHaveText('Elfmeterschießen');
    await expect(page.getByTestId('score')).toHaveText('1 : 1');
    await expectOneRow(page);
    const s = await box(page.getByTestId('score'));
    const pen = await box(page.getByTestId('pen-score'));
    expect(s.y + s.height).toBeLessThanOrEqual(pen.y);
  });
});
