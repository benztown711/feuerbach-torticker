import { activePlayers } from './roster';
import { MAX_NAME, abbreviationOf, firstNameOf, uniqueNames, type NameEntry } from './roster-names';
import type { ParseWarning, ParsedLine } from './roster-parse';
import type { Player } from './types';

/** Liste einfügen: Vorschau planen (FR-026) und zusammenführen statt ersetzen (FR-027). */

export type ImportWarning = ParseWarning | 'nachname' | 'nummer-doppelt' | 'name-doppelt' | 'name-leer';

export interface ImportRow {
  line: number;
  number: number | null;
  /** Vorgeschlagener, in der Vorschau editierbarer Anzeigename. */
  name: string;
  /** Bestehender Spieler (auch gelöscht), der aktualisiert wird; sonst neu. */
  matchId: string | null;
  revive: boolean;
  /** Ein Nachname stand in der Liste und wurde gekürzt oder verworfen (ein Kürzel wie "Mü." zählt nicht). */
  shortened: boolean;
  parseWarnings: ParseWarning[];
  warnings: ImportWarning[];
}

const key = (s: string): string => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('de');

function compatible(player: Player, line: ParsedLine): boolean {
  if (line.number !== null && player.number !== null && line.number !== player.number) return false;
  const abbr = abbreviationOf(player.name);
  if (abbr === null || line.lastName === null) return true;
  return key(line.lastName).startsWith(key(abbr));
}

function findMatch(candidates: Player[], line: ParsedLine): Player | undefined {
  const same = candidates.filter((p) => key(firstNameOf(p.name)) === key(line.firstName));
  if (line.number !== null) {
    const byNumber = same.find((p) => p.number === line.number);
    if (byNumber) return byNumber;
  }
  return same.find((p) => compatible(p, line));
}

/** Warnungen für (ggf. bearbeitete) Zeilen neu berechnen. */
export function annotateRows(existing: Player[], rows: ImportRow[]): ImportRow[] {
  const matched = new Set(rows.map((r) => r.matchId));
  const others = activePlayers(existing).filter((p) => !matched.has(p.id));
  const count = <T>(values: T[]) => values.reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map<T, number>());
  const numbers = count(rows.map((r) => r.number).filter((n) => n !== null));
  const names = count([...rows.map((r) => key(r.name)), ...others.map((p) => key(p.name))]);
  return rows.map((r) => {
    const warnings: ImportWarning[] = [...r.parseWarnings];
    if (r.shortened) warnings.push('nachname');
    if (r.number !== null && numbers.get(r.number)! > 1) warnings.push('nummer-doppelt');
    if (key(r.name) === '') warnings.push('name-leer');
    else if (names.get(key(r.name))! > 1) warnings.push('name-doppelt');
    return { ...r, warnings };
  });
}

export function planImport(existing: Player[], lines: ParsedLine[]): ImportRow[] {
  const free = [...existing];
  const matches = lines.map((line) => {
    const m = findMatch(free, line);
    if (m) free.splice(free.indexOf(m), 1);
    return m;
  });
  const matchedIds = new Set(matches.filter((m) => m).map((m) => m!.id));
  const outside = activePlayers(existing).filter((p) => !matchedIds.has(p.id));
  const entries: NameEntry[] = [
    ...lines.map((l, i) => {
      const m = matches[i];
      if (l.lastName === null && m) return { first: l.firstName, last: abbreviationOf(m.name), fixed: true };
      return { first: l.firstName, last: l.lastName, kept: l.abbreviated };
    }),
    ...outside.map((p) => ({ first: firstNameOf(p.name), last: abbreviationOf(p.name), fixed: true })),
  ];
  const names = uniqueNames(entries);
  const rows: ImportRow[] = lines.map((l, i) => ({
    line: l.line,
    number: l.number ?? matches[i]?.number ?? null,
    name: names[i]!.name,
    matchId: matches[i]?.id ?? null,
    revive: matches[i]?.deletedAt != null,
    shortened: l.lastName !== null && !l.abbreviated,
    parseWarnings: l.warnings,
    warnings: [],
  }));
  return annotateRows(existing, rows);
}

/**
 * Übernehmen: bestehende aktualisieren bzw. wiederbeleben, neue anlegen, nichts löschen.
 * Spec 015 FR-P23: mit `squadId` kommen alle Kinder der Liste in diesen Kader.
 */
export function applyImport(existing: Player[], rows: ImportRow[], newId: () => string, squadId?: string): Player[] {
  const result = [...existing];
  const squad = squadId === undefined ? {} : { squadId };
  for (const r of rows) {
    const name = r.name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME);
    if (name === '') continue;
    const i = r.matchId === null ? -1 : result.findIndex((p) => p.id === r.matchId);
    if (i >= 0) {
      const old = result[i]!;
      result[i] = { ...old, name, number: r.number ?? old.number, deletedAt: null, ...squad };
    } else {
      result.push({ id: newId(), name, number: r.number, deletedAt: null, ...squad });
    }
  }
  return result;
}
