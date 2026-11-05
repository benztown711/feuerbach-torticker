import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { forward, MIN, startGame } from './helpers';
import { createLive, e3Ended, liveSnap, MATCHDAY, onMatchday, sendAs, type LiveLinks } from './live-helpers';
import type { FakeRelay } from './relay';

/**
 * Spec 006 US4: Blick auf das andere Spiel. Handy A (Trainer-Handy) erfasst E1; die Stände von E2 und E3
 * kommen wie von anderen Trainer-Handys über den Relay-Nachbau.
 */

// Service Worker blockieren, damit WebKit die Anfragen an ntfy.sh durch den Relay-Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const E1 = 'Sportvg Feuerbach E1';

/** E2 führt 2:1 in Minute 31 (2 × 25 Minuten); mit `third` fällt das 3:1 (zehn Sekunden später gesendet). */
const e2At31 = (third = false) =>
  liveSnap({
    team: 'E2',
    now: MATCHDAY + (third ? 10_000 : 0),
    clock: [
      ['kickoff', 40, 1],
      ['sectionEnd', 15, 1],
      ['kickoff', 5.2, 2],
    ],
    goals: [
      { side: 'own', minute: 4, who: 'Max' },
      { side: 'opp', minute: 12 },
      { side: 'own', minute: 28, section: 2, who: 'Ben' },
      ...(third ? [{ side: 'own' as const, minute: 30, section: 2, who: 'Tom' }] : []),
    ],
  });

/** A koppelt (Spieltag T auf der Serveruhr) und pfeift das E1-Spiel an. */
async function aPlaysE1(page: Page, recorded: Parameters<typeof createLive>[1], relay: FakeRelay): Promise<LiveLinks> {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  onMatchday(relay);
  await startGame(page, { ownTeam: E1, opponent: 'TSV Musterstadt' });
  return links;
}

test('006 US4-S1 Tipp auf "Live" öffnet das Dashboard, "Spiel" führt zurück, die Uhr läuft weiter', async ({
  page,
  recorded,
  relay,
}) => {
  await aPlaysE1(page, recorded, relay);
  await forward(page, 3 * MIN);
  await expect(page.getByTestId('clock')).toHaveText(/^2[12]:\d\d$/);
  await page.getByTestId('live-pill').click();
  await expect(page.getByTestId('dashboard')).toBeVisible();
  await forward(page, 2 * MIN);
  await expect(page.getByTestId('nav-live')).toHaveText("Läuft 6'");
  await page.getByTestId('nav-game').click();
  await expect(page).toHaveURL(/#\/spiel\//);
  await expect(page.getByTestId('clock')).toHaveText(/^1[89]:\d\d$/);
  await expect(page.getByTestId('btn-pause')).toBeVisible();
});

test('006 US4-S2 Zeile mit den anderen Spielen unter der Kopfzeile, Tipp öffnet das Dashboard', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await aPlaysE1(page, recorded, relay);
  // Ohne andere Spiele keine Zeile (FR-033: Platz für die Torliste).
  await page.clock.runFor(2_000);
  await expect(page.getByTestId('live-others')).toHaveCount(0);

  await sendAs(relay, links.trainer, e2At31());
  await sendAs(relay, links.trainer, e3Ended());
  const others = page.getByTestId('live-others');
  await expect(page.getByTestId('live-other-E2')).toHaveText("E2 2:1 · 31'");
  await expect(page.getByTestId('live-other-E3')).toHaveText('E3 4:2 · Ende');
  // Das eigene Spiel steht nicht in der Zeile; laufende Spiele zuerst.
  await expect(others.locator('[data-testid^="live-other-"]')).toHaveCount(2);
  const header = await page.locator('.game__header').boundingBox();
  const line = await others.boundingBox();
  const teams = await page.getByTestId('team-home').boundingBox();
  expect(line?.y).toBeGreaterThanOrEqual((header?.y ?? 0) + (header?.height ?? 0) - 1);
  expect((line?.y ?? 0) + (line?.height ?? 0)).toBeLessThanOrEqual(teams?.y ?? 0);

  await others.click();
  await expect(page.getByTestId('dashboard')).toBeVisible();
  await expect(page.getByTestId('dash-score-E2')).toHaveText('2:1');
  await page.getByTestId('nav-game').click();
  await expect(page.getByTestId('live-other-E2')).toBeVisible();
});

test('006 US4-S3 FR-033 neues Tor bei E2: Zeile hebt sich hervor, ohne Ton; passt aufs iPhone SE', async ({
  page,
  recorded,
  relay,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const links = await aPlaysE1(page, recorded, relay);
  await sendAs(relay, links.trainer, e2At31());
  await sendAs(relay, links.trainer, e3Ended());
  const others = page.getByTestId('live-others');
  await expect(page.getByTestId('live-other-E2')).toHaveText("E2 2:1 · 31'");
  // Erste Anzeige ohne Hervorhebung.
  await expect(others).toHaveAttribute('data-flash', 'false');
  const sounds = (await recorded()).sounds;

  await sendAs(relay, links.trainer, e2At31(true));
  await expect(page.getByTestId('live-other-E2')).toHaveText("E2 3:1 · 31'");
  await expect(others).toHaveAttribute('data-flash', 'true');
  await page.clock.runFor(6_000);
  await expect(others).toHaveAttribute('data-flash', 'false');
  expect((await recorded()).sounds).toBe(sounds);

  const scroll = await page.evaluate(() => {
    const el = document.scrollingElement as HTMLElement;
    return { sh: el.scrollHeight, ih: window.innerHeight, sw: el.scrollWidth, iw: window.innerWidth };
  });
  expect(scroll.sh).toBeLessThanOrEqual(scroll.ih);
  expect(scroll.sw).toBeLessThanOrEqual(scroll.iw);
  const line = await others.boundingBox();
  expect((line?.x ?? 0) + (line?.width ?? 0)).toBeLessThanOrEqual(375);
  await expect(page.getByTestId('btn-goal-own')).toBeInViewport();
  await expect(page.getByTestId('btn-goal-opp')).toBeInViewport();
});
