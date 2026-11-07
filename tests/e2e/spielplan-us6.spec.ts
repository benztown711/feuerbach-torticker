import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MATCHDAY, openViewer, pasteLink } from './live-helpers';
import { addGame, openPlan, row, setupPlan, sync } from './plan-helpers';

/**
 * Spec 015 US6: Spiel vormerken ("Ich tickere"). Ein Trainer merkt im Spielplan ein Spiel vor; alle Trainer-Handys
 * sehen "Tickert: …". Am Spieltag steht das Spiel oben auf seinem Startbildschirm. Heute ist Sa 07.11.2026.
 */

// Service Worker blockieren, damit WebKit die Anfragen an ntfy.sh durch den Relay-Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

/** Wartet, bis das Handy die Plan-Meldungen der anderen übernommen hat. */
async function sees(p: Page, name: string, text: string): Promise<void> {
  await expect
    .poll(async () => {
      await sync(p);
      return (await row(p, name).allInnerTexts()).join(' ');
    })
    .toContain(text);
}

async function claim(p: Page, name: string, trainer?: string): Promise<void> {
  await row(p, name).click();
  await p.getByTestId('plan-claim').click();
  if (trainer !== undefined) await p.getByTestId('claim-name').fill(trainer);
  await p.getByTestId('claim-yes').click();
  await expect(p.getByTestId('plan-msg')).toHaveText('Vorgemerkt. Die anderen Trainer sehen es.');
}

async function twoPhones(
  page: Page,
  recorded: Parameters<typeof setupPlan>[1],
  relay: Parameters<typeof setupPlan>[2],
  newDevice: () => Promise<Page>,
) {
  const links = await setupPlan(page, recorded, relay);
  const b = await newDevice();
  await b.clock.setSystemTime(MATCHDAY);
  await pasteLink(b, links.trainer);
  return { links, b };
}

test('015 US6-S1 US6-S2 vormerken mit Bestätigung; beim ersten Mal der Vorname, ohne Namen "vergeben"', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { b } = await twoPhones(page, recorded, relay, newDevice);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-14', time: '12:00', opponent: 'TSV Musterstadt' });
  await addGame(page, { team: 'E2', date: '2026-11-14', time: '12:00', opponent: 'SV Beispielhausen', away: true });
  await expect(row(page, 'TSV Musterstadt')).toContainText('frei');

  await row(page, 'TSV Musterstadt').click();
  await expect(page.getByTestId('plan-claim-state')).toHaveText('Noch niemand tickert dieses Spiel.');
  await page.getByTestId('plan-claim').click();
  await expect(page.getByTestId('claim-dialog')).toContainText(
    'Du tickerst Sa 14.11., 12:00 E1 gegen TSV Musterstadt.',
  );
  await expect(page.getByTestId('claim-dialog')).toContainText('Die anderen Trainer sehen das im Spielplan.');
  await page.getByTestId('claim-name').fill('Jonas');
  await page.getByTestId('claim-yes').click();
  await expect(page.getByTestId('plan-msg')).toHaveText('Vorgemerkt. Die anderen Trainer sehen es.');
  await expect(row(page, 'TSV Musterstadt')).toContainText('Tickert: du');

  // Das andere Trainer-Handy sieht den Namen
  await openPlan(b);
  await sees(b, 'TSV Musterstadt', 'Tickert: Jonas');

  // Zweites Vormerken auf A fragt nicht mehr nach dem Namen
  await row(page, 'SV Beispielhausen').click();
  await page.getByTestId('plan-claim').click();
  await expect(page.getByTestId('claim-dialog')).toContainText(
    'Du tickerst Sa 14.11., 12:00 E2 bei SV Beispielhausen.',
  );
  await expect(page.getByTestId('claim-name')).toHaveCount(0);
  await page.getByTestId('claim-no').click();
  await page.getByTestId('plan-sheet').getByRole('button', { name: 'Schließen' }).click();

  // B merkt das E2-Spiel ohne Namen vor (Feld leer lassen): auf A "Tickert: vergeben"
  await claim(b, 'SV Beispielhausen', '');
  await expect(row(b, 'SV Beispielhausen')).toContainText('Tickert: du');
  await sees(page, 'SV Beispielhausen', 'Tickert: vergeben');

  // FR-P26: Name in den Einstellungen
  await page.goto('./#/einstellungen');
  await expect(page.getByTestId('settings-trainer-name')).toHaveValue('Jonas');
});

test('015 US6-S3 vorgemerktes Spiel übernehmen: Rückfrage, danach gilt die neue Vormerkung überall', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { b } = await twoPhones(page, recorded, relay, newDevice);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-14', time: '12:00', opponent: 'TSV Musterstadt' });
  await claim(page, 'TSV Musterstadt', 'Jonas');

  await openPlan(b);
  await sees(b, 'TSV Musterstadt', 'Tickert: Jonas');
  await row(b, 'TSV Musterstadt').click();
  await expect(b.getByTestId('plan-claim-state')).toHaveText('Tickert: Jonas');
  await b.getByTestId('plan-claim').click();
  await expect(b.getByTestId('claim-dialog')).toContainText('Jonas tickert dieses Spiel. Trotzdem übernehmen?');
  await b.getByTestId('claim-name').fill('Ben');
  await b.getByTestId('claim-yes').click();
  await expect(row(b, 'TSV Musterstadt')).toContainText('Tickert: du');
  await sees(page, 'TSV Musterstadt', 'Tickert: Ben');
});

test('015 US6-S4 "Nicht mehr tickern" gibt das Spiel frei', async ({ page, recorded, relay, newDevice }) => {
  const { b } = await twoPhones(page, recorded, relay, newDevice);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-14', time: '12:00', opponent: 'TSV Musterstadt' });
  await claim(page, 'TSV Musterstadt', 'Jonas');
  await openPlan(b);
  await sees(b, 'TSV Musterstadt', 'Tickert: Jonas');

  await row(page, 'TSV Musterstadt').click();
  await expect(page.getByTestId('plan-claim-state')).toHaveText('Du tickerst dieses Spiel.');
  await page.getByTestId('plan-unclaim').click();
  await expect(page.getByTestId('plan-msg')).toHaveText('Freigegeben.');
  await expect(row(page, 'TSV Musterstadt')).toContainText('frei');
  await sees(b, 'TSV Musterstadt', 'frei');
});

test('015 US6-S5 am Spieltag "Heute tickerst du" auf dem Startbildschirm; ein Tipp öffnet "Neues Spiel" ausgewählt', async ({
  page,
  recorded,
  relay,
}) => {
  await setupPlan(page, recorded, relay);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-07', time: '12:00', opponent: 'TSV Musterstadt' });
  await addGame(page, { team: 'E2', date: '2026-11-14', time: '12:00', opponent: 'SV Morgen' });
  await claim(page, 'TSV Musterstadt', 'Jonas');
  // Das Spiel am 14.11. liegt in einer zugeklappten Datumsgruppe
  await page
    .getByTestId('plan-group-2026-11-14')
    .getByRole('button', { name: /Sa 14\.11\./ })
    .click();
  await claim(page, 'SV Morgen');

  await page.goto('./#/');
  const mine = page.getByTestId('start-claims');
  await expect(mine).toContainText('HEUTE TICKERST DU');
  await expect(mine.locator('[data-testid^="start-claim-"]')).toHaveCount(1);
  await expect(mine).toContainText('12:00 · E1 gegen TSV Musterstadt');
  await mine.locator('[data-testid^="start-claim-"]').click();

  await expect(page.getByTestId('plan-pick-hint')).toBeVisible();
  await expect(page.getByTestId('input-opponent')).toHaveValue('TSV Musterstadt');
  await page.getByTestId('btn-create').click();
  await expect(page.getByTestId('btn-kickoff')).toBeVisible();

  // angelegt: nicht mehr auf dem Startbildschirm
  await page.goto('./#/');
  await expect(page.getByTestId('btn-new-game')).toBeVisible();
  await expect(page.getByTestId('start-claims')).toHaveCount(0);
});

test('015 US6-S6 von einem anderen vorgemerkt: vor "Weiter zum Anpfiff" "Trotzdem hier erfassen?"', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { b } = await twoPhones(page, recorded, relay, newDevice);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-07', time: '12:00', opponent: 'TSV Musterstadt' });
  await claim(page, 'TSV Musterstadt', 'Jonas');

  await b.goto('./#/neu');
  const pick = b.getByTestId('plan-pick').locator('[data-testid^="plan-pick-"][aria-pressed]');
  await expect
    .poll(async () => {
      await sync(b);
      return (await pick.allInnerTexts()).join(' ');
    })
    .toContain('Jonas');
  await pick.filter({ hasText: 'TSV Musterstadt' }).click();
  await b.getByTestId('btn-create').click();
  await expect(b.getByTestId('confirm-dialog')).toContainText('Jonas tickert dieses Spiel. Trotzdem hier erfassen?');
  await b.getByTestId('confirm-no').click();
  await expect(b.getByTestId('btn-kickoff')).toHaveCount(0);
  await b.getByTestId('btn-create').click();
  await b.getByTestId('confirm-yes').click();
  await expect(b.getByTestId('btn-kickoff')).toBeVisible();
});

test('015 US6-S7 Vormerkungen erscheinen nicht auf dem Dashboard', async ({ page, recorded, relay, newDevice }) => {
  const links = await setupPlan(page, recorded, relay);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-07', time: '12:00', opponent: 'TSV Musterstadt' });
  await addGame(page, { team: 'E1', date: '2026-11-14', time: '12:00', opponent: 'SV Morgen' });
  await claim(page, 'TSV Musterstadt', 'Jonas');
  // Das Spiel am 14.11. liegt in einer zugeklappten Datumsgruppe
  await page
    .getByTestId('plan-group-2026-11-14')
    .getByRole('button', { name: /Sa 14\.11\./ })
    .click();
  await claim(page, 'SV Morgen');
  await sync(page);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText('heute 12:00');
  await expect(v.getByTestId('dash-plan')).toBeVisible();
  await expect(v.getByTestId('dashboard')).not.toContainText('Jonas');
  await expect(v.getByTestId('dashboard')).not.toContainText('Tickert');
});
