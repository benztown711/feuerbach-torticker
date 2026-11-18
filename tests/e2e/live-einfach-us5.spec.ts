import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { confirmYes, readStored } from './helpers';
import {
  createLive,
  e1At37,
  manifestOf,
  MATCHDAY,
  onMatchday,
  openTrainerSection,
  openViewer,
  pasteLink,
  sendAs,
} from './live-helpers';

/**
 * Spec 020 US5: Eltern-Ansicht ohne Ausgang in die Trainer-App. Fußzeile "Aktualisiert sich von selbst.", Weg für
 * Eltern, die selbst trainieren, über die Eltern-Hilfe; Dashboard in der App nennt "Live für Eltern".
 */

// Relay-Nachbau braucht blockierte Service Worker (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const foot = (v: Page) => v.getByTestId('dash-foot').locator('p');

test('020 US5-S1 FR-E40 FR-E65 Fußzeile mit Karten: nur "Tippe auf ein Spiel …" (geändert durch Nachbesserung 2026-11-18)', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  await sendAs(relay, links.trainer, e1At37());
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('2:1');
  await expect(foot(v)).toHaveText(['Tippe auf ein Spiel für Tore und Details.']);
  await expect(v.getByRole('link', { name: 'Zum Torticker' })).toHaveCount(0);
  await expect(v.getByText('Nur lesen.')).toHaveCount(0);
  await expect(v.getByTestId('dash-foot').getByRole('link')).toHaveCount(0);
});

test('020 US5-S2 FR-E40 FR-E65 ohne Spiel: nur "Aktualisiert sich von selbst."', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-empty')).toBeVisible();
  await expect(foot(v)).toHaveText(['Aktualisiert sich von selbst.']);
  await expect(v.getByRole('link', { name: 'Zum Torticker' })).toHaveCount(0);
});

test('020 US5-S3 FR-E41 Eltern-Hilfe: neuer Eintrag mit "Torticker öffnen", sonst kein Eintrag mit Knopf', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  const v = await openViewer(newDevice, relay, links);
  await v.getByTestId('viewer-nav-help').click();
  const rows = v.getByTestId('help-results').locator('[data-testid^="help-row-"]');
  await expect(rows).toHaveText([
    'Wie verfolge ich die Spiele als Elternteil?',
    'Wo sehe ich frühere Ergebnisse?',
    'Wie lege ich den Spieltag auf den Home-Bildschirm?',
    'Wie teile ich den Spieltag mit Familie und Freunden?',
    'Was bedeutet „Keine Verbindung“?',
    'Merke ich, wenn ein Tor fällt?',
    'Was bedeutet „keine Meldung vom Spielfeld“?',
    'Ich trainiere selbst. Wo finde ich den Torticker?',
    'Welche Daten verlassen mein Handy?',
  ]);
  const ids = await rows.evaluateAll((els) => els.map((e) => (e.getAttribute('data-testid') ?? '').slice(9)));
  const base = new URL(v.url()).hash.replace(/\/hilfe.*$/, '/hilfe');
  for (const id of ids) {
    await v.evaluate((h) => {
      window.location.hash = h;
    }, `${base}/${id}`);
    await expect(v.getByTestId('help-entry')).toBeVisible();
    await expect(v.getByTestId('help-open'), id).toHaveCount(id === 'selbst-trainieren' ? 1 : 0);
  }
  await v.evaluate((h) => {
    window.location.hash = h;
  }, `${base}/selbst-trainieren`);
  await expect(v.getByTestId('help-open')).toHaveText('Torticker öffnen');
  // Verwandte Einträge nur aus der Eltern-Hilfe
  await expect(v.getByTestId('help-related').locator('[data-testid^="help-row-"]')).toHaveText([
    'Wie lege ich den Spieltag auf den Home-Bildschirm?',
  ]);
});

test('020 US5-S4 FR-E41 "Torticker öffnen" führt zum Startbildschirm, ohne Umleitung, mit dem Manifest der App', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  const v = await openViewer(newDevice, relay, links);
  await expect
    .poll(async () => (await readStored<{ liveView: { topic: string } | null }>(v, 'settings', 'app'))?.liveView)
    .toBeTruthy();
  // Wie vom Home-Bildschirm: Start öffnet das gemerkte Dashboard
  await v.goto('./');
  await expect(v.getByTestId('dashboard')).toBeVisible();
  expect(v.url()).toContain('#/live/');
  await v.getByTestId('viewer-nav-help').click();
  await v.getByTestId('help-row-selbst-trainieren').click();
  await expect(v.getByTestId('help-entry')).toContainText('Neues Spiel');
  await v.getByTestId('help-open').click();
  await expect(v.getByTestId('btn-new-game')).toBeVisible();
  await v.clock.runFor(2_000);
  await expect(v.getByTestId('btn-new-game')).toBeVisible();
  await expect.poll(() => manifestOf(v)).toBe('/feuerbach-torticker/manifest.webmanifest');
});

test('020 US5-S5 Dashboard in der App: Fußzeile unverändert, ohne den Eltern-Satz', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  await page.clock.setSystemTime(MATCHDAY);
  await sendAs(relay, links.trainer, e1At37());
  await page.goto('./#/live-spieltag/dashboard');
  await expect(page.getByTestId('dash-score-E1')).toHaveText('2:1');
  await expect(foot(page)).toHaveText(['Tippe auf ein Spiel für Tore und Details.']);
  await expect(page.getByText('Aktualisiert sich von selbst.')).toHaveCount(0);
});

test('020 US5-S6 FR-E42 Texte in der App: Hinweis bei neu ausgestelltem Live-Spieltag und ohne Live-Spieltag', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const old = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  const b = await newDevice();
  await pasteLink(b, old.trainer);
  await page.goto('./#/live-spieltag');
  await openTrainerSection(page);
  await page.getByTestId('btn-live-reissue').click();
  await confirmYes(page);
  await expect(page.getByTestId('live-reissued')).toBeVisible();

  // B (alter Trainer-Link) erfährt es im Dashboard der App
  await b.goto('./#/live-spieltag/dashboard');
  await expect(b.getByTestId('dash-retired')).toHaveText(
    '„Unser Spieltag“ wurde neu ausgestellt. Füge den neuen Trainer-Link aus eurer Trainergruppe ein (Mehr → Live für Eltern → Für Trainer).',
  );

  // Ein Handy ohne Live-Spieltag
  const c = await newDevice();
  await c.goto('./#/live-spieltag/dashboard');
  await expect(c.getByTestId('dashboard-none')).toContainText('Noch kein Live-Spieltag auf diesem Handy.');
  await c.getByRole('button', { name: 'Zu „Live für Eltern“' }).click();
  await expect(c).toHaveURL(/#\/live-spieltag$/);
});

test('020 US5-S7 FR-E65 Kopf- und Fußzeile sagen nicht dasselbe (Eltern-Ansicht und App)', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  await sendAs(relay, links.trainer, e1At37());
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('2:1');
  // Kopfzeile sagt es, die Fußzeile erklärt nur die Bedienung.
  await expect(v.getByTestId('dash-status')).toHaveText('Aktualisiert sich automatisch');
  await expect(foot(v)).toHaveText(['Tippe auf ein Spiel für Tore und Details.']);
  await expect(v.getByText(/Aktualisiert sich/)).toHaveCount(1);

  // In der App ebenso; ohne Karten steht der Satz nur in der Fußzeile der Eltern-Ansicht (S2).
  await page.clock.setSystemTime(MATCHDAY);
  await page.goto('./#/live-spieltag/dashboard');
  await expect(page.getByTestId('dash-score-E1')).toHaveText('2:1');
  await expect(foot(page)).toHaveText(['Tippe auf ein Spiel für Tore und Details.']);
  await expect(page.getByText(/Aktualisiert sich/)).toHaveCount(1);
});
