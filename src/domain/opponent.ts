import type { Game } from './types';

/** Spec 022 FR-F11: Name des Gegners, wenn nichts eingetragen wurde. */
export const OPPONENT_FALLBACK = 'Gegner';

const MAX = 40;

/** Spec 022 FR-F11: getrimmt, ohne doppelte Leerzeichen, höchstens 40 Zeichen; leer heißt "Gegner". */
export function opponentName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ').slice(0, MAX).trim();
  return name === '' ? OPPONENT_FALLBACK : name;
}

/** Spec 022 FR-F13: Gegnernamen eines Spiels ändern; unverändert, wenn der Name gleich bleibt. */
export function setOpponent(game: Game, raw: string): Game {
  const opponent = opponentName(raw);
  return opponent === game.opponent ? game : { ...game, opponent };
}
