import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { planPayloads } from './live-helpers';
import { addGame, openPlan, row, rows, setupPlan, sync } from './plan-helpers';

/**
 * Spec 015 US4: Spielplan als Liste einfügen und teilen. "Liste einfügen" zeigt vorab, was erkannt wurde;
 * fehlerhafte Zeilen bleiben draußen. "Spielplan teilen" gibt dieselbe Liste wieder aus. Heute ist Sa 07.11.2026.
 */

// Service Worker blockieren, damit WebKit die Anfragen an ntfy.sh durch den Relay-Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const preview = (page: Page) => page.locator('[data-testid^="plan-preview-row-"]');

async function paste(page: Page, text: string): Promise<void> {
  await page.getByTestId('plan-paste').click();
  await page.getByTestId('plan-paste-input').fill(text);
  await page.getByTestId('plan-paste-next').click();
}

test('015 US4-S1 drei Zeilen einfügen: Vorschau zeigt drei Spiele, nach "Übernehmen" stehen sie im Plan', async ({
  page,
  recorded,
  relay,
}) => {
  const links = await setupPlan(page, recorded, relay, ['E1', 'E2', 'E3']);
  await openPlan(page);
  const list = [
    'Sa 14.11. 12:00 E1 heim TSV Musterstadt (Kreisstaffel)',
    'Sa 14.11. 12:00 E2 auswärts SV Beispielhausen',
    'Sa 28.11. 14:06 E3 heim FC Probestadt (Hallen-Bezirksturnier, 1×10)',
  ].join('\n');

  // FR-P16: Einsetzen aus der Zwischenablage (wie Spec 012 FR-S02)
  await page.getByTestId('plan-paste').click();
  await expect(page.getByRole('heading', { name: 'Liste einfügen' })).toBeVisible();
  await page.evaluate((t) => ((window as unknown as { __rec: { clipboard?: string } }).__rec.clipboard = t), list);
  await page.getByTestId('plan-paste-clipboard').click();
  await expect(page.getByTestId('plan-paste-input')).toHaveValue(list);
  await page.getByTestId('plan-paste-next').click();

  await expect(page.getByTestId('plan-preview-count')).toHaveText('3 von 3 Zeilen erkannt');
  await expect(preview(page)).toHaveText([
    /Sa 14\.11\. 12:00.*E1 – TSV Musterstadt.*Heim · Kreisstaffel.*neu/,
    /Sa 14\.11\. 12:00.*E2 bei SV Beispielhausen.*Auswärts.*neu/,
    /Sa 28\.11\. 14:06.*E3 – FC Probestadt.*Heim · Hallen-Bezirksturnier · 1×10.*neu/,
  ]);
  await expect(page.getByTestId('plan-paste-apply')).toHaveText('3 Spiele übernehmen');
  await page.getByTestId('plan-paste-apply').click();

  await expect(page.getByTestId('plan-msg')).toHaveText('3 Spiele übernommen. Alle Trainer-Handys bekommen sie.');
  await expect(rows(page)).toHaveCount(2); // 14.11. aufgeklappt, 28.11. zugeklappt
  await expect(row(page, 'E1 – TSV Musterstadt')).toContainText('12:00');
  await expect(row(page, 'E2 bei SV Beispielhausen')).toBeVisible();
  await page
    .getByTestId('plan-group-2026-11-28')
    .getByRole('button', { name: /Sa 28\.11\./ })
    .click();
  await expect(row(page, 'E3 – FC Probestadt')).toContainText('14:06');

  await expect
    .poll(async () => {
      await sync(page);
      return (await planPayloads(relay, links.viewer)).flatMap((p) => p.e as { o?: string }[]).map((e) => e.o);
    })
    .toEqual(expect.arrayContaining(['TSV Musterstadt', 'SV Beispielhausen', 'FC Probestadt']));
});

test('015 US4-S2 ohne Jahr: nächstes passendes Datum ab 7 Tagen vor heute', async ({ page, recorded, relay }) => {
  await setupPlan(page, recorded, relay);
  await openPlan(page);
  await paste(page, 'Sa 09.01. 10:00 E1 heim SV Winterhausen\nMo 02.11. E1 heim TSV Vorbei');
  await expect(page.getByTestId('plan-preview-count')).toHaveText('1 von 2 Zeilen erkannt');
  await expect(preview(page)).toHaveText([/Sa 09\.01\. 10:00.*E1 – SV Winterhausen/]);
  await expect(page.getByTestId('plan-preview-warn-2')).toHaveText(
    /Zeile 2 wird nicht übernommen\. Datum vorbei\.\s*Mo 02\.11\. E1 heim TSV Vorbei/,
  );
  await page.getByTestId('plan-paste-apply').click();
  await expect(page.getByTestId('plan-msg')).toHaveText('1 Spiel übernommen. Alle Trainer-Handys bekommen es.');
  // 09.01. liegt im nächsten Jahr: als nächstes Datum aufgeklappt
  await expect(page.getByTestId('plan-group-2027-01-09')).toContainText('SV Winterhausen');
  await expect(row(page, 'TSV Vorbei')).toHaveCount(0);
});

test('015 US4-S3 fehlerhafte Zeilen mit Hinweis, die übrigen werden übernommen; FR-P18 Mannschaft hinzufügen', async ({
  page,
  recorded,
  relay,
}) => {
  // E3 steht in "Meine Mannschaften", gehört aber nicht zum Live-Spieltag
  await setupPlan(page, recorded, relay, ['E1', 'E2', 'E3'], ['E3']);
  await openPlan(page);
  await paste(
    page,
    [
      'Spielplan Hinrunde',
      'Sa 14.11. 12:00 E1 heim TSV Musterstadt',
      'So 14.11. 12:00 E2 heim SV Beispielhausen',
      'Sa 14.11. 12:00 E4 heim FC Probestadt',
      'Sa 21.11. 11:00 E3 heim SG Ahornfeld (Kreisstaffel, 2×25)',
    ].join('\n'),
  );
  await expect(page.getByTestId('plan-preview-count')).toHaveText('1 von 5 Zeilen erkannt');
  await expect(page.getByTestId('plan-preview-warn-1')).toContainText(
    'Zeile 1 wird nicht übernommen. Format nicht erkannt.',
  );
  await expect(page.getByTestId('plan-preview-warn-3')).toContainText(
    'Zeile 3 wird nicht übernommen. Wochentag passt nicht: Der 14.11.2026 ist ein Samstag.',
  );
  await expect(page.getByTestId('plan-preview-warn-4')).toContainText(
    'Zeile 4 wird nicht übernommen. Die Mannschaft „E4“ gehört nicht zum Live-Spieltag.',
  );
  await expect(page.getByTestId('plan-preview-warn-5')).toContainText(
    'Die Mannschaft „E3“ gehört nicht zum Live-Spieltag.',
  );
  // E4 gibt es nicht in "Meine Mannschaften": kein Angebot
  await expect(page.getByTestId('plan-add-team-E4')).toHaveCount(0);

  await page.getByTestId('plan-add-team-E3').click();
  await expect(page.getByTestId('plan-add-team-E3')).toHaveCount(0);
  await expect(page.getByTestId('plan-preview-count')).toHaveText('2 von 5 Zeilen erkannt');
  await expect(page.getByTestId('plan-preview-warn-5')).toHaveCount(0);
  await page.getByTestId('plan-paste-apply').click();
  await expect(page.getByTestId('plan-msg')).toHaveText('2 Spiele übernommen. Alle Trainer-Handys bekommen sie.');
  await expect(page.locator('.plan__sub')).toHaveText('E1, E2, E3');
  await expect(row(page, 'E1 – TSV Musterstadt')).toBeVisible();
  await expect(row(page, 'SV Beispielhausen')).toHaveCount(0);
});

test('015 US4-S4 gleiches Spiel (Mannschaft, Tag, Gegner) wird aktualisiert, nicht doppelt angelegt', async ({
  page,
  recorded,
  relay,
}) => {
  await setupPlan(page, recorded, relay);
  await openPlan(page);
  await addGame(page, { team: 'E1', date: '2026-11-14', time: '12:00', opponent: 'TSV Musterstadt' });
  await paste(
    page,
    'Sa 14.11. 11:00 E1 heim tsv musterstadt (Kreisstaffel, 2×25)\nSa 14.11. 12:00 E2 heim TSV Musterstadt',
  );
  await expect(preview(page)).toHaveText([/E1 – tsv musterstadt.*aktualisiert/, /E2 – TSV Musterstadt.*neu/]);
  await page.getByTestId('plan-paste-apply').click();
  await expect(rows(page)).toHaveCount(2);
  await expect(row(page, 'E1 – tsv musterstadt')).toContainText('11:00');
  await expect(row(page, 'E1 – tsv musterstadt')).toContainText('Heim · Kreisstaffel · 2×25');
});

test('015 US4-S5 "Spielplan teilen": alle Spiele ab heute im Einfügeformat, unverändert wieder einfügbar', async ({
  page,
  recorded,
  relay,
}) => {
  await setupPlan(page, recorded, relay);
  await openPlan(page);
  await expect(page.getByTestId('plan-share')).toBeDisabled();
  await addGame(page, {
    team: 'E1',
    date: '2026-11-15',
    time: '10:00',
    opponent: 'SV Beispielhausen E1',
    away: true,
    competition: 'Leistungsliga',
    schema: '3x25',
  });
  await addGame(page, { team: 'E2', date: '2026-11-14', opponent: '' });
  await addGame(page, { team: 'E1', date: '2026-11-01', time: '10:00', opponent: 'FC Vergangen' });
  await addGame(page, { team: 'E2', date: '2026-11-21', time: '12:00', opponent: 'TSV Abgesagt' });
  await page
    .getByTestId('plan-group-2026-11-21')
    .getByRole('button', { name: /Sa 21\.11\./ })
    .click();
  await row(page, 'TSV Abgesagt').click();
  await page.getByTestId('plan-cancel').click();

  // Die Aufzeichnung beginnt in WebKit nach dem Neuladen von vorn: ab hier zählen.
  const before = (await recorded()).shares.length;
  await page.getByTestId('plan-share').click();
  await expect.poll(async () => (await recorded()).shares.length).toBe(before + 1);
  const shared = (await recorded()).shares.at(-1);
  expect(shared?.title).toBe('Spielplan');
  expect(shared?.text).toBe(
    ['Sa 14.11. E2 heim ?', 'So 15.11. 10:00 E1 auswärts SV Beispielhausen E1 (Leistungsliga, 3×25)'].join('\n'),
  );

  await paste(page, shared?.text ?? '');
  await expect(page.getByTestId('plan-preview-count')).toHaveText('2 von 2 Zeilen erkannt');
  await expect(preview(page)).toHaveText([/unverändert/, /unverändert/]);
  await expect(page.getByTestId('plan-paste-apply')).toHaveText('Nichts Neues');
  await expect(page.getByTestId('plan-paste-apply')).toBeDisabled();
  await page.getByTestId('plan-paste-back').click();
  await expect(page.getByTestId('plan-paste-input')).toHaveValue(shared?.text ?? '');
});
