import type { Page } from '@playwright/test';
import { addGoal } from '../../src/domain/goals';
import { createGame, endSection, kickoff } from '../../src/domain/game';
import type { Game, Side } from '../../src/domain/types';
import { test, expect } from './fixtures';
import { confirmYes, forward, readStored } from './helpers';

/**
 * Spec 013: mehrere Spiele in der Historie auswählen, alle auswählen, löschen, rückgängig machen.
 * Die Spiele werden mit den Domain-Funktionen gebaut und direkt in IndexedDB geschrieben (schneller als je Spiel
 * über die Oberfläche); fiktive Gegner.
 */

const E1 = 'Sportvg Feuerbach E1';
const E2 = 'Sportvg Feuerbach E2';
const MIN = 60_000;
const at = (day: number, month: number, h = 10, m = 30): number => new Date(2026, month - 1, day, h, m).getTime();

function base(id: string, ownTeam: string, opponent: string, t: number): Game {
  return createGame(
    {
      ownTeam,
      opponent,
      venue: 'home',
      schema: { sections: 1, sectionMinutes: 25 },
      ownColor: 'rot',
      oppColor: 'schwarz',
    },
    { id, now: t },
  );
}

function finished(id: string, ownTeam: string, opponent: string, t: number, goals: Side[] = ['own']): Game {
  let g = kickoff(base(id, ownTeam, opponent, t), t);
  goals.forEach((side, i) => {
    g = addGoal(g, side, t + (i + 1) * 3 * MIN, () => `${id}-tor-${i}`).game;
  });
  return { ...endSection(g, t + 25 * MIN), drawSettled: true };
}

const running = (id: string, ownTeam: string, opponent: string, t: number): Game =>
  kickoff(base(id, ownTeam, opponent, t), t);

/** Neueste zuerst wie in der Historie; alle Zeiten vor dem Teststart (Uhr der Seite = jetzt). */
const SEASON: Game[] = [
  running('r1', E1, 'TSG Stuttgart', at(2, 11, 10, 31)),
  finished('f1', E2, 'SV Zuffenhausen', at(2, 11), ['own', 'opp']),
  finished('f2', E2, 'TV Cannstatt', at(1, 11), ['own', 'own', 'opp']),
  finished('f3', E1, 'TSV Weilimdorf', at(31, 10), ['own', 'opp', 'own']),
  finished('t3', E1, 'Testspiel 3', at(30, 10, 18, 12), ['opp']),
  finished('t2', E1, 'Testspiel 2', at(30, 10, 18, 5), []),
  finished('t1', E1, 'Testspiel 1', at(30, 10, 17, 58), ['own']),
];

async function seed(page: Page, games: Game[]): Promise<void> {
  await page.goto('./');
  await expect(page.getByTestId('btn-new-game')).toBeVisible();
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('torticker');
        open.onupgradeneeded = () => open.transaction?.abort();
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('games', 'readwrite');
          for (const g of list) tx.objectStore('games').put(g);
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    games,
  );
  await page.goto('./#/historie');
  await expect(page.getByTestId('history-list')).toBeVisible();
}

const item = (page: Page, id: string) => page.getByTestId(`history-item-${id}`);
const shownIds = async (page: Page): Promise<string[]> =>
  (
    await page
      .locator('[data-testid^="history-item-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))
  ).map((t) => String(t).replace('history-item-', ''));

async function selectMode(page: Page): Promise<void> {
  await page.getByTestId('history-select').click();
  await expect(page.getByTestId('history-actions')).toBeVisible();
}

async function deleteSelected(page: Page): Promise<void> {
  await page.getByTestId('history-delete').click();
  await confirmYes(page);
}

test.describe('013 US1 mehrere Spiele auswählen und löschen', () => {
  test('013 US1-S1 FR-D01 "Auswählen" nur mit beendetem Spiel', async ({ page }) => {
    await seed(page, [SEASON[0]!]);
    await expect(page.getByTestId('history-select')).toBeHidden();
    await seed(page, SEASON.slice(0, 2));
    await expect(page.getByTestId('history-select')).toHaveText('Auswählen');
  });

  test('013 US1-S2 SC-D04 Auswahlmodus: Häkchen-Felder, "Fertig", "0 ausgewählt", Leiste über der Navigation', async ({
    page,
  }) => {
    await seed(page, SEASON);
    await expect(page.getByTestId('history-meta')).toHaveText('7 Spiele');
    await selectMode(page);
    await expect(page.getByTestId('history-select')).toHaveText('Fertig');
    await expect(page.getByTestId('history-meta')).toHaveText('0 ausgewählt');
    await expect(item(page, 'f3')).toHaveAttribute('role', 'checkbox');
    await expect(item(page, 'f3')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('history-select-all')).toHaveText('Alle auswählen');
    await expect(page.getByTestId('history-delete')).toHaveText('Löschen (0)');
    await expect(page.getByTestId('history-delete')).toBeDisabled();
    // Leiste liegt über der Navigation, Knöpfe mindestens 48 pt hoch.
    const bar = await page.getByTestId('history-actions').boundingBox();
    const nav = await page.getByTestId('nav').boundingBox();
    expect(bar!.y + bar!.height).toBeLessThanOrEqual(nav!.y + 1);
    for (const id of ['history-select-all', 'history-delete', 'history-select'])
      expect((await page.getByTestId(id).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // Die letzte Zeile lässt sich über Leiste und Navigation hinaus scrollen.
    await item(page, 't1').scrollIntoViewIfNeeded();
    const last = await item(page, 't1').boundingBox();
    expect(last!.y + last!.height).toBeLessThanOrEqual(bar!.y + 1);
  });

  test('013 US1-S3 FR-D02 Zeile antippen hakt an und ab, öffnet keine Spieldetails', async ({ page }) => {
    await seed(page, SEASON);
    await selectMode(page);
    await item(page, 't1').click();
    await item(page, 't2').click();
    await expect(page).toHaveURL(/#\/historie$/);
    await expect(item(page, 't1')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('history-meta')).toHaveText('2 ausgewählt');
    await expect(page.getByTestId('history-delete')).toHaveText('Löschen (2)');
    await item(page, 't1').click();
    await expect(item(page, 't1')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('history-meta')).toHaveText('1 ausgewählt');
  });

  test('013 US1-S4 US1-S5 FR-D06 FR-D09 Abfrage mit Anzahl, danach weg und "2 Spiele gelöscht"', async ({ page }) => {
    await seed(page, SEASON);
    await selectMode(page);
    await item(page, 't1').click();
    await item(page, 't2').click();
    await page.getByTestId('history-delete').click();
    await expect(page.getByTestId('confirm-dialog')).toContainText('2 Spiele löschen?');
    await expect(page.getByTestId('confirm-dialog')).toContainText(
      'Sie verschwinden aus der Historie. Du kannst das gleich danach rückgängig machen, später nur über eine Sicherung.',
    );
    await confirmYes(page);
    expect(await shownIds(page)).toEqual(['r1', 'f1', 'f2', 'f3', 't3']);
    await expect(page.getByTestId('history-actions')).toBeHidden();
    await expect(page.getByTestId('history-select')).toHaveText('Auswählen');
    await expect(page.getByTestId('history-undo')).toContainText('2 Spiele gelöscht');
    await expect(page.getByTestId('btn-history-undo')).toHaveText('Rückgängig');
  });

  test('013 US1-S6 "Abbrechen" behält Spiele und Auswahl', async ({ page }) => {
    await seed(page, SEASON);
    await selectMode(page);
    await item(page, 't1').click();
    await page.getByTestId('history-delete').click();
    await page.getByTestId('confirm-no').click();
    await expect(item(page, 't1')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('history-actions')).toBeVisible();
    expect(await shownIds(page)).toHaveLength(7);
  });

  test('013 US1-S7 FR-D10 "Fertig" beendet den Auswahlmodus ohne Änderung', async ({ page }) => {
    await seed(page, SEASON);
    await selectMode(page);
    await item(page, 't1').click();
    await page.getByTestId('history-select').click();
    await expect(page.getByTestId('history-actions')).toBeHidden();
    await expect(page.getByTestId('history-meta')).toHaveText('7 Spiele');
    await item(page, 't1').click();
    await expect(page).toHaveURL(/#\/spiel\/t1\/details$/);
    // FR-D10: zurück in der Historie ist nichts angehakt und der Modus aus.
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('history-select')).toHaveText('Auswählen');
  });

  test('013 US1-S8 FR-D03 SC-D02 laufende und nicht angepfiffene Spiele sind ausgegraut', async ({ page }) => {
    await seed(page, [base('c1', E1, 'FC Später', at(3, 11)), ...SEASON]);
    await selectMode(page);
    await expect(page.getByTestId('history-select-hint')).toHaveText(
      'Nur beendete Spiele lassen sich auswählen. Laufende löschst du in den Spieldetails.',
    );
    for (const id of ['r1', 'c1']) {
      await expect(item(page, id)).toHaveAttribute('aria-disabled', 'true');
      // Antippen trotz "nicht verfügbar" (Playwright klickt sonst nicht): darf nichts anhaken.
      await item(page, id).click({ force: true });
      await expect(item(page, id)).toHaveAttribute('aria-checked', 'false');
    }
    await expect(page.getByTestId('history-meta')).toHaveText('0 ausgewählt');
    await expect(page).toHaveURL(/#\/historie$/);
  });
});

test.describe('013 US2 alle auswählen', () => {
  test('013 US2-S1 US2-S2 US2-S5 FR-D04 "Alle auswählen" nur beendete, dann "Alle abwählen"', async ({ page }) => {
    await seed(page, SEASON);
    await selectMode(page);
    await page.getByTestId('history-select-all').click();
    await expect(page.getByTestId('history-meta')).toHaveText('6 ausgewählt');
    await expect(item(page, 'r1')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('history-select-all')).toHaveText('Alle abwählen');
    await page.getByTestId('history-select-all').click();
    await expect(page.getByTestId('history-meta')).toHaveText('0 ausgewählt');
    await expect(page.getByTestId('history-delete')).toBeDisabled();
    await expect(page.getByTestId('history-select-all')).toHaveText('Alle auswählen');
  });

  test('013 US2-S3 FR-D05 SC-D01 Filter "E2", alle auswählen, löschen: E1 bleibt; 4 Tipps', async ({ page }) => {
    await seed(page, SEASON);
    await page.getByTestId('history-filter-1').click();
    await expect(page.getByTestId('history-filter-1')).toHaveText('E2');
    // SC-D01: Auswählen, Alle auswählen, Löschen (n), Löschen.
    await page.getByTestId('history-select').click();
    await page.getByTestId('history-select-all').click();
    await expect(page.getByTestId('history-delete')).toHaveText('Löschen (2)');
    await page.getByTestId('history-delete').click();
    await page.getByTestId('confirm-yes').click();
    // Ohne E2-Spiele gibt es nur noch einen Mannschaftsnamen: keine Filter mehr, alle übrigen Spiele sichtbar.
    await expect(page.getByTestId('history-filter-all')).toBeHidden();
    expect(await shownIds(page)).toEqual(['r1', 'f3', 't3', 't2', 't1']);
  });

  test('013 US2-S4 FR-D05 Filterwechsel hebt nicht mehr sichtbare Häkchen auf', async ({ page }) => {
    await seed(page, SEASON);
    await selectMode(page);
    await item(page, 'f1').click();
    await item(page, 't1').click();
    await page.getByTestId('history-filter-0').click();
    await expect(page.getByTestId('history-filter-0')).toHaveText('E1');
    await expect(page.getByTestId('history-meta')).toHaveText('1 ausgewählt');
    await expect(page.getByTestId('history-delete')).toHaveText('Löschen (1)');
    await page.getByTestId('history-filter-all').click();
    await expect(item(page, 'f1')).toHaveAttribute('aria-checked', 'false');
    await expect(item(page, 't1')).toHaveAttribute('aria-checked', 'true');
  });

  test('013 US2-S6 alles gelöscht: leerer Zustand, kein "Auswählen", "Rückgängig" bleibt', async ({ page }) => {
    await seed(page, SEASON.slice(1, 3));
    await selectMode(page);
    await page.getByTestId('history-select-all').click();
    await deleteSelected(page);
    await expect(page.getByTestId('history-empty')).toBeVisible();
    await expect(page.getByTestId('history-select')).toBeHidden();
    await expect(page.getByTestId('history-undo')).toContainText('2 Spiele gelöscht');
  });
});

test.describe('013 US3 Löschen rückgängig machen', () => {
  test('013 US3-S1 US3-S2 SC-D03 "Rückgängig" stellt die Spiele unverändert an alter Stelle wieder her', async ({
    page,
  }) => {
    await seed(page, SEASON);
    const before = await readStored<Game>(page, 'games', 'f3');
    await selectMode(page);
    for (const id of ['f3', 't3', 't1']) await item(page, id).click();
    await deleteSelected(page);
    await expect(page.getByTestId('history-undo')).toContainText('3 Spiele gelöscht');
    expect(await shownIds(page)).toEqual(['r1', 'f1', 'f2', 't2']);
    await page.getByTestId('btn-history-undo').click();
    await expect(page.getByTestId('history-undo')).toBeHidden();
    expect(await shownIds(page)).toEqual(['r1', 'f1', 'f2', 'f3', 't3', 't2', 't1']);
    expect(await readStored<Game>(page, 'games', 'f3')).toEqual(before);
  });

  test('013 US3-S1 US3-S3 FR-D07 FR-D08 nach 10 Sekunden ist das Löschen endgültig', async ({ page }) => {
    await seed(page, SEASON);
    await selectMode(page);
    await item(page, 't1').click();
    await deleteSelected(page);
    await expect(page.getByTestId('history-undo')).toContainText('1 Spiel gelöscht');
    await forward(page, 9_000);
    await expect(page.getByTestId('history-undo')).toBeVisible();
    expect(await readStored<Game>(page, 'games', 't1')).toBeDefined();
    await forward(page, 1_000);
    await expect(page.getByTestId('history-undo')).toBeHidden();
    await expect.poll(() => readStored<Game>(page, 'games', 't1')).toBeUndefined();
    await page.reload();
    await expect(page.getByTestId('history-list')).toBeVisible();
    expect(await shownIds(page)).not.toContain('t1');
  });

  test('013 US3-S4 FR-D08 Historie verlassen oder App im Hintergrund: sofort endgültig', async ({ page }) => {
    await seed(page, SEASON);
    await selectMode(page);
    await item(page, 't1').click();
    await deleteSelected(page);
    await page.getByTestId('nav-more').click();
    await expect.poll(() => readStored<Game>(page, 'games', 't1')).toBeUndefined();
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('history-undo')).toBeHidden();
    expect(await shownIds(page)).not.toContain('t1');

    await selectMode(page);
    await item(page, 't2').click();
    await deleteSelected(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => readStored<Game>(page, 'games', 't2')).toBeUndefined();
    await expect(page.getByTestId('history-undo')).toBeHidden();
  });

  test('013 US3-S5 FR-D08 ein neuer Löschvorgang macht den vorigen endgültig', async ({ page }) => {
    await seed(page, SEASON);
    await selectMode(page);
    await item(page, 't1').click();
    await deleteSelected(page);
    await selectMode(page);
    await item(page, 't2').click();
    await item(page, 't3').click();
    await deleteSelected(page);
    await expect(page.getByTestId('history-undo')).toContainText('2 Spiele gelöscht');
    await expect.poll(() => readStored<Game>(page, 'games', 't1')).toBeUndefined();
    await page.getByTestId('btn-history-undo').click();
    expect(await shownIds(page)).toEqual(['r1', 'f1', 'f2', 'f3', 't3', 't2']);
  });

  test('013 US3-S6 FR-D09 Einzellöschen in den Spieldetails mit "Rückgängig"', async ({ page }) => {
    await seed(page, SEASON);
    await item(page, 'f3').click();
    await page.getByTestId('btn-delete-game').click();
    await expect(page.getByTestId('confirm-dialog')).toContainText(
      'Du kannst das gleich danach rückgängig machen, später nur über eine Sicherung.',
    );
    await confirmYes(page);
    await expect(page).toHaveURL(/#\/historie$/);
    await expect(page.getByTestId('history-undo')).toContainText('1 Spiel gelöscht');
    expect(await shownIds(page)).not.toContain('f3');
    await page.getByTestId('btn-history-undo').click();
    expect(await shownIds(page)).toContain('f3');
  });

  test('013 US3-S6 laufendes Spiel einzeln gelöscht: kein "Läuft" in der Navigation, nach "Rückgängig" wieder', async ({
    page,
  }) => {
    await seed(page, SEASON);
    await expect(page.getByTestId('nav-live')).toBeVisible();
    await item(page, 'r1').click();
    await page.getByTestId('btn-delete-game').click();
    await confirmYes(page);
    await expect(page.getByTestId('history-undo')).toContainText('1 Spiel gelöscht');
    await expect(page.getByTestId('nav-live')).toBeHidden();
    await page.getByTestId('btn-history-undo').click();
    await expect(page.getByTestId('nav-live')).toBeVisible();
  });
});
