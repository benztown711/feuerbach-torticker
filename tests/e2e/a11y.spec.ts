import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
import { MIN, forward, newGame, playFinishedGame, seedRoster, startGame } from './helpers';
import { later, openTrainerSection, openViewer, sampleDashboard } from './live-helpers';

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`Barrierefreiheit (${scheme === 'light' ? 'hell' : 'dunkel'})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    test('014 SC-D04 Historie im Auswahlmodus und mit „Rückgängig“ ohne axe-Verstöße', async ({ page }) => {
      await playFinishedGame(page, ['own'], { opponent: 'TSV Weilimdorf' });
      await startGame(page, { opponent: 'TSG Stuttgart' });
      await page.getByTestId('nav-history').click();
      await page.getByTestId('history-select').click();
      await page.getByTestId('history-select-all').click();
      await expect(page.getByTestId('history-delete')).toHaveText('Löschen (1)');
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByTestId('history-delete').click();
      await page.getByTestId('confirm-yes').click();
      await expect(page.getByTestId('history-undo')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

    test('Neues Spiel ohne axe-Verstöße', async ({ page }) => {
      await page.goto('./');
      await page.getByTestId('btn-new-game').click();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });

    test('Spielbildschirm vor Anpfiff ohne axe-Verstöße', async ({ page }) => {
      await newGame(page);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });

    test('Spielbildschirm in der Nachspielzeit mit Toren ohne axe-Verstöße', async ({ page }) => {
      await startGame(page, { oppColor: 'weiss' });
      await page.getByTestId('btn-goal-own').click();
      await forward(page, 26 * MIN);
      await page.getByTestId('btn-goal-opp').click();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });

    test('US5 US7 Kader und Liste einfügen ohne axe-Verstöße', async ({ page }) => {
      await seedRoster(page, '1 Max\n2 Ben');
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByTestId('btn-paste-list').click();
      await page.getByTestId('paste-input').fill('7 Leo\n7 Paul Meier\nMax');
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

    test('US3 US5 Aufgebot und Torschützen-Auswahl ohne axe-Verstöße', async ({ page }) => {
      await seedRoster(page, '1 Max\n2 Ben\n3 Tom');
      await page.goto('./#/neu');
      await page.getByTestId('squad-picker').getByRole('button', { name: '1 Max', exact: true }).click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByTestId('input-opponent').fill('TSV Musterstadt');
      await page.getByTestId('btn-create').click();
      await page.getByTestId('btn-kickoff').click();
      await page.getByTestId('btn-goal-own').click();
      await expect(page.getByTestId('scorer-picker')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

    test('FR-037 FR-038 Historie, Spieldetails, Mehr, Einstellungen und Hilfe ohne axe-Verstöße', async ({ page }) => {
      await playFinishedGame(page, ['own', 'opp'], { ownTeam: 'Sportvg Feuerbach E1' });
      await playFinishedGame(page, ['opp'], { ownTeam: 'Sportvg Feuerbach E2' });
      await page.getByTestId('nav-history').click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByTestId('history-list').locator('[data-testid^="history-item-"]').first().click();
      await expect(page.getByTestId('details-timeline')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      for (const id of ['more-settings', 'more-help']) {
        await page.getByTestId('nav-more').click();
        await expect(page.getByTestId(id)).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        await page.getByTestId(id).click();
        // Einstellungen und Hilfe werden nachgeladen: erst prüfen, wenn die Seite steht.
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      }
    });

    test('010 Hilfe: Übersicht, Treffer mit Hervorhebung und Eintrag ohne axe-Verstöße', async ({ page }) => {
      await page.goto('./#/hilfe');
      await expect(page.getByTestId('help-topic-start')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByTestId('help-search').fill('tor löschen');
      await expect(page.getByTestId('help-count')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByTestId('help-search').fill('xyz');
      await expect(page.getByTestId('help-none')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.goto('./#/hilfe/sichern');
      await expect(page.getByTestId('help-entry')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  });
}

test.describe('006 US3 Dashboard ohne axe-Verstöße', () => {
  // Relay-Nachbau braucht blockierte Service Worker (fixtures.ts).
  test.use({ serviceWorkers: 'block' });
  for (const scheme of ['light', 'dark'] as const) {
    test(`Dashboard ${scheme === 'light' ? 'hell' : 'dunkel'}, zu- und aufgeklappt`, async ({
      page,
      recorded,
      relay,
      newDevice,
    }) => {
      const v = await sampleDashboard(page, recorded, relay, newDevice, scheme);
      expect((await new AxeBuilder({ page: v }).analyze()).violations).toEqual([]);
      await v.getByTestId('dash-toggle-E3').click();
      await expect(v.getByTestId('dash-details-E3')).toBeVisible();
      expect((await new AxeBuilder({ page: v }).analyze()).violations).toEqual([]);
      // Spec 010: Eltern-Hilfe mit Leiste
      await v.getByTestId('viewer-nav-help').click();
      await v.getByTestId('help-search').fill('teilen');
      await expect(v.getByTestId('help-count')).toBeVisible();
      expect((await new AxeBuilder({ page: v }).analyze()).violations).toEqual([]);
    });
  }
});

test.describe('020 Paket A: Startbildschirm, Blätter und "Live für Eltern" ohne axe-Verstöße', () => {
  // Relay-Nachbau braucht blockierte Service Worker (fixtures.ts).
  test.use({ serviceWorkers: 'block' });
  for (const scheme of ['light', 'dark'] as const) {
    test(`Eltern live zuschauen lassen, Teilen und Live für Eltern ${scheme === 'light' ? 'hell' : 'dunkel'}`, async ({
      page,
      recorded,
      relay,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const axe = async (): Promise<void> => {
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      };
      // Mannschaft E1 und ein angelegtes Spiel (Startbildschirm mit "Spiel fortsetzen").
      await newGame(page, { ownTeam: 'Sportvg Feuerbach E1' });
      await page.goto('./');
      await expect(page.getByTestId('start-live-quick')).toBeVisible();
      await axe();
      await page.getByTestId('start-live-quick').click();
      await expect(page.getByTestId('live-start-sheet')).toBeVisible();
      await axe();
      await page.getByTestId('live-start-new').click();
      await expect(page.getByTestId('live-start-done')).toBeVisible();
      await axe();
      await expect.poll(async () => (await recorded()).shares.length).toBe(1);
      await expect.poll(() => relay.all().length).toBeGreaterThan(0);

      await page.goto('./#/live-spieltag');
      await page.reload();
      await expect(page.getByTestId('live-trainer-toggle')).toHaveAttribute('aria-expanded', 'false');
      await axe();
      await page.getByTestId('live-trainer-toggle').click();
      await expect(page.getByTestId('live-trainer')).toBeVisible();
      await axe();

      await page.goto('./');
      await page.getByTestId('btn-continue').click();
      await page.getByTestId('btn-kickoff').click();
      await page.getByTestId('btn-menu').click();
      await expect(page.getByTestId('menu-share')).toBeVisible();
      await expect(page.getByTestId('menu-live-quick')).toHaveCount(0);
      await axe();
      await page.getByTestId('menu-share').click();
      await expect(page.getByTestId('share-sheet')).toBeVisible();
      await axe();
    });
  }
});

test.describe('020 US3 US4 Eltern-Ansicht mit Schalter, Aktualität und Warnung ohne axe-Verstöße', () => {
  // Relay-Nachbau braucht blockierte Service Worker (fixtures.ts).
  test.use({ serviceWorkers: 'block' });
  for (const scheme of ['light', 'dark'] as const) {
    test(`Eltern-Ansicht ${scheme === 'light' ? 'hell' : 'dunkel'}: Schalter aus und an, "vor n Min", Warnung`, async ({
      page,
      recorded,
      relay,
      newDevice,
    }) => {
      const v = await sampleDashboard(page, recorded, relay, newDevice, scheme);
      await expect(v.getByTestId('dash-fresh-E1')).toHaveText('gerade aktualisiert');
      expect((await new AxeBuilder({ page: v }).analyze()).violations).toEqual([]);
      await v.getByRole('switch', { name: 'Töne' }).click();
      await later(v, relay, 2 * MIN);
      await expect(v.getByTestId('dash-fresh-E1')).toHaveText('vor 2 Min aktualisiert');
      expect((await new AxeBuilder({ page: v }).analyze()).violations).toEqual([]);
      await later(v, relay, 5 * MIN);
      await expect(v.getByTestId('dash-stale-E1')).toHaveText('Seit 7 Min keine Meldung vom Spielfeld');
      expect((await new AxeBuilder({ page: v }).analyze()).violations).toEqual([]);
      // Ton gesperrt nach Rückkehr aus dem Hintergrund: Hinweis neben dem Schalter
      await v.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await expect(v.getByTestId('dash-sound-locked')).toBeVisible();
      expect((await new AxeBuilder({ page: v }).analyze()).violations).toEqual([]);
    });
  }
});

test.describe('022 Erster Start: Hinweis, Neues Spiel, Blatt, Schalter und Für Trainer ohne axe-Verstöße', () => {
  // Relay-Nachbau braucht blockierte Service Worker (fixtures.ts).
  test.use({ serviceWorkers: 'block' });
  for (const scheme of ['light', 'dark'] as const) {
    test(`Erster Start ${scheme === 'light' ? 'hell' : 'dunkel'}`, async ({ page, recorded, relay, newDevice }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const axe = async (p = page): Promise<void> => {
        expect((await new AxeBuilder({ page: p }).analyze()).violations).toEqual([]);
      };
      // US1: Startbildschirm mit Installationshinweis
      await newGame(page, { ownTeam: 'Sportvg Feuerbach E1' });
      await page.goto('./');
      await expect(page.getByTestId('start-install-hint')).toBeVisible();
      await axe();
      // US2: Neues Spiel mit angeheftetem Knopf; "Gegner ändern" in den Spieldetails
      await page.getByTestId('btn-new-game').click();
      await expect(page.getByTestId('create-bar')).toBeVisible();
      await axe();
      await page.getByTestId('btn-create').click();
      await page.getByTestId('btn-kickoff').click();
      await page.getByTestId('btn-menu').click();
      await page.getByTestId('menu-details').click();
      await page.getByTestId('details-opponent').click();
      await expect(page.getByTestId('opponent-sheet')).toBeVisible();
      await axe();
      // US4: Blatt "Eltern live zuschauen lassen" in beiden Zuständen
      await page.goto('./');
      await page.getByTestId('start-live-quick').click();
      await expect(page.getByTestId('live-start-sheet')).toBeVisible();
      await axe();
      await page.getByTestId('live-start-new').click();
      await expect(page.getByTestId('live-start-share-trainer')).toBeVisible();
      await axe();
      await expect.poll(() => relay.all().length).toBeGreaterThan(0);
      // US4: "Live für Eltern" mit aufgeklapptem "Für Trainer" als eine Fläche
      await page.goto('./#/live-spieltag');
      await openTrainerSection(page);
      await expect(page.getByTestId('live-trainer')).toBeVisible();
      await axe();
      // US4: Eltern-Ansicht mit Schalter an (rot)
      const viewerLink = /(https?:\/\/\S+#\/live\/[A-Za-z0-9_-]+)$/.exec((await recorded()).shares[0]?.text ?? '')?.[1];
      expect(viewerLink).toBeTruthy();
      const v = await openViewer(newDevice, relay, { viewer: viewerLink!, trainer: '' }, scheme);
      await v.getByTestId('dash-sound').click();
      await expect(v.getByTestId('dash-sound')).toHaveAttribute('aria-checked', 'true');
      await axe(v);
    });
  }
});

test.describe('021 Spielablauf: Schnellauswahl, Torliste mit Pfeil und "Nächstes Spiel" ohne axe-Verstöße', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`Schnellauswahl, Vorlage, Endzustand und vorbelegtes "Neues Spiel" ${scheme === 'light' ? 'hell' : 'dunkel'}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const axe = async (): Promise<void> => {
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      };
      await seedRoster(page, '7 Max\n9 Ben\n10 Tom');
      await page.goto('./#/einstellungen');
      await page.getByTestId('feature-assists').click();
      await expect(page.getByTestId('feature-assists')).toHaveAttribute('aria-checked', 'true');
      await startGame(page, { sections: 1, minutes: 12 });
      await forward(page, MIN);
      await page.getByTestId('btn-goal-own').click();
      await expect(page.getByRole('dialog', { name: 'Wer hat getroffen?' })).toBeVisible();
      await axe();
      await page.getByTestId('scorer-picker').getByRole('button', { name: '7 Max', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Vorlage von?' })).toBeVisible();
      await axe();
      await page.getByTestId('assist-skip').click();
      await expect(page.locator('.goal-row__chev')).toHaveCount(1);
      await axe();
      await page.getByTestId('btn-section-end').click();
      await page.getByTestId('confirm-yes').click();
      await expect(page.getByTestId('btn-next-game')).toBeVisible();
      await axe();
      await page.getByTestId('btn-next-game').click();
      await expect(page.getByTestId('input-opponent')).toBeFocused();
      await axe();
    });
  }
});
