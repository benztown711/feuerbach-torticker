import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { MIN, SEC, confirmYes, forward, readStored, seedRoster, startGame } from './helpers';

/** 1 × 12 Minuten, 1:1, Schlusspfiff; die Abfrage bei Unentschieden ist offen. */
async function drawnGame(page: Page): Promise<void> {
  await startGame(page, { sections: 1, minutes: 12 });
  await forward(page, 2 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await forward(page, 2 * MIN);
  await page.getByTestId('btn-goal-opp').click();
  await forward(page, 11 * SEC);
  await page.getByTestId('btn-section-end').click();
  await confirmYes(page);
  await expect(page.getByTestId('draw-dialog')).toBeVisible();
}

test.describe('Spec 003 Teil 3: Pokal', () => {
  test('003 US5-S1 bei einem Sieger keine Abfrage', async ({ page }) => {
    await startGame(page, { sections: 1, minutes: 12 });
    await forward(page, 2 * MIN);
    await page.getByTestId('btn-goal-own').click();
    await forward(page, 11 * SEC);
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');
    await expect(page.getByTestId('draw-dialog')).toHaveCount(0);
  });

  test('003 US5-S2 FR-P01 Abfrage bei Unentschieden; "Unentschieden" beendet das Spiel wie bisher', async ({
    page,
  }) => {
    await drawnGame(page);
    await expect(page.getByTestId('draw-dialog')).toContainText('Unentschieden 1:1');
    await expect(page.getByTestId('draw-extra')).toBeVisible();
    await expect(page.getByTestId('draw-shootout')).toBeVisible();
    await page.getByTestId('draw-accept').click();
    await expect(page.getByTestId('draw-dialog')).toHaveCount(0);
    const id = new URL(page.url()).hash.replace('#/spiel/', '');
    await expect
      .poll(async () => (await readStored<{ drawSettled?: boolean }>(page, 'games', id))?.drawSettled)
      .toBe(true);
    await page.reload();
    await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');
    await expect(page.getByTestId('draw-dialog')).toHaveCount(0);
    await expect(page.getByTestId('btn-share')).toBeVisible();
  });

  test('003 US5-S3 US5-S4 US5-S5 005 US3-S1 FR-P02 Verlängerung 2 × 5: Minute ab 13, "nach Verlängerung" im Text; danach nur noch Elfmeterschießen', async ({
    page,
    recorded,
  }) => {
    await drawnGame(page);
    await page.getByTestId('draw-extra').click();
    await expect(page.getByTestId('extra-sheet')).toContainText("ab 13' weiter");
    await expect(page.getByTestId('extra-min-10')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('extra-min-5').click();
    await page.getByTestId('btn-start-extra').click();
    await expect(page.getByTestId('section-label')).toHaveText('1. Hälfte Verlängerung');
    await forward(page, 2 * MIN);
    await page.getByTestId('btn-goal-opp').click();
    await expect(page.locator('[data-testid^="goal-row-"]').first()).toContainText("15'");
    await forward(page, 3 * MIN + 11 * SEC);
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await expect(page.getByTestId('section-label')).toHaveText('Pause');
    await page.getByTestId('btn-kickoff').click();
    await expect(page.getByTestId('section-label')).toHaveText('2. Hälfte Verlängerung');
    await forward(page, 1 * MIN);
    await page.getByTestId('btn-goal-own').click();
    await forward(page, 4 * MIN + 11 * SEC);
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await expect(page.getByTestId('draw-dialog')).toContainText('Unentschieden 2:2');
    await expect(page.getByTestId('draw-extra')).toHaveCount(0);
    await page.getByTestId('draw-accept').click();
    await page.getByTestId('btn-share').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(1);
    const lines = ((await recorded()).shares[0]?.text ?? '').split('\n');
    expect(lines.slice(0, 2)).toEqual(['*Sportvg Feuerbach 2:2 TSV Musterstadt*', 'nach Verlängerung']);
    expect(lines).toContain('··· Verlängerung ···');
  });

  test('003 US6-S1 bis S5 005 US3-S2 US3-S3 FR-P03 Elfmeterschießen: Schütze antippen, Treffer/Verschossen, Rückgängig, Ergebnis i. E.', async ({
    page,
    recorded,
  }) => {
    await seedRoster(page, ['1 Max', '2 Ben', '3 Tom'].join('\n'));
    await drawnGame(page);
    await page.getByTestId('draw-shootout').click();
    await page.getByTestId('first-own').click();
    await expect(page.getByTestId('section-label')).toHaveText('Elfmeterschießen');
    await expect(page.getByTestId('pen-score')).toHaveText('0 : 0');
    // Feuerbach: Max trifft
    await page.locator('[data-testid^="pen-pick-"]').filter({ hasText: 'Max' }).click();
    await page.getByTestId('pen-hit').click();
    // Gegner: Nr. 7 verschießt
    await page.getByTestId('pen-opp').fill('Nr. 7');
    await page.getByTestId('pen-miss').click();
    // Feuerbach: ohne Namen, Treffer; Rückgängig; dann Ben trifft
    await page.getByTestId('pen-hit').click();
    await page.getByTestId('pen-undo').click();
    await page.locator('[data-testid^="pen-pick-"]').filter({ hasText: 'Ben' }).click();
    await page.getByTestId('pen-hit').click();
    await expect(page.getByTestId('pen-score')).toHaveText('2 : 0');
    // Übersicht: Kreise, Namen erst beim Aufklappen in Schussreihenfolge
    await expect(page.getByTestId('pen-row-own').locator('.pen-slot.is-hit')).toHaveCount(2);
    await expect(page.getByTestId('pen-shooters-own')).toHaveCount(0);
    await page.getByTestId('pen-row-own').click();
    await expect(page.getByTestId('pen-shooters-own')).toHaveText(/Max.*Ben/);
    await page.getByTestId('pen-row-opp').click();
    await expect(page.getByTestId('pen-shooters-opp')).toContainText('Nr. 7');
    // weiter bis entschieden: Gegner verschießt, Feuerbach trifft
    await page.getByTestId('pen-miss').click();
    await expect(page.locator('[data-testid^="pen-pick-"]').filter({ hasText: 'Max' })).toHaveClass(/is-done/);
    await expect(page.locator('[data-testid^="pen-pick-"]').filter({ hasText: 'Tom' })).not.toHaveClass(/is-done/);
    await page.getByTestId('pen-hit').click();
    // 3:0 nach je drei Schüssen: der Gegner kann nicht mehr aufholen
    await page.getByTestId('pen-miss').click();
    await expect(page.getByTestId('pen-decided')).toContainText('Feuerbach gewinnt 3:0');
    await expect(page.getByTestId('pen-hit')).toBeDisabled();
    await page.getByTestId('pen-end').click();
    await confirmYes(page);
    await expect(page.getByTestId('shootout-result')).toHaveText('3:0 i. E.');
    await page.getByTestId('btn-share').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(1);
    const lines = ((await recorded()).shares[0]?.text ?? '').split('\n');
    expect(lines.slice(0, 2)).toEqual([
      '*Sportvg Feuerbach 1:1 TSV Musterstadt*',
      '*Feuerbach gewinnt 3:0 im Elfmeterschießen*',
    ]);
    expect(lines).toContain('🔴 ✅ ✅ ✅  3');
    expect(lines).toContain('⚫ ❌ ❌ ❌  0');
    expect(lines).toContain('Schützen: Max, Ben, ?');
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('history-list')).toContainText('S');
    await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
    await expect(page.getByTestId('details-shootout')).toContainText('Max');
    await expect(page.getByTestId('details-score')).toContainText('i. E. 3:0');
  });

  test('003 FR-033 Elfmeterschießen passt auf das iPhone SE', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await seedRoster(
      page,
      ['1 Max', '2 Ben', '3 Tom', '4 Leo', '5 Paul', '6 Maxi', '7 Finn', '8 Noah', '9 Emil', '10 Luis'].join('\n'),
    );
    await drawnGame(page);
    await page.getByTestId('draw-shootout').click();
    await page.getByTestId('first-opp').click();
    const scroll = await page.evaluate(() => {
      const el = document.scrollingElement as HTMLElement;
      return { sh: el.scrollHeight, ih: window.innerHeight, sw: el.scrollWidth, iw: window.innerWidth };
    });
    expect(scroll.sh).toBeLessThanOrEqual(scroll.ih);
    expect(scroll.sw).toBeLessThanOrEqual(scroll.iw);
    const hit = await page.getByTestId('pen-hit').boundingBox();
    expect((hit?.y ?? 0) + (hit?.height ?? 0)).toBeLessThanOrEqual(667);
    expect(hit?.height).toBeGreaterThanOrEqual(64);
  });
});
