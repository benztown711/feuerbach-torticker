import type { Page } from '@playwright/test';
import { expect, test, type Recorded } from './fixtures';
import { SEC } from './helpers';
import {
  createLive,
  liveSnap,
  onMatchday,
  openViewer,
  recordedOf,
  sendAs,
  type ClockSpec,
  type GoalSpec,
  type LiveLinks,
} from './live-helpers';
import type { FakeRelay } from './relay';

/**
 * Spec 025 US3: Töne in der Eltern-Ansicht (Anpfiff, Pausen- und Schlusspfiff, Tor für uns, Gegentor). Die Stände
 * kommen wie von einem Trainer-Handy über den Relay-Nachbau.
 */

test.use({ serviceWorkers: 'block' });

interface Ctx {
  v: Page;
  links: LiveLinks;
  rec: () => Promise<Recorded>;
  /** Sendet E1 mit diesen Pfiffen (Minuten vor jetzt) und Toren als neue Meldung. */
  send: (clock: ClockSpec[], goals?: GoalSpec[]) => Promise<void>;
}

async function open(
  page: Page,
  recorded: () => Promise<Recorded>,
  relay: FakeRelay,
  newDevice: () => Promise<Page>,
): Promise<Ctx> {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  let seq = 0;
  const send: Ctx['send'] = (clock, goals = []) =>
    sendAs(relay, links.trainer, liveSnap({ team: 'E1', now: relay.nowMs() + 1000 * ++seq, clock, goals }) as never);
  await send([]);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('0:0');
  return { v, links, rec: recordedOf(v), send };
}

const toggle = (v: Page) => v.getByRole('switch', { name: 'Töne' });

/** Wartet, bis der n-te Ton (insgesamt) gespielt hat, und gibt ihn zurück. */
async function nth(rec: () => Promise<Recorded>, n: number): Promise<string | undefined> {
  await expect.poll(async () => (await rec()).sounds).toBe(n);
  return (await rec()).lastSound;
}

test('025 US3-S1 US3-S3 FR-T06 FR-T07 "Töne" an: Probe, dann Anpfiff, Tore und Pfiffe mit ihrem Ton', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { v, rec, send } = await open(page, recorded, relay, newDevice);
  await expect(toggle(v)).toHaveAttribute('aria-checked', 'false');
  await expect(v.getByTestId('dash-sound-choose')).toHaveText('Töne wählen');
  // aus: kein Ton
  await send([['kickoff', 1, 1]]);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('0:0');
  await v.clock.runFor(2 * SEC);
  expect((await rec()).sounds).toBe(0);

  await toggle(v).click();
  await expect(toggle(v)).toHaveAttribute('aria-checked', 'true');
  expect(await nth(rec, 1)).toBe('torhupe');

  const k1: ClockSpec[] = [['kickoff', 3, 1]];
  await send(k1, [{ side: 'own', minute: 2 }]);
  expect(await nth(rec, 2)).toBe('torhupe');
  await send(k1, [
    { side: 'own', minute: 2 },
    { side: 'opp', minute: 3 },
  ]);
  expect(await nth(rec, 3)).toBe('raunen');
  const half: ClockSpec[] = [...k1, ['sectionEnd', 1, 1]];
  await send(half, [
    { side: 'own', minute: 2 },
    { side: 'opp', minute: 3 },
  ]);
  expect(await nth(rec, 4)).toBe('doppelpfiff');
  const k2: ClockSpec[] = [...half, ['kickoff', 0.5, 2]];
  await send(k2, [
    { side: 'own', minute: 2 },
    { side: 'opp', minute: 3 },
  ]);
  expect(await nth(rec, 5)).toBe('langer-pfiff');
  await send(
    [...k2, ['fullTime', 0.1, 2]],
    [
      { side: 'own', minute: 2 },
      { side: 'opp', minute: 3 },
    ],
  );
  expect(await nth(rec, 6)).toBe('pfiff');
});

test('025 US3-S4 Tor und Schlusspfiff in einer Meldung: nur der Schlusspfiff', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { v, rec, send } = await open(page, recorded, relay, newDevice);
  await toggle(v).click();
  expect(await nth(rec, 1)).toBe('torhupe');
  await send([['kickoff', 10, 1]]);
  expect(await nth(rec, 2)).toBe('langer-pfiff');
  await send(
    [
      ['kickoff', 10, 1],
      ['fullTime', 0.1, 1],
    ],
    [{ side: 'own', minute: 9 }],
  );
  expect(await nth(rec, 3)).toBe('pfiff');
  await v.clock.runFor(2 * SEC);
  expect((await rec()).sounds).toBe(3);
});

test('025 US3-S5 FR-T06 "Töne wählen": eigene Wahl je Ereignis, "Aus" spielt nichts', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const { v, rec, send } = await open(page, recorded, relay, newDevice);
  await v.getByTestId('dash-sound-choose').click();
  const sheet = v.getByTestId('dash-sounds-sheet');
  await expect(sheet.getByRole('heading')).toHaveText('Töne wählen');
  await expect(sheet.locator('[data-testid^="sound-event-"][data-testid$="-value"]')).toHaveText([
    'Langer Pfiff',
    'Doppelpfiff',
    'Pfiff',
    'Torhupe',
    'Raunen',
  ]);
  await expect(v.getByTestId('sound-event-timeUp')).toHaveCount(0);
  await v.getByTestId('sound-event-goalOwn').click();
  await v.getByTestId('sound-option-jubel').click();
  expect(await nth(rec, 1)).toBe('jubel');
  await v.getByTestId('sound-sheet').getByRole('button', { name: 'Schließen' }).click();
  await v.getByTestId('sound-event-goalOpp').click();
  await v.getByTestId('sound-option-aus').click();
  await v.getByTestId('sound-sheet').getByRole('button', { name: 'Schließen' }).click();
  await expect(v.getByTestId('sound-event-goalOpp-value')).toHaveText('Aus');
  await sheet.getByRole('button', { name: 'Schließen' }).click();

  await toggle(v).click();
  // Probe mit dem gewählten Ton für "Tor für uns"
  expect(await nth(rec, 2)).toBe('jubel');
  await send([['kickoff', 5, 1]], [{ side: 'opp', minute: 4 }]);
  await expect(v.getByTestId('dash-score-E1')).toHaveText('0:1');
  await v.clock.runFor(2 * SEC);
  expect((await rec()).sounds).toBe(2);
  await send(
    [['kickoff', 5, 1]],
    [
      { side: 'opp', minute: 4 },
      { side: 'own', minute: 5 },
    ],
  );
  expect(await nth(rec, 3)).toBe('jubel');

  // gemerkt auf diesem Gerät
  await v.reload();
  await v.getByTestId('dash-sound-choose').click();
  await expect(v.getByTestId('sound-event-goalOwn-value')).toHaveText('Jubel');
  await expect(v.getByTestId('sound-event-goalOpp-value')).toHaveText('Aus');
});

test('025 US3-S2 FR-T06 "Ton bei Toren" war an: "Töne" ist an', async ({ page, recorded, relay, newDevice }) => {
  const { v } = await open(page, recorded, relay, newDevice);
  await v.evaluate(() => window.localStorage.setItem('torticker-goal-sound', '1'));
  await v.reload();
  await expect(toggle(v)).toHaveAttribute('aria-checked', 'true');
  await expect(v.getByRole('switch', { name: 'Ton bei Toren' })).toHaveCount(0);
});

test('025 US3-S6 Dashboard in der App: keine Töne, kein Schalter, kein "Töne wählen"', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  onMatchday(relay);
  await page.clock.setSystemTime(Date.now() + relay.offsetMs);
  await sendAs(relay, links.trainer, liveSnap({ team: 'E1', now: relay.nowMs() }) as never);
  await page.evaluate(() => window.localStorage.setItem('torticker-goal-sound', '1'));
  await page.goto('./#/live-spieltag/dashboard');
  await expect(page.getByTestId('dash-score-E1')).toHaveText('0:0');
  await expect(page.getByTestId('dash-sound-choose')).toHaveCount(0);
  const before = (await recorded()).sounds;
  await sendAs(
    relay,
    links.trainer,
    liveSnap({ team: 'E1', now: relay.nowMs() + 5000, clock: [['kickoff', 1, 1]] }) as never,
  );
  await page.clock.runFor(5 * SEC);
  expect((await recorded()).sounds).toBe(before);
});
