/**
 * Erzeugt den Flyer für Testerinnen und Tester (docs/flyer/).
 *
 * 1. Startet die gebaute App (vite preview, vorher `npm run build`).
 * 2. Spielt ein Beispielspiel mit fiktiven Namen durch und speichert drei Bildschirme (iPhone 15, 3x).
 * 3. Rendert docs/flyer/flyer.html als PNG (1080 px breit, für WhatsApp).
 * 4. Rendert docs/flyer/link-vorschau.html als public/link-vorschau.png (1200 × 630, Link-Vorschau FR-043).
 *    Danach erneut `npm run build`, damit das Bild in dist/ landet.
 *
 * Aufruf: npm run build && npm run flyer
 * Lokal im Cloud-Container: PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run flyer
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, devices, type Browser, type Page } from 'playwright-core';
import { preview } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'docs/flyer');
const PORT = 4183;
const BASE = `http://localhost:${PORT}/feuerbach-torticker/`;
const MIN = 60_000;
const SEC = 1_000;

async function forward(page: Page, ms: number): Promise<void> {
  await page.clock.fastForward(ms);
  await page.clock.runFor(300);
}

async function shot(page: Page, name: string): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: resolve(OUT, 'screens', `${name}.png`), animations: 'disabled' });
  console.log(`Bildschirm ${name}`);
}

async function goal(page: Page, side: 'own' | 'opp', scorer?: string): Promise<void> {
  await page.getByTestId(side === 'own' ? 'btn-goal-own' : 'btn-goal-opp').click();
  if (side !== 'own') return;
  if (scorer) await page.getByTestId('scorer-picker').getByRole('button', { name: scorer, exact: true }).click();
  else await page.getByTestId('scorer-skip').click();
}

async function whistle(page: Page): Promise<void> {
  await page.getByTestId('btn-section-end').click();
  await page.getByTestId('confirm-yes').click();
  await page.getByTestId('confirm-dialog').waitFor({ state: 'hidden' });
}

async function screens(browser: Browser): Promise<void> {
  const ctx = await browser.newContext({
    ...devices['iPhone 15'],
    // Wie vom Home-Bildschirm gestartet: ganze Höhe ohne Safari-Leisten, nur ohne Statusleiste
    viewport: { width: 393, height: 793 },
    deviceScaleFactor: 3,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    colorScheme: 'light',
  });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-11-07T10:29:30+01:00') });
  // Kein Ton und kein echtes Teilen-Menü im Headless-Browser
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = () => undefined;
  });

  // Mannschaft und Kader (fiktive Vornamen)
  await page.goto(`${BASE}#/einstellungen`);
  const hint = page.getByTestId('install-hint-dismiss');
  if (await hint.isVisible()) await hint.click();
  await page.getByTestId('btn-add-team').click();
  await page.getByTestId('input-team-name').fill('Sportvg Feuerbach E1');
  await page.getByTestId('btn-save-team').click();
  await page.getByTestId('team-sheet').waitFor({ state: 'hidden' });
  await page.goto(`${BASE}#/kader`);
  await page.getByTestId('btn-paste-list').click();
  await page.getByTestId('paste-input').fill('7 Max\n3 Ben\n10 Tom\n9 Leo\n5 Paul\n11 Maxi');
  await page.getByTestId('paste-apply').click();
  await page.getByTestId('paste-input').waitFor({ state: 'hidden' });

  // 1 Neues Spiel
  await page.goto(BASE);
  await page.getByTestId('btn-new-game').click();
  await page.getByTestId('input-opponent').fill('TSV Musterstadt');
  await page.getByTestId('input-opponent').blur();
  await shot(page, 'neues-spiel');
  await page.getByTestId('btn-create').click();

  // 2 Spiel läuft (1. Halbzeit, 3:1)
  await page.getByTestId('btn-kickoff').click();
  await forward(page, 5 * MIN + 20 * SEC);
  await goal(page, 'own', '7 Max');
  await forward(page, 6 * MIN);
  await goal(page, 'opp');
  await forward(page, 5 * MIN + 30 * SEC);
  await goal(page, 'own', '3 Ben');
  await forward(page, 4 * MIN);
  await goal(page, 'own', '7 Max');
  await forward(page, 15 * SEC);
  await shot(page, 'spiel');

  // Halbzeit, 2. Halbzeit, Schlusspfiff (5:2)
  await forward(page, 4 * MIN + 30 * SEC);
  await whistle(page);
  await forward(page, 5 * MIN);
  await page.getByTestId('btn-kickoff').click();
  await forward(page, 4 * MIN);
  await goal(page, 'own', '10 Tom');
  await forward(page, 9 * MIN);
  await goal(page, 'opp');
  await forward(page, 7 * MIN);
  await goal(page, 'own', '9 Leo');
  await forward(page, 6 * MIN);
  await whistle(page);

  // 3 Spieldetails mit Teilen-Vorschau
  await page.getByTestId('nav-history').click();
  await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
  await page.getByTestId('share-preview').waitFor();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await shot(page, 'teilen');
  await ctx.close();
}

async function render(browser: Browser): Promise<void> {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(resolve(OUT, 'flyer.html')).href);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, (img) => img.decode()));
  });
  await page.locator('#flyer').screenshot({ path: resolve(OUT, 'flyer.png') });
  const box = await page.locator('#flyer').boundingBox();
  console.log(`Flyer ${OUT}/flyer.png (${(box?.width ?? 0) * 2} × ${Math.round((box?.height ?? 0) * 2)} px)`);
  await page.close();

  // Link-Vorschau (FR-043): genau 1200 × 630 px
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await og.goto(pathToFileURL(resolve(OUT, 'link-vorschau.html')).href);
  await og.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, (img) => img.decode()));
  });
  await og.locator('#vorschau').screenshot({ path: resolve(ROOT, 'public/link-vorschau.png') });
  console.log(`Link-Vorschau ${ROOT}/public/link-vorschau.png (1200 × 630 px)`);
  await og.close();
}

if (!existsSync(resolve(ROOT, 'dist/index.html'))) throw new Error('dist/ fehlt: zuerst npm run build');
if (!existsSync(resolve(ROOT, 'src/styles/tokens.css'))) throw new Error('tokens.css fehlt: zuerst npm run tokens');
mkdirSync(resolve(OUT, 'screens'), { recursive: true });

const server = await preview({ root: ROOT, preview: { port: PORT, strictPort: true } });
const executablePath = process.env.PW_CHROMIUM_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  if (!process.argv.includes('--nur-flyer')) await screens(browser);
  await render(browser);
} finally {
  await browser.close();
  await server.close();
}
