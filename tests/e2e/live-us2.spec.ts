import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { addTeam, confirmYes, forward, MIN, newGame, startGame } from './helpers';
import { createLive, latestState, liveStates } from './live-helpers';

/** Spec 006 US2: Lead-Handy sendet automatisch. Dieses Handy ist Organisator und sendet selbst für E1. */

// Service Worker blockieren, damit WebKit die Anfragen an ntfy.sh durch den Relay-Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const E1 = 'Sportvg Feuerbach E1';
type State = Record<string, unknown> & { goals?: unknown[]; clock?: [string, number, number][] };

/** Lässt den Sender seine Bündelung (5 s) abarbeiten. */
const settle = (page: Page) => page.clock.runFor(6_000);

test('006 US2-S1 Anpfiff kommt mit Gegner, Trikots und 0:0 beim Dienst an', async ({ page, relay, recorded }) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'], self: 'E1' });
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
  const links = await createLive(page, recorded, { teams: ['E1'], self: 'E1' });
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
  const links = await createLive(page, recorded, { teams: ['E1'], self: 'E1' });
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
  const links = await createLive(page, recorded, { teams: ['E1'], self: 'E1' });
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

test('006 US2-S5 Spiel einer Mannschaft ohne Kopplung wird nicht gesendet', async ({ page, relay, recorded }) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'], self: 'E1' });
  await addTeam(page, 'Sportvg Feuerbach E3');
  await startGame(page, { ownTeam: 'Sportvg Feuerbach E3' });
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
  const links = await createLive(page, recorded, { teams: ['E1'], self: 'E1' });
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

test('006 US2-S7 Löschen eines Spiels schickt deleted', async ({ page, relay, recorded }) => {
  const links = await createLive(page, recorded, { teams: ['E1'], self: 'E1' });
  await newGame(page, { ownTeam: E1 });
  await settle(page);
  await page.getByTestId('nav-history').click();
  await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
  await page.getByTestId('btn-delete-game').click();
  await confirmYes(page);
  await settle(page);
  await expect.poll(async () => (await latestState(relay, links.viewer))?.state).toBe('deleted');
});

test('006 SC-L06 Meldungen enthalten weder Mannschafts- noch Spielernamen im Klartext', async ({
  page,
  relay,
  recorded,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'], self: 'E1', title: 'Unser Spieltag' });
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
  await createLive(page, recorded, { teams: ['E1'], self: 'E1' });
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
