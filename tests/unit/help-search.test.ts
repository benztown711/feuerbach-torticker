import { describe, expect, it } from 'vitest';
import type { HelpEntry } from '../../src/domain/help-entries';
import { highlight, normalize, queryTokens, searchHelp, snippet, type Segment } from '../../src/domain/help-search';

const entry = (id: string, title: string, answer: string, keywords = '', steps?: string[]): HelpEntry => ({
  id,
  topic: 'spiel',
  title,
  answer,
  keywords,
  sources: ['001 US1'],
  ...(steps ? { steps } : {}),
});

const E: HelpEntry[] = [
  entry('installieren', 'Wie lege ich den Torticker auf den Home-Bildschirm?', 'Öffne den Link in Safari.'),
  entry('tor', 'Wie erfasse ich ein Tor?', 'Ein Tipp auf den großen Knopf. Danach wählst du den Torschützen.'),
  entry('tor-entfernen', 'Wie entferne ich ein Tor?', 'Tippe auf „Rückgängig“.', 'löschen falsch verklickt'),
  entry('pfiff', 'Warum höre ich keinen Pfiff?', 'Lass die App offen.', 'ton signal'),
  entry('halbzeit', 'Wie beende ich eine Halbzeit?', 'Tippe auf „Pausenpfiff“.'),
  entry('sichern', 'Wie sichere ich meine Spiele?', 'In den Einstellungen auf „Sichern“.', 'backup', [
    'Einstellungen öffnen.',
    'Datei in iCloud Drive ablegen.',
  ]),
  entry('elfmeter', 'Wie kennzeichne ich einen Elfmeter?', 'Tor antippen, Kennzeichen wählen.', 'elfer'),
  entry('schiessen', 'Wie erfasse ich ein Elfmeterschießen?', 'Nach dem Schlusspfiff wählen.'),
];

const ids = (q: string): string[] | null => searchHelp(q, E)?.entries.map((e) => e.id) ?? null;
const marked = (segs: Segment[]): string => segs.map((s) => (s.hit ? `[${s.text}]` : s.text)).join('');

describe('010 FR-H02 Normalisierung', () => {
  it('Kleinschreibung, Umlaute und ß werden vereinheitlicht, mit Zuordnung zum Original', () => {
    const n = normalize('Torschütze ÄÖß');
    expect(n.text).toBe('torschuetze aeoess');
    // "ü" (Stelle 6) wird zu zwei Zeichen, beide zeigen auf das Original
    expect(n.map.slice(6, 8)).toEqual([6, 6]);
    expect(n.map).toHaveLength(n.text.length);
  });
});

describe('010 FR-H02 FR-H03 Suchwörter', () => {
  it('unter zwei Zeichen wird nicht gesucht', () => {
    expect(queryTokens('')).toEqual([]);
    expect(queryTokens('e')).toEqual([]);
    expect(queryTokens(' ? ')).toEqual([]);
    expect(ids('e')).toBeNull();
  });

  it('Satzzeichen, Anführungszeichen und Emojis werden ignoriert', () => {
    expect(queryTokens('„Tor“ ⚽ löschen!?')).toEqual(['tor', 'loeschen']);
  });

  it('Eingaben über 60 Zeichen werden abgeschnitten', () => {
    const long = 'a'.repeat(58) + ' bcdef';
    expect(queryTokens(long)).toEqual(['a'.repeat(58), 'b']);
  });

  it('Füllwörter zählen nicht, außer es bleibt sonst nichts übrig', () => {
    expect(queryTokens('Wie lösche ich ein Tor')).toEqual(['loesche', 'tor']);
    expect(queryTokens('wie ich')).toEqual(['wie', 'ich']);
  });
});

describe('010 FR-H02 bis FR-H05 Treffer und Reihenfolge', () => {
  it('Groß- und Kleinschreibung egal, Wortanfang genügt (US1-S2)', () => {
    expect(ids('ELFMETER')).toEqual(ids('elfmeter'));
    expect(ids('Elf')).toEqual(['elfmeter', 'schiessen']);
  });

  it('ae/ä gelten als gleich (US1-S3)', () => {
    expect(ids('Torschuetze')).toEqual(['tor']);
    expect(ids('torschütze')).toEqual(['tor']);
  });

  it('Suchbegriffe finden Einträge, deren Text das Wort nicht enthält (US1-S4, FR-H04)', () => {
    expect(ids('Backup')).toEqual(['sichern']);
  });

  it('Schritte werden mit durchsucht', () => {
    expect(ids('icloud')).toEqual(['sichern']);
  });

  it('alle Wörter müssen vorkommen (US1-S5, FR-H03)', () => {
    expect(ids('tor löschen')).toEqual(['tor-entfernen']);
    expect(ids('tor icloud')).toEqual([]);
  });

  it('ab vier Zeichen auch innerhalb zusammengesetzter Wörter, kürzer nur am Wortanfang', () => {
    expect(ids('pfiff')).toEqual(['pfiff', 'halbzeit', 'schiessen']);
    expect(ids('iff')).toEqual([]);
  });

  it('Titel vor Suchbegriffen vor Text, ganzes Wort vor Wortanfang (FR-H05)', () => {
    // "tor": ganzes Wort im Titel (tor, tor-entfernen) vor Wortanfang im Titel (Torticker), dann nur im Text
    expect(ids('tor')).toEqual(['tor', 'tor-entfernen', 'installieren', 'elfmeter']);
    // "signal" nur in Suchbegriffen, "lass" nur im Text
    expect(ids('signal')).toEqual(['pfiff']);
    expect(ids('ton')).toEqual(['pfiff']);
  });

  it('bei gleicher Punktzahl gilt die Reihenfolge der Übersicht', () => {
    expect(ids('wie')).toEqual([
      'installieren',
      'tor',
      'tor-entfernen',
      'halbzeit',
      'sichern',
      'elfmeter',
      'schiessen',
    ]);
  });

  it('kein Treffer liefert eine leere Liste, keine Suche liefert null (US1-S7)', () => {
    expect(ids('xyz')).toEqual([]);
    expect(searchHelp('xyz', E)).toEqual({ tokens: ['xyz'], entries: [] });
  });
});

describe('010 FR-H06 Hervorhebung und Auszug', () => {
  it('markiert Fundstellen im Original, auch bei Umlauten', () => {
    expect(marked(highlight('Wie trage ich den Torschützen nach?', ['torschuetze']))).toBe(
      'Wie trage ich den [Torschütze]n nach?',
    );
  });

  it('markiert mehrere Wörter, überlappende Fundstellen nur einmal', () => {
    expect(marked(highlight('Tor löschen', ['tor', 'loeschen']))).toBe('[Tor] [löschen]');
    expect(marked(highlight('Torwart', ['tor', 'torw']))).toBe('[Tor]wart');
  });

  it('ohne Fundstelle ein einziger Abschnitt', () => {
    expect(highlight('Lass die App offen.', ['xyz'])).toEqual([{ text: 'Lass die App offen.', hit: false }]);
    expect(highlight('', ['xyz'])).toEqual([]);
  });

  it('Auszug beginnt am Anfang der Antwort, wenn die Fundstelle vorn liegt', () => {
    const e = E[1] as HelpEntry;
    expect(marked(snippet(e, ['knopf']))).toBe('Ein Tipp auf den großen [Knopf]. Danach wählst du den Torschützen.');
  });

  it('Auszug springt zur ersten Fundstelle und kürzt mit …', () => {
    const long = entry(
      'lang',
      'Titel?',
      'Eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn. Hier steht der Pfiff mitten im Text und danach kommt noch sehr viel mehr Text, der nicht mehr in den Auszug passt.',
    );
    const s = marked(snippet(long, ['pfiff']));
    expect(s.startsWith('…')).toBe(true);
    expect(s).toContain('[Pfiff]');
    expect(s.endsWith(' …')).toBe(true);
    expect(s.length).toBeLessThan(130);
  });

  it('Auszug ohne Fundstelle in der Antwort zeigt ihren Anfang', () => {
    const e = E[5] as HelpEntry;
    expect(marked(snippet(e, ['backup']))).toBe(
      'In den Einstellungen auf „Sichern“. Einstellungen öffnen. Datei in iCloud Drive ablegen.',
    );
  });

  it('lange Antwort ohne Leerzeichen wird hart geschnitten', () => {
    const e = entry('x', 'X?', 'Pfiff' + 'x'.repeat(200));
    const s = marked(snippet(e, ['pfiff']));
    expect(s.startsWith('[Pfiff]')).toBe(true);
    expect(s).toHaveLength('[Pfiff]'.length + 105 + ' …'.length);
  });

  it('kurze Antwort ohne Leerzeichen am Schnitt bleibt vollständig', () => {
    const e = entry('x', 'X?', 'Pfiff.');
    expect(marked(snippet(e, ['pfiff']))).toBe('[Pfiff].');
  });
});
