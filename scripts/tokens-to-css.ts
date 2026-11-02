/**
 * Erzeugt src/styles/tokens.css aus design/tokens.json (Design System der Sportvg Feuerbach).
 * Einzige Quelle für Farben, Schriften, Abstände und Radien (Constitution VII, FR-015).
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ColorToken {
  name: string;
  value: { light: string; dark: string };
  usage?: string;
}
export interface ValueToken {
  name: string;
  value: string;
  usage?: string;
}
export interface TypeStyle {
  name: string;
  fontSize: string;
  lineHeight: string | number;
  fontWeight: number;
  fontStyle?: string;
  letterSpacing?: string;
}
export interface DesignTokens {
  name: string;
  color: { tokens: ColorToken[] };
  type: {
    fonts: { family: string; file: string; weight: string; style: string }[];
    families: Record<string, string>;
    groups: { name: string; family: string; styles: TypeStyle[] }[];
  };
  spacing: { tokens: ValueToken[] };
  radius: { tokens: ValueToken[] };
}

/** Pfad der Schriftdateien relativ zu src/styles/tokens.css. */
const FONT_DIR = '../../design/fonts';

const colorVars = (tokens: DesignTokens, theme: 'light' | 'dark', indent: string): string =>
  tokens.color.tokens.map((t) => `${indent}--color-${t.name}: ${t.value[theme]};`).join('\n');

export function buildTokensCss(tokens: DesignTokens): string {
  const out: string[] = [];
  out.push(`/* ${tokens.name}: generiert aus design/tokens.json, nicht von Hand bearbeiten. */`, '');

  for (const f of tokens.type.fonts) {
    const file = f.file.replace(/^fonts\//, '');
    out.push(
      '@font-face {',
      `  font-family: '${f.family}';`,
      `  src: url('${FONT_DIR}/${file}') format('woff2');`,
      `  font-weight: ${f.weight};`,
      `  font-style: ${f.style};`,
      '  font-display: swap;',
      '}',
      '',
    );
  }

  out.push(':root {', '  color-scheme: light dark;');
  out.push(colorVars(tokens, 'light', '  '));
  for (const t of tokens.spacing.tokens) out.push(`  --${t.name}: ${t.value};`);
  for (const t of tokens.radius.tokens) out.push(`  --${t.name}: ${t.value};`);
  for (const [key, value] of Object.entries(tokens.type.families)) out.push(`  --font-${key}: ${value};`);
  out.push('}', '');

  out.push(
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) {',
    colorVars(tokens, 'dark', '    '),
    '  }',
    '}',
    '',
  );

  out.push(':root[data-theme="light"] {', '  color-scheme: light;', colorVars(tokens, 'light', '  '), '}', '');

  for (const group of tokens.type.groups) {
    for (const s of group.styles) {
      out.push(`.t-${s.name} {`);
      out.push(`  font-family: var(--font-${group.family});`);
      out.push(`  font-size: ${s.fontSize};`);
      out.push(`  line-height: ${s.lineHeight};`);
      out.push(`  font-weight: ${s.fontWeight};`);
      if (s.fontStyle) out.push(`  font-style: ${s.fontStyle};`);
      if (s.letterSpacing) out.push(`  letter-spacing: ${s.letterSpacing};`);
      out.push('}', '');
    }
  }
  return out.join('\n');
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const tokens = JSON.parse(readFileSync(resolve(root, 'design/tokens.json'), 'utf8')) as DesignTokens;
  writeFileSync(resolve(root, 'src/styles/tokens.css'), buildTokensCss(tokens));
  // Lizenz der Schriften und Logos mit ausliefern (SIL OFL verlangt die Lizenz bei Weitergabe).
  mkdirSync(resolve(root, 'public/fonts'), { recursive: true });
  copyFileSync(resolve(root, 'design/fonts/OFL.txt'), resolve(root, 'public/fonts/OFL.txt'));
  mkdirSync(resolve(root, 'public/brand'), { recursive: true });
  for (const svg of ['wappen.svg', 'lockup-fussball.svg']) {
    copyFileSync(resolve(root, 'design/brand', svg), resolve(root, 'public/brand', svg));
  }
  console.log('src/styles/tokens.css erzeugt');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
