import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MIN, readStored, startGame } from './helpers';
import {
  createLive,
  e1At37,
  e2AtHalf,
  later,
  liveSnap,
  MATCHDAY,
  onMatchday,
  openViewer,
  sendAs,
} from './live-helpers';

/**
 * Spec 006 US3: Eltern schauen zu. Die Stände kommen wie von echten Lead-Handys (signiert mit dem
 * Lead-Schlüssel aus dem Lead-Link, verschlüsselt mit dem Zuschauer-Schlüssel) über den Relay-Nachbau.
 */

// Service Worker blockieren, damit WebKit die Anfragen an ntfy.sh durch den Relay-Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const T = MATCHDAY;
const E1 = 'Sportvg Feuerbach E1';

const cardIds = (v: Page) =>
  v.locator('[data-testid^="dash-card-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));

test('006 US1-S5 Zuschauer-Link im Torticker zeigt nur das Dashboard, auch eingefügt', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-title')).toHaveText('Unser Spieltag');
  await expect(v.getByTestId('nav')).toHaveCount(0);
  // Kein Lead-Handy geworden; der Link ist für den Start gemerkt.
  await v.goto('./#/live-spieltag');
  await expect(v.getByTestId('live-empty')).toBeVisible();
  await expect(v.getByTestId('btn-live-dashboard')).toContainText('Unser Spieltag');

  const w = await newDevice();
  await w.goto('./#/live-spieltag');
  await w.getByTestId('btn-paste-link').click();
  await w.getByTestId('paste-link-input').fill(`Hier zuschauen: ${links.viewer}`);
  await w.getByTestId('paste-link-apply').click();
  await expect(w.getByTestId('dashboard')).toBeVisible();
  await expect(w.getByTestId('couple-dialog')).toHaveCount(0);
  expect(w.url()).toContain('#/live/');
  expect((await readStored<{ live: unknown }>(w, 'settings', 'app'))?.live ?? null).toBeNull();
});

test('006 US3-S1 US3-S4 US3-S10 zwei Karten in 5 s, zugeklappt, aufklappbar, ohne Bedienelemente', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  await sendAs(relay, links.lead.E1!, e1At37());
  await sendAs(relay, links.lead.E2!, e2AtHalf());
  const v = await openViewer(newDevice, relay, links);

  const e1 = v.getByTestId('dash-card-E1');
  const e2 = v.getByTestId('dash-card-E2');
  await expect(e1).toBeVisible({ timeout: 5_000 });
  await expect(e2).toBeVisible({ timeout: 5_000 });
  await expect(v.getByTestId('dash-title')).toHaveText('Unser Spieltag');
  await expect(e1).toContainText('Feuerbach E1');
  await expect(e1).toContainText('TSV Musterstadt');
  await expect(v.getByTestId('dash-score-E1')).toHaveText('2:1');
  await expect(v.getByTestId('dash-phase-E1')).toHaveText("37'");
  await expect(e2).toContainText('SV Beispielhausen');
  await expect(v.getByTestId('dash-score-E2')).toHaveText('0:0');
  await expect(v.getByTestId('dash-phase-E2')).toHaveText('Halbzeit');
  await expect(v.getByTestId('dash-status')).toHaveAttribute('data-state', 'live');

  // US3-S4: zugeklappt; Tipp klappt auf, mehrere offen, zweiter Tipp klappt zu.
  await expect(v.getByTestId('dash-toggle-E1')).toHaveAttribute('aria-expanded', 'false');
  await expect(v.getByTestId('dash-details-E1')).toHaveCount(0);
  await v.getByTestId('dash-toggle-E1').click();
  const details = v.getByTestId('dash-details-E1');
  await expect(details).toContainText('Anpfiff 09:51 Uhr');
  await expect(details).toContainText('Halbzeit 1:1');
  const goals = details.getByTestId('dash-goal');
  await expect(goals).toHaveCount(3);
  await expect(goals.first()).toContainText("31'");
  await expect(goals.first()).toContainText('2:1');
  await expect(goals.first()).toContainText('Ben (Elfmeter)');
  await expect(goals.last()).toContainText('Max');
  await v.getByTestId('dash-toggle-E2').click();
  await expect(v.getByTestId('dash-details-E2')).toContainText('Noch keine Tore');
  await expect(v.getByTestId('dash-details-E1')).toBeVisible();
  await v.getByTestId('dash-toggle-E1').click();
  await expect(v.getByTestId('dash-details-E1')).toHaveCount(0);
  await expect(v.getByTestId('dash-toggle-E1')).toHaveAttribute('aria-expanded', 'false');

  // US3-S10: nur lesen, keine Eingaben; einzige Knöpfe sind die Karten selbst.
  await expect(v.locator('input, textarea, select')).toHaveCount(0);
  await expect(v.getByTestId('dashboard').getByRole('button')).toHaveCount(2);
});

test('006 US3-S2 Minute läuft ohne neue Meldung weiter, auch in der Nachspielzeit', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  await sendAs(relay, links.lead.E1!, liveSnap({ team: 'E1', now: T, clock: [['kickoff', 23.5, 1]] }));
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText("24'");
  await later(v, relay, 3 * MIN);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText("25+2'");
});

test('006 US3-S3 neues Tor hebt die Karte hervor und steht oben im Torverlauf', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  const clock: [string, number, number][] = [['kickoff', 10, 1]];
  await sendAs(relay, links.lead.E1!, liveSnap({ team: 'E1', now: T, clock, goals: [{ side: 'own', minute: 4 }] }));
  const v = await openViewer(newDevice, relay, links);
  const card = v.getByTestId('dash-card-E1');
  await expect(v.getByTestId('dash-score-E1')).toHaveText('1:0');
  await expect(card).not.toHaveClass(/card--flash/);

  const now = T + 30_000;
  await sendAs(
    relay,
    links.lead.E1!,
    liveSnap({
      team: 'E1',
      now,
      clock: [['kickoff', 10.5, 1]],
      goals: [
        { side: 'own', minute: 4 },
        { side: 'own', minute: 11, who: 'Leo' },
      ],
    }),
  );
  await expect(v.getByTestId('dash-score-E1')).toHaveText('2:0');
  await expect(card).toHaveClass(/card--flash/);
  await v.getByTestId('dash-toggle-E1').click();
  const first = v.getByTestId('dash-details-E1').getByTestId('dash-goal').first();
  await expect(first).toContainText("11'");
  await expect(first).toContainText('2:0');
  await expect(first).toContainText('Leo');
  await v.clock.runFor(6_000);
  await expect(card).not.toHaveClass(/card--flash/);
});

test('006 US3-S5 ohne Spiel: "Heute noch kein Spiel live" mit den Mannschaften', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  onMatchday(relay);
  const v = await openViewer(newDevice, relay, links);
  const empty = v.getByTestId('dash-empty');
  await expect(empty).toContainText('Heute noch kein Spiel live');
  await expect(empty).toContainText('E1, E2 oder E3');
  await expect(v.getByTestId('dashboard')).toContainText('E1 · E2 · E3');
});

test('006 US3-S6 Verbindung weg: "Keine Verbindung · Stand von", danach von selbst aktuell', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  await sendAs(relay, links.lead.E1!, liveSnap({ team: 'E1', now: T, clock: [['kickoff', 5, 1]] }));
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('0:0');

  relay.fail = true;
  const status = v.getByTestId('dash-status');
  await expect(status).toHaveAttribute('data-state', 'offline');
  await expect(status).toContainText(/Keine Verbindung · Stand von 10:4\d Uhr/);
  const goals = [{ side: 'opp' as const, minute: 6 }];
  await sendAs(relay, links.lead.E1!, liveSnap({ team: 'E1', now: T + 60_000, clock: [['kickoff', 6, 1]], goals }));
  relay.fail = false;
  await v.clock.runFor(5_000);
  await expect(status).toHaveAttribute('data-state', 'live');
  await expect(v.getByTestId('dash-score-E1')).toHaveText('0:1');
});

test('006 US3-S7 FR-L15 seit 7 Minuten keine Meldung: Hinweis, Minute läuft weiter', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  await sendAs(relay, links.lead.E1!, liveSnap({ team: 'E1', now: T, clock: [['kickoff', 2.5, 1]] }));
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText("3'");
  await later(v, relay, 7 * MIN + 10_000);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText("10'");
  await expect(v.getByLabel('Letzte Meldung vor 7 Minuten')).toBeVisible();
  await v.getByTestId('dash-toggle-E1').click();
  await expect(v.getByTestId('dash-stale-E1')).toContainText('Letzte Meldung vor 7 Min');
});

test('006 US3-S8 beendetes Spiel bleibt mit "Ende" unter dem laufenden, aufgeklappt mit Datum', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  const ended = liveSnap({
    team: 'E1',
    now: T,
    clock: [
      ['kickoff', 70, 1],
      ['sectionEnd', 45, 1],
      ['kickoff', 40, 2],
      ['fullTime', 15, 2],
    ],
    goals: [{ side: 'own', minute: 30, section: 2 }],
  });
  await sendAs(relay, links.lead.E1!, ended);
  await sendAs(relay, links.lead.E2!, liveSnap({ team: 'E2', now: T, clock: [['kickoff', 3, 1]] }));
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText('Ende');
  await expect.poll(() => cardIds(v)).toEqual(['dash-card-E2', 'dash-card-E1']);
  await v.getByTestId('dash-toggle-E1').click();
  await expect(v.getByTestId('dash-details-E1')).toContainText(
    'Sa, 07.11.2026 · Anpfiff 09:31 Uhr · Schlusspfiff 10:26 Uhr',
  );
});

test('006 US3-S9 FR-L14 früheres Spiel desselben Tages als "Heute außerdem"', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E2'] });
  onMatchday(relay);
  const first = liveSnap({
    team: 'E2',
    now: T,
    gameId: 'e2-1',
    createdAgo: 60,
    sections: 1,
    clock: [
      ['kickoff', 55, 1],
      ['fullTime', 30, 1],
    ],
    goals: [
      { side: 'own', minute: 3 },
      { side: 'opp', minute: 9 },
      { side: 'own', minute: 20 },
    ],
  });
  await sendAs(relay, links.lead.E2!, first);
  const next = liveSnap({
    team: 'E2',
    now: T,
    gameId: 'e2-2',
    createdAgo: 15,
    opp: 'SV Beispielhausen',
    clock: [['kickoff', 10, 1]],
  });
  await sendAs(relay, links.lead.E2!, next);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-card-E2')).toHaveAttribute('data-game', 'e2-2');
  await v.getByTestId('dash-toggle-E2').click();
  await expect(v.getByTestId('dash-earlier-E2')).toHaveText('Heute außerdem: 2:1 gegen TSV Musterstadt');
});

test('006 US3-S10 FR-L11 gefälschte Meldungen werden ignoriert', async ({ page, recorded, relay, newDevice }) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  // Fremder Schlüssel (nur Zuschauer-Link bekannt) und Stand für eine andere Mannschaft als im Zertifikat
  await sendAs(relay, links.lead.E2!, e2AtHalf(), { forge: true });
  await sendAs(relay, links.lead.E1!, { ...e2AtHalf(), gameId: 'falsch' });
  await sendAs(relay, links.lead.E1!, e1At37());
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-card-E1')).toBeVisible();
  await expect(v.getByTestId('dash-card-E2')).toHaveCount(0);
  await expect(v.locator('[data-game="falsch"]')).toHaveCount(0);
});

test('006 SC-L08 zu viele Verbindungen (429): Abfrage alle 30 s statt Stream', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  await sendAs(relay, links.lead.E1!, e1At37());
  relay.tooMany = true;
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-status')).toHaveAttribute('data-state', 'polling');
  await v.clock.fastForward(31_000);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('2:1');
});

test('006 R-L6 Start ohne eigene Daten öffnet das gemerkte Dashboard', async ({ page, recorded, relay, newDevice }) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  const v = await openViewer(newDevice, relay, links);
  await expect
    .poll(async () => (await readStored<{ liveView: { topic: string } | null }>(v, 'settings', 'app'))?.liveView)
    .toBeTruthy();
  await v.goto('./');
  await expect(v.getByTestId('dashboard')).toBeVisible();
  expect(v.url()).toContain('#/live/');
  // "Zum Torticker" führt zum Start, ohne erneut umzuleiten.
  await v.getByRole('link', { name: 'Zum Torticker' }).click();
  await expect(v.getByTestId('btn-new-game')).toBeVisible();
  await v.clock.runFor(2_000);
  await expect(v.getByTestId('btn-new-game')).toBeVisible();
});

test('006 FR-L17 Lead-Handy: "Live" und "Dashboard ansehen" öffnen das Dashboard mit Navigationsleiste', async ({
  page,
  recorded,
  relay,
}) => {
  expect(relay.all()).toEqual([]);
  await createLive(page, recorded, { teams: ['E1', 'E2'], self: 'E1' });
  await page.getByTestId('btn-live-dashboard').click();
  await expect(page.getByTestId('dashboard')).toBeVisible();
  await expect(page.getByTestId('nav')).toBeVisible();
  await expect(page.getByTestId('nav-more')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('dash-empty')).toBeVisible();

  await startGame(page, { ownTeam: E1 });
  await page.clock.runFor(6_000);
  await page.getByTestId('live-pill').click();
  await expect(page).toHaveURL(/#\/live-spieltag\/dashboard$/);
  await expect(page.getByTestId('dash-card-E1')).toBeVisible();
  await expect(page.getByTestId('dash-phase-E1')).toHaveText("1'");
  await expect(page.getByTestId('nav')).toBeVisible();
});

test('006 FR-L18 Karten ab 375 pt ohne waagrechtes Scrollen, auch mit langen Namen', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  const long = liveSnap({
    team: 'E1',
    now: T,
    opp: 'SV Beispielhausen-Musterdorf 1921 e. V.',
    away: true,
    clock: [['kickoff', 26.5, 1]],
    goals: [{ side: 'opp', minute: 3, who: 'Nr. 10 Langername-Doppelname' }],
  });
  await sendAs(relay, links.lead.E1!, long);
  const v = await openViewer(newDevice, relay, links);
  await v.getByTestId('dash-toggle-E1').click();
  await expect(v.getByTestId('dash-details-E1')).toBeVisible();
  const box = await v.getByTestId('dash-card-E1').boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(64);
  const overflow = await v.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
