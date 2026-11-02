import { test, expect } from './fixtures';
import { MIN, SEC, confirmYes, forward, newGame, startGame } from './helpers';

test.describe('US2 Spiel anlegen und Uhr steuern', () => {
  test('US2-S1 FR-001 Auswärtsspiel: Gegner links als Heim, Feuerbach rechts als Gast', async ({ page }) => {
    await newGame(page, { opponent: 'TSV Musterstadt', away: true });
    await expect(page.getByTestId('team-home')).toHaveText('TSV Musterstadt');
    await expect(page.getByTestId('team-away')).toHaveText('Sportvg Feuerbach');
  });

  test('US2-S2 FR-006 nach dem Anpfiff läuft der Countdown ab 25:00', async ({ page }) => {
    await newGame(page);
    await expect(page.getByTestId('clock')).toHaveText('25:00');
    await page.getByTestId('btn-kickoff').click();
    await forward(page, 2 * MIN);
    await expect(page.getByTestId('clock')).toHaveText(/^2[23]:\d\d$/);
    await expect(page.getByTestId('section-label')).toHaveText('1. Halbzeit');
  });

  test('US2-S3 FR-007 bei 00:00 Signal und Nachspielzeit aufwärts, Signal jede volle Minute', async ({
    page,
    recorded,
  }) => {
    await startGame(page);
    await forward(page, 25 * MIN + 2 * SEC);
    await expect(page.getByTestId('clock')).toHaveAttribute('data-overtime', 'true');
    await expect(page.getByTestId('clock')).toHaveText(/^\+0:0\d$/);
    await expect(page.getByTestId('signal-flash')).toBeVisible();
    const afterZero = await recorded();
    expect(afterZero.sounds).toBeGreaterThan(0);
    expect(afterZero.vibrations).toBe(1);
    await forward(page, 1 * MIN);
    expect((await recorded()).vibrations).toBe(2);
  });

  test('US2-S4 FR-005 Tor in der Nachspielzeit wird als 25+1 gespeichert', async ({ page }) => {
    await startGame(page);
    await forward(page, 25 * MIN + 40 * SEC);
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('goal-list')).toContainText("25+1'");
  });

  test('US2-S5 FR-006 Pausenpfiff mit Abfrage stoppt die Uhr, Anpfiff zur 2. Halbzeit', async ({ page }) => {
    await startGame(page);
    await forward(page, 26 * MIN);
    await expect(page.getByTestId('btn-section-end')).toHaveText('Pausenpfiff');
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await expect(page.getByTestId('section-label')).toHaveText('Halbzeitpause');
    await expect(page.getByTestId('btn-goal-own')).toBeDisabled();
    await expect(page.getByTestId('btn-kickoff')).toHaveText('Anpfiff 2. Halbzeit');
  });

  test('US2-S6 FR-005 Halbzeit 2 nach 3:10 ist die 29. Minute, Schlusspfiff beendet', async ({ page }) => {
    await startGame(page);
    await forward(page, 25 * MIN);
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await forward(page, 10 * MIN);
    await page.getByTestId('btn-kickoff').click();
    await forward(page, 3 * MIN + 10 * SEC);
    await page.getByTestId('btn-goal-opp').click();
    await expect(page.getByTestId('goal-list')).toContainText("29'");
    await expect(page.getByTestId('btn-section-end')).toHaveText('Schlusspfiff');
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');
    await expect(page.getByTestId('btn-goal-opp')).toBeDisabled();
  });

  test('US2-S7 FR-010 SC-003 Neuladen stellt Spiel und Restzeit wieder her', async ({ page }) => {
    await startGame(page);
    await forward(page, 5 * MIN);
    await page.getByTestId('btn-goal-own').click();
    await page.reload();
    await expect(page.getByTestId('clock')).toHaveText(/^(20:00|19:5\d)$/);
    await expect(page.getByTestId('score')).toHaveText('1 : 0');
  });

  test('US2-S8 Uhr anhalten nur nach Abfrage, fortsetzen ohne Abfrage', async ({ page }) => {
    await startGame(page);
    await forward(page, MIN);
    await expect(page.getByTestId('btn-pause')).toHaveText('Uhr anhalten');
    await page.getByTestId('btn-pause').click();
    await confirmYes(page);
    const stopped = await page.getByTestId('clock').textContent();
    await forward(page, 3 * MIN);
    await expect(page.getByTestId('clock')).toHaveText(stopped ?? '');
    // FR-021 (Gerätetest 02.11.): Tor bei angehaltener Uhr nur mit Abfrage "Tor eintragen und Uhr fortsetzen?"
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('confirm-dialog')).toContainText('Tor eintragen und Uhr fortsetzen?');
    await page.getByTestId('confirm-no').click();
    await expect(page.getByTestId('score')).toHaveText('0 : 0');
    await expect(page.getByTestId('btn-resume')).toBeVisible();
    await expect(page.getByTestId('btn-resume')).toHaveText('Uhr fortsetzen');
    await page.getByTestId('btn-resume').click();
    await expect(page.getByTestId('confirm-dialog')).toBeHidden();
    await expect(page.getByTestId('btn-pause')).toBeVisible();
  });

  test('US2-S12 FR-021 Tor bei angehaltener Uhr: nach Bestätigung läuft die Uhr weiter und das Tor zählt', async ({
    page,
  }) => {
    await startGame(page);
    await forward(page, MIN);
    await page.getByTestId('btn-pause').click();
    await confirmYes(page);
    await page.getByTestId('btn-goal-opp').click();
    await expect(page.getByTestId('confirm-dialog')).toContainText('Tor eintragen und Uhr fortsetzen?');
    await confirmYes(page);
    await expect(page.getByTestId('score')).toHaveText('0 : 1');
    await expect(page.getByTestId('btn-pause')).toBeVisible();
    const before = await page.getByTestId('clock').textContent();
    await forward(page, 5 * SEC);
    await expect(page.getByTestId('clock')).not.toHaveText(before ?? '');
  });

  test('US2-S10 Abbrechen einer Abfrage lässt die Uhr weiterlaufen', async ({ page }) => {
    await startGame(page);
    await page.getByTestId('btn-pause').click();
    await page.getByTestId('confirm-no').click();
    await expect(page.getByTestId('confirm-dialog')).toBeHidden();
    await expect(page.getByTestId('btn-pause')).toBeVisible();
    await page.getByTestId('btn-section-end').click();
    await page.getByTestId('confirm-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.getByTestId('confirm-dialog')).toBeHidden();
    await expect(page.getByTestId('section-label')).toHaveText('1. Halbzeit');
  });

  test('FR-002 Spielzeit 1 × 12: einziger Endknopf heißt Schlusspfiff', async ({ page }) => {
    await startGame(page, { sections: 1, minutes: 12 });
    await expect(page.getByTestId('section-label')).toHaveText('Spielzeit');
    await expect(page.getByTestId('btn-section-end')).toHaveText('Schlusspfiff');
    await expect(page.getByTestId('clock')).toHaveText(/^1[12]:\d\d$/);
  });

  test('FR-002 die zuletzt genutzte Spielzeit ist beim nächsten Spiel vorbelegt', async ({ page }) => {
    await newGame(page, { sections: 1, minutes: 12 });
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await expect(page.getByTestId('schema-sections')).toHaveValue('1');
    await expect(page.getByTestId('schema-minutes')).toHaveValue('12');
  });

  test('US2-S11 FR-007 Ton nach Hintergrund gesperrt: Hinweis erscheint, eine Berührung schaltet ihn wieder frei', async ({
    page,
    recorded,
  }) => {
    await startGame(page);
    await expect(page.getByTestId('audio-hint')).toHaveCount(0);
    const setBlocked = (blocked: boolean) =>
      page.evaluate((b) => {
        (window as unknown as { __rec: { blockAudio: boolean } }).__rec.blockAudio = b;
      }, blocked);
    await setBlocked(true);
    await forward(page, 25 * MIN + 2 * SEC);
    await expect(page.getByTestId('audio-hint')).toBeVisible();
    await setBlocked(false);
    await page.getByTestId('audio-hint').click();
    await forward(page, 1 * SEC);
    await expect(page.getByTestId('audio-hint')).toHaveCount(0);
    const before = (await recorded()).sounds;
    await forward(page, 1 * MIN);
    expect((await recorded()).sounds).toBeGreaterThan(before);
  });

  test('US2-S13 FR-036 Audio-Kanal wird beim Anpfiff mit Stille offen gehalten', async ({ page, recorded }) => {
    await startGame(page);
    expect((await recorded()).keepAlive).toBe(true);
  });

  test('US2-S14 FR-039 "Signal testen" spielt den Pfiff vor dem Anpfiff', async ({ page, recorded }) => {
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await page.getByTestId('btn-test-signal').click();
    expect((await recorded()).sounds).toBe(1);
  });
});
