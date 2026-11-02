import { describe, expect, it } from 'vitest';
import palette from '../../design/trikot-farben.json' with { type: 'json' };
import {
  PALETTE,
  contrastRatio,
  defaultOppColor,
  defaultOwnColor,
  getColor,
  isPaletteColor,
  needsBorder,
  rememberColors,
} from '../../src/domain/jersey-colors';
import { defaultSettings } from '../../src/domain/settings';

describe('T090 FR-031 FR-032 Trikotfarben', () => {
  it('lädt die Palette aus design/trikot-farben.json', () => {
    expect(PALETTE.map((c) => c.id)).toEqual(palette.colors.map((c) => c.id));
    expect(isPaletteColor('rot')).toBe(true);
    expect(isPaletteColor('pink')).toBe(false);
    expect(getColor('rot')?.value).toBe('#eb1e25');
    expect(() => getColor('pink', true)).toThrow('Unbekannte Trikotfarbe: pink');
    expect(getColor('pink')).toBeUndefined();
  });

  it('FR-032 jede Schriftfarbe hat mind. 4,5:1 bzw. 3:1 bei fetter Schrift ab 24px', () => {
    for (const c of PALETTE) {
      const ratio = contrastRatio(c.value, c.text);
      expect(ratio, `${c.name}`).toBeGreaterThanOrEqual(3);
      if (ratio < 4.5) expect(c.id).toBe('rot');
    }
  });

  it('FR-032 Rahmen nur bei < 3:1 zum Hintergrund', () => {
    expect(needsBorder('weiss', 'light')).toBe(true);
    expect(needsBorder('gelb', 'light')).toBe(true);
    expect(needsBorder('rot', 'light')).toBe(false);
    expect(needsBorder('schwarz', 'light')).toBe(false);
    expect(needsBorder('schwarz', 'dark')).toBe(true);
    expect(needsBorder('weiss', 'dark')).toBe(false);
  });

  it('kurze Hex-Werte werden für den Kontrast korrekt erweitert', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 1);
  });

  it('FR-031 Vorgabe Feuerbach: Rot, nach einer Änderung die letzte Farbe', () => {
    const s = defaultSettings();
    expect(defaultOwnColor(s)).toBe('rot');
    expect(defaultOwnColor({ ...s, lastOwnColor: 'schwarz' })).toBe('schwarz');
    expect(defaultOwnColor({ ...s, lastOwnColor: 'gibtsnicht' })).toBe('rot');
  });

  it('FR-031 Vorgabe Gegner: gemerkte Farbe, sonst Schwarz, bei Feuerbach in Schwarz Weiß', () => {
    const s = { ...defaultSettings(), opponentColors: { 'tsv musterstadt': 'gelb' } };
    expect(defaultOppColor(s, '  TSV  Musterstadt ', 'rot')).toBe('gelb');
    expect(defaultOppColor(s, 'SV Beispiel', 'rot')).toBe('schwarz');
    expect(defaultOppColor(s, 'SV Beispiel', 'schwarz')).toBe('weiss');
  });

  it('rememberColors: lastOwnColor erst nach einer Änderung, Gegnerfarbe je Name', () => {
    const s = defaultSettings();
    const unchanged = rememberColors(s, { ownColor: 'rot', oppColor: 'blau', opponent: 'SV Beispiel' });
    expect(unchanged.lastOwnColor).toBeNull();
    expect(unchanged.opponentColors).toEqual({ 'sv beispiel': 'blau' });
    const changed = rememberColors(unchanged, { ownColor: 'schwarz', oppColor: 'weiss', opponent: 'TSV Musterstadt' });
    expect(changed.lastOwnColor).toBe('schwarz');
    const back = rememberColors(changed, { ownColor: 'rot', oppColor: 'weiss', opponent: 'TSV Musterstadt' });
    expect(back.lastOwnColor).toBe('rot');
  });
});
