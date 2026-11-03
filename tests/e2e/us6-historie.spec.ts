import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';
import { MIN, confirmYes, forward, newGame, playFinishedGame } from './helpers';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };

test.describe('US6 Spielhistorie (FR-022, FR-038)', () => {
  test('US6-S1 US6-S7 neueste zuerst, Ergebnis aus Feuerbach-Sicht mit S/U/N', async ({ page }) => {
    await playFinishedGame(page, ['own', 'opp', 'own'], { opponent: 'FC Erster' });
    await forward(page, 30 * MIN);
    await playFinishedGame(page, ['opp', 'opp', 'own'], { opponent: 'SV Zweiter', away: true });
    await page.getByTestId('nav-history').click();
    const items = page.getByTestId('history-list').locator('[data-testid^="history-item-"]');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText('SV Zweiter');
    await expect(items.nth(0)).toContainText('auswärts');
    await expect(items.nth(0)).toContainText('1:2');
    await expect(items.nth(0)).toContainText('N');
    await expect(items.nth(1)).toContainText('FC Erster');
    await expect(items.nth(1)).toContainText('2:1');
    await expect(items.nth(1)).toContainText(/\d\d:\d\d/);
    await expect(page.getByTestId('history-filter-all')).toHaveCount(0);
  });

  test('US6-S6 Filter nach eigener Mannschaft', async ({ page }) => {
    await playFinishedGame(page, ['own'], { ownTeam: 'Sportvg Feuerbach E1', opponent: 'FC Erster' });
    await playFinishedGame(page, ['opp'], { ownTeam: 'Sportvg Feuerbach E2', opponent: 'SV Zweiter' });
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('history-filter-all')).toHaveAttribute('aria-pressed', 'true');
    const e1 = page.getByRole('button', { name: 'E1', exact: true });
    await e1.click();
    await expect(e1).toHaveAttribute('aria-pressed', 'true');
    const items = page.getByTestId('history-list').locator('[data-testid^="history-item-"]');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('FC Erster');
    await page.getByTestId('history-filter-all').click();
    await expect(items).toHaveCount(2);
  });

  test('US6-S2 Spieldetails: Zeitleiste mit Uhrzeiten, Heim : Gast, Nachspielzeit-Minute', async ({ page }) => {
    await playFinishedGame(page, ['own'], { opponent: 'FC Erster', away: true });
    await page.getByTestId('nav-history').click();
    await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
    await expect(page.getByTestId('details-score')).toContainText('FC Erster : Sportvg Feuerbach');
    await expect(page.getByTestId('details-score')).toContainText('0:1');
    const timeline = page.getByTestId('details-timeline');
    await expect(timeline).toContainText('Anpfiff');
    await expect(timeline).toContainText("2'");
    await expect(timeline).toContainText('Schlusspfiff');
    await expect(timeline).toContainText(/\d\d:\d\d:\d\d/);
    await expect(page.getByTestId('nav-history')).toHaveAttribute('aria-current', 'page');
  });

  test('US6-S3 Spiele bleiben nach Neuladen erhalten', async ({ page }) => {
    await playFinishedGame(page, ['own'], { opponent: 'FC Erster' });
    await page.reload();
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('history-list')).toContainText('FC Erster');
  });

  test('US6-S4 Löschen nur nach Bestätigung', async ({ page }) => {
    await playFinishedGame(page, ['own'], { opponent: 'FC Erster' });
    await page.getByTestId('nav-history').click();
    await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
    await page.getByTestId('btn-delete-game').click();
    await page.getByTestId('confirm-no').click();
    await expect(page.getByTestId('details-timeline')).toBeVisible();
    await page.getByTestId('btn-delete-game').click();
    await confirmYes(page);
    await expect(page.getByTestId('history-empty')).toBeVisible();
  });

  test('US6-S5 FR-024 Sicherung über das Teilen-Menü und Wiederherstellen', async ({ page, recorded }) => {
    await playFinishedGame(page, ['own', 'opp'], { opponent: 'FC Erster' });
    await page.getByTestId('nav-more').click();
    await page.getByTestId('more-settings').click();
    await page.getByTestId('btn-export').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(1);
    const share = (await recorded()).shares[0]!;
    expect(share.fileName).toMatch(/^torticker-sicherung-\d{4}-\d{2}-\d{2}\.json$/);
    const backup = share.fileText ?? '';
    expect(JSON.parse(backup)).toMatchObject({ format: 'feuerbach-torticker-backup' });
    // Feinschliff: App-Version aus package.json steht in der Sicherung
    expect(JSON.parse(backup).appVersion).toBe(pkg.version);

    await page.getByTestId('nav-history').click();
    await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
    await page.getByTestId('btn-delete-game').click();
    await confirmYes(page);
    await expect(page.getByTestId('history-empty')).toBeVisible();

    await page.getByTestId('nav-more').click();
    await page.getByTestId('more-settings').click();
    await page
      .getByTestId('input-import')
      .setInputFiles({ name: 'sicherung.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
    await expect(page.getByTestId('import-result')).toContainText('1 Spiel');
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('history-list')).toContainText('FC Erster');
  });

  test('FR-024 fremde Datei wird mit Hinweis abgelehnt', async ({ page }) => {
    await page.goto('./#/einstellungen');
    await page
      .getByTestId('input-import')
      .setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"foo":1}') });
    await expect(page.getByTestId('import-result')).toContainText('keine Torticker-Sicherung');
  });

  test('FR-038 angelegtes Spiel ohne Anpfiff heißt in der Historie "nicht angepfiffen"', async ({ page }) => {
    await newGame(page, { opponent: 'SC Später' });
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('history-list').locator('[data-testid^="history-open-"]').first()).toHaveText(
      'nicht angepfiffen',
    );
  });
});
