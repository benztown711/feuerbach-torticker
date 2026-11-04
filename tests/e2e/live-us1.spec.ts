import { expect, test } from './fixtures';
import { addTeam, readStored, startGame } from './helpers';
import { asPath, createLive, recordedOf } from './live-helpers';

/** Spec 006 US1: Live-Spieltag anlegen und Trainergruppe koppeln (ein Trainer-Link für alle). */

// Service Worker blockieren, damit WebKit die Anfragen an ntfy.sh durch den Relay-Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

test('006 US1-S1 Live-Spieltag mit E1 und E2 anlegen, Zuschauer- und Trainer-Link teilen', async ({
  page,
  relay,
  recorded,
}) => {
  for (const t of ['E1', 'E2', 'E3']) await addTeam(page, `Sportvg Feuerbach ${t}`);
  await page.goto('./#/mehr');
  await page.getByTestId('more-live').click();
  await expect(page.getByTestId('live-empty')).toContainText('Was das Handy verlässt'.toUpperCase());
  await page.getByTestId('btn-live-create').click();
  await expect(page.getByTestId('input-live-title')).toHaveValue('Unser Spieltag');
  await page.getByTestId('live-team-chip-E3').click();
  await expect(page.locator('[data-testid^="live-self-chip-"]')).toHaveCount(0);
  await page.getByTestId('btn-live-save').click();

  await expect(page.getByTestId('live-title')).toHaveText('Unser Spieltag');
  await expect(page.getByTestId('live-team-row-E1')).toContainText('Feuerbach E1');
  await expect(page.getByTestId('live-team-row-E2')).toContainText('Feuerbach E2');
  await expect(page.getByTestId('live-team-row-E3')).toHaveCount(0);
  await expect(page.locator('[data-testid^="btn-share-lead-"]')).toHaveCount(0);

  await page.getByTestId('btn-share-viewer').click();
  await page.getByTestId('btn-share-trainer').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(2);
  const [viewer, trainer] = (await recorded()).shares;
  expect(viewer?.text).toMatch(/^Unser Spieltag live verfolgen: http\S+#\/live\/[A-Za-z0-9_-]+$/);
  expect(trainer?.text).toContain('Trainer-Link für "Unser Spieltag" (E1, E2). Nur in der Trainergruppe teilen.');
  expect(trainer?.text).toMatch(/#\/trainer\/[A-Za-z0-9_-]+$/);

  // Die Konfiguration geht verschlüsselt an den Dienst (FR-L19, SC-L06).
  await expect.poll(() => relay.all().length).toBe(1);
  expect(relay.all()[0]?.message).toMatch(/^t1\.[A-Za-z0-9_-]+$/);
  expect(relay.all()[0]?.message).not.toContain('Spieltag');
});

test('006 US1-S2 US1-S3 US1-S7 Trainer-Link auf einem zweiten Handy einfügen; Mannschaften übernommen, Links weitergeben', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await b.goto('./#/live-spieltag');
  await expect(b.getByTestId('live-empty')).toBeVisible();
  await b.getByTestId('btn-paste-link').click();
  await b.getByTestId('paste-link-input').fill(`Unser Trainer-Link:\n${links.trainer}\n\nDanke!`);
  await b.getByTestId('paste-link-apply').click();
  const dialog = b.getByTestId('couple-dialog');
  await expect(dialog).toContainText('Live senden für Feuerbach E1 und Feuerbach E2?');
  await expect(dialog).toContainText('„Unser Spieltag“');
  await expect(dialog).toContainText('darf es den Live-Spieltag auch verwalten');
  await expect(dialog).toContainText('Feuerbach E1 und Feuerbach E2 werden zu „Meine Mannschaften“ hinzugefügt.');
  await expect(b.getByTestId('couple-replace')).toHaveCount(0);
  await b.getByTestId('couple-yes').click();
  await expect(b.getByTestId('live-overview')).toBeVisible();
  await expect(b.getByTestId('live-title')).toHaveText('Unser Spieltag');
  await expect(b.getByTestId('live-team-row-E2')).toContainText('Feuerbach E2');

  // US1-S3: beide Mannschaften stehen mit Name und Trikots in "Meine Mannschaften".
  const stored = await readStored<{ teams: { name: string; homeColor: string; awayColor: string }[] }>(
    b,
    'settings',
    'app',
  );
  expect(stored?.teams).toEqual([
    expect.objectContaining({ name: 'Sportvg Feuerbach E1', homeColor: 'rot', awayColor: 'schwarz' }),
    expect.objectContaining({ name: 'Sportvg Feuerbach E2', homeColor: 'rot', awayColor: 'schwarz' }),
  ]);

  // US1-S7: auch das zweite Handy kann beide Links weitergeben.
  await b.getByTestId('btn-share-viewer').click();
  await b.getByTestId('btn-share-trainer').click();
  await expect.poll(async () => (await recordedOf(b)()).shares.length).toBe(2);
  const [viewer, trainer] = (await recordedOf(b)()).shares;
  expect(viewer?.text).toContain('#/live/');
  expect(trainer?.text).toContain('#/trainer/');
});

test('006 US1-S2 Abbrechen koppelt nicht; ungültige und veränderte Links werden abgelehnt', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await b.goto('./#/live-spieltag');
  await b.getByTestId('btn-paste-link').click();
  await b.getByTestId('paste-link-input').fill('irgendein Text');
  await b.getByTestId('paste-link-apply').click();
  await expect(b.getByTestId('paste-link-error')).toContainText('Kein gültiger Link');

  // Signatur passt nicht mehr: Titel in der Konfiguration verändert
  const raw = links.trainer;
  const data = raw.slice(raw.indexOf('/trainer/') + 9);
  const json = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as { g: { d: string } };
  json.g.d = json.g.d.replace('Unser Spieltag', 'Fremder Spieltag');
  const forged = raw.replace(data, Buffer.from(JSON.stringify(json)).toString('base64url'));
  await b.getByTestId('paste-link-input').fill(forged);
  await b.getByTestId('paste-link-apply').click();
  await expect(b.getByTestId('paste-link-error')).toHaveText('Dieser Trainer-Link ist nicht gültig.');

  await b.getByTestId('paste-link-input').fill(links.trainer);
  await b.getByTestId('paste-link-apply').click();
  await b.getByTestId('couple-no').click();
  await expect(b.getByTestId('couple-dialog')).toBeHidden();
  expect((await readStored<{ live: unknown }>(b, 'settings', 'app'))?.live ?? null).toBeNull();
});

test('006 US1-S2 Trainer-Handy eines anderen Live-Spieltags: Warnung, dass die alte Kopplung endet', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await createLive(b, recordedOf(b), { teams: ['D3'], title: 'D-Jugend' });
  await b.getByTestId('btn-paste-link').click();
  await b.getByTestId('paste-link-input').fill(links.trainer);
  await b.getByTestId('paste-link-apply').click();
  await expect(b.getByTestId('couple-replace')).toContainText('Dieses Handy ist Trainer-Handy für „D-Jugend“');
  await b.getByTestId('couple-yes').click();
  await expect(b.getByTestId('live-title')).toHaveText('Unser Spieltag');
});

test('006 US1-S4 SC-L06 ohne Kopplung geht kein Request an ntfy.sh', async ({ page }) => {
  // Kein Relay: der Netzwerk-Wächter lässt jeden Request an Dritte scheitern.
  await startGame(page);
  await page.getByTestId('btn-goal-own').click();
  await page.goto('./#/live-spieltag');
  await expect(page.getByTestId('live-empty')).toBeVisible();
});

test('006 US1-S6 Trainer-Link im Browser: Anleitung, Link kopieren, hier koppeln', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await b.goto(asPath(links.trainer));
  const p = b.getByTestId('lead-link-page');
  await expect(p).toContainText('Trainer-Link für „Unser Spieltag“');
  await expect(p).toContainText('Feuerbach E1 und Feuerbach E2');
  await expect(p).toContainText('Mehr → Live-Spieltag → „Trainer-Link einfügen“');
  await expect(b.getByTestId('nav')).toHaveCount(0);
  await b.getByTestId('btn-copy-lead-link').click();
  const copied = await b.evaluate(() => (window as unknown as { __rec: { clipboard?: string } }).__rec.clipboard);
  expect(copied).toContain('#/trainer/');
  await b.getByTestId('btn-couple-here').click();
  await b.getByTestId('couple-yes').click();
  await expect(b.getByTestId('live-overview')).toBeVisible();

  await b.goto('./#/trainer/kaputt');
  await expect(b.getByTestId('lead-link-invalid')).toContainText('Dieser Trainer-Link ist nicht gültig.');
});
