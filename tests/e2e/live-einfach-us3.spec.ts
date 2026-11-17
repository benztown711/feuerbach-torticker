import type { Page } from '@playwright/test';
import { expect, test, type Recorded } from './fixtures';
import { MIN, SEC } from './helpers';
import {
  asPath,
  createLive,
  e1WithGoals,
  later,
  MATCHDAY,
  onMatchday,
  openViewer,
  recordedOf,
  sendAs,
  type GoalSpec,
  type LiveLinks,
} from './live-helpers';
import type { FakeRelay } from './relay';

/**
 * Spec 020 US3: Tor merken bei offener Seite (Tab-Titel, Ansage, Vibration, "Ton bei Toren"). Die Stände kommen wie
 * von einem Trainer-Handy über den Relay-Nachbau; die Zuschauer-Uhr läuft mit der Serveruhr (live-helpers).
 */

// Relay-Nachbau braucht blockierte Service Worker (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const T = MATCHDAY;
const APP_TITLE = 'Feuerbach Torticker';

/** n weitere Tore von E1 (Stand danach (2 + n):1), die letzten mit Torschütze Tom. */
const extra = (n: number): GoalSpec[] =>
  Array.from({ length: n }, (_, i) => ({ side: 'own' as const, minute: 32 + i, section: 2, who: 'Tom' }));

interface Ctx {
  links: LiveLinks;
  v: Page;
  /** Sendet E1 mit `n` weiteren Toren (n-tes Tor neu) zur Zeit "jetzt" der Serveruhr. */
  goal: (n: number, tweak?: (s: { goals: Record<string, unknown>[] }) => void) => Promise<void>;
  rec: () => Promise<Recorded>;
}

async function open(
  page: Page,
  recorded: () => Promise<Recorded>,
  relay: FakeRelay,
  newDevice: () => Promise<Page>,
): Promise<Ctx> {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  await sendAs(relay, links.trainer, e1WithGoals());
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('2:1');
  let seq = 0;
  const goal: Ctx['goal'] = async (n, tweak) => {
    const elapsed = relay.nowMs() - T;
    const snap = e1WithGoals(extra(n), T + elapsed + 1000 * ++seq, elapsed / MIN) as {
      goals: Record<string, unknown>[];
    };
    tweak?.(snap);
    await sendAs(relay, links.trainer, snap as never);
  };
  return { links, v, goal, rec: recordedOf(v) };
}

/** Wie der Browser: Sichtbarkeit wechselt, `visibilitychange` wird ausgelöst. */
const visibility = (v: Page, state: 'hidden' | 'visible'): Promise<void> =>
  v.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);

const announce = (v: Page) => v.getByTestId('dash-goal-announce');
const sound = (v: Page) => v.getByRole('switch', { name: 'Ton bei Toren' });

test('020 US3-S1 Tor von E1: Tab-Titel "Tor! Feuerbach E1 3:1"', async ({ page, recorded, relay, newDevice }) => {
  const { v, goal } = await open(page, recorded, relay, newDevice);
  expect(await v.title()).toBe(APP_TITLE);
  await goal(1);
  await expect.poll(() => v.title()).toBe('Tor! Feuerbach E1 3:1');
  // Tor des Gegners: Titel nennt die Mannschaft, die getroffen hat, Stand Heim:Gast
  await goal(1, (s) =>
    s.goals.push({ side: 'opp', minute: 36, stoppage: null, section: 2, who: null, penalty: false, ownGoal: false }),
  );
  await expect.poll(() => v.title()).toBe('Tor! TSV Musterstadt 3:2');
});

test('020 US3-S2 Titel zurück: Seite wieder sichtbar, Fokus, 30 Sekunden, weiteres Tor startet neu', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { v, goal } = await open(page, recorded, relay, newDevice);
  // Seite geht in den Hintergrund (die Verbindung wird getrennt, relay.ts) und wird wieder sichtbar
  await goal(1);
  await expect.poll(() => v.title()).toBe('Tor! Feuerbach E1 3:1');
  await visibility(v, 'hidden');
  expect(await v.title()).toBe('Tor! Feuerbach E1 3:1');
  await visibility(v, 'visible');
  await expect.poll(() => v.title()).toBe(APP_TITLE);
  // Fenster bekommt den Fokus
  await goal(2);
  await expect.poll(() => v.title()).toBe('Tor! Feuerbach E1 4:1');
  await v.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => v.title()).toBe(APP_TITLE);
  // Vordergrund: spätestens nach 30 Sekunden
  await goal(3);
  await expect.poll(() => v.title()).toBe('Tor! Feuerbach E1 5:1');
  await later(v, relay, 29 * SEC);
  expect(await v.title()).toBe('Tor! Feuerbach E1 5:1');
  await later(v, relay, 2 * SEC);
  await expect.poll(() => v.title()).toBe(APP_TITLE);
  // Ein weiteres Tor ersetzt den Titel und startet die 30 Sekunden neu
  await goal(4);
  await expect.poll(() => v.title()).toBe('Tor! Feuerbach E1 6:1');
  await later(v, relay, 20 * SEC);
  await goal(5);
  await expect.poll(() => v.title()).toBe('Tor! Feuerbach E1 7:1');
  await later(v, relay, 20 * SEC);
  expect(await v.title()).toBe('Tor! Feuerbach E1 7:1');
  await later(v, relay, 11 * SEC);
  await expect.poll(() => v.title()).toBe(APP_TITLE);
});

test('020 US3-S3 Ansage für Screenreader: höflich, mit Torschütze, ohne Namen, Eigentor', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { v, goal } = await open(page, recorded, relay, newDevice);
  await expect(announce(v)).toHaveAttribute('aria-live', 'polite');
  await expect(announce(v)).toHaveAttribute('aria-atomic', 'true');
  await expect(announce(v)).toHaveText('');
  await goal(1);
  await expect(announce(v)).toHaveText('Tor für Feuerbach E1, 3 zu 1, Tom');
  // nach 5 Sekunden leer, damit dieselbe Ansage beim nächsten Tor wieder gelesen wird
  await later(v, relay, 6 * SEC);
  await expect(announce(v)).toHaveText('');
  // ohne übertragenen Torschützen
  await goal(2, (s) => {
    s.goals[s.goals.length - 1] = { ...s.goals[s.goals.length - 1]!, who: null };
  });
  await expect(announce(v)).toHaveText('Tor für Feuerbach E1, 4 zu 1');
  await later(v, relay, 6 * SEC);
  // Eigentor des Gegners
  await goal(3, (s) => {
    s.goals[s.goals.length - 1] = { ...s.goals[s.goals.length - 1]!, who: null, ownGoal: true };
  });
  await expect(announce(v)).toHaveText('Tor für Feuerbach E1, 5 zu 1, Eigentor');
  await later(v, relay, 6 * SEC);
  // Gegner
  await goal(3, (s) =>
    s.goals.push({ side: 'opp', minute: 36, stoppage: null, section: 2, who: null, penalty: false, ownGoal: false }),
  );
  await expect(announce(v)).toHaveText('Tor für TSV Musterstadt, 5 zu 2');
});

test('020 US3-S4 Vibration einmal kurz (200 ms); ohne Vibration (iPhone) kein Fehler', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { v, goal, rec } = await open(page, recorded, relay, newDevice);
  await v.evaluate(() => {
    const calls: unknown[] = [];
    (window as unknown as { __vib: unknown[] }).__vib = calls;
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (p: unknown) => {
        calls.push(p);
        return true;
      },
    });
  });
  await goal(1);
  await expect.poll(() => v.evaluate(() => (window as unknown as { __vib: unknown[] }).__vib)).toEqual([200]);

  // Gerät ohne Vibration
  const errors: string[] = [];
  v.on('pageerror', (e) => errors.push(e.message));
  await v.evaluate(() => Object.defineProperty(navigator, 'vibrate', { configurable: true, value: undefined }));
  await goal(2);
  await expect.poll(() => v.title()).toBe('Tor! Feuerbach E1 4:1');
  expect(errors).toEqual([]);
  expect((await rec()).vibrations).toBe(0);
});

test('020 US3-S5 Schalter "Ton bei Toren": aus, Probe beim Einschalten, Ton bei jedem Tor, aus nach Ausschalten', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { v, goal, rec } = await open(page, recorded, relay, newDevice);
  const sw = sound(v);
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  expect((await sw.boundingBox())?.height).toBeGreaterThanOrEqual(64);
  await goal(1);
  await expect.poll(() => v.title()).toBe('Tor! Feuerbach E1 3:1');
  expect((await rec()).sounds).toBe(0);

  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  expect(await rec()).toMatchObject({ sounds: 1, lastSound: 'pfiff' });
  await goal(2);
  await expect.poll(async () => (await rec()).sounds).toBe(2);
  // Ton und Vibration je Meldung nur einmal, ohne das Muster des Abschnittsendes
  expect((await rec()).vibrations).toBe(2);

  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await goal(3);
  await expect.poll(() => v.title()).toBe('Tor! Feuerbach E1 5:1');
  expect((await rec()).sounds).toBe(2);
});

test('020 US3-S6 Schalter bleibt nach Neuladen an; "Ton aus · tippen" bis zur nächsten Berührung', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { v, goal, rec } = await open(page, recorded, relay, newDevice);
  await sound(v).click();
  await expect(sound(v)).toHaveAttribute('aria-checked', 'true');
  await expect(v.getByTestId('dash-sound-locked')).toHaveCount(0);

  await v.reload();
  await expect(v.getByTestId('dash-score-E1')).toHaveText('2:1');
  await expect(sound(v)).toHaveAttribute('aria-checked', 'true');
  await expect(v.getByTestId('dash-sound-locked')).toHaveText('Ton aus · tippen');
  // jede Berührung der Seite schaltet den Ton frei
  await v.getByTestId('dash-title').click();
  await expect(v.getByTestId('dash-sound-locked')).toHaveCount(0);
  await goal(1);
  await expect.poll(async () => (await rec()).sounds).toBe(1);

  // iOS sperrt nach der Rückkehr aus dem Hintergrund wieder
  await visibility(v, 'hidden');
  await visibility(v, 'visible');
  await expect(v.getByTestId('dash-sound-locked')).toBeVisible();
  await v.getByTestId('dash-title').click();
  await expect(v.getByTestId('dash-sound-locked')).toHaveCount(0);
});

test('020 US3-S7 FR-E21 erstes Laden und nachgeholte ältere Meldungen: kein Titel, keine Ansage, kein Vibrieren, kein Ton', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { v, goal, rec } = await open(page, recorded, relay, newDevice);
  await sound(v).click();
  await expect(sound(v)).toHaveAttribute('aria-checked', 'true');
  // Neu laden: die Spiele haben schon Tore
  await v.reload();
  await expect(v.getByTestId('dash-score-E1')).toHaveText('2:1');
  await v.getByTestId('dash-title').click();
  await v.clock.runFor(2 * SEC);
  expect(await v.title()).toBe(APP_TITLE);
  await expect(announce(v)).toHaveText('');
  expect(await rec()).toMatchObject({ sounds: 0, vibrations: 0 });

  // Verbindung weg, Tor fällt, Verbindung nach zwei Minuten zurück: Meldung ist älter als 1 Minute
  relay.fail = true;
  await expect(v.getByTestId('dash-status')).toHaveAttribute('data-state', 'offline');
  await goal(1);
  await later(v, relay, 2 * MIN);
  relay.fail = false;
  await v.clock.runFor(5 * SEC);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('3:1');
  await v.clock.runFor(2 * SEC);
  expect(await v.title()).toBe(APP_TITLE);
  await expect(announce(v)).toHaveText('');
  expect(await rec()).toMatchObject({ sounds: 0, vibrations: 0 });
});

test('020 US3-S8 Korrektur und Entfernen eines Tores: kein Hinweis, der Stand ändert sich wie bisher', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { v, goal, rec } = await open(page, recorded, relay, newDevice);
  await goal(1);
  await expect.poll(() => v.title()).toBe('Tor! Feuerbach E1 3:1');
  await visibility(v, 'visible');
  await v.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => v.title()).toBe(APP_TITLE);
  const before = await rec();

  // Torschütze korrigiert: gleiche Anzahl
  await goal(1, (s) => {
    s.goals[s.goals.length - 1] = { ...s.goals[s.goals.length - 1]!, who: 'Leo' };
  });
  await v.getByTestId('dash-toggle-E1').click();
  await expect(v.getByTestId('dash-goal').first()).toContainText('Leo');
  // Tor entfernt: nur noch 2:1
  await goal(0);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('2:1');
  await v.clock.runFor(2 * SEC);
  expect(await v.title()).toBe(APP_TITLE);
  await expect(announce(v)).toHaveText('');
  expect(await rec()).toEqual(before);
});

test('020 US3-S9 FR-E27 Dashboard in der App: Titel und Ansage, aber weder Vibration noch Ton noch Schalter', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  await page.clock.setSystemTime(Date.now() + relay.offsetMs);
  await sendAs(relay, links.trainer, e1WithGoals());
  // Der Schalter der Eltern-Ansicht ist auf diesem Gerät an gemerkt: in der App darf er trotzdem nichts spielen
  await page.evaluate(() => window.localStorage.setItem('torticker-goal-sound', '1'));
  await page.goto('./#/live-spieltag/dashboard');
  await expect(page.getByTestId('dash-score-E1')).toHaveText('2:1');
  await expect(page.getByTestId('dash-sound')).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Ton bei Toren' })).toHaveCount(0);

  await sendAs(relay, links.trainer, e1WithGoals(extra(1), T + 5000));
  await expect.poll(() => page.title()).toBe('Tor! Feuerbach E1 3:1');
  await expect(announce(page)).toHaveText('Tor für Feuerbach E1, 3 zu 1, Tom');
  expect(await recorded()).toMatchObject({ sounds: 0, vibrations: 0 });
});

test('020 US3-S10 FR-E21 Tor kurz vor dem Öffnen (gemerkter Stand älter): kein Hinweis, das nächste Tor schon', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { links, v, goal, rec } = await open(page, recorded, relay, newDevice);
  await sound(v).click();
  await expect(sound(v)).toHaveAttribute('aria-checked', 'true');
  // Seite zu; in der Zeit fällt das 3:1
  await v.goto('about:blank');
  await goal(1);
  // Wieder öffnen: zuerst der gemerkte Stand 2:1, dann vom Dienst das 3:1 (Meldung jünger als 1 Minute)
  await v.goto(asPath(links.viewer));
  await expect(v.getByTestId('dash-score-E1')).toHaveText('3:1');
  await v.getByTestId('dash-title').click();
  await v.clock.runFor(2 * SEC);
  expect(await v.title()).toBe(APP_TITLE);
  await expect(announce(v)).toHaveText('');
  expect(await rec()).toMatchObject({ sounds: 0, vibrations: 0 });
  // Das nächste Tor bei offener Seite meldet sich wie gewohnt
  await goal(2);
  await expect.poll(() => v.title()).toBe('Tor! Feuerbach E1 4:1');
  await expect(announce(v)).toHaveText('Tor für Feuerbach E1, 4 zu 1, Tom');
});
