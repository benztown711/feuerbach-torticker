import { describe, expect, it } from 'vitest';
import { fromBase64Url, toBase64Url } from '../../src/domain/base64url';
import { decodeShortTrainer, encodeShortTrainer, type ShortTrainerData } from '../../src/domain/live-link-short';
import { findLink, linkUrl, parseLinkPath, shortTrainerLinkPath } from '../../src/domain/live-link';
import type { TeamDetail } from '../../src/domain/types';

/** Echte Längen: Topic 16 Byte, Schlüssel 32 Byte, öffentlicher Schlüssel 65 Byte (0x04, x, y). */
const bytes = (n: number, start: number): Uint8Array => Uint8Array.from({ length: n }, (_, i) => (start + i) % 256);
const x = bytes(32, 10);
const y = bytes(32, 50);
const pub = new Uint8Array(65);
pub[0] = 4;
pub.set(x, 1);
pub.set(y, 33);

const E1: TeamDetail = ['E1', 'Sportvg Feuerbach E1', 'rot', 'schwarz'];
const E2: TeamDetail = ['E2', 'Sportvg Feuerbach E2', 'rot', 'weiss'];

const short: ShortTrainerData = {
  view: {
    topic: toBase64Url(bytes(16, 1)),
    viewKey: toBase64Url(bytes(32, 100)),
    orgPub: toBase64Url(pub),
    title: 'Unser Spieltag',
  },
  orgKey: { d: toBase64Url(bytes(32, 200)), x: toBase64Url(x), y: toBase64Url(y) },
  config: { title: 'Unser Spieltag', teams: ['E1', 'E2'], iat: 1_762_420_000_123 },
  teams: [E1, E2],
};

const roundTrip = (s: ShortTrainerData) => decodeShortTrainer(fromBase64Url(encodeShortTrainer(s)));
const BASE = 'https://benztown711.github.io/feuerbach-torticker/';

describe('006 FR-L02 kurzer Trainer-Link (research.md R-L20)', () => {
  it('kodiert und dekodiert verlustfrei, auch mit Umlauten', () => {
    expect(roundTrip(short)).toEqual(short);
    const umlaut = { ...short, view: { ...short.view, title: 'Spieltag Größe' } };
    const withTitle = { ...umlaut, config: { ...umlaut.config, title: 'Spieltag Größe' } };
    expect(roundTrip(withTitle)).toEqual(withTitle);
  });

  it('ist kurz genug für WhatsApp: unter 420 Zeichen mit zwei Mannschaften', () => {
    const url = linkUrl(BASE, shortTrainerLinkPath(short));
    expect(url.startsWith(`${BASE}#/trainer/`)).toBe(true);
    expect(url.length).toBeLessThan(420);
  });

  it('nimmt Mannschaftsdetails der Konfiguration mit, gleich oder abweichend, und das Kennzeichen "neu ausgestellt"', () => {
    const same = { ...short, config: { ...short.config, m: [E1, E2] } };
    expect(roundTrip(same)).toEqual(same);
    const E3: TeamDetail = ['E3', 'Sportvg Feuerbach E3', 'blau', 'weiss'];
    const other = { ...short, config: { ...short.config, teams: ['E1', 'E2', 'E3'], m: [E1, E2, E3] } };
    expect(roundTrip(other)).toEqual(other);
    const retired = { ...short, config: { ...short.config, retired: true as const } };
    expect(roundTrip(retired)).toEqual(retired);
    const empty = { ...short, config: { ...short.config, m: [] } };
    expect(roundTrip(empty)).toEqual(empty);
  });

  it('wird in Link und eingefügtem Text erkannt, der lange Trainer-Link bleibt gültig', () => {
    const path = shortTrainerLinkPath(short);
    expect(parseLinkPath(path)).toEqual({ kind: 'trainerShort', short });
    expect(findLink(`Trainer-Link für "Unser Spieltag":\n${linkUrl(BASE, path)}`)).toEqual({
      kind: 'trainerShort',
      short,
    });
  });

  it('lehnt abgeschnittene, verlängerte und kaputte Links ab', () => {
    const data = encodeShortTrainer(short);
    expect(parseLinkPath(`/trainer/${data.slice(0, 200)}`)).toEqual({ kind: 'invalid' });
    expect(parseLinkPath(`/trainer/${data}AAAA`)).toEqual({ kind: 'invalid' });
    expect(parseLinkPath('/trainer/A')).toEqual({ kind: 'invalid' }); // kein base64url
    expect(parseLinkPath('/trainer/')).toEqual({ kind: 'invalid' });
  });

  it('lehnt Formfehler im Inhalt ab', () => {
    const raw = fromBase64Url(encodeShortTrainer(short));
    const broken = (patch: (b: Uint8Array) => void): ReturnType<typeof decodeShortTrainer> => {
      const b = Uint8Array.from(raw);
      patch(b);
      return decodeShortTrainer(b);
    };
    const flags = 1 + 22 + 32 + 64 + 32 + 6;
    const titleLen = flags + 1;
    const keyCount = titleLen + 1 + 'Unser Spieltag'.length;
    const teamCount = keyCount + 1 + 3 + 3;
    expect(broken((b) => (b[0] = 3))).toBeNull(); // anderes Format
    expect(broken((b) => (b[1] = 0x2b))).toBeNull(); // "+" im Topic
    expect(broken((b) => (b[titleLen] = 0))).toBeNull(); // leerer Titel
    expect(broken((b) => b.fill(0x20, titleLen + 1, keyCount))).toBeNull(); // Titel nur aus Leerzeichen
    expect(broken((b) => (b[titleLen + 1] = 0xff))).toBeNull(); // kein UTF-8
    expect(broken((b) => (b[keyCount] = 0))).toBeNull(); // keine Mannschaft in der Konfiguration
    expect(broken((b) => (b[keyCount] = 7))).toBeNull(); // zu viele
    expect(broken((b) => (b[teamCount] = 0))).toBeNull(); // keine Mannschaft im Link
    // Trikotfarbe außerhalb der Palette ("rot" → "rox")
    const colorAt = teamCount + 1 + 3 + 21 + 3;
    expect(broken((b) => (b[colorAt] = 0x78))).toBeNull();
    const away = colorAt + 1;
    expect(broken((b) => (b[away + 1] = 0x78))).toBeNull();
    // Flag "Details folgen", aber nichts folgt
    expect(broken((b) => (b[flags] = 1))).toBeNull();
  });

  it('lehnt doppelte Kurzlabel ab', () => {
    const twice = { ...short, teams: [E1, E1] };
    expect(roundTrip(twice)).toBeNull();
  });
});
