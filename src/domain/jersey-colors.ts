import palette from '../../design/trikot-farben.json' with { type: 'json' };
import tokens from '../../design/tokens.json' with { type: 'json' };
import { normalizeName } from './validation';
import type { Settings } from './types';

export interface JerseyColor {
  id: string;
  name: string;
  value: string;
  text: string;
}

/** Feste Palette aus design/trikot-farben.json (FR-031, research.md R-15). */
export const PALETTE: JerseyColor[] = palette.colors.map(({ id, name, value, text }) => ({ id, name, value, text }));

export function getColor(id: string): JerseyColor | undefined;
export function getColor(id: string, strict: true): JerseyColor;
export function getColor(id: string, strict = false): JerseyColor | undefined {
  const c = PALETTE.find((x) => x.id === id);
  if (!c && strict) throw new Error(`Unbekannte Trikotfarbe: ${id}`);
  return c;
}

export const isPaletteColor = (id: string): boolean => getColor(id) !== undefined;

const channel = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((x) => x + x).join('') : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** Kontrastverhältnis nach WCAG 2.x. */
export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

const surface = (theme: 'light' | 'dark'): string =>
  (tokens.color.tokens.find((t) => t.name === 'surface') as { value: Record<'light' | 'dark', string> }).value[theme];

/** FR-032: Rahmen, wenn sich der Knopf weniger als 3:1 vom Hintergrund abhebt. */
export function needsBorder(id: string, theme: 'light' | 'dark'): boolean {
  return contrastRatio(getColor(id, true).value, surface(theme)) < 3;
}

/** FR-031: gemerkte Farbe des Gegners, sonst Schwarz; spielt Feuerbach in Schwarz, dann Weiß. */
export function defaultOppColor(settings: Settings, opponent: string, ownColor: string): string {
  const remembered = settings.opponentColors[normalizeName(opponent)];
  if (remembered && isPaletteColor(remembered)) return remembered;
  return ownColor === 'schwarz' ? 'weiss' : 'schwarz';
}

/** FR-031: Gegnerfarbe je Name merken; die eigene Farbe kommt aus der Mannschaft (Spec 004 FR-M03). */
export function rememberColors(settings: Settings, game: { oppColor: string; opponent: string }): Settings {
  return { ...settings, opponentColors: { ...settings.opponentColors, [normalizeName(game.opponent)]: game.oppColor } };
}

/**
 * Spec 017 FR-C12: Trikots eines Spiels ändern (nur Palettenfarben). Ungültige Farbe oder keine Änderung: dasselbe
 * Spiel (Aufrufer erkennen "nichts zu tun" an der Identität).
 */
export function setKits<G extends { ownColor: string; oppColor: string }>(game: G, own: string, opp: string): G {
  if (!isPaletteColor(own) || !isPaletteColor(opp)) return game;
  if (own === game.ownColor && opp === game.oppColor) return game;
  return { ...game, ownColor: own, oppColor: opp };
}
