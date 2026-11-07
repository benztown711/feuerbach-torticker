import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { confirmYes, forward, MIN, newGame, startGame } from './helpers';
import { asPath, createLive, latestState, liveStates, pasteLink } from './live-helpers';

/** Spec 006 US2: Das erfassende Trainer-Handy sendet automatisch, je Spiel für dessen Mannschaft. */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const E1 = 'Sportvg Feuerbach E1';
type State = Record<string, unknown> & { goals?: unknown[]; clock?: [string, number, number][] };

/** Lässt den Sender seine Bündelung (5 s) abarbeiten. */
const settle = (page: Page) => page.clock.runFor(6_000);

/** App kurz in den Hintergrund und zurück (wie Sperren und Entsperren am Spielfeldrand). */
const backAndForth = (page: Page) =>
  page.evaluate(() => {
    for (const state of ['hidden', 'visible']) {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
      document.dispatchEvent(new Event('visibilitychange'));
    }
  });

test('006 US2-S1 Anpfiff kommt mit Gegner, Trikots und 0:0 beim Dienst an', async ({ page, relay, recorded }) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  await startGame(page, { ownTeam: E1, opponent: 'TSV Musterstadt' });
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'on');
  await expect(page.getByTestId('live-pill')).toHaveText('Live');
  await settle(page);
  await expect
    .poll(async () => ((await latestState(relay, links.viewer)) as State | undefined)?.clock?.map((c) => c[0]))
    .toEqual(['kickoff']);
  const s = (await latestState(relay, links.viewer)) as State;
  expect(s).toMatchObject({
    state: 'live',
    team: 'E1',
    own: 'Feuerbach E1',
    opp: 'TSV Musterstadt',
    ownColor: 'rot',
    oppColor: 'schwarz',
    goals: [],
  });
});

test('006 US2-S2 Tor, Rückgängig, Entfernen und Wiederherstellen kommen an', async ({ page, relay, recorded }) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await startGame(page, { ownTeam: E1 });
  const goals = async () => ((await latestState(relay, links.viewer)) as State | undefined)?.goals?.length;

  await forward(page, MIN);
  await page.getByTestId('btn-goal-own').click();
  await settle(page);
  await expect.poll(goals).toBe(1);

  await forward(page, MIN);
  await page.getByTestId('btn-goal-opp').click();
  await page.getByTestId('btn-undo').click();
  await settle(page);
  await expect.poll(goals).toBe(1);

  await page.getByTestId('goal-list').getByRole('button').first().click();
  await page.getByTestId('goal-remove').click();
  await confirmYes(page);
  await settle(page);
  await expect.poll(goals).toBe(0);

  await page.getByTestId('goal-list').getByRole('button').first().click();
  await page.getByTestId('goal-restore').click();
  await settle(page);
  await expect.poll(goals).toBe(1);
});

test('006 US2-S3 Pausenpfiff und Schlusspfiff kommen an', async ({ page, relay, recorded }) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await startGame(page, { ownTeam: E1, sections: 2, minutes: 10 });
  const types = async () => ((await latestState(relay, links.viewer)) as State | undefined)?.clock?.map((c) => c[0]);
  await page.getByTestId('btn-section-end').click();
  await confirmYes(page);
  await settle(page);
  await expect.poll(types).toEqual(['kickoff', 'sectionEnd']);
  await page.getByTestId('btn-kickoff').click();
  await page.getByTestId('btn-section-end').click();
  await confirmYes(page);
  await settle(page);
  await expect.poll(types).toEqual(['kickoff', 'sectionEnd', 'kickoff', 'fullTime']);
});

test('006 US2-S4 ohne Netz zählt das Tor sofort, Kennzeichen "wartet auf Netz", danach kommt der Stand an', async ({
  page,
  relay,
  recorded,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await startGame(page, { ownTeam: E1 });
  await settle(page);
  relay.fail = true;
  await forward(page, MIN);
  await page.getByTestId('btn-goal-own').click();
  await expect(page.getByTestId('score')).toHaveText('1 : 0');
  await page.clock.runFor(35_000);
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'wait');
  await expect(page.getByTestId('live-pill')).toHaveText('Wartet auf Netz');
  relay.fail = false;
  await page.clock.runFor(35_000);
  await expect.poll(async () => ((await latestState(relay, links.viewer)) as State | undefined)?.goals?.length).toBe(1);
  await page.clock.runFor(6_000);
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'on');
});

test('006 US2-S5 Spiel einer Mannschaft außerhalb des Live-Spieltags wird nicht gesendet', async ({
  page,
  relay,
  recorded,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'], without: ['E2'] });
  await startGame(page, { ownTeam: 'Sportvg Feuerbach E2' });
  await expect(page.getByTestId('btn-pause')).toBeVisible();
  await expect(page.getByTestId('live-pill')).toHaveCount(0);
  await page.getByTestId('btn-menu').click();
  await expect(page.getByTestId('menu-live-toggle')).toHaveCount(0);
  await settle(page);
  expect(await liveStates(relay, links.viewer)).toEqual([]);
});

test('006 US2-S6 "Nicht live senden" schickt off, "Live senden" wieder den Stand', async ({
  page,
  relay,
  recorded,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await startGame(page, { ownTeam: E1 });
  await settle(page);
  await page.getByTestId('btn-menu').click();
  await expect(page.getByTestId('menu-live-toggle')).toHaveText('Nicht live senden');
  await page.getByTestId('menu-live-toggle').click();
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'off');
  await settle(page);
  await expect.poll(async () => (await latestState(relay, links.viewer))?.state).toBe('off');
  await page.getByTestId('btn-menu').click();
  await expect(page.getByTestId('menu-live-toggle')).toHaveText('Live senden');
  await page.getByTestId('menu-live-toggle').click();
  await settle(page);
  await expect.poll(async () => (await latestState(relay, links.viewer))?.state).toBe('live');
});

test('006 US2-S7 014 US3-S7 Löschen eines Spiels schickt deleted, erst wenn es endgültig ist', async ({
  page,
  relay,
  recorded,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await newGame(page, { ownTeam: E1 });
  await settle(page);
  await page.getByTestId('nav-history').click();
  await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
  await page.getByTestId('btn-delete-game').click();
  await confirmYes(page);
  await expect(page.getByTestId('history-undo')).toBeVisible();
  // Spec 014 FR-D08: während "Rückgängig" (10 s) bleibt das Spiel auf dem Dashboard.
  await settle(page);
  expect((await latestState(relay, links.viewer))?.state).not.toBe('deleted');
  await settle(page);
  await expect.poll(async () => (await latestState(relay, links.viewer))?.state).toBe('deleted');
});

test('014 US3-S7 nach "Rückgängig" bleibt das Spiel ohne Unterbrechung auf dem Dashboard', async ({
  page,
  relay,
  recorded,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await newGame(page, { ownTeam: E1 });
  await settle(page);
  const before = (await latestState(relay, links.viewer))?.state;
  expect(before).toBeDefined();
  await page.getByTestId('nav-history').click();
  await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
  await page.getByTestId('btn-delete-game').click();
  await confirmYes(page);
  await page.getByTestId('btn-history-undo').click();
  await settle(page);
  await settle(page);
  await page.getByTestId('nav-more').click();
  await settle(page);
  expect((await latestState(relay, links.viewer))?.state).toBe(before);
});

test('006 SC-L06 Meldungen enthalten weder Mannschafts- noch Spielernamen im Klartext', async ({
  page,
  relay,
  recorded,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'], title: 'Unser Spieltag' });
  await startGame(page, { ownTeam: E1, opponent: 'TSV Musterstadt' });
  await forward(page, MIN);
  await page.getByTestId('btn-goal-own').click();
  await settle(page);
  await expect.poll(async () => (await liveStates(relay, links.viewer)).length).toBeGreaterThan(0);
  for (const m of relay.all()) {
    // nur längere Wörter: kurze wie "E1" können im zufälligen Chiffretext vorkommen
    for (const plain of ['Feuerbach', 'Musterstadt', 'Spieltag', 'kickoff', 'sectionMinutes'])
      expect(m.message).not.toContain(plain);
  }
});

test('006 FR-L08 FR-033 Spielbildschirm mit Kennzeichen passt aufs iPhone SE, auch mit "Wartet auf Netz"', async ({
  page,
  relay,
  recorded,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await createLive(page, recorded, { teams: ['E1'] });
  await startGame(page, { ownTeam: E1, opponent: 'SGM SV Prag Stuttgart/TSV Weilimdorf' });
  relay.fail = true;
  await forward(page, MIN);
  await page.getByTestId('btn-goal-own').click();
  await page.clock.runFor(35_000);
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'wait');
  const scroll = await page.evaluate(() => {
    const el = document.scrollingElement as HTMLElement;
    return { sh: el.scrollHeight, ih: window.innerHeight, sw: el.scrollWidth, iw: window.innerWidth };
  });
  expect(scroll.sh).toBeLessThanOrEqual(scroll.ih);
  expect(scroll.sw).toBeLessThanOrEqual(scroll.iw);
  const pill = await page.getByTestId('live-pill').boundingBox();
  const menu = await page.getByTestId('btn-menu').boundingBox();
  expect((pill?.x ?? 0) + (pill?.width ?? 0)).toBeLessThanOrEqual(menu?.x ?? 0);
  expect((menu?.x ?? 0) + (menu?.width ?? 0)).toBeLessThanOrEqual(375);
});

test('006 US2-S8 FR-L09 "Live aufs Dashboard" beim Anlegen: an sendet, aus sendet nichts', async ({
  page,
  relay,
  recorded,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await newGame(page, { ownTeam: E1 });
  await page.goto('./#/neu');
  const sw = page.getByTestId('new-live-switch');
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('new-live-row')).toContainText('Eltern sehen das Spiel in „Unser Spieltag“.');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('input-opponent').fill('Testspiel SV');
  await page.getByTestId('btn-create').click();
  await page.getByTestId('btn-kickoff').click();
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'off');
  await settle(page);
  const opps = async () => (await liveStates(relay, links.viewer)).map((s) => s.opp);
  expect(await opps()).not.toContain('Testspiel SV');
  // Im Spiel wieder einschalten
  await page.getByTestId('btn-menu').click();
  await page.getByTestId('menu-live-toggle').click();
  await settle(page);
  await expect.poll(opps).toContain('Testspiel SV');
});

test('006 US2-S9 FR-L04 ein zweites Trainer-Handy sendet E2 und am nächsten Wochenende E1, ohne Umstellen', async ({
  page,
  relay,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await pasteLink(b, links.trainer);
  await startGame(b, { ownTeam: 'Sportvg Feuerbach E2', opponent: 'SV Beispielhausen' });
  await expect(b.getByTestId('live-pill')).toHaveAttribute('data-state', 'on');
  await b.clock.runFor(6_000);
  await expect.poll(async () => (await latestState(relay, links.viewer))?.team).toBe('E2');
  await b.getByTestId('btn-section-end').click();
  await confirmYes(b);
  await b.getByTestId('btn-kickoff').click();
  await b.getByTestId('btn-section-end').click();
  await confirmYes(b);
  await startGame(b, { ownTeam: E1, opponent: 'TSV Musterstadt' });
  await b.clock.runFor(6_000);
  await expect.poll(async () => (await latestState(relay, links.viewer))?.team).toBe('E1');
});

test('006 US2-S10 am Vorabend angelegtes Spiel geht am Spieltag beim Öffnen erneut hinaus', async ({
  page,
  relay,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  await newGame(page, { ownTeam: E1, opponent: 'TSV Musterstadt' });
  await settle(page);
  const opps = async () => (await liveStates(relay, links.viewer)).map((s) => s.opp);
  await expect.poll(opps).toEqual(['TSV Musterstadt']);
  // Über Nacht: Der Dienst hält die Meldung nicht mehr vor (rund 12 Stunden).
  relay.clear();
  // Innerhalb einer Stunde nach der letzten Sendung zurück in den Vordergrund: nichts Neues.
  await backAndForth(page);
  await settle(page);
  expect(await opps()).toEqual([]);
  // Am Spieltag zurück in den Vordergrund: Das angelegte Spiel geht erneut hinaus.
  await page.clock.fastForward(61 * MIN);
  await backAndForth(page);
  await settle(page);
  await expect.poll(opps).toEqual(['TSV Musterstadt']);
  // Ebenso beim Neustart des Torticker.
  relay.clear();
  await page.reload();
  await expect(page.getByTestId('btn-kickoff')).toBeVisible();
  await settle(page);
  await expect.poll(opps).toEqual(['TSV Musterstadt']);
  // Ein erst jetzt geöffnetes Dashboard zeigt das Spiel als heutiges.
  const v = await newDevice();
  await v.goto(asPath(links.viewer));
  await expect(v.getByTestId('dash-phase-E1')).toHaveText('noch nicht angepfiffen');
  await expect(v.getByTestId('dash-empty')).toHaveCount(0);
});
