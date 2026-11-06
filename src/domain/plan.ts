import { isObj, isText, MAX_KEY, type Obj } from './live-validate';
import type { PlanEntry, PlanStore, Schema, Venue } from './types';

/** Spec 015: Spielplan im Live-Spieltag (data-model.md, contracts/plan-message.md). */

/** Höchstens so viele Planspiele ohne Grabsteine (FR-P03). */
export const MAX_PLAN = 100;
/** FR-P07: so alt darf die letzte Plan-Meldung werden, bevor das Handy erneut sendet. */
export const REFRESH_MS = 6 * 60 * 60 * 1000;
/** Grabsteine bleiben so viele Tage nach ihrem Datum (plan.md, Risiken). */
const TOMBSTONE_DAYS = 30;
const MAX_TEXT = 40;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export interface PlanInput {
  team: string;
  date: string;
  /** "HH:MM" oder leer. */
  time: string;
  venue: Venue;
  opponent: string;
  competition: string;
  schema: Schema | null;
}

export type PlanErrors = Partial<Record<'team' | 'date' | 'time' | 'opponent' | 'competition' | 'schema', string>>;

export type PlanCheck = { ok: true; value: PlanInput } | { ok: false; errors: PlanErrors };

export interface PlanChange {
  store: PlanStore;
  entry: PlanEntry;
}

export interface PlanView {
  upcoming: { date: string; entries: PlanEntry[] }[];
  past: PlanEntry[];
}

const isIntIn = (n: unknown, lo: number, hi: number): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= lo && n <= hi;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const ID_RE = /^[A-Za-z0-9_-]{1,12}$/;

/** Kalendertag "JJJJ-MM-TT", der wirklich existiert. */
export function isPlanDate(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = DATE_RE.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === v;
}

const isSchema = (s: Schema): boolean => isIntIn(s.sections, 1, 4) && isIntIn(s.sectionMinutes, 1, 60);

/** FR-P02: Eingabe prüfen und säubern. */
export function checkPlanInput(input: PlanInput, teams: readonly string[]): PlanCheck {
  const value: PlanInput = {
    ...input,
    opponent: input.opponent.trim(),
    competition: input.competition.trim(),
    time: input.time.trim(),
  };
  const errors: PlanErrors = {};
  if (!teams.includes(value.team)) errors.team = 'Mannschaft wählen.';
  if (!isPlanDate(value.date)) errors.date = 'Datum wählen.';
  if (value.time !== '' && !TIME_RE.test(value.time)) errors.time = 'Anstoß als Uhrzeit, z. B. 12:00.';
  if (value.opponent.length > MAX_TEXT) errors.opponent = 'Höchstens 40 Zeichen.';
  if (value.competition.length > MAX_TEXT) errors.competition = 'Höchstens 40 Zeichen.';
  if (value.schema && !isSchema(value.schema)) errors.schema = 'Spielzeit: 1 bis 4 Abschnitte, 1 bis 60 Minuten.';
  return Object.keys(errors).length === 0 ? { ok: true, value } : { ok: false, errors };
}

export const emptyPlan = (topic: string, orgPub: string): PlanStore => ({
  v: 1,
  topic,
  orgPub,
  entries: [],
  seen: {},
  pending: [],
});

/** R-P3: der gespeicherte Plan gilt nur für den Live-Spieltag, unter dem er gespeichert wurde. */
export function planFor(store: PlanStore | null | undefined, topic: string, orgPub: string): PlanStore {
  return store && store.topic === topic && store.orgPub === orgPub ? store : emptyPlan(topic, orgPub);
}

const stamp = (prev: number, now: number): number => Math.max(now, prev + 1);

const fromInput = (input: PlanInput): Omit<PlanEntry, 'id' | 'updatedAt' | 'cancelled' | 'deleted'> => ({
  team: input.team,
  date: input.date,
  time: input.time === '' ? null : input.time,
  venue: input.venue,
  opponent: input.opponent,
  competition: input.competition,
  schema: input.schema,
});

export function markPending(store: PlanStore, ids: readonly string[]): PlanStore {
  return { ...store, pending: [...new Set([...store.pending, ...ids])] };
}

export function markSent(store: PlanStore, ids: readonly string[], now: number): PlanStore {
  const seen = { ...store.seen };
  for (const id of ids) seen[id] = now;
  return { ...store, seen, pending: store.pending.filter((id) => !ids.includes(id)) };
}

/** FR-P07: empfangene Planspiele, die genau dem eigenen Stand entsprechen, sind frisch auf dem Dienst. */
export function noteSeen(store: PlanStore, incoming: readonly PlanEntry[], now: number): PlanStore {
  const seen = { ...store.seen };
  for (const e of incoming) {
    if (store.entries.some((x) => x.id === e.id && x.updatedAt === e.updatedAt)) seen[e.id] = now;
  }
  return { ...store, seen };
}

function replace(store: PlanStore, entry: PlanEntry): PlanChange {
  const entries = store.entries.some((e) => e.id === entry.id)
    ? store.entries.map((e) => (e.id === entry.id ? entry : e))
    : [...store.entries, entry];
  return { store: markPending({ ...store, entries }, [entry.id]), entry };
}

const live = (store: PlanStore, id: string): PlanEntry | undefined =>
  store.entries.find((e) => e.id === id && !e.deleted);

/** US1-S1, S2: neues Planspiel. */
export function addEntry(store: PlanStore, input: PlanInput, id: string, now: number): PlanChange {
  return replace(store, { id, ...fromInput(input), cancelled: false, deleted: false, updatedAt: now });
}

/** US1-S3: Angaben ändern. */
export function updateEntry(store: PlanStore, id: string, input: PlanInput, now: number): PlanChange | null {
  const old = live(store, id);
  return old ? replace(store, { ...old, ...fromInput(input), updatedAt: stamp(old.updatedAt, now) }) : null;
}

/** FR-P29: absagen bzw. wieder ansetzen. */
export function setCancelled(store: PlanStore, id: string, cancelled: boolean, now: number): PlanChange | null {
  const old = live(store, id);
  return old ? replace(store, { ...old, cancelled, updatedAt: stamp(old.updatedAt, now) }) : null;
}

/** US1-S3: löschen als Grabstein, damit andere Handys es nicht zurückbringen (FR-P04). */
export function deleteEntry(store: PlanStore, id: string, now: number): PlanChange | null {
  const old = live(store, id);
  return old ? replace(store, { ...old, deleted: true, updatedAt: stamp(old.updatedAt, now) }) : null;
}

/** FR-P04: je Planspiel gewinnt die jüngere Änderung. */
export function mergeEntries(
  store: PlanStore,
  incoming: readonly PlanEntry[],
): { store: PlanStore; changed: PlanEntry[] } {
  const byId = new Map(store.entries.map((e) => [e.id, e]));
  const changed: PlanEntry[] = [];
  for (const e of incoming) {
    const old = byId.get(e.id);
    if (old && old.updatedAt >= e.updatedAt) continue;
    byId.set(e.id, e);
    changed.push(e);
  }
  return changed.length === 0 ? { store, changed } : { store: { ...store, entries: [...byId.values()] }, changed };
}

const byTime = (a: PlanEntry, b: PlanEntry): number => {
  if (a.time !== b.time) {
    if (a.time === null) return 1;
    if (b.time === null) return -1;
    return a.time < b.time ? -1 : 1;
  }
  return a.team.localeCompare(b.team, 'de');
};

/** US1-S6: kommende Planspiele nach Datum gruppiert, vergangene neueste zuerst. */
export function planView(store: PlanStore, today: string): PlanView {
  const shown = store.entries.filter((e) => !e.deleted);
  const groups = new Map<string, PlanEntry[]>();
  for (const e of shown.filter((x) => x.date >= today).sort((a, b) => a.date.localeCompare(b.date))) {
    groups.set(e.date, [...(groups.get(e.date) ?? []), e]);
  }
  const upcoming = [...groups].map(([date, entries]) => ({ date, entries: entries.sort(byTime) }));
  const past = shown
    .filter((e) => e.date < today)
    .sort((a, b) => (a.date === b.date ? byTime(a, b) : b.date.localeCompare(a.date)));
  return { upcoming, past };
}

/** Grenzen einhalten: alte Grabsteine weg, über 100 die ältesten vergangenen Spiele weg. */
export function prunePlan(store: PlanStore, today: string): PlanStore {
  const limit = addDays(today, -TOMBSTONE_DAYS);
  let entries = store.entries.filter((e) => !e.deleted || e.date >= limit);
  const shown = entries.filter((e) => !e.deleted);
  const excess = shown.length - MAX_PLAN;
  if (excess > 0) {
    const drop = new Set(
      shown
        .filter((e) => e.date < today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, excess)
        .map((e) => e.id),
    );
    entries = entries.filter((e) => !drop.has(e.id));
  }
  if (entries.length === store.entries.length) return store;
  const kept = new Set(entries.map((e) => e.id));
  return { ...store, entries, seen: Object.fromEntries(Object.entries(store.seen).filter(([id]) => kept.has(id))) };
}

/** FR-P03: kein Platz mehr für ein weiteres kommendes Spiel. */
export const isFull = (store: PlanStore, today: string): boolean =>
  store.entries.filter((e) => !e.deleted && e.date >= today).length >= MAX_PLAN;

/** FR-P07: Planspiele ab heute (auch Grabsteine), die seit 6 Stunden nicht über den Dienst gingen. */
export const staleEntries = (store: PlanStore, now: number, today: string): PlanEntry[] =>
  store.entries.filter(
    (e) => e.date >= today && now - (Object.hasOwn(store.seen, e.id) ? (store.seen[e.id] as number) : 0) >= REFRESH_MS,
  );

/** FR-P07: erneut senden, wenn Unversandtes da ist oder ein Planspiel ab heute veraltet auf dem Dienst ist. */
export const needsRefresh = (store: PlanStore, now: number, today: string): boolean =>
  store.pending.length > 0 || staleEntries(store, now, today).length > 0;

/** contracts/plan-message.md: kompakte Form eines Planspiels. */
function encodeEntry(e: PlanEntry): Obj {
  const base: Obj = { i: e.id, k: e.team, d: e.date, u: e.updatedAt };
  if (e.deleted) return { ...base, x: 1 };
  const out: Obj = { ...base, h: e.venue === 'home' ? 1 : 0 };
  if (e.time) out.t = e.time;
  if (e.opponent) out.o = e.opponent;
  if (e.competition) out.w = e.competition;
  if (e.schema) out.z = [e.schema.sections, e.schema.sectionMinutes];
  if (e.cancelled) out.c = 1;
  return out;
}

export const encodePayload = (entries: readonly PlanEntry[]): Obj => ({ v: 1, e: entries.map(encodeEntry) });

/** Planspiele so aufteilen, dass jede Nutzlast höchstens `max` Zeichen hat (R-P2). */
export function chunkEntries(entries: readonly PlanEntry[], max: number): PlanEntry[][] {
  const chunks: PlanEntry[][] = [];
  let current: PlanEntry[] = [];
  for (const e of entries) {
    const next = [...current, e];
    if (current.length > 0 && JSON.stringify(encodePayload(next)).length > max) {
      chunks.push(current);
      current = [e];
    } else {
      current = next;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

const optText = (v: unknown): v is string | undefined =>
  v === undefined || (typeof v === 'string' && v.length <= MAX_TEXT);

function parseSchema(v: unknown): Schema | null | undefined {
  if (v === undefined) return null;
  if (!Array.isArray(v) || v.length !== 2) return undefined;
  const s = { sections: v[0] as number, sectionMinutes: v[1] as number };
  return isSchema(s) ? s : undefined;
}

function parseEntry(v: unknown): PlanEntry | null {
  if (!isObj(v)) return null;
  if (typeof v.i !== 'string' || !ID_RE.test(v.i) || !isText(v.k, MAX_KEY) || !isPlanDate(v.d)) return null;
  if (!isIntIn(v.u, 1, Number.MAX_SAFE_INTEGER)) return null;
  const base: PlanEntry = {
    id: v.i,
    team: v.k,
    date: v.d,
    time: null,
    venue: 'home',
    opponent: '',
    competition: '',
    schema: null,
    cancelled: false,
    deleted: false,
    updatedAt: v.u,
  };
  if (v.x === 1) return { ...base, deleted: true };
  const schema = parseSchema(v.z);
  if (v.h !== 0 && v.h !== 1) return null;
  if (v.t !== undefined && !(typeof v.t === 'string' && TIME_RE.test(v.t))) return null;
  if (!optText(v.o) || !optText(v.w) || schema === undefined) return null;
  if (v.c !== undefined && v.c !== 1) return null;
  return {
    ...base,
    venue: v.h === 1 ? 'home' : 'away',
    time: v.t ?? null,
    opponent: v.o ?? '',
    competition: v.w ?? '',
    schema,
    cancelled: v.c === 1,
  };
}

/** Nutzlast einer Plan-Meldung streng prüfen; ein ungültiger Eintrag verwirft alles. */
export function parsePayload(text: string): PlanEntry[] | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObj(raw) || raw.v !== 1 || !Array.isArray(raw.e) || raw.e.length === 0 || raw.e.length > MAX_PLAN) {
    return null;
  }
  const entries = raw.e.map(parseEntry);
  return entries.every((e): e is PlanEntry => e !== null) ? entries : null;
}

/** FR-P01: "E1 – Gegner" (Heim), "E1 bei Gegner" (Auswärts), "E1 – (Gegner offen)". */
export function entryTitle(e: PlanEntry): string {
  if (!e.opponent) return `${e.team} – (Gegner offen)`;
  return e.venue === 'home' ? `${e.team} – ${e.opponent}` : `${e.team} bei ${e.opponent}`;
}

/** FR-P01: "Heim · Kreisstaffel · 2×25". */
export function entryDetail(e: PlanEntry): string {
  const parts = [e.venue === 'home' ? 'Heim' : 'Auswärts'];
  if (e.competition) parts.push(e.competition);
  if (e.schema) parts.push(`${e.schema.sections}×${e.schema.sectionMinutes}`);
  return parts.join(' · ');
}

const utc = (date: string): Date => new Date(`${date}T00:00:00Z`);

/** "Sa 14.11." */
export function formatPlanDate(date: string): string {
  const d = utc(date);
  return `${WEEKDAYS[d.getUTCDay()]} ${date.slice(8, 10)}.${date.slice(5, 7)}.`;
}

export const addDays = (date: string, days: number): string =>
  new Date(utc(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);

/** FR-P02: Vorgabe für das Datum, frühestens heute. */
export function nextSaturday(today: string): string {
  return addDays(today, (6 - utc(today).getUTCDay() + 7) % 7);
}

/** Heutiger Kalendertag im Format "JJJJ-MM-TT". */
export const todayKey = (now: number, timeZone?: string): string =>
  new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(now);
