import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/domain/game';
import { OPPONENT_FALLBACK, opponentName, setOpponent } from '../../src/domain/opponent';
import type { NewGameInput } from '../../src/domain/types';

/** Spec 022 US2 (FR-F11, FR-F13): Gegner ist optional, "Gegner" als Name; nachträglich änderbar. */

const input: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach E1',
  opponent: 'TSV Musterstadt',
  venue: 'home',
  schema: { sections: 2, sectionMinutes: 25 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};
const game = createGame(input, { id: 'g1', now: Date.UTC(2026, 10, 18, 9, 0, 0) });

describe('022 US2-S4 FR-F11 opponentName', () => {
  it('leer oder nur Leerzeichen heißt "Gegner"', () => {
    expect(OPPONENT_FALLBACK).toBe('Gegner');
    expect(opponentName('')).toBe('Gegner');
    expect(opponentName('   ')).toBe('Gegner');
  });

  it('ein Name bleibt, getrimmt und ohne doppelte Leerzeichen', () => {
    expect(opponentName('  TSV  Musterstadt ')).toBe('TSV Musterstadt');
  });

  it('höchstens 40 Zeichen, nach dem Kürzen ohne Leerzeichen am Ende', () => {
    expect(opponentName('x'.repeat(50))).toBe('x'.repeat(40));
    expect(opponentName(`${'x'.repeat(39)} y`)).toBe('x'.repeat(39));
  });
});

describe('022 US2-S5 FR-F13 setOpponent', () => {
  it('ändert den Namen, sonst bleibt das Spiel unverändert', () => {
    expect(setOpponent(game, 'FC Probestadt').opponent).toBe('FC Probestadt');
    expect(setOpponent(game, '  TSV Musterstadt ')).toBe(game);
  });

  it('leer macht aus dem Namen "Gegner"', () => {
    expect(setOpponent(game, '').opponent).toBe('Gegner');
  });

  it('lässt alles andere unberührt', () => {
    const next = setOpponent(game, 'FC Probestadt');
    expect({ ...next, opponent: game.opponent }).toEqual(game);
  });
});
