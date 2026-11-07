import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { forward, MIN, startGame } from './helpers';
import { latestState, pasteLink, planPayloads } from './live-helpers';
import { addGame, openPlan, row, setupPlan, sync } from './plan-helpers';

/**
 * Spec 015 US2: Spiel aus dem Spielplan anlegen. "Neues Spiel" zeigt oben die heutigen Planspiele (weitere 14 Tage
 * eingeklappt); ein Tipp füllt Mannschaft, Gegner, Heim/Auswärts, Trikot und Spielzeit aus; das angelegte Spiel
 * steht im Plan als "angelegt". Heute ist Sa 07.11.2026 (MATCHDAY).
 */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const pickRows = (page: Page) => page.getByTestId('plan-pick').locator('[data-testid^="plan-pick-"][aria-pressed]');
const pick = (page: Page, text: string) => pickRows(page).filter({ hasText: text });

async function planWithToday(page: Page): Promise<void> {
  await openPlan(page);
  await addGame(page, { team: 'E2', date: '2026-11-07', time: '12:00', opponent: 'SV Beispielhausen' });
  await addGame(page, {
    team: 'E1',
    date: '2026-11-07',
    time: '11:00',
    opponent: 'FC Probestadt',
    away: true,
    competition: 'Kreisstaffel',
    schema: '3x25',
  });
  await addGame(page, { team: 'E1', date: '2026-11-15', time: '10:00', opponent: 'TV Neustadt E1', away: true });
  await addGame(page, { team: 'E1', date: '2026-11-30', time: '10:00', opponent: 'Zu spät' });
}

test('015 US2-S1 "Aus dem Spielplan": heute zuerst, weitere 14 Tage eingeklappt, abgesagte nicht', async ({
  page,
  recorded,
  relay,
}) => {
  await setupPlan(page, recorded, relay);
  await page.goto('./#/neu');
  await expect(page.getByTestId('input-opponent')).toBeVisible();
  await expect(page.getByTestId('plan-pick')).toHaveCount(0);

  await planWithToday(page);
  await page.goto('./#/neu');
  const section = page.getByTestId('plan-pick');
  await expect(section.getByRole('heading')).toHaveText('AUS DEM SPIELPLAN · HEUTE');
  await expect(pickRows(page)).toHaveText([/11:00.*E1 bei FC Probestadt/, /12:00.*E2 – SV Beispielhausen/]);
  await expect(page.getByTestId('plan-pick-more')).toHaveAttribute('aria-expanded', 'false');
  await page.getByTestId('plan-pick-more').click();
  await expect(pick(page, 'TV Neustadt E1')).toContainText('So 15.');
  await expect(pick(page, 'Zu spät')).toHaveCount(0);

  // Ohne heutige Spiele (beide abgesagt) bleibt nur der eingeklappte Abschnitt
  await openPlan(page);
  for (const name of ['FC Probestadt', 'SV Beispielhausen']) {
    await row(page, name).click();
    await page.getByTestId('plan-cancel').click();
    await expect(row(page, name)).toContainText('abgesagt');
  }
  await page.goto('./#/neu');
  await expect(section.getByRole('heading')).toHaveText('AUS DEM SPIELPLAN');
  await expect(page.getByTestId('plan-pick-more')).toHaveAttribute('aria-expanded', 'false');
  await expect(pickRows(page)).toHaveCount(0);
});

test('015 US2-S2 US2-S3 Tipp füllt aus; Änderungen gelten nur für dieses Spiel', async ({ page, recorded, relay }) => {
  await setupPlan(page, recorded, relay);
  await planWithToday(page);
  await page.goto('./#/neu');
  await pick(page, 'FC Probestadt').click();
  await expect(pick(page, 'FC Probestadt')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('team-chips').getByRole('button', { name: 'E1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('input-opponent')).toHaveValue('FC Probestadt');
  await expect(page.getByTestId('matchup-home')).toHaveText('FC Probestadt');
  await expect(page.getByTestId('kit-own-color')).toContainText('Schwarz');
  await expect(page.getByTestId('schema-sections')).toHaveValue('3');
  await expect(page.getByTestId('schema-minutes')).toHaveValue('25');
  await expect(page.getByTestId('plan-pick-hint')).toHaveText(
    'Aus dem Spielplan: Sa 07.11., 11:00 · Kreisstaffel. Änderungen gelten nur für dieses Spiel.',
  );

  // Andere Mannschaft gewählt: kein Spiel aus dem Plan mehr; erneut antippen wählt es wieder
  await page.getByTestId('team-chips').getByRole('button', { name: 'E2', exact: true }).click();
  await expect(page.getByTestId('plan-pick-hint')).toHaveCount(0);
  await pick(page, 'FC Probestadt').click();
  await expect(page.getByTestId('plan-pick-hint')).toBeVisible();

  // US2-S3: Gegner hier ändern lässt den Plan unverändert
  await page.getByTestId('input-opponent').fill('FC Probestadt II');
  await page.getByTestId('btn-create').click();
  await expect(page.getByTestId('btn-kickoff')).toBeVisible();
  await expect(page.getByTestId('team-home')).toHaveText('FC Probestadt II');
  await openPlan(page);
  await expect(row(page, 'E1 bei FC Probestadt')).toHaveCount(1);
  await expect(row(page, 'FC Probestadt II')).toHaveCount(0);
});

test('015 US2-S4 "Weiter zum Anpfiff" verknüpft: im Plan "angelegt", nicht mehr zur Auswahl, Meldung mit Spiel', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await setupPlan(page, recorded, relay);
  await planWithToday(page);
  await page.goto('./#/neu');
  await pick(page, 'SV Beispielhausen').click();
  await page.getByTestId('btn-create').click();
  await expect(page.getByTestId('btn-kickoff')).toBeVisible();
  const gameId = /#\/spiel\/([\w-]+)$/.exec(page.url())?.[1];
  expect(gameId).toBeTruthy();

  await openPlan(page);
  await expect(row(page, 'E2 – SV Beispielhausen')).toContainText('angelegt');
  await page.goto('./#/neu');
  await expect(pickRows(page)).toHaveText([/E1 bei FC Probestadt/]);
  await expect
    .poll(async () => {
      await sync(page);
      const entries = (await planPayloads(relay, links.viewer)).flatMap((p) => p.e as { o?: string; g?: string }[]);
      return entries.filter((e) => e.o === 'SV Beispielhausen').at(-1)?.g;
    })
    .toBe(gameId);
});

test('015 US2-S5 anderes Handy überträgt dieselbe Mannschaft schon: Rückfrage wie Spec 006 US6', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setupPlan(page, recorded, relay);
  await openPlan(page);
  await addGame(page, { team: 'E2', date: '2026-11-07', time: '12:00', opponent: 'TSV Musterstadt' });
  // A überträgt das E2-Spiel, ohne den Plan zu benutzen
  await startGame(page, { ownTeam: 'Sportvg Feuerbach E2', opponent: 'TSV Musterstadt' });
  await forward(page, 3 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await page.clock.runFor(6_000);
  await expect.poll(async () => (await latestState(relay, links.viewer))?.team).toBe('E2');

  const b = await newDevice();
  await pasteLink(b, links.trainer);
  await b.goto('./#/neu');
  await expect
    .poll(async () => {
      await sync(b);
      return pick(b, 'TSV Musterstadt').count();
    })
    .toBe(1);
  await pick(b, 'TSV Musterstadt').click();
  await b.getByTestId('btn-create').click();
  await expect(b.getByTestId('takeover-dialog')).toContainText('Das Spiel der E2 überträgt bereits ein anderes Handy');
});

test('015 US2-S6 ohne passenden Eintrag: wie bisher von Hand, das Planspiel bleibt frei', async ({
  page,
  recorded,
  relay,
}) => {
  await setupPlan(page, recorded, relay);
  await planWithToday(page);
  await page.goto('./#/neu');
  await page.getByTestId('team-chips').getByRole('button', { name: 'E2', exact: true }).click();
  await page.getByTestId('input-opponent').fill('SG Kurzfristig');
  await page.getByTestId('btn-create').click();
  await expect(page.getByTestId('btn-kickoff')).toBeVisible();
  await expect(page.getByTestId('team-away')).toHaveText('SG Kurzfristig');
  await openPlan(page);
  await expect(row(page, 'E2 – SV Beispielhausen')).toContainText('frei');
});
