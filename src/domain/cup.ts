import { normalizePerson } from './events';
import { clockOf } from './game';
import { score } from './goals';
import type { EventPerson, Game, Shot, Side } from './types';

/** Spielt ein Elfmeterschießen fünf Schützen je Mannschaft, danach Sudden Death. */
const ROUNDS = 5;
const other = (s: Side): Side => (s === 'own' ? 'opp' : 'own');

/** Beendet und unentschieden (reguläre Spielzeit bzw. Verlängerung). */
const isDraw = (game: Game): boolean => {
  const s = score(game);
  return game.status === 'finished' && s.own === s.opp;
};

/** FR-P01: Nach dem Schlusspfiff bei Unentschieden fragt die App, wie es weitergeht. */
export const needsDrawDecision = (game: Game): boolean => isDraw(game) && !game.drawSettled && !game.shootout;

/** FR-P01: "Verlängerung" nur einmal und nicht nach einem Elfmeterschießen. */
export const canExtraTime = (game: Game): boolean => isDraw(game) && !game.schema.extraMinutes && !game.shootout;

/** FR-P01: "Unentschieden" beendet das Spiel wie bisher. */
export const settleDraw = (game: Game): Game => ({ ...game, drawSettled: true });

/** FR-P02: Verlängerung mit zwei Abschnitten; die Uhr wartet auf den Anpfiff. */
export function startExtraTime(game: Game, minutes: number, now: number): Game {
  if (!canExtraTime(game)) throw new Error('Verlängerung nicht möglich');
  const schema = { ...game.schema, extraMinutes: minutes };
  const clockEvents = [...game.clockEvents, { type: 'extraTime' as const, at: now, section: game.schema.sections }];
  const next = { ...game, schema, clockEvents };
  return { ...next, status: clockOf(next, now).status };
}

/** FR-P03: Elfmeterschießen nach Unentschieden; beginnende Mannschaft wählbar. */
export function startShootout(game: Game, first: Side): Game {
  if (!isDraw(game) || game.shootout) throw new Error('Elfmeterschießen nicht möglich');
  return { ...game, shootout: { first, shots: [], done: false } };
}

export interface ShootoutState {
  own: number;
  opp: number;
  next: Side;
  decided: boolean;
  winner: Side | null;
}

/** Stand, wer dran ist und ob entschieden ist (5 Schützen je Mannschaft, danach Sudden Death). */
export function shootoutState(game: Game): ShootoutState {
  const shots = game.shootout?.shots ?? [];
  const first = game.shootout?.first ?? 'own';
  const count = (side: Side, hit?: boolean): number =>
    shots.filter((s) => s.side === side && (hit === undefined || s.hit === hit)).length;
  const own = count('own', true);
  const opp = count('opp', true);
  const ownShots = count('own');
  const oppShots = count('opp');
  const next = shots.length % 2 === 0 ? first : other(first);
  const decided =
    ownShots <= ROUNDS && oppShots <= ROUNDS
      ? own + (ROUNDS - ownShots) < opp || opp + (ROUNDS - oppShots) < own
      : ownShots === oppShots && own !== opp;
  return { own, opp, next, decided, winner: decided ? (own > opp ? 'own' : 'opp') : null };
}

/** FR-P03: Treffer oder Verschossen; eigener Schütze aus dem Kader, Gegner als Freitext (ungültig = ohne Namen). */
export function addShot(game: Game, hit: boolean, who: EventPerson, now: number): Game {
  const so = game.shootout;
  if (!so || so.done) return game;
  const st = shootoutState(game);
  if (st.decided) return game;
  const shot: Shot = { side: st.next, hit, who: normalizePerson(st.next, who) ?? null, at: now };
  return { ...game, shootout: { ...so, shots: [...so.shots, shot] } };
}

/** FR-P03: letzten Schuss zurücknehmen. */
export function undoShot(game: Game): Game {
  const so = game.shootout;
  if (!so || so.shots.length === 0) return game;
  return { ...game, shootout: { ...so, shots: so.shots.slice(0, -1), done: false } };
}

/** FR-P03: "Elfmeterschießen beenden". */
export function endShootout(game: Game): Game {
  return game.shootout ? { ...game, shootout: { ...game.shootout, done: true } } : game;
}
