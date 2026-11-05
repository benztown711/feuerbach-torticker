import { MAX_NAME } from './roster-names';
import type { Player, RosterSort } from './types';

/** Kader (US5): gemeinsamer Pool, Löschen als Soft-Delete (FR-029). */

const clean = (name: string): string => name.trim().replace(/\s+/g, ' ');

export function validatePlayerName(name: string): string | null {
  const n = clean(name);
  if (n.length === 0) return 'Bitte einen Namen eintragen.';
  if (n.length > MAX_NAME) return `Höchstens ${MAX_NAME} Zeichen.`;
  return null;
}

/** FR-020: Hinweis "Bitte nur Vornamen", wenn ein zweites Wort kein Kürzel wie "Mü." ist. */
export function looksLikeFullName(name: string): boolean {
  const words = clean(name).split(' ');
  return words.length > 1 && !words.slice(1).every((w) => /^\p{L}{1,3}\.$/u.test(w));
}

export function addPlayer(players: Player[], input: { name: string; number: number | null }, id: string): Player[] {
  return [...players, { id, name: clean(input.name), number: input.number, deletedAt: null }];
}

export function updatePlayer(players: Player[], id: string, patch: { name: string; number: number | null }): Player[] {
  return players.map((p) => (p.id === id ? { ...p, name: clean(patch.name), number: patch.number } : p));
}

export function softDeletePlayer(players: Player[], id: string, now: number): Player[] {
  return players.map((p) => (p.id === id ? { ...p, deletedAt: now } : p));
}

/** Auch gelöschte Spieler, damit Torschützen alter Spiele lesbar bleiben. */
export const resolvePlayer = (players: Player[], id: string): Player | undefined => players.find((p) => p.id === id);

/** Spec 013 R-K1: Groß-/Kleinschreibung egal, Umlaute nach deutscher Regel ("Ömer" neben "Oskar"). */
const collator = new Intl.Collator('de', { sensitivity: 'base' });

const byName = (a: Player, b: Player): number => collator.compare(a.name, b.name);

/** Nach Nummer aufsteigend; ohne Nummer zuletzt. */
const byNumber = (a: Player, b: Player): number => {
  if (a.number === b.number) return 0;
  if (a.number === null) return 1;
  if (b.number === null) return -1;
  return a.number - b.number;
};

const COMPARE: Record<RosterSort, (a: Player, b: Player) => number> = {
  /** Spec 013 FR-K03: Vorname, bei Gleichstand Nummer. */
  name: (a, b) => byName(a, b) || byNumber(a, b),
  /** Spec 013 FR-K04: Nummer, ohne Nummer zuletzt, bei Gleichstand Vorname. */
  number: (a, b) => byNumber(a, b) || byName(a, b),
};

/** Spec 013 FR-K03, FR-K04, FR-K06: neue, sortierte Liste; die Eingabe bleibt unverändert. */
export const sortPlayers = (players: Player[], sort: RosterSort): Player[] => [...players].sort(COMPARE[sort]);

/** Nicht gelöschte Spieler, ohne Reihenfolge (z. B. für "Liste einfügen", Spec 013 R-K2). */
export const activePlayers = (players: Player[]): Player[] => players.filter((p) => p.deletedAt === null);

/** Sichtbarer Kader in der gewählten Reihenfolge (Spec 013 FR-K05). */
export const visiblePlayers = (players: Player[], sort: RosterSort): Player[] =>
  sortPlayers(activePlayers(players), sort);

/** FR-030: Aufgebot des Spiels; ohne Aufgebot der ganze Kader. */
export function squadPlayers(players: Player[], squad: string[], sort: RosterSort): Player[] {
  const visible = visiblePlayers(players, sort);
  return squad.length === 0 ? visible : visible.filter((p) => squad.includes(p.id));
}

/** FR-030: "Andere …" = sichtbarer Kader außerhalb des Aufgebots. */
export function otherPlayers(players: Player[], squad: string[], sort: RosterSort): Player[] {
  return squad.length === 0 ? [] : visiblePlayers(players, sort).filter((p) => !squad.includes(p.id));
}

/** FR-028: "Nummer Name" pro Zeile, wieder einlesbar über "Liste einfügen"; Reihenfolge nach Spec 013 FR-K05. */
export const rosterShareText = (players: Player[], sort: RosterSort): string =>
  visiblePlayers(players, sort)
    .map((p) => (p.number === null ? p.name : `${p.number} ${p.name}`))
    .join('\n');
