import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { SEC, confirmYes, forward, newGame, playFinishedGame, readStored, seedRoster, startGame } from './helpers';
import { createLive, latestState } from './live-helpers';

/** Spec 023: Spiel läuft schon (Einstieg ins laufende Spiel, Spielstand übernehmen, Uhr korrigieren mit Restzeit). */

test.use({ serviceWorkers: 'block' });

const E1 = 'Sportvg Feuerbach E1';
const rows = (page: Page) => page.locator('[data-testid^="goal-row-"]');
const gameId = (page: Page): string => new URL(page.url()).hash.replace('#/spiel/', '');
const sheet = (page: Page) => page.getByTestId('late-sheet');

async function openLate(page: Page): Promise<void> {
  await page.getByTestId('btn-late').click();
  await expect(sheet(page)).toBeVisible();
}

async function plus(page: Page, side: 'own' | 'opp', n: number): Promise<void> {
  for (let i = 0; i < n; i++) await page.getByTestId(`late-${side}-plus`).click();
}

async function openMenu(page: Page): Promise<void> {
  await page.getByTestId('btn-menu').click();
  await expect(page.getByTestId('game-menu')).toBeVisible();
}

test.describe('023 US1 Ins laufende Spiel einsteigen', () => {
  test('023 US1-S1 bis US1-S4 US1-S6 US1-S9 3. Drittel, noch 7 Min: Uhr läuft ab 7:00; Rückgängig', async ({
    page,
  }) => {
    await newGame(page, { sections: 3, minutes: 15 });
    await expect(page.getByTestId('btn-late')).toHaveText('Spiel läuft schon');
    await openLate(page);
    // US1-S2: Vorgaben erster Abschnitt, volle Restzeit, 0:0.
    await expect(page.getByTestId('late-choice-s1')).toHaveAttribute('aria-pressed', 'true');
    for (const label of ['1. Drittel', '1. Pause', '2. Drittel', '2. Pause', '3. Drittel'])
      await expect(sheet(page).getByRole('button', { name: label, exact: true })).toBeVisible();
    await expect(page.getByTestId('late-rest')).toHaveText('Noch 15 Min');
    await expect(page.getByTestId('late-minute')).toHaveText('= 1. Minute');
    await expect(page.getByTestId('late-rest-p1')).toBeDisabled();
    await expect(page.getByTestId('late-own-count')).toHaveText('0');
    await expect(page.getByTestId('late-own-minus')).toBeDisabled();

    // US1-S4: Restzeit von 0 bis zur Abschnittslänge.
    for (let i = 0; i < 3; i++) await page.getByTestId('late-rest-m5').click();
    await expect(page.getByTestId('late-rest')).toHaveText('Noch 0 Min');
    await expect(page.getByTestId('late-rest-m1')).toBeDisabled();

    await page.getByTestId('late-choice-s3').click();
    await expect(page.getByTestId('late-rest')).toHaveText('Noch 15 Min');
    await expect(page.getByTestId('late-minute')).toHaveText('= 31. Minute');
    await page.getByTestId('late-rest-m5').click();
    for (let i = 0; i < 3; i++) await page.getByTestId('late-rest-m1').click();
    await expect(page.getByTestId('late-rest')).toHaveText('Noch 7 Min');
    await expect(page.getByTestId('late-minute')).toHaveText('= 39. Minute');
    await page.getByTestId('late-save').click();

    // US1-S3
    await expect(sheet(page)).toHaveCount(0);
    await expect(page.getByTestId('section-label')).toHaveText('3. Drittel');
    await expect(page.getByTestId('clock')).toHaveText(/^(7:00|6:5\d)$/);
    await expect(page.getByTestId('btn-section-end')).toHaveText('Schlusspfiff');
    // US1-S9
    await expect(page.getByTestId('btn-late')).toHaveCount(0);

    // US1-S6: Rückgängig stellt das Spiel vor den Anpfiff zurück.
    await expect(page.getByTestId('entry-undo-bar')).toContainText('Eingestiegen: 3. Drittel, noch 7 Min, 0:0');
    await page.getByTestId('entry-undo').click();
    await expect(page.getByTestId('btn-kickoff')).toHaveText('Anpfiff');
    await expect(page.getByTestId('btn-late')).toBeVisible();
    await expect(page.getByTestId('clock')).toHaveText('15:00');
  });

  test('023 US1-S3 US2-S2 Dashboard bekommt Restzeit und Spielstand sofort', async ({ page, recorded, relay }) => {
    const links = await createLive(page, recorded, { teams: ['E1'] });
    await newGame(page, { ownTeam: E1, sections: 3, minutes: 15 });
    await openLate(page);
    await page.getByTestId('late-choice-s3').click();
    await page.getByTestId('late-rest-m5').click();
    for (let i = 0; i < 3; i++) await page.getByTestId('late-rest-m1').click();
    await plus(page, 'own', 7);
    await plus(page, 'opp', 4);
    await page.getByTestId('late-save').click();
    await expect(page.getByTestId('score')).toHaveText('7 : 4');
    await page.clock.runFor(6_000);
    await expect
      .poll(async () => {
        const s = await latestState(relay, links.viewer, gameId(page));
        const clock = (s?.clock as [string, number, number][] | undefined) ?? [];
        const goals = (s?.goals as { pre?: boolean }[] | undefined) ?? [];
        return [clock.length, clock.at(-1)?.[2], goals.length, goals.every((g) => g.pre === true)];
      })
      .toEqual([5, 3, 11, true]);
  });

  test('023 US1-S5 US2-S6 Einstieg in der Halbzeitpause: keine Restzeit, dann "Anpfiff 2. Halbzeit"', async ({
    page,
  }) => {
    await newGame(page, { sections: 2, minutes: 25 });
    await openLate(page);
    await page.getByTestId('late-choice-p1').click();
    await expect(page.getByTestId('late-rest')).toHaveCount(0);
    await expect(page.getByTestId('late-pause-hint')).toContainText('„Anpfiff 2. Halbzeit“');
    await plus(page, 'own', 2);
    await plus(page, 'opp', 1);
    await page.getByTestId('late-save').click();
    await expect(page.getByTestId('section-label')).toHaveText('Halbzeitpause');
    await expect(page.getByTestId('btn-kickoff')).toHaveText('Anpfiff 2. Halbzeit');
    // US2-S6: Halbzeitstand bekannt; R-J5: den Einstiegs-Pfiff nimmt "Rückgängig" zurück, nicht das Menü.
    const stored = await readStored<{ halfTimeScore: unknown }>(page, 'games', gameId(page));
    expect(stored?.halfTimeScore).toEqual({ own: 2, opp: 1 });
    await openMenu(page);
    await expect(page.getByTestId('menu-undo-whistle')).toHaveCount(0);
  });

  test('023 US1-S7 Schalter "Spiel läuft schon" in "Neues Spiel" öffnet gleich das Blatt', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await page.getByTestId('input-opponent').fill('TSV Musterstadt');
    await expect(page.getByTestId('new-late-switch')).toHaveAttribute('aria-checked', 'false');
    await page.getByTestId('new-late-switch').click();
    await page.getByTestId('btn-create').click();
    await expect(sheet(page)).toBeVisible();
    expect(new URL(page.url()).hash).toMatch(/^#\/spiel\/[\w-]+$/);
    await sheet(page).getByRole('button', { name: 'Schließen' }).click();
    await expect(page.getByTestId('btn-kickoff')).toBeVisible();
    // Bei jedem neuen Spiel aus.
    await page.goto('./#/neu');
    await expect(page.getByTestId('new-late-switch')).toHaveAttribute('aria-checked', 'false');
  });

  test('023 US1-S10 "Trikots ändern" im Blatt: Eingaben bleiben, Farben gelten auch nach Rückgängig', async ({
    page,
  }) => {
    await newGame(page, { sections: 2, minutes: 25 });
    await openLate(page);
    await page.getByTestId('late-choice-s2').click();
    await plus(page, 'own', 1);
    await page.getByTestId('late-kits').click();
    await expect(page.getByTestId('kits-sheet')).toBeVisible();
    await page.getByTestId('kit-opp-change').click();
    await page.getByTestId('color-opp-blau').click();
    await page.getByTestId('kits-save').click();
    await expect(sheet(page)).toBeVisible();
    await expect(page.getByTestId('late-choice-s2')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('late-own-count')).toHaveText('1');
    await page.getByTestId('late-save').click();
    await expect(page.getByTestId('section-label')).toHaveText('2. Halbzeit');
    await page.getByTestId('entry-undo').click();
    await expect(page.getByTestId('btn-late')).toBeVisible();
    const stored = await readStored<{ oppColor: string; goals: unknown[] }>(page, 'games', gameId(page));
    expect(stored?.oppColor).toBe('blau');
    expect(stored?.goals).toEqual([]);
  });
});

test('023 FR-J05 "Rückgängig" gilt nur für den Einstieg: ein Tor danach beendet es', async ({ page }) => {
  await newGame(page);
  await openLate(page);
  await page.getByTestId('late-choice-s2').click();
  await page.getByTestId('late-save').click();
  await expect(page.getByTestId('entry-undo-bar')).toBeVisible();
  await page.getByTestId('btn-goal-opp').click();
  await expect(page.getByTestId('undo-bar')).toBeVisible();
  await page.getByTestId('btn-undo').click();
  // Das Tor ist zurückgenommen, der Einstieg bleibt; seine Leiste kommt nicht wieder.
  await expect(page.getByTestId('entry-undo-bar')).toHaveCount(0);
  await expect(page.getByTestId('section-label')).toHaveText('2. Halbzeit');
});

test('023 US1-S8 auch beim Spiel über "Nächstes Spiel"', async ({ page }) => {
  await playFinishedGame(page, ['own']);
  await page.getByTestId('btn-next-game').click();
  await page.getByTestId('input-opponent').fill('SV Beispielhausen');
  await page.getByTestId('btn-create').click();
  await openLate(page);
  await page.getByTestId('late-save').click();
  await expect(page.getByTestId('btn-pause')).toBeVisible();
});

test.describe('023 US2 Bisherigen Spielstand übernehmen', () => {
  test('023 US2-S1 bis US2-S5 3:2 übernehmen, Torschützen und Minute nachtragen', async ({ page }) => {
    await seedRoster(page, '7 Max\n9 Ben');
    await newGame(page, { sections: 2, minutes: 25 });
    await openLate(page);
    await page.getByTestId('late-choice-s2').click();
    for (let i = 0; i < 3; i++) await page.getByTestId('late-rest-m5').click();
    await plus(page, 'own', 3);
    await plus(page, 'opp', 2);
    await expect(page.getByTestId('late-own-count')).toHaveText('3');
    await page.getByTestId('late-save').click();

    // US2-S2 S3 S8: Stand sofort; die Tore vor Tickerbeginn stehen als eine Zeile unten in der Liste (FR-J16).
    await expect(page.getByTestId('score')).toHaveText('3 : 2');
    const pre = page.getByTestId('goal-pre-row');
    await expect(rows(page)).toHaveCount(0);
    await expect(pre).toContainText('–');
    await expect(pre).toContainText('3:2');
    await expect(pre).toContainText('Vor Tickerbeginn · 5 Tore');
    await expect(pre).toHaveAttribute('aria-expanded', 'false');

    // US2-S8: Antippen klappt die einzelnen Tore auf (neuestes oben, zuerst Feuerbach), nochmal antippen zu.
    await forward(page, 11 * SEC);
    await pre.click();
    await expect(pre).toHaveAttribute('aria-expanded', 'true');
    await expect(rows(page)).toHaveCount(5);
    await expect(rows(page).last()).toContainText('1:0');
    await expect(rows(page).first()).toContainText('3:2');
    await pre.click();
    await expect(rows(page)).toHaveCount(0);
    await pre.click();

    // US2-S4: Torschütze nachtragen.
    await rows(page).last().click();
    await expect(page.getByTestId('goal-actions')).toContainText('Vor Tickerbeginn');
    await page.getByTestId('goal-edit-scorer').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true }).click();
    await expect(rows(page).last()).toContainText('Max');

    // US2-S5: Minute nachtragen macht ein normales Tor daraus; die Zeile zählt nur noch vier.
    await rows(page).first().click();
    await page.getByTestId('goal-edit-minute').click();
    await page.getByTestId('goal-minute-select').selectOption("12'");
    await page.getByTestId('goal-minute-save').click();
    await expect(page.getByText("12'", { exact: true })).toBeVisible();
    await expect(pre).toContainText('Vor Tickerbeginn · 4 Tore');

    // FR-J16: Spieldetails und Teilen-Text fassen ebenfalls zusammen; aufklappen zeigt Max.
    await openMenu(page);
    await page.getByTestId('menu-details').click();
    await expect(page.getByTestId('share-preview')).toContainText('vor Tickerbeginn');
    const detailsPre = page.getByTestId('details-pre-row');
    await expect(detailsPre).toContainText('Vor Tickerbeginn · 4 Tore');
    await expect(page.getByTestId('details-pre')).not.toContainText('Max');
    await detailsPre.click();
    await expect(detailsPre).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('details-pre')).toContainText('Max');
  });

  test('023 US2-S7 Spielstand 0:0 legt keine Tore an', async ({ page }) => {
    await newGame(page);
    await openLate(page);
    await page.getByTestId('late-save').click();
    await expect(page.getByTestId('score')).toHaveText('0 : 0');
    await expect(rows(page)).toHaveCount(0);
    await expect(page.getByTestId('goal-pre-row')).toHaveCount(0);
  });
});

test.describe('023 US3 Uhr korrigieren mit Restzeit', () => {
  test('023 US3-S1 US3-S3 wie am 22.11.: Abschnitt kurz nach dem Pausenpfiff angepfiffen, Uhr auf 7 Min', async ({
    page,
  }) => {
    await startGame(page, { sections: 2, minutes: 25 });
    await forward(page, 20 * SEC);
    await page.getByTestId('btn-goal-own').click();
    await forward(page, 40 * SEC);
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await forward(page, 20 * SEC);
    await page.getByTestId('btn-kickoff').click();
    await forward(page, 48 * SEC);
    await expect(page.getByTestId('clock')).toHaveText(/^24:1\d$/);

    // US3-S1: der Eintrag ist da, obwohl der Pausenpfiff gerade erst war.
    await openMenu(page);
    await page.getByTestId('menu-fix-clock').click();
    await expect(page.getByTestId('clock-fix-sheet')).toContainText('Die Uhr zeigt 24:1');
    await expect(page.getByTestId('clock-fix-rest')).toHaveText('Noch 24 Min');
    for (let i = 0; i < 3; i++) await page.getByTestId('clock-fix-m5').click();
    for (let i = 0; i < 2; i++) await page.getByTestId('clock-fix-m1').click();
    await expect(page.getByTestId('clock-fix-rest')).toHaveText('Noch 7 Min');
    await expect(page.getByTestId('clock-fix-minute')).toHaveText('= 44. Minute');
    await page.getByTestId('clock-fix-save').click();

    // US3-S3: Uhr stimmt; das Tor der 1. Halbzeit behält seine Minute.
    await expect(page.getByTestId('clock')).toHaveText(/^(7:00|6:5\d)$/);
    await expect(rows(page).first()).toContainText("1'");
    await expect(page.getByTestId('section-label')).toHaveText('2. Halbzeit');
  });
});
