import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MIN, ROSTER_21, SEC, confirmYes, forward, seedRoster, startGame } from './helpers';
import { createLive, e3Ended, onMatchday, sendAs } from './live-helpers';

/**
 * Spec 021 US2: Torschützen-Auswahl ohne Sperre. Die Schnellauswahl nach dem Tor dockt ohne Abdunkler über den
 * Tor-Knöpfen an; ein Tipp auf einen Tor-Knopf schließt sie und zählt das Tor.
 */

const ROSTER = '7 Max\n9 Ben\n10 Tom\n5 Moritz';

type Box = { x: number; y: number; width: number; height: number };
async function box(l: Locator): Promise<Box> {
  const b = await l.boundingBox();
  expect(b).not.toBeNull();
  return b as Box;
}

/** Das Element an der Mitte von `l` ist `l` selbst (bzw. ein Kind davon): nichts liegt darüber. */
async function onTop(l: Locator): Promise<boolean> {
  return l.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!hit && (hit === el || el.contains(hit));
  });
}

/** Beide Tor-Knöpfe und die Kopfzeile sind ganz sichtbar und frei; die Auswahl liegt dazwischen, ohne Abdunkler. */
async function expectGoalsFree(page: Page, picker: Locator): Promise<void> {
  const vh = page.viewportSize()?.height ?? 0;
  const p = await box(picker);
  const header = await box(page.locator('.game__header'));
  expect(p.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  for (const id of ['btn-goal-own', 'btn-goal-opp']) {
    const goal = page.getByTestId(id);
    const g = await box(goal);
    expect(g.y).toBeGreaterThanOrEqual(p.y + p.height - 1);
    expect(g.y + g.height).toBeLessThanOrEqual(vh);
    expect(g.height).toBeGreaterThanOrEqual(150);
    expect(await onTop(goal)).toBe(true);
    await expect(goal).toBeEnabled();
  }
  expect(await onTop(page.getByTestId('btn-menu'))).toBe(true);
  await expect(page.locator('.overlay__backdrop')).toHaveCount(0);
}

const rows = (page: Page) => page.locator('[data-testid^="goal-row-"]');

/**
 * Tipp an die Stelle des Tor-Knopfs, wie ein Finger: ohne Warten, bis nichts mehr darüber liegt (Playwrights
 * `click` würde warten, bis eine verdeckende Auswahl von selbst schließt).
 */
async function tapGoal(page: Page, side: 'own' | 'opp'): Promise<void> {
  const b = await box(page.getByTestId(side === 'own' ? 'btn-goal-own' : 'btn-goal-opp'));
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

/** Neues Spiel mit Aufgebot, angepfiffen. */
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

for (const [w, h] of [
  [390, 844],
  [375, 667],
] as const) {
  test(`021 US2-S1 SC-W02 Auswahl ohne Abdunkler zwischen Kopfzeile und Tor-Knöpfen (${w} × ${h})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: w, height: h });
    await seedRoster(page, ROSTER);
    await startGame(page);
    await page.getByTestId('btn-goal-own').click();
    const picker = page.getByTestId('scorer-picker');
    await expect(picker).toContainText('Wer hat getroffen?');
    await expectGoalsFree(page, picker);
    // Die Auswahl nimmt den ganzen Bereich unter der Kopfzeile ein; was darunter liegt, ruht unsichtbar.
    const p = await box(picker);
    const header = await box(page.locator('.game__header'));
    expect(p.y - (header.y + header.height)).toBeLessThanOrEqual(12);
    for (const sel of ['.scoreboard', '.clock', '.controls', '.goal-list'])
      await expect(page.locator(sel)).toBeHidden();
    await expect(page.getByTestId('btn-pause')).toBeHidden();
    // Ohne Seiten-Scroll.
    const s = await page.evaluate(() => {
      const el = document.scrollingElement as HTMLElement;
      return { sh: el.scrollHeight, ih: window.innerHeight };
    });
    expect(s.sh).toBeLessThanOrEqual(s.ih);
  });
}

test('021 US2-S2 SC-W02 "TOR Gegner" bei offener Auswahl zählt sofort und schließt sie', async ({ page }) => {
  await seedRoster(page, ROSTER);
  await startGame(page);
  await forward(page, 11 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await expect(page.getByTestId('scorer-picker')).toBeVisible();
  await forward(page, 2 * SEC);
  await tapGoal(page, 'opp');
  await expect(page.getByTestId('scorer-picker')).toHaveCount(0);
  await expect(page.getByTestId('score')).toHaveText('1 : 1');
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).first()).toContainText('TSV Musterstadt');
  await expect(rows(page).nth(1).locator('.goal-row__team')).toHaveText('Feuerbach');
  const band = page.getByTestId('undo-bar');
  await expect(band).toContainText("Tor TSV Musterstadt 12' erfasst");
  await page.getByTestId('btn-undo').click();
  await expect(page.getByTestId('score')).toHaveText('1 : 0');
  await expect(rows(page)).toHaveCount(1);
});

test('021 US2-S3 erneut "TOR Feuerbach": 2:0, Auswahl für das neue Tor, Rückgängig nimmt nur das neue', async ({
  page,
}) => {
  await seedRoster(page, ROSTER);
  await startGame(page);
  await forward(page, 11 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await forward(page, 2 * SEC);
  await expect(page.getByTestId('scorer-skip')).toContainText('6 s');
  await tapGoal(page, 'own');
  await expect(page.getByTestId('score')).toHaveText('2 : 0');
  const picker = page.getByTestId('scorer-picker');
  await expect(picker).toHaveCount(1);
  await expect(picker).toContainText("Tor in Minute 12'");
  await expect(page.getByTestId('scorer-skip')).toContainText('8 s');
  await expect(rows(page).nth(1).locator('.goal-row__team')).toHaveText('Feuerbach');
  await picker.getByTestId('btn-undo').click();
  await expect(page.getByTestId('score')).toHaveText('1 : 0');
  await expect(picker).toHaveCount(0);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first().locator('.goal-row__team')).toHaveText('Feuerbach');
});

test('021 US2-S4 Doppeltipp: "Schon gezählt" unter der Auswahl über den Tor-Knöpfen, Auswahl bleibt', async ({
  page,
}) => {
  await seedRoster(page, ROSTER);
  await startGame(page);
  await page.getByTestId('btn-goal-own').click();
  const picker = page.getByTestId('scorer-picker');
  await expect(picker).toBeVisible();
  await forward(page, 500);
  await tapGoal(page, 'own');
  await expect(page.getByTestId('score')).toHaveText('1 : 0');
  const hint = page.getByTestId('double-tap-hint');
  await expect(hint).toHaveText('Schon gezählt');
  await expect(picker).toBeVisible();
  const p = await box(picker);
  const band = await box(page.locator('.band'));
  const goal = await box(page.getByTestId('btn-goal-own'));
  expect(band.y).toBeGreaterThanOrEqual(p.y + p.height - 1);
  expect(band.y + band.height).toBeLessThanOrEqual(goal.y + 1);
  expect(await onTop(page.getByTestId('btn-goal-own'))).toBe(true);
});

test('021 US2-S5 "Vorlage von?" offen: "TOR Gegner" schließt ohne Vorlage und zählt', async ({ page }) => {
  await seedRoster(page, ROSTER);
  await page.goto('./#/einstellungen');
  await page.getByTestId('feature-assists').click();
  await expect(page.getByTestId('feature-assists')).toHaveAttribute('aria-checked', 'true');
  await startGame(page);
  await forward(page, 11 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true }).click();
  const assist = page.getByTestId('assist-picker');
  await expect(assist).toContainText('Vorlage von?');
  await expectGoalsFree(page, assist);
  await tapGoal(page, 'opp');
  await expect(assist).toHaveCount(0);
  await expect(page.getByTestId('score')).toHaveText('1 : 1');
  await expect(rows(page).nth(1).locator('.goal-row__team')).toHaveText('Max');
});

test('021 US2-S6 Inhalt und Verhalten der Auswahl bleiben: Countdown, Rückgängig, Andere, Eigentor', async ({
  page,
}) => {
  await seedRoster(page, ROSTER);
  await startWithSquad(page, ['7 Max', '9 Ben']);
  await forward(page, 11 * MIN);
  await page.getByTestId('btn-goal-own').click();
  const picker = page.getByTestId('scorer-picker');
  await expect(picker.getByRole('heading')).toHaveText('Wer hat getroffen?');
  await expect(picker).toContainText("Tor in Minute 12'");
  await expect(picker.getByTestId('btn-undo')).toBeVisible();
  await expect(picker.locator('[data-testid^="scorer-option-"]')).toHaveCount(2);
  await expect(picker.getByTestId('scorer-others')).toBeVisible();
  await expect(picker.getByTestId('scorer-own-goal')).toHaveText('Eigentor Gegner');
  await expect(picker.getByTestId('scorer-skip')).toHaveText('Ohne Torschütze (8 s)');
  await picker.getByTestId('scorer-others').click();
  await expect(picker.locator('[data-testid^="scorer-option-"]')).toHaveCount(4);
  await forward(page, 8 * SEC);
  await expect(picker).toHaveCount(0);
  await expect(rows(page).first().locator('.goal-row__team')).toHaveText('Feuerbach');
  // Rückgängig in der Auswahl entfernt das Tor.
  await forward(page, 3 * SEC);
  await page.getByTestId('btn-goal-own').click();
  await expect(page.getByTestId('score')).toHaveText('2 : 0');
  await picker.getByTestId('btn-undo').click();
  await expect(picker).toHaveCount(0);
  await expect(page.getByTestId('score')).toHaveText('1 : 0');
});

test('021 US2-S7 iPhone SE mit 16 Kindern: Titel, Rückgängig und "Ohne Torschütze" sichtbar, alle Namen erreichbar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await seedRoster(page, ROSTER_21.split('\n').slice(0, 16).join('\n'));
  await startGame(page);
  await page.getByTestId('btn-goal-own').click();
  const picker = page.getByTestId('scorer-picker');
  await expectGoalsFree(page, picker);
  const p = await box(picker);
  for (const l of [picker.getByRole('heading'), picker.getByTestId('btn-undo'), picker.getByTestId('scorer-skip')]) {
    const b = await box(l);
    expect(b.y).toBeGreaterThanOrEqual(p.y - 1);
    expect(b.y + b.height).toBeLessThanOrEqual(p.y + p.height + 1);
  }
  await expect(picker.locator('[data-testid^="scorer-option-"]')).toHaveCount(16);
  const last = picker.getByRole('button', { name: '16 Tim', exact: true });
  await last.scrollIntoViewIfNeeded();
  await last.click();
  await expect(picker).toHaveCount(0);
  await expect(rows(page).first().locator('.goal-row__team')).toHaveText('Tim');
  const s = await page.evaluate(() => {
    const el = document.scrollingElement as HTMLElement;
    return { sh: el.scrollHeight, ih: window.innerHeight };
  });
  expect(s.sh).toBeLessThanOrEqual(s.ih);
});

test('021 US2-S8 Korrektur "Torschütze ändern" bleibt ein Blatt mit Abdunkler und "Abbrechen"', async ({ page }) => {
  await seedRoster(page, ROSTER);
  await startGame(page);
  await page.getByTestId('btn-goal-own').click();
  await page.getByTestId('scorer-skip').click();
  await rows(page).first().click();
  await page.getByTestId('goal-edit-scorer').click();
  const picker = page.getByTestId('scorer-picker');
  await expect(picker).toHaveAttribute('aria-modal', 'true');
  await expect(page.locator('.overlay__backdrop')).toHaveCount(1);
  await expect(picker.getByRole('button', { name: 'Abbrechen' })).toBeVisible();
  await expect(picker.getByTestId('scorer-clear')).toHaveText('Ohne Torschütze');
  await expect(picker.getByTestId('scorer-skip')).toHaveCount(0);
  await picker.getByRole('button', { name: '9 Ben', exact: true }).click();
  await expect(rows(page).first().locator('.goal-row__team')).toHaveText('Ben');
});

test('021 US2-S9 für Screenreader ein Dialog ohne Sperre; Tor-Knöpfe bleiben bedienbar', async ({ page }) => {
  await seedRoster(page, ROSTER);
  await startGame(page);
  await page.getByTestId('btn-goal-own').click();
  const dialog = page.getByRole('dialog', { name: 'Wer hat getroffen?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveAttribute('aria-modal', 'true');
  // Tor-Knöpfe im Bedienbaum: per Tastatur erreichbar und auslösbar.
  await expect(page.getByRole('button', { name: /TSV Musterstadt/ })).toBeEnabled();
  await forward(page, 2 * SEC);
  await page.getByTestId('btn-goal-opp').focus();
  await expect(page.getByTestId('btn-goal-opp')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('score')).toHaveText('1 : 1');
  await expect(dialog).toHaveCount(0);
});

/** Spec 021 R-W3: Anfragen an den nachgeladenen Teil mit Tor-Blättern und Auswahl (`goal-editor`). */
const EDITOR_CHUNK = /\/assets\/goal-editor-[^/?]+\.js(\?.*)?$/;

test.describe('021 R-W3 nachgeladene Auswahl', () => {
  // Der Service Worker hielte den Teil bereit, an `page.route` vorbei.
  test.use({ serviceWorkers: 'block' });

  test('021 US2 FR-W10 R-W3 Teil noch nicht geladen: Tor zählt, Spielbildschirm bleibt sichtbar, Auswahl folgt', async ({
    page,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((r) => (release = r));
    await page.route(EDITOR_CHUNK, async (route) => {
      await gate;
      await route.continue();
    });
    await seedRoster(page, ROSTER);
    await startGame(page);
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('score')).toHaveText('1 : 0');
    // Ohne geladenen Teil kein Andocken: Anzeigetafel, Uhr und Torliste bleiben sichtbar.
    await expect(page.locator('main.game')).not.toHaveClass(/game--pick/);
    for (const sel of ['.scoreboard', '.clock', '.controls', '.goal-list'])
      await expect(page.locator(sel)).toBeVisible();
    release();
    const picker = page.getByTestId('scorer-picker');
    await expect(picker).toBeVisible();
    await expect(page.locator('main.game')).toHaveClass(/game--pick/);
    await expectGoalsFree(page, picker);
  });

  test('021 US2 FR-W10 R-W3 Laden fehlgeschlagen: beim nächsten Bedarf erneut laden', async ({ page }) => {
    let fail = true;
    await page.route(EDITOR_CHUNK, (route) => (fail ? route.abort() : route.continue()));
    await seedRoster(page, ROSTER);
    await startGame(page);
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('score')).toHaveText('1 : 0');
    await expect(page.locator('main.game')).not.toHaveClass(/game--pick/);
    await expect(page.locator('.scoreboard')).toBeVisible();
    await forward(page, 8 * SEC);
    // Wieder Netz: das nächste Tor lädt den Teil erneut, die Auswahl erscheint.
    fail = false;
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('score')).toHaveText('2 : 0');
    await expect(page.getByTestId('scorer-picker')).toBeVisible();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '9 Ben', exact: true }).click();
    await expect(rows(page).first().locator('.goal-row__team')).toHaveText('Ben');
  });
});

test.describe('021 FR-W10 Elfmeterschießen', () => {
  test.use({ serviceWorkers: 'block' });

  test('021 US2 FR-W10 Auswahl noch offen beim Elfmeterschießen: erscheint als Blatt statt zu verschwinden', async ({
    page,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((r) => (release = r));
    await page.route(EDITOR_CHUNK, async (route) => {
      await gate;
      await route.continue();
    });
    await seedRoster(page, ROSTER);
    await startGame(page, { sections: 1, minutes: 12 });
    await forward(page, 2 * MIN);
    await page.getByTestId('btn-goal-opp').click();
    await forward(page, 11 * SEC);
    // 1:1, die Auswahl ist gemerkt, der Teil kommt noch: Schlusspfiff und Elfmeterschießen.
    await page.getByTestId('btn-goal-own').click();
    await expect(page.getByTestId('score')).toHaveText('1 : 1');
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await page.getByTestId('draw-shootout').click();
    await page.getByTestId('first-own').click();
    await expect(page.getByTestId('section-label')).toHaveText('Elfmeterschießen');
    release();
    const picker = page.getByTestId('scorer-picker');
    await expect(picker).toBeVisible();
    await expect(picker).toHaveAttribute('aria-modal', 'true');
    await expect(picker.getByTestId('scorer-skip')).toBeVisible();
    await picker.getByRole('button', { name: '9 Ben', exact: true }).click();
    await expect(picker).toHaveCount(0);
    await expect(page.getByTestId('pen-score')).toBeVisible();
  });
});

test.describe('021 FR-W10 Auswahl mit Zusatzzeile unter der Kopfzeile', () => {
  // Relay-Nachbau für die Zeile "andere Spiele" (Spec 006 US4).
  test.use({ serviceWorkers: 'block' });

  test('021 US2-S1 FR-W10 iPhone SE mit Zeile "andere Spiele" und Ereignis-Zeile: Auswahl füllt genau den Bereich, "…" bleibt frei', async ({
    page,
    recorded,
    relay,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
    onMatchday(relay);
    await seedRoster(page, ROSTER);
    await page.goto('./#/einstellungen');
    for (const k of ['cards', 'subs', 'marks']) {
      await page.getByTestId(`feature-${k}`).click();
      await expect(page.getByTestId(`feature-${k}`)).toHaveAttribute('aria-checked', 'true');
    }
    await startGame(page, { ownTeam: 'Sportvg Feuerbach E1', opponent: 'TSV Musterstadt' });
    await sendAs(relay, links.trainer, e3Ended());
    await expect(page.getByTestId('live-other-E3')).toBeVisible();
    await expect(page.getByTestId('event-row')).toBeVisible();
    await page.getByTestId('btn-goal-own').click();
    const picker = page.getByTestId('scorer-picker');
    await expect(picker).toBeVisible();
    await expectGoalsFree(page, picker);
    const header = await box(page.locator('.game__header'));
    const dock = await box(page.locator('.goal-dock'));
    const goal = await box(page.getByTestId('btn-goal-own'));
    // Zwischen Kopfzeile und Tor-Knöpfen, ohne Überlappung und ohne Lücke (Abstand höchstens 8 pt + Rundung).
    expect(dock.y).toBeGreaterThanOrEqual(header.y + header.height - 0.5);
    expect(dock.y - (header.y + header.height)).toBeLessThanOrEqual(9);
    expect(dock.y + dock.height).toBeLessThanOrEqual(goal.y + 0.5);
    expect(goal.y - (dock.y + dock.height)).toBeLessThanOrEqual(9);
    await page.getByTestId('btn-menu').click();
    await expect(page.getByTestId('game-menu')).toBeVisible();
  });
});
