import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/** Spec 009: Hilfe mit Suche (Trainer-Ansicht unter "Mehr"). */

async function openHelp(page: Page, path = './#/hilfe'): Promise<void> {
  await page.goto(path);
  await expect(page.getByTestId('help-search')).toBeVisible();
}

async function openEntry(page: Page, id: string): Promise<void> {
  await page.goto(`./#/hilfe/${id}`);
  await expect(page.getByTestId('help-entry')).toBeVisible();
}

const rows = (page: Page) => page.getByTestId('help-results').locator('[data-testid^="help-row-"]');
const rowIds = async (page: Page): Promise<string[]> =>
  (await rows(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-testid') ?? ''))).map((id) =>
    id.replace('help-row-', ''),
  );

async function search(page: Page, q: string): Promise<void> {
  await page.getByTestId('help-search').fill(q);
}

test.describe('009 US1 Antwort per Suche finden', () => {
  test('009 US1-S1 FR-H01 "pfiff" zeigt sofort "Warum höre ich keinen Pfiff?" oben', async ({ page }) => {
    await openHelp(page);
    await search(page, 'pfiff');
    await expect(rows(page).first()).toContainText('Warum höre ich keinen Pfiff?');
    await expect(page.getByTestId('help-count')).toContainText('Treffer');
  });

  test('009 US1-S2 FR-H02 Groß-/Kleinschreibung egal, Wortanfang genügt', async ({ page }) => {
    await openHelp(page);
    await search(page, 'ELFMETER');
    await expect(rows(page).first()).toBeVisible();
    const upper = await rowIds(page);
    await search(page, 'elfmeter');
    await expect.poll(() => rowIds(page)).toEqual(upper);
    await search(page, 'Elf');
    await expect.poll(async () => (await rowIds(page)).sort()).toEqual([...upper].sort());
  });

  test('009 US1-S3 FR-H02 "Torschuetze" und "torschütze" finden den Torschützen-Eintrag', async ({ page }) => {
    await openHelp(page);
    for (const q of ['Torschuetze', 'torschütze']) {
      await search(page, q);
      await expect(page.getByTestId('help-row-torschuetze')).toBeVisible();
    }
  });

  test('009 US1-S4 FR-H04 "Backup" findet die Sicherung über hinterlegte Suchbegriffe', async ({ page }) => {
    await openHelp(page);
    await search(page, 'Backup');
    await expect(rows(page).first()).toHaveAttribute('data-testid', 'help-row-sichern');
  });

  test('009 US1-S5 FR-H03 "tor löschen": nur Einträge mit beiden Wörtern, "Wie entferne ich ein Tor?" oben', async ({
    page,
  }) => {
    await openHelp(page);
    await search(page, 'tor löschen');
    await expect(rows(page).first()).toHaveAttribute('data-testid', 'help-row-tor-entfernen');
    await expect(rows(page).first()).toContainText('Wie entferne ich ein Tor?');
  });

  test('009 US1-S6 FR-H06 gefundene Wörter sind in Titel und Auszug hervorgehoben', async ({ page }) => {
    await openHelp(page);
    await search(page, 'pfiff');
    const first = rows(page).first();
    await expect(first.locator('.help-row__title mark')).toHaveText(['Pfiff']);
    await expect(first.locator('.help-row__snippet')).toBeVisible();
  });

  test('009 US1-S7 FR-H07 ohne Treffer "Nichts gefunden" und "Alle Themen anzeigen" leert die Suche', async ({
    page,
  }) => {
    await openHelp(page);
    await search(page, 'xyz');
    await expect(page.getByTestId('help-none')).toContainText('Nichts gefunden zu „xyz“');
    await page.getByTestId('help-show-all').click();
    await expect(page.getByTestId('help-search')).toHaveValue('');
    await expect(page.getByTestId('help-topic-start')).toBeVisible();
  });

  test('009 US1-S8 FR-H12 Eintrag öffnen und zurück: Suchbegriff und Treffer bleiben', async ({ page }) => {
    await openHelp(page);
    await search(page, 'pfiff');
    const before = await rowIds(page);
    await rows(page).first().click();
    await expect(page).toHaveURL(/#\/hilfe\/kein-pfiff$/);
    await expect(page.getByTestId('help-entry')).toContainText('Warum höre ich keinen Pfiff?');
    await page.goBack();
    await expect(page.getByTestId('help-search')).toHaveValue('pfiff');
    await expect.poll(() => rowIds(page)).toEqual(before);
    // Auch der Zurück-Knopf oben führt mit erhaltener Suche zurück
    await rows(page).first().click();
    await page.getByTestId('help-back').click();
    await expect(page.getByTestId('help-search')).toHaveValue('pfiff');
  });

  test('009 US1-S9 FR-H14 SC-H04 Suche funktioniert offline', async ({ page, context }) => {
    await page.goto('./');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { timeout: 15_000 })
      .toBe(true);
    await context.setOffline(true);
    await openHelp(page);
    await search(page, 'pfiff');
    await expect(rows(page).first()).toContainText('Warum höre ich keinen Pfiff?');
    await context.setOffline(false);
  });
});

test.describe('009 US2 Die Hilfe erklärt alle Funktionen', () => {
  test('009 US2-S1 FR-H08 ohne Suchbegriff alle Einträge nach Themen in fester Reihenfolge', async ({ page }) => {
    await openHelp(page);
    await expect(page.locator('[data-testid^="help-topic-"]')).toHaveText([
      'Erste Schritte',
      'Spiel erfassen',
      'Torschützen und Ereignisse',
      'Pokal',
      'Teilen',
      'Mannschaften und Kader',
      'Historie',
      'Live-Spieltag',
      'Einstellungen und Sicherung',
      'Probleme lösen',
      'Datenschutz',
    ]);
    for (const title of await rows(page).locator('.help-row__title').allTextContents()) expect(title).toMatch(/\?$/);
  });

  test('009 US2-S2 FR-H09 Eintrag mit kurzer Antwort und nummerierten Schritten', async ({ page }) => {
    await openHelp(page);
    await page.getByTestId('help-row-tor').click();
    const entry = page.getByTestId('help-entry');
    await expect(entry.getByRole('heading', { name: 'Wie erfasse ich ein Tor?' })).toBeVisible();
    await expect(entry).toContainText('Die Minute wird automatisch festgehalten.');
    await page.goto('./#/hilfe/neues-spiel');
    await expect(page.getByTestId('help-entry').locator('ol li')).toHaveCount(4);
    await expect(page.getByTestId('help-entry')).toContainText('„Weiter zum Anpfiff“');
  });

  test('009 US2-S3 FR-H10 "Einstellungen öffnen" führt direkt in die Einstellungen', async ({ page }) => {
    await openEntry(page, 'sichern');
    await expect(page.getByTestId('help-open')).toHaveText('Einstellungen öffnen');
    await page.getByTestId('help-open').click();
    await expect(page).toHaveURL(/#\/einstellungen$/);
    await expect(page.getByRole('heading', { name: 'Einstellungen', exact: true })).toBeVisible();
  });

  test('009 US2-S4 FR-H11 bis zu drei verwandte Einträge unter "Siehe auch"', async ({ page }) => {
    await openEntry(page, 'tor');
    const related = page.getByTestId('help-related').locator('[data-testid^="help-row-"]');
    await expect(related).toHaveCount(3);
    await related.first().click();
    await expect(page).toHaveURL(/#\/hilfe\/tor-entfernen$/);
  });

  test('009 US2-S5 FR-H13 ganz unten steht die App-Version', async ({ page }) => {
    await openHelp(page);
    await expect(page.getByTestId('help-version')).toHaveText(/^Stand: Version \d+\.\d+\.\d+$/);
  });

  test('009 FR-H15 "Hilfe" unter "Mehr" heißt "Suchen, Anleitungen, Tipps"', async ({ page }) => {
    await page.goto('./#/mehr');
    await expect(page.getByTestId('more-help')).toContainText('Suchen, Anleitungen, Tipps');
    await page.getByTestId('more-help').click();
    await expect(page.getByRole('heading', { name: 'Hilfe', exact: true })).toBeVisible();
  });

  test('009 Edge Case: unbekannte Adresse zeigt die Themenübersicht', async ({ page }) => {
    await openHelp(page, './#/hilfe/gibt-es-nicht');
    await expect(page.getByTestId('help-topic-start')).toBeVisible();
  });
});
