import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MIN } from './helpers';
import { decodeMessage, openViewer, type LiveLinks } from './live-helpers';
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

  // S6: "Zurück zu Live": "Du tickerst" und "Weiter tickern"
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
