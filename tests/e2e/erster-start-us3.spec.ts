import { HELP_ENTRIES } from '../../src/domain/help-entries';
import { expect, test } from './fixtures';
import { confirmYes } from './helpers';
import { createLive, openTrainerSection, pasteLink, recordedOf } from './live-helpers';

/** Spec 022 US3: Klarere Texte (Karte "Trainer? …", Einstellung "Torvorlagen (Assists)"). */

// Service Worker blockieren, damit WebKit die Anfragen an den Vermittlungsdienst durch den Nachbau leitet (fixtures.ts).
test.use({ serviceWorkers: 'block' });

const SENTENCE = 'Den Link schickt dir der Trainer, z. B. per WhatsApp: lange drücken, Kopieren, hier einfügen.';

test('022 US3-S1 Karte "Trainer? …" nennt, woher der Link kommt und wie man ihn einfügt', async ({
  page,
  newDevice,
}) => {
  // Ohne eigene Mannschaft und ohne Live-Spieltag
  await page.goto('./');
  const card = page.getByTestId('start-trainer-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Trainer? Füge den Link aus der Trainergruppe ein.');
  await expect(card).toContainText(SENTENCE);
  await expect(page.getByTestId('btn-start-paste')).toHaveText('Link einfügen');

  // Neu ausgestellter Live-Spieltag
  const a = await newDevice();
  const old = await createLive(a, recordedOf(a), { teams: ['E1', 'E2'] });
  const b = await newDevice();
  await pasteLink(b, old.trainer);
  await openTrainerSection(a);
  await a.getByTestId('btn-live-reissue').click();
  await confirmYes(a);
  await b.goto('./#/live-spieltag');
  await expect(b.getByTestId('live-retired')).toBeVisible();
  await b.goto('./');
  const retired = b.getByTestId('start-trainer-card');
  await expect(retired).toContainText('wurde neu ausgestellt. Füge den neuen Trainer-Link ein.');
  await expect(retired).toContainText(SENTENCE);
});

test('022 US3-S2 Einstellung heißt "Torvorlagen (Assists)", Verhalten und Kennung bleiben', async ({ page }) => {
  await page.goto('./#/einstellungen');
  const sw = page.getByTestId('feature-assists');
  await expect(sw).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Torvorlagen (Assists)' })).toBeVisible();
  await expect(page.getByText('Vorlagen', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Nach dem Torschützen fragen, wer vorgelegt hat. Nur eigene Tore.')).toBeVisible();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
});

test('022 US3-S3 die Hilfe nennt den Schalter "Torvorlagen (Assists)" und nicht mehr "Vorlagen"', async ({ page }) => {
  // Kein Eintrag nennt den Schalter noch „Vorlagen“ (Bezeichnung wörtlich wie in der App, Constitution IX).
  for (const e of HELP_ENTRIES) {
    const text = `${e.answer} ${(e.steps ?? []).join(' ')}`;
    expect(text, e.id).not.toMatch(/„Vorlagen“/);
  }
  await page.goto('./#/hilfe/vorlage');
  await expect(page.getByText('Torvorlagen (Assists)').first()).toBeVisible();
});

test('022 US3-S1 Hilfe zum Link: "Trainer-Link" nennt den Weg über WhatsApp', async ({ page }) => {
  await page.goto('./#/hilfe/trainer-link');
  await expect(page.getByText(SENTENCE).first()).toBeVisible();
});
