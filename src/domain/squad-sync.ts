import { firstNameOf, MAX_NAME } from './roster-names';
import { DEFAULT_SQUAD, findSquad, MAX_SQUAD_NAME, MAX_SQUADS, squadOfPlayer, squadOfTeam } from './squads';
import type { Player, Squad, Team } from './types';
import { normalizeName } from './validation';

/**
 * Spec 016 (data-model.md, contracts/squad-message.md, research.md R-B3 bis R-B5): geteilte Kader zwischen
 * Trainer-Handys abgleichen. Rein, ohne Browser-APIs; Verschlüsseln und Senden in `platform/squad-sync.ts`.
 */

const DAY_MS = 24 * 60 * 60_000;
/** Gelöschte Kinder bleiben so lange in der Meldung (Grabstein), damit alle das Löschen erfahren. */
export const KID_TOMBSTONE_MS = 30 * DAY_MS;
/** FR-B17: höchstens so viele Kinder je Kader-Meldung. */
export const MAX_KIDS = 100;
const MAX_TEAMS = 6;

export type KidEntry = [sid: string, name: string, number: number | null, deleted: boolean, at: number];

/** Inhalt einer Kader-Meldung (contracts/squad-message.md). */
export interface SquadRecord {
  s: string;
  n: string;
  na: number;
  sh: boolean;
  t: [key: string, at: number][];
  k: KidEntry[];
}

/** Was der Abgleich auf dem Handy liest und schreibt. */
export interface SquadState {
  players: Player[];
  squads: Squad[];
  teams: Team[];
}

/** Mannschaft des Live-Spieltags: Kurzlabel und Name (für die eigene Mannschaft). */
export interface LiveTeamRef {
  key: string;
  name: string;
}

// ---------- Meldung ----------

const isSid = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);
const isTime = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const isName = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim() !== '' && v.length <= max;
const isFlag = (v: unknown): v is 0 | 1 => v === 0 || v === 1;

export function encodeRecord(r: SquadRecord): string {
  return JSON.stringify({
    v: 1,
    s: r.s,
    n: r.n,
    na: r.na,
    sh: r.sh ? 1 : 0,
    t: r.t,
    k: r.k.map(([sid, name, number, deleted, at]) => [sid, name, number, deleted ? 1 : 0, at]),
  });
}

function parseKid(v: unknown): KidEntry | null {
  if (!Array.isArray(v) || v.length !== 5) return null;
  const [sid, name, number, deleted, at] = v as unknown[];
  const okNumber = number === null || (Number.isInteger(number) && (number as number) >= 0 && (number as number) <= 99);
  return isSid(sid) && isName(name, MAX_NAME) && okNumber && isFlag(deleted) && isTime(at)
    ? [sid, name, number as number | null, deleted === 1, at]
    : null;
}

const parseTeam = (v: unknown): [string, number] | null =>
  Array.isArray(v) && v.length === 2 && isName(v[0], 20) && isTime(v[1]) ? [v[0], v[1]] : null;

/** Streng prüfen; unbekannte Felder werden ignoriert, alles Ungültige ergibt null. */
export function parseRecord(text: string): SquadRecord | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (o.v !== 1 || !isSid(o.s) || !isName(o.n, MAX_SQUAD_NAME) || !isTime(o.na) || !isFlag(o.sh)) return null;
  if (!Array.isArray(o.t) || o.t.length > MAX_TEAMS || !Array.isArray(o.k) || o.k.length > MAX_KIDS) return null;
  const t = o.t.map(parseTeam);
  const k = o.k.map(parseKid);
  if (t.includes(null) || k.includes(null)) return null;
  return { s: o.s, n: o.n, na: o.na, sh: o.sh === 1, t: t as [string, number][], k: k as KidEntry[] };
}

/** `at` der Schreibanfrage: größter Zeitstempel im Inhalt, mindestens 1 (Dienst verlangt > 0). */
export const recordAt = (r: SquadRecord): number =>
  Math.max(1, r.na, ...r.t.map(([, at]) => at), ...r.k.map((k) => k[4]));

// ---------- Hilfen ----------

/** Zeitstempel einer Angabe; ohne (nie geteilt oder geändert) zählt sie als ältest. */
const atOf = (x: { at?: number }): number => x.at ?? 0;

const teamOf = (teams: Team[], ref: LiveTeamRef): Team | undefined =>
  teams.find((t) => normalizeName(t.name) === normalizeName(ref.name));

const isShared = (squads: Squad[], id: string): boolean => squads.find((q) => q.id === id)?.shared === true;
const sidOf = (squads: Squad[], id: string): string | undefined => squads.find((q) => q.id === id)?.sid;
const samePlayer = (a: Player, b: Player, squads: Squad[], prevSquads: Squad[]): boolean =>
  a.name === b.name &&
  a.number === b.number &&
  (a.deletedAt === null) === (b.deletedAt === null) &&
  squadOfPlayer(squads, a) === squadOfPlayer(prevSquads, b);

/** Meldung eines Kaders aus dem Stand des Handys; null ohne gemeinsame Kennung oder unbekannt. */
export function buildRecord(state: SquadState, squadId: string, live: LiveTeamRef[], now: number): SquadRecord | null {
  const q = state.squads.find((x) => x.id === squadId);
  if (!q?.sid) return null;
  const kids = state.players
    .filter((x) => x.sid !== undefined && squadOfPlayer(state.squads, x) === q.id)
    .filter((x) => x.deletedAt === null || now - atOf(x) <= KID_TOMBSTONE_MS)
    .sort((a, b) => Number(a.deletedAt !== null) - Number(b.deletedAt !== null) || atOf(b) - atOf(a))
    .slice(0, MAX_KIDS)
    .map((x): KidEntry => [x.sid!, x.name, x.number, x.deletedAt !== null, atOf(x)]);
  // Reihenfolge wie im Kader, damit gleiche Stände gleich aussehen.
  const order = new Map(state.players.map((x, i) => [x.sid, i]));
  kids.sort((a, b) => order.get(a[0])! - order.get(b[0])!);
  const t = live.flatMap((ref): [string, number][] => {
    const team = teamOf(state.teams, ref);
    return team && squadOfTeam(state.squads, team) === q.id ? [[ref.key, atOf({ at: team.squadAt })]] : [];
  });
  return { s: q.sid, n: q.name, na: atOf(q), sh: q.shared === true, t, k: kids };
}

// ---------- R-B5 Stempeln ----------

export interface StampResult {
  state: SquadState;
  /** Gemeinsame Kennungen der Kader, die zu senden sind. */
  changed: string[];
  /** Gelöschte geteilte Kader: "nicht mehr geteilt" senden. */
  gone: SquadRecord[];
}

/**
 * Bildschirme speichern oft einen älteren Stand (vor dem Teilen oder Übernehmen geladen): fehlende Kennungen und
 * Zeitstempel kommen aus dem gespeicherten Stand, sonst gingen sie verloren.
 */
function carry<T extends { id: string }>(list: T[], old: T[], keys: (keyof T)[]): T[] {
  return list.map((x) => {
    const b = old.find((y) => y.id === x.id);
    const missing = b ? keys.filter((k) => x[k] === undefined && b[k] !== undefined) : [];
    return missing.length === 0 ? x : { ...x, ...Object.fromEntries(missing.map((k) => [k, b![k]])) };
  });
}

/** Vergleicht alten und neuen Stand und stempelt Änderungen an geteilten Kadern mit `now`. */
export function stamp(prev: SquadState, raw: SquadState, now: number): StampResult {
  const next: SquadState = {
    players: carry(raw.players, prev.players, ['sid', 'at']),
    squads: carry(raw.squads, prev.squads, ['sid', 'at']),
    teams: carry(raw.teams, prev.teams, ['squadAt']),
  };
  const changed = new Set<string>();
  const nowShared = new Set<string>();
  const squads = next.squads.map((q) => {
    const before = prev.squads.find((x) => x.id === q.id);
    const wasShared = before?.shared === true;
    if (!q.shared && !wasShared) return q;
    if (q.shared && !wasShared) nowShared.add(q.id);
    const same = before !== undefined && before.name === q.name && wasShared === (q.shared === true);
    if (same) return q;
    const out = { ...q, sid: q.sid ?? q.id, at: now };
    changed.add(out.sid);
    return out;
  });
  const players = next.players.map((x) => {
    const squad = squadOfPlayer(squads, x);
    const before = prev.players.find((y) => y.id === x.id);
    const from = before ? squadOfPlayer(prev.squads, before) : squad;
    if (nowShared.has(squad)) return { ...x, sid: x.sid ?? x.id, at: x.at ?? now };
    if (before && samePlayer(x, before, squads, prev.squads)) return x;
    if (isShared(prev.squads, from) && from !== squad) changed.add(sidOf(prev.squads, from)!);
    if (!isShared(squads, squad)) return x;
    changed.add(sidOf(squads, squad)!);
    return { ...x, sid: x.sid ?? x.id, at: now };
  });
  const teams = next.teams.map((t) => {
    const before = prev.teams.find((x) => x.id === t.id);
    const squad = squadOfTeam(squads, t);
    const from = before ? squadOfTeam(prev.squads, before) : squad;
    if (nowShared.has(squad)) return { ...t, squadAt: t.squadAt ?? now };
    if (from === squad) return t;
    for (const id of [from, squad]) if (isShared(squads, id)) changed.add(sidOf(squads, id)!);
    return { ...t, squadAt: now };
  });
  const gone = prev.squads
    .filter((q) => q.shared && q.sid && !squads.some((x) => x.id === q.id))
    .map((q): SquadRecord => ({ s: q.sid!, n: q.name, na: now, sh: false, t: [], k: [] }));
  return { state: { players, squads, teams }, changed: [...changed], gone };
}

// ---------- R-B3 Zusammenführen ----------

export interface MergeResult {
  state: SquadState;
  /** Der Stand des Handys hat sich geändert (speichern). */
  changed: boolean;
  /** Kader (`sid`), von denen dieses Handy Neueres hat als die Meldung: nachsenden (FR-B07). */
  republish: string[];
  /** Name eines geteilten Kaders ohne Platz (US2-S4), sonst null. */
  full: string | null;
  /** Kader erstmals übernommen (angelegt oder mit einem gleichnamigen verbunden, FR-B09). */
  adopted: boolean;
}

const key = (s: string): string => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('de');

/** R-B4: Kinder eines gleichnamigen eigenen Kaders einmal erkennen (Name, sonst Vorname und Nummer). */
function link(players: Player[], squadId: string, squads: Squad[], kids: KidEntry[]): Player[] {
  const free = players.filter((x) => x.sid === undefined && squadOfPlayer(squads, x) === squadId);
  const sids = new Map<string, string>();
  for (const [sid, name, number] of kids) {
    if (players.some((x) => x.sid === sid)) continue;
    const match =
      free.find((x) => !sids.has(x.id) && key(x.name) === key(name)) ??
      free.find(
        (x) =>
          !sids.has(x.id) &&
          number !== null &&
          x.number === number &&
          key(firstNameOf(x.name)) === key(firstNameOf(name)),
      );
    if (match) sids.set(match.id, sid);
  }
  return players.map((x) => (sids.has(x.id) ? { ...x, sid: sids.get(x.id)! } : x));
}

/** Vorgabe-Kader ohne ein einziges Kind (frisches Handy): weicht dem ersten geteilten. */
const emptyDefault = (state: SquadState): boolean =>
  state.squads.length === 1 &&
  state.squads[0]!.id === DEFAULT_SQUAD.id &&
  !state.squads[0]!.sid &&
  state.players.length === 0;

/** Führt eine empfangene Meldung mit dem Stand des Handys zusammen (je Kind, Kader und Mannschaft die jüngere). */
export function mergeRecord(
  state: SquadState,
  rec: SquadRecord,
  live: LiveTeamRef[],
  now: number,
  newId: () => string,
): MergeResult {
  const republish = new Set<string>();
  let { squads, players, teams } = state;
  let changed = false;
  let adopted = false;
  let local = squads.find((q) => q.sid === rec.s);
  if (!local) {
    const unchanged = { state, changed: false, republish: [], adopted: false };
    if (!rec.sh) return { ...unchanged, full: null };
    const same = findSquad(squads, rec.n);
    if (same && !same.sid) {
      local = { ...same, sid: rec.s, shared: true, at: rec.na };
      squads = squads.map((q) => (q.id === same.id ? local! : q));
      players = link(players, same.id, squads, rec.k);
      // Eigene Kinder ohne Gegenstück gehören ab jetzt auch dazu.
      players = players.map((x) => {
        if (x.sid !== undefined || squadOfPlayer(squads, x) !== same.id) return x;
        republish.add(rec.s);
        return { ...x, sid: x.id, at: now };
      });
    } else {
      const replace = emptyDefault(state);
      if (!replace && squads.length >= MAX_SQUADS) return { ...unchanged, full: rec.n };
      const id = squads.some((q) => q.id === rec.s) ? newId() : rec.s;
      local = { id, name: rec.n, sid: rec.s, shared: true, at: rec.na };
      squads = replace ? [local] : [...squads, local];
    }
    changed = true;
    adopted = true;
  }
  const target = local;
  // Kadername und Schalter.
  if (rec.na > atOf(target)) {
    const clash = squads.some((q) => q.id !== target.id && key(q.name) === key(rec.n));
    const next = { ...target, name: clash ? target.name : rec.n, shared: rec.sh, at: rec.na };
    squads = squads.map((q) => (q.id === target.id ? next : q));
    changed = true;
  } else if (atOf(target) > rec.na) republish.add(rec.s);
  // Kinder.
  const seen = new Set<string>();
  for (const [sid, name, number, deleted, at] of rec.k) {
    seen.add(sid);
    const mine = players.find((x) => x.sid === sid);
    if (!mine) {
      if (deleted) continue;
      const id = players.some((x) => x.id === sid) ? newId() : sid;
      players = [...players, { id, name, number, deletedAt: null, squadId: target.id, sid, at }];
      changed = true;
      continue;
    }
    if (at > atOf(mine)) {
      const next: Player = {
        ...mine,
        name,
        number,
        deletedAt: deleted ? (mine.deletedAt ?? now) : null,
        squadId: target.id,
        at,
      };
      players = players.map((x) => (x === mine ? next : x));
      changed = true;
    } else if (atOf(mine) > at) {
      // Geteilte Kader haben immer eine Kennung (stamp, mergeRecord).
      const own = squadOfPlayer(squads, mine);
      if (isShared(squads, own)) republish.add(sidOf(squads, own)!);
    }
  }
  // Eigene Kinder dieses Kaders, die in der Meldung fehlen.
  if (players.some((x) => x.sid !== undefined && !seen.has(x.sid) && squadOfPlayer(squads, x) === target.id))
    republish.add(rec.s);
  // Mannschaften.
  const listed = new Set<string>();
  for (const [teamKey, at] of rec.t) {
    listed.add(teamKey);
    const ref = live.find((r) => r.key === teamKey);
    const team = ref && teamOf(teams, ref);
    if (!team) continue;
    const mine = atOf({ at: team.squadAt });
    if (at > mine) {
      teams = teams.map((t) => (t === team ? { ...t, squadId: target.id, squadAt: at } : t));
      changed = true;
    } else if (mine > at) {
      const own = squadOfTeam(squads, team);
      if (isShared(squads, own)) republish.add(sidOf(squads, own)!);
    }
  }
  for (const ref of live) {
    const team = teamOf(teams, ref);
    // Nur ausdrückliche Zuordnungen: ohne Kader gilt auf frischen Handys der erste, das zählt nicht.
    if (team && !listed.has(ref.key) && team.squadId === target.id) republish.add(rec.s);
  }
  return {
    state: changed ? { squads, players, teams } : state,
    changed,
    republish: [...republish],
    full: null,
    adopted,
  };
}
