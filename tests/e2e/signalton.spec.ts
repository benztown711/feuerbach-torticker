import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { MIN, SEC, forward, startGame } from './helpers';

/** Spec 025 FR-T03: Ereignis-Zeile in den Einstellungen öffnen und einen Ton wählen. */
async function choose(page: Page, event: string, id: string): Promise<void> {
  await page.goto('./#/einstellungen');
  await page.getByTestId(`sound-event-${event}`).click();
  await page.getByTestId(`sound-option-${id}`).click();
  await expect(page.getByTestId(`sound-option-${id}`)).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('sound-sheet').getByRole('button', { name: 'Schließen' }).click();
}

test.describe('Spec 025 Töne je Ereignis (ersetzt Spec 008 "Signalton")', () => {
  test('025 US1-S1 FR-T03 FR-T04 Abschnitt "TÖNE" mit sechs Zeilen und der Vorbelegung', async ({ page }) => {
    await page.goto('./#/einstellungen');
    const section = page.getByTestId('sounds');
    await expect(section.getByRole('heading')).toHaveText('TÖNE');
    const rows = section.getByRole('button');
    await expect(rows).toHaveCount(6);
    const expected = [
      ['timeUp', 'Spielzeitende', 'Pfiff'],
      ['kickoff', 'Anpfiff', 'Langer Pfiff'],
      ['halftime', 'Pausenpfiff', 'Doppelpfiff'],
      ['fulltime', 'Schlusspfiff', 'Pfiff'],
      ['goalOwn', 'Tor für uns', 'Torhupe'],
      ['goalOpp', 'Gegentor', 'Raunen'],
    ];
    for (const [i, [id, name, value]] of expected.entries()) {
      await expect(rows.nth(i)).toHaveAttribute('data-testid', `sound-event-${id}`);
      await expect(rows.nth(i)).toContainText(name!);
      await expect(page.getByTestId(`sound-event-${id}-value`)).toHaveText(value!);
    }
    await expect(page.getByTestId('signal-sounds')).toHaveCount(0);
  });

  test('025 US1-S2 vor dem Update gewählter Signalton "Gong" gilt als Spielzeitende', async ({ page }) => {
    await page.goto('./');
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const req = indexedDB.open('torticker');
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('settings', 'readwrite');
            const store = tx.objectStore('settings');
            const get = store.get('app');
            get.onsuccess = () => {
              const s = { ...(get.result ?? {}), signalSound: 'gong' };
              delete (s as { sounds?: unknown }).sounds;
              store.put(s, 'app');
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
          req.onerror = () => reject(req.error);
        }),
    );
    await page.goto('./#/einstellungen');
    await page.reload();
    await expect(page.getByTestId('sound-event-timeUp-value')).toHaveText('Gong');
    await expect(page.getByTestId('sound-event-kickoff-value')).toHaveText('Langer Pfiff');
  });

  test('025 US1-S3 FR-T03 Auswahl zeigt alle Töne und "Aus", Antippen wählt, speichert und spielt zur Probe', async ({
    page,
    recorded,
  }) => {
    await page.goto('./#/einstellungen');
    await page.getByTestId('sound-event-goalOwn').click();
    const sheet = page.getByTestId('sound-sheet');
    await expect(sheet.getByRole('heading')).toHaveText('Tor für uns');
    const options = sheet.getByRole('radio');
    await expect(options).toHaveCount(11);
    await expect(options.nth(0)).toContainText('Pfiff');
    await expect(options.nth(5)).toContainText('Torhupe');
    await expect(options.nth(10)).toContainText('Aus');
    await expect(page.getByTestId('sound-option-torhupe')).toHaveAttribute('aria-checked', 'true');

    await page.getByTestId('sound-option-jubel').click();
    await expect(page.getByTestId('sound-option-jubel')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('sound-option-torhupe')).toHaveAttribute('aria-checked', 'false');
    expect(await recorded()).toMatchObject({ sounds: 1, lastSound: 'jubel' });

    await page.reload();
    await expect(page.getByTestId('sound-event-goalOwn-value')).toHaveText('Jubel');
  });

  test('025 US1-S4 "Aus" für Gegentor: Zeile zeigt "Aus", kein Probe-Ton', async ({ page, recorded }) => {
    await choose(page, 'goalOpp', 'aus');
    await expect(page.getByTestId('sound-event-goalOpp-value')).toHaveText('Aus');
    expect((await recorded()).sounds).toBe(0);
  });

  test('025 US1-S5 Spielzeitende bietet kein "Aus"', async ({ page }) => {
    await page.goto('./#/einstellungen');
    await page.getByTestId('sound-event-timeUp').click();
    await expect(page.getByTestId('sound-sheet').getByRole('radio')).toHaveCount(10);
    await expect(page.getByTestId('sound-option-aus')).toHaveCount(0);
  });

  test('008 US1-S3 025 FR-T08 "Ton testen" spielt den Ton für Spielzeitende, der Hinweis nennt ihn', async ({
    page,
    recorded,
  }) => {
    await choose(page, 'timeUp', 'glocke');
    await page.goto('./');
    await page.getByTestId('btn-new-game').click();
    const before = (await recorded()).sounds;
    await expect(page.getByTestId('signal-test-hint')).toContainText(
      'Spielzeitende: Glocke, änderbar unter „Mehr“ → „Einstellungen“ → „Töne“.',
    );
    await page.getByTestId('btn-test-signal').click();
    expect(await recorded()).toMatchObject({ sounds: before + 1, lastSound: 'glocke' });
  });

  test('008 US1-S4 025 FR-T04 bei 00:00 und jeder vollen Nachspielminute ertönt der Ton für Spielzeitende', async ({
    page,
    recorded,
  }) => {
    await choose(page, 'timeUp', 'gong');
    await startGame(page);
    await forward(page, 25 * MIN + 2 * SEC);
    await expect(page.getByTestId('signal-flash')).toBeVisible();
    const atZero = await recorded();
    expect(atZero).toMatchObject({ lastSound: 'gong' });
    await forward(page, 1 * MIN);
    const later = await recorded();
    expect(later.sounds).toBeGreaterThan(atZero.sounds);
    expect(later.lastSound).toBe('gong');
  });
});
