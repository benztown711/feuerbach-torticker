import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { ensureTeam } from './helpers';
import { createLive, openTrainerSection, openViewer, pasteLink } from './live-helpers';

/**
 * Spec 022 US4: Design-Restpunkte aus dem Design-Check zu Spec 020 (Blatt "Eltern live zuschauen lassen",
 * Schalter "Ton bei Toren" in Rot, "Für Trainer" als eine Fläche mit "Link einfügen" bei den Trainer-Links).
 */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const team = (short: string): string => `Sportvg Feuerbach ${short}`;

/** Startbildschirm → Blatt "Eltern live zuschauen lassen" (ohne Live-Spieltag). */
async function openSheet(page: Page, teams: string[]): Promise<void> {
  for (const t of teams) await ensureTeam(page, team(t));
  await page.goto('./');
  await page.getByTestId('start-live-quick').click();
  await expect(page.getByTestId('live-start-sheet')).toBeVisible();
}

/** Farbwert eines Tokens als berechneter Wert (rgb), über ein Messelement. */
const tokenColor = (page: Page, token: string): Promise<string> =>
  page.evaluate((t) => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = `var(--color-${t})`;
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return c;
  }, token);

test('022 US4-S1 Blatt: Hauptknopf "Live-Spieltag anlegen", darüber "Mit E1 und E2."', async ({ page }) => {
  await openSheet(page, ['E1', 'E2']);
  const hint = page.getByTestId('live-start-teams');
  const btn = page.getByTestId('live-start-new');
  await expect(hint).toHaveText('Mit E1 und E2.');
  await expect(btn).toHaveText('Live-Spieltag anlegen');
  await expect(btn).toHaveClass(/btn--primary/);
  expect((await btn.boundingBox())!.height).toBeGreaterThanOrEqual(64);
  expect((await hint.boundingBox())!.y).toBeLessThan((await btn.boundingBox())!.y);
  await expect(page.getByTestId('live-start-sheet')).not.toContainText('Neu starten');
  await expect(page.getByTestId('live-start-sheet')).not.toContainText('Neu mit');
});

test('022 FR-F41 Blatt auf 375 × 667: Reihenfolge Hauptweg, Datenschutz, Nebenweg, "Schließen"; alles ohne Scrollen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openSheet(page, ['E1', 'E2']);
  const sheet = page.getByTestId('live-start-sheet');
  const order = [
    sheet.getByTestId('live-start-lead'),
    sheet.getByTestId('live-start-teams'),
    sheet.getByTestId('live-start-new'),
    sheet.getByTestId('live-start-data'),
    sheet.getByTestId('live-start-other'),
    sheet.getByTestId('live-start-paste'),
    sheet.getByRole('button', { name: 'Schließen' }),
  ];
  let prevBottom = 0;
  for (const l of order) {
    const b = (await l.boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(prevBottom - 1);
    expect(b.y + b.height).toBeLessThanOrEqual(667);
    prevBottom = b.y + b.height;
  }
  await expect(sheet.getByTestId('live-start-paste')).toHaveClass(/btn--secondary/);
  expect((await sheet.getByTestId('live-start-paste').boundingBox())!.height).toBeGreaterThanOrEqual(64);
  // Ohne Kasten: der Nebenweg hat keine eigene Fläche.
  const box = await sheet
    .locator('.live-start__alt')
    .evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).paddingTop]);
  expect(box).toEqual(['rgba(0, 0, 0, 0)', '0px']);
  // Das Blatt selbst scrollt nicht.
  expect(await sheet.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
});

test('022 US4-S2 "Live-Spieltag anlegen" verhält sich wie bisher "Neu starten"', async ({ page, recorded, relay }) => {
  await openSheet(page, ['E1']);
  await page.getByTestId('live-start-new').click();
  await expect(page.getByTestId('live-start-done')).toHaveText('Fertig. „Unser Spieltag“ ist live.');
  await expect.poll(async () => (await recorded()).shares.length).toBe(1);
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  expect((await recorded()).shares[0]?.text).toMatch(/^Unser Spieltag live verfolgen: https?:\/\/\S+#\/live\//);
});

test('022 US4-S3 Fertig-Zustand: "Link für Eltern teilen" und "Trainer-Link teilen", keine Pfadbeschreibung', async ({
  page,
  relay,
}) => {
  await openSheet(page, ['E1']);
  await page.getByTestId('live-start-new').click();
  await expect(page.getByTestId('live-start-done')).toBeVisible();
  const viewer = page.getByTestId('live-start-share');
  const trainer = page.getByTestId('live-start-share-trainer');
  await expect(viewer).toHaveText('Link für Eltern teilen');
  await expect(viewer).toHaveClass(/btn--primary/);
  await expect(trainer).toHaveText('Trainer-Link teilen');
  await expect(trainer).toHaveClass(/btn--secondary/);
  expect((await viewer.boundingBox())!.height).toBeGreaterThanOrEqual(64);
  expect((await trainer.boundingBox())!.height).toBeGreaterThanOrEqual(64);
  expect((await viewer.boundingBox())!.y).toBeLessThan((await trainer.boundingBox())!.y);
  await expect(page.getByTestId('live-start-sheet')).not.toContainText('findest du unter');
  await expect(page.getByTestId('live-start-trainer')).toHaveCount(0);
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
});

test('022 US4-S4 "Trainer-Link teilen" teilt den Trainer-Link ohne Kader-Frage; ohne Teilen-Menü kopiert er ihn', async ({
  page,
  recorded,
  newDevice,
}) => {
  await openSheet(page, ['E1']);
  await page.getByTestId('live-start-new').click();
  await expect(page.getByTestId('live-start-done')).toBeVisible();
  await expect.poll(async () => (await recorded()).shares.length).toBe(1);
  await page.getByTestId('live-start-share-trainer').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(2);
  await expect(page.getByTestId('squad-share-sheet')).toHaveCount(0);
  const text = (await recorded()).shares[1]?.text ?? '';
  expect(text).toMatch(/^Trainer-Link für "Unser Spieltag", nur für die Trainergruppe\. Antippen und loslegen:\n/);
  const url = /(https?:\/\/\S+#\/trainer\/[A-Za-z0-9_-]+)$/.exec(text)?.[1];
  expect(url).toBeTruthy();
  // Der Link koppelt ein zweites Trainer-Handy.
  const b = await newDevice();
  await pasteLink(b, url!);
  await b.goto('./');
  await expect(b.getByTestId('start-follow')).toBeVisible();

  // Ohne Teilen-Menü in die Zwischenablage
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await page.getByTestId('live-start-share-trainer').click();
  await expect(page.getByTestId('live-start-msg')).toHaveText('Link kopiert. Füge ihn in WhatsApp ein.');
  expect((await recorded()).clipboard).toBe(text);
});

test('022 US4-S5 nach "Link einfügen" (Gekoppelt) gibt es "Trainer-Link teilen" nicht', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  const b = await newDevice();
  await ensureTeam(b, team('E2'));
  await b.goto('./');
  // B hat eine Mannschaft, keinen Live-Spieltag: Blatt, dort "Link einfügen" mit dem Trainer-Link aus der Zwischenablage
  await b.evaluate(
    (t) => ((window as unknown as { __rec: { clipboard?: string } }).__rec.clipboard = t),
    links.trainer,
  );
  await b.getByTestId('start-live-quick').click();
  await b.getByTestId('live-start-paste').click();
  await b.getByTestId('couple-yes').click();
  await expect(b.getByTestId('live-start-done')).toContainText('Gekoppelt mit „Unser Spieltag“.');
  await expect(b.getByTestId('live-start-share')).toHaveText('Link für Eltern teilen');
  await expect(b.getByTestId('live-start-share-trainer')).toHaveCount(0);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`022 US4-S6 025 FR-T06 Schalter "Töne" an: Fläche rot, Schieber weiß (${scheme === 'light' ? 'hell' : 'dunkel'})`, async ({
    page,
    recorded,
    relay,
    newDevice,
  }) => {
    const links = await createLive(page, recorded, { teams: ['E1'] });
    await expect.poll(() => relay.all().length).toBeGreaterThan(0);
    const v = await openViewer(newDevice, relay, links, scheme);
    const row = v.getByTestId('dash-sound');
    const knob = v.locator('.dash-sound__knob');
    await expect(row).toHaveAttribute('aria-checked', 'false');
    // aus wie bisher: leere Fläche
    expect(await knob.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(await tokenColor(v, 'surface'));
    await row.click();
    await expect(row).toHaveAttribute('aria-checked', 'true');
    // Übergang (0,15 s) abwarten, dann die Zielfarbe messen
    await expect
      .poll(() => knob.evaluate((e) => getComputedStyle(e).backgroundColor))
      .toBe(await tokenColor(v, 'rot-tief'));
    expect(await knob.evaluate((e) => getComputedStyle(e, '::after').backgroundColor)).toBe(
      await tokenColor(v, 'on-rot'),
    );
    expect(await knob.evaluate((e) => getComputedStyle(e).borderTopColor)).toBe(await tokenColor(v, 'ink'));
  });
}

test('022 US4-S7 Schalter: Übergang höchstens 0,15 s, bei "Bewegung reduzieren" keiner', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  const v = await openViewer(newDevice, relay, links);
  const knob = v.locator('.dash-sound__knob');
  const durations = (): Promise<number[]> =>
    knob.evaluate((e) =>
      [getComputedStyle(e), getComputedStyle(e, '::after')].flatMap((s) =>
        s.transitionDuration.split(',').map((d) => parseFloat(d) * (d.trim().endsWith('ms') ? 0.001 : 1)),
      ),
    );
  const normal = await durations();
  expect(Math.max(...normal)).toBeGreaterThan(0);
  expect(Math.max(...normal)).toBeLessThanOrEqual(0.15);
  await v.emulateMedia({ reducedMotion: 'reduce' });
  expect(Math.max(...(await durations()))).toBe(0);
});

test('022 US4-S8 "Für Trainer" aufgeklappt: eine Fläche unter der Kopfzeile, kein Kasten je Abschnitt', async ({
  page,
  recorded,
  relay,
}) => {
  await createLive(page, recorded, { teams: ['E1', 'E2'] });
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  await page.goto('./#/live-spieltag');
  await openTrainerSection(page);
  const toggle = page.getByTestId('live-trainer-toggle');
  const area = page.getByTestId('live-trainer');
  await expect(area).toBeVisible();
  const t = (await toggle.boundingBox())!;
  const a = (await area.boundingBox())!;
  // unmittelbar unter der Kopfzeile, gleiche Breite
  expect(Math.abs(a.y - (t.y + t.height))).toBeLessThanOrEqual(1);
  expect(Math.abs(a.x - t.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(a.width - t.width)).toBeLessThanOrEqual(1);
  // gleiche Fläche und gleicher Rand
  const style = (l: typeof area) =>
    l.evaluate((e) => {
      const s = getComputedStyle(e);
      return { bg: s.backgroundColor, border: s.borderLeftColor, w: s.borderLeftWidth, r: s.borderBottomLeftRadius };
    });
  const [ts, as] = [await style(toggle), await style(area)];
  expect(as.bg).toBe(ts.bg);
  expect(as.border).toBe(ts.border);
  expect(as.w).toBe(ts.w);
  // Abschnitte darin ohne eigenen Rahmen und eigene Fläche, nur Trennlinien
  const sections = area.locator('.card');
  expect(await sections.count()).toBeGreaterThanOrEqual(4);
  for (const s of await sections.all()) {
    const x = await s.evaluate((e) => {
      const c = getComputedStyle(e);
      return { bg: c.backgroundColor, l: c.borderLeftWidth, r: c.borderRightWidth, b: c.borderBottomWidth };
    });
    expect(x.l).toBe('0px');
    expect(x.r).toBe('0px');
    expect(x.b).toBe('0px');
    expect(x.bg).toBe('rgba(0, 0, 0, 0)');
  }
  // zugeklappt verschwindet die Fläche, die Kopfzeile bleibt eine Karte
  await toggle.click();
  await expect(area).toHaveCount(0);
});

test('022 US4-S9 "Link einfügen" steht im ersten Abschnitt unter "Trainer-Link teilen", nicht lose am Ende', async ({
  page,
  recorded,
  relay,
}) => {
  await createLive(page, recorded, { teams: ['E1'] });
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  await page.goto('./#/live-spieltag');
  await openTrainerSection(page);
  const card = page.getByTestId('live-trainer-card');
  // Geändert durch Nachbesserung 2026-11-18 (FR-F43): kein eigenes Label "TRAINER" mehr unter der Kopfzeile.
  await expect(card).toContainText('Für eure Trainergruppe');
  const share = card.getByTestId('btn-share-trainer');
  const paste = card.getByTestId('btn-paste-link');
  await expect(paste).toHaveText('Link einfügen');
  const [s, p] = [(await share.boundingBox())!, (await paste.boundingBox())!];
  expect(s.y).toBeLessThan(p.y);
  // vor "MANNSCHAFTEN"
  const teams = page.getByTestId('live-team-row-E1');
  expect(p.y + p.height).toBeLessThan((await teams.boundingBox())!.y);
  // der Knopf ist nicht mehr das letzte Kind des Bereichs
  const last = await page.getByTestId('live-trainer').evaluate((e) => e.lastElementChild?.getAttribute('data-testid'));
  expect(last).not.toBe('btn-paste-link');
  // und funktioniert wie bisher
  await paste.click();
  await expect(page.getByTestId('paste-link-input')).toBeVisible();
});

test('022 FR-F43 "Für Trainer" aufgeklappt: kein doppeltes Label "TRAINER" unter der Kopfzeile, die übrigen bleiben', async ({
  page,
  recorded,
  relay,
}) => {
  await createLive(page, recorded, { teams: ['E1', 'E2'] });
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  await page.goto('./#/live-spieltag');
  await openTrainerSection(page);
  const area = page.getByTestId('live-trainer');
  await expect(area).toBeVisible();
  const labels = await area.locator('.t-label').allInnerTexts();
  expect(labels).not.toContain('TRAINER');
  // Spec 024 US4: "Eltern dürfen tickern" nach den Mannschaften.
  expect(labels.slice(0, 4)).toEqual(['MANNSCHAFTEN', 'ELTERN DÜRFEN TICKERN', 'SPIELPLAN', 'VERWALTEN']);
  // Der erste Abschnitt beginnt gleich mit dem Erklärtext unter der Kopfzeile "Für Trainer".
  const first = page.getByTestId('live-trainer-card');
  await expect(first).toBeVisible();
  await expect(first.locator('.t-label')).toHaveCount(0);
  await expect(first.getByTestId('btn-share-trainer')).toBeVisible();
});

test('022 US4-S10 ohne Live-Spieltag bleiben die Knöpfe unter "Für Trainer" wie in Spec 020', async ({ page }) => {
  await ensureTeam(page, team('E1'));
  await page.goto('./#/live-spieltag');
  await openTrainerSection(page);
  const order = await page
    .getByTestId('live-trainer')
    .locator('[data-testid]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  expect(order).toEqual(['btn-paste-link', 'btn-live-create', 'live-create-hint']);
  await expect(page.getByTestId('btn-paste-link')).toHaveText('Trainer-Link einfügen');
  await expect(page.getByTestId('btn-live-create')).toHaveText('Live-Spieltag anlegen');
});
