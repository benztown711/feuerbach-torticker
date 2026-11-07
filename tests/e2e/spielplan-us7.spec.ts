import { expect, test } from './fixtures';
import { openViewer, sendPlan } from './live-helpers';
import { setupPlan } from './plan-helpers';

/**
 * Spec 015 US7: Ganzer Spielplan für Eltern. Unter den Karten steht "Spielplan": kommende Spiele ab morgen nach
 * Datum (das nächste aufgeklappt), darunter eingeklappt "Vergangene Spiele" mit Endstand. Heute ist Sa 07.11.2026.
 */

// Service Worker blockieren, damit WebKit die Anfragen an ntfy.sh durch den Relay-Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const entry = (i: string, k: string, d: string, more: Record<string, unknown> = {}) => ({
  i,
  k,
  d,
  t: '12:00',
  h: 1,
  o: 'TSV Musterstadt',
  w: 'Kreisstaffel',
  u: 1,
  ...more,
});

const PLAN = [
  entry('heute', 'E1', '2026-11-07'),
  entry('a', 'E1', '2026-11-14', { t: '11:00' }),
  entry('b', 'E2', '2026-11-14', { h: 0, o: 'SV Beispielhausen' }),
  entry('c', 'E1', '2026-11-21', { o: 'FC Probestadt' }),
  entry('d', 'E2', '2026-11-21', { c: 1, o: 'SG Ausfall' }),
  entry('alt', 'E1', '2026-10-31', { h: 0, o: 'FC Kirchberg', s: [3, 1] }),
  entry('ab', 'E2', '2026-11-01', { c: 1, o: 'SV Regen' }),
  entry('offen', 'E2', '2026-11-28'),
];
delete (PLAN[7] as Record<string, unknown>).o;

test('015 US7-S1 US7-S2 Spielplan ab morgen nach Datum, nächstes Datum offen, je Spiel Anstoß, Gegner, Wettbewerb', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setupPlan(page, recorded, relay);
  await sendPlan(relay, links.trainer, PLAN);
  const v = await openViewer(newDevice, relay, links);
  const plan = v.getByTestId('dash-plan');
  await expect(plan).toBeVisible();
  // heutiges Spiel steht als Karte darüber, nicht noch einmal im Plan
  await expect(v.getByTestId('dash-phase-E1')).toHaveText('heute 12:00 · Kreisstaffel');
  await expect(v.getByTestId('dash-plan-row-heute')).toHaveCount(0);

  const first = v.getByTestId('dash-plan-2026-11-14');
  await expect(first.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  await expect(first.getByRole('button')).toContainText('2 Spiele');
  await expect(first.locator('[data-testid^="dash-plan-row-"]')).toHaveText([
    /11:00.*E1 gegen TSV Musterstadt.*Kreisstaffel/,
    /12:00.*E2 bei SV Beispielhausen.*Kreisstaffel/,
  ]);

  const second = v.getByTestId('dash-plan-2026-11-21');
  await expect(second.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  await expect(second.locator('[data-testid^="dash-plan-row-"]')).toHaveCount(0);
  await second.getByRole('button').click();
  await expect(v.getByTestId('dash-plan-row-c')).toContainText('E1 gegen FC Probestadt');
  await expect(v.getByTestId('dash-plan-row-d')).toContainText('abgesagt');
});

test('015 US7-S3 vergangene Spiele eingeklappt, neueste zuerst, mit Endstand Heim zuerst', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setupPlan(page, recorded, relay);
  await sendPlan(relay, links.trainer, PLAN);
  const v = await openViewer(newDevice, relay, links);
  const past = v.getByTestId('dash-plan-past');
  await expect(past.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  await expect(past.getByRole('button')).toContainText('Vergangene Spiele');
  await past.getByRole('button').click();
  await expect(past.locator('[data-testid^="dash-plan-row-"]')).toHaveText([
    /So 01\..*E2 – SV Regen.*abgesagt/,
    /Sa 31\..*FC Kirchberg – E1.*1:3/,
  ]);
});

test('015 US7-S4 Planspiele ohne Gegner erscheinen nicht', async ({ page, recorded, relay, newDevice }) => {
  const links = await setupPlan(page, recorded, relay);
  await sendPlan(relay, links.trainer, PLAN);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-plan')).toBeVisible();
  await expect(v.getByTestId('dash-plan-row-offen')).toHaveCount(0);
  await expect(v.getByTestId('dash-plan-2026-11-28')).toHaveCount(0);
});
