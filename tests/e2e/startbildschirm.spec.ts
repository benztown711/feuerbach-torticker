import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { forward, MIN, startGame } from './helpers';
import { asPath, createLive, latestState, liveSnap, pasteLink, sendAs } from './live-helpers';
import type { FakeRelay } from './relay';

/**
 * Spec 018: Startbildschirm mit "E2 übernehmen" (US2) und "Spiele verfolgen" (US1). Handy A (Organisator) überträgt,
 * Handy B hat den Trainer-Link eingefügt.
 */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const E2 = 'Sportvg Feuerbach E2';
type State = Record<string, unknown> & { gameId?: string; h?: number; goals?: unknown[] };

/** A überträgt E2 gegen TSV Musterstadt, 1:0 nach 3 Minuten (wie 006 US6). */
async function aTransmits(page: Page, relay: FakeRelay, viewer: string): Promise<string> {
  await startGame(page, { ownTeam: E2, opponent: 'TSV Musterstadt' });
  await forward(page, 3 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await page.clock.runFor(6_000);
  await expect.poll(async () => ((await latestState(relay, viewer)) as State | undefined)?.goals?.length).toBe(1);
  return (await latestState(relay, viewer))?.gameId as string;
}

test('018 US1-S1 US1-S2 US1-S7 Spiele verfolgen öffnet das Dashboard, Spiel führt zurück, Verwalten bleibt unter Mehr', async ({
  page,
  recorded,
  relay,
}) => {
  await createLive(page, recorded, { teams: ['E1', 'E2'] });
  // Der Live-Spieltag ist beim eigenen Dienst angekommen (Konfiguration).
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  await page.goto('./');
  await expect(page.getByTestId('start-follow-line')).toHaveText('Unser Spieltag · E1, E2');
  await expect(page.getByTestId('start-trainer-card')).toHaveCount(0);
  // FR-001: feste Reihenfolge, "Neues Spiel" vor "Spiele verfolgen"
  const order = await page
    .locator('.start__actions > *')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  expect(order.indexOf('btn-new-game')).toBeLessThan(order.indexOf('start-follow'));

  await page.getByTestId('start-follow').click();
  await expect(page.getByTestId('dashboard')).toBeVisible();
  await expect(page.getByTestId('dash-title')).toHaveText('Unser Spieltag');
  await page.getByTestId('nav-game').click();
  await expect(page.getByTestId('btn-new-game')).toBeVisible();

  await page.goto('./#/live-spieltag');
  await expect(page.getByTestId('live-overview')).toBeVisible();
  await expect(page.getByTestId('btn-live-dashboard')).toBeVisible();
});

test('018 US1-S4 US1-S5 US2-S10 nur Zuschauer-Link: Spiele verfolgen und Trainer-Karte, nie übernehmen', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  await aTransmits(page, relay, links.viewer);

  const b = await newDevice();
  await b.goto('./');
  // US1-S5: ohne Live-Spieltag und ohne Zuschauer-Link kein "Spiele verfolgen"
  await expect(b.getByTestId('btn-new-game')).toBeVisible();
  await expect(b.getByTestId('start-follow')).toHaveCount(0);

  // B hat eigene Spiele und öffnet den Zuschauer-Link im Torticker.
  await startGame(b, { ownTeam: 'Sportvg Feuerbach E1', opponent: 'FC Musterdorf' });
  await b.goto(asPath(links.viewer));
  await expect(b.getByTestId('dashboard')).toBeVisible();
  await b.goto('./');
  await expect(b.getByTestId('start-follow-line')).toHaveText('Unser Spieltag');
  // Geändert durch Spec 020 Nachbesserung FR-E62: B hat eine eigene Mannschaft, also führt der Knopf "Eltern live
  // zuschauen lassen" zu "Link einfügen"; die Karte "Trainer? …" steht daneben nicht mehr.
  await expect(b.getByTestId('start-trainer-card')).toHaveCount(0);
  await expect(b.getByTestId('start-live-quick')).toBeVisible();
  await b.clock.runFor(3_000);
  await expect(b.locator('[data-testid^="start-take-"]')).toHaveCount(0);
  await b.getByTestId('start-follow').click();
  await expect(b.getByTestId('dashboard')).toBeVisible();
});

test('018 US2-S1 US2-S2 US2-S3 US2-S5 B übernimmt das laufende E2-Spiel vom Startbildschirm', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const gameId = await aTransmits(page, relay, links.viewer);

  // US2-S5: A sendet das Spiel selbst und bekommt dafür kein "E2 übernehmen".
  await page.goto('./');
  await expect(page.getByTestId('btn-continue')).toBeVisible();
  await page.clock.runFor(3_000);
  await expect(page.getByTestId('start-take-E2')).toHaveCount(0);
  await page.getByTestId('btn-continue').click();

  const b = await newDevice();
  await pasteLink(b, links.trainer);
  await b.goto('./');
  const take = b.getByTestId('start-take-E2');
  await expect(take).toContainText('E2 übernehmen');
  await expect(b.getByTestId('start-take-line-E2')).toHaveText("Feuerbach E2 1:0 TSV Musterstadt · 4'");
  const order = await b
    .locator('.start__actions > *')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  // FR-001, ergänzt durch Spec 020 FR-E01: "Eltern live zuschauen lassen" nach "Spiele verfolgen"; Spec 022 FR-F05:
  // der Installationshinweis (Browser) steht zuletzt.
  expect(order).toEqual(['btn-new-game', 'start-take-E2', 'start-follow', 'start-live-quick', 'start-install-hint']);

  // US2-S2: Rückfrage
  await take.click();
  const dialog = b.getByTestId('start-take-dialog');
  await expect(dialog).toContainText('E2 gegen TSV Musterstadt übernehmen?');
  await expect(dialog).toContainText(
    'Ab dann sendet nur noch dieses Handy. Das andere Handy erfasst nur noch für sich.',
  );
  await b.getByTestId('start-take-cancel').click();
  await expect(dialog).toHaveCount(0);
  await take.click();
  await b.getByTestId('start-take-yes').click();

  // US2-S3: wie 006 US6-S2 und US6-S3
  await expect(b).toHaveURL(new RegExp(`#/spiel/${gameId}$`));
  await expect(b.getByTestId('team-away')).toHaveText('TSV Musterstadt');
  await expect(b.getByTestId('score')).toContainText('1');
  await expect(b.getByTestId('live-pill')).toHaveAttribute('data-state', 'on');
  await b.getByTestId('btn-goal-own').click();
  await b.clock.runFor(6_000);
  await expect
    .poll(async () => {
      const s = (await latestState(relay, links.viewer, gameId)) as State | undefined;
      return [s?.h, s?.goals?.length];
    })
    .toEqual([1, 2]);
  await expect(page.getByTestId('live-handed-over')).toContainText('E2 überträgt jetzt ein anderes Handy');
});

test('018 US2-S4 US2-S6 US2-S7 US2-S8 mehrere Spiele, verstummtes Handy, nicht angepfiffene und beendete Spiele', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  const now = (): number => Date.now() + relay.offsetMs;
  // E2 läuft, das Handy sendet seit 35 Minuten nichts mehr (Akku leer).
  relay.offsetMs = -35 * MIN;
  await sendAs(relay, links.trainer, liveSnap({ team: 'E2', now: now(), minutes: 45, clock: [['kickoff', 5, 1]] }));
  relay.offsetMs = 0;
  // E3 läuft auswärts, E1 ist nur angelegt.
  await sendAs(
    relay,
    links.trainer,
    liveSnap({ team: 'E3', now: now(), away: true, opp: 'SV Beispielhausen', clock: [['kickoff', 12, 1]] }),
  );
  await sendAs(relay, links.trainer, liveSnap({ team: 'E1', now: now() }));

  const b = await newDevice();
  await pasteLink(b, links.trainer);
  await b.goto('./');
  // US2-S4: je Spiel ein Knopf in der Reihenfolge des Dashboards; US2-S6: E1 (nicht angepfiffen) fehlt
  await expect(b.getByTestId('start-take-E2')).toContainText('E2 übernehmen');
  await expect(b.getByTestId('start-take-E3')).toContainText('E3 übernehmen');
  await expect(b.getByTestId('start-take-line-E3')).toHaveText("SV Beispielhausen 0:0 Feuerbach E3 · 13'");
  await expect(b.getByTestId('start-take-E1')).toHaveCount(0);
  const takes = await b
    .locator('[data-testid^="start-take-E"]:not([data-testid*="line"]):not([data-testid*="stale"])')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  expect(takes).toEqual(['start-take-E2', 'start-take-E3']);
  // US2-S7: trotz 35 Minuten ohne Meldung, mit Hinweis
  await expect(b.getByTestId('start-take-stale-E2')).toHaveText('letzte Meldung vor 35 Min');

  // US2-S8: E3 pfeift ab, der Knopf verschwindet ohne Neuladen.
  await sendAs(
    relay,
    links.trainer,
    liveSnap({
      team: 'E3',
      now: now(),
      away: true,
      opp: 'SV Beispielhausen',
      minutes: 5,
      sections: 1,
      clock: [
        ['kickoff', 12, 1],
        ['fullTime', 1, 1],
      ],
    }),
  );
  await expect(b.getByTestId('start-take-E3')).toHaveCount(0);
  await expect(b.getByTestId('start-take-E2')).toBeVisible();
});

test('018 US2-S9 US1-S3 ohne Netz: kein Übernehmen, alles andere sofort; mit Netz erscheint der Knopf', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  await aTransmits(page, relay, links.viewer);
  const b = await newDevice();
  relay.fail = true;
  await pasteLink(b, links.trainer);
  await b.goto('./');
  await expect(b.getByTestId('btn-new-game')).toBeEnabled();
  await expect(b.getByTestId('start-follow')).toBeVisible();
  await b.clock.runFor(3_000);
  await expect(b.getByTestId('start-take-E2')).toHaveCount(0);
  // US1-S3: "Spiele verfolgen" geht auch ohne Netz.
  await b.getByTestId('start-follow').click();
  await expect(b.getByTestId('dashboard')).toBeVisible();
  await b.getByTestId('nav-game').click();

  relay.fail = false;
  await b.clock.runFor(60_000);
  await expect(b.getByTestId('start-take-E2')).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`018 FR-001 Startbildschirm mit Übernehmen und Rückfrage ohne axe-Verstöße (${scheme === 'light' ? 'hell' : 'dunkel'})`, async ({
    page,
    recorded,
    relay,
    newDevice,
  }) => {
    const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
    await aTransmits(page, relay, links.viewer);
    const b = await newDevice();
    await b.emulateMedia({ colorScheme: scheme });
    await pasteLink(b, links.trainer);
    await b.goto('./');
    await expect(b.getByTestId('start-take-E2')).toBeVisible();
    expect((await new AxeBuilder({ page: b }).analyze()).violations).toEqual([]);
    await b.getByTestId('start-take-E2').click();
    await expect(b.getByTestId('start-take-dialog')).toBeVisible();
    expect((await new AxeBuilder({ page: b }).analyze()).violations).toEqual([]);
  });
}
