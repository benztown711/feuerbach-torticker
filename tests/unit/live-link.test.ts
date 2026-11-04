import { describe, expect, it } from 'vitest';
import {
  fromBase64Url,
  isBase64Url,
  textFromBase64Url,
  textToBase64Url,
  toBase64Url,
} from '../../src/domain/base64url';
import {
  findLink,
  linkUrl,
  parseLinkPath,
  trainerLinkPath,
  viewerShareText,
  viewerLinkPath,
  type LeadLinkData,
  type TrainerLinkData,
} from '../../src/domain/live-link';
import type { PrivateKeyParts, SignedData, ViewerLink } from '../../src/domain/types';

const B43 = 'A'.repeat(42) + 'Q'; // 32 Byte
const B86 = 'B'.repeat(85) + 'A'; // 64 Byte
const B87 = 'C'.repeat(86) + 'A'; // 65 Byte
const view: ViewerLink = { topic: 'abcdefghijklmnopqrstuv', viewKey: B43, orgPub: B87, title: 'Unser Spieltag' };
const cert: SignedData = { d: '{"key":"E2"}', s: B86 };
const key: PrivateKeyParts = { d: B43, x: B43, y: B43 };
const config: SignedData = { d: '{"title":"Unser Spieltag"}', s: B86 };

const encode = (o: unknown): string => textToBase64Url(JSON.stringify(o));
/** Lead-Link der ersten Version (wird nicht mehr erzeugt, bleibt aber gültig). */
const leadLinkPath = (lead: LeadLinkData): string =>
  `/lead/${encode({ v: 1, t: lead.view.topic, k: lead.view.viewKey, o: lead.view.orgPub, n: lead.view.title, c: lead.cert, p: lead.key, g: lead.config })}`;
const rawView = { v: 1, t: view.topic, k: view.viewKey, o: view.orgPub, n: view.title };

describe('006 FR-L02 base64url', () => {
  it('kodiert Bytes und Text hin und zurück, ohne Auffüllzeichen', () => {
    const bytes = new Uint8Array([0, 1, 250, 251, 252, 253, 254, 255]);
    const s = toBase64Url(bytes);
    expect(s).toBe('AAH6-_z9_v8');
    expect(Array.from(fromBase64Url(s))).toEqual(Array.from(bytes));
    expect(textFromBase64Url(textToBase64Url('Spieltag ä ⚽'))).toBe('Spieltag ä ⚽');
    expect(isBase64Url('AAH6-_z9_v8')).toBe(true);
    expect(isBase64Url('AA==')).toBe(false);
    expect(isBase64Url('')).toBe(false);
  });

  it('lehnt ungültige Zeichen und unmögliche Längen ab', () => {
    expect(() => fromBase64Url('a+b/')).toThrow();
    expect(() => fromBase64Url('A')).toThrow();
    expect(() => textFromBase64Url('_w')).toThrow(); // 0xFF ist kein UTF-8
  });
});

describe('006 FR-L02 FR-L03 Zuschauer- und Lead-Link (contracts/live-link.md)', () => {
  it('Zuschauer-Link: kodieren und dekodieren', () => {
    const path = viewerLinkPath(view);
    expect(path.startsWith('/live/')).toBe(true);
    expect(parseLinkPath(path)).toEqual({ kind: 'view', view });
    expect(linkUrl('https://benztown711.github.io/feuerbach-torticker/', path)).toBe(
      `https://benztown711.github.io/feuerbach-torticker/#${path}`,
    );
  });

  it('Lead-Link: kodieren und dekodieren', () => {
    const path = leadLinkPath({ view, cert, key, config });
    expect(path.startsWith('/lead/')).toBe(true);
    expect(parseLinkPath(path)).toEqual({ kind: 'lead', lead: { view, cert, key, config } });
  });

  it('erkennt den Link in eingefügtem Text mit Leerzeichen, Zeilenumbrüchen und Begleittext', () => {
    const url = linkUrl('https://x.example/app/', leadLinkPath({ view, cert, key, config }));
    expect(findLink(`  Hier dein Link für E2:\n${url}\n\nDanke!  `).kind).toBe('lead');
    expect(findLink(`#${viewerLinkPath(view)}`).kind).toBe('view');
    expect(findLink('ganz anderer Text').kind).toBe('invalid');
  });

  it('unbekannte Felder werden ignoriert', () => {
    expect(parseLinkPath(`/live/${encode({ ...rawView, extra: 1 })}`)).toEqual({ kind: 'view', view });
  });

  it.each([
    ['falsche Version', { ...rawView, v: 2 }],
    ['kein Objekt', 'Text'],
    ['null', null],
    ['Topic zu kurz', { ...rawView, t: 'abc' }],
    ['Topic mit Sonderzeichen', { ...rawView, t: 'abcdefghijklmnopqrstu!' }],
    ['Zuschauer-Schlüssel falsche Länge', { ...rawView, k: B87 }],
    ['Organisator-Schlüssel falsche Länge', { ...rawView, o: B43 }],
    ['Titel leer', { ...rawView, n: '' }],
    ['Titel zu lang', { ...rawView, n: 'x'.repeat(41) }],
    ['Titel keine Zeichenkette', { ...rawView, n: 3 }],
  ])('Zuschauer-Link ungültig: %s', (_, raw) => {
    expect(parseLinkPath(`/live/${encode(raw)}`).kind).toBe('invalid');
  });

  const rawLead = { ...rawView, c: cert, p: key, g: config };
  it.each([
    ['ohne Zertifikat', { ...rawLead, c: undefined }],
    ['Zertifikat ohne Signatur', { ...rawLead, c: { d: cert.d } }],
    ['Zertifikat mit falscher Signaturlänge', { ...rawLead, c: { ...cert, s: B43 } }],
    ['Zertifikat zu lang', { ...rawLead, c: { ...cert, d: 'x'.repeat(2001) } }],
    ['ohne Schlüssel', { ...rawLead, p: undefined }],
    ['Schlüsselteil falsch', { ...rawLead, p: { ...key, y: B87 } }],
    ['Zuschauerteil ungültig', { ...rawLead, t: 'x' }],
    ['ohne Konfiguration', { ...rawLead, g: undefined }],
  ])('Lead-Link ungültig: %s', (_, raw) => {
    expect(parseLinkPath(`/lead/${encode(raw)}`).kind).toBe('invalid');
  });

  const trainer: TrainerLinkData = {
    view,
    orgKey: key,
    config,
    teams: [
      { key: 'E1', name: 'Sportvg Feuerbach E1', homeColor: 'rot', awayColor: 'schwarz' },
      { key: 'E2', name: 'Sportvg Feuerbach E2', homeColor: 'rot', awayColor: 'weiss' },
    ],
  };

  it('Trainer-Link: kodieren, dekodieren und in eingefügtem Text finden', () => {
    const path = trainerLinkPath(trainer);
    expect(path.startsWith('/trainer/')).toBe(true);
    expect(parseLinkPath(path)).toEqual({ kind: 'trainer', trainer });
    expect(findLink(`Trainer-Link:\n${linkUrl('https://x.example/app/', path)}\n`)).toEqual({
      kind: 'trainer',
      trainer,
    });
    // Länge bleibt für WhatsApp handlich (contracts/live-link.md).
    expect(path.length).toBeLessThan(1400);
  });

  const rawTrainer = {
    ...rawView,
    q: key,
    g: config,
    m: [['E1', 'Sportvg Feuerbach E1', 'rot', 'schwarz']],
  };
  it.each([
    ['ohne Organisator-Schlüssel', { ...rawTrainer, q: undefined }],
    ['Schlüsselteil falsch', { ...rawTrainer, q: { ...key, d: B87 } }],
    ['ohne Konfiguration', { ...rawTrainer, g: undefined }],
    ['ohne Mannschaften', { ...rawTrainer, m: undefined }],
    ['leere Mannschaftsliste', { ...rawTrainer, m: [] }],
    [
      'zu viele Mannschaften',
      { ...rawTrainer, m: Array.from({ length: 7 }, (_, i) => [`E${i}`, `E${i}`, 'rot', 'rot']) },
    ],
    ['Mannschaft kein Array', { ...rawTrainer, m: ['E1'] }],
    ['Kurzlabel leer', { ...rawTrainer, m: [['', 'Sportvg Feuerbach E1', 'rot', 'rot']] }],
    ['Name zu lang', { ...rawTrainer, m: [['E1', 'x'.repeat(41), 'rot', 'rot']] }],
    ['Heimfarbe keine Zeichenkette', { ...rawTrainer, m: [['E1', 'E1', 1, 'rot']] }],
    ['Auswärtsfarbe keine Zeichenkette', { ...rawTrainer, m: [['E1', 'E1', 'rot', null]] }],
    ['Heimfarbe nicht aus der Palette', { ...rawTrainer, m: [['E1', 'E1', 'pink', 'rot']] }],
    ['Auswärtsfarbe nicht aus der Palette', { ...rawTrainer, m: [['E1', 'E1', 'rot', '#fff']] }],
    ['Zuschauerteil ungültig', { ...rawTrainer, k: 'x' }],
    [
      'doppeltes Kurzlabel',
      {
        ...rawTrainer,
        m: [
          ['E1', 'Sportvg Feuerbach E1', 'rot', 'rot'],
          ['E1', 'Feuerbach E1', 'rot', 'rot'],
        ],
      },
    ],
  ])('Trainer-Link ungültig: %s', (_, raw) => {
    expect(parseLinkPath(`/trainer/${encode(raw)}`).kind).toBe('invalid');
  });

  it('kaputtes base64url, kein JSON oder fremder Pfad ergeben "invalid"', () => {
    expect(parseLinkPath('/live/A').kind).toBe('invalid');
    expect(parseLinkPath(`/live/${textToBase64Url('{kein json')}`).kind).toBe('invalid');
    expect(parseLinkPath('/spiel/abc').kind).toBe('invalid');
    expect(parseLinkPath('').kind).toBe('invalid');
  });
});

describe('010 FR-H17 Teilen-Text der Eltern-Leiste', () => {
  const url = 'https://benztown711.github.io/feuerbach-torticker/#/live/abc';
  it('nennt Titel, Mannschaften und den Link', () => {
    expect(viewerShareText('Unser Spieltag', ['E1', 'E2'], url)).toBe(
      `Unser Spieltag live (Sportvg Feuerbach E1 und E2). Der Link gilt die ganze Saison: ${url}`,
    );
    expect(viewerShareText('Unser Spieltag', ['E1', 'E2', 'E3'], url)).toContain('(Sportvg Feuerbach E1, E2 und E3)');
  });
  it('ohne Mannschaften ohne Klammer', () => {
    expect(viewerShareText('Unser Spieltag', [], url)).toBe(
      `Unser Spieltag live. Der Link gilt die ganze Saison: ${url}`,
    );
  });
});
