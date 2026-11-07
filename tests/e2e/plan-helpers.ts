import type { Page } from '@playwright/test';
import { expect } from './fixtures';
import { createLive, MATCHDAY, onMatchday, type LiveLinks } from './live-helpers';
import type { FakeRelay } from './relay';
import type { Recorded } from './fixtures';

/** Spec 015: Hilfen für den Spielplan. Uhr der Geräte: Sa 07.11.2026, 10:41 (MATCHDAY). */

export interface PlanGame {
  team?: string;
  date?: string;
  time?: string;
  opponent?: string;
  away?: boolean;
  competition?: string;
  schema?: string;
}

/** Lässt Sender und Empfänger arbeiten (Bündelung, Neuverbindung des Streams). */
export const sync = (page: Page) => page.clock.runFor(3_000);

export async function setupPlan(
  page: Page,
  recorded: () => Promise<Recorded>,
  relay: FakeRelay,
  teams = ['E1', 'E2'],
): Promise<LiveLinks> {
  await page.clock.setSystemTime(MATCHDAY);
  const links = await createLive(page, recorded, { teams });
  onMatchday(relay);
  return links;
}

export async function openPlan(page: Page): Promise<void> {
  await page.goto('./#/live-spieltag');
  await page.getByTestId('btn-plan').click();
  await expect(page.getByTestId('plan-screen')).toBeVisible();
}

export async function fillGame(page: Page, g: PlanGame): Promise<void> {
  if (g.team) await page.getByTestId(`plan-team-${g.team}`).click();
  if (g.date !== undefined) await page.getByTestId('plan-date').fill(g.date);
  if (g.time !== undefined) await page.getByTestId('plan-time').fill(g.time);
  if (g.opponent !== undefined) await page.getByTestId('plan-opponent').fill(g.opponent);
  if (g.away !== undefined) await page.getByTestId(g.away ? 'plan-venue-away' : 'plan-venue-home').click();
  if (g.competition !== undefined) await page.getByTestId('plan-competition').fill(g.competition);
  if (g.schema !== undefined) await page.getByTestId('plan-schema').selectOption(g.schema);
  await page.getByTestId('plan-save').click();
  await expect(page.getByTestId('plan-sheet')).toBeHidden();
}

export async function addGame(page: Page, g: PlanGame & { date: string }): Promise<void> {
  await page.getByTestId('plan-add').click();
  await fillGame(page, g);
}

export const rows = (page: Page) => page.locator('[data-testid^="plan-row-"]');
export const row = (page: Page, text: string) => rows(page).filter({ hasText: text });

/** Anzahl unversandter Planspiele auf dem Gerät (IndexedDB, Schlüssel "plan"). */
export const pendingCount = (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('torticker');
        open.onsuccess = () => {
          const req = open.result.transaction('settings').objectStore('settings').get('plan');
          req.onsuccess = () => {
            const plan = req.result as { pending?: string[] } | undefined;
            resolve(plan?.pending?.length ?? 0);
            open.result.close();
          };
        };
      }),
  );
