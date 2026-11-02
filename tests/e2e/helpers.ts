import type { Page } from '@playwright/test';
import { expect } from './fixtures';

export const MIN = 60_000;
export const SEC = 1_000;

export interface NewGameOptions {
  ownTeam?: string;
  opponent?: string;
  away?: boolean;
  sections?: number;
  minutes?: number;
  ownColor?: string;
  oppColor?: string;
}

/** Legt über die Oberfläche ein Spiel an und landet auf dem Spielbildschirm (Zustand created). */
export async function newGame(page: Page, o: NewGameOptions = {}): Promise<void> {
  await page.goto('./');
  await page.getByTestId('btn-new-game').click();
  if (o.ownTeam !== undefined) await page.getByTestId('input-own-team').fill(o.ownTeam);
  await page.getByTestId('input-opponent').fill(o.opponent ?? 'TSV Musterstadt');
  if (o.away) await page.getByTestId('btn-swap-venue').click();
  if (o.sections !== undefined) await page.getByTestId('schema-sections').selectOption(String(o.sections));
  if (o.minutes !== undefined) await page.getByTestId('schema-minutes').selectOption(String(o.minutes));
  if (o.ownColor) await page.getByTestId(`color-own-${o.ownColor}`).click();
  if (o.oppColor) await page.getByTestId(`color-opp-${o.oppColor}`).click();
  await page.getByTestId('btn-create').click();
  await expect(page.getByTestId('btn-kickoff')).toBeVisible();
}

export async function startGame(page: Page, o: NewGameOptions = {}): Promise<void> {
  await newGame(page, o);
  await page.getByTestId('btn-kickoff').click();
  await expect(page.getByTestId('btn-pause')).toBeVisible();
}

export async function confirmYes(page: Page): Promise<void> {
  await expect(page.getByTestId('confirm-dialog')).toBeVisible();
  await page.getByTestId('confirm-yes').click();
  await expect(page.getByTestId('confirm-dialog')).toBeHidden();
}

/** Spult die (Fake-)Uhr vor; Timer laufen dabei an. */
export async function forward(page: Page, ms: number): Promise<void> {
  await page.clock.fastForward(ms);
  // Ein weiterer kurzer Schritt, damit der 250-ms-Takt den neuen Stand rendert.
  await page.clock.runFor(300);
}
