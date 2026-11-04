import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MIN, SEC, confirmYes, forward, seedRoster, startGame } from './helpers';
import { createLive, liveSnap, MATCHDAY, onMatchday, openViewer, sendAs } from './live-helpers';

/** Spec 009: Vorlagen. Kader mit Nummern, damit FR-V09 (nie Rückennummer in der Anzeige) prüfbar ist. */
const ROSTER = '7 Max\n9 Ben\n10 Tom\n5 Moritz\n8 Anton';

/** FR-V01: Schalter "Vorlagen" in den Einstellungen setzen. */
async function setAssists(page: Page, on: boolean): Promise<void> {
  await page.goto('./#/einstellungen');
  const sw = page.getByTestId('feature-assists');
  await expect(sw).toBeVisible();
  if ((await sw.getAttribute('aria-checked')) !== String(on)) await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', String(on));
}

/** Neues Spiel mit Aufgebot (Knöpfe "7 Max" usw.), angepfiffen. */
async function startWithSquad(page: Page, squad: string[]): Promise<void> {
  await page.goto('./');
  await page.getByTestId('btn-new-game').click();
  await page.getByTestId('input-opponent').fill('TSV Musterstadt');
  const picker = page.getByTestId('squad-picker');
  for (const label of squad) await picker.getByRole('button', { name: label, exact: true }).click();
  await page.getByTestId('btn-create').click();
  await page.getByTestId('btn-kickoff').click();
  await expect(page.getByTestId('btn-pause')).toBeVisible();
}

const firstRow = (page: Page) => page.locator('[data-testid^="goal-row-"]').first();
const assistOptions = (page: Page) => page.getByTestId('assist-picker').locator('[data-testid^="assist-option-"]');

/** Eigenes Tor in Minute 12 mit Torschütze Max; danach ist "Vorlage von?" offen (Schalter an). */
async function goalByMax(page: Page): Promise<void> {
  await forward(page, 11 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true }).click();
}

test.describe('009 US1 Vorlage direkt nach dem Tor', () => {
  test.beforeEach(async ({ page }) => {
    await seedRoster(page, ROSTER);
  });

  test('009 US1-S1 SC-V02 Schalter aus: nach dem Torschützen schließt das Fenster wie bisher', async ({ page }) => {
    await startGame(page);
    await goalByMax(page);
    await expect(page.getByTestId('scorer-picker')).toBeHidden();
    await expect(page.getByTestId('assist-picker')).toHaveCount(0);
    await expect(firstRow(page)).toContainText('Max');
  });

  test('009 US1-S2 US1-S3 US4-S2 "Vorlage von?" ohne den Torschützen, Tipp speichert die Vorlage', async ({ page }) => {
    await setAssists(page, true);
    await startGame(page);
    await forward(page, 11 * MIN);
    await page.getByTestId('btn-goal-own').click();
    // FR-V09: Knöpfe mit Nummer und Name.
    await expect(page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true })).toBeVisible();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true }).click();
    const assist = page.getByTestId('assist-picker');
    await expect(assist).toContainText('Vorlage von?');
    await expect(assist).toContainText("Tor in Minute 12' · Max");
    // Ohne Aufgebot: ganzer Kader ohne den Torschützen, kein "Andere …".
    await expect(assistOptions(page)).toHaveCount(4);
    await expect(assist.getByRole('button', { name: '7 Max', exact: true })).toHaveCount(0);
    await expect(assist.getByTestId('assist-others')).toHaveCount(0);
    await expect(assist.getByTestId('scorer-own-goal')).toHaveCount(0);
    await assist.getByRole('button', { name: '9 Ben', exact: true }).click();
    await expect(assist).toBeHidden();
    await expect(firstRow(page)).toContainText("12'");
    await expect(firstRow(page)).toContainText('1:0');
    await expect(firstRow(page)).toContainText('Max (Vorlage: Ben)');
  });

  test('009 US1-S4 SC-V03 ohne Tipp schließt "Vorlage von?" nach 5 s ohne Vorlage', async ({ page }) => {
    await setAssists(page, true);
    await startGame(page);
    await goalByMax(page);
    await expect(page.getByTestId('assist-skip')).toContainText('Ohne Vorlage (5 s)');
    await forward(page, 5 * SEC);
    await expect(page.getByTestId('assist-picker')).toBeHidden();
    await expect(firstRow(page)).toContainText('Max');
    await expect(firstRow(page)).not.toContainText('Vorlage');
  });

  test('009 US1-S5 "Ohne Vorlage" schließt sofort', async ({ page }) => {
    await setAssists(page, true);
    await startGame(page);
    await goalByMax(page);
    await page.getByTestId('assist-skip').click();
    await expect(page.getByTestId('assist-picker')).toBeHidden();
    await expect(firstRow(page)).not.toContainText('Vorlage');
  });

  test('009 US1-S6 "Andere …" zeigt den restlichen Kader ohne den Torschützen', async ({ page }) => {
    await setAssists(page, true);
    await startWithSquad(page, ['7 Max', '9 Ben', '10 Tom']);
    await goalByMax(page);
    await expect(assistOptions(page)).toHaveCount(2);
    await page.getByTestId('assist-others').click();
    await expect(assistOptions(page)).toHaveCount(4);
    await expect(page.getByTestId('assist-picker').getByRole('button', { name: '7 Max', exact: true })).toHaveCount(0);
    await page.getByTestId('assist-picker').getByRole('button', { name: '8 Anton', exact: true }).click();
    await expect(firstRow(page)).toContainText('Max (Vorlage: Anton)');
  });

  test('009 US1-S7 FR-V03 keine Frage bei Eigentor, ohne Torschützen, abgelaufener Auswahl und Gegentor', async ({
    page,
  }) => {
    await setAssists(page, true);
    await startGame(page);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-own-goal').click();
    await expect(page.getByTestId('assist-picker')).toHaveCount(0);
    await forward(page, 2 * SEC);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-skip').click();
    await expect(page.getByTestId('assist-picker')).toHaveCount(0);
    await forward(page, 2 * SEC);
    await page.getByTestId('btn-goal-own').click();
    await forward(page, 8 * SEC);
    await expect(page.getByTestId('scorer-picker')).toBeHidden();
    await expect(page.getByTestId('assist-picker')).toHaveCount(0);
    await page.getByTestId('btn-goal-opp').click();
    await expect(page.getByTestId('scorer-picker')).toHaveCount(0);
    await expect(page.getByTestId('assist-picker')).toHaveCount(0);
  });

  test('009 US1-S8 "Rückgängig" im Folgeschritt entfernt das Tor vollständig', async ({ page }) => {
    await setAssists(page, true);
    await startGame(page);
    await goalByMax(page);
    const assist = page.getByTestId('assist-picker');
    await expect(assist.getByTestId('btn-undo')).toBeVisible();
    await assist.getByTestId('btn-undo').click();
    await expect(assist).toBeHidden();
    await expect(page.getByTestId('score')).toHaveText('0 : 0');
    await expect(page.locator('[data-testid^="goal-row-"]')).toHaveCount(0);
  });
});

test.describe('009 US2 Vorlage nachträglich ändern', () => {
  test.beforeEach(async ({ page }) => {
    await seedRoster(page, ROSTER);
  });

  test('009 US2-S1 bis S3 "Vorlage ändern" ohne Countdown, ändern und entfernen', async ({ page }) => {
    await setAssists(page, true);
    await startGame(page);
    await goalByMax(page);
    await page.getByTestId('assist-skip').click();
    await firstRow(page).click();
    await expect(page.getByTestId('goal-edit-scorer')).toBeVisible();
    await page.getByTestId('goal-edit-assist').click();
    const assist = page.getByTestId('assist-picker');
    await expect(assist.getByTestId('assist-skip')).toHaveCount(0);
    await expect(assist.getByTestId('assist-clear')).toHaveText('Ohne Vorlage');
    // Abbrechen ändert nichts.
    await assist.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(firstRow(page)).not.toContainText('Vorlage');
    await firstRow(page).click();
    await page.getByTestId('goal-edit-assist').click();
    await assist.getByRole('button', { name: '10 Tom', exact: true }).click();
    await expect(firstRow(page)).toContainText('Max (Vorlage: Tom)');
    await firstRow(page).click();
    await page.getByTestId('goal-edit-assist').click();
    await assist.getByTestId('assist-clear').click();
    await expect(firstRow(page)).toContainText('Max');
    await expect(firstRow(page)).not.toContainText('Vorlage');
  });

  test('009 US2-S4 FR-V05 kein "Vorlage ändern" bei Gegentor, ohne Torschützen, Eigentor und Elfmeter', async ({
    page,
  }) => {
    await setAssists(page, true);
    await startGame(page);
    const sheet = page.getByTestId('goal-actions');
    const close = () => sheet.getByRole('button', { name: 'Schließen' }).click();
    await page.getByTestId('btn-goal-opp').click();
    await firstRow(page).click();
    await expect(sheet.getByTestId('goal-edit-assist')).toHaveCount(0);
    await close();
    await forward(page, 2 * SEC);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-skip').click();
    await firstRow(page).click();
    await expect(sheet.getByTestId('goal-edit-assist')).toHaveCount(0);
    await close();
    await forward(page, 2 * SEC);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-own-goal').click();
    await firstRow(page).click();
    await expect(sheet.getByTestId('goal-edit-assist')).toHaveCount(0);
    await close();
    // Elfmeter entfernt eine vorhandene Vorlage und den Knopf.
    await forward(page, 2 * SEC);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true }).click();
    await page.getByTestId('assist-picker').getByRole('button', { name: '9 Ben', exact: true }).click();
    await firstRow(page).click();
    await expect(sheet.getByTestId('goal-edit-assist')).toBeVisible();
    await sheet.getByTestId('goal-penalty').click();
    await expect(sheet.getByTestId('goal-edit-assist')).toHaveCount(0);
    await close();
    await expect(firstRow(page)).toContainText('Max (Elfmeter)');
    await expect(firstRow(page)).not.toContainText('Vorlage');
  });

  test('009 US2-S5 Schalter aus: kein "Vorlage ändern", gespeicherte Vorlage bleibt sichtbar', async ({ page }) => {
    await setAssists(page, true);
    await startGame(page);
    await goalByMax(page);
    await page.getByTestId('assist-picker').getByRole('button', { name: '9 Ben', exact: true }).click();
    const game = page.url();
    await setAssists(page, false);
    await page.goto(game);
    await expect(firstRow(page)).toContainText('Max (Vorlage: Ben)');
    await firstRow(page).click();
    await expect(page.getByTestId('goal-edit-scorer')).toBeVisible();
    await expect(page.getByTestId('goal-edit-assist')).toHaveCount(0);
  });
});

test.describe('009 US4 Schlanke Anzeige: nur Namen', () => {
  test.beforeEach(async ({ page }) => {
    await seedRoster(page, ROSTER);
  });

  test('009 US4-S1 SC-V04 Torliste, Tor-Fenster und Spieldetails ohne Rückennummer und ohne Mannschaft', async ({
    page,
  }) => {
    await setAssists(page, true);
    await startGame(page);
    await goalByMax(page);
    await page.getByTestId('assist-picker').getByRole('button', { name: '9 Ben', exact: true }).click();
    const row = firstRow(page);
    await expect(row.locator('.goal-row__team')).toHaveText('Max (Vorlage: Ben)');
    await row.click();
    const title = page.getByTestId('goal-actions').locator('.sheet__title');
    await expect(title).toHaveText("12' Max (Vorlage: Ben)");
    await page.getByTestId('goal-actions').getByRole('button', { name: 'Schließen' }).click();
    await page.goto(`${page.url()}/details`);
    await expect(page.locator('li[data-testid^="goal-"] .details__what')).toHaveText('Max (Vorlage: Ben)');
  });

  test('009 US4-S3 bis S5 FR-V11 mit Torschütze nur der Name, ohne Torschützen die Mannschaft', async ({ page }) => {
    await startGame(page);
    const team = (i: number) => page.locator('.goal-row__team').nth(i);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true }).click();
    await expect(team(0)).toHaveText('Max');
    await forward(page, 2 * SEC);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-skip').click();
    await expect(team(0)).toHaveText('Feuerbach');
    await page.getByTestId('btn-goal-opp').click();
    await expect(team(0)).toHaveText('TSV Musterstadt');
    await firstRow(page).click();
    await page.getByTestId('goal-edit-scorer').click();
    await page.getByTestId('scorer-text-input').fill('Nr. 9');
    await page.getByTestId('scorer-text-save').click();
    await expect(team(0)).toHaveText('Nr. 9 (TSV Musterstadt)');
    await forward(page, 2 * SEC);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-own-goal').click();
    await expect(team(0)).toHaveText('Eigentor');
  });

  test('009 SC-V05 "Moritz (Vorlage: Anton)" passt ungekürzt in die Zeile', async ({ page }) => {
    await setAssists(page, true);
    await startGame(page);
    await forward(page, 11 * MIN);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '5 Moritz', exact: true }).click();
    await page.getByTestId('assist-picker').getByRole('button', { name: '8 Anton', exact: true }).click();
    const cell = firstRow(page).locator('.goal-row__team');
    await expect(cell).toHaveText('Moritz (Vorlage: Anton)');
    expect(await cell.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
});

test.describe('009 US3 Teilen-Text und Dashboard', () => {
  // Service Worker blockieren, damit WebKit die Anfragen an ntfy.sh durch den Relay-Nachbau leitet (fixtures.ts).
  test.use({ serviceWorkers: 'block' });

  test('009 US3-S1 US3-S2 Teilen-Text mit "Max (Vorlage: Ben)", Torschützen-Zeile unverändert', async ({
    page,
    recorded,
  }) => {
    await seedRoster(page, ROSTER);
    await setAssists(page, true);
    await startGame(page, { sections: 1, minutes: 12 });
    await forward(page, 2 * MIN);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true }).click();
    await page.getByTestId('assist-picker').getByRole('button', { name: '9 Ben', exact: true }).click();
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await page.getByTestId('btn-share').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(1);
    const lines = ((await recorded()).shares[0]?.text ?? '').split('\n');
    expect(lines).toContain("🔴 3'  1:0  Max (Vorlage: Ben)");
    expect(lines.slice(-2)).toEqual(['*Torschützen*', 'Max ⚽']);
  });

  test('009 US3-S3 Dashboard zeigt im Torverlauf "Max (Vorlage: Ben)"', async ({
    page,
    recorded,
    relay,
    newDevice,
  }) => {
    const links = await createLive(page, recorded, { teams: ['E1'] });
    onMatchday(relay);
    await sendAs(
      relay,
      links.trainer,
      liveSnap({
        team: 'E1',
        now: MATCHDAY,
        clock: [['kickoff', 13.5, 1]],
        goals: [
          { side: 'own', minute: 6, who: 'Max', assist: 'Ben' },
          { side: 'own', minute: 12, who: 'Tom' },
        ],
      }),
    );
    const v = await openViewer(newDevice, relay, links);
    await expect(v.getByTestId('dash-card-E1')).toBeVisible({ timeout: 5_000 });
    await v.getByTestId('dash-toggle-E1').click();
    const goals = v.getByTestId('dash-details-E1').getByTestId('dash-goal');
    await expect(goals).toHaveCount(2);
    await expect(goals.first()).toContainText('Tom');
    await expect(goals.last()).toContainText('Max (Vorlage: Ben)');
  });
});
