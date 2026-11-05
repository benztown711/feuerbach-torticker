import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { confirmYes, forward, MIN, startGame } from './helpers';
import {
  asPath,
  createLive,
  latestState,
  liveSnap,
  MATCHDAY,
  onMatchday,
  openViewer,
  pasteLink,
  recordedOf,
  sendAs,
  type LiveLinks,
} from './live-helpers';

/**
 * Spec 006 US5: Live-Spieltag verwalten. Jedes Trainer-Handy ändert Titel und Mannschaften, stellt alle
 * Links neu aus oder beendet die Kopplung; die Sicherung nimmt den Live-Spieltag mit (FR-L21).
 */

// Service Worker blockieren, damit WebKit die Anfragen an ntfy.sh durch den Relay-Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const E1 = 'Sportvg Feuerbach E1';
const E2 = 'Sportvg Feuerbach E2';

/** Lässt den Sender seine Bündelung (5 s) abarbeiten. */
const settle = (page: Page) => page.clock.runFor(6_000);

/** Aktuelle Links über die Teilen-Knöpfe der Übersicht. */
async function currentLinks(page: Page): Promise<LiveLinks> {
  const rec = recordedOf(page);
  const before = (await rec()).shares.length;
  await page.getByTestId('btn-share-viewer').click();
  await page.getByTestId('btn-share-trainer').click();
  await expect.poll(async () => (await rec()).shares.length).toBe(before + 2);
  const [viewer, trainer] = (await rec()).shares.slice(before);
  const url = (t?: string) => /(https?:\/\/\S+#\/(?:live|trainer)\/[A-Za-z0-9_-]+)/.exec(t ?? '')?.[1] ?? '';
  return { viewer: url(viewer?.text), trainer: url(trainer?.text) };
}

const openLive = async (page: Page) => {
  await page.goto('./#/live-spieltag');
  await expect(page.getByTestId('live-overview')).toBeVisible();
};

test('006 US5-S4 Titel ändern: das Dashboard zeigt den neuen Titel', async ({ page, recorded, relay, newDevice }) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  await page.getByTestId('btn-live-title').click();
  await page.getByTestId('input-title-edit').fill('   ');
  await page.getByTestId('title-save').click();
  await expect(page.getByTestId('title-error')).toHaveText('Bitte einen Titel eintragen.');
  await page.getByTestId('input-title-edit').fill('Unser Spieltag E1 & E2');
  await page.getByTestId('title-save').click();
  await expect(page.getByTestId('live-title')).toHaveText('Unser Spieltag E1 & E2');
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-title')).toHaveText('Unser Spieltag E1 & E2');
});

test('006 US5-S1 E3 hinzufügen: anderes Trainer-Handy übernimmt E3, der Zuschauer-Link zeigt das E3-Spiel', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'], without: ['E3'] });
  onMatchday(relay);
  const b = await newDevice();
  await pasteLink(b, links.trainer);

  await page.getByTestId('btn-team-add').click();
  await page.getByTestId('team-add-chip-E3').click();
  await page.getByTestId('team-add-save').click();
  await expect(page.getByTestId('live-team-row-E3')).toBeVisible();
  // Zuschauer- und Trainer-Link bleiben gleich
  expect(await currentLinks(page)).toEqual(links);

  // B kennt E3 noch nicht; "Neues Spiel" empfängt die neue Mannschaftsliste und zeigt E3 mit Live-Schalter.
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

  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-card-E3')).toBeVisible();
  await expect(v.getByTestId('dash-score-E3')).toHaveText('1:0');
});

test('006 US5 Mannschaft entfernen: das Dashboard zeigt sie nicht mehr', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  await sendAs(relay, links.trainer, liveSnap({ team: 'E2', now: MATCHDAY, clock: [['kickoff', 10, 1]] }));
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-card-E2')).toBeVisible();
  await page.getByTestId('btn-team-remove-E2').click();
  await confirmYes(page);
  await expect(page.getByTestId('live-team-row-E2')).toHaveCount(0);
  // die letzte Mannschaft lässt sich nicht entfernen
  await expect(page.getByTestId('btn-team-remove-E1')).toHaveCount(0);
  await expect(v.getByTestId('dash-card-E2')).toHaveCount(0);
});

test('006 US5 Übersicht: je Mannschaft "zuletzt gesendet"', async ({ page, recorded, relay }) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  await startGame(page, { ownTeam: E1, opponent: 'TSV Musterstadt' });
  await settle(page);
  await expect.poll(async () => (await latestState(relay, links.viewer))?.team).toBe('E1');
  await openLive(page);
  await expect(page.getByTestId('live-team-sent-E1')).toHaveText(/^zuletzt gesendet heute \d\d:\d\d Uhr$/);
  await expect(page.getByTestId('live-team-sent-E2')).toHaveText('noch nichts gesendet');
});

test('006 US5-S2 Kopplung beenden: das Handy sendet nichts mehr, die Spiele bleiben', async ({
  page,
  recorded,
  relay,
}) => {
  await createLive(page, recorded, { teams: ['E1'] });
  await startGame(page, { ownTeam: E1, opponent: 'TSV Musterstadt' });
  await settle(page);
  await openLive(page);
  await page.getByTestId('btn-live-end').click();
  await confirmYes(page);
  await expect(page.getByTestId('live-empty')).toBeVisible();
  const before = relay.all().length;
  await page.getByTestId('nav-game').click();
  await expect(page.getByTestId('live-pill')).toHaveCount(0);
  await page.getByTestId('btn-goal-own').click();
  await settle(page);
  expect(relay.all().length).toBe(before);
  await page.getByTestId('nav-history').click();
  await expect(page.getByTestId('history-list')).toContainText('TSV Musterstadt');
});

test('006 US5-S3 alle Links neu ausstellen: neue Links, Meldungen über die alten erscheinen nicht', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const old = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  await page.getByTestId('btn-live-reissue').click();
  await confirmYes(page);
  await expect(page.getByTestId('live-reissued')).toBeVisible();
  const links = await currentLinks(page);
  expect(links.viewer).not.toBe(old.viewer);
  expect(links.trainer).not.toBe(old.trainer);

  // Wer den alten Trainer-Link hat, erreicht das neue Dashboard nicht mehr.
  await sendAs(relay, old.trainer, liveSnap({ team: 'E2', now: MATCHDAY, clock: [['kickoff', 10, 1]] }));
  await startGame(page, { ownTeam: E1, opponent: 'TSV Musterstadt' });
  await settle(page);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-card-E1')).toBeVisible();
  await expect(v.getByTestId('dash-card-E2')).toHaveCount(0);
  // Der alte Zuschauer-Link zeigt das neue Spiel nicht.
  const w = await newDevice();
  await w.clock.setSystemTime(Date.now() + relay.offsetMs);
  await w.goto(asPath(old.viewer));
  await expect(w.getByTestId('dash-card-E2')).toBeVisible();
  await expect(w.getByTestId('dash-card-E1')).toHaveCount(0);
});

test('006 US5-S5 zwei Handys erfassen dasselbe E2-Spiel: beide auf der Karte, "Nicht live senden" entfernt eines', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  await startGame(page, { ownTeam: E2, opponent: 'TSV Musterstadt' });
  await settle(page);
  await sendAs(
    relay,
    links.trainer,
    liveSnap({ team: 'E2', gameId: 'ersatzhandy', now: MATCHDAY, createdAgo: 60, clock: [['kickoff', 40, 1]] }),
  );
  const v = await openViewer(newDevice, relay, links);
  await v.getByTestId('dash-toggle-E2').click();
  await expect(v.getByTestId('dash-earlier-E2')).toBeVisible();
  await page.getByTestId('btn-menu').click();
  await page.getByTestId('menu-live-toggle').click();
  await settle(page);
  await expect(v.getByTestId('dash-earlier-E2')).toHaveCount(0);
  await expect(v.getByTestId('dash-card-E2')).toBeVisible();
});

test('006 FR-L21 Sicherung mit Live-Spieltag: neues Handy ist ohne neue Links gekoppelt', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'], title: 'Saison 26/27' });
  await page.goto('./#/einstellungen');
  await expect(page.getByTestId('backup-live-hint')).toBeVisible();
  await page.getByTestId('btn-export').click();
  await expect.poll(async () => (await recorded()).shares.filter((s) => s.fileName).length).toBe(1);
  const file = (await recorded()).shares.find((s) => s.fileName)?.fileText ?? '';
  expect(JSON.parse(file).live).toMatchObject({ v: 1 });

  const d = await newDevice();
  await d.goto('./#/einstellungen');
  await d
    .getByTestId('input-import')
    .setInputFiles({ name: 'sicherung.json', mimeType: 'application/json', buffer: Buffer.from(file) });
  await expect(d.getByTestId('import-result')).toContainText('Live-Spieltag „Saison 26/27“ übernommen');
  await openLive(d);
  await expect(d.getByTestId('live-title')).toHaveText('Saison 26/27');
  expect(await currentLinks(d)).toEqual(links);

  // Ein Handy mit eigenem Live-Spieltag behält ihn.
  await page.goto('./#/einstellungen');
  await page
    .getByTestId('input-import')
    .setInputFiles({ name: 'sicherung.json', mimeType: 'application/json', buffer: Buffer.from(file) });
  await expect(page.getByTestId('import-result')).toContainText('Live-Spieltag nicht übernommen');
});
