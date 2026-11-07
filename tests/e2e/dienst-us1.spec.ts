import type { Page } from '@playwright/test';
import { webcrypto } from 'node:crypto';
import { expect, test } from './fixtures';
import { forward, MIN, newGame, startGame } from './helpers';
import {
  createLive,
  liveSnap,
  liveStates,
  linkData,
  MATCHDAY,
  onMatchday,
  openViewer,
  sendAs,
  type LiveLinks,
} from './live-helpers';
import { RELAY_ORIGIN } from './relay';

/**
 * Spec 007 US1: Eltern sehen den Stand jederzeit. Der eigene Dienst hält alles vor; neue Geräte bekommen beim
 * Verbinden alles Gespeicherte (`hello`), neue Meldungen kommen ohne Abfragen an.
 */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const E1 = 'Sportvg Feuerbach E1';
const DAY = 24 * 60 * MIN;
const settle = (page: Page) => page.clock.runFor(6_000);

/** E2 hat am Samstag (MATCHDAY) 2:1 gegen TSV Musterstadt gewonnen. */
const e2Won = () =>
  liveSnap({
    team: 'E2',
    now: MATCHDAY,
    clock: [
      ['kickoff', 70, 1],
      ['sectionEnd', 45, 1],
      ['kickoff', 40, 2],
      ['fullTime', 15, 2],
    ],
    goals: [
      { side: 'own', minute: 5, who: 'Max' },
      { side: 'opp', minute: 12 },
      { side: 'own', minute: 30, section: 2, who: 'Ben' },
    ],
  });

test('007 US1-S1 am Vorabend angelegt, Trainer seitdem aus: ein neues Gerät sieht die Karte in 5 s', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  // Freitag 20:00 Uhr: Spiel für Samstag anlegen, danach den Torticker schließen.
  const evening = MATCHDAY - 14 * 60 * MIN;
  await page.clock.setSystemTime(evening);
  relay.offsetMs = evening - Date.now();
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await newGame(page, { ownTeam: E1, opponent: 'TSV Musterstadt' });
  await settle(page);
  await expect.poll(async () => (await liveStates(relay, links.viewer)).map((s) => s.opp)).toEqual(['TSV Musterstadt']);
  const posts = relay.posts.length;
  await page.close();

  onMatchday(relay);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText('noch nicht angepfiffen', { timeout: 5_000 });
  await expect(v.getByTestId('dash-empty')).toHaveCount(0);
  // Kein Trainer-Handy musste dafür erneut senden.
  expect(relay.posts).toHaveLength(posts);
});

test('007 US1-S2 Endstand vom Samstag am Montag beim ersten Öffnen: "Ende · 07.11."', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  await sendAs(relay, links.trainer, e2Won());
  relay.offsetMs += 2 * DAY;
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-score-E2')).toHaveText('2:1');
  await expect(v.getByTestId('dash-phase-E2')).toHaveText('Ende · 07.11.');
});

test('007 US1-S3 Browser und Symbol auf dem Home-Bildschirm zeigen dieselben Spiele', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  await sendAs(relay, links.trainer, e2Won());
  await sendAs(relay, links.trainer, liveSnap({ team: 'E1', now: MATCHDAY, clock: [['kickoff', 5, 1]] }));
  const browser = await openViewer(newDevice, relay, links);
  // Das Symbol auf dem Home-Bildschirm hat (wie in iOS) einen eigenen, leeren Speicher.
  const icon = await openViewer(newDevice, relay, links);
  for (const v of [browser, icon]) {
    await expect(v.getByTestId('dash-score-E1')).toHaveText('0:0');
    await expect(v.getByTestId('dash-score-E2')).toHaveText('2:1');
  }
});

test('007 US1-S4 FR-N04 Tor in 10 s auf zwei Dashboards, ohne Abfragen alle 30 s', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  await sendAs(relay, links.trainer, liveSnap({ team: 'E1', now: MATCHDAY, clock: [['kickoff', 5, 1]] }));
  const a = await openViewer(newDevice, relay, links);
  const b = await openViewer(newDevice, relay, links);
  for (const v of [a, b]) await expect(v.getByTestId('dash-score-E1')).toHaveText('0:0');
  const goals = [{ side: 'own' as const, minute: 6, who: 'Max' }];
  await sendAs(relay, links.trainer, liveSnap({ team: 'E1', now: MATCHDAY + MIN, clock: [['kickoff', 6, 1]], goals }));
  // Ohne die Uhr der Zuschauer weiterzudrehen: die Meldung kommt über die offene Verbindung.
  for (const v of [a, b]) {
    await expect(v.getByTestId('dash-score-E1')).toHaveText('1:0', { timeout: 10_000 });
    await expect(v.getByTestId('dash-status')).toHaveAttribute('data-state', 'live');
  }
});

test('007 US1-S5 FR-N10 Dienst nicht erreichbar: Erfassung unberührt, "Keine Verbindung", danach von selbst aktuell', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  await page.clock.setSystemTime(MATCHDAY);
  await startGame(page, { ownTeam: E1 });
  await settle(page);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('0:0');

  relay.fail = true;
  await forward(page, MIN);
  await page.getByTestId('btn-goal-own').click();
  await expect(page.getByTestId('score')).toHaveText('1 : 0');
  const status = v.getByTestId('dash-status');
  await expect(status).toHaveAttribute('data-state', 'offline');
  await expect(status).toContainText(/Keine Verbindung · Stand von \d\d:\d\d Uhr/);
  await page.clock.runFor(35_000);
  await expect(page.getByTestId('live-pill')).toHaveText('Wartet auf Netz');

  relay.fail = false;
  await page.clock.runFor(35_000);
  await v.clock.runFor(35_000);
  await expect(status).toHaveAttribute('data-state', 'live');
  await expect(v.getByTestId('dash-score-E1')).toHaveText('1:0');
});

/** Schreibanfrage, wie sie jemand mit nur dem Zuschauer-Link bauen könnte: eigener Schlüssel, eigenes Zertifikat. */
async function forgedWrites(links: LiveLinks): Promise<string[]> {
  const view = linkData(links.viewer);
  const subtle = webcrypto.subtle;
  const pair = (await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])) as CryptoKeyPair;
  const pub = Buffer.from(await subtle.exportKey('raw', pair.publicKey)).toString('base64url');
  const sign = async (text: string) =>
    Buffer.from(
      await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, new TextEncoder().encode(text)),
    ).toString('base64url');
  const body = `t1.${Buffer.from('gefälscht').toString('base64url')}`;
  const hash = Buffer.from(await subtle.digest('SHA-256', new TextEncoder().encode(body))).toString('base64url');
  const name = `${view.t as string}.${view.o as string}`;
  const slot = 'A'.repeat(22);
  const certText = JSON.stringify({ key: 'E1', name: 'Feuerbach E1', homeColor: 'rot', awayColor: 'rot', pub, iat: 1 });
  const game = {
    kind: 'game',
    slot,
    group: slot,
    h: 100,
    at: MATCHDAY + DAY,
    gone: true,
    body,
    sig: await sign(
      ['torticker-relay-v1', name, 'game', slot, slot, '100', String(MATCHDAY + DAY), '', '1', hash].join('|'),
    ),
    cert: { d: certText, s: await sign(certText) },
  };
  const cfg = {
    kind: 'cfg',
    iat: MATCHDAY + DAY,
    body,
    sig: await sign(['torticker-relay-v1', name, 'cfg', '', '', '', '', String(MATCHDAY + DAY), '', hash].join('|')),
  };
  const retire = {
    kind: 'retire',
    body,
    sig: await sign(['torticker-relay-v1', name, 'retire', '', '', '', '', '', '', hash].join('|')),
  };
  return [game, cfg, retire].map((w) => JSON.stringify(w));
}

async function post(v: Page, links: LiveLinks, text: string): Promise<number> {
  const view = linkData(links.viewer);
  const url = `${RELAY_ORIGIN}/v1/${view.t as string}/${view.o as string}`;
  return v.evaluate(
    async ([u, b]) => (await fetch(u as string, { method: 'POST', body: b as string })).status,
    [url, text],
  );
}

test('007 US1-S6 FR-N06 mit nur dem Zuschauer-Link lässt sich nichts speichern, ändern oder löschen', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  await sendAs(relay, links.trainer, liveSnap({ team: 'E1', now: MATCHDAY, clock: [['kickoff', 5, 1]] }));
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('0:0');
  const before = relay.all().length;
  for (const w of await forgedWrites(links)) expect(await post(v, links, w)).toBe(403);
  // Unvollständige Anfragen weist der Dienst schon vor der Prüfung der Signatur ab.
  expect(await post(v, links, '{"kind":"plan"}')).toBe(400);
  expect(relay.all()).toHaveLength(before);
  await v.clock.runFor(5_000);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('0:0');
  await expect(v.getByTestId('dash-retired')).toHaveCount(0);
});

test('007 SC-N05 FR-N05 beim Dienst kommt nichts im Klartext an', async ({ page, recorded, relay }) => {
  await createLive(page, recorded, { teams: ['E1'], title: 'Saison Feuerbach' });
  await startGame(page, { ownTeam: E1, opponent: 'TSV Musterstadt' });
  await forward(page, MIN);
  await page.getByTestId('btn-goal-own').click();
  await settle(page);
  await expect.poll(() => relay.posts.length).toBeGreaterThan(1);
  expect(relay.statuses.every((s) => s === 200 || s === 204)).toBe(true);
  const b64 = /^[A-Za-z0-9_-]+$/;
  for (const text of relay.posts) {
    const w = JSON.parse(text) as Record<string, unknown>;
    // Nur Ordnungsangaben, Zahlen und Verschlüsseltes; kein Zertifikat mit Mannschaftsname und Trikotfarben.
    expect(
      Object.keys(w).every((k) => ['kind', 'slot', 'group', 'h', 'at', 'gone', 'iat', 'body', 'sig'].includes(k)),
    ).toBe(true);
    expect(['game', 'cfg', 'plan', 'retire']).toContain(w.kind);
    expect(String(w.body)).toMatch(/^t1\.[A-Za-z0-9_-]+$/);
    expect(String(w.sig)).toMatch(b64);
    for (const k of ['slot', 'group']) if (k in w) expect(String(w[k])).toMatch(/^[A-Za-z0-9_-]{22}$/);
    for (const k of ['h', 'at', 'iat']) if (k in w) expect(typeof w[k]).toBe('number');
  }
});
