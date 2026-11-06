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
  /** Kürzel stand schon so in der Liste ("Mü.", z. B. aus "Kader teilen"): bleibt unverändert (FR-028). */
  kept?: boolean;
}

export interface NameResult {
  name: string;
  duplicate: boolean;
}

const key = (s: string): string => s.toLocaleLowerCase('de');

/** Kürzel, wie die App es erzeugt: 1 bis 3 Buchstaben und Punkt ("Mü."). */
export const isAbbreviation = (word: string): boolean => /^\p{L}{1,3}\.$/u.test(word);

function build(first: string, abbr: string | null): string {
  if (abbr === null || abbr === '') return first.slice(0, MAX_NAME);
  const suffix = ` ${abbr}.`;
  return first.slice(0, MAX_NAME - suffix.length) + suffix;
}

/** Abkürzung mit k Buchstaben; der volle Nachname wird nie ausgeschrieben (mind. 1 Buchstabe weniger). */
function abbreviate(e: NameEntry, k: number): string | null {
  if (e.last === null || e.last === '') return null;
  if (e.kept) return e.last;
  const cap = e.fixed ? e.last.length : Math.max(1, e.last.length - 1);
  return e.last.slice(0, Math.min(k, cap));
}

function nameGroup(group: NameEntry[]): string[] {
  if (group.length === 1) {
    const e = group[0]!;
    return [build(e.first, e.kept ? e.last : null)];
  }
  const person = group.map((e) => key(e.last ?? ''));
  const maxLen = Math.max(1, ...group.map((e) => (e.last ?? '').length));
  const at = (len: number): string[] => group.map((e) => build(e.first, abbreviate(e, len)));
  const pinned = group.flatMap((e, i) => (e.fixed || e.kept ? [i] : []));
  const distinct = (idx: number[], f: (i: number) => string): number => new Set(idx.map(f)).size;
  const all = group.map((_, i) => i);
  /**
   * Verschiedene Nachnamen tragen nie denselben Namen; feste und unveränderte Kürzel desselben
   * Nachnamens bleiben gleich (sonst würde ein bestehender Spieler neben einem Kürzel still umbenannt).
   */
  const separates = (names: string[]): boolean => {
    const pair = (i: number) => `${key(names[i]!)}\n${person[i]}`;
    return (
      distinct(all, pair) === distinct(all, (i) => key(names[i]!)) &&
      distinct(pinned, pair) === distinct(pinned, (i) => person[i]!)
    );
  };
  let k = 1;
  while (k < maxLen && !separates(at(k))) k++;
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
