import type { Page } from '@playwright/test';
import { expect, test, type Recorded } from './fixtures';
import { MIN, SEC } from './helpers';
import {
  createLive,
  e1At37,
  e2AtHalf,
  e3Ended,
  later,
  liveSnap,
  MATCHDAY,
  onMatchday,
  openViewer,
  sendAs,
  sendPlan,
  type LiveLinks,
} from './live-helpers';
import type { FakeRelay } from './relay';

/**
 * Spec 020 US4: Ehrlicher Live-Status je Spiel. Karte in Klartext ("gerade aktualisiert", "vor n Min aktualisiert",
 * ab 5 Minuten "Seit n Min keine Meldung vom Spielfeld"), ruhige Kopfzeile. Heute ist Sa 07.11.2026, 10:41.
 */

// Relay-Nachbau braucht blockierte Service Worker (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const T = MATCHDAY;

async function setup(
  page: Page,
  recorded: () => Promise<Recorded>,
  relay: FakeRelay,
  teams = ['E1'],
): Promise<LiveLinks> {
  const links = await createLive(page, recorded, { teams });
  onMatchday(relay);
  return links;
}

test('020 US4-S1 laufendes Spiel, Meldung unter 1 Minute alt: "37\' · gerade aktualisiert"', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setup(page, recorded, relay);
  await sendAs(relay, links.trainer, e1At37());
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText("37'");
  await expect(v.getByTestId('dash-fresh-E1')).toHaveText('gerade aktualisiert');
  await expect(v.getByTestId('dash-phaseline-E1')).toContainText("37' · gerade aktualisiert");
  // zugeklappt sichtbar, ohne Warnung
  await expect(v.getByTestId('dash-details-E1')).toHaveCount(0);
  await expect(v.getByTestId('dash-stale-E1')).toHaveCount(0);
});

test('020 US4-S2 1 bis 4 Minuten: "vor n Min aktualisiert", ändert sich ohne Neuladen', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setup(page, recorded, relay);
  await sendAs(relay, links.trainer, e1At37());
  const v = await openViewer(newDevice, relay, links);
  await v.evaluate(() => {
    (window as unknown as { __same: boolean }).__same = true;
  });
  await later(v, relay, MIN + 5 * SEC);
  await expect(v.getByTestId('dash-fresh-E1')).toHaveText('vor 1 Min aktualisiert');
  await later(v, relay, 2 * MIN);
  await expect(v.getByTestId('dash-fresh-E1')).toHaveText('vor 3 Min aktualisiert');
  await expect(v.getByTestId('dash-phaseline-E1')).toContainText("40' · vor 3 Min aktualisiert");
  await later(v, relay, MIN);
  await expect(v.getByTestId('dash-fresh-E1')).toHaveText('vor 4 Min aktualisiert');
  expect(await v.evaluate(() => (window as unknown as { __same?: boolean }).__same)).toBe(true);
});

test('020 US4-S3 ab 5 Minuten: Warnung zugeklappt sichtbar, Minute läuft weiter, kein "Letzte Meldung vor"', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setup(page, recorded, relay, ['E1', 'E2']);
  await sendAs(relay, links.trainer, e1At37());
  // E2: Uhr angehalten (z. B. Verletzung) zählt als laufendes Spiel
  await sendAs(
    relay,
    links.trainer,
    liveSnap({
      team: 'E2',
      now: T,
      clock: [
        ['kickoff', 10, 1],
        ['pause', 4, 1],
      ],
    }),
  );
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-phase-E2')).toHaveText('Uhr angehalten');
  // Die genaue Grenze (5:00) prüft der Unit-Test; hier genügt ein Abstand, der Last auf dem Rechner verträgt.
  await later(v, relay, 3 * MIN);
  await expect(v.getByTestId('dash-stale-E1')).toHaveCount(0);
  await later(v, relay, 2 * MIN + 10 * SEC);
  const warn = v.getByTestId('dash-stale-E1');
  await expect(warn).toBeVisible();
  await expect(warn).toContainText(/^Seit [5-6] Min keine Meldung vom Spielfeld$/);
  await later(v, relay, 2 * MIN);
  await expect(warn).toHaveText(/^Seit [7-8] Min keine Meldung vom Spielfeld$/);
  // zugeklappt, Minute läuft weiter
  await expect(v.getByTestId('dash-details-E1')).toHaveCount(0);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText(/^44'|45'$/);
  await expect(v.getByTestId('dash-fresh-E1')).toHaveCount(0);
  // Symbol nur Schmuck, der Text trägt die Aussage (FR-E34)
  await expect(warn.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  await expect(warn.getByRole('img')).toHaveCount(0);
  // Uhr angehalten: dieselbe Warnung
  await expect(v.getByTestId('dash-stale-E2')).toHaveText(/^Seit [7-8] Min keine Meldung vom Spielfeld$/);
  // auch aufgeklappt gibt es den alten Hinweis nicht mehr
  await v.getByTestId('dash-toggle-E1').click();
  await expect(v.getByTestId('dash-details-E1')).toBeVisible();
  await expect(v.getByText('Letzte Meldung vor')).toHaveCount(0);
  await expect(v.getByLabel(/Letzte Meldung vor/)).toHaveCount(0);
});

test('020 US4-S4 Halbzeit seit 12 Minuten ohne Meldung: nur die Phase, keine Warnung', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setup(page, recorded, relay, ['E2']);
  await sendAs(relay, links.trainer, e2AtHalf());
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-phase-E2')).toHaveText('Halbzeit');
  await later(v, relay, 12 * MIN);
  await expect(v.getByTestId('dash-phase-E2')).toHaveText('Halbzeit');
  await expect(v.getByTestId('dash-phaseline-E2')).toHaveText('Halbzeit');
  await expect(v.getByTestId('dash-fresh-E2')).toHaveCount(0);
  await expect(v.getByTestId('dash-stale-E2')).toHaveCount(0);
});

test('020 US4-S5 beendet, noch nicht angepfiffen und Planspiel: kein Alter, keine Warnung', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setup(page, recorded, relay, ['E1', 'E3', 'E4']);
  await sendAs(relay, links.trainer, liveSnap({ team: 'E1', now: T }));
  await sendAs(relay, links.trainer, e3Ended());
  await sendPlan(relay, links.trainer, [
    { i: 'p1', k: 'E4', d: '2026-11-14', t: '12:00', h: 1, o: 'TSV Musterstadt', u: 1 },
  ]);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText('noch nicht angepfiffen');
  await expect(v.getByTestId('dash-phase-E3')).toHaveText('Ende');
  await expect(v.getByTestId('dash-phase-E4')).toContainText('Sa 14.11., 12:00');
  await later(v, relay, 10 * MIN);
  for (const key of ['E1', 'E3', 'E4']) {
    await expect(v.getByTestId(`dash-fresh-${key}`)).toHaveCount(0);
    await expect(v.getByTestId(`dash-stale-${key}`)).toHaveCount(0);
  }
  await expect(v.getByTestId('dash-phase-E3')).toHaveText('Ende');
});

test('020 US4-S6 Kopfzeile: "Aktualisiert sich automatisch" ohne Punkt und ohne Uhrzeit, beim Verbinden "Verbinde …"', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setup(page, recorded, relay);
  const v = await openViewer(newDevice, relay, links);
  const status = v.getByTestId('dash-status');
  await expect(status).toHaveAttribute('data-state', 'live');
  await expect(status).toHaveText('Aktualisiert sich automatisch');
  await expect(status.locator('.live-pill__dot')).toHaveCount(0);
  await expect(status).not.toContainText('Uhr');
  await expect(status).not.toContainText('Live');

  // beim Verbinden (der Dienst antwortet erst nach einigen Sekunden)
  const other = await openViewerSlow(newDevice, relay, links);
  await expect(other.getByTestId('dash-status')).toHaveAttribute('data-state', 'connecting');
  await expect(other.getByTestId('dash-status')).toContainText('Verbinde …');
  relay.delayMs = 0;
});

test('020 US4-S7 Verbindung weg: hervorgehobener Hinweis wie bisher, danach wieder "Aktualisiert sich automatisch"', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setup(page, recorded, relay);
  const v = await openViewer(newDevice, relay, links);
  const status = v.getByTestId('dash-status');
  await expect(status).toHaveText('Aktualisiert sich automatisch');
  relay.fail = true;
  await expect(status).toHaveAttribute('data-state', 'offline');
  await expect(status).toContainText(/Keine Verbindung · Stand von 10:4\d Uhr\. Aktualisiert sich von selbst\./);
  await expect(status).toHaveClass(/dash__status--alert/);
  relay.fail = false;
  await v.clock.runFor(5 * SEC);
  await expect(status).toHaveAttribute('data-state', 'live');
  await expect(status).toHaveText('Aktualisiert sich automatisch');
});

test('020 US4-S8 FR-E64 ohne eigene Verbindung keine Warnung und kein Alter auf den Karten, danach wieder', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setup(page, recorded, relay, ['E1', 'E2']);
  await sendAs(relay, links.trainer, e1At37());
  await sendAs(
    relay,
    links.trainer,
    liveSnap({
      team: 'E2',
      now: T,
      clock: [
        ['kickoff', 10, 1],
        ['pause', 4, 1],
      ],
    }),
  );
  const v = await openViewer(newDevice, relay, links);
  const status = v.getByTestId('dash-status');
  await later(v, relay, 6 * MIN);
  await expect(v.getByTestId('dash-stale-E1')).toBeVisible();
  await expect(v.getByTestId('dash-stale-E2')).toBeVisible();

  // Das Gerät verliert die Verbindung: die Kopfzeile genügt.
  relay.fail = true;
  await expect(status).toHaveAttribute('data-state', 'offline');
  await expect(status).toContainText('Keine Verbindung');
  for (const key of ['E1', 'E2']) {
    await expect(v.getByTestId(`dash-stale-${key}`)).toHaveCount(0);
    await expect(v.getByTestId(`dash-fresh-${key}`)).toHaveCount(0);
    await expect(v.getByTestId(`dash-phaseline-${key}`)).not.toContainText('keine Meldung');
    await expect(v.getByTestId(`dash-phaseline-${key}`)).not.toContainText('aktualisiert');
    await expect(v.getByTestId(`dash-card-${key}`).locator('.dash-card__warn')).toHaveCount(0);
  }
  await expect(v.getByText('keine Meldung vom Spielfeld')).toHaveCount(0);
  // Die Minute läuft weiter.
  await expect(v.getByTestId('dash-phase-E1')).toHaveText(/^4\d'$/);

  // Verbindung zurück: Warnung wie bisher.
  relay.fail = false;
  await v.clock.runFor(5 * SEC);
  await expect(status).toHaveAttribute('data-state', 'live');
  await expect(v.getByTestId('dash-stale-E1')).toBeVisible();
  await expect(v.getByTestId('dash-stale-E2')).toBeVisible();
});

/** Zuschauer-Handy, dessen Verbindung beim Öffnen noch nicht steht (der Dienst antwortet verzögert). */
async function openViewerSlow(newDevice: () => Promise<Page>, relay: FakeRelay, links: LiveLinks): Promise<Page> {
  relay.delayMs = 4_000;
  const v = await newDevice();
  await v.clock.setSystemTime(Date.now() + relay.offsetMs);
  await v.goto(`./${links.viewer.slice(links.viewer.indexOf('#'))}`);
  await expect(v.getByTestId('dashboard')).toBeVisible();
  return v;
}
