import { expect, test } from './fixtures';
import { createLive } from './live-helpers';
import { seedRoster } from './helpers';
import { ROSTER, settle, shareTrainerWithSquads, squadTab, twoSquads, writes } from './paket-helpers';

/**
 * Spec 016 US1: Kader mit den Trainern teilen. Vor "Trainer-Link teilen" fragt die App einmal, welche Kader
 * geteilt werden; unter "Kader" steht je Kader der Schalter "Mit Trainern geteilt". Fiktive Namen.
 */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

test('016 US1-S1 US1-S2 Frage vor dem Teilen: alle angekreuzt; abgewählter Kader bleibt ungeteilt', async ({
  page,
  recorded,
  relay,
}) => {
  await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  await twoSquads(page);
  await page.goto('./#/live-spieltag');
  const shares = (await recorded()).shares.length;
  await page.getByTestId('btn-share-trainer').click();
  const sheet = page.getByTestId('squad-share-sheet');
  await expect(sheet.getByRole('heading')).toHaveText('Kader mit den Trainern teilen?');
  await expect(sheet.locator('.squad-share__row')).toHaveText([/^E1\/E2\s*5 Kinder$/, /^E3\s*1 Kind$/]);
  for (const box of await sheet.getByRole('checkbox').all()) await expect(box).toBeChecked();
  await expect(sheet).toContainText('Alle mit dem Trainer-Link sehen diese Vornamen und Rückennummern.');
  await expect(page.getByTestId('squad-share-no')).toHaveText('Ohne Kader teilen');

  await sheet.getByLabel(/^E3/).uncheck();
  await page.getByTestId('squad-share-yes').click();
  // Der Trainer-Link geht wie bisher hinaus, ohne Kindernamen.
  await expect.poll(async () => (await recorded()).shares.length).toBe(shares + 1);
  const text = (await recorded()).shares.at(-1)?.text ?? '';
  expect(text).toContain('#/trainer/');
  expect(text).not.toMatch(/Max|Paul/);
  await settle(page);
  await expect.poll(() => writes(relay, 'squad').length).toBe(1);
  expect(writes(relay, 'squad')[0]!.gone).toBe(false);

  await page.goto('./#/kader');
  await expect(page.getByTestId('roster-share-switch')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('roster-share')).toContainText('Alle Trainer-Handys haben diesen Kader');
  await squadTab(page, /^E3/).click();
  await expect(page.getByTestId('roster-share-switch')).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('roster-share')).toContainText('Nur auf diesem Handy.');
});

test('016 US1-S3 sind alle Kader geteilt, teilt die App ohne Rückfrage', async ({ page, recorded, relay }) => {
  await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  await twoSquads(page);
  await shareTrainerWithSquads(page);
  await settle(page);
  await expect.poll(() => writes(relay, 'squad').length).toBe(2);
  const shares = (await recorded()).shares.length;
  await page.getByTestId('btn-share-trainer').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(shares + 1);
  await expect(page.getByTestId('squad-share-sheet')).toHaveCount(0);
});

test('016 US1-S4 Schalter aus: Rückfrage, danach "nicht mehr geteilt" beim Dienst', async ({
  page,
  recorded,
  relay,
}) => {
  await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  await twoSquads(page);
  await shareTrainerWithSquads(page);
  await settle(page);
  await page.goto('./#/kader');
  await page.getByTestId('roster-share-switch').click();
  await expect(page.getByTestId('confirm-dialog')).toContainText('Kader nicht mehr teilen?');
  await expect(page.getByTestId('confirm-dialog')).toContainText(
    'Auf den anderen Handys bleibt „E1/E2“ als eigener Kader, wird aber nicht mehr abgeglichen.',
  );
  await page.getByTestId('confirm-yes').click();
  await expect(page.getByTestId('roster-share-switch')).toHaveAttribute('aria-checked', 'false');
  await settle(page);
  await expect.poll(() => writes(relay, 'squad').filter((w) => w.gone).length).toBe(1);
  // Wieder einschalten geht ohne Rückfrage.
  await page.getByTestId('roster-share-switch').click();
  await expect(page.getByTestId('roster-share-switch')).toHaveAttribute('aria-checked', 'true');
});

test('016 US1-S5 ohne Trainer-Link gibt es keinen Schalter', async ({ page }) => {
  await seedRoster(page, ROSTER);
  await expect(page.getByTestId('roster-list')).toContainText('Paul');
  await expect(page.getByTestId('roster-share')).toHaveCount(0);
});
