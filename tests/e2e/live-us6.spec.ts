import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { forward, MIN, startGame } from './helpers';
import { asPath, createLive, latestState, liveStates, pasteLink } from './live-helpers';
import type { FakeRelay } from './relay';

/**
 * Spec 006 US6: Spiel übernehmen. Handy A (Organisator, Trainer-Handy) überträgt E2, Handy B fügt den
 * Trainer-Link ein und legt ebenfalls ein E2-Spiel an.
 */

// Service Worker blockieren, damit WebKit die Anfragen an ntfy.sh durch den Relay-Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const E2 = 'Sportvg Feuerbach E2';
type State = Record<string, unknown> & { gameId?: string; h?: number; goals?: unknown[] };

/** Lässt den Sender seine Bündelung (5 s) abarbeiten. */
const settle = (page: Page) => page.clock.runFor(6_000);

/** A überträgt E2 gegen TSV Musterstadt, 1:0 nach 3 Minuten. */
async function aTransmits(page: Page, relay: FakeRelay, viewer: string): Promise<string> {
  await startGame(page, { ownTeam: E2, opponent: 'TSV Musterstadt' });
  await forward(page, 3 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await settle(page);
  await expect.poll(async () => ((await latestState(relay, viewer)) as State | undefined)?.goals?.length).toBe(1);
  return (await latestState(relay, viewer))?.gameId as string;
}

/** B legt ein E2-Spiel mit "Live aufs Dashboard" an (ohne den Anpfiff-Bildschirm zu erwarten). */
async function bCreatesE2(b: Page): Promise<void> {
  await b.goto('./#/neu');
  await b.getByTestId('team-chips').getByRole('button', { name: 'E2', exact: true }).click();
  await expect(b.getByTestId('new-live-switch')).toHaveAttribute('aria-checked', 'true');
  await b.getByTestId('input-opponent').fill('Irgendwer');
  // Dem Mithören einen Moment geben, den Stand zu laden.
  await b.clock.runFor(2_000);
  await b.getByTestId('btn-create').click();
}

test('006 US6-S1 US6-S2 US6-S3 B übernimmt das laufende E2-Spiel von A mit Stand, Uhr und Toren', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const gameId = await aTransmits(page, relay, links.viewer);

  const b = await newDevice();
  await pasteLink(b, links.trainer);
  await bCreatesE2(b);
  const dialog = b.getByTestId('takeover-dialog');
  await expect(dialog).toContainText('Das Spiel der E2 überträgt bereits ein anderes Handy');
  await expect(b.getByTestId('takeover-summary')).toHaveText("Feuerbach E2 1:0 TSV Musterstadt · 4'");
  await b.getByTestId('takeover-yes').click();

  // US6-S2: gleiches Spiel mit Gegner, Stand und laufender Uhr
  await expect(b).toHaveURL(new RegExp(`#/spiel/${gameId}$`));
  await expect(b.getByTestId('team-away')).toHaveText('TSV Musterstadt');
  await expect(b.getByTestId('score')).toContainText('1');
  await expect(b.getByTestId('btn-pause')).toBeVisible();
  await expect(b.getByTestId('live-pill')).toHaveAttribute('data-state', 'on');
  await b.getByTestId('btn-goal-own').click();
  await b.clock.runFor(6_000);
  await expect
    .poll(async () => {
      const s = (await latestState(relay, links.viewer, gameId)) as State | undefined;
      return [s?.h, s?.goals?.length];
    })
    .toEqual([1, 2]);

  // US6-S3: A merkt die Übernahme, sendet nichts mehr; das Dashboard bleibt bei B
  await expect(page.getByTestId('live-handed-over')).toContainText('E2 überträgt jetzt ein anderes Handy');
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'handed');
  const before = relay.all().length;
  await page.getByTestId('btn-goal-opp').click();
  await settle(page);
  expect(relay.all().length).toBe(before);
  await page.getByTestId('btn-menu').click();
  await expect(page.getByTestId('menu-live-toggle')).toHaveCount(0);

  const v = await newDevice();
  await v.goto(asPath(links.viewer));
  await expect(v.getByTestId('dash-score-E2')).toHaveText('2:0');
  await expect(v.locator('[data-testid^="dash-card-"]')).toHaveCount(1);
  await v.getByTestId('dash-toggle-E2').click();
  await expect(v.getByTestId('dash-earlier-E2')).toHaveCount(0);
});

test('006 US6-S4 "Nur hier erfassen" legt das Spiel an, ohne es zu senden', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const gameId = await aTransmits(page, relay, links.viewer);
  const b = await newDevice();
  await pasteLink(b, links.trainer);
  await bCreatesE2(b);
  await b.getByTestId('takeover-private').click();
  await expect(b.getByTestId('btn-kickoff')).toBeVisible();
  await b.getByTestId('btn-kickoff').click();
  await expect(b.getByTestId('live-pill')).toHaveAttribute('data-state', 'off');
  await b.clock.runFor(6_000);
  const ids = new Set((await liveStates(relay, links.viewer)).map((s) => s.gameId));
  expect([...ids]).toEqual([gameId]);
});

test('006 US6-S5 ohne Empfang keine Frage: das Spiel wird normal angelegt', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  await aTransmits(page, relay, links.viewer);
  const b = await newDevice();
  await pasteLink(b, links.trainer);
  relay.fail = true;
  await bCreatesE2(b);
  await expect(b.getByTestId('btn-kickoff')).toBeVisible();
  await expect(b.getByTestId('takeover-dialog')).toHaveCount(0);
});
