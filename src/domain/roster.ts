import { MAX_NAME, isAbbreviation } from './roster-names';
import type { Player } from './types';

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
  return words.length > 1 && !words.slice(1).every(isAbbreviation);
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

const byNumberThenName = (a: Player, b: Player): number => {
  if (a.number !== b.number) {
    if (a.number === null) return 1;
    if (b.number === null) return -1;
    return a.number - b.number;
  }
  return a.name.localeCompare(b.name, 'de');
};

/** Sichtbarer Kader, sortiert nach Nummer, dann Name; ohne Nummer zuletzt. */
export const visiblePlayers = (players: Player[]): Player[] =>
  players.filter((p) => p.deletedAt === null).sort(byNumberThenName);

/** FR-030: Aufgebot des Spiels; ohne Aufgebot der ganze Kader. */
export function squadPlayers(players: Player[], squad: string[]): Player[] {
  const visible = visiblePlayers(players);
  return squad.length === 0 ? visible : visible.filter((p) => squad.includes(p.id));
}

/** FR-030: "Andere …" = sichtbarer Kader außerhalb des Aufgebots. */
export function otherPlayers(players: Player[], squad: string[]): Player[] {
  return squad.length === 0 ? [] : visiblePlayers(players).filter((p) => !squad.includes(p.id));
}

/** FR-028: "Nummer Name" pro Zeile, wieder einlesbar über "Liste einfügen". */
export const rosterShareText = (players: Player[]): string =>
  visiblePlayers(players)
    .map((p) => (p.number === null ? p.name : `${p.number} ${p.name}`))
    .join('\n');
