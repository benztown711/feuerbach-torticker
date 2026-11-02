/**
 * Eindeutige Anzeigenamen (FR-020, FR-025): Vorname, bei gleichen Vornamen ergänzt um die
 * kürzeste eindeutige Nachnamen-Abkürzung ("Max Mü.", "Max Me."). Nie ein voller Nachname.
 */

export const MAX_NAME = 24;

export interface NameEntry {
  first: string;
  /** Nachname (Import) oder bestehende Abkürzung ohne Punkt (fixed). */
  last: string | null;
  /** Bestehende Abkürzung eines gespeicherten Spielers: wird nicht verlängert. */
  fixed?: boolean;
}

export interface NameResult {
  name: string;
  duplicate: boolean;
}

const key = (s: string): string => s.toLocaleLowerCase('de');

function build(first: string, abbr: string | null): string {
  if (abbr === null || abbr === '') return first.slice(0, MAX_NAME);
  const suffix = ` ${abbr}.`;
  return first.slice(0, MAX_NAME - suffix.length) + suffix;
}

/** Abkürzung mit k Buchstaben; der volle Nachname wird nie ausgeschrieben (mind. 1 Buchstabe weniger). */
function abbreviate(e: NameEntry, k: number): string | null {
  if (e.last === null || e.last === '') return null;
  const cap = e.fixed ? e.last.length : Math.max(1, e.last.length - 1);
  return e.last.slice(0, Math.min(k, cap));
}

function nameGroup(group: NameEntry[]): string[] {
  if (group.length === 1) return [build(group[0]!.first, null)];
  const distinctPeople = new Set(group.map((e) => key(e.last ?? ''))).size;
  const maxLen = Math.max(1, ...group.map((e) => (e.last ?? '').length));
  let k = 1;
  const at = (len: number): string[] => group.map((e) => build(e.first, abbreviate(e, len)));
  while (k < maxLen && new Set(at(k).map(key)).size < distinctPeople) k++;
  return at(k);
}

export function uniqueNames(entries: NameEntry[]): NameResult[] {
  const groups = new Map<string, number[]>();
  entries.forEach((e, i) => groups.set(key(e.first), [...(groups.get(key(e.first)) ?? []), i]));
  const out: string[] = new Array<string>(entries.length);
  for (const idx of groups.values()) {
    nameGroup(idx.map((i) => entries[i]!)).forEach((name, j) => (out[idx[j]!] = name));
  }
  const counts = new Map<string, number>();
  out.forEach((n) => counts.set(key(n), (counts.get(key(n)) ?? 0) + 1));
  return out.map((name) => ({ name, duplicate: counts.get(key(name))! > 1 }));
}

/** Vorname eines gespeicherten Anzeigenamens. */
export const firstNameOf = (name: string): string => name.trim().split(/\s+/)[0]!;

/** Abkürzung eines gespeicherten Anzeigenamens ohne Punkt ("Max Mü." → "Mü"), sonst null. */
export function abbreviationOf(name: string): string | null {
  const rest = name.trim().split(/\s+/).slice(1).join(' ').replace(/\.$/, '');
  return rest === '' ? null : rest;
}
