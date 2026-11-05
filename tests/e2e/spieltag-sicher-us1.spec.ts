import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { confirmYes, readStored } from './helpers';
import { asPath, createLive, onMatchday, pasteLink } from './live-helpers';

/** Spec 012 US1: Trainer-Handy koppeln ohne Suchen (Startbildschirm, Trainer-Link-Seite, Live-Spieltag). */

test.use({ serviceWorkers: 'block' });

const setClipboard = (p: Page, text: string | null): Promise<void> =>
  p.evaluate((t) => {
    const rec = (window as unknown as { __rec: { clipboard?: string; clipboardBlocked?: boolean } }).__rec;
    if (t === null) rec.clipboardBlocked = true;
    else rec.clipboard = t;
  }, text);

const liveOf = async (p: Page) => (await readStored<{ live: { topic: string } | null }>(p, 'settings', 'app'))?.live;

test('012 US1-S1 US1-S2 US1-S5 Startbildschirm: Karte, Trainer-Link aus der Zwischenablage, danach Live-Zeile', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await b.goto('./');
  const card = b.getByTestId('start-trainer-card');
  await expect(card).toContainText('Trainer? Füge den Trainer-Link aus der Trainergruppe ein.');
  await expect(b.getByTestId('start-live-line')).toHaveCount(0);

  await setClipboard(b, `Hier der Trainer-Link:\n${links.trainer}\n`);
  await b.getByTestId('btn-start-paste').click();
  await expect(b.getByTestId('paste-link-input')).toHaveCount(0);
  const dialog = b.getByTestId('couple-dialog');
  await expect(dialog).toContainText('Live senden für Feuerbach E1 und Feuerbach E2?');
  await b.getByTestId('couple-yes').click();

  await expect(b.getByTestId('btn-new-game')).toBeVisible();
  await expect(card).toHaveCount(0);
  const line = b.getByTestId('start-live-line');
  await expect(line).toHaveText('Live: Unser Spieltag · E1, E2');
  expect((await liveOf(b))?.topic).toBeTruthy();
  await line.click();
  await expect(b.getByTestId('live-overview')).toBeVisible();
});

test('012 US1-S3 leere oder gesperrte Zwischenablage: Einfügefeld, danach Startbildschirm', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await b.goto('./');
  await b.getByTestId('btn-start-paste').click();
  await expect(b.getByTestId('paste-link-input')).toBeVisible();
  await b.getByTestId('paste-link-input').fill(`Trainer-Link: ${links.trainer}`);
  await b.getByTestId('paste-link-apply').click();
  await b.getByTestId('couple-yes').click();
  await expect(b.getByTestId('start-live-line')).toHaveText('Live: Unser Spieltag · E1, E2');
  await expect(b.getByTestId('paste-link-input')).toHaveCount(0);

  const c = await newDevice();
  await c.goto('./');
  await setClipboard(c, null);
  await c.getByTestId('btn-start-paste').click();
  await expect(c.getByTestId('paste-link-input')).toBeVisible();
  // Ungültiger Link in der Zwischenablage: Einfügefeld mit Hinweis.
  await c.getByTestId('paste-link-cancel').click();
  await c.evaluate(() => {
    const rec = (window as unknown as { __rec: { clipboard?: string; clipboardBlocked?: boolean } }).__rec;
    rec.clipboardBlocked = false;
    rec.clipboard = 'https://example.org/#/trainer/kaputt';
  });
  await c.getByTestId('btn-start-paste').click();
  await expect(c.getByTestId('paste-link-error')).toHaveText(
    'Der Link in der Zwischenablage ist nicht gültig. Bitte den ganzen Link aus der Trainergruppe kopieren.',
  );
  // Abbrechen schließt das Feld, nichts ist gekoppelt.
  await c.getByTestId('paste-link-cancel').click();
  await expect(c.getByTestId('paste-link-input')).toHaveCount(0);
  expect(await liveOf(c)).toBeFalsy();
});

test('012 US1-S4 Zuschauer-Link in der Zwischenablage öffnet das Dashboard, ohne zu koppeln', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  const b = await newDevice();
  await b.goto('./');
  await setClipboard(b, links.viewer);
  await b.getByTestId('btn-start-paste').click();
  await expect(b.getByTestId('dashboard')).toBeVisible();
  await expect(b.getByTestId('couple-dialog')).toHaveCount(0);
  expect(await liveOf(b)).toBeFalsy();
});

test('012 US1-S5 neu ausgestellt: Startbildschirm zeigt wieder die Karte mit Hinweis', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const old = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  const b = await newDevice();
  await pasteLink(b, old.trainer);
  await page.getByTestId('btn-live-reissue').click();
  await confirmYes(page);
  await expect(page.getByTestId('live-reissued')).toBeVisible();
  // B erfährt "neu ausgestellt" beim nächsten Empfang (006 US5-S3).
  await b.goto('./#/live-spieltag');
  await expect(b.getByTestId('live-retired')).toBeVisible();
  await b.goto('./');
  await expect(b.getByTestId('start-trainer-card')).toContainText(
    '„Unser Spieltag“ wurde neu ausgestellt. Füge den neuen Trainer-Link ein.',
  );
  await expect(b.getByTestId('start-live-line')).toHaveCount(0);
});

test('012 US1-S6 Live-Spieltag ohne Kopplung: Trainer-Link einfügen ist der Hauptknopf', async ({ page }) => {
  await page.goto('./#/live-spieltag');
  const paste = page.getByTestId('btn-paste-link');
  const create = page.getByTestId('btn-live-create');
  await expect(paste).toHaveText('Trainer-Link einfügen');
  await expect(paste).toHaveClass(/btn--primary/);
  await expect(create).toHaveClass(/btn--secondary/);
  const [pasteBox, createBox] = [await paste.boundingBox(), await create.boundingBox()];
  expect(pasteBox!.y).toBeLessThan(createBox!.y);
  await expect(page.getByTestId('live-create-hint')).toHaveText(
    'Nur einmal für alle Mannschaften. Gibt es schon einen, füge den Trainer-Link ein.',
  );
});

test('012 US1-S7 US1-S8 Trainer-Link im Browser: koppeln und loslegen, danach wirkt der Link als Startknopf', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  const b = await newDevice();
  await b.goto(asPath(links.trainer));
  const couple = b.getByTestId('btn-couple-here');
  await expect(couple).toHaveText('Koppeln und loslegen');
  await expect(couple).toHaveClass(/btn--primary/);
  await expect(b.getByTestId('lead-link-copy-hint')).toHaveText(
    'Torticker schon auf dem Home-Bildschirm? Dann den Link kopieren und dort einfügen.',
  );
  await expect(b.getByTestId('btn-copy-lead-link')).toHaveClass(/btn--secondary/);
  await couple.click();
  await b.getByTestId('couple-yes').click();
  await expect(b.getByTestId('btn-new-game')).toBeVisible();
  await expect(b.getByTestId('start-live-line')).toHaveText('Live: Unser Spieltag · E1, E2');

  // US1-S7: nächste Woche wieder angetippt → direkt der Startbildschirm.
  await b.goto(asPath(links.trainer));
  await expect(b.getByTestId('btn-new-game')).toBeVisible();
  await expect(b.getByTestId('lead-link-page')).toHaveCount(0);
  expect(new URL(b.url()).hash).toBe('#/');
});

test('012 US1-S9 in der installierten App: ohne Anleitung und ohne Link kopieren', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await b.addInitScript(() => Object.defineProperty(navigator, 'standalone', { configurable: true, value: true }));
  await b.goto(asPath(links.trainer));
  await expect(b.getByTestId('btn-couple-here')).toHaveText('Koppeln und loslegen');
  await expect(b.getByTestId('btn-copy-lead-link')).toHaveCount(0);
  await expect(b.getByTestId('lead-link-copy-hint')).toHaveCount(0);
});
