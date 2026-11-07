import type { Page } from '@playwright/test';
import { expect } from './fixtures';
import { seedRoster } from './helpers';
import type { FakeRelay } from './relay';

/** Spec 016: Hilfen für das Trainer-Paket (geteilte Kader). Fiktive Namen. */

export const ROSTER = '7 Max\n9 Ben\n10 Tom\n11 Leo\n14 Maxi\n4 Paul';

export const squadTabs = (page: Page) => page.getByTestId('roster-squads').getByRole('button');
export const squadTab = (page: Page, name: RegExp) => page.getByTestId('roster-squads').getByRole('button', { name });

/** Kader "E1/E2" mit Max, Ben, Tom, Leo, Maxi und "E3" mit Paul; E3 spielt mit "E3". */
export async function twoSquads(page: Page, teamE3Row = 2): Promise<void> {
  await seedRoster(page, ROSTER);
  await page.getByTestId('btn-add-squad').click();
  await page.getByTestId('input-squad-name').fill('E3');
  await page.getByTestId('btn-save-squad').click();
  await squadTab(page, /^Kader/).click();
  await page.getByTestId('btn-rename-squad').click();
  await page.getByTestId('input-squad-name').fill('E1/E2');
  await page.getByTestId('btn-save-squad').click();
  await page.getByTestId('roster-list').getByRole('button', { name: 'Paul ändern' }).click();
  await page.getByTestId('input-player-squad').selectOption({ label: 'E3' });
  await page.getByTestId('btn-save-player').click();
  await expect(squadTabs(page)).toHaveText(['E1/E2 · 5', 'E3 · 1']);
  await teamSquad(page, teamE3Row, 'E3');
}

/** "Meine Mannschaften" → Mannschaft in Zeile `index` spielt mit `squad`. */
export async function teamSquad(page: Page, index: number, squad: string): Promise<void> {
  await page.goto('./#/einstellungen');
  await page.getByTestId(`team-row-${index}`).click();
  await page.getByTestId('input-team-squad').selectOption({ label: squad });
  await page.getByTestId('btn-save-team').click();
  await expect(page.getByTestId('team-sheet')).toBeHidden();
}

/** "Trainer-Link teilen" mit der Frage "Kader mit den Trainern teilen?"; `off` = abgewählte Kader. */
export async function shareTrainerWithSquads(page: Page, off: string[] = []): Promise<void> {
  await page.goto('./#/live-spieltag');
  await page.getByTestId('btn-share-trainer').click();
  const sheet = page.getByTestId('squad-share-sheet');
  await expect(sheet).toBeVisible();
  for (const name of off) await sheet.getByLabel(new RegExp(`^${name.replace('/', '\\/')}`)).uncheck();
  await page.getByTestId('squad-share-yes').click();
  await expect(sheet).toBeHidden();
}

/** Schreibanfragen einer Art beim Dienst (geparst). */
export const writes = (relay: FakeRelay, kind: string) =>
  relay.posts
    .map((t) => JSON.parse(t) as { kind: string; gone?: boolean; body: string })
    .filter((w) => w.kind === kind);

/** Zeit vergehen lassen (Senden, Empfangen über die Verbindung). */
export const settle = (page: Page) => page.clock.runFor(3_000);
