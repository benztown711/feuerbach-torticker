import { rosterShareText } from './roster';
import type { Player, RosterSort, Settings, Squad, Team } from './types';

/**
 * Spec 015 US5: benannte Kader wie "E1/E2" und "E3". Jedes Kind gehört zu genau einem Kader, jede Mannschaft spielt
 * mit einem Kader. Ohne gespeicherte Kader gibt es genau einen ("Kader"); dann bleibt alles wie bisher.
 */

export const DEFAULT_SQUAD: Squad = { id: 'kader', name: 'Kader' };
export const MAX_SQUADS = 6;
export const MAX_SQUAD_NAME = 20;

const clean = (s: string): string => s.trim().replace(/\s+/g, ' ');
const key = (s: string): string => clean(s).toLocaleLowerCase('de');

/** FR-P20: Kader dieses Handys. */
export const squadsOf = (s: Pick<Settings, 'squads'>): Squad[] =>
  s.squads && s.squads.length > 0 ? s.squads : [DEFAULT_SQUAD];

/** Mehr als ein Kader: erst dann zeigt die App Kader-Auswahl, Umschalter und "Weitere Kinder". */
export const hasSquads = (squads: readonly Squad[]): boolean => squads.length > 1;

const resolve = (squads: readonly Squad[], id: string | undefined): string =>
  squads.some((q) => q.id === id) ? id! : squads[0]!.id;

export const squadOfPlayer = (squads: readonly Squad[], p: Player): string => resolve(squads, p.squadId);

/** FR-P21: Vorgabe ist der erste Kader. */
export const squadOfTeam = (squads: readonly Squad[], t: Team): string => resolve(squads, t.squadId);

export const squadName = (squads: readonly Squad[], id: string): string =>
  (squads.find((q) => q.id === id) ?? squads[0]!).name;

/** Nicht gelöschte Kinder eines Kaders. */
export const inSquad = (squads: readonly Squad[], players: readonly Player[], id: string): Player[] =>
  players.filter((p) => p.deletedAt === null && squadOfPlayer(squads, p) === id);

/** "Spielt mit diesem Kader: …". */
export const teamsWith = (squads: readonly Squad[], teams: readonly Team[], id: string): Team[] =>
  teams.filter((t) => squadOfTeam(squads, t) === id);

export const findSquad = (squads: readonly Squad[], name: string): Squad | undefined =>
  squads.find((q) => key(q.name) === key(name));

/** Name 1 bis 20 Zeichen, eindeutig ohne Groß- und Kleinschreibung. */
export function validateSquadName(squads: readonly Squad[], name: string, exceptId?: string): string | null {
  const n = clean(name);
  if (n.length === 0) return 'Bitte einen Namen eintragen.';
  if (n.length > MAX_SQUAD_NAME) return `Höchstens ${MAX_SQUAD_NAME} Zeichen.`;
  const same = findSquad(squads, n);
  return same && same.id !== exceptId ? 'Diesen Kader gibt es schon.' : null;
}

export function addSquad(squads: readonly Squad[], name: string, id: string): Squad[] | null {
  if (squads.length >= MAX_SQUADS || validateSquadName(squads, name) !== null) return null;
  return [...squads, { id, name: clean(name) }];
}

export function renameSquad(squads: readonly Squad[], id: string, name: string): Squad[] | null {
  if (!squads.some((q) => q.id === id) || validateSquadName(squads, name, id) !== null) return null;
  return squads.map((q) => (q.id === id ? { ...q, name: clean(name) } : q));
}

/** Nur ein leerer Kader, und es bleibt mindestens einer. */
export function removeSquad(squads: readonly Squad[], players: readonly Player[], id: string): Squad[] | null {
  if (!hasSquads(squads) || !squads.some((q) => q.id === id) || inSquad(squads, players, id).length > 0) return null;
  return squads.filter((q) => q.id !== id);
}

export const movePlayer = (players: readonly Player[], id: string, squadId: string): Player[] =>
  players.map((p) => (p.id === id ? { ...p, squadId } : p));

/** FR-P22: Aufgebot mit den Kindern des Kaders der Mannschaft, die übrigen als "Weitere Kinder". */
export function squadSplit(squads: readonly Squad[], visible: Player[], team: Team): { own: Player[]; more: Player[] } {
  if (!hasSquads(squads)) return { own: visible, more: [] };
  const id = squadOfTeam(squads, team);
  return {
    own: visible.filter((p) => squadOfPlayer(squads, p) === id),
    more: visible.filter((p) => squadOfPlayer(squads, p) !== id),
  };
}

// ---------- FR-P23: Kader teilen und Liste einfügen ----------

/** "Kader E3:" – der Doppelpunkt lässt ältere App-Stände die Zeile wie eine Überschrift überspringen. */
const HEADER = /^Kader\s+(.+?)\s*:$/iu;

/** Kadername aus der ersten nicht leeren Zeile ("Kader E3:"), sonst null. */
export function listSquadName(text: string): string | null {
  const first = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l !== '');
  const m = first === undefined ? null : HEADER.exec(first);
  if (!m) return null;
  const name = clean(m[1]!);
  return name.length <= MAX_SQUAD_NAME ? name : null;
}

/** Mit mehreren Kadern der angezeigte Kader mit seinem Namen als erster Zeile, sonst wie bisher. */
export function squadShareText(
  players: readonly Player[],
  squads: readonly Squad[],
  id: string,
  sort: RosterSort,
): string {
  if (!hasSquads(squads)) return rosterShareText([...players], sort);
  return `Kader ${squadName(squads, id)}:\n${rosterShareText(inSquad(squads, players, id), sort)}`;
}

export interface ImportTarget {
  /** Kader nach dem Einfügen (mit dem neu angelegten). */
  squads: Squad[];
  squadId: string;
  name: string;
  created: boolean;
  /** Der Kader aus der ersten Zeile fehlt und es gibt schon 6: die Liste geht in den angezeigten. */
  full: boolean;
}

/** Zielkader einer eingefügten Liste: gleichnamiger, sonst angelegt; ohne Kopfzeile der angezeigte. */
export function importTarget(squads: Squad[], shownId: string, text: string, newId: () => string): ImportTarget {
  const shown = { squads, squadId: shownId, name: squadName(squads, shownId), created: false, full: false };
  const name = listSquadName(text);
  if (name === null) return shown;
  const found = findSquad(squads, name);
  if (found) return { ...shown, squadId: found.id, name: found.name };
  const next = addSquad(squads, name, newId());
  if (!next) return { ...shown, full: true };
  return { squads: next, squadId: next.at(-1)!.id, name: clean(name), created: true, full: false };
}

/** Name des bisherigen Kaders eines erkannten Kindes, wenn es in einen anderen kommt. */
export function movedFrom(
  squads: readonly Squad[],
  players: readonly Player[],
  matchId: string | null,
  targetId: string,
): string | null {
  const p = matchId === null ? undefined : players.find((x) => x.id === matchId);
  if (!p || !hasSquads(squads)) return null;
  const from = squadOfPlayer(squads, p);
  return from === targetId ? null : squadName(squads, from);
}

// ---------- FR-P24: Sicherung ----------

/**
 * Kader aus der Sicherung: ohne eigene gelten die der Sicherung; sonst kommen fehlende dazu (höchstens 6).
 * `ids`: Kader der Sicherung, die einem gleichnamigen eigenen entsprechen (für die Zuordnung der Kinder).
 */
export function mergeSquads(
  local: readonly Squad[] | undefined,
  backup: Squad[] | undefined,
): { squads: Squad[] | null; ids: Record<string, string> } {
  if (!backup) return { squads: null, ids: {} };
  if (!local || local.length === 0) return { squads: backup, ids: {} };
  const ids: Record<string, string> = {};
  const add: Squad[] = [];
  for (const q of backup) {
    if (local.some((l) => l.id === q.id)) continue;
    const same = findSquad(local, q.name);
    if (same) ids[q.id] = same.id;
    else if (local.length + add.length < MAX_SQUADS) add.push(q);
  }
  return { squads: add.length > 0 ? [...local, ...add] : null, ids };
}
