import { describe, expect, it } from 'vitest';
import { HELP_ENTRIES, HELP_TOPICS } from '../../src/domain/help-entries';
import { searchHelp } from '../../src/domain/help-search';

const byId = new Map(HELP_ENTRIES.map((e) => [e.id, e]));

describe('010 FR-H08 FR-H09 Inhalte', () => {
  it('Themen in der Reihenfolge aus FR-H08, jedes Thema hat Einträge', () => {
    expect(HELP_TOPICS.map((t) => t.name)).toEqual([
      'Erste Schritte',
      'Spiel erfassen',
      'Torschützen und Ereignisse',
      'Pokal',
      'Teilen',
      'Mannschaften und Kader',
      'Historie',
      'Live-Spieltag',
      'Einstellungen und Sicherung',
      'Probleme lösen',
      'Datenschutz',
    ]);
    for (const t of HELP_TOPICS)
      expect(
        HELP_ENTRIES.some((e) => e.topic === t.id),
        t.name,
      ).toBe(true);
  });

  it('rund 40 Einträge mit eindeutiger, adressierbarer ID', () => {
    expect(HELP_ENTRIES.length).toBeGreaterThanOrEqual(35);
    expect(byId.size).toBe(HELP_ENTRIES.length);
    for (const e of HELP_ENTRIES) expect(e.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('jeder Eintrag ist eine Frage mit kurzer Antwort und Quelle', () => {
    for (const e of HELP_ENTRIES) {
      expect(e.title.endsWith('?'), e.id).toBe(true);
      expect(e.answer.length, e.id).toBeGreaterThan(20);
      expect(e.answer.length, e.id).toBeLessThanOrEqual(600);
      expect(e.sources.length, e.id).toBeGreaterThan(0);
      expect(e.keywords.trim().length, e.id).toBeGreaterThan(0);
    }
  });

  it('höchstens drei verwandte Einträge, alle vorhanden, nicht der Eintrag selbst (FR-H11)', () => {
    for (const e of HELP_ENTRIES) {
      const rel = e.related ?? [];
      expect(rel.length, e.id).toBeLessThanOrEqual(3);
      for (const r of rel) {
        expect(byId.has(r), `${e.id} → ${r}`).toBe(true);
        expect(r).not.toBe(e.id);
      }
    }
  });

  it('"Öffnen" führt zu einem Bildschirm der App (FR-H10)', () => {
    const paths = new Set(['/neu', '/kader', '/historie', '/einstellungen', '/live-spieltag']);
    const withOpen = HELP_ENTRIES.filter((e) => e.open);
    expect(withOpen.length).toBeGreaterThan(5);
    for (const e of withOpen) expect(paths.has(e.open?.path ?? ''), e.id).toBe(true);
  });

  it('Einträge für Eltern: Dashboard, Letzte Spiele, Home-Bildschirm, Teilen, Keine Verbindung, Datenschutz (FR-H16, 007 US3)', () => {
    const parents = HELP_ENTRIES.filter((e) => e.parents).map((e) => e.title);
    expect(parents).toEqual([
      'Wie verfolge ich die Spiele als Elternteil?',
      'Wo sehe ich frühere Ergebnisse?',
      'Wie lege ich den Spieltag auf den Home-Bildschirm?',
      'Wie teile ich den Spieltag mit Familie und Freunden?',
      'Was bedeutet „Keine Verbindung“?',
      'Welche Daten verlassen mein Handy?',
    ]);
    // Eltern-Einträge verweisen nur auf andere Eltern-Einträge und haben keinen "Öffnen"-Knopf
    for (const e of HELP_ENTRIES.filter((x) => x.parents)) {
      expect(e.open, e.id).toBeUndefined();
      for (const r of e.related ?? []) expect(byId.get(r)?.parents, `${e.id} → ${r}`).toBe(true);
    }
  });
});

/** SC-H01: Alltagsformulierungen und der Eintrag, der unter den ersten drei Treffern stehen muss. */
const CATALOG: [string, string][] = [
  ['kein ton', 'kein-pfiff'],
  ['pfiff', 'kein-pfiff'],
  ['tor löschen', 'tor-entfernen'],
  ['wie lösche ich ein tor', 'tor-entfernen'],
  ['verklickt', 'tor-entfernen'],
  ['backup', 'sichern'],
  ['neues handy', 'wiederherstellen'],
  ['eltern zuschauen', 'eltern-dashboard'],
  ['elfer', 'elfmeter'],
  ['gelbe karte', 'karten'],
  ['whatsapp', 'ergebnis-teilen'],
  ['torschütze', 'torschuetze'],
  ['auswechseln', 'wechsel'],
  ['dunkel', 'darstellung'],
  ['trainer koppeln', 'trainer-link'],
  ['spiele weg', 'daten-weg'],
  ['nachspielzeit', 'nachspielzeit'],
  ['oma', 'eltern-teilen'],
  ['video', 'lesezeichen'],
  ['halbzeit beenden', 'pausenpfiff'],
  ['tor', 'tor'],
  ['glocke', 'signalton'],
  ['vorlage', 'vorlage'],
  ['spiel übernehmen', 'spiel-uebernehmen'],
  ['übergabe', 'spiel-uebernehmen'],
  ['assist ändern', 'vorlage-aendern'],
  ['ton ändern', 'signalton'],
  ['mehrere spiele löschen', 'spiele-loeschen-mehrere'],
  ['alle spiele löschen', 'spiele-loeschen-mehrere'],
  ['testspiele aufräumen', 'spiele-loeschen-mehrere'],
  ['gelöscht rückgängig', 'spiel-loeschen'],
];

describe('010 SC-H01 Fragenkatalog', () => {
  it.each(CATALOG)('„%s“ findet %s unter den ersten drei', (query, id) => {
    const top = (searchHelp(query, HELP_ENTRIES)?.entries ?? []).slice(0, 3).map((e) => e.id);
    expect(top).toContain(id);
  });

  it('mindestens 15 Formulierungen', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(15);
  });
});

describe('010 SC-H02 Geschwindigkeit', () => {
  it('eine Suche über alle Einträge dauert deutlich unter 100 ms', () => {
    const queries = ['p', 'pf', 'pfi', 'pfif', 'pfiff', 'tor l', 'tor lö', 'tor lös', 'tor lösch', 'tor löschen'];
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) for (const q of queries) searchHelp(q, HELP_ENTRIES);
    const perQuery = (performance.now() - t0) / 100;
    expect(perQuery).toBeLessThan(10);
  });
});
