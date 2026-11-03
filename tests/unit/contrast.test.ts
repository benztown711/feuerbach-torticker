import { describe, expect, it } from 'vitest';
import tokens from '../../design/tokens.json' with { type: 'json' };
import type { DesignTokens } from '../../scripts/tokens-to-css';
import { PAIRS, contrastRatio, checkContrast } from '../../scripts/check-contrast';

describe('T011 SC-006 Kontrastmatrix', () => {
  it('berechnet Kontraste nach WCAG 2.x', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('enthält die Paare des Spielbildschirms aus design/README.md', () => {
    const names = PAIRS.map((p) => `${p.fg}/${p.bg}`);
    expect(names).toEqual(
      expect.arrayContaining([
        'on-rot/vereinsrot',
        'surface/ink',
        'ink/surface',
        'ink/surface-alt',
        'ink-muted/surface',
        'rot-text/surface',
        'on-rot/rot-tief',
      ]),
    );
  });

  it('Spec 005 SC-G01 enthält die Paare der Karten, Grundfläche, ruhigen Knöpfe und Felder', () => {
    const names = PAIRS.map((p) => `${p.fg}/${p.bg}`);
    expect(names).toEqual(
      expect.arrayContaining([
        'ink/card',
        'ink-muted/card',
        'rot-text/card',
        'ink/canvas',
        'ink-muted/canvas',
        'ink/tonal',
        'ink/field',
        'ink-muted/field',
      ]),
    );
  });

  for (const theme of ['light', 'dark'] as const) {
    it(`SC-006 alle Paare erfüllen ihre Schwelle im Theme ${theme}`, () => {
      const results = checkContrast(tokens as DesignTokens, theme);
      const failures = results.filter((r) => !r.ok).map((r) => `${r.fg}/${r.bg} ${r.ratio.toFixed(2)} < ${r.min}`);
      expect(failures).toEqual([]);
    });
  }
});
