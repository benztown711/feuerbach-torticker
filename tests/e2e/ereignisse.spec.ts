import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { MIN, SEC, confirmYes, forward, newGame, startGame } from './helpers';

async function enableMarks(page: Page): Promise<void> {
  await page.goto('./#/einstellungen');
  const sw = page.getByTestId('feature-marks');
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
}

async function setMark(page: Page): Promise<void> {
  await page.getByTestId('btn-event').click();
  await expect(page.getByTestId('event-sheet')).toBeVisible();
  await page.getByTestId('event-mark').click();
  await expect(page.getByTestId('event-sheet')).toBeHidden();
}

test.describe('Spec 003 Teil 1: Lesezeichen und Elfmeter', () => {
  test('003 US2-S1 FR-E02 FR-E09 ohne Schalter kein Knopf "Ereignis"; mit Schalter erst ab Anpfiff', async ({
    page,
  }) => {
    await startGame(page);
    await expect(page.getByTestId('btn-event')).toHaveCount(0);
    await enableMarks(page);
    await newGame(page, { opponent: 'FC Erster' });
    await expect(page.getByTestId('btn-event')).toHaveCount(0);
    await page.getByTestId('btn-kickoff').click();
    await expect(page.getByTestId('btn-event')).toBeVisible();
  });

  test('003 US2-S2 US2-S3 Lesezeichen mit zwei Taps, Kommentar per Schnellwahl, "nur für dich" in der Liste', async ({
    page,
  }) => {
    await enableMarks(page);
    await startGame(page);
    await forward(page, 6 * MIN + 12 * SEC);
    await setMark(page);
    await expect(page.getByTestId('mark-toast')).toContainText("Lesezeichen 7' gesetzt");
    await page.getByTestId('mark-comment').click();
    await page.getByTestId('mark-quick-Torchance').click();
    await expect(page.getByTestId('input-mark-comment')).toHaveValue('Torchance');
    await page.getByTestId('btn-save-mark').click();
    const row = page.locator('[data-testid^="mark-row-"]');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("7'");
    await expect(row).toContainText('Torchance');
    await expect(row).toContainText('nur für dich');
  });

  test('003 FR-E05 Rückgängig direkt nach dem Setzen; US2-S6 Kommentar ändern und löschen', async ({ page }) => {
    await enableMarks(page);
    await startGame(page);
    await forward(page, 2 * MIN);
    await setMark(page);
    await page.getByTestId('mark-undo').click();
    await expect(page.locator('[data-testid^="mark-row-"]')).toHaveCount(0);
    await setMark(page);
    await forward(page, 11 * SEC);
    await expect(page.getByTestId('mark-toast')).toBeHidden();
    await page.locator('[data-testid^="mark-row-"]').click();
    await page.getByTestId('mark-edit').click();
    await page.getByTestId('input-mark-comment').fill('Konter links');
    await page.getByTestId('btn-save-mark').click();
    await expect(page.locator('[data-testid^="mark-row-"]')).toContainText('Konter links');
    await page.locator('[data-testid^="mark-row-"]').click();
    await page.getByTestId('mark-delete').click();
    await expect(page.locator('[data-testid^="mark-row-"]')).toHaveCount(0);
  });

  test('003 US2-S4 US2-S5 FR-E08 Lesezeichen nie im Teilen-Text, aber in den Spieldetails zum Kopieren', async ({
    page,
    recorded,
  }) => {
    await enableMarks(page);
    await startGame(page, { sections: 1, minutes: 12 });
    await forward(page, 3 * MIN);
    await page.getByTestId('btn-goal-own').click();
    await forward(page, 2 * MIN);
    await setMark(page);
    await page.getByTestId('mark-comment').click();
    await page.getByTestId('mark-quick-Ansehen').click();
    await page.getByTestId('btn-save-mark').click();
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await page.getByTestId('btn-share').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(1);
    const shared = (await recorded()).shares[0]?.text ?? '';
    expect(shared).not.toContain('Lesezeichen');
    expect(shared).not.toContain('Ansehen');
    await page.getByTestId('btn-menu').click();
    await page.getByTestId('menu-details').click();
    await expect(page.getByTestId('details-timeline')).toContainText('Ansehen');
    await expect(page.getByTestId('marks-preview')).toContainText(/6' · \d\d:\d\d:\d\d · Ansehen/);
    await page.getByTestId('btn-copy-marks').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(2);
    expect((await recorded()).shares[1]?.text).toMatch(/^Lesezeichen Feuerbach - TSV Musterstadt, /);
  });

  test('003 US1-S1 US1-S3 005 US1-S6 FR-E01 Tor als Elfmeter kennzeichnen und wieder abwählen', async ({
    page,
    recorded,
  }) => {
    await startGame(page, { sections: 1, minutes: 12 });
    await forward(page, 4 * MIN);
    await page.getByTestId('btn-goal-opp').click();
    await forward(page, 11 * SEC);
    const goalRow = page.locator('[data-testid^="goal-row-"]');
    await goalRow.click();
    await page.getByTestId('goal-penalty').click();
    await expect(page.getByTestId('goal-penalty')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('goal-actions').getByRole('button', { name: 'Schließen' }).click();
    await expect(goalRow).toContainText('TSV Musterstadt (Elfmeter)');
    await goalRow.click();
    await page.getByTestId('goal-penalty').click();
    await page.getByTestId('goal-actions').getByRole('button', { name: 'Schließen' }).click();
    await expect(goalRow).not.toContainText('Elfmeter');
    await goalRow.click();
    await page.getByTestId('goal-penalty').click();
    await page.getByTestId('goal-actions').getByRole('button', { name: 'Schließen' }).click();
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await page.getByTestId('btn-share').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(1);
    expect(((await recorded()).shares[0]?.text ?? '').split('\n')).toContain("⚫ 5'  0:1  (Elfmeter)");
  });

  test('003 SC-E03 FR-033 mit Knopf "Ereignis" passt der Spielbildschirm weiter auf das iPhone SE', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await enableMarks(page);
    await startGame(page);
    await expect(page.getByTestId('btn-event')).toBeVisible();
    const scroll = await page.evaluate(() => {
      const el = document.scrollingElement as HTMLElement;
      return { sh: el.scrollHeight, ih: window.innerHeight, sw: el.scrollWidth, iw: window.innerWidth };
    });
    expect(scroll.sh).toBeLessThanOrEqual(scroll.ih);
    expect(scroll.sw).toBeLessThanOrEqual(scroll.iw);
    for (const id of ['btn-goal-own', 'btn-goal-opp']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(64);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(667);
    }
  });
});
