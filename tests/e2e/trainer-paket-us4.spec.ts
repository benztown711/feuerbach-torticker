import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { createLive, pasteLink } from './live-helpers';
import { squadTabs } from './paket-helpers';

/**
 * Spec 016 US4: "Link einfügen" auf dem Startbildschirm erkennt Trainer-Link, Zuschauer-Link und Kader-Liste aus
 * "Kader teilen". Fiktive Namen.
 */

test.use({ serviceWorkers: 'block' });

const setClipboard = (p: Page, text: string | null): Promise<void> =>
  p.evaluate((t) => {
    const rec = (window as unknown as { __rec: { clipboard?: string; clipboardBlocked?: boolean } }).__rec;
    if (t === null) rec.clipboardBlocked = true;
    else rec.clipboard = t;
  }, text);

const LIST = 'Kader E3:\n4 Paul\n8 Maxi\n12 Leo\n';

test('016 US4-S1 US4-S2 Karte "Link einfügen"; Trainer-Link führt zur Kopplungsfrage', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await b.goto('./');
  const card = b.getByTestId('start-trainer-card');
  await expect(card).toContainText('Trainer? Füge den Link aus der Trainergruppe ein.');
  await expect(b.getByTestId('btn-start-paste')).toHaveText('Link einfügen');
  await setClipboard(b, `Hier:\n${links.trainer}\n`);
  await b.getByTestId('btn-start-paste').click();
  await expect(b.getByTestId('couple-dialog')).toContainText('Geteilte Kader kommen automatisch mit.');
  expect(relay.statuses.every((s) => s === 200 || s === 204)).toBe(true);
});

test('016 US4-S3 Zuschauer-Link öffnet das Dashboard', async ({ page, recorded, newDevice }) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  const b = await newDevice();
  await b.goto('./');
  await setClipboard(b, links.viewer);
  await b.getByTestId('btn-start-paste').click();
  await expect(b.getByTestId('dashboard')).toBeVisible();
});

test('016 US4-S4 Kader-Liste: Vorschau aus "Liste einfügen", danach "Kader"', async ({ page }) => {
  await page.goto('./');
  await setClipboard(page, LIST);
  await page.getByTestId('btn-start-paste').click();
  await expect(page).toHaveURL(/#\/kader$/);
  await expect(page.getByTestId('paste-input')).toHaveValue(LIST);
  await expect(page.getByTestId('paste-target')).toHaveText('Ziel: Kader „E3“ (wird angelegt)');
  await expect(page.getByTestId('paste-preview').locator('[data-testid^="paste-row-"]')).toHaveCount(3);
  await page.getByTestId('paste-apply').click();
  await expect(squadTabs(page)).toHaveText(['Kader · 0', 'E3 · 3']);
  // Danach öffnet "Liste einfügen" wieder leer.
  await page.getByTestId('btn-paste-list').click();
  await expect(page.getByTestId('paste-input')).toHaveValue('');
});

test('016 US4-S5 nichts Brauchbares: Einfügefeld mit Hinweis; dort geht auch eine Kader-Liste', async ({ page }) => {
  await page.goto('./');
  await setClipboard(page, 'Training am Dienstag fällt aus');
  await page.getByTestId('btn-start-paste').click();
  await expect(page.getByTestId('start-paste-sheet')).toContainText('Link einfügen');
  await expect(page.getByTestId('paste-link-error')).toHaveText(
    'Link oder Kader-Liste aus der Trainergruppe einfügen.',
  );
  await page.getByTestId('paste-link-input').fill(LIST);
  await page.getByTestId('paste-link-apply').click();
  await expect(page).toHaveURL(/#\/kader$/);
  await expect(page.getByTestId('paste-target')).toHaveText('Ziel: Kader „E3“ (wird angelegt)');
});

test('016 US4-S6 gekoppelt: Live-Zeile statt Karte; "Link einfügen" unter "Live-Spieltag" erkennt die Kader-Liste', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  const b = await newDevice();
  await pasteLink(b, links.trainer);
  await b.goto('./');
  await expect(b.getByTestId('start-live-line')).toBeVisible();
  await expect(b.getByTestId('start-trainer-card')).toHaveCount(0);
  await b.goto('./#/live-spieltag');
  await b.getByTestId('btn-paste-link').click();
  await b.getByTestId('paste-link-input').fill(LIST);
  await b.getByTestId('paste-link-apply').click();
  await expect(b).toHaveURL(/#\/kader$/);
  await expect(b.getByTestId('paste-target')).toHaveText('Ziel: Kader „E3“ (wird angelegt)');
});
