import { isPaletteColor } from './jersey-colors';
import { isObj, isText, isTime, MAX_KEY, MAX_TITLE, type Obj } from './live-validate';
import { shortTeamName } from './team-name';
import type { ClockEventType, EventPerson, Game, Player, Schema, Scorer, Side, Venue } from './types';

/** Spec 006 FR-L06, FR-L10: Live-Stand eines Spiels (contracts/live-message.md). */

export interface LiveGoal {
  side: Side;
  minute: number;
  stoppage: number | null;
  section: number;
  /** Anzeigename aus dem Kader bzw. Freitext beim Gegner, sonst null. */
  who: string | null;
  penalty: boolean;
  /** "Eigentor Gegner" (zählt für Feuerbach). */
  ownGoal: boolean;
}

export interface LiveShootout {
  first: Side;
  done: boolean;
  shots: [Side, boolean, string | null][];
}

export interface LiveGameSnapshot {
  v: 1;
  kind: 'game';
  state: 'live';
  gameId: string;
  team: string;
  sentAt: number;
  /** FR-L23: Übergabezähler; der größere gilt vor `sentAt`. */
  h: number;
  createdAt: number;
  own: string;
  opp: string;
  venue: Venue;
  ownColor: string;
  oppColor: string;
  schema: Schema;
  clock: [ClockEventType, number, number][];
  goals: LiveGoal[];
  shootout: LiveShootout | null;
  drawSettled: boolean;
}

/** "Nicht live senden" (off) oder gelöscht (deleted): entfernt das Spiel vom Dashboard. */
export interface LiveTombstone {
  v: 1;
  kind: 'game';
  state: 'off' | 'deleted';
  gameId: string;
  team: string;
  sentAt: number;
  h: number;
}

export type LiveSnapshot = LiveGameSnapshot | LiveTombstone;

const MAX_CLOCK = 50;
const MAX_GOALS = 200;
const MAX_SHOTS = 100;
const MAX_ID = 100;
/** FR-L23: höchstens so viele Übergaben je Spiel. */
export const MAX_TAKEOVER = 100;
const CLOCK_TYPES: ClockEventType[] = ['kickoff', 'pause', 'resume', 'sectionEnd', 'fullTime', 'reset', 'extraTime'];

/** Namen höchstens 40 Zeichen (R-L9); leere werden null. */
const nameOrNull = (s: string): string | null => {
  const t = s.trim().slice(0, MAX_TITLE);
  return t.length > 0 ? t : null;
};

const playerName = (players: Player[], id: string): string | null => {
  const p = players.find((x) => x.id === id);
  return p ? nameOrNull(p.name) : null;
};

function scorerName(scorer: Scorer, players: Player[]): string | null {
  if (scorer === null || scorer.kind === 'ownGoal') return null;
  return scorer.kind === 'text' ? nameOrNull(scorer.text) : playerName(players, scorer.playerId);
}

function personName(who: EventPerson, players: Player[]): string | null {
  if (who === null) return null;
  return who.kind === 'text' ? nameOrNull(who.text) : playerName(players, who.playerId);
}

/** FR-L09: "Nicht live senden" (false) bzw. wieder senden (true); Einschalten hebt "nie gesendet" auf. */
export function setLive(game: Game, on: boolean): Game {
  const next: Game = { ...game, live: on };
  if (on) delete next.livePrivate;
  return next;
}

/** FR-L09: beim Anlegen "Live aufs Dashboard" aus: nicht senden, auch später keinen Grabstein. */
export const startPrivate = (game: Game): Game => ({ ...game, live: false, livePrivate: true });

export const tombstone = (gameId: string, team: string, sentAt: number, h = 0): LiveTombstone => ({
  v: 1,
  kind: 'game',
  state: 'deleted',
  gameId,
  team,
  sentAt,
  h,
});

/** FR-L10: nur, was das Dashboard braucht; nie Kader, Aufgebot, Karten, Wechsel, Lesezeichen. */
export function buildSnapshot(game: Game, players: Player[], team: string, sentAt: number): LiveSnapshot {
  const h = game.liveTakeover ?? 0;
  if (game.live === false) return { ...tombstone(game.id, team, sentAt, h), state: 'off' };
  return {
    v: 1,
    kind: 'game',
    state: 'live',
    gameId: game.id,
    team,
    sentAt,
    h,
    createdAt: game.createdAt,
    own: shortTeamName(game.ownTeam).slice(0, MAX_TITLE),
    opp: game.opponent.slice(0, MAX_TITLE),
    venue: game.venue,
    ownColor: game.ownColor,
    oppColor: game.oppColor,
    schema: { ...game.schema },
    clock: game.clockEvents.map((e) => [e.type, e.at, e.section]),
    goals: game.goals
      .filter((g) => g.deletedAt === null)
      .map((g) => ({
        side: g.side,
        minute: g.minute,
        stoppage: g.stoppage,
        section: g.section,
        who: scorerName(g.scorer, players),
        penalty: g.penalty === true,
        ownGoal: g.scorer?.kind === 'ownGoal',
      })),
    shootout: game.shootout
      ? {
          first: game.shootout.first,
          done: game.shootout.done,
          shots: game.shootout.shots.map((s) => [s.side, s.hit, personName(s.who, players)]),
        }
      : null,
    drawSettled: game.drawSettled === true,
  };
}

/* ---------- Prüfung eingehender Stände (R-L9) ---------- */

const isInt = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const isSide = (v: unknown): v is Side => v === 'own' || v === 'opp';
const isName = (v: unknown): v is string | null => v === null || isText(v, MAX_TITLE);
const isColor = (v: unknown): v is string => typeof v === 'string' && isPaletteColor(v);

function parseSchema(v: unknown): Schema | null {
  if (!isObj(v) || !isInt(v.sections, 1, 4) || !isInt(v.sectionMinutes, 1, 60)) return null;
  if (v.extraMinutes === undefined) return { sections: v.sections, sectionMinutes: v.sectionMinutes };
  if (!isInt(v.extraMinutes, 1, 30)) return null;
  return { sections: v.sections, sectionMinutes: v.sectionMinutes, extraMinutes: v.extraMinutes };
}

function parseClock(v: unknown): [ClockEventType, number, number][] | null {
  if (!Array.isArray(v) || v.length > MAX_CLOCK) return null;
  const out: [ClockEventType, number, number][] = [];
  for (const e of v as unknown[]) {
    if (!Array.isArray(e) || !CLOCK_TYPES.includes(e[0] as ClockEventType)) return null;
    if (!isTime(e[1]) || !isInt(e[2], 1, 6)) return null;
    out.push([e[0] as ClockEventType, e[1], e[2]]);
  }
  return out;
}

function parseGoal(v: unknown): LiveGoal | null {
  if (!isObj(v) || !isSide(v.side) || !isInt(v.minute, 1, 240) || !isInt(v.section, 1, 6)) return null;
  if (!(v.stoppage === null || isInt(v.stoppage, 1, 60)) || !isName(v.who)) return null;
  if (typeof v.penalty !== 'boolean' || typeof v.ownGoal !== 'boolean') return null;
  return {
    side: v.side,
    minute: v.minute,
    stoppage: v.stoppage,
    section: v.section,
    who: v.who,
    penalty: v.penalty,
    ownGoal: v.ownGoal,
  };
}

function parseShootout(v: unknown): LiveShootout | null | undefined {
  if (v === null) return null;
  if (!isObj(v) || !isSide(v.first) || typeof v.done !== 'boolean' || !Array.isArray(v.shots)) return undefined;
  const shots = v.shots as unknown[];
  if (shots.length > MAX_SHOTS) return undefined;
  const out: LiveShootout['shots'] = [];
  for (const s of shots) {
    if (!Array.isArray(s) || !isSide(s[0]) || typeof s[1] !== 'boolean' || !isName(s[2])) return undefined;
    out.push([s[0], s[1], s[2]]);
  }
  return { first: v.first, done: v.done, shots: out };
}

function parseGame(v: Obj, base: Omit<LiveTombstone, 'state'>): LiveGameSnapshot | null {
  if (!isTime(v.createdAt) || !isText(v.own, MAX_TITLE) || !isText(v.opp, MAX_TITLE)) return null;
  if ((v.venue !== 'home' && v.venue !== 'away') || !isColor(v.ownColor) || !isColor(v.oppColor)) return null;
  const schema = parseSchema(v.schema);
  const clock = parseClock(v.clock);
  if (!schema || !clock || !Array.isArray(v.goals) || v.goals.length > MAX_GOALS) return null;
  const goals = (v.goals as unknown[]).map(parseGoal);
  const shootout = parseShootout(v.shootout);
  if (goals.some((g) => g === null) || shootout === undefined || typeof v.drawSettled !== 'boolean') return null;
  return {
    ...base,
    state: 'live',
    createdAt: v.createdAt,
    own: v.own,
    opp: v.opp,
    venue: v.venue,
    ownColor: v.ownColor,
    oppColor: v.oppColor,
    schema,
    clock,
    goals: goals as LiveGoal[],
    shootout,
    drawSettled: v.drawSettled,
  };
}

/** Prüft einen entschlüsselten Live-Stand streng; alles Unbekannte fällt weg, Fehlerhaftes ergibt null. */
export function parseSnapshot(v: unknown): LiveSnapshot | null {
  if (!isObj(v) || v.v !== 1 || v.kind !== 'game') return null;
  if (!isText(v.gameId, MAX_ID) || !isText(v.team, MAX_KEY) || !isTime(v.sentAt)) return null;
  const h = v.h === undefined ? 0 : v.h;
  if (!isInt(h, 0, MAX_TAKEOVER)) return null;
  const base = { v: 1 as const, kind: 'game' as const, gameId: v.gameId, team: v.team, sentAt: v.sentAt, h };
  if (v.state === 'off' || v.state === 'deleted') return { ...base, state: v.state };
  return v.state === 'live' ? parseGame(v, base) : null;
}
