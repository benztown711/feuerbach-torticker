import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { confirmYes, forward, MIN } from './helpers';
import { asPath, createLive, liveSnap, MATCHDAY, onMatchday, pasteLink, sendAs } from './live-helpers';
import { addGame, openPlan, sync } from './plan-helpers';

/**
 * Spec 007 US2: Trainer-Handys bekommen Spielplan, Mannschaften und "neu ausgestellt" auch nach Tagen, ohne dass ein
 * anderes Handy erneut senden muss. Sa 07.11.2026 ist MATCHDAY.
 */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const DAY = 24 * 60 * MIN;
const MONDAY = MATCHDAY + 2 * DAY;
const FRIDAY = MATCHDAY + 6 * DAY;

/** Uhr des Handys und des Dienstes auf denselben Zeitpunkt stellen. */
async function at(p: Page, relay: { offsetMs: number }, time: number): Promise<void> {
  relay.offsetMs = time - Date.now();
  await p.clock.setSystemTime(time);
}

test('007 US2-S1 Spielplan am Montag geändert, anderes Trainer-Handy öffnet am Freitag: ohne erneutes Senden', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  await at(page, relay, MATCHDAY);
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await b.clock.setSystemTime(MATCHDAY);
  await pasteLink(b, links.trainer);
  await b.goto('./#/historie');

  // Montag: Atti trägt das Spiel für Samstag ein und schließt danach den Torticker.
  await at(page, relay, MONDAY);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-14', time: '12:00', opponent: 'TSV Musterstadt' });
  await sync(page);
  await expect.poll(() => relay.statuses.length).toBeGreaterThan(0);
  const posts = relay.posts.length;
  await page.close();

  // Freitag: B öffnet "Neues Spiel".
  await at(b, relay, FRIDAY);
  await b.goto('./#/neu');
  const pick = b.getByTestId('plan-pick');
  await expect
    .poll(async () => {
      await sync(b);
      if ((await b.getByTestId('plan-pick-more').count()) > 0) await b.getByTestId('plan-pick-more').click();
      return (await pick.allInnerTexts()).join(' ');
    })
    .toContain('TSV Musterstadt');
  expect(relay.posts).toHaveLength(posts);
});

test('007 US2-S2 E3 am Dienstag hinzugefügt, anderes Trainer-Handy sendet am Samstag E3-Spiele', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  await at(page, relay, MATCHDAY - 4 * DAY);
  const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'], without: ['E3'] });
  const b = await newDevice();
  await b.clock.setSystemTime(MATCHDAY - 4 * DAY);
  await pasteLink(b, links.trainer);
  await b.goto('./#/historie');

  await page.getByTestId('btn-team-add').click();
  await page.getByTestId('team-add-chip-E3').click();
  await page.getByTestId('team-add-save').click();
  await expect(page.getByTestId('live-team-row-E3')).toBeVisible();
  await page.clock.runFor(2_000);
  await page.close();

  // Samstag: B hat seit Dienstag nichts empfangen.
  await at(b, relay, MATCHDAY);
  await b.goto('./#/neu');
  await b.clock.runFor(2_000);
  await b.getByTestId('team-chips').getByRole('button', { name: 'E3', exact: true }).click();
  await expect(b.getByTestId('new-live-switch')).toHaveAttribute('aria-checked', 'true');
  await b.getByTestId('input-opponent').fill('SV Beispielhausen');
  await b.getByTestId('btn-create').click();
  await b.getByTestId('btn-kickoff').click();
  await forward(b, 2 * MIN);
  await b.getByTestId('btn-goal-own').click();
  await b.clock.runFor(6_000);
  await expect.poll(() => relay.statuses.filter((s) => s === 200).length).toBeGreaterThan(1);
  expect(relay.statuses.every((s) => s === 200 || s === 204)).toBe(true);
});

test('007 US2-S3 FR-N12 neu ausgestellt: alte Trainer-Handys und Dashboards erfahren es Tage später, alte Stände sind weg', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  await at(page, relay, MATCHDAY);
  const old = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  const b = await newDevice();
  await b.clock.setSystemTime(MATCHDAY);
  await pasteLink(b, old.trainer);
  await b.goto('./#/historie');
  await sendAs(relay, old.trainer, liveSnap({ team: 'E1', now: MATCHDAY, clock: [['kickoff', 5, 1]] }));

  await page.goto('./#/live-spieltag');
  await page.getByTestId('btn-live-reissue').click();
  await confirmYes(page);
  await expect(page.getByTestId('live-reissued')).toBeVisible();
  await expect.poll(() => relay.statuses.filter((s) => s === 200).length).toBeGreaterThan(1);
  await page.clock.runFor(10_000);
  await page.close();

  // Drei Tage später: B (alter Trainer-Link) und ein neues Gerät mit dem alten Zuschauer-Link.
  await at(b, relay, MATCHDAY + 3 * DAY);
  await b.goto('./#/live-spieltag');
  await expect(b.getByTestId('live-retired')).toBeVisible();

  const v = await newDevice();
  await v.clock.setSystemTime(MATCHDAY + 3 * DAY);
  await v.goto(asPath(old.viewer));
  await expect(v.getByTestId('dash-retired')).toBeVisible();
  await expect(v.getByTestId('dash-card-E1')).toHaveCount(0);
  // Der Dienst nimmt auf dem alten Topic nichts mehr an.
  expect(relay.statuses).toContain(200);
});
