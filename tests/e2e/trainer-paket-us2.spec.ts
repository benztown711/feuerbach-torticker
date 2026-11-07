import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { chipLabel, seedRoster } from './helpers';
import { createLive } from './live-helpers';
import { settle, shareTrainerWithSquads, squadTabs, twoSquads } from './paket-helpers';

/**
 * Spec 016 US2: Ein Einfügen genügt. Der neue Trainer fügt nur den Trainer-Link ein; die geteilten Kader kommen
 * über den eigenen Dienst automatisch mit, samt Zuordnung der Mannschaften. Fiktive Namen.
 */

test.use({ serviceWorkers: 'block' });

/** Trainer-Link im Torticker einfügen und die Kopplungsfrage zeigen (ohne zu bestätigen). */
async function paste(b: Page, url: string): Promise<void> {
  await b.goto('./#/live-spieltag');
  await b.getByTestId('btn-paste-link').click();
  await b.getByTestId('paste-link-input').fill(`Hier der Link:\n${url}\n`);
  await b.getByTestId('paste-link-apply').click();
  await expect(b.getByTestId('couple-dialog')).toBeVisible();
}

test('016 US2-S1 US2-S2 Kopplungsfrage nennt die Kader; danach Kader, Kinder und Aufgebot wie bei Atti', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  await twoSquads(page);
  await shareTrainerWithSquads(page);
  await settle(page);

  const b = await newDevice();
  await paste(b, links.trainer);
  await expect(b.getByTestId('couple-squads')).toHaveText('Geteilte Kader kommen automatisch mit.');
  await b.getByTestId('couple-yes').click();
  await expect(b.getByTestId('squad-notice')).toHaveText('Kader übernommen: E1/E2 (5 Kinder), E3 (1 Kind)', {
    timeout: 10_000,
  });
  await b.goto('./#/kader');
  await expect(squadTabs(b)).toHaveText(['E1/E2 · 5', 'E3 · 1']);
  await expect(b.getByTestId('roster-share-switch')).toHaveAttribute('aria-checked', 'true');

  await b.goto('./#/neu');
  await b
    .getByTestId('team-chips')
    .getByRole('button', { name: chipLabel('Sportvg Feuerbach E3'), exact: true })
    .click();
  await expect(b.getByTestId('squad-picker').getByRole('button')).toHaveText(['4 Paul']);
  await expect(b.getByTestId('squad-more-toggle')).toHaveText('Weitere Kinder · 5');
  // Der Hinweis kommt nur einmal.
  await b.reload();
  await settle(b);
  await expect(b.getByTestId('squad-notice')).toHaveCount(0);
  expect(relay.statuses.every((s) => s === 200 || s === 204)).toBe(true);
});

test('016 US2-S3 eigener Kader "E3" wird zusammengeführt: gleiche Kinder erkannt, neue dazu, keins gelöscht', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  await twoSquads(page);
  await page.goto('./#/kader');
  await page.getByTestId('roster-squads').getByRole('button', { name: /^E3/ }).click();
  await page.getByTestId('btn-paste-list').click();
  await page.getByTestId('paste-input').fill('Kader E3:\n4 Paul\n5 Leon\n');
  await page.getByTestId('paste-apply').click();
  await shareTrainerWithSquads(page);
  await settle(page);

  const b = await newDevice();
  await seedRoster(b, 'Kader E3:\n14 Paul\n21 Tim\n');
  await paste(b, links.trainer);
  await b.getByTestId('couple-yes').click();
  await settle(b);
  await b.goto('./#/kader');
  await b.getByTestId('roster-squads').getByRole('button', { name: /^E3/ }).click();
  const rows = b.getByTestId('roster-list').locator('.roster-row');
  await expect(rows).toHaveText([/^5\s*Leon/, /^4\s*Paul/, /^21\s*Tim/]);
});

test('016 US2-S4 kein Platz: Hinweis unter "Kader"', async ({ page, recorded, newDevice }) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  await twoSquads(page);
  await shareTrainerWithSquads(page);
  await settle(page);

  const b = await newDevice();
  await seedRoster(b, '1 Max');
  for (const name of ['A', 'B', 'C', 'D', 'E']) {
    await b.getByTestId('btn-add-squad').click();
    await b.getByTestId('input-squad-name').fill(name);
    await b.getByTestId('btn-save-squad').click();
  }
  await paste(b, links.trainer);
  await b.getByTestId('couple-yes').click();
  await settle(b);
  await b.goto('./#/kader');
  await expect(b.getByTestId('roster-full')).toHaveText([
    '„E1/E2“ ist geteilt, hat aber keinen Platz (höchstens 6 Kader).',
    '„E3“ ist geteilt, hat aber keinen Platz (höchstens 6 Kader).',
  ]);
});

test('016 US2-S5 offline gekoppelt: Kader kommen, sobald das Handy online ist', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  await twoSquads(page);
  await shareTrainerWithSquads(page);
  await settle(page);

  const b = await newDevice();
  await b.goto('./');
  relay.fail = true;
  await paste(b, links.trainer);
  await b.getByTestId('couple-yes').click();
  await expect(b.getByTestId('couple-dialog')).toBeHidden();
  await b.clock.runFor(5_000);
  await b.goto('./#/kader');
  await expect(b.getByTestId('roster-list')).not.toContainText('Paul');
  relay.fail = false;
  await b.clock.runFor(35_000);
  await expect(squadTabs(b)).toHaveText(['E1/E2 · 5', 'E3 · 1']);
});
