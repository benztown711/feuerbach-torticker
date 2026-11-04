/**
 * Kontrastmatrix für beide Themes (SC-006). Paare und Schwellen aus design/README.md.
 * Normale Schrift 4,5:1, große Schrift (ab 24px fett) 3:1.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DesignTokens } from './tokens-to-css';

export interface Pair {
  fg: string;
  bg: string;
  min: 4.5 | 3;
  where: string;
}

export const PAIRS: Pair[] = [
  { fg: 'on-rot', bg: 'vereinsrot', min: 3, where: 'Tor-Knopf Feuerbach (Schrift ab 24px fett)' },
  { fg: 'surface', bg: 'ink', min: 4.5, where: 'Tor-Knopf Gegner' },
  { fg: 'ink', bg: 'surface', min: 4.5, where: 'Text auf Hintergrund' },
  { fg: 'ink', bg: 'surface-alt', min: 4.5, where: 'Torliste, Undo-Leiste' },
  { fg: 'ink-muted', bg: 'surface', min: 4.5, where: 'Nebentext' },
  { fg: 'ink-muted', bg: 'surface-alt', min: 4.5, where: 'Meta-Angaben in Listen' },
  { fg: 'rot-text', bg: 'surface', min: 4.5, where: 'Nachspielzeit, Links' },
  { fg: 'rot-text', bg: 'surface-alt', min: 4.5, where: 'Links in Listen' },
  {
    fg: 'on-rot',
    bg: 'rot-tief',
    min: 4.5,
    where: 'Hinweis Halbzeit/Abpfiff, kleine Buttons, Hilfe: Fundstelle dunkel',
  },
  { fg: 'ink', bg: 'rot-hell', min: 4.5, where: 'Hinweisboxen, Hilfe: Fundstelle hell' },
  { fg: 'ink-muted', bg: 'rot-hell', min: 4.5, where: 'Dashboard: hervorgehobene Karte (neues Tor)' },
  { fg: 'rot-text', bg: 'rot-hell', min: 4.5, where: 'Dashboard: Minute in hervorgehobener Karte' },
  { fg: 'on-rot', bg: 'rot-dunkel', min: 4.5, where: 'Fußleisten' },
];

const channel = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((x) => x + x).join('') : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * channel(r ?? 0) + 0.7152 * channel(g ?? 0) + 0.0722 * channel(b ?? 0);
};

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

export interface Result extends Pair {
  theme: 'light' | 'dark';
  ratio: number;
  ok: boolean;
}

export function checkContrast(tokens: DesignTokens, theme: 'light' | 'dark'): Result[] {
  const value = (name: string): string => {
    const t = tokens.color.tokens.find((x) => x.name === name);
    if (!t) throw new Error(`Farbtoken ${name} fehlt`);
    return t.value[theme];
  };
  return PAIRS.map((p) => {
    const ratio = contrastRatio(value(p.fg), value(p.bg));
    return { ...p, theme, ratio, ok: ratio >= p.min };
  });
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const tokens = JSON.parse(readFileSync(resolve(root, 'design/tokens.json'), 'utf8')) as DesignTokens;
  let failed = 0;
  for (const theme of ['light', 'dark'] as const) {
    for (const r of checkContrast(tokens, theme)) {
      const mark = r.ok ? 'ok ' : 'FEHLER';
      if (!r.ok) failed++;
      console.log(
        `${mark} ${theme.padEnd(5)} ${`${r.fg} auf ${r.bg}`.padEnd(28)} ${r.ratio.toFixed(2)}:1 (min ${r.min}) ${r.where}`,
      );
    }
  }
  if (failed) {
    console.error(`${failed} Kontrastpaar(e) unter der Schwelle (SC-006).`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
