import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { chipLabel, forward } from './helpers';
import { createLive, pasteLink, type LiveLinks } from './live-helpers';
import type { Recorded } from './fixtures';
import { settle, shareTrainerWithSquads, squadTab, squadTabs, teamSquad, twoSquads, writes } from './paket-helpers';

/**
 * Spec 016 US3: Änderungen an geteilten Kadern kommen auf allen Trainer-Handys an, ohne Teilen oder Einfügen,
 * auch auf Handys, die Tage später öffnen. Fiktive Namen.
 */

test.use({ serviceWorkers: 'block' });

/** A (Atti) teilt beide Kader, B ist gekoppelt und hat sie. */
async function pair(page: Page, recorded: () => Promise<Recorded>, newDevice: () => Promise<Page>) {
  const links: LiveLinks = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  await twoSquads(page);
  await shareTrainerWithSquads(page);
  await settle(page);
  const b = await newDevice();
  await pasteLink(b, links.trainer);
  await b.goto('./#/kader');
  await expect(squadTabs(b)).toHaveText(['E1/E2 · 5', 'E3 · 1'], { timeout: 10_000 });
  return { links, b };
}

async function editPlayer(p: Page, name: string, change: { name?: string; number?: string; squad?: string }) {
  await p
    .getByTestId('roster-list')
    .getByRole('button', { name: `${name} ändern` })
    .click();
  if (change.name !== undefined) await p.getByTestId('input-player-name').fill(change.name);
  if (change.number !== undefined) await p.getByTestId('input-player-number').fill(change.number);
  if (change.squad !== undefined) await p.getByTestId('input-player-squad').selectOption({ label: change.squad });
  await p.getByTestId('btn-save-player').click();
}

const rows = (p: Page) => p.getByTestId('roster-list').locator('.roster-row');

test('016 US3-S1 hinzufügen, umbenennen, Nummer ändern, löschen: B hat es in 10 s', async ({
  page,
  recorded,
  newDevice,
}) => {
  const { b } = await pair(page, recorded, newDevice);
  await page.goto('./#/kader');
  await page.getByTestId('btn-add-player').click();
  await page.getByTestId('input-player-name').fill('Leo Mü.');
  await page.getByTestId('input-player-number').fill('23');
  await page.getByTestId('btn-save-player').click();
  await editPlayer(page, 'Tom', { name: 'Tom Be.' });
  await editPlayer(page, 'Max', { number: '17' });
  await page.getByTestId('roster-list').getByRole('button', { name: 'Ben löschen' }).click();
  await page.getByTestId('confirm-yes').click();
  await settle(page);
  await expect(rows(b)).toHaveText([/^11\s*Leo\b/, /^23\s*Leo Mü\./, /^17\s*Max\b/, /^14\s*Maxi/, /^10\s*Tom Be\./], {
    timeout: 10_000,
  });
  await expect(squadTabs(b)).toHaveText(['E1/E2 · 5', 'E3 · 1']);
});

test('016 US3-S2 B war Tage aus: beim Öffnen sind alle Änderungen da', async ({ page, recorded, relay, newDevice }) => {
  const { b } = await pair(page, recorded, newDevice);
  await b.goto('about:blank');
  await page.goto('./#/kader');
  const before = writes(relay, 'squad').length;
  await editPlayer(page, 'Leo', { number: '5' });
  await settle(page);
  await expect.poll(() => writes(relay, 'squad').length).toBeGreaterThan(before);
  await page.close();
  await b.clock.runFor(4 * 24 * 60 * 60_000);
  await b.goto('./#/kader');
  await expect(rows(b).filter({ hasText: 'Leo' })).toHaveText([/^5\s*Leo/], { timeout: 10_000 });
});

test('016 US3-S3 gleichzeitig offline geändert: je Kind gilt die jüngere Änderung, auf beiden gleich', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { b } = await pair(page, recorded, newDevice);
  await page.goto('./#/kader');
  relay.fail = true;
  await editPlayer(page, 'Tom', { number: '17' });
  await b.clock.runFor(60_000);
  await editPlayer(b, 'Tom', { name: 'Tom Be.' });
  relay.fail = false;
  for (const p of [page, b]) await p.clock.runFor(35_000);
  for (const p of [b, page]) await p.clock.runFor(35_000);
  for (const p of [page, b])
    await expect(rows(p).filter({ hasText: 'Tom' })).toHaveText([/^10\s*Tom Be\./], { timeout: 10_000 });
});

test('016 US3-S4 US3-S5 verschieben und umbenennen kommen an', async ({ page, recorded, newDevice }) => {
  const { b } = await pair(page, recorded, newDevice);
  await page.goto('./#/kader');
  await squadTab(page, /^E3/).click();
  await editPlayer(page, 'Paul', { squad: 'E1/E2' });
  await page.getByTestId('btn-rename-squad').click();
  await page.getByTestId('input-squad-name').fill('E3 Halle');
  await page.getByTestId('btn-save-squad').click();
  await settle(page);
  await expect(squadTabs(b)).toHaveText(['E1/E2 · 6', 'E3 Halle · 0'], { timeout: 10_000 });
  await b.goto('./#/einstellungen');
  await b.getByTestId('team-row-2').click();
  await expect(b.getByTestId('input-team-squad')).toHaveValue(/.+/);
  await expect(b.getByTestId('input-team-squad').locator('option:checked')).toHaveText('E3 Halle');
});

test('016 US3-S6 Kader einer Mannschaft ändern gilt auch auf B', async ({ page, recorded, newDevice }) => {
  const { b } = await pair(page, recorded, newDevice);
  await teamSquad(page, 1, 'E3');
  await settle(page);
  await b.clock.runFor(3_000);
  await b.goto('./#/neu');
  await b
    .getByTestId('team-chips')
    .getByRole('button', { name: chipLabel('Sportvg Feuerbach E2'), exact: true })
    .click();
  await expect(b.getByTestId('squad-picker').getByRole('button')).toHaveText(['4 Paul'], { timeout: 10_000 });
});

test('016 US3-S7 offene Torschützen-Auswahl bleibt offen, wenn eine Änderung ankommt', async ({
  page,
  recorded,
  newDevice,
}) => {
  const { b } = await pair(page, recorded, newDevice);
  await b.goto('./#/neu');
  await b
    .getByTestId('team-chips')
    .getByRole('button', { name: chipLabel('Sportvg Feuerbach E1'), exact: true })
    .click();
  await b.getByTestId('input-opponent').fill('TSV Musterstadt');
  await b.getByTestId('btn-create').click();
  await b.getByTestId('btn-kickoff').click();
  await forward(b, 60_000);
  await b.getByTestId('btn-goal-own').click();
  await expect(b.getByTestId('scorer-picker')).toBeVisible();
  await page.goto('./#/kader');
  await editPlayer(page, 'Max', { number: '17' });
  await settle(page);
  await page.waitForTimeout(1500);
  await expect(b.getByTestId('scorer-picker')).toBeVisible();
});

test('016 US3-S8 SC-B03 mit dem Zuschauer-Link lassen sich keine Kader lesen; beim Dienst kein Klartext', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { links } = await pair(page, recorded, newDevice);
  expect(writes(relay, 'squad').length).toBeGreaterThanOrEqual(2);
  for (const text of relay.posts) expect(text).not.toMatch(/Max|Paul|Maxi|E1\/E2/);
  const v = await newDevice();
  await v.goto(links.viewer.slice(links.viewer.indexOf('#')).replace(/^/, './'));
  await expect(v.getByTestId('dashboard')).toBeVisible();
  await v.clock.runFor(3_000);
  await expect(v.locator('body')).not.toContainText('Paul');
});
