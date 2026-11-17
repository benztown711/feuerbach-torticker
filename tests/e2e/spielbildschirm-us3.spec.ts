import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { MIN, SEC, acceptDraw, confirmYes, forward, newGame } from './helpers';

/** Spec 019 US3: Große Knöpfe, ruhige Torliste. */

type Box = { x: number; y: number; width: number; height: number };

async function box(l: Locator): Promise<Box> {
  const b = await l.boundingBox();
  expect(b).not.toBeNull();
  return b as Box;
}

/** Alle Knöpfe in der Zeile unter der Uhr mindestens 64 × 64. */
async function expectControlsBig(page: Page, expected: number): Promise<void> {
  const buttons = page.locator('.controls button');
  await expect(buttons).toHaveCount(expected);
  for (let i = 0; i < expected; i++) {
    const b = await box(buttons.nth(i));
    expect(b.width).toBeGreaterThanOrEqual(64);
    expect(b.height).toBeGreaterThanOrEqual(64);
  }
}

async function enable(page: Page, ...keys: ('cards' | 'subs' | 'marks')[]): Promise<void> {
  await page.goto('./#/einstellungen');
  for (const k of keys) {
    await page.getByTestId(`feature-${k}`).click();
    await expect(page.getByTestId(`feature-${k}`)).toHaveAttribute('aria-checked', 'true');
  }
}

async function goals(page: Page, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await page.getByTestId(i % 2 ? 'btn-goal-opp' : 'btn-goal-own').click();
    await forward(page, 2 * SEC);
  }
  await forward(page, 11 * SEC);
}

const noPageScroll = async (page: Page): Promise<void> => {
  const s = await page.evaluate(() => {
    const el = document.scrollingElement as HTMLElement;
    return { sh: el.scrollHeight, ih: window.innerHeight, sw: el.scrollWidth, iw: window.innerWidth };
  });
  expect(s.sh).toBeLessThanOrEqual(s.ih);
  expect(s.sw).toBeLessThanOrEqual(s.iw);
};

test.describe('019 US3 Große Knöpfe, ruhige Torliste', () => {
  test('019 US3-S1 Knöpfe unter der Uhr in jedem Zustand mindestens 64 × 64', async ({ page }) => {
    await newGame(page, { sections: 2, minutes: 10 });
    await expectControlsBig(page, 1); // Anpfiff
    await page.getByTestId('btn-kickoff').click();
    await expectControlsBig(page, 2); // Uhr anhalten, Pausenpfiff
    await page.getByTestId('btn-pause').click();
    await confirmYes(page);
    await expect(page.getByTestId('btn-resume')).toBeVisible();
    await expectControlsBig(page, 2); // Uhr fortsetzen, Pausenpfiff
    await page.getByTestId('btn-resume').click();
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await expect(page.getByTestId('btn-kickoff')).toHaveText('Anpfiff 2. Halbzeit');
    await expectControlsBig(page, 1);
    await page.getByTestId('btn-kickoff').click();
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await acceptDraw(page);
    await expect(page.getByTestId('btn-share')).toBeVisible();
    await expectControlsBig(page, 2); // Spieldetails, Ergebnis teilen
  });

  test('019 US3-S2 Torzeilen mindestens 48 hoch und antippbar', async ({ page }) => {
    await newGame(page);
    await page.getByTestId('btn-kickoff').click();
    await goals(page, 2);
    const rows = page.locator('[data-testid^="goal-row-"]');
    await expect(rows).toHaveCount(2);
    for (let i = 0; i < 2; i++) expect((await box(rows.nth(i))).height).toBeGreaterThanOrEqual(48);
    await rows.first().click();
    await expect(page.getByTestId('goal-actions')).toBeVisible();
  });

  test('019 US3-S3 kein Griff; Uhr-Knöpfe und Ereignis-Zeile sichtbar; viele Tore scrollen in der Liste', async ({
    page,
  }) => {
    await enable(page, 'marks');
    await newGame(page);
    await page.getByTestId('btn-kickoff').click();
    await forward(page, MIN);
    await goals(page, 9);
    await expect(page.getByTestId('list-grip')).toHaveCount(0);
    await expect(page.getByTestId('btn-pause')).toBeVisible();
    await expect(page.getByTestId('event-row')).toBeVisible();
    const list = page.getByTestId('goal-list');
    expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await noPageScroll(page);
  });

  test('019 US3-S4 iPhone SE mit allen drei Ereignis-Schaltern: kein Seiten-Scroll, zwei Torzeilen ganz sichtbar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await enable(page, 'cards', 'subs', 'marks');
    await newGame(page);
    await page.getByTestId('btn-kickoff').click();
    await forward(page, MIN);
    await goals(page, 3);
    await expect(page.locator('.band')).toHaveCount(0);
    await noPageScroll(page);
    const list = await box(page.getByTestId('goal-list'));
    const rows = page.locator('[data-testid^="goal-row-"]');
    for (let i = 0; i < 2; i++) {
      const r = await box(rows.nth(i));
      expect(r.y).toBeGreaterThanOrEqual(list.y - 1);
      expect(r.y + r.height).toBeLessThanOrEqual(list.y + list.height + 1);
    }
    const goal = await box(page.getByTestId('btn-goal-own'));
    expect(goal.height).toBeGreaterThanOrEqual(150);
    expect(goal.y + goal.height).toBeLessThanOrEqual(667);
  });

  test('019 US3-S5 größeres iPhone: Tor-Knöpfe etwa ein Drittel der Höhe, mindestens 150, Abstand 12', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await newGame(page);
    await page.getByTestId('btn-kickoff').click();
    const zone = await box(page.locator('.goal-zone'));
    expect(zone.height).toBeGreaterThanOrEqual(852 * 0.3);
    expect(zone.height).toBeLessThanOrEqual(852 / 3 + 1);
    const own = await box(page.getByTestId('btn-goal-own'));
    const opp = await box(page.getByTestId('btn-goal-opp'));
    expect(own.height).toBeGreaterThanOrEqual(150);
    expect(Math.round(opp.x - (own.x + own.width))).toBe(12);
  });
});
