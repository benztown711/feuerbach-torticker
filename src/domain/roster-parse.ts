/**
 * Liste einfügen (FR-025): ein Spieler pro Zeile, Nummer davor oder dahinter.
 * Nachnamen werden nur für die Vorschau gelesen und nie gespeichert.
 */

import { isAbbreviation } from './roster-names';

export type ParseWarning = 'nummer-ungueltig';

export interface ParsedLine {
  /** 1-basierte Zeilennummer in der eingefügten Liste. */
  line: number;
  number: number | null;
  firstName: string;
  /** Nur flüchtig für die Abkürzung; nie persistieren. */
  lastName: string | null;
  /** Statt eines Nachnamens steht schon ein Kürzel wie "Mü." da (FR-028: Text aus "Kader teilen"). */
  abbreviated: boolean;
  warnings: ParseWarning[];
}

const LEADING = /^#?\s*(\d+)\s*[.,:)\-–]?\s*(.*)$/u;
const TRAILING = /^(.*?)[\s,;\-–]+#?\s*(\d+)\.?$/u;

function parseLine(raw: string, line: number): ParsedLine | null {
  const text = raw.trim();
  if (text === '' || text.endsWith(':')) return null;
  let numberText: string | null = null;
  let rest = text;
  const lead = LEADING.exec(text);
  const trail = TRAILING.exec(text);
  if (lead) {
    numberText = lead[1]!;
    rest = lead[2]!;
  } else if (trail) {
    rest = trail[1]!;
    numberText = trail[2]!;
  }
  const words = rest
    .replace(/[^\p{L}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w));
  const [firstName, ...last] = words;
  if (!firstName) return null;
  const warnings: ParseWarning[] = [];
  let number: number | null = null;
  if (numberText !== null) {
    const n = Number(numberText);
    if (n >= 1 && n <= 99) number = n;
    else warnings.push('nummer-ungueltig');
  }
  const abbreviated = last.length === 1 && isAbbreviation(rest.trim().split(/\s+/).at(-1)!);
  return { line, number, firstName, lastName: last.length > 0 ? last.join(' ') : null, abbreviated, warnings };
}

export function parseRosterList(text: string): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map((raw, i) => parseLine(raw, i + 1))
    .filter((r): r is ParsedLine => r !== null);
}
