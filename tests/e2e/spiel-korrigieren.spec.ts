import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MIN, SEC, acceptDraw, confirmYes, forward, seedRoster, startGame } from './helpers';
import { createLive, latestState } from './live-helpers';

/** Spec 017: Spiel korrigieren (Tore in den Spieldetails, Trikots ändern, Erinnerung an neues Teilen). */

test.use({ serviceWorkers: 'block' });

const E1 = 'Sportvg Feuerbach E1';
const ROSTER = '9 Max\n7 Ben\n10 Tom\n4 Leo\n11 Paul';
const settle = (page: Page) => page.clock.runFor(6_000);
const gameId = (page: Page): string => new URL(page.url()).hash.replace(/^#\/spiel\/([^/]+).*$/, '$1');

/** Spec 009 FR-V01: Schalter "Vorlagen" in den Einstellungen. */
async function setAssists(page: Page, on: boolean): Promise<void> {
  await page.goto('./#/einstellungen');
  const sw = page.getByTestId('feature-assists');
  await expect(sw).toBeVisible();
  if ((await sw.getAttribute('aria-checked')) !== String(on)) await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', String(on));
}

async function whistle(page: Page): Promise<void> {
  await page.getByTestId('btn-section-end').click();
  await confirmYes(page);
}

/** Eigenes Tor mit Torschütze aus der Schnellauswahl; "Vorlage von?" (falls offen) ohne Vorlage. */
async function ownGoal(page: Page, label: string): Promise<void> {
  await page.getByTestId('btn-goal-own').click();
  await page.getByTestId('scorer-picker').getByRole('button', { name: label, exact: true }).click();
  const assist = page.getByTestId('assist-picker');
  if (await assist.isVisible()) await page.getByTestId('assist-skip').click();
  await forward(page, 11 * SEC);
}

/**
 * Spiel 2 × 25 gegen "TSV Musterstadt": 10' Max, 18' Gegentor, 41' Tom, Schlusspfiff in 50'. Endet auf dem
 * Spielbildschirm nach dem Schlusspfiff.
 */
async function playSaturday(page: Page, o: { ownTeam?: string; assists?: boolean } = {}): Promise<void> {
  await seedRoster(page, ROSTER);
  await setAssists(page, o.assists ?? true);
  await startGame(page, { opponent: 'TSV Musterstadt', ...(o.ownTeam ? { ownTeam: o.ownTeam } : {}) });
  await forward(page, 9.5 * MIN);
  await ownGoal(page, '9 Max');
  await forward(page, 7.5 * MIN);
  await page.getByTestId('btn-goal-opp').click();
  await forward(page, 8 * MIN);
  await whistle(page);
  await page.getByTestId('btn-kickoff').click();
  await forward(page, 15.5 * MIN);
  await ownGoal(page, '10 Tom');
  await forward(page, 9 * MIN);
  await whistle(page);
  await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');
}

/** Wie Atti am Sonntag: über die Historie in die Spieldetails. */
async function openFromHistory(page: Page): Promise<void> {
  await page.goto('./#/historie');
  await page
    .getByRole('link', { name: /TSV Musterstadt/ })
    .first()
    .click();
  await expect(page.getByTestId('details-timeline')).toBeVisible();
}

const goalRows = (page: Page): Locator => page.getByTestId('details-timeline').getByRole('button');
const goalRow = (page: Page, minute: string): Locator => goalRows(page).filter({ hasText: minute });
const sheet = (page: Page): Locator => page.getByTestId('goal-actions');

test.describe('017 US1 Tore in den Spieldetails korrigieren', () => {
  test('017 US1-S1 US1-S2 US1-S3 SC-C01 aus der Historie: Tor antippen, Tor-Blatt wie im Spiel, Torschütze ändern', async ({
    page,
  }) => {
    await playSaturday(page);
    await openFromHistory(page);
    await expect(goalRows(page)).toHaveCount(3);
    await expect(page.getByTestId('details-add-goal')).toHaveText('Tor nachtragen');

    await goalRow(page, "10'").click();
    await expect(sheet(page)).toContainText("10' Max");
    for (const name of ['Tor entfernen', 'Torschütze ändern', 'Minute ändern', 'Vorlage ändern'])
      await expect(sheet(page).getByRole('button', { name, exact: true })).toBeVisible();
    await expect(page.getByTestId('goal-penalty')).toBeVisible();

    await page.getByTestId('goal-edit-scorer').click();
    const picker = page.getByTestId('scorer-picker');
    // Ohne Countdown, mit "Andere …" und "Eigentor Gegner" wie im Spiel.
    await expect(page.getByTestId('scorer-skip')).toHaveCount(0);
    await expect(page.getByTestId('scorer-clear')).toBeVisible();
    await expect(picker.getByRole('button', { name: 'Eigentor Gegner' })).toBeVisible();
    await picker.getByRole('button', { name: '7 Ben', exact: true }).click();
    await expect(picker).toHaveCount(0);
    await expect(page.getByTestId('assist-picker')).toHaveCount(0);
    await expect(goalRow(page, "10'")).toContainText('Ben');
    await expect(page.getByTestId('share-preview')).toContainText('Ben');

    // Gespeichert: nach dem Neuladen steht Ben noch da.
    await page.reload();
    await expect(goalRow(page, "10'")).toContainText('Ben');
  });

  test('017 US1-S4 Gegentor: Freitext "Torschütze Gegner" wie im Spiel', async ({ page }) => {
    await playSaturday(page);
    await openFromHistory(page);
    await goalRow(page, "18'").click();
    await expect(page.getByTestId('goal-edit-assist')).toHaveCount(0);
    await page.getByTestId('goal-edit-scorer').click();
    await expect(page.getByTestId('scorer-text')).toContainText('Torschütze Gegner');
    await page.getByTestId('scorer-text-input').fill('Nr. 9');
    await page.getByTestId('scorer-text-save').click();
    await expect(goalRow(page, "18'")).toContainText('Nr. 9 (TSV Musterstadt)');
  });

  test('017 US1-S5 Minute ändern: alle gespielten Minuten, vorgewählt die bisherige, neu eingeordnet', async ({
    page,
  }) => {
    await playSaturday(page);
    await openFromHistory(page);
    await goalRow(page, "41'").click();
    await page.getByTestId('goal-edit-minute').click();
    const select = page.getByTestId('goal-minute-select');
    await expect(select).toHaveValue("41'");
    await expect(select.locator('option').first()).toHaveText("1'");
    await expect(select.locator('option', { hasText: "50'" })).toHaveCount(1);
    await select.selectOption("15'");
    await page.getByTestId('goal-minute-save').click();
    await expect(goalRows(page).nth(1)).toContainText("15'");
    await expect(goalRows(page).nth(1)).toContainText('2:0');
    await expect(goalRows(page).nth(1)).toContainText('Tom');
    await expect(goalRows(page).nth(2)).toContainText('2:1');
    await expect(page.getByTestId('details-score')).toContainText('Halbzeit 2:1');
  });

  test('017 US1-S6 Vorlage ändern und entfernen', async ({ page }) => {
    await playSaturday(page);
    await openFromHistory(page);
    await goalRow(page, "10'").click();
    await page.getByTestId('goal-edit-assist').click();
    const picker = page.getByTestId('assist-picker');
    // Ohne den Torschützen.
    await expect(picker.getByRole('button', { name: '9 Max', exact: true })).toHaveCount(0);
    await picker.getByRole('button', { name: '4 Leo', exact: true }).click();
    await expect(goalRow(page, "10'")).toContainText('Max (Vorlage: Leo)');
    await goalRow(page, "10'").click();
    await page.getByTestId('goal-edit-assist').click();
    await page.getByTestId('assist-clear').click();
    await expect(goalRow(page, "10'")).not.toContainText('Vorlage');
  });

  test('017 US1-S7 Tor nachtragen: Mannschaft, Minute, Torschütze ohne Countdown', async ({ page }) => {
    await playSaturday(page);
    await openFromHistory(page);
    await page.getByTestId('details-add-goal').click();
    const add = page.getByTestId('add-goal-sheet');
    await expect(add).toContainText('Tor nachtragen');
    const minute = page.getByTestId('add-goal-minute');
    await expect(minute.locator('option:checked')).toHaveText(
      (await minute.locator('option').last().textContent()) ?? '',
    );
    await page.getByTestId('add-goal-side-own').click();
    await minute.selectOption("48'");
    await page.getByTestId('add-goal-save').click();
    await expect(add).toHaveCount(0);
    await expect(page.getByTestId('scorer-skip')).toHaveCount(0);
    await page.getByTestId('scorer-picker').getByRole('button', { name: '11 Paul', exact: true }).click();
    await expect(page.getByTestId('details-score')).toContainText('3:1');
    await expect(goalRow(page, "48'")).toContainText('3:1');
    await expect(goalRow(page, "48'")).toContainText('Paul');
  });

  test('017 US1-S8 Tor entfernen und wiederherstellen', async ({ page }) => {
    await playSaturday(page);
    await openFromHistory(page);
    await goalRow(page, "18'").click();
    await page.getByTestId('goal-remove').click();
    await confirmYes(page);
    await expect(goalRow(page, "18'")).toContainText('entfernt');
    await expect(page.getByTestId('details-score')).toContainText('2:0');
    await goalRow(page, "18'").click();
    await expect(page.getByTestId('goal-edit-minute')).toHaveCount(0);
    await expect(page.getByTestId('goal-edit-scorer')).toBeVisible();
    await page.getByTestId('goal-restore').click();
    await expect(goalRow(page, "18'")).not.toContainText('entfernt');
    await expect(page.getByTestId('details-score')).toContainText('2:1');
  });

  test('017 US1-S9 vor dem Anpfiff und nach Beginn eines Elfmeterschießens fehlt "Tor nachtragen"', async ({
    page,
  }) => {
    await startGame(page, { sections: 1, minutes: 12 });
    await forward(page, MIN);
    await page.getByTestId('btn-goal-own').click();
    await forward(page, MIN);
    await page.getByTestId('btn-goal-opp').click();
    await forward(page, 11 * SEC);
    await whistle(page);
    await page.getByTestId('draw-shootout').click();
    await page.getByTestId('first-own').click();
    await page.goto(`./#/spiel/${gameId(page)}/details`);
    await expect(goalRows(page)).toHaveCount(2);
    await expect(page.getByTestId('details-add-goal')).toHaveCount(0);
    await goalRows(page).first().click();
    await expect(sheet(page)).toBeVisible();

    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await page.getByTestId('input-opponent').fill('SV Beispielhausen');
    await page.getByTestId('btn-create').click();
    await expect(page.getByTestId('btn-kickoff')).toBeVisible();
    await page.goto(`./#/spiel/${gameId(page)}/details`);
    await expect(page.getByTestId('card-timeline')).toBeVisible();
    await expect(page.getByTestId('details-add-goal')).toHaveCount(0);
  });

  test('017 US1-S10 Korrektur eines live gesendeten Spiels kommt aufs Dashboard', async ({ page, recorded, relay }) => {
    const links = await createLive(page, recorded, { teams: ['E1'] });
    await playSaturday(page, { ownTeam: E1 });
    const id = gameId(page);
    await settle(page);
    await openFromHistory(page);
    await page.getByTestId('details-add-goal').click();
    await page.getByTestId('add-goal-side-own').click();
    await page.getByTestId('add-goal-minute').selectOption("48'");
    await page.getByTestId('add-goal-save').click();
    await page.getByTestId('scorer-clear').click();
    await settle(page);
    await expect
      .poll(async () => ((await latestState(relay, links.viewer, id))?.goals as unknown[] | undefined)?.length)
      .toBe(4);
  });

  test('017 US1-S11 laufendes Spiel: Spieldetails über "…", gleiche Korrekturen, "Zum Spiel" bleibt', async ({
    page,
  }) => {
    await seedRoster(page, ROSTER);
    await startGame(page, { opponent: 'TSV Musterstadt' });
    await forward(page, 4.5 * MIN);
    await ownGoal(page, '9 Max');
    await page.getByTestId('btn-menu').click();
    await page.getByTestId('menu-details').click();
    await goalRow(page, "5'").click();
    await page.getByTestId('goal-edit-scorer').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '10 Tom', exact: true }).click();
    await expect(goalRow(page, "5'")).toContainText('Tom');
    await expect(page.getByTestId('details-add-goal')).toBeVisible();
    await page.getByTestId('btn-back-to-game').click();
    await expect(page.locator('[data-testid^="goal-row-"]').first()).toContainText('Tom');
  });
});

const BLAU = 'rgb(31, 79, 191)';
const GELB = 'rgb(255, 212, 0)';
const SCHWARZ = 'rgb(35, 31, 32)';

async function openKits(page: Page): Promise<Locator> {
  await page.getByTestId('btn-menu').click();
  await page.getByTestId('menu-kits').click();
  const kits = page.getByTestId('kits-sheet');
  await expect(kits).toBeVisible();
  return kits;
}

async function pick(page: Page, side: 'own' | 'opp', color: string): Promise<void> {
  await page.getByTestId(`kit-${side}-change`).click();
  await page.getByTestId(`color-${side}-${color}`).click();
}

test.describe('017 US2 Trikots ändern', () => {
  test('017 US2-S1 "Trikots ändern" im "…"-Menü vor dem Anpfiff, laufend, in der Pause und beendet', async ({
    page,
  }) => {
    const check = async (): Promise<void> => {
      await page.getByTestId('btn-menu').click();
      await expect(page.getByTestId('menu-kits')).toHaveText('Trikots ändern');
      await page.getByTestId('game-menu').getByRole('button', { name: 'Schließen' }).click();
    };
    await startGame(page, { opponent: 'TSV Musterstadt' });
    await check();
    await forward(page, 26 * MIN);
    await whistle(page);
    await check();
    await page.getByTestId('btn-kickoff').click();
    await check();
    await forward(page, 26 * MIN);
    await whistle(page);
    await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');
    await page.getByTestId('draw-accept').click();
    await check();
  });

  test('017 US2-S2 US2-S3 SC-C02 Blatt "Trikots": Gegner auf Blau, Tor-Knopf und Dashboard folgen; ohne "Übernehmen" bleibt alles', async ({
    page,
    recorded,
    relay,
  }) => {
    const links = await createLive(page, recorded, { teams: ['E1'] });
    await startGame(page, { opponent: 'TSV Musterstadt', ownTeam: E1 });
    const id = gameId(page);
    let kits = await openKits(page);
    await expect(kits).toContainText('Trikots');
    await expect(page.getByTestId('kit-own-color')).toHaveText('Rot');
    await expect(page.getByTestId('kit-opp-color')).toHaveText('Schwarz');
    await pick(page, 'opp', 'blau');
    await expect(page.getByTestId('kit-opp-color')).toHaveText('Blau');
    // Schließen ohne "Übernehmen": unverändert.
    await kits.getByRole('button', { name: 'Schließen' }).click();
    await expect(page.getByTestId('btn-goal-opp')).toHaveCSS('background-color', SCHWARZ);

    kits = await openKits(page);
    await pick(page, 'opp', 'blau');
    await page.getByTestId('kits-save').click();
    await expect(kits).toHaveCount(0);
    await expect(page.getByTestId('btn-goal-opp')).toHaveCSS('background-color', BLAU);
    await settle(page);
    await expect.poll(async () => (await latestState(relay, links.viewer, id))?.oppColor).toBe('blau');
  });

  test('017 US2-S4 US2-S5 neue Gegnerfarbe wird gemerkt, Leibchen gilt nur für dieses Spiel', async ({ page }) => {
    await startGame(page, { opponent: 'TSV Musterstadt' });
    await openKits(page);
    await pick(page, 'opp', 'blau');
    await pick(page, 'own', 'gelb');
    await page.getByTestId('kits-save').click();
    await expect(page.getByTestId('btn-goal-own')).toHaveCSS('background-color', GELB);

    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await page.getByTestId('input-opponent').fill('TSV Musterstadt');
    await expect(page.getByTestId('kit-opp-color')).toHaveText('Blau');
    await expect(page.getByTestId('kit-own-color')).toHaveText('Rot');
  });

  test('017 US2-S6 gleiche Farbe: Hinweis wie bei "Neues Spiel", "Übernehmen" bleibt möglich', async ({ page }) => {
    await startGame(page, { opponent: 'TSV Musterstadt' });
    const kits = await openKits(page);
    await pick(page, 'opp', 'rot');
    await expect(kits.getByTestId('color-clash-hint')).toContainText('Beide Mannschaften in derselben Farbe.');
    await page.getByTestId('kits-save').click();
    await expect(page.getByTestId('btn-goal-opp')).toHaveCSS('background-color', 'rgb(235, 30, 37)');
  });

  test('017 US2-S7 Spieldetails: Farbmarken in der Kopfkarte, "Trikots ändern" öffnet dasselbe Blatt', async ({
    page,
  }) => {
    await playSaturday(page, { assists: false });
    await openFromHistory(page);
    await expect(page.getByTestId('details-mark-opp')).toHaveCSS('background-color', SCHWARZ);
    await page.getByTestId('details-kits').click();
    await expect(page.getByTestId('kits-sheet')).toBeVisible();
    await pick(page, 'opp', 'blau');
    await page.getByTestId('kits-save').click();
    await expect(page.getByTestId('details-mark-opp')).toHaveCSS('background-color', BLAU);
    await expect(page.getByTestId('share-preview')).toContainText('🔵');
  });
});

/** Kurzes Spiel 1 × 12 mit Tor von Max in 2', Schlusspfiff (1:0); endet auf dem Spielbildschirm. */
async function quickGame(page: Page, o: { interim?: boolean } = {}): Promise<void> {
  await seedRoster(page, ROSTER);
  await setAssists(page, false);
  await startGame(page, { opponent: 'TSV Musterstadt', sections: 1, minutes: 12 });
  await forward(page, MIN + 30 * SEC);
  await ownGoal(page, '9 Max');
  if (o.interim) {
    await page.getByTestId('btn-menu').click();
    await page.getByTestId('menu-share-interim').click();
  }
  await forward(page, 11 * MIN);
  await whistle(page);
  await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');
}

/** Torschütze des ersten Tores im Spielbildschirm ändern. */
async function changeScorerInGame(page: Page, label: string): Promise<void> {
  await page.locator('[data-testid^="goal-row-"]').first().click();
  await page.getByTestId('goal-edit-scorer').click();
  await page.getByTestId('scorer-picker').getByRole('button', { name: label, exact: true }).click();
}

const bar = (page: Page): Locator => page.getByTestId('reshare-bar');
const lastShare = async (recorded: () => Promise<{ shares: { text?: string }[] }>): Promise<string> =>
  (await recorded()).shares.at(-1)?.text ?? '';

test.describe('017 US3 Erinnerung an neues Teilen', () => {
  test('017 US3-S1 US3-S2 nach dem Teilen: Korrektur zeigt die Leiste, "Teilen" teilt den neuen Text', async ({
    page,
    recorded,
  }) => {
    await quickGame(page);
    await page.getByTestId('btn-share').click();
    await expect.poll(() => lastShare(recorded)).toContain('Max');

    // Im Spielbildschirm nach dem Schlusspfiff.
    await changeScorerInGame(page, '10 Tom');
    await expect(bar(page)).toContainText('Korrigiert. Ergebnis neu teilen?');
    await page.getByTestId('reshare-share').click();
    await expect.poll(() => lastShare(recorded)).toContain('Tom');
    await expect(bar(page)).toHaveCount(0);

    // Später in den Spieldetails.
    await openFromHistory(page);
    await goalRows(page).first().click();
    await page.getByTestId('goal-edit-scorer').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Ben', exact: true }).click();
    await expect(bar(page)).toContainText('Korrigiert. Ergebnis neu teilen?');
    await page.getByTestId('reshare-share').click();
    await expect.poll(() => lastShare(recorded)).toContain('Ben');
    await expect(bar(page)).toHaveCount(0);
  });

  test('017 US3-S3 Leiste verschwindet nach 10 Sekunden und beim Verlassen; die nächste Korrektur zeigt sie neu', async ({
    page,
  }) => {
    await quickGame(page);
    await openFromHistory(page);
    await page.getByTestId('btn-share').click();
    await goalRows(page).first().click();
    await page.getByTestId('goal-edit-scorer').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Ben', exact: true }).click();
    await expect(bar(page)).toBeVisible();
    await page.clock.runFor(10_500);
    await expect(bar(page)).toHaveCount(0);

    await page.getByTestId('details-add-goal').click();
    await page.getByTestId('add-goal-side-opp').click();
    await page.getByTestId('add-goal-save').click();
    await expect(bar(page)).toBeVisible();
    await page.getByRole('button', { name: 'Zurück zur Historie' }).click();
    await expect(page.getByTestId('details-timeline')).toHaveCount(0);
    await expect(bar(page)).toHaveCount(0);
  });

  test('017 US3-S4 ohne Teilen, nach "Zwischenstand teilen" und nach abgebrochenem Teilen keine Leiste', async ({
    page,
  }) => {
    await quickGame(page, { interim: true });
    await changeScorerInGame(page, '10 Tom');
    await expect(page.locator('[data-testid^="goal-row-"]').first()).toContainText('Tom');
    await expect(bar(page)).toHaveCount(0);

    await page.evaluate(() =>
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async () => {
          throw new DOMException('abgebrochen', 'AbortError');
        },
      }),
    );
    await page.getByTestId('btn-share').click();
    await changeScorerInGame(page, '7 Ben');
    await expect(page.locator('[data-testid^="goal-row-"]').first()).toContainText('Ben');
    await expect(bar(page)).toHaveCount(0);
  });

  test('017 US3-S5 Änderung ohne Auswirkung auf den Text (eigenes Trikot): keine Leiste; Gegnerfarbe schon', async ({
    page,
  }) => {
    await quickGame(page);
    // Das Symbol der Gegnerfarbe steht im Text nur in Zeilen von Gegentoren.
    await page.getByTestId('btn-menu').click();
    await page.getByTestId('menu-add-goal').click();
    await page.getByTestId('add-goal-side-opp').click();
    await page.getByTestId('add-goal-save').click();
    await acceptDraw(page);
    await page.getByTestId('btn-share').click();
    await openKits(page);
    await pick(page, 'own', 'gelb');
    await page.getByTestId('kits-save').click();
    await expect(page.getByTestId('btn-goal-own')).toHaveCSS('background-color', GELB);
    await expect(bar(page)).toHaveCount(0);
    await openKits(page);
    await pick(page, 'opp', 'blau');
    await page.getByTestId('kits-save').click();
    await expect(bar(page)).toBeVisible();
  });

  test('017 US3-S6 Spiel nicht beendet (Schlusspfiff zurückgenommen): keine Leiste', async ({ page }) => {
    await quickGame(page);
    await page.getByTestId('btn-share').click();
    await page.getByTestId('btn-menu').click();
    await page.getByTestId('menu-undo-whistle').click();
    await confirmYes(page);
    await expect(page.getByTestId('btn-section-end')).toBeVisible();
    await changeScorerInGame(page, '10 Tom');
    await expect(page.locator('[data-testid^="goal-row-"]').first()).toContainText('Tom');
    await expect(bar(page)).toHaveCount(0);
  });
});
