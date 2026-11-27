import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { MIN, SEC, confirmYes, forward, newGame, seedRoster, startGame } from './helpers';

/** Spec 025 US2: Töne auf dem tickernden Handy. `recorded()` zählt hörbar gestartete Töne, `lastSound` nennt den letzten. */

async function setSound(page: Page, event: string, id: string): Promise<void> {
  await page.goto('./#/einstellungen');
  await page.getByTestId(`sound-event-${event}`).click();
  await page.getByTestId(`sound-option-${id}`).click();
  await page.getByTestId('sound-sheet').getByRole('button', { name: 'Schließen' }).click();
}

test.describe('Spec 025 US2 Töne beim Tickern', () => {
  test('025 US2-S1 US2-S4 FR-T05 Anpfiff, Pausenpfiff, Anpfiff 2. Halbzeit und Schlusspfiff mit ihrem Ton', async ({
    page,
    recorded,
  }) => {
    await newGame(page);
    expect((await recorded()).sounds).toBe(0);
    await page.getByTestId('btn-kickoff').click();
    expect(await recorded()).toMatchObject({ sounds: 1, lastSound: 'langer-pfiff' });

    await forward(page, 5 * MIN);
    // Abbrechen der Rückfrage: kein Ton
    await page.getByTestId('btn-section-end').click();
    await page.getByTestId('confirm-no').click();
    expect((await recorded()).sounds).toBe(1);
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    expect(await recorded()).toMatchObject({ sounds: 2, lastSound: 'doppelpfiff' });

    await page.getByTestId('btn-kickoff').click();
    expect(await recorded()).toMatchObject({ sounds: 3, lastSound: 'langer-pfiff' });
    await forward(page, 5 * MIN);
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    expect(await recorded()).toMatchObject({ sounds: 4, lastSound: 'pfiff' });
  });

  test('025 US2-S2 US2-S3 US2-S5 Tor für uns und Gegentor sofort beim Tippen; Rückgängig ohne Ton', async ({
    page,
    recorded,
  }) => {
    await seedRoster(page, ['1 Max', '2 Ben'].join('\n'));
    await startGame(page);
    const base = (await recorded()).sounds;
    await page.getByTestId('btn-goal-own').click();
    // vor der Torschützen-Auswahl
    expect(await recorded()).toMatchObject({ sounds: base + 1, lastSound: 'torhupe' });
    await expect(page.getByTestId('btn-undo')).toBeVisible();
    await page.getByTestId('btn-undo').click();
    expect((await recorded()).sounds).toBe(base + 1);

    await forward(page, 10 * SEC);
    await page.getByTestId('btn-goal-opp').click();
    expect(await recorded()).toMatchObject({ sounds: base + 2, lastSound: 'raunen' });
  });

  test('025 US1-S4 FR-T03 gewählter Ton bzw. "Aus" gilt beim Tickern', async ({ page, recorded }) => {
    await setSound(page, 'goalOwn', 'kinderjubel');
    await setSound(page, 'kickoff', 'aus');
    await newGame(page);
    const base = (await recorded()).sounds;
    await page.getByTestId('btn-kickoff').click();
    await expect(page.getByTestId('btn-pause')).toBeVisible();
    expect((await recorded()).sounds).toBe(base);
    await page.getByTestId('btn-goal-own').click();
    expect(await recorded()).toMatchObject({ sounds: base + 1, lastSound: 'kinderjubel' });
  });

  test('025 US2-S1 "Spiel läuft schon" ist kein Anpfiff: kein Ton', async ({ page, recorded }) => {
    await newGame(page);
    await page.getByTestId('btn-late').click();
    await page.getByTestId('late-save').click();
    await expect(page.getByTestId('late-sheet')).toHaveCount(0);
    expect((await recorded()).sounds).toBe(0);
  });

  test('025 US2-S6 Elfmeterschießen: Treffer mit Tor-Ton, Verschossen ohne Ton', async ({ page, recorded }) => {
    await startGame(page, { sections: 1, minutes: 12 });
    await forward(page, 12 * MIN + 11 * SEC);
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await page.getByTestId('draw-shootout').click();
    await page.getByTestId('first-own').click();
    await expect(page.getByTestId('section-label')).toHaveText('Elfmeterschießen');
    const base = (await recorded()).sounds;
    await page.getByTestId('pen-hit').click();
    expect(await recorded()).toMatchObject({ sounds: base + 1, lastSound: 'torhupe' });
    await page.getByTestId('pen-hit').click();
    expect(await recorded()).toMatchObject({ sounds: base + 2, lastSound: 'raunen' });
    await page.getByTestId('pen-miss').click();
    expect((await recorded()).sounds).toBe(base + 2);
  });
  test('025 US2-S5 FR-T05 "Tor nachtragen" im laufenden Spiel spielt keinen Ton', async ({ page, recorded }) => {
    await startGame(page);
    await forward(page, 3 * MIN);
    const base = (await recorded()).sounds;
    await page.getByTestId('btn-menu').click();
    await page.getByTestId('menu-add-goal').click();
    await page.getByTestId('add-goal-side-own').click();
    await page.getByTestId('add-goal-save').click();
    await expect(page.getByTestId('add-goal-sheet')).toHaveCount(0);
    await expect(page.getByTestId('score')).toContainText('1');
    expect((await recorded()).sounds).toBe(base);
  });
});
