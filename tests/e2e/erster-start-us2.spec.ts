import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { ensureTeam, readStored, seedRoster, shareAsText } from './helpers';

/**
 * Spec 022 US2: "Neues Spiel" schneller. "Weiter zum Anpfiff" unten angeheftet, ohne Scrollen sichtbar; der Gegner
 * ist optional (leer heißt er "Gegner").
 */

const E1 = 'Sportvg Feuerbach E1';
const KIDS = ['1 Max', '2 Ben', '3 Tom', '4 Leo', '5 Paul', '6 Maxi', '7 Finn', '8 Noah'].join('\n');

const openNew = async (page: Page): Promise<void> => {
  await page.goto('./');
  await page.getByTestId('btn-new-game').click();
  await expect(page.getByTestId('input-opponent')).toBeVisible();
};

/** Mit Mannschaft und Kader, damit das Formular länger ist als der Bildschirm. */
async function prepare(page: Page): Promise<void> {
  await ensureTeam(page, E1);
  await seedRoster(page, KIDS);
}

for (const size of [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
]) {
  test(`022 US2-S1 Knopf ohne Scrollen sichtbar, über der Navigationsleiste (${size.width} x ${size.height})`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await prepare(page);
    await openNew(page);
    const scroll = await page.evaluate(() => ({
      y: window.scrollY,
      doc: (document.scrollingElement as HTMLElement).scrollHeight,
      inner: window.innerHeight,
    }));
    expect(scroll.y).toBe(0);
    // Das Formular ist länger als der Bildschirm: ohne Anheften läge der Knopf darunter.
    expect(scroll.doc).toBeGreaterThan(scroll.inner);
    const box = (await page.getByTestId('btn-create').boundingBox())!;
    const nav = (await page.getByTestId('nav').boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(nav.y);
    expect(box.height).toBeGreaterThanOrEqual(56);
    await expect(page.getByTestId('btn-create')).toBeInViewport({ ratio: 1 });
  });
}

test('022 US2-S2 am Ende des Formulars deckt der angeheftete Knopf keinen Inhalt ab', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await prepare(page);
  await openNew(page);
  await page.evaluate(() => window.scrollTo(0, (document.scrollingElement as HTMLElement).scrollHeight));
  const bar = (await page.getByTestId('create-bar').boundingBox())!;
  const last = (await page.locator('form > section').last().boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(bar.y + 1);
  const btn = (await page.getByTestId('btn-create').boundingBox())!;
  const nav = (await page.getByTestId('nav').boundingBox())!;
  expect(btn.y + btn.height).toBeLessThanOrEqual(nav.y);
});

test('022 US2-S3 Platzhalter "Gegner (optional)", Knopf ohne Gegner bedienbar', async ({ page }) => {
  await openNew(page);
  const input = page.getByTestId('input-opponent');
  await expect(input).toHaveValue('');
  await expect(input).toHaveAttribute('placeholder', 'Gegner (optional)');
  await expect(page.getByTestId('btn-create')).toBeEnabled();
  await expect(page.getByTestId('btn-create')).toHaveText('Weiter zum Anpfiff');
});

test('022 US2-S4 ohne Gegner startet das Spiel mit "Gegner" (Kopfzeile, Verlauf, Teilen-Text), auch nur Leerzeichen', async ({
  page,
  recorded,
}) => {
  await openNew(page);
  // Vorschau: wie bisher "Gegner"
  await expect(page.getByTestId('matchup-away')).toHaveText('Gegner');
  await page.getByTestId('btn-create').click();
  await expect(page.getByTestId('btn-kickoff')).toBeVisible();
  await expect(page.getByTestId('team-away')).toHaveText('Gegner');
  await page.getByTestId('btn-kickoff').click();
  await expect(page.getByTestId('btn-pause')).toBeVisible();
  await page.getByTestId('btn-goal-own').click();
  await shareAsText(page);
  await expect.poll(async () => (await recorded()).shares.at(-1)?.text ?? '').toContain('Gegner');
  // Historie zeigt "Gegner"
  await page.getByTestId('nav-history').click();
  await expect(page.getByText('Gegner').first()).toBeVisible();

  // nur Leerzeichen zählen als leer
  await openNew(page);
  await page.getByTestId('input-opponent').fill('   ');
  await expect(page.getByTestId('btn-create')).toBeEnabled();
  await page.getByTestId('btn-create').click();
  await expect(page.getByTestId('team-away')).toHaveText('Gegner');
});

test('022 US2-S5 "Gegner ändern" in den Spieldetails: Name überall, leer heißt wieder "Gegner"', async ({ page }) => {
  await openNew(page);
  await page.getByTestId('btn-create').click();
  await page.getByTestId('btn-kickoff').click();
  await expect(page.getByTestId('btn-pause')).toBeVisible();
  await page.getByTestId('btn-menu').click();
  await page.getByTestId('menu-details').click();
  await expect(page.locator('.details__match')).toContainText('Gegner');
  await page.getByTestId('details-opponent').click();
  const input = page.getByTestId('opponent-input');
  await expect(page.getByTestId('opponent-sheet')).toBeVisible();
  // der Ersatzname steht als Platzhalter, nicht als Eintrag
  await expect(input).toHaveValue('');
  await expect(input).toHaveAttribute('placeholder', 'Gegner (optional)');
  await expect(input).toHaveAttribute('maxlength', '40');
  await input.fill('FC Probestadt');
  await page.getByTestId('opponent-save').click();
  await expect(page.getByTestId('opponent-sheet')).toBeHidden();
  await expect(page.locator('.details__match')).toContainText('FC Probestadt');
  await expect(page.locator('.details__match')).not.toContainText('Gegner');
  // Spielbildschirm und Historie zeigen den neuen Namen
  await page.getByRole('button', { name: 'Zurück zur Historie' }).click();
  await expect(page.getByText('FC Probestadt').first()).toBeVisible();
  await page.getByTestId('nav-game').click();
  await expect(page.getByTestId('team-away')).toHaveText('FC Probestadt');
  // leer: wieder "Gegner"
  await page.getByTestId('btn-menu').click();
  await page.getByTestId('menu-details').click();
  await page.getByTestId('details-opponent').click();
  await page.getByTestId('opponent-input').fill('  ');
  await page.getByTestId('opponent-save').click();
  await expect(page.locator('.details__match')).toContainText('Gegner');
});

test('022 US2-S6 ein eingetragener Gegner gilt wie bisher', async ({ page }) => {
  await openNew(page);
  await page.getByTestId('input-opponent').fill('TSV Musterstadt');
  await page.getByTestId('btn-create').click();
  await expect(page.getByTestId('team-away')).toHaveText('TSV Musterstadt');
  await openNew(page);
  await expect(page.getByTestId('input-opponent')).toHaveAttribute('maxlength', '40');
});

test('022 US2-S7 sperrt die Prüfung aus anderem Grund, nennt eine Zeile den Grund statt stummem Ausgrauen', async ({
  page,
}) => {
  await ensureTeam(page, E1);
  await page.goto('./');
  await expect(page.getByTestId('btn-new-game')).toBeVisible();
  // Mannschaftsname über 40 Zeichen (z. B. aus einer fremden Sicherung): die Prüfung sperrt den Knopf.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('torticker');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          const store = tx.objectStore('settings');
          const get = store.get('app');
          get.onsuccess = () => {
            const s = get.result as { teams: { name: string }[] };
            s.teams[0]!.name = 'Sportvg Feuerbach Jugendabteilung Fußball Mannschaft E1 Nord';
            store.put(s, 'app');
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  expect(
    (await readStored<{ teams: { name: string }[] }>(page, 'settings', 'app'))?.teams[0]?.name.length,
  ).toBeGreaterThan(40);
  await openNew(page);
  await expect(page.getByTestId('btn-create')).toBeDisabled();
  await expect(page.getByTestId('create-reason')).toHaveText('Höchstens 40 Zeichen.');
});

test('022 US2-S8 mit Fokus im Feld bleibt der Knopf erreichbar, Enter startet das Spiel', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await prepare(page);
  await openNew(page);
  const input = page.getByTestId('input-opponent');
  await input.focus();
  await expect(page.getByTestId('btn-create')).toBeInViewport({ ratio: 1 });
  await input.fill('TSV Musterstadt');
  await input.press('Enter');
  await expect(page.getByTestId('btn-kickoff')).toBeVisible();
  await expect(page.getByTestId('team-away')).toHaveText('TSV Musterstadt');
});
