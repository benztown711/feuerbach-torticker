import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { createLive, liveSnap, MATCHDAY, onMatchday, openViewer, sendAs, type LiveLinks } from './live-helpers';
import type { FakeRelay } from './relay';

/**
 * Spec 007 US3: "Letzte Spiele" ganz unten auf dem Dashboard, zugeklappt; Filter Alle/E1/E2/E3, je Mannschaft bis zu
 * 10 frühere Spiele, neuestes zuerst. Heute ist Sa 07.11.2026 (MATCHDAY).
 */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const DAY = 24 * 60 * 60_000;

/** Legt einen beendeten Stand ab, als käme er `daysAgo` Tage vor MATCHDAY vom Trainer-Handy (Serverzeit damals). */
async function playedAgo(
  relay: FakeRelay,
  links: LiveLinks,
  team: string,
  daysAgo: number,
  o: { gameId?: string; own?: number; opp?: number; away?: boolean; opponent?: string } = {},
): Promise<void> {
  const now = MATCHDAY - daysAgo * DAY;
  relay.offsetMs = now - Date.now();
  await sendAs(
    relay,
    links.trainer,
    liveSnap({
      team,
      now,
      gameId: o.gameId ?? `${team}-${daysAgo}`,
      opp: o.opponent ?? 'TSV Musterstadt',
      away: o.away,
      clock: [
        ['kickoff', 70, 1],
        ['sectionEnd', 45, 1],
        ['kickoff', 40, 2],
        ['fullTime', 15, 2],
      ],
      goals: [
        ...Array.from({ length: o.own ?? 1 }, () => ({ side: 'own' as const, minute: 5 })),
        ...Array.from({ length: o.opp ?? 0 }, () => ({ side: 'opp' as const, minute: 8 })),
      ],
    }),
  );
  onMatchday(relay);
}

const recent = (v: Page) => v.getByTestId('dash-recent');
const rows = (v: Page) => recent(v).getByTestId('dash-recent-row');
const toggle = (v: Page) => recent(v).getByRole('button', { name: 'LETZTE SPIELE' });
const filter = (v: Page, name: string) => recent(v).getByRole('group').getByRole('button', { name, exact: true });

test('007 US3-S1 zugeklappt; aufgeklappt Filter "Alle" mit allen Mannschaften, "E1" die 10 jüngsten ohne Kürzel', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  for (let w = 1; w <= 12; w++) await playedAgo(relay, links, 'E1', 7 * w, { own: w % 3, opp: 1, away: w % 2 === 0 });
  await playedAgo(relay, links, 'E2', 3, { own: 2, opp: 2, opponent: 'SV Beispielhausen' });
  // E1 spielt heute: die Karte zeigt das heutige Spiel.
  await sendAs(relay, links.trainer, liveSnap({ team: 'E1', now: MATCHDAY, clock: [['kickoff', 5, 1]] }));
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-phase-E1')).toHaveText("6'");

  await expect(toggle(v)).toHaveAttribute('aria-expanded', 'false');
  await expect(rows(v)).toHaveCount(0);
  await toggle(v).click();
  await expect(toggle(v)).toHaveAttribute('aria-expanded', 'true');
  await expect(recent(v).getByRole('group').getByRole('button')).toHaveText(['Alle', 'E1', 'E2', 'E3']);
  await expect(filter(v, 'Alle')).toHaveAttribute('aria-pressed', 'true');
  await expect(rows(v)).toHaveCount(11);
  await expect(rows(v).first()).toHaveText(/^04\.11\.\s*E2\s*2:2\s*gegen SV Beispielhausen$/);
  await expect(rows(v).nth(1)).toHaveText(/^31\.10\.\s*E1\s*1:1\s*gegen TSV Musterstadt$/);

  await filter(v, 'E1').click();
  await expect(rows(v)).toHaveCount(10);
  await expect(rows(v).first()).toHaveText(/^31\.10\.\s*1:1\s*gegen TSV Musterstadt$/);
  await expect(rows(v).nth(1)).toHaveText(/^24\.10\.\s*2:1\s*bei TSV Musterstadt$/);
  await expect(rows(v).last()).toHaveText(/^29\.08\./);
  await expect(recent(v)).toContainText('Bis zu 10 Spiele je Mannschaft, neuestes zuerst.');
});

test('007 US3-S2 Filter "E2": nur E2, Karten unverändert; beim nächsten Aufklappen wieder "E2"', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  await playedAgo(relay, links, 'E1', 7);
  await playedAgo(relay, links, 'E1', 14);
  await playedAgo(relay, links, 'E2', 7, { opponent: 'SV Beispielhausen' });
  await playedAgo(relay, links, 'E2', 14, { opponent: 'FC Probestadt' });
  const v = await openViewer(newDevice, relay, links);
  for (const team of ['E1', 'E2']) await expect(v.getByTestId(`dash-phase-${team}`)).toHaveText('Ende · 31.10.');
  const cards = await v.locator('[data-testid^="dash-card-"]').allInnerTexts();
  await toggle(v).click();
  await filter(v, 'E2').click();
  await expect(filter(v, 'E2')).toHaveAttribute('aria-pressed', 'true');
  await expect(rows(v)).toHaveText([/31\.10\..*gegen SV Beispielhausen/, /24\.10\..*gegen FC Probestadt/]);
  expect(await v.locator('[data-testid^="dash-card-"]').allInnerTexts()).toEqual(cards);

  await toggle(v).click();
  await expect(rows(v)).toHaveCount(0);
  await toggle(v).click();
  await expect(filter(v, 'E2')).toHaveAttribute('aria-pressed', 'true');
  // Beim nächsten Öffnen des Dashboards: wieder zugeklappt, Filter gemerkt.
  await v.reload();
  await expect(toggle(v)).toHaveAttribute('aria-expanded', 'false');
  await toggle(v).click();
  await expect(filter(v, 'E2')).toHaveAttribute('aria-pressed', 'true');
});

test('007 US3-S3 das heutige Spiel der Karte steht nicht noch einmal unter "Letzte Spiele"', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E3'] });
  await playedAgo(relay, links, 'E3', 7, { opponent: 'SG Beispieltal' });
  await playedAgo(relay, links, 'E3', 0, { gameId: 'heute', opponent: 'FC Heute', own: 4, opp: 2 });
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-score-E3')).toHaveText('4:2');
  await toggle(v).click();
  await expect(rows(v)).toHaveText([/31\.10\..*gegen SG Beispieltal/]);
  await expect(recent(v)).not.toContainText('FC Heute');
});

test('007 US3-S4 gelöschtes oder auf "Nicht live senden" gestelltes Spiel verschwindet auch aus "Letzte Spiele"', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1'] });
  await playedAgo(relay, links, 'E1', 3);
  await playedAgo(relay, links, 'E1', 10, { gameId: 'weg', opponent: 'FC Gelöscht' });
  await playedAgo(relay, links, 'E1', 17, { gameId: 'aus', opponent: 'SV Nichtlive' });
  const v = await openViewer(newDevice, relay, links);
  await toggle(v).click();
  await expect(rows(v)).toHaveText([/04\.11\..*TSV Musterstadt/, /FC Gelöscht/, /SV Nichtlive/]);
  const gone = (gameId: string, state: 'deleted' | 'off') =>
    sendAs(relay, links.trainer, { v: 1, kind: 'game', state, gameId, team: 'E1', sentAt: MATCHDAY, h: 0 });
  await gone('weg', 'deleted');
  await expect(rows(v)).toHaveText([/04\.11\..*TSV Musterstadt/, /SV Nichtlive/]);
  await gone('aus', 'off');
  await expect(rows(v)).toHaveText([/04\.11\..*TSV Musterstadt/]);
});

test('007 US3-S5 ohne frühere Spiele kein Block; Mannschaft ohne frühere Spiele: "Noch keine früheren Spiele"', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  await sendAs(relay, links.trainer, liveSnap({ team: 'E1', now: MATCHDAY, clock: [['kickoff', 5, 1]] }));
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-card-E1')).toBeVisible();
  await expect(recent(v)).toHaveCount(0);

  await playedAgo(relay, links, 'E1', 7);
  await expect(recent(v)).toBeVisible();
  await toggle(v).click();
  await expect(rows(v)).toHaveCount(1);
  await filter(v, 'E2').click();
  await expect(rows(v)).toHaveCount(0);
  await expect(recent(v).getByTestId('dash-recent-empty')).toHaveText('Noch keine früheren Spiele');
});

test('007 US3 006 FR-L18 mit "Letzte Spiele" bei 320 pt Breite ohne waagrechtes Scrollen', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2', 'E3'] });
  for (const team of ['E1', 'E2', 'E3'])
    await playedAgo(relay, links, team, 7, { opponent: 'SGM SV Prag Stuttgart/TSV Weilimdorf' });
  const v = await openViewer(newDevice, relay, links);
  await v.setViewportSize({ width: 320, height: 640 });
  await toggle(v).click();
  await expect(rows(v)).toHaveCount(3);
  const scroll = await v.evaluate(() => {
    const el = document.scrollingElement as HTMLElement;
    return { sw: el.scrollWidth, iw: window.innerWidth };
  });
  expect(scroll.sw).toBeLessThanOrEqual(scroll.iw);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`007 US3 "Letzte Spiele" ${scheme === 'light' ? 'hell' : 'dunkel'} zu, auf und gefiltert ohne axe-Verstöße`, async ({
    page,
    recorded,
    relay,
    newDevice,
  }) => {
    const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
    await playedAgo(relay, links, 'E1', 7, { own: 3, opp: 1 });
    await playedAgo(relay, links, 'E2', 3, { own: 0, opp: 2, away: true });
    const v = await openViewer(newDevice, relay, links, scheme);
    await expect(toggle(v)).toHaveAttribute('aria-expanded', 'false');
    expect((await new AxeBuilder({ page: v }).analyze()).violations).toEqual([]);
    await toggle(v).click();
    await expect(rows(v)).toHaveCount(2);
    expect((await new AxeBuilder({ page: v }).analyze()).violations).toEqual([]);
    await filter(v, 'E2').click();
    await expect(rows(v)).toHaveCount(1);
    expect((await new AxeBuilder({ page: v }).analyze()).violations).toEqual([]);
  });
}
