import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { addTeam, chipLabel, seedRoster } from './helpers';
import { addGame, openPlan, setupPlan } from './plan-helpers';

/**
 * Spec 015 US5: Kader "E1/E2" und "E3". Jedes Kind gehört zu genau einem Kader, jede Mannschaft spielt mit einem
 * Kader; Aushilfen stehen im Aufgebot unter "Weitere Kinder". Fiktive Namen.
 */

const ROSTER = '7 Max\n9 Ben\n10 Tom\n11 Leo\n14 Maxi\n4 Paul';

const list = (page: Page) => page.getByTestId('roster-list');
const squadTab = (page: Page, name: RegExp) => page.getByTestId('roster-squads').getByRole('button', { name });

/** Kader "Kader" (später "E1/E2") mit Max, Ben, Tom, Leo, Maxi und "E3" mit Paul. */
async function twoSquads(page: Page): Promise<void> {
  await seedRoster(page, ROSTER);
  await page.getByTestId('btn-add-squad').click();
  await page.getByTestId('input-squad-name').fill('E3');
  await page.getByTestId('btn-save-squad').click();
  await squadTab(page, /^Kader/).click();
  await list(page).getByRole('button', { name: 'Paul ändern' }).click();
  await page.getByTestId('input-player-squad').selectOption({ label: 'E3' });
  await page.getByTestId('btn-save-player').click();
}

async function teamSquad(page: Page, index: number, squad: string): Promise<void> {
  await page.goto('./#/einstellungen');
  await page.getByTestId(`team-row-${index}`).click();
  await page.getByTestId('input-team-squad').selectOption({ label: squad });
  await page.getByTestId('btn-save-team').click();
  await expect(page.getByTestId('team-sheet')).toBeHidden();
}

test('015 US5-S1 zweiten Kader hinzufügen, Kind verschieben, ersten umbenennen', async ({ page }) => {
  await seedRoster(page, ROSTER);
  // Mit einem Kader gibt es keinen Umschalter
  await expect(page.getByTestId('roster-squads')).toHaveCount(0);
  await page.getByTestId('btn-add-squad').click();
  await expect(page.getByTestId('squad-form')).toContainText('Der bisherige Kader heißt „Kader“');
  await page.getByTestId('input-squad-name').fill('kader');
  await expect(page.getByTestId('squad-form')).toContainText('Diesen Kader gibt es schon.');
  await expect(page.getByTestId('btn-save-squad')).toBeDisabled();
  await page.getByTestId('input-squad-name').fill('E3');
  await page.getByTestId('btn-save-squad').click();

  // Der neue Kader ist leer und angezeigt
  await expect(page.getByTestId('roster-squads').getByRole('button')).toHaveText(['Kader · 6', 'E3 · 0']);
  await expect(squadTab(page, /^E3/)).toHaveAttribute('aria-pressed', 'true');
  await expect(list(page)).toContainText('Noch keine Spieler in „E3“');

  await squadTab(page, /^Kader/).click();
  await list(page).getByRole('button', { name: 'Paul ändern' }).click();
  await page.getByTestId('input-player-squad').selectOption({ label: 'E3' });
  await page.getByTestId('btn-save-player').click();
  await expect(page.getByTestId('roster-squads').getByRole('button')).toHaveText(['Kader · 5', 'E3 · 1']);
  await expect(list(page)).not.toContainText('Paul');
  await squadTab(page, /^E3/).click();
  await expect(list(page).locator('.roster-row__name')).toHaveText(['Paul']);

  // "Kader" umbenennen in "E1/E2"
  await squadTab(page, /^Kader/).click();
  await page.getByTestId('btn-rename-squad').click();
  await page.getByTestId('input-squad-name').fill('E1/E2');
  await page.getByTestId('btn-save-squad').click();
  await expect(page.getByTestId('roster-squads').getByRole('button')).toHaveText(['E1/E2 · 5', 'E3 · 1']);

  // Löschen nur leer
  await expect(page.getByTestId('btn-delete-squad')).toBeDisabled();
  await page.getByTestId('btn-add-squad').click();
  await page.getByTestId('input-squad-name').fill('Mini');
  await page.getByTestId('btn-save-squad').click();
  await page.getByTestId('btn-delete-squad').click();
  await expect(page.getByTestId('confirm-dialog')).toContainText('Kader „Mini“ löschen?');
  await page.getByTestId('confirm-yes').click();
  await expect(page.getByTestId('roster-squads').getByRole('button')).toHaveText(['E1/E2 · 5', 'E3 · 1']);

  // Gespeichert: nach dem Neuladen gleich
  await page.reload();
  await expect(page.getByTestId('roster-squads').getByRole('button')).toHaveText(['E1/E2 · 5', 'E3 · 1']);
});

test('015 US5-S2 Mannschaft wählt ihren Kader; mehrere Mannschaften teilen sich einen', async ({ page }) => {
  for (const name of ['Sportvg Feuerbach E1', 'Sportvg Feuerbach E2', 'Sportvg Feuerbach E3']) {
    await addTeam(page, name);
  }
  // Mit einem Kader keine Auswahl
  await page.getByTestId('team-row-0').click();
  await expect(page.getByTestId('input-team-squad')).toHaveCount(0);
  await page.getByTestId('team-sheet').getByRole('button', { name: 'Schließen' }).click();

  await twoSquads(page);
  await teamSquad(page, 2, 'E3');
  await page.getByTestId('team-row-0').click();
  // Vorgabe: der erste Kader
  await expect(page.getByTestId('input-team-squad').locator('option:checked')).toHaveText('Kader');
  await expect(page.getByTestId('team-sheet')).toContainText('Kinder aus anderen Kadern stehen unter „Weitere Kinder“');
  await page.getByTestId('team-sheet').getByRole('button', { name: 'Schließen' }).click();

  await page.goto('./#/kader');
  await expect(page.getByTestId('roster-squad-teams')).toHaveText(
    'Spielt mit diesem Kader: Feuerbach E1, Feuerbach E2',
  );
  await squadTab(page, /^E3/).click();
  await expect(page.getByTestId('roster-squad-teams')).toHaveText('Spielt mit diesem Kader: Feuerbach E3');
});

test('015 US5-S3 mit nur einem Kader sehen "Neues Spiel" und "Kader" aus wie bisher', async ({ page, recorded }) => {
  await seedRoster(page, ROSTER);
  await expect(page.getByTestId('roster-squads')).toHaveCount(0);
  await expect(page.getByTestId('btn-rename-squad')).toHaveCount(0);
  await expect(page.getByTestId('roster-squad-teams')).toHaveCount(0);
  await page.getByTestId('btn-share-roster').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(1);
  expect((await recorded()).shares[0]?.text).toBe('9 Ben\n11 Leo\n7 Max\n14 Maxi\n4 Paul\n10 Tom');

  await page.goto('./#/neu');
  await expect(page.getByTestId('squad-count')).toHaveText('AUFGEBOT · 0 VON 6');
  await expect(page.getByTestId('squad-picker').getByRole('button')).toHaveCount(6);
  await expect(page.getByTestId('squad-more-toggle')).toHaveCount(0);
  await expect(page.getByTestId('card-squad')).toContainText(
    'Ohne Auswahl steht in der Torschützen-Auswahl der ganze Kader.',
  );
});

test('015 US5-S4 Aufgebot zeigt den Kader der Mannschaft, Aushilfen unter "Weitere Kinder"', async ({ page }) => {
  await addTeam(page, 'Sportvg Feuerbach E2');
  await addTeam(page, 'Sportvg Feuerbach E3');
  await twoSquads(page);
  await teamSquad(page, 1, 'E3');

  await page.goto('./#/neu');
  await page
    .getByTestId('team-chips')
    .getByRole('button', { name: chipLabel('Sportvg Feuerbach E2'), exact: true })
    .click();
  const picker = page.getByTestId('squad-picker');
  await expect(picker.getByRole('button')).toHaveText(['9 Ben', '11 Leo', '7 Max', '14 Maxi', '10 Tom']);
  await expect(page.getByTestId('squad-count')).toHaveText('AUFGEBOT · 0 VON 5');
  await expect(page.getByTestId('card-squad')).toContainText(
    'Ohne Auswahl steht in der Torschützen-Auswahl der Kader „Kader“.',
  );
  const toggle = page.getByTestId('squad-more-toggle');
  await expect(toggle).toHaveText('Weitere Kinder · 1');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByTestId('squad-more')).toHaveCount(0);
  await toggle.click();
  await page.getByTestId('squad-more').getByRole('button', { name: '4 Paul', exact: true }).click();
  await picker.getByRole('button', { name: '9 Ben', exact: true }).click();
  await expect(page.getByTestId('squad-count')).toHaveText('AUFGEBOT · 1 VON 5 · 1 AUSHILFE');
  await page.getByTestId('input-opponent').fill('TSV Musterstadt');
  await page.getByTestId('btn-create').click();
  await page.getByTestId('btn-kickoff').click();
  await page.getByTestId('btn-goal-own').click();
  const options = page.getByTestId('scorer-picker').locator('[data-testid^="scorer-option-"]');
  await expect(options).toHaveText(['9 Ben', '4 Paul']);
  await page.getByTestId('scorer-picker').getByRole('button', { name: '4 Paul', exact: true }).click();
  await expect(page.getByTestId('goal-list')).toContainText('Paul');

  // Die E3 spielt mit "E3"; ohne Auswahl ist ihr Kader das Aufgebot
  await page.goto('./#/neu');
  await page
    .getByTestId('team-chips')
    .getByRole('button', { name: chipLabel('Sportvg Feuerbach E3'), exact: true })
    .click();
  await expect(picker.getByRole('button')).toHaveText(['4 Paul']);
  await expect(page.getByTestId('squad-more-toggle')).toHaveText('Weitere Kinder · 5');
  await page.getByTestId('input-opponent').fill('SV Beispielhausen');
  await page.getByTestId('btn-create').click();
  await page.getByTestId('btn-kickoff').click();
  await page.getByTestId('btn-goal-own').click();
  await expect(options).toHaveText(['4 Paul']);
});

test.describe('015 zwei Handys', () => {
  // Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
  test.use({ serviceWorkers: 'block' });

  test('015 US5-S5 Kader "E3" teilen und auf einem anderen Handy einfügen', async ({ page, recorded, newDevice }) => {
    await twoSquads(page);
    await squadTab(page, /^E3/).click();
    await page.getByTestId('btn-share-roster').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(1);
    const text = (await recorded()).shares[0]?.text ?? '';
    expect(text).toBe('Kader E3:\n4 Paul');

    // Handy B kennt Paul schon (ein Kader) und noch keinen Kader "E3"
    const b = await newDevice();
    await seedRoster(b, '4 Paul\n7 Max');
    await b.getByTestId('btn-paste-list').click();
    await b.getByTestId('paste-input').fill(text);
    await expect(b.getByTestId('paste-target')).toHaveText('Ziel: Kader „E3“ (wird angelegt)');
    await expect(b.getByTestId('paste-preview')).toContainText('aus „Kader“');
    await b.getByTestId('paste-apply').click();
    await expect(b.getByTestId('roster-squads').getByRole('button')).toHaveText(['Kader · 1', 'E3 · 1']);
    await expect(b.getByTestId('roster-squads').getByRole('button', { name: /^E3/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(list(b).locator('.roster-row__name')).toHaveText(['Paul']);

    // Noch einmal einfügen: derselbe Kader, keine Duplikate
    await b
      .getByTestId('roster-squads')
      .getByRole('button', { name: /^Kader/ })
      .click();
    await b.getByTestId('btn-paste-list').click();
    await b.getByTestId('paste-input').fill(text);
    await expect(b.getByTestId('paste-target')).toHaveText('Ziel: Kader „E3“');
    await b.getByTestId('paste-apply').click();
    await expect(b.getByTestId('roster-squads').getByRole('button')).toHaveText(['Kader · 1', 'E3 · 1']);
  });

  test('015 FR-P24 Kader, Zuordnung und Spielplan kommen mit der Sicherung auf ein neues Handy', async ({
    page,
    recorded,
    relay,
    newDevice,
  }) => {
    await setupPlan(page, recorded, relay);
    await openPlan(page);
    await addGame(page, { team: 'E1', date: '2026-11-14', time: '12:00', opponent: 'TSV Musterstadt' });
    await twoSquads(page);
    await page.goto('./#/einstellungen');
    const before = (await recorded()).shares.length;
    await page.getByTestId('btn-export').click();
    await expect.poll(async () => (await recorded()).shares.length).toBe(before + 1);
    const file = (await recorded()).shares.at(-1)?.fileText ?? '';
    const backup = JSON.parse(file) as { squads: { name: string }[]; plan: { p: { e: { o?: string }[] } } };
    expect(backup.squads.map((q) => q.name)).toEqual(['Kader', 'E3']);
    expect(backup.plan.p.e.map((e) => e.o)).toEqual(['TSV Musterstadt']);

    const d = await newDevice();
    await d.goto('./#/einstellungen');
    await d
      .getByTestId('input-import')
      .setInputFiles({ name: 'sicherung.json', mimeType: 'application/json', buffer: Buffer.from(file) });
    await d.getByTestId('confirm-yes').click();
    await expect(d.getByTestId('import-result')).toContainText('Kader übernommen.');
    await expect(d.getByTestId('import-result')).toContainText('Spielplan übernommen.');
    await d.goto('./#/kader');
    await expect(d.getByTestId('roster-squads').getByRole('button')).toHaveText(['Kader · 5', 'E3 · 1']);
  });
});
