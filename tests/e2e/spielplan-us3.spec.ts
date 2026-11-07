import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { confirmYes, forward, MIN } from './helpers';
import { liveSnap, MATCHDAY, openViewer, planPayloads, sendAs, sendPlan } from './live-helpers';
import { addGame, openPlan, setupPlan, sync } from './plan-helpers';

/**
 * Spec 015 US3: Eltern sehen die nächsten Spiele. Je Mannschaft eine Karte: laufendes Spiel, sonst das heutige
 * (angelegt oder geplant), sonst das letzte Ergebnis mit "Nächstes Spiel", sonst das nächste Planspiel.
 * Heute ist Sa 07.11.2026, 10:41 (MATCHDAY).
 */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

/** Planspiel in der Form der Plan-Meldung (contracts/plan-message.md). */
const entry = (i: string, k: string, d: string, o: string | null, more: Record<string, unknown> = {}) => ({
  i,
  k,
  d,
  t: '12:00',
  h: 1,
  ...(o === null ? {} : { o }),
  u: 1,
  ...more,
});

const names = (v: Page, key: string) => v.getByTestId(`dash-card-${key}`).locator('.dash-card__name');

test('015 US3-S1 letztes Ergebnis mit "Nächstes Spiel" darunter; ohne Ergebnis ist das Planspiel die Karte', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setupPlan(page, recorded, relay);
  await sendPlan(relay, links.trainer, [entry('p1', 'E1', '2026-11-14', 'TSV Musterstadt', { w: 'Kreisstaffel' })]);
  const v = await openViewer(newDevice, relay, links);
  await expect(names(v, 'E1')).toHaveText(['Feuerbach E1', 'TSV Musterstadt']);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText('Sa 14.11., 12:00 · Kreisstaffel');
  await expect(v.getByTestId('dash-score-E1')).toHaveCount(0);
  await expect(v.getByTestId('dash-empty')).toContainText('Heute noch kein Spiel live');
  await expect(v.getByTestId('dash-last-label')).toHaveText('ALS NÄCHSTES');

  // E1 hat heute gespielt: das Ergebnis ist die Karte, darunter das nächste Spiel
  await sendAs(
    relay,
    links.trainer,
    liveSnap({
      team: 'E1',
      now: MATCHDAY,
      opp: 'SV Vormittag',
      sections: 1,
      clock: [
        ['kickoff', 60, 1],
        ['fullTime', 35, 1],
      ],
      goals: [{ side: 'own', minute: 3 }],
    }),
  );
  await v.clock.runFor(5_000);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('1:0');
  await expect(v.getByTestId('dash-phase-E1')).toHaveText('Ende');
  await expect(v.getByTestId('dash-line-E1')).toHaveText('Nächstes Spiel: Sa 14.11., 12:00 gegen TSV Musterstadt');
});

test('015 US3-S2 heute geplant, nicht angelegt: "Feuerbach E1 – TSV Musterstadt" mit "heute 12:00", ohne Stand', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setupPlan(page, recorded, relay);
  await sendPlan(relay, links.trainer, [
    entry('p1', 'E1', '2026-11-07', 'TSV Musterstadt'),
    entry('p2', 'E2', '2026-11-07', 'SV Beispielhausen', { h: 0, t: '11:00' }),
  ]);
  const v = await openViewer(newDevice, relay, links);
  await expect(names(v, 'E1')).toHaveText(['Feuerbach E1', 'TSV Musterstadt']);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText('heute 12:00');
  await expect(v.getByTestId('dash-score-E1')).toHaveCount(0);
  // auswärts: Gegner zuerst
  await expect(names(v, 'E2')).toHaveText(['SV Beispielhausen', 'Feuerbach E2']);
  await expect(v.getByTestId('dash-empty')).toHaveCount(0);
  await v.getByTestId('dash-toggle-E1').click();
  await expect(v.getByTestId('dash-details-E1')).toContainText('Noch nicht angelegt');
});

test('015 US3-S3 aus dem Plan angelegt und angepfiffen: dieselbe Karte zeigt das laufende Spiel', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setupPlan(page, recorded, relay);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-07', time: '12:00', opponent: 'TSV Musterstadt' });
  await sync(page);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText('heute 12:00');

  await page.goto('./#/neu');
  await page.getByTestId('plan-pick').locator('[data-testid^="plan-pick-"][aria-pressed]').first().click();
  await page.getByTestId('btn-create').click();
  await page.getByTestId('btn-kickoff').click();
  const gameId = /#\/spiel\/([\w-]+)$/.exec(page.url())?.[1];
  await page.clock.runFor(6_000);

  await expect
    .poll(async () => {
      await v.clock.runFor(3_000);
      return v.getByTestId('dash-card-E1').getAttribute('data-game');
    })
    .toBe(gameId);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('0:0');
  await expect(v.locator('[data-testid="dash-card-E1"]')).toHaveCount(1);
  await expect(v.getByTestId('dash-card-E1')).not.toHaveAttribute('data-plan');
  await expect(v.getByTestId('dash-line-E1')).toHaveCount(0);
});

test('015 US3-S4 Turnier: nach dem ersten Spiel das nächste Planspiel, "Heute außerdem" und "Danach"; Endstand im Plan', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setupPlan(page, recorded, relay);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-07', time: '09:00', opponent: 'TSV Eichberg', schema: '1x10' });
  await addGame(page, { team: 'E1', date: '2026-11-07', time: '14:54', opponent: 'MTV Lindenau 4', away: true });
  await addGame(page, { team: 'E1', date: '2026-11-07', time: '15:42', opponent: 'SC Birkenau' });

  // Erstes Spiel aus dem Plan anlegen, 1:0 gewinnen
  await page.goto('./#/neu');
  await page
    .getByTestId('plan-pick')
    .locator('[data-testid^="plan-pick-"][aria-pressed]')
    .filter({ hasText: 'TSV Eichberg' })
    .click();
  await page.getByTestId('btn-create').click();
  await page.getByTestId('btn-kickoff').click();
  await forward(page, MIN);
  await page.getByTestId('btn-goal-own').click();
  await page.getByTestId('btn-section-end').click();
  await confirmYes(page);
  await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');

  // FR-P30: der Endstand geht mit dem Plan hinaus
  await expect
    .poll(async () => {
      await sync(page);
      const entries = (await planPayloads(relay, links.viewer)).flatMap((p) => p.e as { o?: string; s?: number[] }[]);
      return entries.filter((e) => e.o === 'TSV Eichberg').at(-1)?.s;
    })
    .toEqual([1, 0]);

  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText('heute 14:54');
  await expect(names(v, 'E1')).toHaveText(['MTV Lindenau 4', 'Feuerbach E1']);
  await expect(v.getByTestId('dash-line-E1')).toHaveText('Danach: 15:42 gegen SC Birkenau');
  await v.getByTestId('dash-toggle-E1').click();
  await expect(v.getByTestId('dash-earlier-E1')).toHaveText('Heute außerdem: 1:0 gegen TSV Eichberg');
});

test('015 US3-S5 Planspiel ohne Gegner erscheint nicht', async ({ page, recorded, relay, newDevice }) => {
  const links = await setupPlan(page, recorded, relay);
  await sendPlan(relay, links.trainer, [
    entry('p1', 'E1', '2026-11-07', null),
    entry('p2', 'E2', '2026-11-07', 'SV Beispielhausen'),
  ]);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-card-E2')).toBeVisible();
  await expect(v.getByTestId('dash-card-E1')).toHaveCount(0);
  await expect(v.getByTestId('dash-waiting-E1')).toContainText('heute noch kein Spiel');
});

test('015 US3-S6 verschoben oder gelöscht: das Dashboard übernimmt die Änderung', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setupPlan(page, recorded, relay);
  await sendPlan(relay, links.trainer, [entry('p1', 'E1', '2026-11-07', 'TSV Musterstadt')]);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText('heute 12:00');

  await sendPlan(relay, links.trainer, [entry('p1', 'E1', '2026-11-21', 'TSV Musterstadt', { u: 2 })]);
  await expect
    .poll(async () => {
      await v.clock.runFor(3_000);
      return v.getByTestId('dash-phase-E1').textContent();
    })
    .toBe('Sa 21.11., 12:00');

  await sendPlan(relay, links.trainer, [{ i: 'p1', k: 'E1', d: '2026-11-21', x: 1, u: 3 }]);
  await expect
    .poll(async () => {
      await v.clock.runFor(3_000);
      return v.getByTestId('dash-card-E1').count();
    })
    .toBe(0);
});
