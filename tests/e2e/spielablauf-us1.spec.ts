import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import {
  MIN,
  SEC,
  acceptDraw,
  confirmYes,
  ensureTeam,
  forward,
  newGame,
  playFinishedGame,
  readStored,
  seedRoster,
  startGame,
} from './helpers';
import { createLive, latestState, sendPlan } from './live-helpers';
import { addGame, openPlan, row, setupPlan, sync } from './plan-helpers';

/**
 * Spec 021 US1: "Nächstes Spiel" nach dem Schlusspfiff. Der Knopf ersetzt die Tor-Knöpfe und öffnet "Neues Spiel",
 * vorbelegt aus dem beendeten Spiel; ein passendes Planspiel von heute ist gewählt.
 */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const ROT_TIEF = 'rgb(200, 38, 28)';
const ON_ROT = 'rgb(255, 255, 255)';
const E1 = 'Sportvg Feuerbach E1';
const E2 = 'Sportvg Feuerbach E2';

async function box(l: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const b = await l.boundingBox();
  expect(b).not.toBeNull();
  return b as { x: number; y: number; width: number; height: number };
}

/** Schlusspfiff mit Rückfrage; bei Unentschieden "Unentschieden". */
async function finish(page: Page): Promise<void> {
  await page.getByTestId('btn-section-end').click();
  await confirmYes(page);
  await acceptDraw(page);
  await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');
}

/** "Nächstes Spiel" antippen; "Neues Spiel" ist nachgeladen, wenn das Gegner-Feld steht. */
async function next(page: Page): Promise<void> {
  await page.getByTestId('btn-next-game').click();
  await expect(page.getByTestId('input-opponent')).toBeVisible();
}

const pressed = (page: Page, label: string) =>
  page.getByTestId('squad-picker').getByRole('button', { name: label, exact: true });

test('021 US1-S1 nach dem Schlusspfiff "Nächstes Spiel" statt der Tor-Knöpfe; Spieldetails und Ergebnis teilen bleiben', async ({
  page,
}) => {
  await playFinishedGame(page, ['own']);
  await expect(page.getByTestId('btn-goal-own')).toHaveCount(0);
  await expect(page.getByTestId('btn-goal-opp')).toHaveCount(0);
  const btn = page.getByTestId('btn-next-game');
  await expect(btn).toHaveText('Nächstes Spiel');
  await expect(btn).toHaveCSS('background-color', ROT_TIEF);
  await expect(btn).toHaveCSS('color', ON_ROT);
  const b = await box(btn);
  expect(b.height).toBeGreaterThanOrEqual(64);
  const vw = page.viewportSize()?.width ?? 0;
  expect(b.x).toBeLessThanOrEqual(17);
  expect(b.x + b.width).toBeGreaterThanOrEqual(vw - 17);
  await expect(page.getByTestId('btn-share')).toHaveText('Ergebnis teilen');
  await expect(page.locator('.controls').getByRole('button', { name: 'Spieldetails' })).toBeVisible();
});

test('021 US1-S1 FR-W01 eine Hauptaktion: "Ergebnis teilen" im Endzustand als Zweitknopf wie "Spieldetails"', async ({
  page,
}) => {
  await playFinishedGame(page, ['own']);
  const share = page.getByTestId('btn-share');
  await expect(share).toHaveClass(/\bbtn--secondary\b/);
  await expect(share).not.toHaveClass(/\bbtn--primary\b/);
  // Nur "Nächstes Spiel" ist gefüllt; "Ergebnis teilen" sieht aus wie "Spieldetails".
  const details = page.locator('.controls').getByRole('button', { name: 'Spieldetails' });
  const bg = await details.evaluate((el) => getComputedStyle(el).backgroundColor);
  await expect(share).toHaveCSS('background-color', bg);
});

test('021 US1-S2 Vorbelegung aus dem beendeten Spiel, Gegner leer mit Fokus', async ({ page }) => {
  await ensureTeam(page, E1);
  await ensureTeam(page, E2);
  await seedRoster(page, '7 Max\n3 Ben\n10 Tom');
  await page.goto('./');
  await page.getByTestId('btn-new-game').click();
  await page.getByTestId('team-chips').getByRole('button', { name: 'E1', exact: true }).click();
  await page.getByTestId('input-opponent').fill('FC Probestadt');
  await page.getByTestId('btn-swap-venue').click();
  await page.getByTestId('schema-sections').selectOption('1');
  await page.getByTestId('schema-minutes').selectOption('12');
  await page.getByTestId('kit-own-change').click();
  await page.getByTestId('color-own-weiss').click();
  await page.getByTestId('kit-opp-change').click();
  await page.getByTestId('color-opp-gelb').click();
  await pressed(page, '7 Max').click();
  await pressed(page, '3 Ben').click();
  await page.getByTestId('btn-create').click();
  await page.getByTestId('btn-kickoff').click();
  await forward(page, MIN);
  await finish(page);
  const finishedUrl = page.url();

  await next(page);
  expect(page.url()).toContain('#/neu/nach/');
  await expect(page.getByTestId('team-chips').getByRole('button', { name: 'E1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('schema-sections')).toHaveValue('1');
  await expect(page.getByTestId('schema-minutes')).toHaveValue('12');
  await expect(page.getByTestId('matchup-away')).toHaveText('Feuerbach E1');
  await expect(page.getByTestId('kit-own-color')).toContainText('Weiß');
  // Präzisierung nach dem Code-Review: Das Gegner-Trikot des beendeten Spiels wird nicht übernommen; ohne Gegner
  // gilt der Standard (Feuerbach in Weiß: Schwarz).
  await expect(page.getByTestId('kit-opp-color')).toContainText('Schwarz');
  await expect(page.getByTestId('kit-source')).toHaveText('Feuerbach-Trikot nur für dieses Spiel geändert.');
  await expect(pressed(page, '7 Max')).toHaveAttribute('aria-pressed', 'true');
  await expect(pressed(page, '3 Ben')).toHaveAttribute('aria-pressed', 'true');
  await expect(pressed(page, '10 Tom')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('input-opponent')).toHaveValue('');
  await expect(page.getByTestId('input-opponent')).toBeFocused();

  // Das Gegner-Trikot folgt dem eingetragenen Gegner: gemerkte Farbe (FC Probestadt in Gelb), sonst Standard.
  await page.getByTestId('input-opponent').fill('TSV Musterstadt');
  await expect(page.getByTestId('kit-opp-color')).toContainText('Schwarz');
  await page.getByTestId('input-opponent').fill('FC Probestadt');
  await expect(page.getByTestId('kit-opp-color')).toContainText('Gelb');
  await expect(page.getByTestId('kit-own-color')).toContainText('Weiß');
  // Zurück: kein neues Spiel, das beendete bleibt.
  await page.goto(finishedUrl);
  await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');
});

test('021 US1-S3 "Live aufs Dashboard" wie im beendeten Spiel', async ({ page, recorded, relay }) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await newGame(page, { ownTeam: E1, sections: 1, minutes: 12 });
  await page.getByTestId('btn-kickoff').click();
  await finish(page);
  // Das beendete Spiel wurde live gesendet.
  const id = page.url().replace(/.*#\/spiel\//, '');
  await expect
    .poll(async () => {
      await page.clock.runFor(3_000);
      return !!(await latestState(relay, links.viewer, id));
    })
    .toBe(true);
  await next(page);
  const sw = page.getByTestId('new-live-switch');
  await expect(sw).toHaveAttribute('aria-checked', 'true');

  // Spiel ohne Live: das nächste Spiel bleibt ohne Live.
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('input-opponent').fill('TSV Musterstadt');
  await page.getByTestId('btn-create').click();
  await page.getByTestId('btn-kickoff').click();
  await finish(page);
  await next(page);
  await expect(page.getByTestId('new-live-switch')).toHaveAttribute('aria-checked', 'false');
});

/** Heute (MATCHDAY) zwei Planspiele der E1 und eins der E2; das erste der E1 wird angelegt und beendet. */
async function firstPlanGame(page: Page): Promise<void> {
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-07', time: '11:00', opponent: 'FC Probestadt' });
  await addGame(page, { team: 'E1', date: '2026-11-07', time: '12:00', opponent: 'SV Beispielhausen', away: true });
  await addGame(page, { team: 'E2', date: '2026-11-07', time: '11:30', opponent: 'TSV Musterdorf' });
  await page.goto('./#/neu');
  const pick = page.getByTestId('plan-pick').locator('[aria-pressed]').filter({ hasText: 'FC Probestadt' });
  await pick.click();
  await expect(pick).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('schema-sections').selectOption('1');
  await page.getByTestId('btn-create').click();
  await page.getByTestId('btn-kickoff').click();
  await forward(page, MIN);
  await page.getByTestId('btn-goal-own').click();
  await forward(page, 11 * SEC);
  await finish(page);
}

test('021 US1-S4 nächstes Planspiel der Mannschaft von heute ist gewählt; Trikot folgt Heim/Auswärts', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await setupPlan(page, recorded, relay);
  // Ein früheres Planspiel, das ein anderer Trainer tickert, wird übersprungen.
  await sendPlan(relay, links.trainer, [
    {
      i: 'claimed1',
      k: 'E1',
      d: '2026-11-07',
      t: '11:30',
      h: 1,
      o: 'SG Vorgemerkt',
      b: ['otherdevice', 1, 'Jonas'],
      u: 1,
    },
  ]);
  await openPlan(page);
  await expect
    .poll(async () => {
      await sync(page);
      return (await row(page, 'SG Vorgemerkt').allInnerTexts()).join(' ');
    })
    .toContain('Tickert: Jonas');
  await firstPlanGame(page);

  await next(page);
  const chosen = page.getByTestId('plan-pick').locator('[aria-pressed="true"]');
  await expect(chosen).toHaveCount(1);
  await expect(chosen).toContainText('SV Beispielhausen');
  await expect(page.getByTestId('plan-pick-hint')).toContainText('Aus dem Spielplan: Sa 07.11., 12:00');
  await expect(page.getByTestId('input-opponent')).toHaveValue('SV Beispielhausen');
  // FR-W04 (Präzisierung): Gegner aus dem Plan, also kein Fokus (die Tastatur verdeckte die angeheftete Leiste).
  await expect(page.getByTestId('input-opponent')).not.toBeFocused();
  await expect(page.getByTestId('matchup-home')).toHaveText('SV Beispielhausen');
  await expect(page.getByTestId('matchup-away')).toHaveText('Feuerbach E1');
  // Präzisierung nach dem Code-Review: anderes Heim/Gast als im beendeten Heimspiel, also das Auswärtstrikot;
  // das Gegner-Trikot folgt dem Gegner aus dem Plan (keine gemerkte Farbe: Standard).
  await expect(page.getByTestId('kit-own-color')).toContainText('Schwarz');
  await expect(page.getByTestId('kit-source')).toHaveText('Feuerbach-Trikot aus dem Auswärtstrikot.');
  await expect(page.getByTestId('kit-opp-color')).toContainText('Weiß');
  await expect(page.getByTestId('schema-sections')).toHaveValue('1');

  await page.getByTestId('btn-create').click();
  await expect(page.getByTestId('btn-kickoff')).toBeVisible();
  await openPlan(page);
  await expect(row(page, 'SV Beispielhausen')).toContainText('angelegt');
});

test('021 US1-S5 ohne offenes Planspiel der Mannschaft bleibt der Gegner leer', async ({ page, recorded, relay }) => {
  await setupPlan(page, recorded, relay);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-07', time: '13:00', opponent: 'Abgesagt FC' });
  await row(page, 'Abgesagt FC').click();
  await page.getByTestId('plan-cancel').click();
  await expect(row(page, 'Abgesagt FC')).toContainText('abgesagt');
  await addGame(page, { team: 'E1', date: '2026-11-08', time: '10:00', opponent: 'Morgen SV' });
  await firstPlanGame(page);
  const finished = page.url();
  // Nach dem ersten Spiel: SV Beispielhausen (E1, 12:00) im Plan absagen, damit nur noch E2 und morgen bleiben.
  await openPlan(page);
  await row(page, 'SV Beispielhausen').click();
  await page.getByTestId('plan-cancel').click();
  await expect(row(page, 'SV Beispielhausen')).toContainText('abgesagt');
  await page.goto(finished);
  await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');

  await next(page);
  await expect(page.getByTestId('plan-pick')).toBeVisible();
  await expect(page.getByTestId('plan-pick').locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.getByTestId('plan-pick-hint')).toHaveCount(0);
  await expect(page.getByTestId('input-opponent')).toHaveValue('');
});

test('021 US1-S6 SC-W01 vom Schlusspfiff zum nächsten Anpfiff mit 3 Tipps plus Gegnername', async ({ page }) => {
  await playFinishedGame(page, ['own', 'opp', 'own'], { opponent: 'FC Probestadt' });
  let taps = 0;
  await page.getByTestId('btn-next-game').click();
  taps++;
  await page.getByTestId('input-opponent').fill('TSV Musterstadt');
  await page.getByTestId('btn-create').click();
  taps++;
  await page.getByTestId('btn-kickoff').click();
  taps++;
  await expect(page.getByTestId('btn-pause')).toBeVisible();
  expect(taps).toBe(3);
  await expect(page.getByTestId('score')).toHaveText('0 : 0');

  // Das beendete Spiel steht unverändert in der Historie.
  await page.getByTestId('nav-history').click();
  const items = page.getByTestId('history-list').locator('[data-testid^="history-item-"]');
  await expect(items).toHaveCount(2);
  await expect(items.filter({ hasText: 'FC Probestadt' })).toContainText('2:1');
  const games = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('torticker');
        open.onsuccess = () => {
          const req = open.result.transaction('games').objectStore('games').count();
          req.onsuccess = () => resolve(req.result);
        };
      }),
  );
  expect(games).toBe(2);
});

test('021 US1-S7 Schlusspfiff zurücknehmen bringt die Tor-Knöpfe zurück; im Elfmeterschießen kein "Nächstes Spiel"', async ({
  page,
}) => {
  await startGame(page, { sections: 1, minutes: 12 });
  await forward(page, 2 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await forward(page, 11 * SEC);
  await page.getByTestId('btn-section-end').click();
  await confirmYes(page);
  await expect(page.getByTestId('btn-next-game')).toBeVisible();
  await page.getByTestId('btn-menu').click();
  await page.getByTestId('menu-undo-whistle').click();
  await confirmYes(page);
  await expect(page.getByTestId('btn-next-game')).toHaveCount(0);
  await expect(page.getByTestId('btn-goal-own')).toBeEnabled();

  // Ausgleich, Schlusspfiff, Elfmeterschießen
  await forward(page, MIN);
  await page.getByTestId('btn-goal-opp').click();
  await forward(page, 11 * SEC);
  await page.getByTestId('btn-section-end').click();
  await confirmYes(page);
  await page.getByTestId('draw-shootout').click();
  await page.getByTestId('first-own').click();
  await expect(page.getByTestId('section-label')).toHaveText('Elfmeterschießen');
  await expect(page.getByTestId('btn-next-game')).toHaveCount(0);
  await page.getByTestId('pen-hit').click();
  await page.getByTestId('pen-miss').click();
  await page.getByTestId('pen-end').click();
  await confirmYes(page);
  await expect(page.getByTestId('shootout-result')).toBeVisible();
  await expect(page.getByTestId('btn-next-game')).toBeVisible();
  const id = page.url().replace(/.*#\/spiel\//, '');
  expect((await readStored<{ shootout?: { done: boolean } }>(page, 'games', id))?.shootout?.done).toBe(true);
});

test('021 US1-S8 iPhone SE: "Nächstes Spiel", Spieldetails und Ergebnis teilen ohne Scrollen, Band darüber', async ({
  page,
  recorded,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await seedRoster(page, '7 Max\n3 Ben');
  await startGame(page, { sections: 1, minutes: 12 });
  for (const name of ['7 Max', '3 Ben']) {
    await forward(page, MIN);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name, exact: true }).click();
  }
  await forward(page, 11 * SEC);
  await finish(page);
  await page.getByTestId('btn-share').click();
  await expect.poll(async () => (await recorded()).shares.length).toBeGreaterThan(0);
  await forward(page, 6 * SEC);

  const s = await page.evaluate(() => {
    const el = document.scrollingElement as HTMLElement;
    return { sh: el.scrollHeight, ih: window.innerHeight };
  });
  expect(s.sh).toBeLessThanOrEqual(s.ih);
  const next = await box(page.getByTestId('btn-next-game'));
  expect(next.y + next.height).toBeLessThanOrEqual(667);
  for (const l of [
    page.getByTestId('btn-share'),
    page.locator('.controls').getByRole('button', { name: 'Spieldetails' }),
  ]) {
    const b = await box(l);
    expect(b.y + b.height).toBeLessThanOrEqual(next.y);
  }
  const list = await box(page.getByTestId('goal-list'));
  const rows = page.locator('[data-testid^="goal-row-"]');
  for (let i = 0; i < 2; i++) {
    const r = await box(rows.nth(i));
    expect(r.y).toBeGreaterThanOrEqual(list.y - 1);
    expect(r.y + r.height).toBeLessThanOrEqual(list.y + list.height + 1);
  }

  // Korrektur nach dem Teilen: Band "Korrigiert. Ergebnis neu teilen?" direkt über "Nächstes Spiel".
  await rows.first().click();
  await page.getByTestId('goal-edit-scorer').click();
  await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true }).click();
  const band = await box(page.getByTestId('reshare-bar'));
  expect(band.y + band.height).toBeLessThanOrEqual(next.y + 1);
  expect(next.y - (band.y + band.height)).toBeLessThanOrEqual(16);
});

test('021 US1-S9 Endzustand: Torliste nur so hoch wie ihr Inhalt, der freie Raum ist Seitenhintergrund', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await playFinishedGame(page, ['own', 'opp']);
  const list = page.getByTestId('goal-list');
  const rows = page.locator('[data-testid^="goal-row-"]');
  const n = await rows.count();
  expect(n).toBeGreaterThanOrEqual(2);
  const l = await box(list);
  const last = await box(rows.nth(n - 1));
  // Die Liste endet mit ihrer letzten Zeile (bis auf Rahmen und Innenabstand), nicht erst am Knopf.
  expect(l.y + l.height - (last.y + last.height)).toBeLessThanOrEqual(8);
  const next = await box(page.getByTestId('btn-next-game'));
  const gap = next.y - (l.y + l.height);
  expect(gap).toBeGreaterThan(48);
  // An dieser Stelle liegt keine abgesetzte Fläche: nichts mit eigenem Hintergrund, nur der Seitenhintergrund.
  const bg = await page.evaluate(
    ([x, y]) => {
      let el: Element | null = document.elementFromPoint(x as number, y as number);
      while (el && getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)') el = el.parentElement;
      return {
        own: el ? getComputedStyle(el).backgroundColor : null,
        page: getComputedStyle(document.body).backgroundColor,
        inList: !!el && !!el.closest('[data-testid="goal-list"]'),
      };
    },
    [l.x + l.width / 2, l.y + l.height + gap / 2],
  );
  expect(bg.inList).toBe(false);
  expect(bg.own).toBe(bg.page);
});
