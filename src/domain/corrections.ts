import { deriveClock } from './clock';
import { refreshScores } from './goals';
import { formatMinute, minuteFor, sectionMinutesOf, sectionOffset } from './minute';
import type { ClockEvent, ClockEventType, Game, Goal, Side } from './types';

/**
 * Spec 012 (Spieltag sicher): Tor nachtragen, Minute ändern, Pfiff zurücknehmen, Uhr korrigieren.
 * Alle Zeiten werden aus den gespeicherten Uhr-Ereignissen berechnet (Constitution V), nichts wird gezählt.
 */

const MINUTE_MS = 60_000;

/** FR-S15: Ein Pfiff lässt sich höchstens 10 Minuten lang zurücknehmen. */
export const UNDO_WHISTLE_MS = 10 * MINUTE_MS;

/** FR-S21: Ohne vorheriges Uhr-Ereignis lässt sich der Anpfiff höchstens 60 Minuten vorverlegen. */
export const MAX_SHIFT_MINUTES = 60;

const defaultId = (): string => globalThis.crypto.randomUUID();

/** Laufstrecke der Uhr: von Anpfiff bzw. Fortsetzen bis Anhalten bzw. Pfiff; `to` null = läuft noch. */
export interface Run {
  from: number;
  to: number | null;
}

/** Laufstrecken je Abschnitt (1-basiert). */
export type SectionRuns = Map<number, Run[]>;

/**
 * Laufstrecken je Abschnitt aus den Uhr-Ereignissen, mit denselben Regeln wie deriveClock: Anhalten zählt nur
 * bei laufender Uhr, Fortsetzen nur bei angehaltener; ein erneuter Anpfiff und ein altes reset-Ereignis
 * verwerfen die Strecken des Abschnitts; "extraTime" startet keine Strecke.
 */
export function sectionRuns(events: ClockEvent[]): SectionRuns {
  const runs: SectionRuns = new Map();
  let state: 'idle' | 'running' | 'paused' = 'idle';
  let list: Run[] = [];
  let since: number | null = null;

  const stop = (at: number): void => {
    if (since !== null) list.push({ from: since, to: at });
    since = null;
  };

  for (const e of events) {
    switch (e.type) {
      case 'kickoff':
        list = [];
        runs.set(e.section, list);
        since = e.at;
        state = 'running';
        break;
      case 'pause':
        if (state === 'running') {
          stop(e.at);
          state = 'paused';
        }
        break;
      case 'resume':
        if (state === 'paused') {
          since = e.at;
          state = 'running';
        }
        break;
      case 'sectionEnd':
      case 'fullTime':
        stop(e.at);
        state = 'idle';
        break;
      case 'extraTime':
        state = 'idle';
        break;
      case 'reset':
        runs.delete(e.section);
        since = null;
        state = 'idle';
        break;
    }
  }
  if (since !== null) list.push({ from: since, to: null });
  return runs;
}

/** Gespielte Zeit eines Abschnitts bis zur Uhrzeit `t`; eine offene Strecke zählt bis `t`. */
export function playedIn(runs: SectionRuns, section: number, t: number): number {
  let played = 0;
  for (const r of runs.get(section) ?? []) played += Math.max(0, Math.min(r.to ?? t, t) - r.from);
  return played;
}

/**
 * Umkehrung von playedIn: Uhrzeit, zu der die Uhr des Abschnitts `playedMs` gespielt hatte. Über das Ende
 * der Strecken hinaus das Ende der letzten Strecke; eine offene Strecke reicht beliebig weit. Ohne Strecken NaN.
 */
export function timeAt(runs: SectionRuns, section: number, playedMs: number): number {
  let rest = Math.max(0, playedMs);
  let end = Number.NaN;
  for (const r of runs.get(section) ?? []) {
    if (r.to === null || rest <= r.to - r.from) return r.from + rest;
    rest -= Math.max(0, r.to - r.from);
    end = r.to;
  }
  return end;
}

/** Eine gespielte Minute der Minutenauswahl, z. B. 2. Halbzeit "48'" oder "25+2'". */
export interface MinuteOption {
  section: number;
  /** Reguläre Minute, höchstens das Abschnittsende. */
  minute: number;
  /** Nachspielminute oder null. */
  stoppage: number | null;
  label: string;
}

const minuteOption = (section: number, minute: number, stoppage: number | null): MinuteOption => ({
  section,
  minute,
  stoppage,
  label: formatMinute(minute, stoppage),
});

/**
 * FR-S11: alle bereits gespielten Minuten in Spielreihenfolge. Eine Minute zählt, sobald sie angefangen hat;
 * Nachspielminuten nur, soweit sie gespielt wurden. Die Abschnitte der Verlängerung gehören dazu.
 */
export function minuteOptions(game: Game, now: number): MinuteOption[] {
  const runs = sectionRuns(game.clockEvents);
  const options: MinuteOption[] = [];
  for (const section of [...runs.keys()].sort((a, b) => a - b)) {
    const played = playedIn(runs, section, now);
    const length = sectionMinutesOf(game.schema, section);
    const offset = sectionOffset(game.schema, section);
    for (let k = 1; k <= length && played > (k - 1) * MINUTE_MS; k++)
      options.push(minuteOption(section, offset + k, null));
    for (let j = 1; played > (length + j - 1) * MINUTE_MS; j++) options.push(minuteOption(section, offset + length, j));
  }
  return options;
}

/**
 * FR-S11: Vorauswahl. Bei laufender oder angehaltener Uhr ist die letzte gespielte Minute die aktuelle,
 * in der Pause und nach dem Schlusspfiff die letzte des Spiels; vor dem ersten Anpfiff null.
 */
export const defaultOption = (game: Game, now: number): MinuteOption | null => minuteOptions(game, now).at(-1) ?? null;

/** FR-S10: "Tor nachtragen" ab dem ersten Anpfiff, nicht bei begonnenem Elfmeterschießen. */
export const canAddLateGoal = (game: Game, now: number): boolean =>
  !game.shootout && minuteOptions(game, now).length > 0;

const optionKey = (o: MinuteOption): string => `${o.section}|${o.minute}|${o.stoppage}`;

type Place = Pick<Goal, 'section' | 'minute' | 'stoppage' | 'at'>;

/**
 * FR-S13: Abschnitt, Minute und Uhrzeit zu einer gespielten Minute. Uhrzeit ist der Zeitpunkt, zu dem die Uhr
 * die Mitte dieser Minute zeigte, höchstens das Ende der gespielten Zeit. Nicht gespielte Minuten: null.
 */
function placeOf(game: Game, option: MinuteOption, now: number): Place | null {
  if (!minuteOptions(game, now).some((o) => optionKey(o) === optionKey(option))) return null;
  const { section, minute, stoppage } = option;
  const runs = sectionRuns(game.clockEvents);
  const begun =
    stoppage === null
      ? minute - sectionOffset(game.schema, section) - 1
      : sectionMinutesOf(game.schema, section) + stoppage - 1;
  const target = Math.min(begun * MINUTE_MS + MINUTE_MS / 2, playedIn(runs, section, now));
  return { section, minute, stoppage, at: timeAt(runs, section, target) };
}

/** FR-S13, FR-S14: Tore nach Spielzeit ordnen (stabil), Halbzeit- und Endstand auffrischen. */
const withGoals = (game: Game, goals: Goal[]): Game =>
  refreshScores({ ...game, goals: [...goals].sort((a, b) => a.at - b.at) });

/**
 * FR-S10: Tor mit gewählter Minute nachtragen, auch nach dem Schlusspfiff; die Uhr bleibt unverändert (US2-S7).
 * Eine nicht gespielte Minute ist ein Fehler (die Auswahl bietet sie nicht an).
 */
export function addGoalAt(
  game: Game,
  side: Side,
  option: MinuteOption,
  now: number,
  newId: () => string = defaultId,
): { game: Game; goal: Goal } {
  const place = placeOf(game, option, now);
  if (!place) throw new Error(`Minute nicht gespielt: ${option.label}`);
  const goal: Goal = { id: newId(), side, ...place, scorer: null, deletedAt: null };
  return { game: withGoals(game, [...game.goals, goal]), goal };
}

/**
 * FR-S12: Minute eines Tores ändern; Torschütze, Vorlage und Kennzeichen bleiben.
 * Unbekanntes Tor oder nicht gespielte Minute ändern nichts.
 */
export function setGoalMinute(game: Game, goalId: string, option: MinuteOption, now: number): Game {
  const place = placeOf(game, option, now);
  if (!place || !game.goals.some((g) => g.id === goalId)) return game;
  return withGoals(
    game,
    game.goals.map((g) => (g.id === goalId ? { ...g, ...place } : g)),
  );
}

export type WhistleKind = 'Pausenpfiff' | 'Schlusspfiff';

const WHISTLES: Partial<Record<ClockEventType, WhistleKind>> = {
  sectionEnd: 'Pausenpfiff',
  fullTime: 'Schlusspfiff',
};

/** FR-S15: Art des letzten Uhr-Ereignisses, falls es ein Pfiff ist (Beschriftung im "…"-Menü). */
export function whistleKind(game: Game): WhistleKind | null {
  const last = game.clockEvents.at(-1);
  return last ? (WHISTLES[last.type] ?? null) : null;
}

/** FR-S15: Pfiff ist das letzte Uhr-Ereignis, höchstens 10 Minuten alt und kein Elfmeterschießen begonnen. */
export function canUndoWhistle(game: Game, now: number): boolean {
  const last = game.clockEvents.at(-1);
  if (!last || whistleKind(game) === null || game.shootout) return false;
  return now - last.at <= UNDO_WHISTLE_MS;
}

/**
 * FR-S15: Pfiff zurücknehmen; die Uhr läuft weiter, als wäre nicht gepfiffen worden. Halbzeitstand (Ende des
 * 1. Abschnitts) bzw. Endstand und "Unentschieden bestätigt" werden zurückgesetzt. Nicht erlaubt: unverändert.
 */
export function undoWhistle(game: Game, now: number): Game {
  if (!canUndoWhistle(game, now)) return game;
  const whistle = game.clockEvents[game.clockEvents.length - 1] as ClockEvent;
  const clockEvents = game.clockEvents.slice(0, -1);
  const patch: Partial<Game> =
    whistle.type === 'fullTime'
      ? { finalScore: null, drawSettled: false }
      : whistle.section === 1
        ? { halfTimeScore: null }
        : {};
  return { ...game, ...patch, clockEvents, status: deriveClock(clockEvents, now, game.schema).status };
}

interface ShiftBase {
  /** Index des letzten Anpfiffs in `clockEvents`. */
  index: number;
  kick: ClockEvent;
  range: { min: number; max: number };
}

function shiftBase(game: Game, now: number): ShiftBase | null {
  const events = game.clockEvents;
  const kick = events.findLast((e) => e.type === 'kickoff');
  const { status } = deriveClock(events, now, game.schema);
  if (!kick || (status !== 'running' && status !== 'paused')) return null;
  const index = events.lastIndexOf(kick);
  const prev = events[index - 1];
  const next = events[index + 1];
  const inSection = [...game.goals, ...(game.events ?? [])].filter((x) => x.section === kick.section);
  // Spätestens: erste Unterbrechung, erstes Tor oder Ereignis des Abschnitts, jetzt (gespielte Zeit nie negativ).
  const latest = Math.min(now, next?.at ?? now, ...inSection.map((x) => x.at));
  // Frühestens: nach dem vorigen Uhr-Ereignis, ohne vorheriges höchstens 60 Minuten.
  const max = prev ? Math.floor((kick.at - prev.at - 1) / MINUTE_MS) : MAX_SHIFT_MINUTES;
  return {
    index,
    kick,
    range: { min: 0 - Math.floor(Math.max(0, latest - kick.at) / MINUTE_MS), max: Math.max(0, max) },
  };
}

/**
 * FR-S20, FR-S21: erlaubte Korrektur in ganzen Minuten ("+1 Min" erhöht die Spielminute), nur bei laufender
 * oder angehaltener Uhr; sonst null.
 */
export const clockShiftRange = (game: Game, now: number): { min: number; max: number } | null =>
  shiftBase(game, now)?.range ?? null;

/**
 * FR-S21 bis FR-S23: Uhr um `minutes` korrigieren, indem der Anpfiff des laufenden Abschnitts entsprechend
 * früher (bzw. später) gelegt wird. Minuten von Toren und Ereignissen dieses Abschnitts folgen aus ihrer
 * Uhrzeit; Signale dieses Abschnitts, die jetzt nicht mehr erreicht sind, werden wieder fällig.
 * Außerhalb der erlaubten Spanne: unverändert.
 */
export function shiftClock(game: Game, minutes: number, now: number): Game {
  const base = shiftBase(game, now);
  if (!base || minutes < base.range.min || minutes > base.range.max) return game;
  const { index, kick } = base;
  const section = kick.section;
  const clockEvents = game.clockEvents.map((e, i) => (i === index ? { ...e, at: e.at - minutes * MINUTE_MS } : e));
  const runs = sectionRuns(clockEvents);
  const restamp = <T extends Place>(x: T): T => {
    if (x.section !== section) return x;
    const { minute, stoppage } = minuteFor(section, playedIn(runs, section, x.at), game.schema);
    return { ...x, minute, stoppage };
  };
  const reached = deriveClock(clockEvents, now, game.schema).dueThresholds;
  return {
    ...game,
    clockEvents,
    goals: game.goals.map(restamp),
    ...(game.events ? { events: game.events.map(restamp) } : {}),
    signalledThresholds: game.signalledThresholds.filter(
      (key) => !key.startsWith(`${section}:`) || reached.includes(key),
    ),
  };
}
