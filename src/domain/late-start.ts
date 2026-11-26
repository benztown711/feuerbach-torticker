import { deriveClock } from './clock';
import { sectionLabel } from './minute';
import type { ClockEvent, Game, Goal, Schema, Side } from './types';

/**
 * Spec 023 (Spiel läuft schon): Einstieg ins laufende Spiel. Der bisherige Verlauf wird als Uhr-Ereignisse
 * zurückgerechnet (research.md R-J1), der bisherige Spielstand als Tore vor Tickerbeginn angelegt (R-J2).
 */

const MINUTE_MS = 60_000;

/** R-J1: angenommene Pause zwischen zwei Abschnitten beim Zurückrechnen. */
export const ENTRY_BREAK_MS = 5 * MINUTE_MS;

/** FR-J10: höchstens so viele Tore je Mannschaft im Blatt. */
export const MAX_PRE_GOALS = 30;

const defaultId = (): string => globalThis.crypto.randomUUID();

export interface EntryChoice {
  /** "s2" = 2. Abschnitt läuft, "p1" = Pause nach dem 1. Abschnitt. */
  key: string;
  label: string;
  section: number;
  pause: boolean;
}

/** FR-J03: alle regulären Abschnitte und die Pausen dazwischen ("Halbzeit" bzw. "1. Pause"). */
export function entryChoices(schema: Schema): EntryChoice[] {
  const out: EntryChoice[] = [];
  for (let k = 1; k <= schema.sections; k++) {
    out.push({ key: `s${k}`, label: sectionLabel(k, schema.sections), section: k, pause: false });
    if (k < schema.sections)
      out.push({ key: `p${k}`, label: schema.sections === 2 ? 'Halbzeit' : `${k}. Pause`, section: k, pause: true });
  }
  return out;
}

/** FR-J03: Spielminute zur Restzeit, z. B. 39 bei noch 7 Minuten im 3. Drittel (3 × 15). */
export const entryMinute = (schema: Schema, section: number, rest: number): number =>
  (section - 1) * schema.sectionMinutes + Math.min(schema.sectionMinutes, schema.sectionMinutes - rest + 1);

export interface JoinInput {
  /** Laufender Abschnitt bzw. Abschnitt vor der gewählten Pause. */
  section: number;
  pause: boolean;
  /** Restzeit in ganzen Minuten (nur bei laufendem Abschnitt). */
  rest: number;
  own: number;
  opp: number;
}

/** FR-J01: nur vor dem ersten Anpfiff. */
export const canJoin = (game: Game): boolean => game.clockEvents.length === 0;

const isCount = (n: number, max: number): boolean => Number.isInteger(n) && n >= 0 && n <= max;

function valid(schema: Schema, i: JoinInput): boolean {
  if (!Number.isInteger(i.section) || i.section < 1 || i.section > schema.sections) return false;
  if (i.pause ? i.section === schema.sections : !isCount(i.rest, schema.sectionMinutes)) return false;
  return isCount(i.own, MAX_PRE_GOALS) && isCount(i.opp, MAX_PRE_GOALS);
}

/**
 * FR-J04, FR-J11, FR-J14: Einstieg übernehmen. Ungültige Eingaben oder ein schon angepfiffenes Spiel bleiben
 * unverändert.
 */
export function joinGame(game: Game, input: JoinInput, now: number, newId: () => string = defaultId): Game {
  if (!canJoin(game) || !valid(game.schema, input)) return game;
  const length = game.schema.sectionMinutes * MINUTE_MS;
  const k = input.section;
  // Ende des zuletzt gewählten Stücks: Anpfiff des laufenden Abschnitts bzw. Pausenpfiff.
  const events: ClockEvent[] = [];
  let at: number;
  if (input.pause) {
    at = now - length;
    events.push(
      { type: 'kickoff', at, section: k, entry: true },
      { type: 'sectionEnd', at: now, section: k, entry: true },
    );
  } else {
    at = now - (game.schema.sectionMinutes - input.rest) * MINUTE_MS;
    events.push({ type: 'kickoff', at, section: k, entry: true });
  }
  for (let j = k - 1; j >= 1; j--) {
    const end = at - ENTRY_BREAK_MS;
    at = end - length;
    events.unshift(
      { type: 'kickoff', at, section: j, entry: true },
      { type: 'sectionEnd', at: end, section: j, entry: true },
    );
  }
  const pre = (side: Side): Goal => ({
    id: newId(),
    side,
    at,
    section: 1,
    minute: 1,
    stoppage: null,
    scorer: null,
    deletedAt: null,
    beforeTicker: true,
  });
  const goals = [
    ...Array.from({ length: input.own }, () => pre('own')),
    ...Array.from({ length: input.opp }, () => pre('opp')),
  ];
  const halfTime = input.pause && k === 1 ? { own: input.own, opp: input.opp } : null;
  return {
    ...game,
    clockEvents: events,
    goals,
    status: deriveClock(events, now, game.schema).status,
    halfTimeScore: halfTime,
  };
}

/** "dieser Halbzeit", "dieses Drittels", "dieses Viertels", "des Spiels" bzw. "der Verlängerung". */
function sectionGenitive(schema: Schema, section: number): string {
  if (section > schema.sections) return 'der Verlängerung';
  if (schema.sections === 1) return 'des Spiels';
  return schema.sections === 2 ? 'dieser Halbzeit' : schema.sections === 3 ? 'dieses Drittels' : 'dieses Viertels';
}

/**
 * Spec 023 FR-J20 (Nachzug Design-Check): Hinweis im Blatt "Uhr korrigieren" zur gewählten Änderung der Restzeit
 * in Minuten (negativ = weniger Restzeit), z. B. "17 Min weniger Restzeit. Pfiff und Tor-Minuten dieser Halbzeit
 * passen sich an."
 */
export function restChangeText(schema: Schema, section: number, diff: number): string {
  if (diff === 0) return 'Unverändert.';
  const what = `${Math.abs(diff)} Min ${diff < 0 ? 'weniger' : 'mehr'} Restzeit.`;
  return `${what} Pfiff und Tor-Minuten ${sectionGenitive(schema, section)} passen sich an.`;
}
