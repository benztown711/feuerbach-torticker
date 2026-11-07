import { deriveClock, type ClockState } from './clock';
import { homeAway } from './goals';
import { parseSnapshot, type LiveGameSnapshot, type LiveGoal, type LiveSnapshot } from './live-snapshot';
import { newerConfig, parseConfig } from './live-spieltag';
import { isObj, isText, isTime } from './live-validate';
import { formatMinute } from './minute';
import { shortTeamName } from './team-name';
import type { LiveConfig, Schema, Side } from './types';

/**
 * Spec 006 FR-L12 bis FR-L16: Stand des Dashboards aus geprüften Meldungen und die Karten daraus.
 * Zeiten des Lead-Handys werden über die Serverzeit der Meldung umgerechnet (R-L4), damit falsch
 * gehende Uhren auf beiden Seiten die Minute nicht verfälschen.
 */

/** FR-L15: Ab so langer Funkstille bei laufendem Spiel zeigt die Karte "Letzte Meldung vor n Min". */
export const STALE_MS = 5 * 60_000;
/** Obergrenzen, damit der gemerkte Stand klein bleibt. */
export const MAX_GAMES = 60;
export const MAX_REMOVED = 100;

export interface BoardEntry {
  snap: LiveGameSnapshot;
  /** Serverzeit der Meldung in ms. */
  at: number;
}

export interface Board {
  config: LiveConfig | null;
  games: BoardEntry[];
  /** Entfernte Spiele (Schlüssel, sentAt, Übergabezähler), damit ältere Stände sie nicht zurückbringen. */
  removed: [string, number, number][];
}

export const emptyBoard = (): Board => ({ config: null, games: [], removed: [] });

/** Spiel-IDs gelten je Mannschaft: ein Lead-Handy kann kein Spiel einer anderen Mannschaft ändern. */
const idOf = (s: { team: string; gameId: string }): string => `${s.team}/${s.gameId}`;

/** Zeitpunkt des Lead-Handys in Serverzeit. */
const real = (e: BoardEntry, leadAt: number): number => leadAt - (e.snap.sentAt - e.at);
/** Erster Anpfiff seit dem letzten Zurücksetzen auf den ersten Abschnitt (Zeit des Lead-Handys). */
function kickoffOf(s: LiveGameSnapshot): number | null {
  let at: number | null = null;
  for (const [type, t, section] of s.clock) {
    if (type === 'reset' && section === 1) at = null;
    else if (type === 'kickoff' && at === null) at = t;
  }
  return at;
}

/** Erster Anpfiff, sonst Anlegezeit (wie in der Historie), in Serverzeit. */
const startOf = (e: BoardEntry): number => real(e, kickoffOf(e.snap) ?? e.snap.createdAt);

/** Formate je Zeitzone nur einmal anlegen: das Dashboard rechnet jede Sekunde neu. */
function perZone(make: (timeZone?: string) => Intl.DateTimeFormat): (timeZone?: string) => Intl.DateTimeFormat {
  const cache = new Map<string | undefined, Intl.DateTimeFormat>();
  return (timeZone) => {
    const known = cache.get(timeZone);
    if (known) return known;
    const made = make(timeZone);
    cache.set(timeZone, made);
    return made;
  };
}

const dayFormat = perZone(
  (timeZone) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }),
);
const dateFormat = perZone(
  (timeZone) =>
    new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone }),
);
const clockFormat = perZone(
  (timeZone) => new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone }),
);

/** Kalendertag, z. B. "2026-11-07". */
export const dayKey = (ms: number, timeZone?: string): string => dayFormat(timeZone).format(ms);

/** Uhrzeit "10:41". */
export const formatClockTime = (ms: number, timeZone?: string): string => clockFormat(timeZone).format(ms);

interface DateParts {
  weekday: string;
  day: string;
  month: string;
  year: string;
}

function dateParts(ms: number, timeZone?: string): DateParts {
  const parts = dateFormat(timeZone).formatToParts(ms);
  return Object.fromEntries(parts.map((p) => [p.type, p.value])) as unknown as DateParts;
}

/** "Sa, 07.11.2026" */
export function formatDay(ms: number, timeZone?: string): string {
  const p = dateParts(ms, timeZone);
  return `${p.weekday.replace('.', '')}, ${p.day}.${p.month}.${p.year}`;
}

/** "07.11." */
function shortDay(ms: number, timeZone?: string): string {
  const p = dateParts(ms, timeZone);
  return `${p.day}.${p.month}.`;
}

/** FR-L19: die jüngste Konfiguration gilt. */
export function applyConfig(board: Board, config: LiveConfig): Board {
  const next = newerConfig(board.config, config);
  return next === board.config ? board : { ...board, config: next };
}

/** Vortag eines Kalendertags: "2026-11-07" → "2026-11-06" (reine Kalenderrechnung, ohne Sommerzeit). */
function dayBefore(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/**
 * Spieltag eines Spiels (FR-L16): Tag des ersten Anpfiffs; vor dem Anpfiff der Tag des Anlegens, außer das Spiel
 * wurde am Vortag von `now` angelegt (am Vorabend vorbereitet, research.md R-L21): dann zählt es zum Tag von `now`.
 */
function dayOf(e: BoardEntry, now: number, timeZone?: string): string {
  const kickoff = kickoffOf(e.snap);
  if (kickoff !== null) return dayKey(real(e, kickoff), timeZone);
  const created = dayKey(real(e, e.snap.createdAt), timeZone);
  const today = dayKey(now, timeZone);
  return created === dayBefore(today) ? today : created;
}

/**
 * FR-L16: Je Mannschaft bleiben nur Spiele vom Spieltag ihres neuesten Spiels. "Heute" ist dabei die Serverzeit
 * der jüngsten bekannten Meldung, damit ein spät abgerufener alter Stand nichts verdrängt.
 */
function prune(games: BoardEntry[], timeZone?: string): BoardEntry[] {
  const now = Math.max(...games.map((e) => e.at));
  const newest = new Map<string, string>();
  for (const e of games) {
    const day = dayOf(e, now, timeZone);
    if (day > (newest.get(e.snap.team) ?? '')) newest.set(e.snap.team, day);
  }
  return games
    .filter((e) => dayOf(e, now, timeZone) === newest.get(e.snap.team))
    .sort((a, b) => a.at - b.at)
    .slice(-MAX_GAMES);
}

/** FR-L23: Der größere Übergabezähler gilt, bei gleichem der spätere Stand. */
const notNewer = (a: { h: number; sentAt: number }, b: { h: number; sentAt: number }): boolean =>
  a.h > b.h || (a.h === b.h && a.sentAt >= b.sentAt);

/**
 * Übernimmt einen geprüften Live-Stand (R-L5): je Spiel gilt der größte Übergabezähler, dann das größte `sentAt`;
 * "off" und "deleted" entfernen das Spiel.
 */
export function applySnapshot(board: Board, snap: LiveSnapshot, at: number, timeZone?: string): Board {
  const id = idOf(snap);
  const known = board.games.find((e) => idOf(e.snap) === id);
  const gone = board.removed.find(([r]) => r === id);
  if ((known && notNewer(known.snap, snap)) || (gone && notNewer({ sentAt: gone[1], h: gone[2] }, snap))) return board;
  const others = board.games.filter((e) => idOf(e.snap) !== id);
  if (snap.state !== 'live') {
    const removed = [...board.removed.filter(([r]) => r !== id), [id, snap.sentAt, snap.h] as [string, number, number]];
    return { ...board, games: others, removed: removed.slice(-MAX_REMOVED) };
  }
  return { ...board, games: prune([...others, { snap, at }], timeZone) };
}

/** Gemerkter Stand aus `localStorage`; Ungültiges fällt weg. */
export function parseBoard(v: unknown): Board {
  if (!isObj(v) || !Array.isArray(v.games) || !Array.isArray(v.removed)) return emptyBoard();
  const games = (v.games as unknown[]).flatMap((e): BoardEntry[] => {
    const snap = isObj(e) && isTime(e.at) ? parseSnapshot(e.snap) : null;
    return snap?.state === 'live' ? [{ snap, at: (e as { at: number }).at }] : [];
  });
  // Ältere Stände ohne Übergabezähler gelten als 0.
  const removed = (v.removed as unknown[]).flatMap((r): [string, number, number][] =>
    Array.isArray(r) && isText(r[0], 200) && isTime(r[1]) && (r[2] === undefined || isTime(r[2]))
      ? [[r[0], r[1], (r[2] as number | undefined) ?? 0]]
      : [],
  );
  return { config: parseConfig(v.config), games: games.slice(-MAX_GAMES), removed: removed.slice(-MAX_REMOVED) };
}

/* ---------- Karten (FR-L12, FR-L14) ---------- */

export type CardGroup = 'running' | 'created' | 'finished';

export interface GoalLine {
  side: Side;
  minute: string;
  /** Stand nach dem Tor, Heim:Gast. */
  score: string;
  who: string;
}

export interface BoardCard {
  key: string;
  gameId: string;
  group: CardGroup;
  /** Spiel läuft (Minute, Pause, Elfmeterschießen): rote Kante. */
  live: boolean;
  /** Spiel von heute. */
  today: boolean;
  home: { name: string; color: string };
  away: { name: string; color: string };
  score: string;
  phase: string;
  /** Aufgeklappt: Kürzel, Datum, Anpfiff, Schlusspfiff, Halbzeit. */
  info: string;
  shootout: string | null;
  /** Neuestes zuerst. */
  goals: GoalLine[];
  staleMinutes: number | null;
  earlier: string | null;
  /** Serverzeit der letzten Meldung (ms): nur frische Tore werden hervorgehoben. */
  updatedAt: number;
}

export interface BoardView {
  title: string | null;
  teams: string[];
  cards: BoardCard[];
  /** Mindestens eine Karte zeigt ein Spiel von heute. */
  today: boolean;
  /** US5-S3: Live-Spieltag wurde neu ausgestellt; Eltern brauchen den neuen Link. */
  retired: boolean;
  /** Spec 012 FR-S30: Mannschaften ohne Karte ("heute noch kein Spiel"), nur wenn es Karten gibt. */
  waiting: { key: string; name: string; color: string | null }[];
}

interface GameState {
  entry: BoardEntry;
  group: CardGroup;
  live: boolean;
  phase: string;
  today: boolean;
}

const clockOfEntry = (e: BoardEntry, serverNow: number): ClockState =>
  deriveClock(
    e.snap.clock.map(([type, at, section]) => ({ type, at, section })),
    // Jetzt auf der Uhr des Lead-Handys (R-L4).
    serverNow + (e.snap.sentAt - e.at),
    e.snap.schema,
  );

function endLabel(s: LiveGameSnapshot): string {
  if (s.shootout) return 'Ende i. E.';
  const fullTime = s.clock.filter(([type]) => type === 'fullTime').pop();
  return fullTime && fullTime[2] > s.schema.sections ? 'Ende n. V.' : 'Ende';
}

function runningPhase(c: ClockState, schema: Schema): string {
  if (c.status === 'running') return formatMinute(c.minute, c.stoppage);
  if (c.status === 'paused') return 'Uhr angehalten';
  if (c.kickoffSection === schema.sections + 1) return 'Verlängerung';
  return schema.sections === 2 && c.kickoffSection === 2 ? 'Halbzeit' : 'Pause';
}

function stateOf(e: BoardEntry, serverNow: number, today: string, timeZone?: string): GameState {
  const c = clockOfEntry(e, serverNow);
  const s = e.snap;
  const isToday = dayOf(e, serverNow, timeZone) === today;
  const base = { entry: e, today: isToday };
  if (c.status === 'created') return { ...base, group: 'created', live: false, phase: 'noch nicht angepfiffen' };
  const inShootout = c.status === 'finished' && s.shootout !== null && !s.shootout.done;
  // FR-L16: angepfiffenes Spiel vom Vortag erscheint wie beendet, ohne laufende Minute.
  if (!isToday || (c.status === 'finished' && !inShootout))
    return { ...base, group: 'finished', live: false, phase: endLabel(s) };
  return { ...base, group: 'running', live: true, phase: inShootout ? 'Elfmeterschießen' : runningPhase(c, s.schema) };
}

const count = (goals: LiveGoal[], side: Side): number => goals.filter((g) => g.side === side).length;

const scoreOf = (s: LiveGameSnapshot, goals: LiveGoal[] = s.goals): string => {
  const ha = homeAway(s.venue, { own: count(goals, 'own'), opp: count(goals, 'opp') });
  return `${ha.home}:${ha.away}`;
};

/** Torschütze wie im Teilen-Text: Vorname bzw. Kürzel, Gegner mit "(Gegner)", sonst Mannschaft. */
function whoOf(g: LiveGoal, s: LiveGameSnapshot): string {
  const base = g.side === 'opp' ? (g.who ? `${g.who} (Gegner)` : s.opp) : g.ownGoal ? 'Eigentor' : (g.who ?? s.own);
  // Spec 009 FR-V08: "Max (Vorlage: Ben)".
  const assist = g.assist ? ` (Vorlage: ${g.assist})` : '';
  return g.penalty ? `${base}${assist} (Elfmeter)` : `${base}${assist}`;
}

function goalLines(s: LiveGameSnapshot): GoalLine[] {
  const running = { own: 0, opp: 0 };
  return s.goals
    .map((g) => {
      running[g.side] += 1;
      const ha = homeAway(s.venue, running);
      return {
        side: g.side,
        minute: formatMinute(g.minute, g.stoppage),
        score: `${ha.home}:${ha.away}`,
        who: whoOf(g, s),
      };
    })
    .reverse();
}

function infoOf(st: GameState, key: string, timeZone?: string): string {
  const e = st.entry;
  const s = e.snap;
  const at = (t: number): string => `${formatClockTime(real(e, t), timeZone)} Uhr`;
  const kickoff = kickoffOf(s);
  const fullTime = s.clock.filter(([type]) => type === 'fullTime').pop();
  const halfDone = s.schema.sections > 1 && s.clock.some(([type, , section]) => type === 'sectionEnd' && section === 1);
  return [
    key,
    st.group === 'finished' || !st.today ? formatDay(startOf(e), timeZone) : '',
    kickoff !== null ? `Anpfiff ${at(kickoff)}` : '',
    fullTime && st.group === 'finished' ? `Schlusspfiff ${at(fullTime[1])}` : '',
    halfDone
      ? `Halbzeit ${scoreOf(
          s,
          s.goals.filter((g) => g.section === 1),
        )}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function shootoutOf(s: LiveGameSnapshot): string | null {
  if (!s.shootout) return null;
  const shots = s.shootout.shots;
  const hits = (side: Side): number => shots.filter(([sd, hit]) => sd === side && hit).length;
  const ha = homeAway(s.venue, { own: hits('own'), opp: hits('opp') });
  return `Elfmeterschießen ${ha.home}:${ha.away}`;
}

/** FR-L14: "2:1 gegen TSV Musterstadt" aus eigener Sicht, bei laufenden Spielen mit Phase. */
function earlierEntry(st: GameState): string {
  const s = st.entry.snap;
  const text = `${count(s.goals, 'own')}:${count(s.goals, 'opp')} ${s.venue === 'home' ? 'gegen' : 'bei'} ${s.opp}`;
  return st.group === 'finished' ? text : `${text} (${st.phase})`;
}

const RANK: Record<CardGroup, number> = { running: 0, created: 1, finished: 2 };

function cardOf(key: string, main: GameState, rest: GameState[], serverNow: number, timeZone?: string): BoardCard {
  const s = main.entry.snap;
  const own = { name: s.own, color: s.ownColor };
  const opp = { name: s.opp, color: s.oppColor };
  const silent = serverNow - main.entry.at;
  const label = main.today ? 'Heute außerdem' : `Außerdem am ${shortDay(startOf(main.entry), timeZone)}`;
  return {
    key,
    gameId: s.gameId,
    group: main.group,
    live: main.live,
    today: main.today,
    home: s.venue === 'home' ? own : opp,
    away: s.venue === 'home' ? opp : own,
    score: scoreOf(s),
    phase: main.today ? main.phase : `${main.phase} · ${shortDay(startOf(main.entry), timeZone)}`,
    info: infoOf(main, key, timeZone),
    shootout: shootoutOf(s),
    goals: goalLines(s),
    staleMinutes: main.live && silent > STALE_MS ? Math.floor(silent / 60_000) : null,
    earlier: rest.length > 0 ? `${label}: ${rest.map(earlierEntry).join('; ')}` : null,
    updatedAt: main.entry.at,
  };
}

/**
 * FR-L12, FR-L14: je Mannschaft eine Karte; laufende Spiele (in der Reihenfolge der Konfiguration)
 * vor angelegten vor beendeten. Ohne Konfiguration gelten die Mannschaften der Meldungen.
 */
export function boardView(board: Board, serverNow: number, timeZone?: string): BoardView {
  const teams = board.config?.teams ?? [...new Set(board.games.map((e) => e.snap.team))].sort();
  const today = dayKey(serverNow, timeZone);
  const cards = teams
    .flatMap((key) => {
      // Laufendes Spiel vor neuestem (zwei Lead-Handys derselben Mannschaft), sonst das neueste.
      const [main, ...rest] = board.games
        .filter((e) => e.snap.team === key)
        .map((e) => stateOf(e, serverNow, today, timeZone))
        .sort((a, b) => Number(b.live) - Number(a.live) || startOf(b.entry) - startOf(a.entry));
      return main ? [cardOf(key, main, rest, serverNow, timeZone)] : [];
    })
    .sort((a, b) => RANK[a.group] - RANK[b.group]);
  const details = board.config?.m ?? [];
  const waiting =
    cards.length === 0
      ? []
      : teams
          .filter((key) => !cards.some((c) => c.key === key))
          .map((key) => {
            const d = details.find(([k]) => k === key);
            return { key, name: d ? shortTeamName(d[1]) : key, color: d ? d[2] : null };
          });
  return {
    title: board.config?.title ?? null,
    teams,
    cards,
    today: cards.some((c) => c.today),
    retired: board.config?.retired === true,
    waiting,
  };
}

/**
 * Spec 006 US4: die heutigen Karten der anderen Mannschaften für die Zeile im Spielbildschirm; `team` ist die
 * eigene Mannschaft (null: nicht im Live-Spieltag), `gameId` das eigene Spiel. Reihenfolge wie auf dem
 * Dashboard (laufende zuerst).
 */
export function otherGames(
  board: Board,
  gameId: string,
  team: string | null,
  serverNow: number,
  timeZone?: string,
): BoardCard[] {
  return boardView(board, serverNow, timeZone).cards.filter((c) => c.today && c.gameId !== gameId && c.key !== team);
}

/** Spec 006 US5: Serverzeit der jüngsten Meldung einer Mannschaft (von irgendeinem Handy), sonst null. */
export function lastSentAt(board: Board, team: string): number | null {
  const times = board.games.filter((e) => e.snap.team === team).map((e) => e.at);
  return times.length > 0 ? Math.max(...times) : null;
}

/** US5: "zuletzt gesendet heute 10:40 Uhr", an anderen Tagen "zuletzt gesendet am 31.10.". */
export function sentLabel(at: number | null, serverNow: number, timeZone?: string): string {
  if (at === null) return 'noch nichts gesendet';
  return dayKey(at, timeZone) === dayKey(serverNow, timeZone)
    ? `zuletzt gesendet heute ${formatClockTime(at, timeZone)} Uhr`
    : `zuletzt gesendet am ${shortDay(at, timeZone)}`;
}

/** Läuft das Spiel noch, wenn die letzte Meldung höchstens so alt ist (FR-L22)? */
export const ACTIVE_MS = 30 * 60_000;

/**
 * FR-L22: Spiel einer Mannschaft, das gerade ein anderes Handy überträgt (heute, nicht beendet, letzte
 * Meldung höchstens 30 Minuten alt); `localIds` sind die Spiele dieses Handys.
 */
export function runningElsewhere(
  board: Board,
  team: string,
  localIds: string[],
  serverNow: number,
  timeZone?: string,
): BoardEntry | null {
  const today = dayKey(serverNow, timeZone);
  const found = board.games
    .filter((e) => e.snap.team === team && !localIds.includes(e.snap.gameId) && serverNow - e.at <= ACTIVE_MS)
    .filter((e) => {
      const st = stateOf(e, serverNow, today, timeZone);
      return st.today && st.group !== 'finished';
    })
    .sort((a, b) => b.at - a.at);
  return found[0] ?? null;
}
