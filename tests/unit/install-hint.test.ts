import { describe, expect, it } from 'vitest';
import { installPlatform, installSteps, showInstallHint } from '../../src/domain/install-hint';

/** Spec 022 US1 (FR-F01 bis FR-F04, R-F1, R-F2): Installationshinweis auf dem Startbildschirm. */

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const IPADOS_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const MAC = IPADOS_DESKTOP;
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

describe('022 US1-S2 bis US1-S4 FR-F02 Plattform und Anleitung', () => {
  it('iPhone und iPad sind iOS', () => {
    expect(installPlatform(IPHONE, 5)).toBe('ios');
    expect(installPlatform(IPAD, 5)).toBe('ios');
  });

  it('iPadOS im Desktop-Modus (Macintosh mit Touch) ist iOS, ein Mac ohne Touch nicht', () => {
    expect(installPlatform(IPADOS_DESKTOP, 5)).toBe('ios');
    expect(installPlatform(MAC, 0)).toBe('other');
    expect(installPlatform(MAC)).toBe('other');
  });

  it('Android und alles andere', () => {
    expect(installPlatform(ANDROID, 5)).toBe('android');
    expect(installPlatform(WINDOWS, 0)).toBe('other');
    expect(installPlatform('', 0)).toBe('other');
  });

  it('Wortlaut wie in der Spec', () => {
    expect(installSteps('ios')).toBe('In Safari auf „Teilen“ tippen, dann „Zum Home-Bildschirm“.');
    expect(installSteps('android')).toBe('Im Browser-Menü (drei Punkte) „App installieren“ wählen.');
    expect(installSteps('other')).toBe('Im Menü des Browsers „App installieren“ oder „Zum Home-Bildschirm“ wählen.');
  });
});

describe('022 US1-S1 US1-S5 US1-S6 US1-S7 FR-F01 FR-F03 FR-F04 Sichtbarkeit', () => {
  const base = { standalone: false, dismissedAt: null, laterDay: null, today: '2026-11-18' };

  it('im Browser, nichts weggeklickt: sichtbar', () => {
    expect(showInstallHint(base)).toBe(true);
  });

  it('als installierte App nie', () => {
    expect(showInstallHint({ ...base, standalone: true })).toBe(false);
  });

  it('"Verstanden" in den Einstellungen blendet dauerhaft aus', () => {
    expect(showInstallHint({ ...base, dismissedAt: Date.UTC(2026, 10, 1) })).toBe(false);
  });

  it('"Später" gilt für den Kalendertag, am nächsten Tag kommt der Hinweis wieder', () => {
    expect(showInstallHint({ ...base, laterDay: '2026-11-18' })).toBe(false);
    expect(showInstallHint({ ...base, laterDay: '2026-11-17' })).toBe(true);
    // Uhr zurückgestellt: nur genau der Tag zählt, sonst bliebe der Hinweis womöglich lange weg.
    expect(showInstallHint({ ...base, laterDay: '2026-11-19' })).toBe(true);
  });
});
