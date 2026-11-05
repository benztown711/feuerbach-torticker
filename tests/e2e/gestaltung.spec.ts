import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { addTeam, playFinishedGame, seedRoster, startGame } from './helpers';

/**
 * Spec 011: Karten auf getönter Grundfläche, dunkles Theme mit Ebenen, Reiter, Hauptknopf.
 * Farben werden als berechnete Stile gegen die Token-Werte aus design/tokens.json geprüft.
 */

/** Berechneter Wert eines Farb-Tokens, z. B. "rgb(200, 38, 28)". */
function token(page: Page, name: string): Promise<string> {
  return page.evaluate((n) => {
    const el = document.createElement('div');
    el.style.color = `var(--color-${n})`;
    document.body.appendChild(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return c;
  }, name);
}

const style = (loc: Locator, prop: 'backgroundColor' | 'color' | 'borderTopColor' | 'borderTopWidth' | 'opacity') =>
  loc.evaluate((el, p) => getComputedStyle(el)[p], prop);

const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** Relative Leuchtdichte nach WCAG aus "rgb(...)"/"rgba(...)". */
function lum(rgb: string): number {
  const [r = 0, g = 0, b = 0] = (rgb.match(/[\d.]+/g) ?? []).map(Number);
  const ch = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

test.describe('Spec 011 Karten und Abschnitte', () => {
  test('011 US1-S1 FR-G01 FR-G02 Einstellungen: fünf Abschnitte als Karten mit roter Überschrift', async ({ page }) => {
    await page.goto('./#/einstellungen');
    const cards = page.locator('.settings .card');
    await expect(cards).toHaveCount(5);
    const titles = page.locator('.settings .card__title');
    await expect(titles).toHaveText([
      'MEINE MANNSCHAFTEN',
      'IM SPIEL ERFASSEN',
      'SIGNALTON',
      'DARSTELLUNG',
      'SICHERUNG',
    ]);
    const red = await token(page, 'rot-text');
    for (const t of await titles.all()) expect(await style(t, 'color')).toBe(red);
    expect(await style(cards.first(), 'backgroundColor')).toBe(await token(page, 'card'));
    expect(await bodyBg(page)).toBe(await token(page, 'canvas'));
  });

  test('011 US1-S2 FR-G03 Neues Spiel: Begegnung, Spielzeit und Aufgebot je eine Karte', async ({ page }) => {
    await seedRoster(page, ['1 Max', '2 Ben', '3 Tom'].join('\n'));
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    const matchup = page.getByTestId('card-matchup');
    await expect(matchup.locator('.card__title')).toHaveText('BEGEGNUNG');
    for (const id of ['input-opponent', 'btn-swap-venue', 'kit-own-change', 'kit-opp-change']) {
      await expect(matchup.getByTestId(id)).toBeVisible();
    }
    const schema = page.getByTestId('card-schema');
    await expect(schema.locator('.card__title')).toHaveText('SPIELZEIT');
    await expect(schema.getByTestId('schema-sections')).toBeVisible();
    await expect(schema.getByTestId('btn-test-signal')).toBeVisible();
    await expect(page.getByTestId('card-squad').getByTestId('squad-picker')).toBeVisible();
    await expect(page.getByTestId('card-squad').getByTestId('squad-count')).toHaveText('AUFGEBOT · 0 VON 3');
  });

  test('011 US1-S3 Spieldetails: Karten Ergebnis, Spielverlauf und Ergebnis teilen', async ({ page }) => {
    await playFinishedGame(page, ['own', 'opp', 'own']);
    await page.getByTestId('nav-history').click();
    await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
    await expect(page.getByTestId('details-score')).toHaveClass(/\bcard\b/);
    const timeline = page.getByTestId('card-timeline');
    await expect(timeline.locator('.card__title')).toHaveText('SPIELVERLAUF');
    await expect(timeline.getByTestId('details-timeline')).toBeVisible();
    const share = page.getByTestId('card-share');
    await expect(share.locator('.card__title')).toHaveText('ERGEBNIS TEILEN');
    await expect(share.getByTestId('share-preview')).toBeVisible();
    await expect(share.getByTestId('btn-share')).toBeVisible();
  });

  test('011 US1-S4 FR-G08 Kader: Liste als Karte, Ändern und Löschen ruhig', async ({ page }) => {
    await seedRoster(page, ['1 Max', '2 Ben'].join('\n'));
    const card = page.getByTestId('card-roster');
    await expect(card.locator('.card__title')).toHaveText('2 SPIELER');
    await expect(card.getByTestId('roster-list')).toBeVisible();
    const tonal = await token(page, 'tonal');
    for (const name of ['Max ändern', 'Max löschen']) {
      const btn = card.getByRole('button', { name });
      expect(await style(btn, 'backgroundColor')).toBe(tonal);
      const box = await btn.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(40);
    }
  });

  test('011 US1-S5 Mehr: Menü als Karte, jede Zeile mit Pfeil', async ({ page }) => {
    await page.goto('./#/mehr');
    const menu = page.getByTestId('more-menu');
    await expect(menu).toHaveClass(/\bcard\b/);
    const items = await menu.locator('.menu-list__item').count();
    expect(items).toBeGreaterThanOrEqual(3);
    await expect(menu.locator('.menu-list__item .menu-list__chevron')).toHaveCount(items);
  });

  test('011 US1-S6 FR-G09 Historie: je Monat eine Karte mit Überschrift, neueste zuerst', async ({ page }) => {
    await page.clock.setSystemTime(new Date('2026-10-20T10:00:00'));
    await playFinishedGame(page, ['own'], { opponent: 'FC Oktober' });
    await page.clock.setSystemTime(new Date('2026-11-02T10:00:00'));
    await playFinishedGame(page, ['opp'], { opponent: 'SC November' });
    await page.getByTestId('nav-history').click();
    const months = page.getByTestId('history-list').locator('.card');
    await expect(months.locator('.card__title')).toHaveText(['NOVEMBER 2026', 'OKTOBER 2026']);
    await expect(months.nth(0)).toContainText('SC November');
    await expect(months.nth(1)).toContainText('FC Oktober');
  });

  test('011 US1-S7 Hilfe: je Thema eine Karte, Suchtreffer und Eintrag ebenfalls', async ({ page }) => {
    await page.goto('./#/hilfe');
    const topic = page.getByTestId('help-topic-spiel');
    await expect(topic).toHaveClass(/\bcard__title\b/);
    expect(await style(topic, 'color')).toBe(await token(page, 'rot-text'));
    await expect(page.locator('.help-group.card').first()).toBeVisible();
    await page.getByTestId('help-search').fill('Tor');
    await expect(page.getByTestId('help-results').locator('.help-list.card')).toBeVisible();
    await page.getByTestId('help-results').locator('.help-row').first().click();
    await expect(page.getByTestId('help-entry')).toHaveClass(/\bcard\b/);
  });

  test('011 US1-S8 Live-Spieltag: Hinweis "Was das Handy verlässt" als Karte', async ({ page }) => {
    await page.goto('./#/live-spieltag');
    const box = page.getByTestId('live-empty').locator('.live__box');
    await expect(box).toHaveClass(/\bcard\b/);
    await expect(box.locator('.card__title')).toHaveText('WAS DAS HANDY VERLÄSST');
    expect(await style(box, 'backgroundColor')).toBe(await token(page, 'card'));
    expect(await bodyBg(page)).toBe(await token(page, 'canvas'));
  });
});

test.describe('Spec 011 Dunkles Theme mit Ebenen', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('011 US2-S1 FR-G05 Grund dunkler als die Karten, Karten mit sichtbarem Rand', async ({ page }) => {
    await page.goto('./#/einstellungen');
    const card = page.locator('.settings .card').first();
    const cardBg = await style(card, 'backgroundColor');
    expect(lum(await bodyBg(page))).toBeLessThan(lum(cardBg));
    expect(await style(card, 'borderTopWidth')).toBe('1px');
    expect(await style(card, 'borderTopColor')).toBe(await token(page, 'line'));
    expect(await style(card, 'borderTopColor')).not.toBe(cardBg);
  });

  test('011 US2-S2 FR-G04 Abdunkler hinter Abfragen ist dunkler als der Inhalt', async ({ page }) => {
    await seedRoster(page, '1 Max');
    await page.getByRole('button', { name: 'Max löschen' }).click();
    const backdrop = page.getByTestId('confirm-backdrop');
    await expect(backdrop).toBeVisible();
    expect(lum(await style(backdrop, 'backgroundColor'))).toBeLessThan(lum(await token(page, 'surface')));
    expect(Number(await style(backdrop, 'opacity'))).toBeGreaterThanOrEqual(0.5);
    // auch im hellen Theme
    await page.emulateMedia({ colorScheme: 'light' });
    expect(lum(await style(backdrop, 'backgroundColor'))).toBeLessThan(lum(await token(page, 'surface')));
  });

  test('011 US2-S3 FR-G05 Eingabefelder sind in der Karte vertieft', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    const input = page.getByTestId('input-opponent');
    const card = page.getByTestId('card-matchup');
    expect(lum(await style(input, 'backgroundColor'))).toBeLessThan(lum(await style(card, 'backgroundColor')));
    const select = page.getByTestId('schema-sections');
    expect(await style(select, 'backgroundColor')).toBe(await token(page, 'field'));
  });
});

test.describe('Spec 011 Reiter, Hauptknopf, Torliste', () => {
  test('011 US3-S1 FR-G06 aktiver Reiter mit vereinsroter Marke und getöntem Symbol', async ({ page }) => {
    await page.goto('./#/historie');
    const active = page.getByTestId('nav-history');
    expect(await style(active, 'borderTopColor')).toBe(await token(page, 'vereinsrot'));
    expect(await style(active.locator('.nav__icon'), 'backgroundColor')).toBe(await token(page, 'rot-hell'));
    const inactive = page.getByTestId('nav-more');
    expect(await style(inactive, 'borderTopColor')).toBe('rgba(0, 0, 0, 0)');
    expect(await style(inactive.locator('.nav__icon'), 'backgroundColor')).toBe('rgba(0, 0, 0, 0)');
  });

  test('011 US4-S1 FR-G06a Hauptknopf vereinsrot, gewählte Chips bleiben ink', async ({ page }) => {
    await seedRoster(page, ['1 Max', '2 Ben'].join('\n'));
    await page.goto('./');
    expect(await style(page.getByTestId('btn-new-game'), 'backgroundColor')).toBe(await token(page, 'rot-tief'));
    await page.getByTestId('btn-new-game').click();
    await page.getByTestId('input-opponent').fill('TSV Musterstadt');
    const chip = page.getByTestId('squad-picker').getByRole('button', { name: '1 Max' });
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    const create = page.getByTestId('btn-create');
    expect(await style(create, 'backgroundColor')).toBe(await token(page, 'rot-tief'));
    expect(await style(create, 'color')).toBe(await token(page, 'on-rot'));
    expect(await style(chip, 'backgroundColor')).toBe(await token(page, 'ink'));
  });

  test('011 US4-S2 FR-G06a FR-G07 Spielbildschirm: Anpfiff neutral, Torliste auf surface-alt', async ({ page }) => {
    await startGame(page);
    expect(await style(page.getByTestId('btn-pause'), 'backgroundColor')).toBe(await token(page, 'surface'));
    await page.getByTestId('btn-goal-own').click();
    const list = page.locator('.goal-list');
    expect(await style(list, 'backgroundColor')).toBe(await token(page, 'surface-alt'));
    // vor dem Anpfiff ist der Hauptknopf neutral (ink), nicht vereinsrot
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await page.getByTestId('input-opponent').fill('FC Vorbild');
    await page.getByTestId('btn-create').click();
    expect(await style(page.getByTestId('btn-kickoff'), 'backgroundColor')).toBe(await token(page, 'ink'));
  });

  test('005 SC-G05 SC-M02 Neues Spiel passt auf dem iPhone SE mit höchstens einmal Scrollen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await addTeam(page, 'Sportvg Feuerbach E1');
    await seedRoster(page, ['1 Max', '2 Ben', '3 Tom', '4 Leo', '5 Paul', '6 Maxi', '7 Finn', '8 Noah'].join('\n'));
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await expect(page.getByTestId('card-matchup')).toBeVisible();
    const { sh, ih } = await page.evaluate(() => ({
      sh: (document.scrollingElement as HTMLElement).scrollHeight,
      ih: window.innerHeight,
    }));
    expect(sh).toBeLessThanOrEqual(2 * ih);
  });
});
