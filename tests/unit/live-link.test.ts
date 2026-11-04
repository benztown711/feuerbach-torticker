import { describe, expect, it } from 'vitest';
import {
  fromBase64Url,
  isBase64Url,
  textFromBase64Url,
  textToBase64Url,
  toBase64Url,
} from '../../src/domain/base64url';
import { findLink, leadLinkPath, linkUrl, parseLinkPath, viewerLinkPath } from '../../src/domain/live-link';
import type { PrivateKeyParts, SignedData, ViewerLink } from '../../src/domain/types';

const B43 = 'A'.repeat(42) + 'Q'; // 32 Byte
const B86 = 'B'.repeat(85) + 'A'; // 64 Byte
const B87 = 'C'.repeat(86) + 'A'; // 65 Byte
const view: ViewerLink = { topic: 'abcdefghijklmnopqrstuv', viewKey: B43, orgPub: B87, title: 'Unser Spieltag' };
const cert: SignedData = { d: '{"key":"E2"}', s: B86 };
const key: PrivateKeyParts = { d: B43, x: B43, y: B43 };
const config: SignedData = { d: '{"title":"Unser Spieltag"}', s: B86 };

const encode = (o: unknown): string => textToBase64Url(JSON.stringify(o));
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

  it('kaputtes base64url, kein JSON oder fremder Pfad ergeben "invalid"', () => {
    expect(parseLinkPath('/live/A').kind).toBe('invalid');
    expect(parseLinkPath(`/live/${textToBase64Url('{kein json')}`).kind).toBe('invalid');
    expect(parseLinkPath('/spiel/abc').kind).toBe('invalid');
    expect(parseLinkPath('').kind).toBe('invalid');
  });
});
