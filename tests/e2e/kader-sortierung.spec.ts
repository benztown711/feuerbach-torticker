import type { Locator, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
import { MIN, SEC, confirmYes, forward, readStored, seedRoster } from './helpers';
import type { Settings } from '../../src/domain/types';

/** Spec 013: Kader aus der Spec, "Leo" ohne Nummer. */
const ROSTER = '7 Max\n3 Tom\n10 Ben\nLeo';
const BY_NAME = ['10 Ben', 'Leo', '7 Max', '3 Tom'];
const BY_NUMBER = ['3 Tom', '7 Max', '10 Ben', 'Leo'];

async function chooseSort(page: Page, sort: 'name' | 'number'): Promise<void> {
  await page.goto('./#/einstellungen');
  await page.getByTestId(`roster-sort-${sort}`).click();
  await expect(page.getByTestId(`roster-sort-${sort}`)).toHaveAttribute('aria-pressed', 'true');
  // Die App speichert ohne zu warten; vor dem Wegnavigieren muss der Wert in IndexedDB stehen.
  await expect.poll(async () => (await readStored<Settings>(page, 'settings', 'app'))?.rosterSort).toBe(sort);
}

/** Beschriftung der Knöpfe ("7 Max") in Reihenfolge; Nummer und Name stehen teils untereinander. */
const labels = (items: Locator): Promise<string[]> =>
  items.evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim()));

/** Kaderliste: "Nummer Name" je Zeile. */
const rosterLabels = (page: Page): Promise<string[]> =>
  page
    .locator('[data-testid^="roster-row-"]')
    .evaluateAll((rows) =>
      rows.map((r) =>
        [r.querySelector('.roster-row__number')?.textContent, r.querySelector('.roster-row__name')?.textContent]
          .filter((t) => t)
          .join(' '),
      ),
    );

/** Neues Spiel mit Aufgebot (Knöpfe "7 Max" usw.), angepfiffen. Leeres Aufgebot = ganzer Kader. */
async function startWithSquad(page: Page, squad: string[] = [], oneSection = false): Promise<void> {
  await page.goto('./');
  await page.getByTestId('btn-new-game').click();
  await page.getByTestId('input-opponent').fill('TSV Musterstadt');
  if (oneSection) {
    await page.getByTestId('schema-sections').selectOption('1');
    await page.getByTestId('schema-minutes').selectOption('12');
  }
  const picker = page.getByTestId('squad-picker');
  for (const label of squad) await picker.getByRole('button', { name: label, exact: true }).click();
  await page.getByTestId('btn-create').click();
  await page.getByTestId('btn-kickoff').click();
  await expect(page.getByTestId('btn-pause')).toBeVisible();
}

const scorerOptions = (page: Page) => page.getByTestId('scorer-picker').locator('[data-testid^="scorer-option-"]');

test.describe('Spec 013 Kader sortieren', () => {
  test('013 US1-S1 FR-K01 FR-K02 Einstellungen zeigen "KADER", "Vorname" ist vorgewählt; ohne axe-Verstöße', async ({
    page,
  }) => {
    await page.goto('./#/einstellungen');
    const section = page.getByTestId('settings-roster-sort');
    await expect(section).toContainText('KADER');
    await expect(section).toContainText('Sortieren nach');
    await expect(section.getByRole('button')).toHaveText(['Vorname', 'Rückennummer']);
    await expect(page.getByTestId('roster-sort-name')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('roster-sort-number')).toHaveAttribute('aria-pressed', 'false');
    await expect(section).toContainText('Gilt für Kader, Aufgebot und alle Spieler-Auswahlen im Spiel.');
    // Direkt unter "Meine Mannschaften" (Review A).
    const titles = await page.locator('.settings__section .card__title').allTextContents();
    expect(titles.map((t) => t.trim()).slice(0, 2)).toEqual(['MEINE MANNSCHAFTEN', 'KADER']);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test('013 US1-S2 FR-K03 Torschützen-Auswahl nach Vorname: Ben, Leo, Max, Tom', async ({ page }) => {
    await seedRoster(page, ROSTER);
    await startWithSquad(page);
    await page.getByTestId('btn-goal-own').click();
    await expect(scorerOptions(page)).toHaveCount(4);
    expect(await labels(scorerOptions(page))).toEqual(BY_NAME);
  });

  test('013 US1-S3 FR-K04 nach "Rückennummer": 3 Tom, 7 Max, 10 Ben, Leo', async ({ page }) => {
    await seedRoster(page, ROSTER);
    await chooseSort(page, 'number');
    await startWithSquad(page);
    await page.getByTestId('btn-goal-own').click();
    await expect(scorerOptions(page)).toHaveCount(4);
    expect(await labels(scorerOptions(page))).toEqual(BY_NUMBER);
  });

  test('013 US1-S4 FR-K05 Kaderliste und Aufgebot folgen der Sortierung', async ({ page }) => {
    await seedRoster(page, ROSTER);
    expect(await rosterLabels(page)).toEqual(BY_NAME);
    await chooseSort(page, 'number');
    await page.goto('./#/kader');
    await expect(page.locator('[data-testid^="roster-row-"]')).toHaveCount(4);
    expect(await rosterLabels(page)).toEqual(BY_NUMBER);
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    const squad = page.getByTestId('squad-picker').getByRole('button');
    await expect(squad).toHaveCount(4);
    expect(await labels(squad)).toEqual(BY_NUMBER);
  });

  test('013 US1-S4 FR-K05 Vorlage, Karten und Wechsel folgen der Sortierung', async ({ page }) => {
    await seedRoster(page, ROSTER);
    await page.goto('./#/einstellungen');
    for (const k of ['assists', 'cards', 'subs']) {
      await page.getByTestId(`feature-${k}`).click();
      await expect(page.getByTestId(`feature-${k}`)).toHaveAttribute('aria-checked', 'true');
    }
    await chooseSort(page, 'number');
    await startWithSquad(page);
    await forward(page, 2 * MIN);
    // Vorlage: ohne den Torschützen (Tom), Reihenfolge nach Nummer.
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-picker').getByRole('button', { name: '3 Tom', exact: true }).click();
    const assist = page.getByTestId('assist-picker').locator('[data-testid^="assist-option-"]');
    await expect(assist).toHaveCount(3);
    expect(await labels(assist)).toEqual(['7 Max', '10 Ben', 'Leo']);
    await page.getByTestId('assist-picker').getByRole('button', { name: '10 Ben', exact: true }).click();
    await expect(page.getByTestId('assist-picker')).toHaveCount(0);
    // Karte
    await page.getByTestId('btn-event-card').click();
    await page.getByTestId('event-card-gelb').click();
    const cardPlayers = page.locator('[data-testid^="card-player-"]');
    await expect(cardPlayers).toHaveCount(4);
    expect(await labels(cardPlayers)).toEqual(BY_NUMBER);
    await page.getByTestId('card-no-player').click();
    // Wechsel
    await page.getByTestId('btn-event-sub').click();
    const subOut = page.locator('[data-testid^="sub-out-"]');
    await expect(subOut).toHaveCount(4);
    expect(await labels(subOut)).toEqual(BY_NUMBER);
  });

  test('013 US1-S4 FR-K05 Elfmeterschießen: Schützen nach Rückennummer', async ({ page }) => {
    await seedRoster(page, ROSTER);
    await chooseSort(page, 'number');
    await startWithSquad(page, [], true);
    await forward(page, 2 * MIN);
    await page.getByTestId('btn-goal-own').click();
    await page.getByTestId('scorer-skip').click();
    await forward(page, 2 * MIN);
    await page.getByTestId('btn-goal-opp').click();
    await forward(page, 11 * SEC);
    await page.getByTestId('btn-section-end').click();
    await confirmYes(page);
    await page.getByTestId('draw-shootout').click();
    await page.getByTestId('first-own').click();
    const shooters = page.locator('[data-testid^="pen-pick-"]');
    await expect(shooters).toHaveCount(4);
    expect(await labels(shooters)).toEqual(BY_NUMBER);
  });

  test('013 US1-S5 FR-K05 Aufgebot zuerst, "Andere …" hängt den Rest an, beide nach Vorname', async ({ page }) => {
    await seedRoster(page, ROSTER);
    await startWithSquad(page, ['7 Max', '3 Tom']);
    await page.getByTestId('btn-goal-own').click();
    await expect(scorerOptions(page)).toHaveCount(2);
    expect(await labels(scorerOptions(page))).toEqual(['7 Max', '3 Tom']);
    await page.getByTestId('scorer-others').click();
    await expect(scorerOptions(page)).toHaveCount(4);
    expect(await labels(scorerOptions(page))).toEqual(['7 Max', '3 Tom', '10 Ben', 'Leo']);
  });

  test('013 US1-S6 FR-K05 "Kader teilen" nach Vorname', async ({ page, recorded }) => {
    await seedRoster(page, ROSTER);
    await page.getByTestId('btn-share-roster').click();
    await expect.poll(async () => (await recorded()).shares.at(-1)?.text).toBe('10 Ben\nLeo\n7 Max\n3 Tom');
  });

  test('013 US1-S7 FR-K01 Sortierung bleibt nach Neustart erhalten', async ({ page }) => {
    await seedRoster(page, ROSTER);
    await chooseSort(page, 'number');
    await page.reload();
    await expect(page.getByTestId('roster-sort-number')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('roster-sort-name')).toHaveAttribute('aria-pressed', 'false');
    await page.goto('./#/kader');
    await expect(page.locator('[data-testid^="roster-row-"]')).toHaveCount(4);
    expect(await rosterLabels(page)).toEqual(BY_NUMBER);
  });

  test('013 US1-S8 FR-K02 Einstellungen von vor dem Update (ohne Sortierung) gelten als "Vorname"', async ({
    page,
  }) => {
    await seedRoster(page, ROSTER);
    await chooseSort(page, 'number');
    // Stand vor Spec 013: gespeicherte Einstellungen ohne Feld "rosterSort".
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('torticker');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const store = db.transaction('settings', 'readwrite').objectStore('settings');
            const get = store.get('app');
            get.onsuccess = () => {
              const old = { ...(get.result as Record<string, unknown>) };
              delete old.rosterSort;
              const put = store.put(old, 'app');
              put.onsuccess = () => {
                db.close();
                resolve();
              };
              put.onerror = () => reject(put.error);
            };
          };
        }),
    );
    await page.goto('./#/kader');
    await page.reload();
    await expect(page.locator('[data-testid^="roster-row-"]')).toHaveCount(4);
    expect(await rosterLabels(page)).toEqual(BY_NAME);
    await page.goto('./#/einstellungen');
    await expect(page.getByTestId('roster-sort-name')).toHaveAttribute('aria-pressed', 'true');
  });
});
