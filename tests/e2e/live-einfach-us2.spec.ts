import { webcrypto } from 'node:crypto';
import type { Locator, Page } from '@playwright/test';
import { expect, test, type Recorded } from './fixtures';
import {
  acceptDraw,
  confirmYes,
  ensureTeam,
  forward,
  MIN,
  newGame,
  readStored,
  SEC,
  seedRoster,
  shareAsText,
  startGame,
} from './helpers';
import { createLive, linkData, openTrainerSection, pasteLink, recordedOf } from './live-helpers';

/**
 * Spec 020 US2: "Live für Eltern" mit einem Hauptknopf und eingeklapptem "Für Trainer"; im Spiel "Teilen" mit
 * "Live-Link für Eltern" und "Stand als Text". "Ergebnis teilen" bleibt ein Tipp (Präzisierung 2026-11-17).
 */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const E1 = 'Sportvg Feuerbach E1';

/** Testkennungen der Nachfahren in Reihenfolge. */
const ids = (scope: Locator): Promise<(string | null)[]> =>
  scope.locator('[data-testid]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));

const toggle = (page: Page): Locator => page.getByTestId('live-trainer-toggle');
const lastText = async (rec: () => Promise<Recorded>): Promise<string> => (await rec()).shares.at(-1)?.text ?? '';

/** "Live für Eltern" frisch geöffnet (nach Neustart der App, "Für Trainer" zu). */
async function openLiveFresh(page: Page): Promise<void> {
  await page.goto('./#/live-spieltag');
  await page.reload();
  await expect(page.locator('main.page .live').first()).toBeVisible();
}

/** Sichtbarer Text der Seite außerhalb von "Für Trainer" (zugeklappt). */
const visibleText = (page: Page): Promise<string> => page.locator('main.page').innerText();

/**
 * Lead-Link der ersten Version (Spec 006, contracts/live-link.md) für eine Mannschaft, gebaut aus dem Trainer-Link:
 * eigener Lead-Schlüssel, Zertifikat und Konfiguration mit dem Organisator-Schlüssel signiert.
 */
async function leadLinkFor(trainerUrl: string, team: string): Promise<string> {
  const subtle = webcrypto.subtle;
  const link = linkData(trainerUrl) as Record<string, unknown> & { q: { d: string; x: string; y: string } };
  const org = await subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', ...link.q },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const sign = async (text: string): Promise<{ d: string; s: string }> => ({
    d: text,
    s: Buffer.from(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, org, new TextEncoder().encode(text))).toString(
      'base64url',
    ),
  });
  const pair = (await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])) as CryptoKeyPair;
  const pub = Buffer.from(await subtle.exportKey('raw', pair.publicKey)).toString('base64url');
  const jwk = await subtle.exportKey('jwk', pair.privateKey);
  const [key, name, homeColor, awayColor] = (link.m as string[][]).find((t) => t[0] === team) as string[];
  const c = await sign(JSON.stringify({ key, name, homeColor, awayColor, pub, iat: Date.now() }));
  const g = await sign(JSON.stringify(link.config));
  const data = { v: 1, t: link.t, k: link.k, o: link.o, n: link.n, c, p: { d: jwk.d, x: jwk.x, y: jwk.y }, g };
  return `${trainerUrl.slice(0, trainerUrl.indexOf('#'))}#/lead/${Buffer.from(JSON.stringify(data)).toString('base64url')}`;
}

test('020 US2-S1 Eintrag "Live für Eltern" unter "Mehr" mit Unterzeile, Seitentitel', async ({ page }) => {
  await page.goto('./#/mehr');
  const item = page.getByTestId('more-live');
  await expect(item).toContainText('Live für Eltern');
  await expect(item).toContainText('Eltern zuschauen lassen, Trainer-Link, Spielplan');
  await expect(item).not.toContainText('Live-Spieltag');
  await item.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Live für Eltern');
  await expect(page).toHaveURL(/#\/live-spieltag$/);
});

test('020 US2-S2 US2-S3 Übersicht: ein Hauptknopf, "Für Trainer" eingeklappt, aufgeklappt in fester Reihenfolge', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  await openLiveFresh(page);
  const overview = page.getByTestId('live-overview');
  await expect(page.getByTestId('live-title')).toHaveText('Unser Spieltag');
  await expect(page.getByTestId('live-lead')).toHaveText(
    'Eltern sehen Stand, Minute und Tore live, ohne App. Der Link gilt die ganze Saison.',
  );
  const share = page.getByTestId('btn-share-viewer');
  await expect(share).toHaveText('Link für Eltern teilen');
  await expect(share).toHaveClass(/btn--primary/);
  await expect(page.locator('main.page .btn--primary')).toHaveCount(1);
  await expect(page.getByTestId('btn-live-dashboard')).toHaveText('Dashboard ansehen');
  await expect(toggle(page)).toHaveText(/Für Trainer/);
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  expect((await toggle(page).boundingBox())!.height).toBeGreaterThanOrEqual(64);
  await expect(page.getByTestId('live-trainer')).toHaveCount(0);
  expect(await ids(overview)).toEqual([
    'live-title',
    'live-lead',
    'btn-share-viewer',
    'btn-live-dashboard',
    'live-trainer-toggle',
  ]);

  // "Link für Eltern teilen" teilt wie bisher "Zuschauer-Link teilen".
  const before = (await recorded()).shares.length;
  await share.click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(before + 1);
  expect(await lastText(recorded)).toBe(`Unser Spieltag live verfolgen: ${links.viewer}`);

  // S3: aufgeklappt
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
  const trainer = page.getByTestId('live-trainer');
  await expect(trainer).toBeVisible();
  await expect(toggle(page)).toHaveAttribute('aria-controls', 'live-trainer');
  const order = await ids(trainer);
  const at = (id: string): number => {
    const i = order.indexOf(id);
    expect(i, id).toBeGreaterThanOrEqual(0);
    return i;
  };
  // Spec 022 FR-F35: "Link einfügen" steht im ersten Abschnitt direkt unter "Trainer-Link teilen".
  const sequence = [
    'btn-share-trainer',
    'btn-paste-link',
    'live-team-row-E1',
    'live-team-row-E2',
    'btn-team-remove-E2',
    'live-plan',
    'btn-plan',
    'btn-live-title',
    'btn-live-reissue',
    'btn-live-end',
  ].map(at);
  expect(sequence).toEqual([...sequence].sort((a, b) => a - b));
  await expect(page.getByTestId('btn-share-trainer')).toHaveText('Trainer-Link teilen');
  await expect(page.getByTestId('btn-share-trainer')).toHaveClass(/btn--secondary/);
  await expect(page.getByTestId('btn-live-end')).toHaveText('Live beenden …');
  await expect(page.getByTestId('btn-paste-link')).toHaveText('Link einfügen');
  await expect(page.locator('main.page .btn--primary')).toHaveCount(1);
  // Trainer-Link teilen wie bisher
  await page.getByTestId('btn-share-trainer').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(before + 2);
  expect(linkData(await lastText(recorded)).t).toBe(linkData(links.trainer).t);

  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(trainer).toHaveCount(0);
});

test('020 US2-S4 "Für Trainer" bleibt offen nach "Spielplan" und zurück, nach Neustart wieder zu', async ({
  page,
  recorded,
  relay,
}) => {
  await createLive(page, recorded, { teams: ['E1'] });
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  await openLiveFresh(page);
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await toggle(page).click();
  await page.getByTestId('btn-plan').click();
  await expect(page).toHaveURL(/#\/live-spieltag\/spielplan$/);
  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(page).toHaveURL(/#\/live-spieltag$/);
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('live-trainer')).toBeVisible();
  await page.reload();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
});

test('020 US2-S5 zugeklappt weder "Kopplung" noch "Zuschauer-Link", auch mit Hinweis "Neue Links ausgestellt"', async ({
  page,
  recorded,
  relay,
}) => {
  await createLive(page, recorded, { teams: ['E1', 'E2'] });
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  await openLiveFresh(page);
  let text = await visibleText(page);
  expect(text).not.toMatch(/Kopplung|Zuschauer-Link/);
  await expect(page.locator('main.page .btn--primary')).toHaveCount(1);

  await toggle(page).click();
  await page.getByTestId('btn-live-reissue').click();
  await confirmYes(page);
  const notice = page.getByTestId('live-reissued');
  await expect(notice).toContainText('Neue Links ausgestellt');
  await expect(notice).toContainText(
    'Die alten Links zeigen nichts Neues mehr. Schick jetzt beide neuen Links: den Link für Eltern an die Elterngruppe, den Trainer-Link an eure Trainergruppe.',
  );
  await toggle(page).click();
  await expect(page.getByTestId('live-trainer')).toHaveCount(0);
  text = await visibleText(page);
  expect(text).not.toMatch(/Kopplung|Zuschauer-Link/);
  await expect(page.locator('main.page .btn--primary')).toHaveCount(1);
  // Der Hinweis steht über dem Hauptknopf.
  const [n, s] = [await notice.boundingBox(), await page.getByTestId('btn-share-viewer').boundingBox()];
  expect(n!.y).toBeLessThan(s!.y);
});

test('020 US2-S6 "Live beenden …": Rückfrage und Meldung, das Handy sendet nichts mehr', async ({
  page,
  recorded,
  relay,
}) => {
  await createLive(page, recorded, { teams: ['E1'] });
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  await openTrainerSection(page);
  await page.getByTestId('btn-live-end').click();
  const dialog = page.getByTestId('confirm-dialog');
  await expect(dialog).toContainText('Live beenden?');
  await expect(dialog).toContainText(
    'Dieses Handy sendet dann nichts mehr an „Unser Spieltag“. Die Spiele bleiben auf dem Handy.',
  );
  await expect(page.getByTestId('confirm-yes')).toHaveText('Beenden');
  await confirmYes(page);
  await expect(page.getByTestId('live-msg')).toHaveText('Live beendet. Dieses Handy sendet nichts mehr.');
  await expect(page.getByTestId('live-empty')).toBeVisible();
  expect((await readStored<{ live: unknown }>(page, 'settings', 'app'))?.live ?? null).toBeNull();
});

test('020 US2-S7 ohne Live-Spieltag: ein Hauptknopf öffnet das Blatt, unter "Für Trainer" Einfügen vor Anlegen', async ({
  page,
}) => {
  await ensureTeam(page, E1);
  await openLiveFresh(page);
  const empty = page.getByTestId('live-empty');
  await expect(empty).toContainText('Eltern sehen eure Spiele live: Stand, Minute und Tore, ohne App und ohne Konto.');
  await expect(empty).toContainText('WAS DAS HANDY VERLÄSST');
  const share = page.getByTestId('btn-share-viewer');
  await expect(share).toHaveText('Link für Eltern teilen');
  await expect(page.locator('main.page .btn--primary')).toHaveCount(1);
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  expect(await visibleText(page)).not.toMatch(/Kopplung|Zuschauer-Link/);
  const order = await ids(empty);
  expect(order.indexOf('btn-share-viewer')).toBeLessThan(order.indexOf('live-trainer-toggle'));

  await toggle(page).click();
  const paste = page.getByTestId('btn-paste-link');
  const create = page.getByTestId('btn-live-create');
  await expect(paste).toHaveText('Trainer-Link einfügen');
  await expect(create).toHaveText('Live-Spieltag anlegen');
  const [p, c] = [await paste.boundingBox(), await create.boundingBox()];
  expect(p!.y).toBeLessThan(c!.y);
  await expect(page.getByTestId('live-create-hint')).toHaveText(
    'Nur einmal für alle Mannschaften. Gibt es schon einen, füge den Trainer-Link ein.',
  );
  await expect(page.locator('main.page .btn--primary')).toHaveCount(1);

  await share.click();
  await expect(page.getByTestId('live-start-sheet')).toBeVisible();
  await expect(page.getByTestId('live-start-teams')).toHaveText('Mit E1.');
});

test('020 US2 Randfall: Lead-Handy der ersten Version mit einem Hauptknopf, "Live beenden …" unter "Für Trainer"', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await pasteLink(b, await leadLinkFor(links.trainer, 'E2'));
  await openLiveFresh(b);
  await expect(b.getByTestId('live-lead-info')).toContainText('DIESES HANDY SENDET LIVE');
  await expect(b.getByTestId('live-lead-info')).toContainText('E2');
  const share = b.getByTestId('btn-share-viewer');
  await expect(share).toHaveText('Link für Eltern teilen');
  await expect(b.locator('main.page .btn--primary')).toHaveCount(1);
  await expect(b.getByTestId('btn-live-dashboard')).toBeVisible();
  await expect(toggle(b)).toHaveAttribute('aria-expanded', 'false');
  expect(await visibleText(b)).not.toMatch(/Kopplung|Zuschauer-Link/);
  await toggle(b).click();
  await expect(b.getByTestId('btn-paste-link')).toHaveText('Link einfügen');
  await expect(b.getByTestId('btn-live-end')).toHaveText('Live beenden …');
  await share.click();
  const rec = recordedOf(b);
  await expect.poll(async () => (await rec()).shares.length).toBe(1);
  expect(await lastText(rec)).toBe(`Unser Spieltag live verfolgen: ${links.viewer}`);
});

test('020 US2-S8 Spielmenü: "Teilen" als erster Eintrag; kein "Zwischenstand teilen", kein "Eltern live zuschauen lassen"', async ({
  page,
}) => {
  await ensureTeam(page, E1);
  await newGame(page, { ownTeam: E1 });
  await page.getByTestId('btn-menu').click();
  await expect(page.getByTestId('game-menu')).toBeVisible();
  // Geändert durch Nachbesserung 2026-11-18 (FR-E60): kein "Eltern live zuschauen lassen" mehr im Menü.
  await expect(page.getByTestId('menu-live-quick')).toHaveCount(0);
  await expect(page.getByTestId('menu-share')).toHaveCount(0);
  await page.getByTestId('game-menu').getByRole('button', { name: 'Schließen' }).click();

  await page.getByTestId('btn-kickoff').click();
  await page.getByTestId('btn-menu').click();
  const menu = page.getByTestId('game-menu');
  expect((await ids(menu))[0]).toBe('menu-share');
  await expect(page.getByTestId('menu-live-quick')).toHaveCount(0);
  await expect(page.getByTestId('menu-share')).toHaveText('Teilen');
  await expect(page.getByTestId('menu-share-interim')).toHaveCount(0);
  await expect(menu).not.toContainText('Zwischenstand teilen');
  await page.getByTestId('menu-share').click();
  await expect(menu).toBeHidden();
  const sheet = page.getByTestId('share-sheet');
  await expect(sheet.getByRole('heading')).toHaveText('Teilen');
  const live = page.getByTestId('share-live');
  const text = page.getByTestId('share-text');
  await expect(live).toContainText('Live-Link für Eltern');
  await expect(live).toContainText('Eltern sehen Stand und Minute live');
  await expect(text).toContainText('Stand als Text');
  await expect(text).toContainText('Zwischenstand für WhatsApp');
  const [l, t] = [await live.boundingBox(), await text.boundingBox()];
  expect(l!.y).toBeLessThan(t!.y);
  expect(l!.height).toBeGreaterThanOrEqual(64);
  expect(t!.height).toBeGreaterThanOrEqual(64);
  await sheet.getByRole('button', { name: 'Schließen' }).click();

  // In der Pause ebenso, nach dem Schlusspfiff nicht mehr.
  await page.getByTestId('btn-section-end').click();
  await confirmYes(page);
  await page.getByTestId('btn-menu').click();
  await expect(page.getByTestId('menu-share')).toBeVisible();
  await page.getByTestId('game-menu').getByRole('button', { name: 'Schließen' }).click();
  await page.getByTestId('btn-kickoff').click();
  await page.getByTestId('btn-section-end').click();
  await confirmYes(page);
  await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');
  await acceptDraw(page);
  await page.getByTestId('btn-menu').click();
  await expect(page.getByTestId('game-menu')).toBeVisible();
  await expect(page.getByTestId('menu-live-quick')).toHaveCount(0);
  await expect(page.getByTestId('menu-share')).toHaveCount(0);
});

test('020 US2-S9 "Stand als Text" teilt den Zwischenstand, "Live-Link für Eltern" den Link', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  await startGame(page, { ownTeam: E1, opponent: 'TSV Musterstadt' });
  await forward(page, 6 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await forward(page, 11 * SEC);
  const before = (await recorded()).shares.length;
  await shareAsText(page);
  await expect.poll(async () => (await recorded()).shares.length).toBe(before + 1);
  const lines = (await lastText(recorded)).split('\n');
  expect(lines.slice(0, 2)).toEqual(['*Sportvg Feuerbach E1 1:0 TSV Musterstadt*', "Zwischenstand 7'"]);
  await expect(page.getByTestId('share-sheet')).toHaveCount(0);

  await page.getByTestId('btn-menu').click();
  await page.getByTestId('menu-share').click();
  await page.getByTestId('share-live').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(before + 2);
  expect(await lastText(recorded)).toBe(`Unser Spieltag live verfolgen: ${links.viewer}`);
  await expect(page.getByTestId('share-sheet')).toHaveCount(0);
});

test('020 US2-S10 US2-S11 "Ergebnis teilen" und "neu teilen" teilen direkt, ohne Blatt', async ({ page, recorded }) => {
  await seedRoster(page, '9 Max\n10 Tom');
  await startGame(page, { opponent: 'TSV Musterstadt', sections: 1, minutes: 12 });
  await forward(page, 2 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await page.getByTestId('scorer-picker').getByRole('button', { name: '9 Max', exact: true }).click();
  const assist = page.getByTestId('assist-picker');
  if (await assist.isVisible()) await page.getByTestId('assist-skip').click();
  await forward(page, 11 * MIN);
  await page.getByTestId('btn-section-end').click();
  await confirmYes(page);
  await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');

  // S10: ein Tipp, Teilen-Menü direkt; das Spiel merkt sich das Teilen.
  await page.getByTestId('btn-share').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(1);
  expect(await lastText(recorded)).toContain('Max');
  await expect(page.getByTestId('share-sheet')).toHaveCount(0);
  const id = new URL(page.url()).hash.replace(/^#\/spiel\/([^/]+).*$/, '$1');
  await expect.poll(async () => (await readStored<{ sharedAt?: number }>(page, 'games', id))?.sharedAt).toBeTruthy();

  // S11: Korrektur, Band "Teilen" teilt direkt.
  await page.locator('[data-testid^="goal-row-"]').first().click();
  await page.getByTestId('goal-edit-scorer').click();
  await page.getByTestId('scorer-picker').getByRole('button', { name: '10 Tom', exact: true }).click();
  await expect(page.getByTestId('reshare-bar')).toContainText('Korrigiert. Ergebnis neu teilen?');
  await page.getByTestId('reshare-share').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(2);
  expect(await lastText(recorded)).toContain('Tom');
  await expect(page.getByTestId('share-sheet')).toHaveCount(0);

  // Spieldetails: "Ergebnis teilen" direkt.
  await page.goto(`./#/spiel/${id}/details`);
  await page.getByTestId('btn-share').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(3);
  await expect(page.getByTestId('share-sheet')).toHaveCount(0);
});

test('020 US2-S12 ohne Mannschaft und ohne Live-Spieltag: Hinweis und "Zu den Einstellungen" statt Teilen', async ({
  page,
}) => {
  await openLiveFresh(page);
  const empty = page.getByTestId('live-empty');
  await expect(page.getByTestId('btn-share-viewer')).toHaveCount(0);
  await expect(page.getByTestId('live-empty-no-teams')).toHaveText(
    'Lege zuerst deine Mannschaft in den Einstellungen an. Hast du einen Trainer-Link, füge ihn unter „Für Trainer“ ein.',
  );
  const settings = page.getByTestId('btn-live-settings');
  await expect(settings).toHaveText('Zu den Einstellungen');
  await expect(settings).toHaveClass(/btn--primary/);
  await expect(page.locator('main.page .btn--primary')).toHaveCount(1);
  const order = await ids(empty);
  expect(order.indexOf('btn-live-settings')).toBeLessThan(order.indexOf('live-trainer-toggle'));
  await toggle(page).click();
  await expect(page.getByTestId('btn-paste-link')).toHaveText('Trainer-Link einfügen');
  await settings.click();
  await expect(page).toHaveURL(/#\/einstellungen$/);
});

/** Spielmenü "…" eines laufenden Spiels öffnen (Spec 020 Nachbesserung 2026-11-18). */
async function openMenu(page: Page): Promise<Locator> {
  await page.getByTestId('btn-menu').click();
  const menu = page.getByTestId('game-menu');
  await expect(menu).toBeVisible();
  return menu;
}

test('020 US2-S13 FR-E60 Spielmenü ohne "Eltern live zuschauen lassen": "Teilen" → "Live-Link für Eltern" macht alles', async ({
  page,
  recorded,
  relay,
}) => {
  await ensureTeam(page, E1);
  await startGame(page, { ownTeam: E1 });
  const menu = await openMenu(page);
  await expect(page.getByTestId('menu-live-quick')).toHaveCount(0);
  await expect(menu).not.toContainText('Eltern live zuschauen lassen');
  expect((await ids(menu))[0]).toBe('menu-share');

  // Ohne Live-Spieltag: Blatt "Eltern live zuschauen lassen", "Neu starten" legt an, teilt, das Spiel geht live.
  await page.getByTestId('menu-share').click();
  await page.getByTestId('share-live').click();
  await expect(page.getByTestId('live-start-sheet')).toBeVisible();
  await expect(page.getByTestId('live-start-paste')).toHaveText('Link einfügen');
  await expect(page.getByTestId('live-start-teams')).toHaveText('Mit E1.');
  await page.getByTestId('live-start-new').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(1);
  await expect(page.getByTestId('live-start-done')).toBeVisible();
  await page.getByTestId('live-start-sheet').getByRole('button', { name: 'Schließen' }).click();
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'on');
  await page.clock.runFor(6_000);
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);

  // Mit Live-Spieltag: teilt sofort; ein Spiel auf "Nicht live senden" geht wieder live.
  await openMenu(page);
  await expect(page.getByTestId('menu-live-quick')).toHaveCount(0);
  await page.getByTestId('menu-live-toggle').click();
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'off');
  await openMenu(page);
  await page.getByTestId('menu-share').click();
  await page.getByTestId('share-live').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(2);
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'on');
});

test('020 US2-S14 FR-E61 "Nicht live senden" ist der letzte Eintrag und wie "Live beenden …" gestaltet', async ({
  page,
  recorded,
  relay,
}) => {
  await createLive(page, recorded, { teams: ['E1'] });
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  await startGame(page, { ownTeam: E1 });
  const menu = await openMenu(page);
  const all = await ids(menu);
  expect(all.at(-1)).toBe('menu-live-toggle');
  expect(all.indexOf('menu-details')).toBeLessThan(all.indexOf('menu-live-toggle'));
  const toggleBtn = page.getByTestId('menu-live-toggle');
  await expect(toggleBtn).toHaveText('Nicht live senden');
  // Gefahr-Gestaltung wie auf "Live für Eltern": dieselbe Schriftfarbe (rot-text) wie "Live beenden …".
  const color = (l: Locator): Promise<string> => l.evaluate((e) => getComputedStyle(e).color);
  const neutral = await color(page.getByTestId('menu-details'));
  const danger = await color(toggleBtn);
  expect(danger).not.toBe(neutral);
  await page.getByTestId('game-menu').getByRole('button', { name: 'Schließen' }).click();
  await page.goto('./#/live-spieltag');
  await openTrainerSection(page);
  expect(await color(page.getByTestId('btn-live-end'))).toBe(danger);
  // "Live senden" bleibt neutral, ebenfalls am Ende.
  await page.goto('./');
  await page.getByTestId('btn-continue').click();
  await openMenu(page);
  await page.getByTestId('menu-live-toggle').click();
  await openMenu(page);
  const off = page.getByTestId('menu-live-toggle');
  await expect(off).toHaveText('Live senden');
  expect((await ids(page.getByTestId('game-menu'))).at(-1)).toBe('menu-live-toggle');
  expect(await color(off)).toBe(neutral);
});

test('020 US2-S15 FR-E61 iPhone SE (375 × 667): "Schließen" im Spielmenü ohne Scrollen sichtbar', async ({
  page,
  recorded,
  relay,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await createLive(page, recorded, { teams: ['E1'] });
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  await startGame(page, { ownTeam: E1 });
  // Längster Zustand: laufendes Spiel mit "Tor nachtragen", "Uhr korrigieren" und "Nicht live senden".
  await forward(page, 3 * MIN);
  const menu = await openMenu(page);
  await expect(page.getByTestId('menu-add-goal')).toBeVisible();
  await expect(page.getByTestId('menu-fix-clock')).toBeVisible();
  await expect(page.getByTestId('menu-live-toggle')).toBeVisible();
  const close = menu.getByRole('button', { name: 'Schließen' });
  await expect(close).toBeInViewport({ ratio: 1 });
  const sheet = await menu.evaluate((e) => ({ scroll: e.scrollHeight, client: e.clientHeight }));
  expect(sheet.scroll).toBeLessThanOrEqual(sheet.client);
  for (const id of await ids(menu)) {
    if (!id) continue;
    // Die Einträge des Menüs behalten ihre Höhe (`.btn`, mindestens 48 pt wie bisher).
    expect((await page.getByTestId(id).boundingBox())!.height).toBeGreaterThanOrEqual(48);
  }
});
