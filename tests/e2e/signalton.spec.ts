import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { MIN, SEC, forward, startGame } from './helpers';

async function chooseSound(page: Page, id: string): Promise<void> {
  await page.goto('./#/einstellungen');
  await page.getByTestId(`signal-sound-${id}`).click();
  await expect(page.getByTestId(`signal-sound-${id}`)).toHaveAttribute('aria-checked', 'true');
}

test.describe('Spec 008 Signalton wählen', () => {
  test('008 US1-S1 FR-K02 FR-K03 Einstellungen zeigen Pfiff, Glocke und Gong, Pfiff ist vorgewählt', async ({
    page,
  }) => {
    await page.goto('./#/einstellungen');
    const options = page.getByTestId('signal-sounds').getByRole('radio');
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toContainText('Pfiff');
    await expect(options.nth(1)).toContainText('Glocke');
    await expect(options.nth(2)).toContainText('Gong');
    await expect(page.getByRole('radio', { name: 'Pfiff', exact: true })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('signal-sound-glocke')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('signal-sound-gong')).toHaveAttribute('aria-checked', 'false');
  });

  test('008 US1-S2 FR-K02 Antippen spielt den Ton sofort und speichert die Wahl', async ({ page, recorded }) => {
    await chooseSound(page, 'glocke');
    expect(await recorded()).toMatchObject({ sounds: 1, lastSound: 'glocke' });
    await expect(page.getByTestId('signal-sound-pfiff')).toHaveAttribute('aria-checked', 'false');
    await page.reload();
    await expect(page.getByTestId('signal-sound-glocke')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('signal-sound-pfiff')).toHaveAttribute('aria-checked', 'false');
  });

  test('008 US1-S3 FR-K05 "Ton testen" spielt den gewählten Ton, der Hinweis nennt ihn', async ({ page, recorded }) => {
    await chooseSound(page, 'glocke');
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    await expect(page.getByTestId('signal-test-hint')).toContainText('Signalton: Glocke');
    await expect(page.getByTestId('signal-test-hint')).toContainText('Einstellungen');
    await page.getByTestId('btn-test-signal').click();
    expect(await recorded()).toMatchObject({ sounds: 1, lastSound: 'glocke' });
  });

  test('008 US1-S4 FR-K04 bei 00:00 und jeder vollen Nachspielminute ertönt der gewählte Ton', async ({
    page,
    recorded,
  }) => {
    await chooseSound(page, 'gong');
    await startGame(page);
    await forward(page, 25 * MIN + 2 * SEC);
    await expect(page.getByTestId('signal-flash')).toBeVisible();
    const atZero = await recorded();
    expect(atZero).toMatchObject({ lastSound: 'gong' });
    expect(atZero.sounds).toBeGreaterThan(0);
    await forward(page, 1 * MIN);
    const later = await recorded();
    expect(later.sounds).toBeGreaterThan(atZero.sounds);
    expect(later.lastSound).toBe('gong');
  });
});
