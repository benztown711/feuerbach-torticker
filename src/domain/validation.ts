import { isPaletteColor } from './jersey-colors';
import type { NewGameInput, Schema } from './types';

export interface ValidationResult {
  ok: boolean;
  value: NewGameInput;
  errors: Partial<Record<'ownTeam' | 'opponent' | 'schema' | 'ownColor' | 'oppColor', string>>;
}

const isIntIn = (n: number, lo: number, hi: number): boolean => Number.isInteger(n) && n >= lo && n <= hi;

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

const nameError = (value: string, missing: string): string | null => {
  if (value.length === 0) return missing;
  if (value.length > 40) return 'Höchstens 40 Zeichen.';
  return null;
};

export function validateSchema(schema: Schema): string | null {
  if (!isIntIn(schema.sections, 1, 4)) return 'Abschnitte: 1 bis 4.';
  if (!isIntIn(schema.sectionMinutes, 1, 60)) return 'Minuten: 1 bis 60.';
  return null;
}

/** FR-001, FR-002, FR-014, FR-031. */
export function validateNewGame(input: NewGameInput): ValidationResult {
  const value: NewGameInput = { ...input, ownTeam: input.ownTeam.trim(), opponent: input.opponent.trim() };
  const errors: ValidationResult['errors'] = {};
  const own = nameError(value.ownTeam, 'Bitte den eigenen Mannschaftsnamen eintragen.');
  if (own) errors.ownTeam = own;
  const opp = nameError(value.opponent, 'Bitte den Gegner eintragen.');
  if (opp) errors.opponent = opp;
  const schema = validateSchema(value.schema);
  if (schema) errors.schema = schema;
  if (!isPaletteColor(value.ownColor)) errors.ownColor = 'Unbekannte Farbe.';
  if (!isPaletteColor(value.oppColor)) errors.oppColor = 'Unbekannte Farbe.';
  return { ok: Object.keys(errors).length === 0, value, errors };
}

export function validateOpponentScorerText(text: string): string | null {
  const t = text.trim();
  if (t.length === 0) return 'Leer.';
  if (t.length > 30) return 'Höchstens 30 Zeichen.';
  return null;
}

export function validatePlayerNumber(n: number | null): string | null {
  if (n === null || isIntIn(n, 1, 99)) return null;
  return 'Nummer 1 bis 99.';
}
