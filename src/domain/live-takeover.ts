import { deriveClock } from './clock';
import { score } from './goals';
import type { Board, BoardEntry } from './live-board';
import { MAX_TAKEOVER, type LiveGameSnapshot, type LiveGoal } from './live-snapshot';
import { sectionMinutesOf, sectionOffset } from './minute';
import type { ClockEvent, EventPerson, Game, Goal, Player, Score, Shot, Side } from './types';
import { normalizeName } from './validation';

/**
 * Spec 006 US6 (FR-L22 bis FR-L24): ein laufendes Spiel eines anderen Trainer-Handys aus dem letzten
 * Live-Stand übernehmen, und erkennen, dass das eigene Spiel übernommen wurde.
 */

const MINUTE_MS = 60_000;

export interface TakeoverInput {
  /** Letzter Live-Stand mit Serverzeit. */
  entry: BoardEntry;
  /** Name der eigenen Mannschaft aus "Meine Mannschaften". */
  ownTeam: string;
  /** Eigener Kader: Torschützen werden über den Namen zugeordnet. */
  players: Player[];
  /** Serverzeit minus eigene Uhrzeit (R-L4). */
  skew: number;
  /** Jetzt auf der eigenen Uhr. */
  now: number;
  newId: () => string;
}

const playerNamed = (players: Player[], name: string | null): string | null => {
  if (name === null) return null;
  const n = normalizeName(name);
  return players.find((p) => p.deletedAt === null && normalizeName(p.name) === n)?.id ?? null;
};

function person(side: Side, who: string | null, players: Player[]): EventPerson {
  if (side === 'opp') return who === null ? null : { kind: 'text', text: who };
  const id = playerNamed(players, who);
  return id === null ? null : { kind: 'player', playerId: id };
}

/**
 * Uhrzeit des Tors, geschätzt aus Minute und Anpfiff des Abschnitts (Pausen nicht berücksichtigt), höchstens
 * der Zeitpunkt der Meldung: Ein später Treffer auf diesem Handy gilt sonst als Doppeltipp (DOUBLE_TAP_MS).
 */
function goalAt(g: LiveGoal, clock: ClockEvent[], s: LiveGameSnapshot, latest: number): number {
  const kickoff = clock.filter((e) => e.type === 'kickoff' && e.section === g.section).pop();
  if (!kickoff) return latest;
  const played =
    g.stoppage === null
      ? (g.minute - sectionOffset(s.schema, g.section) - 1) * MINUTE_MS
      : (sectionMinutesOf(s.schema, g.section) + g.stoppage - 1) * MINUTE_MS;
  return Math.min(latest, kickoff.at + Math.max(0, played) + MINUTE_MS / 2);
}

function goalOf(g: LiveGoal, at: number, players: Player[], id: string): Goal {
  const who = person(g.side, g.who, players);
  return {
    id,
    side: g.side,
    at,
    section: g.section,
    minute: g.minute,
    stoppage: g.stoppage,
    scorer: g.side === 'own' && g.ownGoal ? { kind: 'ownGoal' } : who,
    deletedAt: null,
    penalty: g.penalty,
  };
}

const scoreOf = (goals: Goal[]): Score => score({ goals } as Game);

/** FR-L23: legt das Spiel aus dem letzten Live-Stand an, mit um eins erhöhtem Übergabezähler. */
export function takeoverGame(i: TakeoverInput): Game {
  const s = i.entry.snap;
  // Uhr des alten Handys → Serverzeit → eigene Uhr (R-L4)
  const local = (t: number): number => t - (s.sentAt - i.entry.at) - i.skew;
  const clockEvents: ClockEvent[] = s.clock.map(([type, at, section]) => ({ type, at: local(at), section }));
  // Die Tore fielen vor der Meldung (Serverzeit der Meldung auf der eigenen Uhr).
  const latest = Math.min(i.now, i.entry.at - i.skew);
  const goals = s.goals.map((g) => goalOf(g, goalAt(g, clockEvents, s, latest), i.players, i.newId()));
  const clock = deriveClock(clockEvents, i.now, s.schema);
  const firstHalfDone = clockEvents.some((e) => e.type === 'sectionEnd' && e.section === 1);
  const shots: Shot[] = (s.shootout?.shots ?? []).map(([side, hit, who]) => ({
    side,
    hit,
    who: person(side, who, i.players),
    at: i.now,
  }));
  return {
    id: s.gameId,
    schemaVersion: 1,
    ownTeam: i.ownTeam,
    opponent: s.opp,
    venue: s.venue,
    schema: { ...s.schema },
    ownColor: s.ownColor,
    oppColor: s.oppColor,
    createdAt: local(s.createdAt),
    clockEvents,
    goals,
    events: [],
    drawSettled: s.drawSettled,
    ...(s.shootout ? { shootout: { first: s.shootout.first, done: s.shootout.done, shots } } : {}),
    // Bereits erreichte Signalschwellen nicht noch einmal pfeifen.
    signalledThresholds: clock.dueThresholds,
    squad: [],
    status: clock.status,
    finalScore: clock.status === 'finished' ? scoreOf(goals) : null,
    halfTimeScore: firstHalfDone ? scoreOf(goals.filter((g) => g.section === 1)) : null,
    live: true,
    liveTakeover: Math.min(s.h + 1, MAX_TAKEOVER),
  };
}

/**
 * FR-L24: Hat ein anderes Handy dieses Spiel übernommen? Ja, wenn das Dashboard einen Stand oder Grabstein
 * des Spiels mit größerem Übergabezähler kennt.
 */
export function takenOver(board: Board, game: Game, team: string): boolean {
  const own = game.liveTakeover ?? 0;
  const id = `${team}/${game.id}`;
  return (
    board.games.some((e) => e.snap.team === team && e.snap.gameId === game.id && e.snap.h > own) ||
    board.removed.some(([r, , h]) => r === id && h > own)
  );
}

/** FR-L24: übernommenes Spiel: nicht mehr senden, lokal vollständig erhalten. */
export const handOver = (game: Game): Game => ({ ...game, live: false, liveHandedOver: true });
