import { expect, test } from './fixtures';
import { addTeam, readStored, startGame } from './helpers';
import { asPath, createLive, pasteLeadLink, recordedOf } from './live-helpers';

/** Spec 006 US1: Live-Spieltag anlegen und Lead-Handys festlegen. */

test('006 US1-S1 Live-Spieltag mit E1 und E2 anlegen, Zuschauer- und Lead-Link teilen', async ({
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
  await expect(page.getByTestId('live-self-chip-E3')).toHaveCount(0);
  await page.getByTestId('live-self-chip-E1').click();
  await page.getByTestId('btn-live-save').click();

  await expect(page.getByTestId('live-title')).toHaveText('Unser Spieltag');
  await expect(page.getByTestId('live-lead-row-E1')).toContainText('dieses Handy');
  await expect(page.getByTestId('btn-share-lead-E1')).toHaveCount(0);
  await expect(page.getByTestId('live-lead-row-E3')).toHaveCount(0);

  await page.getByTestId('btn-share-viewer').click();
  await page.getByTestId('btn-share-lead-E2').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(2);
  const [viewer, lead] = (await recorded()).shares;
  expect(viewer?.text).toMatch(/^Unser Spieltag live verfolgen: http\S+#\/live\/[A-Za-z0-9_-]+$/);
  expect(lead?.text).toContain('Lead-Link für Feuerbach E2 ("Unser Spieltag")');
  expect(lead?.text).toMatch(/#\/lead\/[A-Za-z0-9_-]+$/);

  // Die Konfiguration geht verschlüsselt an den Dienst (FR-L19, SC-L06).
  await expect.poll(() => relay.all().length).toBe(1);
  expect(relay.all()[0]?.message).toMatch(/^t1\.[A-Za-z0-9_-]+$/);
  expect(relay.all()[0]?.message).not.toContain('Spieltag');
});

test('006 US1-S2 US1-S3 Lead-Link auf einem zweiten Handy einfügen; fehlende Mannschaft wird übernommen', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'], self: 'E1' });
  const b = await newDevice();
  await b.goto('./#/live-spieltag');
  await expect(b.getByTestId('live-empty')).toBeVisible();
  await b.getByTestId('btn-paste-link').click();
  await b.getByTestId('paste-link-input').fill(`Hier dein Lead-Link für E2:\n${links.lead.E2}\n\nDanke!`);
  await b.getByTestId('paste-link-apply').click();
  const dialog = b.getByTestId('couple-dialog');
  await expect(dialog).toContainText('Live senden für Feuerbach E2?');
  await expect(dialog).toContainText('„Unser Spieltag“');
  await expect(dialog).toContainText('Feuerbach E2 wird zu „Meine Mannschaften“ hinzugefügt.');
  await expect(b.getByTestId('couple-replace')).toHaveCount(0);
  await b.getByTestId('couple-yes').click();
  await expect(b.getByTestId('live-lead-info')).toContainText('Feuerbach E2');
  await expect(b.getByTestId('live-lead-info')).toContainText('an „Unser Spieltag“');

  // US1-S3: E2 steht mit Name und Trikots in "Meine Mannschaften".
  const stored = await readStored<{ teams: { name: string; homeColor: string; awayColor: string }[] }>(
    b,
    'settings',
    'app',
  );
  expect(stored?.teams).toEqual([
    expect.objectContaining({ name: 'Sportvg Feuerbach E2', homeColor: 'rot', awayColor: 'schwarz' }),
  ]);
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

  // Signatur passt nicht mehr: ein Zeichen im Zertifikat verändert
  const raw = links.lead.E2!;
  const data = raw.slice(raw.indexOf('/lead/') + 6);
  const json = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as { c: { d: string } };
  json.c.d = json.c.d.replace('E2', 'E1');
  const forged = raw.replace(data, Buffer.from(JSON.stringify(json)).toString('base64url'));
  await b.getByTestId('paste-link-input').fill(forged);
  await b.getByTestId('paste-link-apply').click();
  await expect(b.getByTestId('paste-link-error')).toHaveText('Dieser Lead-Link ist nicht gültig.');

  await b.getByTestId('paste-link-input').fill(links.lead.E2!);
  await b.getByTestId('paste-link-apply').click();
  await b.getByTestId('couple-no').click();
  await expect(b.getByTestId('couple-dialog')).toBeHidden();
  expect((await readStored<{ live: unknown }>(b, 'settings', 'app'))?.live ?? null).toBeNull();
});

test('006 US1-S2 Handy mit anderem Live-Spieltag: Hinweis, dass die alte Kopplung endet', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  const own = await createLive(b, recordedOf(b), { teams: ['D3'], title: 'D-Jugend' });
  expect(own.viewer).toBeTruthy();
  await b.getByTestId('btn-paste-link').click();
  await b.getByTestId('paste-link-input').fill(links.lead.E1!);
  await b.getByTestId('paste-link-apply').click();
  await expect(b.getByTestId('couple-replace')).toBeVisible();
  await b.getByTestId('couple-yes').click();
  await expect(b.getByTestId('live-lead-info')).toContainText('Feuerbach E1');
});

test('006 US1-S4 SC-L06 ohne Kopplung geht kein Request an ntfy.sh', async ({ page }) => {
  // Kein Relay: der Netzwerk-Wächter lässt jeden Request an Dritte scheitern.
  await startGame(page);
  await page.getByTestId('btn-goal-own').click();
  await page.goto('./#/live-spieltag');
  await expect(page.getByTestId('live-empty')).toBeVisible();
});

test('006 US1-S6 Lead-Link im Browser: Anleitung, Link kopieren, hier koppeln', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await b.goto(asPath(links.lead.E2!));
  const p = b.getByTestId('lead-link-page');
  await expect(p).toContainText('Lead-Link für Feuerbach E2');
  await expect(p).toContainText('Mehr → Live-Spieltag → „Lead-Link einfügen“');
  await expect(b.getByTestId('nav')).toHaveCount(0);
  await b.getByTestId('btn-copy-lead-link').click();
  const copied = await b.evaluate(() => (window as unknown as { __rec: { clipboard?: string } }).__rec.clipboard);
  expect(copied).toContain('#/lead/');
  await b.getByTestId('btn-couple-here').click();
  await b.getByTestId('couple-yes').click();
  await expect(b.getByTestId('live-lead-info')).toContainText('Feuerbach E2');

  await b.goto('./#/lead/kaputt');
  await expect(b.getByTestId('lead-link-invalid')).toBeVisible();
});

test('006 FR-L04 ein Handy kann für zwei Mannschaften senden', async ({ page, recorded, newDevice }) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await pasteLeadLink(b, links.lead.E1!);
  await pasteLeadLink(b, links.lead.E2!);
  await expect(b.getByTestId('live-lead-info')).toContainText('Feuerbach E1, Feuerbach E2');
});
