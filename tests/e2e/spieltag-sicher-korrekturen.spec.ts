import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MIN, SEC, acceptDraw, confirmYes, forward, newGame, readStored, seedRoster, startGame } from './helpers';
import { createLive, latestState } from './live-helpers';

/** Spec 012 US2 bis US4: Tor nachtragen, Minute ändern, Pfiff zurücknehmen, Uhr korrigieren (2 × 25 Minuten). */

test.use({ serviceWorkers: 'block' });

const E1 = 'Sportvg Feuerbach E1';
const settle = (page: Page) => page.clock.runFor(6_000);
const rows = (page: Page) => page.locator('[data-testid^="goal-row-"]');
const gameId = (page: Page): string => new URL(page.url()).hash.replace('#/spiel/', '');

async function openMenu(page: Page): Promise<void> {
  await page.getByTestId('btn-menu').click();
  await expect(page.getByTestId('game-menu')).toBeVisible();
}

async function closeMenu(page: Page): Promise<void> {
  await page.getByTestId('game-menu').getByRole('button', { name: 'Schließen' }).click();
  await expect(page.getByTestId('game-menu')).toHaveCount(0);
}

async function tap(page: Page, side: 'own' | 'opp'): Promise<void> {
  await page.getByTestId(side === 'own' ? 'btn-goal-own' : 'btn-goal-opp').click();
  // Rückgängig-Leiste und Torschützen-Auswahl schließen sich von selbst.
  await forward(page, 11 * SEC);
}

async function whistle(page: Page): Promise<void> {
  await page.getByTestId('btn-section-end').click();
  await confirmYes(page);
}

async function addLate(page: Page, side: 'own' | 'opp', minute: string): Promise<void> {
  await openMenu(page);
  await page.getByTestId('menu-add-goal').click();
  const sheet = page.getByTestId('add-goal-sheet');
  await expect(sheet).toContainText('Tor nachtragen');
  await page.getByTestId(`add-goal-side-${side}`).click();
  await page.getByTestId('add-goal-minute').selectOption(minute);
  await page.getByTestId('add-goal-save').click();
  await expect(sheet).toHaveCount(0);
}

/** Erste Halbzeit mit Tor in 10', Pausenpfiff, zweite Halbzeit angepfiffen. */
async function secondHalf(page: Page, o: { ownTeam?: string } = {}): Promise<void> {
  await startGame(page, { opponent: 'TSV Musterstadt', ...o });
  await forward(page, 9.5 * MIN);
  await tap(page, 'own');
  await whistle(page);
  await page.getByTestId('btn-kickoff').click();
  await expect(page.getByTestId('section-label')).toHaveText('2. Halbzeit');
}

test("012 US2-S1 nach dem Schlusspfiff: Tor in 48' nachtragen, Endstand stimmt in Liste, Teilen und Dashboard", async ({
  page,
  recorded,
  relay,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await secondHalf(page, { ownTeam: E1 });
  await forward(page, 14.5 * MIN);
  await tap(page, 'opp');
  await forward(page, 11 * MIN);
  await whistle(page);
  await acceptDraw(page);
  await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');
  const clockBefore = await page.getByTestId('clock').textContent();

  await addLate(page, 'own', "48'");
  await expect(page.getByTestId('score')).toHaveText('2 : 1');
  await expect(rows(page).first()).toContainText("48'");
  await expect(rows(page).first()).toContainText('2:1');
  await expect(rows(page).nth(1)).toContainText("40'");
  // US2-S7: die Uhr bleibt, wie sie ist.
  await expect(page.getByTestId('clock')).toHaveText(clockBefore ?? '');

  await page.getByTestId('btn-share').click();
  await expect.poll(async () => (await recorded()).shares.at(-1)?.text ?? '').toContain('2:1');
  await settle(page);
  await expect
    .poll(async () => ((await latestState(relay, links.viewer, gameId(page)))?.goals as unknown[] | undefined)?.length)
    .toBe(3);
});

test('012 US2-S2 US2-S8 laufend nachgetragenes Gegentor steht an der richtigen Stelle, Halbzeitstand folgt', async ({
  page,
}) => {
  await startGame(page, { opponent: 'TSV Musterstadt' });
  await forward(page, 4.5 * MIN);
  await tap(page, 'own');
  await forward(page, 14.5 * MIN);
  await tap(page, 'own');
  await whistle(page);
  await page.getByTestId('btn-kickoff').click();
  await forward(page, 2 * MIN);

  await addLate(page, 'opp', "12'");
  await expect(rows(page)).toHaveCount(3);
  await expect(rows(page).nth(0)).toContainText("20'");
  await expect(rows(page).nth(0)).toContainText('2:1');
  await expect(rows(page).nth(1)).toContainText("12'");
  await expect(rows(page).nth(1)).toContainText('1:1');
  await expect(rows(page).nth(2)).toContainText("5'");
  const id = gameId(page);
  await expect
    .poll(async () => (await readStored<{ halfTimeScore: unknown }>(page, 'games', id))?.halfTimeScore)
    .toEqual({ own: 2, opp: 1 });

  // US2-S8: Entfernen eines Tores der 1. Halbzeit in der 2. Halbzeit ändert den Halbzeitstand.
  await rows(page).nth(1).click();
  await page.getByTestId('goal-remove').click();
  await confirmYes(page);
  await expect
    .poll(async () => (await readStored<{ halfTimeScore: unknown }>(page, 'games', id))?.halfTimeScore)
    .toEqual({ own: 2, opp: 0 });
  await page.goto(`./#/spiel/${id}/details`);
  await expect(page.getByTestId('details-score')).toContainText('Halbzeit 2:0');
});

test('012 US2-S3 US2-S4 eigenes Tor mit Kader: Torschützen-Auswahl ohne Countdown; nur gespielte Minuten', async ({
  page,
}) => {
  await seedRoster(page, '7 Max\n3 Ben');
  await startGame(page);
  await forward(page, 2.5 * MIN);
  await openMenu(page);
  await page.getByTestId('menu-add-goal').click();
  const minute = page.getByTestId('add-goal-minute');
  await expect(minute.locator('option')).toHaveText(["1'", "2'", "3'"]);
  await expect(minute).toHaveValue("3'");
  await page.getByTestId('add-goal-side-own').click();
  await minute.selectOption("2'");
  await page.getByTestId('add-goal-save').click();
  const picker = page.getByTestId('scorer-picker');
  await expect(picker).toBeVisible();
  // Ohne Countdown: kein "Ohne Torschütze (8 s)".
  await expect(page.locator('[data-testid="scorer-skip"]', { hasText: ' s)' })).toHaveCount(0);
  await picker.getByRole('button', { name: '7 Max', exact: true }).click();
  await expect(rows(page).first()).toContainText("2'");
  await expect(rows(page).first()).toContainText('Max');

  // Nach dem Schlusspfiff mit Nachspielzeit ist die letzte gespielte Minute vorgewählt.
  await forward(page, 23 * MIN);
  await whistle(page);
  await page.getByTestId('btn-kickoff').click();
  await forward(page, 26.5 * MIN);
  await whistle(page);
  await openMenu(page);
  await page.getByTestId('menu-add-goal').click();
  await expect(page.getByTestId('add-goal-minute')).toHaveValue("50+2'");
  await expect(page.getByTestId('add-goal-minute').locator('option', { hasText: "25+1'" })).toHaveCount(1);
});

test('012 US2-S5 Minute eines Tores ändern: neu eingeordnet, Torschütze bleibt', async ({ page }) => {
  await seedRoster(page, '7 Max\n3 Ben');
  await startGame(page);
  await forward(page, 14.5 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await page.getByTestId('scorer-picker').getByRole('button', { name: '3 Ben', exact: true }).click();
  await forward(page, 1 * MIN);
  await tap(page, 'opp');
  await expect(rows(page).first()).toContainText("16'");

  await rows(page).nth(1).click();
  await page.getByTestId('goal-edit-minute').click();
  await page.getByTestId('goal-minute-select').selectOption("17'");
  await page.getByTestId('goal-minute-save').click();
  await expect(rows(page).first()).toContainText("17'");
  await expect(rows(page).first()).toContainText('Ben');
  await expect(rows(page).first()).toContainText('1:1');
  await expect(rows(page).nth(1)).toContainText("16'");
  await expect(rows(page).nth(1)).toContainText('0:1');
});

test('012 US2-S6 US4-S5 vor dem Anpfiff weder Tor nachtragen noch Uhr korrigieren', async ({ page }) => {
  await newGame(page);
  await openMenu(page);
  await expect(page.getByTestId('menu-add-goal')).toHaveCount(0);
  await expect(page.getByTestId('menu-fix-clock')).toHaveCount(0);
});

test("012 US3-S1 US3-S5 versehentlicher Pausenpfiff in 18' wird zurückgenommen, die Uhr läuft weiter", async ({
  page,
}) => {
  await startGame(page);
  await forward(page, 17.5 * MIN);
  await whistle(page);
  await expect(page.getByTestId('section-label')).toHaveText('Halbzeitpause');
  await forward(page, 1 * MIN);
  await openMenu(page);
  await expect(page.getByTestId('menu-undo-whistle')).toHaveText('Pausenpfiff zurücknehmen');
  await page.getByTestId('menu-undo-whistle').click();
  const dialog = page.getByTestId('confirm-dialog');
  await expect(dialog).toContainText('Pausenpfiff zurücknehmen?');
  await expect(dialog).toContainText('Die Uhr läuft weiter, als wäre nicht gepfiffen worden.');
  await expect(page.getByTestId('confirm-yes')).toHaveText('Zurücknehmen');
  await page.getByTestId('confirm-yes').click();
  await expect(page.getByTestId('section-label')).toHaveText('1. Halbzeit');
  // 18,5 Minuten gespielt: Restzeit 6:30.
  await expect(page.getByTestId('clock')).toHaveText(/^6:(2\d|30)$/);
  await expect(page.getByTestId('btn-goal-own')).toBeEnabled();
});

test('012 US3-S2 Schlusspfiff vor 3 Minuten zurücknehmen: Nachspielzeit läuft, Dashboard wieder live', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await secondHalf(page, { ownTeam: E1 });
  await forward(page, 25.5 * MIN);
  await whistle(page);
  await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');
  await forward(page, 3 * MIN);
  await openMenu(page);
  await expect(page.getByTestId('menu-undo-whistle')).toHaveText('Schlusspfiff zurücknehmen');
  await page.getByTestId('menu-undo-whistle').click();
  await confirmYes(page);
  await expect(page.getByTestId('section-label')).toHaveText('2. Halbzeit');
  await expect(page.getByTestId('clock-caption')).toContainText('Nachspielzeit');
  await expect(page.getByTestId('btn-goal-own')).toBeEnabled();
  await settle(page);
  await expect
    .poll(async () => {
      const s = await latestState(relay, links.viewer, gameId(page));
      return ((s?.clock as [string][] | undefined) ?? []).map(([type]) => type).at(-1);
    })
    .toBe('kickoff');
});

test('012 US3-S3 US3-S4 nach mehr als 10 Minuten, nach dem nächsten Anpfiff und nach dem Elfmeterschießen nicht mehr', async ({
  page,
}) => {
  await startGame(page);
  await forward(page, 5 * MIN);
  await whistle(page);
  await forward(page, 10.5 * MIN);
  await openMenu(page);
  await expect(page.getByTestId('menu-undo-whistle')).toHaveCount(0);
  await closeMenu(page);
  await page.getByTestId('btn-kickoff').click();
  await openMenu(page);
  await expect(page.getByTestId('menu-undo-whistle')).toHaveCount(0);
  await closeMenu(page);

  // Unentschieden, Elfmeterschießen gewählt: kein Zurücknehmen.
  await forward(page, 26 * MIN);
  await whistle(page);
  await expect(page.getByTestId('draw-dialog')).toBeVisible();
  await page.getByTestId('draw-shootout').click();
  await page.getByTestId('first-own').click();
  await expect(page.getByTestId('section-label')).toHaveText('Elfmeterschießen');
  await openMenu(page);
  await expect(page.getByTestId('menu-undo-whistle')).toHaveCount(0);
});

test('012 US4-S1 US4-S2 Uhr zwei Minuten vorstellen: Restzeit, Tor-Minute und Dashboard folgen', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await startGame(page, { ownTeam: E1, opponent: 'TSV Musterstadt' });
  await forward(page, 4.5 * MIN);
  await tap(page, 'own');
  await expect(rows(page).first()).toContainText("5'");
  await forward(page, 5 * MIN - 11 * SEC);
  await expect(page.getByTestId('clock')).toHaveText(/^15:(2\d|30)$/);

  await openMenu(page);
  await page.getByTestId('menu-fix-clock').click();
  const sheet = page.getByTestId('clock-fix-sheet');
  await expect(page.getByTestId('clock-fix-minute')).toHaveText("10'");
  await page.getByTestId('clock-fix-plus').click();
  await page.getByTestId('clock-fix-plus').click();
  await expect(page.getByTestId('clock-fix-minute')).toHaveText("12'");
  await page.getByTestId('clock-fix-save').click();
  await expect(sheet).toHaveCount(0);
  // Zwei Minuten weniger Restzeit (die Uhr läuft während des Tests ein paar Sekunden weiter).
  await expect(page.getByTestId('clock')).toHaveText(/^13:(1\d|2\d|30)$/);
  await expect(rows(page).first()).toContainText("7'");

  await settle(page);
  await expect
    .poll(async () => {
      const s = await latestState(relay, links.viewer, gameId(page));
      return ((s?.goals as { minute: number }[] | undefined) ?? [])[0]?.minute;
    })
    .toBe(7);
});

test('012 US4-S3 Uhr ging vor: eine Minute zurück, der Pfiff kommt zur richtigen Zeit erneut', async ({
  page,
  recorded,
}) => {
  await startGame(page);
  await forward(page, 25 * MIN + 10 * SEC);
  const after = (await recorded()).sounds;
  expect(after).toBeGreaterThan(0);
  await openMenu(page);
  await page.getByTestId('menu-fix-clock').click();
  await page.getByTestId('clock-fix-minus').click();
  await page.getByTestId('clock-fix-save').click();
  await expect(page.getByTestId('clock')).toHaveText(/^0:(4\d|50)$/);
  await forward(page, 55 * SEC);
  expect((await recorded()).sounds).toBeGreaterThan(after);
});

test('012 US4-S4 US4-S5 Grenzen: nicht vor den Anpfiff, nicht vor das Halbzeitende; nicht in der Pause', async ({
  page,
}) => {
  await startGame(page);
  await forward(page, 30 * SEC);
  await openMenu(page);
  await page.getByTestId('menu-fix-clock').click();
  await expect(page.getByTestId('clock-fix-minus')).toBeDisabled();
  await page.getByTestId('clock-fix-save').click();

  await forward(page, 25 * MIN);
  await whistle(page);
  await openMenu(page);
  await expect(page.getByTestId('menu-fix-clock')).toHaveCount(0);
  await closeMenu(page);
  await forward(page, 1.5 * MIN);
  await page.getByTestId('btn-kickoff').click();
  await openMenu(page);
  await page.getByTestId('menu-fix-clock').click();
  // Halbzeitpause 1,5 Minuten: höchstens eine Minute vor.
  await page.getByTestId('clock-fix-plus').click();
  await expect(page.getByTestId('clock-fix-plus')).toBeDisabled();
});
