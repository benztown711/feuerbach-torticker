import { expect, test } from './fixtures';
import { confirmYes } from './helpers';
import { MATCHDAY, pasteLink, planPayloads } from './live-helpers';
import { addGame, fillGame, openPlan, row, rows, setupPlan as setup, sync } from './plan-helpers';

/**
 * Spec 015 US1: Spielplan pflegen. Jedes Trainer-Handy trägt Planspiele ein, ändert, sagt ab und löscht; die
 * anderen Trainer-Handys übernehmen die Änderungen über den Vermittlungsdienst (contracts/plan-message.md).
 * Uhr aller Geräte: Sa 07.11.2026, 10:41 (MATCHDAY).
 */

// Service Worker blockieren, damit WebKit die Anfragen an ntfy.sh durch den Relay-Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

test('015 US1-S1 Spiel hinzufügen: steht unter dem Datum und geht als Plan-Meldung hinaus', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await setup(page, recorded, relay);
  await expect(page.getByTestId('live-plan-next')).toContainText('Trage die Spiele der Saison ein');
  await openPlan(page);
  await expect(page.getByTestId('plan-empty')).toBeVisible();

  // FR-P02: Datum und Anstoß immer deutsch angezeigt, Pflichtfelder mit Stern
  await page.getByTestId('plan-add').click();
  await expect(page.getByTestId('plan-date-shown')).toHaveText('Sa 07.11.2026');
  await expect(page.getByTestId('plan-time-shown')).toHaveText('offen');
  await expect(page.getByTestId('plan-required')).toContainText('Pflichtfeld');
  await expect(page.getByTestId('plan-sheet').getByText('*', { exact: true })).toHaveCount(4);
  await page.getByTestId('plan-date').fill('2026-11-14');
  await page.getByTestId('plan-time').fill('12:00');
  await expect(page.getByTestId('plan-date-shown')).toHaveText('Sa 14.11.2026');
  await expect(page.getByTestId('plan-time-shown')).toHaveText('12:00');
  await fillGame(page, {
    team: 'E1',
    opponent: 'TSV Musterstadt',
    competition: 'Kreisstaffel',
    schema: '2x25',
  });
  await expect(page.getByTestId('plan-msg')).toHaveText('Gespeichert. Alle Trainer-Handys bekommen es.');
  const group = page.getByTestId('plan-group-2026-11-14');
  await expect(group.getByRole('button', { name: /Sa 14\.11\./ })).toHaveAttribute('aria-expanded', 'true');
  const r = row(page, 'E1 – TSV Musterstadt');
  await expect(r).toContainText('12:00');
  await expect(r).toContainText('Heim · Kreisstaffel · 2×25');
  await expect(r).toContainText('frei');

  await expect
    .poll(async () => {
      await sync(page);
      const last = (await planPayloads(relay, links.viewer)).at(-1);
      return (last?.e as { o?: string; d?: string; t?: string }[] | undefined)?.[0];
    })
    .toMatchObject({ o: 'TSV Musterstadt', d: '2026-11-14', t: '12:00' });

  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(page.getByTestId('live-plan-next')).toHaveText(
    'Nächstes Spiel: Sa 14.11., 12:00 · E1 – TSV Musterstadt',
  );
});

test('015 US1-S2 ohne Anstoß und Gegner: "E1 – (Gegner offen)"', async ({ page, recorded, relay }) => {
  await setup(page, recorded, relay);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-15' });
  const r = row(page, 'E1 – (Gegner offen)');
  await expect(r).toBeVisible();
  await expect(r).toContainText('–');
  await expect(r).toContainText('Heim');
});

test('015 US1-S3 ändern und löschen: Angaben ändern, Löschen nach Rückfrage', async ({ page, recorded, relay }) => {
  await setup(page, recorded, relay);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-14', time: '12:00', opponent: 'TSV Musterstadt' });

  await row(page, 'E1 – TSV Musterstadt').click();
  await expect(page.locator('#plan-sheet-title')).toHaveText('Spiel bearbeiten');
  await expect(page.getByTestId('plan-opponent')).toHaveValue('TSV Musterstadt');
  await fillGame(page, { opponent: 'FC Probestadt', away: true, competition: 'Leistungsliga', schema: '3x25' });
  const r = row(page, 'E1 bei FC Probestadt');
  await expect(r).toContainText('Auswärts · Leistungsliga · 3×25');
  await expect(row(page, 'TSV Musterstadt')).toHaveCount(0);

  await r.click();
  await page.getByTestId('plan-delete').click();
  await expect(page.getByTestId('confirm-dialog')).toContainText('Spiel löschen?');
  await confirmYes(page);
  await expect(page.getByTestId('plan-msg')).toHaveText('Gelöscht.');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.getByTestId('plan-empty')).toBeVisible();
});

test('015 US1-S4 anderes Trainer-Handy übernimmt; Änderungen an verschiedenen Spielen bleiben beide', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setup(page, recorded, relay);
  const b = await newDevice();
  await b.clock.setSystemTime(MATCHDAY);
  await pasteLink(b, links.trainer);

  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-14', time: '12:00', opponent: 'TSV Musterstadt' });

  await openPlan(b);
  await expect
    .poll(async () => {
      await sync(b);
      return row(b, 'E1 – TSV Musterstadt').count();
    })
    .toBe(1);

  // A ändert das E1-Spiel, B legt gleichzeitig ein E2-Spiel an
  await row(page, 'E1 – TSV Musterstadt').click();
  await fillGame(page, { time: '11:00' });
  await addGame(b, { team: 'E2', date: '2026-11-14', time: '12:00', opponent: 'SV Beispielhausen' });

  for (const p of [page, b]) {
    await expect
      .poll(async () => {
        await sync(p);
        return (await rows(p).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
      })
      .toEqual([
        expect.stringContaining('11:00 E1 – TSV Musterstadt'),
        expect.stringContaining('12:00 E2 – SV Beispielhausen'),
      ]);
  }
});

test('015 US1-S5 Handy ohne Kopplung: kein Spielplan', async ({ newDevice }) => {
  const c = await newDevice();
  await c.goto('./#/live-spieltag');
  await expect(c.getByTestId('btn-plan')).toHaveCount(0);
  await c.goto('./#/live-spieltag/spielplan');
  await expect(c.getByTestId('plan-unavailable')).toBeVisible();
  await expect(c.getByTestId('plan-add')).toHaveCount(0);
});

test('015 US1-S6 Datumsköpfe: nächstes Datum offen, nach Anstoß sortiert; vergangene Spiele eingeklappt', async ({
  page,
  recorded,
  relay,
}) => {
  await setup(page, recorded, relay);
  await openPlan(page);
  await addGame(page, { team: 'E2', date: '2026-11-14', time: '12:00', opponent: 'SV Beispielhausen' });
  await addGame(page, { team: 'E1', date: '2026-11-14', time: '11:00', opponent: 'TSV Musterstadt' });
  await addGame(page, { team: 'E1', date: '2026-11-15', time: '10:00', opponent: 'TV Neustadt E1', away: true });
  await addGame(page, { team: 'E1', date: '2026-11-01', time: '10:00', opponent: 'FC Kirchberg' });

  const first = page.getByTestId('plan-group-2026-11-14');
  await expect(first.locator('[data-testid^="plan-row-"]')).toHaveText([/11:00.*E1 – TSV Musterstadt/, /12:00.*E2/]);
  const second = page.getByTestId('plan-group-2026-11-15');
  await expect(second.getByRole('button', { name: /So 15\.11\./ })).toHaveAttribute('aria-expanded', 'false');
  await expect(second.locator('[data-testid^="plan-row-"]')).toHaveCount(0);
  await second.getByRole('button', { name: /So 15\.11\./ }).click();
  await expect(second.locator('[data-testid^="plan-row-"]')).toContainText('E1 bei TV Neustadt E1');

  const past = page.getByTestId('plan-group-past');
  await expect(past.getByRole('button', { name: /Vergangene Spiele/ })).toContainText('1 Spiel');
  await expect(past.locator('[data-testid^="plan-row-"]')).toHaveCount(0);
  await past.getByRole('button', { name: /Vergangene Spiele/ }).click();
  await expect(past.locator('[data-testid^="plan-row-"]')).toContainText('So 01.');
  await expect(past.locator('[data-testid^="plan-row-"]')).toContainText('E1 – FC Kirchberg');
  await expect(past.locator('[data-testid^="plan-row-"]')).not.toContainText('frei');
  // Vergangene Spiele lassen sich korrigieren oder löschen (z. B. falsches Jahr)
  await past.locator('[data-testid^="plan-row-"]').click();
  await expect(page.getByTestId('plan-delete')).toBeVisible();
});

test('015 US1-S7 absagen und wieder ansetzen; das andere Trainer-Handy sieht es', async ({
  page,
  recorded,
  relay,
  newDevice,
}) => {
  const links = await setup(page, recorded, relay);
  const b = await newDevice();
  await b.clock.setSystemTime(MATCHDAY);
  await pasteLink(b, links.trainer);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-14', time: '12:00', opponent: 'TSV Musterstadt' });

  await row(page, 'TSV Musterstadt').click();
  await page.getByTestId('plan-cancel').click();
  await expect(page.getByTestId('plan-msg')).toHaveText('Als abgesagt markiert.');
  await expect(row(page, 'TSV Musterstadt')).toContainText('abgesagt');

  await openPlan(b);
  await expect
    .poll(async () => {
      await sync(b);
      return row(b, 'TSV Musterstadt').innerText();
    })
    .toContain('abgesagt');

  await row(page, 'TSV Musterstadt').click();
  await expect(page.getByTestId('plan-cancel')).toHaveText('Wieder ansetzen');
  await page.getByTestId('plan-cancel').click();
  await expect(page.getByTestId('plan-msg')).toHaveText('Wieder angesetzt.');
  await expect(row(page, 'TSV Musterstadt')).toContainText('frei');
});

test('015 FR-P07 erneut senden: beim Öffnen nach mehr als 6 Stunden geht der ganze Plan hinaus', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await setup(page, recorded, relay);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-14', time: '12:00', opponent: 'TSV Musterstadt' });
  await addGame(page, { team: 'E2', date: '2026-11-14', time: '12:00', opponent: 'SV Beispielhausen' });
  const count = async () => {
    await sync(page);
    return (await planPayloads(relay, links.viewer)).length;
  };
  await expect.poll(count).toBe(2);

  // Kurz danach neu öffnen: nichts Neues
  await page.reload();
  await expect(page.getByTestId('plan-screen')).toBeVisible();
  expect(await count()).toBe(2);

  // Nach mehr als 6 Stunden: einmal der ganze Plan
  await page.goto('./#/mehr');
  await page.clock.fastForward('06:01:00');
  await page.reload();
  await expect.poll(count).toBe(3);
  const last = (await planPayloads(relay, links.viewer)).at(-1);
  expect((last?.e as unknown[]).length).toBe(2);
});
