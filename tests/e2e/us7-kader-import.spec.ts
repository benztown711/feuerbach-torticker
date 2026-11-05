import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { confirmYes, seedRoster } from './helpers';

async function openPaste(page: Page, text: string) {
  await page.goto('./#/kader');
  await page.getByTestId('btn-paste-list').click();
  await page.getByTestId('paste-input').fill(text);
}
const rows = (page: Page) => page.getByTestId('paste-preview').locator('[data-testid^="paste-row-"]');
const nameField = (page: Page, i: number) => page.getByTestId(`paste-name-${i}`);
const rosterRows = (page: Page) => page.getByTestId('roster-list').locator('[data-testid^="roster-row-"]');

test.describe('US7 Kader per Liste einfügen und teilen', () => {
  test('US7-S1 FR-025 Liste einfügen, Vorschau, Übernehmen', async ({ page }) => {
    await openPaste(page, '1 Max\n2 Maxi\n5 Ben\nTom');
    await expect(rows(page)).toHaveCount(4);
    await expect(rows(page).nth(3)).toContainText('ohne Nummer');
    await expect(page.getByTestId('paste-apply')).toHaveText('4 übernehmen');
    await page.getByTestId('paste-apply').click();
    await expect(rosterRows(page)).toHaveCount(4);
    await expect(page.getByTestId('roster-list')).toContainText('1Max');
    await expect(page.getByTestId('roster-list')).toContainText('5Ben');
    await expect(page.getByTestId('roster-list')).toContainText('Tom');
  });

  test('US7-S2 US7-S3 FR-020 Nachnamen werden gekürzt und nie gespeichert', async ({ page }) => {
    await openPaste(page, 'Ben Mustermann\nMax Müller\nMax Meier');
    await expect(nameField(page, 0)).toHaveValue('Ben');
    await expect(nameField(page, 1)).toHaveValue('Max Mü.');
    await expect(nameField(page, 2)).toHaveValue('Max Me.');
    await expect(rows(page).first()).toContainText('Nachname gekürzt');
    await nameField(page, 0).fill('Ben Mustermann');
    await expect(rows(page).first()).toContainText('Bitte nur Vornamen');
    await nameField(page, 0).fill('Ben');
    await expect(rows(page).first()).not.toContainText('Bitte nur Vornamen');
    await page.getByTestId('paste-apply').click();
    await expect(page.getByTestId('roster-list')).toContainText('Max Mü.');
    const stored = await page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          const req = indexedDB.open('torticker');
          req.onsuccess = () => {
            const all = req.result.transaction('players').objectStore('players').getAll();
            all.onsuccess = () => resolve(JSON.stringify(all.result));
          };
        }),
    );
    expect(stored).not.toMatch(/Mustermann|Müller|Meier/);
  });

  test('US7-S4 FR-026 doppelte Namen markiert, in der Vorschau änderbar', async ({ page }) => {
    await openPaste(page, 'Max\nMax');
    await expect(rows(page).nth(0)).toContainText('Name doppelt');
    await expect(rows(page).nth(1)).toContainText('Name doppelt');
    await nameField(page, 1).fill('Maxi');
    await expect(rows(page).nth(0)).not.toContainText('Name doppelt');
    await page.getByTestId('paste-apply').click();
    await expect(page.getByTestId('roster-list')).toContainText('Maxi');
  });

  test('US7-S5 doppelte Nummern markiert, Übernehmen trotzdem möglich; Zeile entfernbar', async ({ page }) => {
    await openPaste(page, '7 Leo\n7 Paul\n8 Tom');
    await expect(rows(page).nth(0)).toContainText('Nummer doppelt');
    await expect(rows(page).nth(1)).toContainText('Nummer doppelt');
    await page.getByTestId('paste-remove-2').click();
    await expect(rows(page)).toHaveCount(2);
    await expect(page.getByTestId('paste-apply')).toBeEnabled();
    await page.getByTestId('paste-apply').click();
    await expect(rosterRows(page)).toHaveCount(2);
  });

  test('US7-S6 US7-S8 FR-027 Zusammenführen ohne Duplikate', async ({ page }) => {
    await seedRoster(page, '1 Max\n2 Ben');
    await openPaste(page, 'Max\nLeo');
    await expect(rows(page).nth(0)).toContainText('aktualisiert');
    await expect(rows(page).nth(1)).toContainText('neu');
    await page.getByTestId('paste-apply').click();
    await expect(rosterRows(page)).toHaveCount(3);
    await expect(page.getByTestId('roster-list')).toContainText('1Max');
    await seedRoster(page, '1 Max\n2 Ben\nLeo');
    await expect(rosterRows(page)).toHaveCount(3);
  });

  test('US7-S7 FR-028 Kader teilen als "Nummer Name" pro Zeile (Reihenfolge nach Spec 013)', async ({
    page,
    recorded,
  }) => {
    await seedRoster(page, 'Tom\n2 Ben\n1 Max');
    await page.getByTestId('btn-share-roster').click();
    await expect.poll(async () => (await recorded()).shares.at(-1)?.text).toBe('2 Ben\n1 Max\nTom');
  });

  test('US7-S9 gelöschter Spieler wird beim Einfügen wieder sichtbar', async ({ page }) => {
    await seedRoster(page, '1 Max\n2 Ben');
    await page.getByTestId('roster-list').getByRole('button', { name: 'Max löschen' }).click();
    await confirmYes(page);
    await expect(page.getByTestId('roster-list')).not.toContainText('Max');
    await openPaste(page, '1 Max');
    await expect(rows(page).first()).toContainText('wieder sichtbar');
    await page.getByTestId('paste-apply').click();
    await expect(rosterRows(page)).toHaveCount(2);
  });
});
