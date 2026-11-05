import { expect, test } from './fixtures';
import { createLive, e1At37, liveSnap, MATCHDAY, onMatchday, openViewer, sendAs } from './live-helpers';

/** Spec 012 US5: Das Dashboard zeigt jede Mannschaft, auch ohne Spiel. */

test.use({ serviceWorkers: 'block' });

test('012 US5-S1 US5-S2 E1 spielt, E2 steht als Zeile, bis E2 ein Spiel anlegt', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  await sendAs(relay, links.trainer, e1At37());
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-card-E1')).toBeVisible({ timeout: 5_000 });
  const row = v.getByTestId('dash-waiting-E2');
  await expect(row).toHaveText('Feuerbach E2 · heute noch kein Spiel');
  await expect(v.getByTestId('dash-card-E2')).toHaveCount(0);

  await sendAs(relay, links.trainer, liveSnap({ team: 'E2', now: MATCHDAY, gameId: 'spiel-E2', createdAgo: 1 }));
  await expect(v.getByTestId('dash-card-E2')).toBeVisible({ timeout: 10_000 });
  await expect(v.getByTestId('dash-phase-E2')).toHaveText('noch nicht angepfiffen');
  await expect(row).toHaveCount(0);
});

test('012 US5-S3 ohne Spiel bleibt es beim Leerzustand ohne Zeilen', async ({ page, recorded, relay, newDevice }) => {
  const links = await createLive(page, recorded, { teams: ['E1', 'E2'] });
  onMatchday(relay);
  const v = await openViewer(newDevice, relay, links);
  await expect(v.getByTestId('dash-empty')).toContainText('Heute noch kein Spiel live');
  await expect(v.locator('[data-testid^="dash-waiting-"]')).toHaveCount(0);
});
