import { test, expect } from './fixtures';
import { addTeam, confirmYes, playFinishedGame, seedRoster } from './helpers';

const lineCount = (el: HTMLElement): number =>
  Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));

test.describe('Spec 004 Meine Mannschaften', () => {
  test('004 US1-S1 Mannschaft mit Heim- und Auswärtstrikot anlegen', async ({ page }) => {
    await addTeam(page, 'Sportvg Feuerbach U11', { away: 'weiss' });
    const row = page.getByTestId('team-row-0');
    await expect(row).toContainText('Sportvg Feuerbach U11');
    await expect(row).toContainText('Heim');
    await expect(row).toContainText('Rot');
    await expect(row).toContainText('Weiß');
  });

  test('004 ohne angelegte Mannschaft: Vorgabe "Sportvg Feuerbach" und Hinweis auf die Einstellungen', async ({
    page,
  }) => {
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await expect(page.getByTestId('hint-teams')).toBeVisible();
    await expect(page.getByTestId('matchup-home')).toHaveText('Feuerbach');
    await expect(page.getByTestId('kit-own-color')).toHaveText('Rot');
  });

  test('004 US1-S2 SC-M01 eine Mannschaft: keine Auswahl, kein Namensfeld, nur Gegner eintragen', async ({ page }) => {
    await addTeam(page, 'Sportvg Feuerbach U11');
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await expect(page.getByTestId('team-chips')).toHaveCount(0);
    await expect(page.getByTestId('hint-teams')).toHaveCount(0);
    await expect(page.getByTestId('matchup-home')).toHaveText('Feuerbach U11');
    await page.getByTestId('input-opponent').fill('TSV Musterstadt');
    await page.getByTestId('btn-create').click();
    await expect(page.getByTestId('team-home')).toHaveText('Feuerbach U11');
  });

  test('004 US1-S3 eigenes Trikot folgt Heim/Auswärts, bis es von Hand geändert wird', async ({ page }) => {
    await addTeam(page, 'Sportvg Feuerbach U11');
    await page.goto('./#/neu');
    await expect(page.getByTestId('kit-own-color')).toHaveText('Rot');
    await page.getByTestId('btn-swap-venue').click();
    await expect(page.getByTestId('matchup-away')).toHaveText('Feuerbach U11');
    await expect(page.getByTestId('kit-own-color')).toHaveText('Schwarz');
    await expect(page.getByTestId('kit-source')).toContainText('Auswärtstrikot');
    await page.getByTestId('kit-own-change').click();
    await page.getByTestId('color-own-gelb').click();
    await page.getByTestId('btn-swap-venue').click();
    await expect(page.getByTestId('kit-own-color')).toHaveText('Gelb');
    await expect(page.getByTestId('kit-source')).toContainText('nur für dieses Spiel');
  });

  test('004 US1-S4 FR-M06 zwei Mannschaften: Chips, zuletzt genutzte vorausgewählt, Spielzeit und Aufgebot je Mannschaft', async ({
    page,
  }) => {
    await seedRoster(page, ['1 Max', '2 Ben', '3 Tom'].join('\n'));
    await addTeam(page, 'Sportvg Feuerbach U11');
    await addTeam(page, 'Sportvg Feuerbach U13');
    // Spiel U11: 2 × 25, Aufgebot Max und Ben
    await page.goto('./#/neu');
    await page.getByTestId('team-chips').getByRole('button', { name: 'U11', exact: true }).click();
    await page.getByTestId('input-opponent').fill('FC Erster');
    await page.getByTestId('squad-picker').getByRole('button', { name: '1 Max', exact: true }).click();
    await page.getByTestId('squad-picker').getByRole('button', { name: '2 Ben', exact: true }).click();
    await page.getByTestId('btn-create').click();
    await expect(page.getByTestId('btn-kickoff')).toBeVisible();
    // Spiel U13: 2 × 30, Aufgebot Tom
    await page.goto('./#/neu');
    await expect(page.getByTestId('team-chip-0')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('team-chip-1').click();
    await page.getByTestId('input-opponent').fill('SV Zweiter');
    await page.getByTestId('schema-minutes').selectOption('30');
    await page.getByTestId('squad-picker').getByRole('button', { name: '3 Tom', exact: true }).click();
    await page.getByTestId('btn-create').click();
    await expect(page.getByTestId('btn-kickoff')).toBeVisible();
    // Zuletzt genutzt: U13, mit 30 Minuten und Tom
    await page.goto('./#/neu');
    await expect(page.getByTestId('team-chip-1')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('schema-minutes')).toHaveValue('30');
    await expect(page.getByTestId('squad-count')).toHaveText('AUFGEBOT · 1 VON 3');
    // Wechsel zu U11: 25 Minuten, Max und Ben
    await page.getByTestId('team-chip-0').click();
    await expect(page.getByTestId('schema-minutes')).toHaveValue('25');
    await expect(page.getByTestId('squad-count')).toHaveText('AUFGEBOT · 2 VON 3');
    await expect(page.getByTestId('matchup-home')).toHaveText('Feuerbach U11');
  });

  test('004 US1-S5 Mannschaft löschen mit Abfrage; alte Spiele bleiben in der Historie', async ({ page }) => {
    await playFinishedGame(page, ['own'], { ownTeam: 'Sportvg Feuerbach U11', opponent: 'FC Erster' });
    await page.goto('./#/einstellungen');
    await page.getByTestId('team-row-0').click();
    await page.getByTestId('btn-delete-team').click();
    await page.getByTestId('confirm-no').click();
    await expect(page.getByTestId('team-sheet')).toBeVisible();
    await page.getByTestId('btn-delete-team').click();
    await confirmYes(page);
    await expect(page.getByTestId('team-row-0')).toHaveCount(0);
    await page.goto('./#/historie');
    await expect(page.getByTestId('history-list')).toContainText('FC Erster');
    await expect(page.getByTestId('history-list')).toContainText('U11');
  });

  test('004 US2-S1 bis S3 Trikots mit "Ändern"; eigene Änderung gilt nur für dieses Spiel', async ({ page }) => {
    await addTeam(page, 'Sportvg Feuerbach U11');
    await page.goto('./#/neu');
    await page.getByTestId('input-opponent').fill('TSV Musterstadt');
    await expect(page.getByTestId('kit-own-color')).toHaveText('Rot');
    await expect(page.getByTestId('kit-opp-color')).toHaveText('Schwarz');
    await expect(page.getByTestId('color-own-gelb')).toHaveCount(0);
    await page.getByTestId('kit-own-change').click();
    await expect(page.getByTestId('kit-own-change')).toHaveAttribute('aria-expanded', 'true');
    await page.getByTestId('color-own-gelb').click();
    await expect(page.getByTestId('color-own-gelb')).toHaveCount(0);
    await expect(page.getByTestId('kit-own-color')).toHaveText('Gelb');
    await page.getByTestId('btn-create').click();
    await expect(page.getByTestId('btn-goal-own')).toHaveCSS('background-color', 'rgb(255, 212, 0)');
    // Mannschaft in den Einstellungen unverändert
    await page.goto('./#/einstellungen');
    await expect(page.getByTestId('team-row-0')).toContainText('Rot');
    await page.goto('./#/neu');
    await expect(page.getByTestId('kit-own-color')).toHaveText('Rot');
  });

  test('004 US3-S1 Begegnung wie die Kopfzeile im Spiel: Kurzform, höchstens zwei Zeilen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await addTeam(page, 'Sportvg Feuerbach U15-Juniorinnen');
    await page.goto('./#/neu');
    await page.getByTestId('input-opponent').fill('SGM SV Prag Stuttgart/TSV Weilimdorf');
    const home = page.getByTestId('matchup-home');
    const away = page.getByTestId('matchup-away');
    await expect(home).toHaveText('Feuerbach U15-Juniorinnen');
    await expect(away).toHaveText('SGM SV Prag Stuttgart/TSV Weilimdorf');
    expect(await home.evaluate(lineCount)).toBeLessThanOrEqual(2);
    expect(await away.evaluate(lineCount)).toBe(2);
    expect(await home.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  });
});
