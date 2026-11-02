import { describe, expect, it } from 'vitest';
import tokens from '../../design/tokens.json' with { type: 'json' };
import { buildTokensCss, type DesignTokens } from '../../scripts/tokens-to-css';

const css = buildTokensCss(tokens as DesignTokens);

const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  expect(start, `Block ${selector} fehlt`).toBeGreaterThanOrEqual(0);
  const end = css.indexOf('}', start);
  return css.slice(start, end);
};

describe('T005 FR-015 FR-018 tokens-to-css', () => {
  it('FR-015 erzeugt für jede Farbe eine CSS-Variable mit hellem Wert in :root', () => {
    const root = block(':root');
    for (const t of tokens.color.tokens) {
      expect(root).toContain(`--color-${t.name}: ${t.value.light};`);
    }
  });

  it('FR-018 setzt die dunklen Werte unter prefers-color-scheme: dark, außer bei data-theme="light"', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    const dark = block(':root:not([data-theme="light"])');
    for (const t of tokens.color.tokens) {
      expect(dark).toContain(`--color-${t.name}: ${t.value.dark};`);
    }
  });

  it('FR-018 [data-theme="light"] erzwingt die hellen Werte', () => {
    const light = block(':root[data-theme="light"]');
    for (const t of tokens.color.tokens) {
      expect(light).toContain(`--color-${t.name}: ${t.value.light};`);
    }
  });

  it('FR-018 [data-theme="dark"] erzwingt die dunklen Werte (Einstellung "Dunkel")', () => {
    const dark = block(':root[data-theme="dark"]');
    expect(dark).toContain('color-scheme: dark;');
    for (const t of tokens.color.tokens) {
      expect(dark).toContain(`--color-${t.name}: ${t.value.dark};`);
    }
  });

  it('FR-015 erzeugt Abstände, Radien und Schriftfamilien als Variablen', () => {
    const root = block(':root');
    for (const t of tokens.spacing.tokens) expect(root).toContain(`--${t.name}: ${t.value};`);
    for (const t of tokens.radius.tokens) expect(root).toContain(`--${t.name}: ${t.value};`);
    expect(root).toContain(`--font-sans: ${tokens.type.families.sans};`);
    expect(root).toContain(`--font-display: ${tokens.type.families.display};`);
  });

  it('FR-015 erzeugt für jeden Typo-Stil eine Klasse .t-<name>', () => {
    for (const group of tokens.type.groups) {
      for (const style of group.styles) {
        const cls = block(`.t-${style.name}`);
        expect(cls).toContain(`font-family: var(--font-${group.family});`);
        expect(cls).toContain(`font-size: ${style.fontSize};`);
        expect(cls).toContain(`font-weight: ${style.fontWeight};`);
      }
    }
  });

  it('bindet die Schriftdateien selbst gehostet per @font-face ein (Prinzip II/VII)', () => {
    for (const f of tokens.type.fonts) {
      const file = f.file.replace(/^fonts\//, '');
      expect(css).toContain(`url('../../design/fonts/${file}')`);
    }
    expect(css).not.toMatch(/fonts\.googleapis|https?:\/\//);
  });
});
