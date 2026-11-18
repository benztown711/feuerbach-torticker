import type { Locator, Page } from '@playwright/test';
import { expect, test, type Recorded } from './fixtures';
import { addTeam, confirmYes, ensureTeam, forward, MIN, newGame, readStored, startGame } from './helpers';
import { asPath, createLive, latestState, onMatchday, openTrainerSection, pasteLink, recordedOf } from './live-helpers';
import { RELAY_ORIGIN } from './relay';

/**
 * Spec 020 US1: "Eltern live zuschauen lassen" auf dem Startbildschirm und im Spielmenü teilt den Link für die
 * Eltern mit einem Tipp oder startet einen Live-Spieltag mit Standardwerten.
 */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const team = (short: string): string => `Sportvg Feuerbach ${short}`;
type Settings = { live: { teams: { key: string }[] } | null };

/** Lässt den Sender seine Bündelung (5 s) abarbeiten. */
const settle = (page: Page) => page.clock.runFor(6_000);

/** Testkennungen der Kinder in Reihenfolge. */
const ids = (scope: Locator): Promise<(string | null)[]> =>
  scope.locator('[data-testid]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
const startOrder = (page: Page): Promise<(string | null)[]> =>
  page.locator('.start__actions > *').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));

const liveKeys = async (page: Page): Promise<string[] | undefined> =>
  (await readStored<Settings>(page, 'settings', 'app'))?.live?.teams.map((t) => t.key);

/** Geteilter Text "<Titel> live verfolgen: <Link>". */
const sharedLink = async (rec: () => Promise<Recorded>): Promise<string> => {
  const text = (await rec()).shares.at(-1)?.text ?? '';
  const m = /^Unser Spieltag live verfolgen: (https?:\/\/\S+#\/live\/[A-Za-z0-9_-]+)$/.exec(text);
  if (!m?.[1]) throw new Error(`Kein Link für Eltern geteilt: ${text}`);
  return m[1];
};

/** Im Spiel: "…" → "Teilen" → "Live-Link für Eltern" (geändert durch Nachbesserung 2026-11-18, FR-E60). */
async function openQuickFromMenu(page: Page): Promise<void> {
  await page.getByTestId('btn-menu').click();
  await expect(page.getByTestId('game-menu')).toBeVisible();
  await page.getByTestId('menu-share').click();
  await page.getByTestId('share-live').click();
}

test('020 US1-S1 Knopf nach "Neues Spiel" bzw. "Spiele verfolgen", mindestens 64 pt, kein Hauptknopf', async ({
  page,
  recorded,
  relay,
}) => {
  await ensureTeam(page, team('E1'));
  await page.goto('./');
  const btn = page.getByTestId('start-live-quick');
  await expect(btn).toContainText('Eltern live zuschauen lassen');
  await expect(btn).toContainText('Link für die Elterngruppe');
  await expect(btn).not.toHaveClass(/btn--primary/);
  expect((await btn.boundingBox())!.height).toBeGreaterThanOrEqual(64);
  let order = await startOrder(page);
  expect(order.indexOf('btn-new-game')).toBeLessThan(order.indexOf('start-live-quick'));
  // Nachbesserung 2026-11-18 (FR-E62): ein Einstieg, die Karte "Trainer? …" entfällt neben dem Knopf (S11).
  expect(order).not.toContain('start-trainer-card');

  await createLive(page, recorded, { teams: ['E1'] });
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  await page.goto('./');
  await expect(page.getByTestId('start-follow')).toBeVisible();
  await expect(page.getByTestId('start-live-quick')).toBeVisible();
  order = await startOrder(page);
  expect(order.indexOf('start-follow')).toBeLessThan(order.indexOf('start-live-quick'));
});

test('020 US1-S2 fehlt ohne Mannschaften und bei neu ausgestelltem Live-Spieltag', async ({ page, newDevice }) => {
  // Ohne Mannschaft und ohne Live-Spieltag
  await page.goto('./');
  await expect(page.getByTestId('btn-new-game')).toBeVisible();
  await expect(page.getByTestId('start-live-quick')).toHaveCount(0);
  await newGame(page);
  await page.getByTestId('btn-menu').click();
  await expect(page.getByTestId('game-menu')).toBeVisible();
  await expect(page.getByTestId('menu-live-quick')).toHaveCount(0);

  // Neu ausgestellt auf einem anderen Trainer-Handy
  const a = await newDevice();
  const old = await createLive(a, recordedOf(a), { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await pasteLink(b, old.trainer);
  await openTrainerSection(a);
  await a.getByTestId('btn-live-reissue').click();
  await confirmYes(a);
  await b.goto('./#/live-spieltag');
  await expect(b.getByTestId('live-retired')).toBeVisible();
  await b.goto('./');
  await expect(b.getByTestId('start-trainer-card')).toBeVisible();
  await expect(b.getByTestId('start-live-quick')).toHaveCount(0);
  await startGame(b, { ownTeam: team('E1') });
  await b.getByTestId('btn-menu').click();
  await expect(b.getByTestId('game-menu')).toBeVisible();
  await expect(b.getByTestId('menu-live-quick')).toHaveCount(0);
  // Auch "Live-Link für Eltern" im Blatt "Teilen" fehlt; "Stand als Text" bleibt.
  await b.getByTestId('menu-share').click();
  await expect(b.getByTestId('share-sheet')).toBeVisible();
  await expect(b.getByTestId('share-live')).toHaveCount(0);
  await expect(b.getByTestId('share-text')).toBeVisible();
});

test('020 US1-S3 gekoppelt: ein Tipp teilt den Link für die Eltern; ohne Teilen-Menü in die Zwischenablage', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  await page.goto('./');
  const before = (await recorded()).shares.length;
  const sent = relay.all().length;
  await page.getByTestId('start-live-quick').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(before + 1);
  expect(await sharedLink(recorded)).toBe(links.viewer);
  await expect(page.getByTestId('live-start-sheet')).toHaveCount(0);
  // Nur teilen: am Live-Spieltag ändert sich nichts.
  expect(relay.all().length).toBe(sent);

  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await page.getByTestId('start-live-quick').click();
  await expect(page.getByTestId('start-live-msg')).toHaveText('Link kopiert. Füge ihn in WhatsApp ein.');
  expect((await recorded()).clipboard).toBe(`Unser Spieltag live verfolgen: ${links.viewer}`);
});

test('020 US1-S4 Spiel auf "Nicht live senden": im Spiel teilen, und das Spiel geht wieder live', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  await startGame(page, { ownTeam: team('E2') });
  await settle(page);
  await page.getByTestId('btn-menu').click();
  await page.getByTestId('menu-live-toggle').click();
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'off');
  await settle(page);
  await expect.poll(async () => (await latestState(relay, links.viewer))?.state).toBe('off');

  const before = (await recorded()).shares.length;
  await openQuickFromMenu(page);
  await expect.poll(async () => (await recorded()).shares.length).toBe(before + 1);
  expect(await sharedLink(recorded)).toBe(links.viewer);
  await expect(page.getByTestId('game-menu')).toBeHidden();
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'on');
  await settle(page);
  await expect.poll(async () => (await latestState(relay, links.viewer))?.state).toBe('live');
  // Erster Eintrag im Menü ist "Teilen"; "Eltern live zuschauen lassen" gibt es dort nicht mehr (FR-E60).
  await page.getByTestId('btn-menu').click();
  expect((await ids(page.getByTestId('game-menu')))[0]).toBe('menu-share');
  await expect(page.getByTestId('menu-live-quick')).toHaveCount(0);
});

test('020 US1-S5 Blatt ohne Live-Spieltag: Einfügen zuerst, dann "Neu starten"; Öffnen verbindet nicht', async ({
  page,
  relay,
}) => {
  await ensureTeam(page, team('E1'));
  await ensureTeam(page, team('E2'));
  const contacts: string[] = [];
  page.on('request', (r) => r.url().startsWith(RELAY_ORIGIN) && contacts.push(r.url()));
  page.on('websocket', (ws) => contacts.push(ws.url()));
  await page.goto('./');
  await page.getByTestId('start-live-quick').click();
  const sheet = page.getByTestId('live-start-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading')).toHaveText('Eltern live zuschauen lassen');
  await expect(page.getByTestId('live-start-lead')).toHaveText('Eltern sehen Stand, Minute und Tore live, ohne App.');
  await expect(page.getByTestId('live-start-other')).toHaveText('Ein anderer Trainer hat schon einen Link?');
  await expect(page.getByTestId('live-start-paste')).toHaveText('Link einfügen');
  await expect(page.getByTestId('live-start-teams')).toHaveText('Neu mit E1 und E2.');
  await expect(page.getByTestId('live-start-new')).toHaveText('Neu starten');
  await expect(page.getByTestId('live-start-new')).toHaveClass(/btn--primary/);
  await expect(page.getByTestId('live-start-data')).toHaveText(
    'Dann gehen Mannschaften, Spielstand und Tore mit Vornamen verschlüsselt an den Dienst des Vereins. Kader, Karten und Lesezeichen bleiben auf dem Handy.',
  );
  expect(await ids(sheet)).toEqual([
    'live-start-lead',
    'live-start-other',
    'live-start-paste',
    'live-start-teams',
    'live-start-new',
    'live-start-data',
  ]);
  for (const id of ['live-start-paste', 'live-start-new'])
    expect((await page.getByTestId(id).boundingBox())!.height).toBeGreaterThanOrEqual(64);
  await page.clock.runFor(3_000);
  expect(contacts).toEqual([]);
  expect(relay.all()).toEqual([]);
});

test('020 US1-S6 aus dem laufenden E2-Spiel neu starten: nur E2, Link geteilt, Eltern sehen das Spiel', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  await ensureTeam(page, team('E1'));
  await startGame(page, { ownTeam: team('E2'), opponent: 'TSV Musterstadt' });
  await forward(page, 3 * MIN);
  await page.getByTestId('btn-goal-own').click();
  await openQuickFromMenu(page);
  await expect(page.getByTestId('live-start-teams')).toHaveText('Neu mit E2.');
  await page.getByTestId('live-start-new').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(1);
  const viewer = await sharedLink(recorded);
  await expect.poll(() => liveKeys(page)).toEqual(['E2']);
  await expect(page.getByTestId('live-start-done')).toHaveText('Fertig. „Unser Spieltag“ ist live.');
  await expect(page.getByTestId('live-start-trainer')).toHaveText(
    'Den Trainer-Link für die anderen Trainer findest du unter „Mehr“ → „Live für Eltern“ → „Für Trainer“.',
  );
  await page.getByTestId('live-start-sheet').getByRole('button', { name: 'Schließen' }).click();
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'on');

  // Ohne weiteren Tipp und ohne die Uhr vorzustellen: das laufende Spiel ist beim Dienst.
  await expect.poll(async () => (await latestState(relay, viewer))?.state, { timeout: 10_000 }).toBe('live');
  const v = await newDevice();
  await v.goto(asPath(viewer));
  await expect(v.getByTestId('dash-card-E2')).toBeVisible({ timeout: 10_000 });
  await expect(v.getByTestId('dash-score-E2')).toHaveText(/1\s*:\s*0/);
});

test('020 US1-S7 Startbildschirm ohne Spiel: alle Mannschaften, eine Mannschaft, höchstens sechs', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  await ensureTeam(page, team('E1'));
  await ensureTeam(page, team('E2'));
  await page.goto('./');
  await page.getByTestId('start-live-quick').click();
  await page.getByTestId('live-start-new').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(1);
  await expect.poll(() => liveKeys(page)).toEqual(['E1', 'E2']);
  // Titel und Mannschaften sind beim Dienst (Konfiguration).
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  // Danach teilt der Knopf auf dem Startbildschirm direkt.
  await page.getByTestId('live-start-sheet').getByRole('button', { name: 'Schließen' }).click();
  await page.getByTestId('start-live-quick').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(2);
  await expect(page.getByTestId('live-start-sheet')).toHaveCount(0);

  const one = await newDevice();
  await ensureTeam(one, team('E3'));
  await one.goto('./');
  await one.getByTestId('start-live-quick').click();
  await expect(one.getByTestId('live-start-teams')).toHaveText('Neu mit E3.');
  await one.getByTestId('live-start-new').click();
  await expect.poll(() => liveKeys(one)).toEqual(['E3']);

  const seven = await newDevice();
  for (const t of ['E1', 'E2', 'E3', 'D1', 'D2', 'D3', 'F1']) await addTeam(seven, team(t));
  await seven.goto('./');
  await seven.getByTestId('start-live-quick').click();
  await expect(seven.getByTestId('live-start-teams')).toHaveText('Neu mit E1, E2, E3, D1, D2 und D3.');
  await seven.getByTestId('live-start-new').click();
  await expect.poll(() => liveKeys(seven)).toEqual(['E1', 'E2', 'E3', 'D1', 'D2', 'D3']);
});

test('020 US1-S8 "Link einfügen" mit Trainer-Link in der Zwischenablage: Kopplungsfrage, danach teilen', async ({
  page,
  recorded,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await ensureTeam(b, team('E1'));
  await b.goto('./');
  await b.evaluate((url) => ((window as unknown as { __rec: Recorded }).__rec.clipboard = url), links.trainer);
  await b.getByTestId('start-live-quick').click();
  await b.getByTestId('live-start-paste').click();
  await expect(b.getByTestId('couple-dialog')).toBeVisible();
  await expect(b.getByTestId('paste-link-input')).toHaveCount(0);
  await b.getByTestId('couple-yes').click();
  await expect(b.getByTestId('live-start-done')).toHaveText('Gekoppelt mit „Unser Spieltag“.');
  const share = b.getByTestId('live-start-share');
  await expect(share).toHaveText('Link für Eltern teilen');
  await expect(share).toHaveClass(/btn--primary/);
  await share.click();
  const rec = recordedOf(b);
  await expect.poll(async () => (await rec()).shares.length).toBe(1);
  expect(await sharedLink(rec)).toBe(links.viewer);
});

test('020 US1-S9 fehlende Mannschaft kommt dazu; bei sechs Mannschaften nur ein Hinweis', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'], without: ['E3'] });
  await startGame(page, { ownTeam: team('E3') });
  await expect(page.getByTestId('live-pill')).toHaveCount(0);
  const before = (await recorded()).shares.length;
  await openQuickFromMenu(page);
  await expect.poll(async () => (await recorded()).shares.length).toBe(before + 1);
  expect(await sharedLink(recorded)).toBe(links.viewer);
  await expect(page.getByTestId('share-result')).toHaveText('E3 ist jetzt dabei.');
  await expect.poll(() => liveKeys(page)).toEqual(['E1', 'E2', 'E3']);
  await expect(page.getByTestId('live-pill')).toHaveAttribute('data-state', 'on');
  await settle(page);
  await expect.poll(async () => (await latestState(relay, links.viewer))?.team).toBe('E3');

  const full = await newDevice();
  const fullRec = recordedOf(full);
  // Das Formular wählt die ersten sechs aus "Meine Mannschaften" vor; F1 bleibt draußen.
  await createLive(full, fullRec, { teams: ['E1', 'E2', 'E3', 'D1', 'D2', 'D3', 'F1'] });
  await startGame(full, { ownTeam: team('F1') });
  const n = (await fullRec()).shares.length;
  await openQuickFromMenu(full);
  await expect.poll(async () => (await fullRec()).shares.length).toBe(n + 1);
  await expect(full.getByTestId('share-result')).toHaveText(
    'F1 gehört nicht zum Live-Spieltag. Eltern sehen dieses Spiel nicht.',
  );
  await expect.poll(() => liveKeys(full)).toEqual(['E1', 'E2', 'E3', 'D1', 'D2', 'D3']);
});

test('020 US1-S10 Browser lehnt das Teilen nach "Neu starten" ab: "Link für Eltern teilen" als nächster Tipp', async ({
  page,
  recorded,
  relay,
}) => {
  await ensureTeam(page, team('E1'));
  await page.goto('./');
  await page.getByTestId('start-live-quick').click();
  await expect(page.getByTestId('live-start-sheet')).toBeVisible();
  // Einmal abgelehnt (keine frische Berührung mehr), Zwischenablage ebenso.
  await page.evaluate(() => {
    const share = navigator.share.bind(navigator);
    const clip = navigator.clipboard;
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => {
        Object.defineProperty(navigator, 'share', { configurable: true, value: share });
        throw new DOMException('Keine Berührung', 'NotAllowedError');
      },
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clip });
          throw new DOMException('Keine Berührung', 'NotAllowedError');
        },
      },
    });
  });
  await page.getByTestId('live-start-new').click();
  await expect(page.getByTestId('live-start-done')).toHaveText('Fertig. Jetzt den Link teilen.');
  await expect(page.getByTestId('live-start-msg')).toHaveText('Teilen hat nicht geklappt.');
  await expect(page.getByTestId('live-start-trainer')).toBeVisible();
  expect((await recorded()).shares).toEqual([]);
  await page.getByTestId('live-start-share').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(1);
  await sharedLink(recorded);
  // Der Live-Spieltag ist trotzdem angelegt und beim Dienst.
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
});

test('020 US1 Randfall: "Neu starten" doppelt getippt ergibt genau einen Live-Spieltag', async ({
  page,
  recorded,
  relay,
}) => {
  await ensureTeam(page, team('E1'));
  await page.goto('./');
  await page.getByTestId('start-live-quick').click();
  await expect(page.getByTestId('live-start-new')).toBeVisible();
  await page.getByTestId('live-start-new').evaluate((el: HTMLElement) => {
    el.click();
    el.click();
  });
  await expect(page.getByTestId('live-start-done')).toBeVisible();
  await page.clock.runFor(3_000);
  await expect.poll(() => relay.all().length).toBeGreaterThan(0);
  expect(new Set(relay.all().map((m) => m.topic)).size).toBe(1);
  expect((await recorded()).shares.length).toBe(1);
});

/** Zwischenablage der Aufzeichnung (fixtures.ts) setzen. */
const setClipboard = (p: Page, text: string): Promise<void> =>
  p.evaluate((t) => {
    (window as unknown as { __rec: Recorded }).__rec.clipboard = t;
  }, text);

test('020 US1-S11 FR-E62 ein Einstieg: Karte "Trainer? …" nur ohne Knopf bzw. bei neu ausgestellt, sonst "Link einfügen" im Blatt', async ({
  page,
  newDevice,
}) => {
  // Eigene Mannschaft, kein Live-Spieltag: Knopf da, Karte weg, "Link einfügen" im Blatt.
  await ensureTeam(page, team('E1'));
  await page.goto('./');
  await expect(page.getByTestId('start-live-quick')).toBeVisible();
  await expect(page.getByTestId('start-trainer-card')).toHaveCount(0);
  await expect(page.getByTestId('btn-start-paste')).toHaveCount(0);
  await page.getByTestId('start-live-quick').click();
  await expect(page.getByTestId('live-start-paste')).toHaveText('Link einfügen');
  await page.getByTestId('live-start-sheet').getByRole('button', { name: 'Schließen' }).click();

  // Ohne eigene Mannschaft (Co-Trainer, Vertretung auf neuem Handy): Knopf verborgen, Karte bleibt.
  const c = await newDevice();
  await c.goto('./');
  await expect(c.getByTestId('btn-new-game')).toBeVisible();
  await expect(c.getByTestId('start-live-quick')).toHaveCount(0);
  await expect(c.getByTestId('start-trainer-card')).toContainText('Trainer? Füge den Link aus der Trainergruppe ein.');
  await expect(c.getByTestId('btn-start-paste')).toHaveText('Link einfügen');

  // Neu ausgestellt: Knopf verborgen, Karte mit dem Satz zum Neu-Ausstellen (auch mit eigener Mannschaft).
  const a = await newDevice();
  const old = await createLive(a, recordedOf(a), { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await ensureTeam(b, team('E1'));
  await pasteLink(b, old.trainer);
  await b.goto('./');
  await expect(b.getByTestId('start-trainer-card')).toHaveCount(0);
  await openTrainerSection(a);
  await a.getByTestId('btn-live-reissue').click();
  await confirmYes(a);
  await b.goto('./#/live-spieltag');
  await expect(b.getByTestId('live-retired')).toBeVisible();
  await b.goto('./');
  await expect(b.getByTestId('start-live-quick')).toHaveCount(0);
  await expect(b.getByTestId('start-trainer-card')).toContainText('wurde neu ausgestellt');
});

test('020 US1-S12 FR-E63 "Link einfügen" im Blatt und auf der Karte erkennt dieselben Arten gleich', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  const LIST = 'Kader E3:\n4 Paul\n8 Maxi\n12 Leo\n';

  // Zwei Handys, ein Weg je Handy: Blatt (mit Mannschaft) und Karte (ohne Mannschaft).
  const viaSheet = await newDevice();
  await ensureTeam(viaSheet, team('E3'));
  const viaCard = await newDevice();
  const paste = async (p: Page, sheet: boolean, text: string): Promise<void> => {
    await p.goto('./');
    await setClipboard(p, text);
    if (sheet) {
      await p.getByTestId('start-live-quick').click();
      await p.getByTestId('live-start-paste').click();
    } else await p.getByTestId('btn-start-paste').click();
  };

  for (const sheet of [true, false]) {
    const p = sheet ? viaSheet : viaCard;
    // Trainer-Link: Kopplungsfrage mit Hinweis auf die geteilten Kader, ohne Einfügefeld.
    await paste(p, sheet, `Hier der Trainer-Link:\n${links.trainer}\n`);
    await expect(p.getByTestId('couple-dialog')).toContainText('Geteilte Kader kommen automatisch mit.');
    await expect(p.getByTestId('paste-link-input')).toHaveCount(0);
    await p.getByTestId('couple-no').click();

    // Kader-Liste (Trainer-Paket): Vorschau unter "Kader".
    await paste(p, sheet, LIST);
    await expect(p).toHaveURL(/#\/kader$/);
    await expect(p.getByTestId('paste-target')).toHaveText('Ziel: Kader „E3“ (wird angelegt)');

    // Nichts Brauchbares: Einfügefeld mit Hinweis.
    await paste(p, sheet, 'Training am Dienstag fällt aus');
    await expect(p.getByTestId('start-paste-sheet')).toBeVisible();
    await expect(p.getByTestId('paste-link-error')).toHaveText('Link oder Kader-Liste aus der Trainergruppe einfügen.');

    // Zuschauer-Link zuletzt: ohne eigene Mannschaft führt der Startbildschirm danach zum Dashboard (Spec 006 R-L6).
    // Dashboard, ohne zu koppeln.
    await paste(p, sheet, links.viewer);
    await expect(p.getByTestId('dashboard')).toBeVisible();
    await expect(p.getByTestId('couple-dialog')).toHaveCount(0);
  }
});
