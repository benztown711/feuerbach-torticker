import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MIN } from './helpers';
import { decodeMessage, openTrainerSection, openViewer, recordedOf, type LiveLinks } from './live-helpers';
import { ROSTER, shareTrainerWithSquads } from './paket-helpers';
import { addGame, openPlan, setupPlan, sync } from './plan-helpers';
import { seedRoster } from './helpers';
import type { FakeRelay } from './relay';

/**
 * Spec 024 Paket A: Eltern tickern über den Zuschauer-Link (US1 bis US3). Trainer-Handy T legt den Live-Spieltag an,
 * Eltern-Handys P (Paul) und A (Anna) öffnen den Zuschauer-Link. Fiktive Namen.
 */

test.use({ serviceWorkers: 'block' });
// Drei Handys (Trainer, zwei Eltern) mit Zeitsprüngen: mehr Zeit als ein Einzeltest.
test.slow();

type State = Record<string, unknown> & { gameId?: string; h?: number; by?: string; goals?: { who?: string }[] };

/** Jüngster Live-Stand; Meldungen, die der Zuschauer-Schlüssel nicht öffnet (Kader der Trainer), fallen weg. */
async function latestState(relay: FakeRelay, viewer: string): Promise<State | undefined> {
  let last: State | undefined;
  for (const m of relay.all()) {
    const d = await decodeMessage(viewer, m.message).catch(() => null);
    if (d?.content) last = d.content as State;
  }
  return last;
}

/** Sender bündelt 5 s; Empfänger brauchen einen Moment. */
const settle = (p: Page) => p.clock.runFor(6_000);

/** T: Live-Spieltag E1/E2 mit geteiltem Kader und (optional) Planspiel heute 12:00 E2 gegen TSV Musterstadt. */
async function trainer(
  page: Page,
  recorded: Parameters<typeof setupPlan>[1],
  relay: FakeRelay,
  o: { plan: boolean },
): Promise<LiveLinks> {
  const links = await setupPlan(page, recorded, relay);
  await seedRoster(page, ROSTER);
  await shareTrainerWithSquads(page);
  if (o.plan) {
    await openPlan(page);
    await addGame(page, { team: 'E2', date: '2026-11-07', time: '12:00', opponent: 'TSV Musterstadt' });
  }
  await sync(page);
  // R-E1: Das Trainer-Handy erzeugt das Eltern-Paket (nach dem ersten Stand vom Dienst).
  await page.goto('./#/live-spieltag');
  await page.clock.runFor(20_000);
  return links;
}

/** Eltern-Handy tippt "Ich tickere dieses Spiel" und bestätigt (beim ersten Mal mit Namen). */
async function tick(p: Page, name: string | null): Promise<void> {
  await p.getByTestId('dash-tick-E2').click();
  if (name !== null) {
    await expect(p.getByTestId('ticker-name-sheet')).toContainText('Die anderen sehen, dass du tickerst.');
    await p.getByTestId('ticker-name-input').fill(name);
    await p.getByTestId('ticker-name-ok').click();
  }
}

test('024 US1-S1 US1-S2 US1-S3 US1-S4 US1-S5 US1-S6 Paul tickert das Planspiel, alle sehen es', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await trainer(page, recorded, relay, { plan: true });
  const p = await openViewer(newDevice, relay, links);
  const z = await openViewer(newDevice, relay, links);
  await settle(p);

  // S1: Knopf auf der Karte, auch zugeklappt, mindestens 64 pt hoch
  const btn = p.getByTestId('dash-tick-E2');
  await expect(btn).toHaveText('Ich tickere dieses Spiel');
  expect((await btn.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(64);

  // S2: Name ist Pflicht (mindestens 2 Zeichen)
  await btn.click();
  await expect(p.getByTestId('ticker-name-ok')).toBeDisabled();
  await p.getByTestId('ticker-name-input').fill('P');
  await expect(p.getByTestId('ticker-name-ok')).toBeDisabled();
  await p.getByTestId('ticker-name-input').fill('Paul');
  await p.getByTestId('ticker-name-ok').click();

  // S3: Bestätigung mit Name
  await expect(p.getByTestId('ticker-confirm')).toContainText('Du tickerst E2 gegen TSV Musterstadt als Paul.');
  await p.getByTestId('ticker-go').click();

  // S4: Spielbildschirm vor dem Anpfiff, mit "Spiel läuft schon"; alle sehen "Paul tickert bereits"
  await expect(p).toHaveURL(/#\/live\/[A-Za-z0-9_-]+\/spiel\/[\w-]+$/);
  await expect(p.getByTestId('team-away')).toHaveText('TSV Musterstadt');
  await expect(p.getByTestId('btn-late')).toBeVisible();
  await settle(p);
  await settle(z);
  await expect(z.getByTestId('dash-ticker-E2')).toHaveText('Paul tickert bereits');
  await expect(z.getByTestId('dash-ticker-E2').locator('.ticker-tag')).toHaveText('Paul');
  await expect(z.getByTestId('dash-tick-E2')).toHaveCount(0);

  // S5: wie bei Trainern, aber ohne Navigation und ohne "Nicht live senden"; Kader zum Antippen (2B)
  await expect(p.getByTestId('nav')).toHaveCount(0);
  await expect(p.getByTestId('parent-as')).toContainText('Du tickerst als Paul');
  await p.getByTestId('btn-kickoff').click();
  await p.clock.runFor(2 * MIN);
  await p.getByTestId('btn-goal-own').click();
  await p
    .getByTestId('scorer-picker')
    .getByRole('button', { name: /^\d*\s*Max$/ })
    .click();
  await p.getByTestId('btn-menu').click();
  await expect(p.getByTestId('menu-live-toggle')).toHaveCount(0);
  await p.getByTestId('game-menu').getByRole('button', { name: 'Schließen' }).click();
  await settle(p);
  await expect
    .poll(async () => {
      const s = await latestState(relay, links.viewer);
      return [s?.by, s?.goals?.[0]?.who];
    })
    .toEqual(['Paul', 'Max']);
  await settle(z);
  await expect(z.getByTestId('dash-score-E2')).toHaveText('1:0');

  // S6: "Zum Spieltag" (wie der Reiter der Eltern-Leiste): "Du tickerst" und "Weiter tickern"
  await expect(p.getByTestId('parent-back')).toHaveText('Zum Spieltag');
  await p.getByTestId('parent-back').click();
  await expect(p.getByTestId('dash-ticker-E2')).toHaveText('Du tickerst');
  await p.getByTestId('dash-resume-E2').click();
  await expect(p.getByTestId('btn-goal-own')).toBeVisible();
});

test('024 US1-S3 gespeicherter Name: "Name ändern"; Trainer erscheint als "Trainer … tickert bereits"', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await trainer(page, recorded, relay, { plan: true });
  const p = await openViewer(newDevice, relay, links);
  await settle(p);
  await tick(p, 'Paul');
  await p.getByTestId('ticker-cancel').click();
  await tick(p, null);
  await p.getByTestId('ticker-rename').click();
  await p.getByTestId('ticker-name-input').fill('Pauli');
  await p.getByTestId('ticker-name-ok').click();
  await expect(p.getByTestId('ticker-confirm')).toContainText('als Pauli.');
  await p.getByTestId('ticker-cancel').click();

  // E1 tickert ein Trainer-Handy ohne Namen
  await page.goto('./#/neu');
  await page.getByTestId('team-chips').getByRole('button', { name: 'E1', exact: true }).click();
  await page.getByTestId('input-opponent').fill('FC Probestadt');
  await page.getByTestId('btn-create').click();
  await page.getByTestId('btn-kickoff').click();
  await settle(page);
  await settle(p);
  await expect(p.getByTestId('dash-ticker-E1')).toHaveText('Trainer tickert bereits');
});

test('024 US2-S1 US2-S2 US2-S3 US2-S4 US2-S5 Anna übernimmt von Paul', async ({ page, recorded, relay, newDevice }) => {
  const links = await trainer(page, recorded, relay, { plan: true });
  const p = await openViewer(newDevice, relay, links);
  const a = await openViewer(newDevice, relay, links);
  await settle(p);
  await tick(p, 'Paul');
  await p.getByTestId('ticker-go').click();
  await p.getByTestId('btn-kickoff').click();
  await p.clock.runFor(MIN);
  await p.getByTestId('btn-goal-own').click();
  await p.getByTestId('scorer-picker').getByRole('button', { name: /Ohne/ }).click();
  await settle(p);
  await settle(a);

  // S1, S2: "Paul tickert bereits", "Spiel übernehmen" nur aufgeklappt
  await expect(a.getByTestId('dash-ticker-E2')).toHaveText('Paul tickert bereits');
  await expect(a.getByTestId('dash-takeover-E2')).toHaveCount(0);
  await a.getByTestId('dash-toggle-E2').click();
  await a.getByTestId('dash-takeover-E2').click();
  await a.getByTestId('ticker-name-input').fill('Anna');
  await a.getByTestId('ticker-name-ok').click();

  // S3: Rückfrage mit Name und Stand
  await expect(a.getByTestId('ticker-takeover')).toContainText('Paul tickert bereits (1:0');
  await expect(a.getByTestId('ticker-takeover')).toContainText('Paul sieht, dass du übernommen hast.');
  await a.getByTestId('ticker-takeover-yes').click();

  // S4: Spiel mit Stand; ab jetzt sendet Anna
  await expect(a).toHaveURL(/#\/live\/[A-Za-z0-9_-]+\/spiel\/[\w-]+$/);
  await expect(a.getByTestId('score')).toContainText('1');
  await a.getByTestId('btn-goal-own').click();
  await a.getByTestId('scorer-picker').getByRole('button', { name: /Ohne/ }).click();
  await settle(a);
  await expect
    .poll(async () => {
      const s = await latestState(relay, links.viewer);
      return [s?.by, s?.h, s?.goals?.length];
    })
    .toEqual(['Anna', 1, 2]);

  // S5: Paul erfährt es und sendet nicht mehr
  await settle(p);
  await expect(p.getByTestId('live-handed-over')).toContainText(
    'Anna tickert jetzt E2. Hier wird nur noch lokal erfasst.',
  );
  await expect(p.getByTestId('parent-as')).toContainText('Nur noch lokal erfasst');
});

test('024 US2-S6 zweites Handy startet später: "Paul tickert bereits." mit Zuschauen', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await trainer(page, recorded, relay, { plan: true });
  const p = await openViewer(newDevice, relay, links);
  const a = await openViewer(newDevice, relay, links);
  await settle(p);
  await settle(a);
  await tick(p, 'Paul');
  await tick(a, 'Anna');
  await p.getByTestId('ticker-go').click();
  await settle(p);
  await a.getByTestId('ticker-go').click();
  await expect(a.getByTestId('ticker-busy')).toContainText('Paul tickert bereits.');
  await a.getByTestId('ticker-busy-watch').click();
  await expect(a.getByTestId('dashboard')).toBeVisible();
  await expect(a.getByTestId('dash-ticker-E2')).toHaveText('Paul tickert bereits');
});

test('024 US3-S1 US3-S2 US3-S4 Spiel fehlt? Selbst tickern (Nachholspiel)', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await trainer(page, recorded, relay, { plan: false });
  const p = await openViewer(newDevice, relay, links);
  const z = await openViewer(newDevice, relay, links);
  await settle(p);
  await p.getByTestId('dash-missing').click();
  await p.getByTestId('ticker-name-input').fill('Paul');
  await p.getByTestId('ticker-name-ok').click();

  // S2: Eltern-Fassung von "Neues Spiel"
  await expect(p.getByTestId('parent-new')).toBeVisible();
  await expect(p.getByTestId('parent-go')).toBeDisabled();
  await p.getByTestId('parent-team-E2').click();
  await p.getByTestId('parent-opponent').fill('SV Beispielstadt');
  await expect(p.getByTestId('new-live-switch')).toHaveCount(0);
  await expect(p.getByRole('button', { name: 'Zum Spieltag' })).toBeVisible();
  await expect(p.getByTestId('parent-go-help')).toHaveText('Das Spiel steht gleich live im Spieltag, als Paul.');
  await p.getByTestId('parent-go').click();

  // S4: Spiel angelegt, Karte für alle
  await expect(p.getByTestId('team-away')).toHaveText('SV Beispielstadt');
  await settle(p);
  await settle(z);
  await expect(z.getByTestId('dash-ticker-E2')).toHaveText('Paul tickert bereits');
});

test('024 US3-S3 Spiel fehlt, aber die Mannschaft wird schon getickert', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await trainer(page, recorded, relay, { plan: false });
  const p = await openViewer(newDevice, relay, links);
  const a = await openViewer(newDevice, relay, links);
  await settle(p);
  await p.getByTestId('dash-missing').click();
  await p.getByTestId('ticker-name-input').fill('Paul');
  await p.getByTestId('ticker-name-ok').click();
  await p.getByTestId('parent-team-E2').click();
  await p.getByTestId('parent-opponent').fill('SV Beispielstadt');
  await p.getByTestId('parent-go').click();
  await settle(p);
  await settle(a);
  await a.getByTestId('dash-missing').click();
  await a.getByTestId('ticker-name-input').fill('Anna');
  await a.getByTestId('ticker-name-ok').click();
  await a.getByTestId('parent-team-E2').click();
  await a.getByTestId('parent-opponent').fill('SV Beispielstadt');
  await a.getByTestId('parent-go').click();
  await expect(a.getByTestId('ticker-busy')).toContainText('Paul tickert bereits.');
  await expect(a.getByTestId('ticker-busy-new')).toBeVisible();
  await a.getByTestId('ticker-busy-watch').click();
  await expect(a.getByTestId('dashboard')).toBeVisible();
});

/** Paul tickert das Planspiel E2 und erzielt ein Tor (Kader-Auswahl ohne Torschützen). */
async function paulTicks(p: Page): Promise<void> {
  await settle(p);
  await tick(p, 'Paul');
  await p.getByTestId('ticker-go').click();
  await p.getByTestId('btn-kickoff').click();
  await p.clock.runFor(MIN);
  await p.getByTestId('btn-goal-own').click();
  await p.getByTestId('scorer-picker').getByRole('button', { name: /Ohne/ }).click();
  await settle(p);
}

test('024 US4-S1 US4-S2 US4-S3 US4-S4 Trainer schaltet "Eltern dürfen tickern" aus und wieder an', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await trainer(page, recorded, relay, { plan: true });
  const p = await openViewer(newDevice, relay, links);
  const z = await openViewer(newDevice, relay, links);
  await paulTicks(p);
  await settle(z);
  await expect(z.getByTestId('dash-score-E2')).toHaveText('1:0');

  // S1: Schalter je Mannschaft unter "Für Trainer", Vorgabe an
  await page.goto('./#/live-spieltag');
  await openTrainerSection(page);
  await expect(page.getByTestId('parent-allow-E1')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('parent-allow-E2')).toHaveAttribute('aria-checked', 'true');
  // Die ganze Zeile ist tippbar (Review C 024), nicht nur der Schalter
  await expect(page.getByRole('switch', { name: 'E2' })).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('live-parent-row-E2').getByText('E2').click();
  await expect(page.getByTestId('parent-allow-E2')).toHaveAttribute('aria-checked', 'false');
  await settle(page);

  // S3: Pauls Handy erfasst nur noch lokal
  await settle(p);
  await expect(p.getByTestId('live-handed-over')).toContainText(
    'Die Trainer haben das Tickern für Eltern ausgeschaltet. Hier wird nur noch lokal erfasst.',
  );
  await expect(p.getByTestId('parent-as')).toContainText('Nur noch lokal erfasst');

  // S2: weitere Tore von Paul ändern das Dashboard nicht; den Kader gibt es nicht mehr; keine Ticker-Knöpfe für E2
  await p.getByTestId('btn-goal-own').click();
  await expect(p.getByTestId('scorer-picker')).toHaveCount(0);
  await settle(p);
  await settle(z);
  await expect(z.getByTestId('dash-score-E2')).toHaveText('1:0');
  await z.getByTestId('dash-toggle-E2').click();
  await expect(z.getByTestId('dash-takeover-E2')).toHaveCount(0);

  // S4: wieder an: "Spiel übernehmen" erscheint wieder
  await page.getByTestId('parent-allow-E2').click();
  await expect(page.getByTestId('parent-allow-E2')).toHaveAttribute('aria-checked', 'true');
  await settle(page);
  await settle(z);
  await expect(z.getByTestId('dash-takeover-E2')).toBeVisible();
});

test('024 US5-S1 US5-S2 US5-S3 Trainer übernimmt das Eltern-Spiel in die Historie', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await trainer(page, recorded, relay, { plan: true });
  const p = await openViewer(newDevice, relay, links);
  await paulTicks(p);
  await p.getByTestId('btn-section-end').click();
  await p.getByTestId('confirm-yes').click();
  await p.getByTestId('btn-kickoff').click();
  await p.clock.runFor(MIN);
  await p.getByTestId('btn-section-end').click();
  await p.getByTestId('confirm-yes').click();
  await expect(p.getByTestId('parent-back-end')).toHaveText('Zum Spieltag');
  await settle(p);

  // S1: Frage auf dem Startbildschirm des Trainers
  await page.goto('./');
  await page.clock.runFor(5_000);
  const card = page.getByTestId('start-parent-E2');
  await expect(card).toContainText('Paul hat E2 gegen TSV Musterstadt getickert: 1:0. In deine Spiele übernehmen?');
  await card.getByTestId('start-parent-yes').click();
  await expect(page.getByTestId('start-parent-msg')).toHaveText('In deine Spiele übernommen.');
  await expect(card).toHaveCount(0);

  // S2: in der Historie mit "Getickert von Paul"
  await page.goto('./#/historie');
  await page.getByText('TSV Musterstadt').first().click();
  await expect(page.getByTestId('details-ticked-by')).toHaveText('Getickert von Paul');

  // S3: die Frage kommt nicht wieder
  await page.goto('./');
  await page.clock.runFor(5_000);
  await expect(page.getByTestId('start-parent-E2')).toHaveCount(0);
});

test('024 US4-S5 US2-S7 Trainer holt das Spiel auf "Live für Eltern" zurück', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await trainer(page, recorded, relay, { plan: true });
  const p = await openViewer(newDevice, relay, links);
  await paulTicks(p);
  await page.goto('./#/live-spieltag/dashboard');
  await page.clock.runFor(5_000);
  await expect(page.getByTestId('dash-ticker-E2')).toHaveText('Paul tickert bereits');
  await page.getByTestId('dash-toggle-E2').click();
  await page.getByTestId('dash-takeover-E2').click();
  await expect(page.getByTestId('ticker-takeover')).toContainText('Paul tickert bereits (1:0');
  await page.getByTestId('ticker-takeover-yes').click();
  await expect(page).toHaveURL(/#\/spiel\/[\w-]+$/);
  await expect(page.getByTestId('score')).toContainText('1');
  await page.getByTestId('btn-goal-own').click();
  await settle(page);
  await settle(p);
  await expect(p.getByTestId('live-handed-over')).toContainText('Trainer tickert jetzt E2.');
});

test('025 US2-S7 Eltern tickern mit den Tönen aus "Töne wählen" auf ihrem Handy', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await trainer(page, recorded, relay, { plan: true });
  const p = await openViewer(newDevice, relay, links);
  await settle(p);
  const rec = recordedOf(p);
  await p.getByTestId('dash-sound-choose').click();
  await p.getByTestId('sound-event-goalOwn').click();
  await p.getByTestId('sound-option-kinderjubel').click();
  await p.getByTestId('sound-sheet').getByRole('button', { name: 'Schließen' }).click();
  await p.getByTestId('dash-sounds-sheet').getByRole('button', { name: 'Schließen' }).click();
  const before = (await rec()).sounds;

  await tick(p, 'Paul');
  await p.getByTestId('ticker-go').click();
  await p.getByTestId('btn-kickoff').click();
  expect(await rec()).toMatchObject({ sounds: before + 1, lastSound: 'langer-pfiff' });
  await p.getByTestId('btn-goal-own').click();
  expect(await rec()).toMatchObject({ sounds: before + 2, lastSound: 'kinderjubel' });
});
