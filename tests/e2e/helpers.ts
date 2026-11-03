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

/** Kurzform wie auf den Mannschafts-Chips: "Sportvg Feuerbach U11" → "U11". */
export function chipLabel(name: string): string {
  const rest = name
    .trim()
    .replace(/^sportvg\s+/i, '')
    .replace(/^feuerbach(\s+|$)/i, '');
  return rest === '' ? 'Feuerbach' : rest;
}

/** Spec 004: Mannschaft über die Einstellungen anlegen (ohne Farbe: Heim Rot, Auswärts Schwarz). */
export async function addTeam(page: Page, name: string, colors: { home?: string; away?: string } = {}): Promise<void> {
  await page.goto('./#/einstellungen');
  await page.getByTestId('btn-add-team').click();
  await page.getByTestId('input-team-name').fill(name);
  for (const w of ['home', 'away'] as const) {
    const c = colors[w];
    if (c) {
      await page.getByTestId(`kit-${w}-change`).click();
      await page.getByTestId(`color-${w}-${c}`).click();
    }
  }
  await page.getByTestId('btn-save-team').click();
  await expect(page.getByTestId('team-sheet')).toBeHidden();
}

/** Legt die Mannschaft an, falls es sie noch nicht gibt. */
export async function ensureTeam(page: Page, name: string): Promise<void> {
  await page.goto('./#/einstellungen');
  const names = await page.locator('.team-row__name').allTextContents();
  if (!names.includes(name)) await addTeam(page, name);
}

/** Legt über die Oberfläche ein Spiel an und landet auf dem Spielbildschirm (Zustand created). */
export async function newGame(page: Page, o: NewGameOptions = {}): Promise<void> {
  if (o.ownTeam !== undefined) await ensureTeam(page, o.ownTeam);
  await page.goto('./');
  await page.getByTestId('btn-new-game').click();
  await expect(page.getByTestId('input-opponent')).toBeVisible();
  if (o.ownTeam !== undefined && (await page.getByTestId('team-chips').count()) > 0) {
    await page
      .getByTestId('team-chips')
      .getByRole('button', { name: chipLabel(o.ownTeam), exact: true })
      .click();
  }
  await page.getByTestId('input-opponent').fill(o.opponent ?? 'TSV Musterstadt');
  if (o.away) await page.getByTestId('btn-swap-venue').click();
  if (o.sections !== undefined) await page.getByTestId('schema-sections').selectOption(String(o.sections));
  if (o.minutes !== undefined) await page.getByTestId('schema-minutes').selectOption(String(o.minutes));
  if (o.ownColor) {
    await page.getByTestId('kit-own-change').click();
    await page.getByTestId(`color-own-${o.ownColor}`).click();
  }
  if (o.oppColor) {
    await page.getByTestId('kit-opp-change').click();
    await page.getByTestId(`color-opp-${o.oppColor}`).click();
  }
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

/** Füllt den Kader über "Liste einfügen" (US7); endet auf dem Kader-Bildschirm. */
export async function seedRoster(page: Page, list: string): Promise<void> {
  await page.goto('./#/kader');
  await page.getByTestId('btn-paste-list').click();
  await page.getByTestId('paste-input').fill(list);
  await page.getByTestId('paste-apply').click();
  await expect(page.getByTestId('paste-input')).toBeHidden();
}

/** 21 fiktive Kinder mit Nummern 1 bis 21. */
export const ROSTER_21 = [
  'Max',
  'Ben',
  'Tom',
  'Leo',
  'Paul',
  'Maxi',
  'Finn',
  'Noah',
  'Emil',
  'Luis',
  'Ole',
  'Felix',
  'Karl',
  'Mats',
  'Nico',
  'Tim',
  'Elias',
  'Anton',
  'Moritz',
  'Jonas',
  'Henri',
]
  .map((name, i) => `${i + 1} ${name}`)
  .join('\n');

/** Spielt ein beendetes Spiel 1 × 12 Minuten mit den angegebenen Toren (je eine Minute Abstand). */
export async function playFinishedGame(page: Page, goals: ('own' | 'opp')[], o: NewGameOptions = {}): Promise<void> {
  await startGame(page, { sections: 1, minutes: 12, ...o });
  for (const side of goals) {
    await forward(page, MIN);
    await page.getByTestId(side === 'own' ? 'btn-goal-own' : 'btn-goal-opp').click();
  }
  await page.getByTestId('btn-section-end').click();
  await confirmYes(page);
  await expect(page.getByTestId('section-label')).toHaveText('Schlusspfiff');
}
