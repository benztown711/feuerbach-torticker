import { describe, expect, it } from 'vitest';
import {
  addPlayer,
  looksLikeFullName,
  otherPlayers,
  resolvePlayer,
  rosterShareText,
  softDeletePlayer,
  squadPlayers,
  updatePlayer,
  validatePlayerName,
  visiblePlayers,
} from '../../src/domain/roster';
import type { Player } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const p = (id: string, name: string, number: number | null, deletedAt: number | null = null): Player => ({
  id,
  name,
  number,
  deletedAt,
});

describe('T053 FR-029 Kader', () => {
  it('US5-S1 legt einen Spieler mit getrimmtem Namen und Nummer an', () => {
    const list = addPlayer([], { name: '  Max  ', number: 7 }, 'p1');
    expect(list).toEqual([p('p1', 'Max', 7)]);
  });

  it('prüft Namen: 1 bis 24 Zeichen', () => {
    expect(validatePlayerName('')).toBe('Bitte einen Namen eintragen.');
    expect(validatePlayerName('   ')).toBe('Bitte einen Namen eintragen.');
    expect(validatePlayerName('M'.repeat(25))).toBe('Höchstens 24 Zeichen.');
    expect(validatePlayerName('Max')).toBeNull();
  });

  it('FR-020 erkennt mögliche Nachnamen, erlaubt aber Abkürzungen', () => {
    expect(looksLikeFullName('Max Mustermann')).toBe(true);
    expect(looksLikeFullName('Max Mü.')).toBe(false);
    expect(looksLikeFullName('Max')).toBe(false);
    expect(looksLikeFullName('Jan-Ole')).toBe(false);
  });

  it('ändert Name und Nummer eines Spielers, andere bleiben unverändert', () => {
    const list = [p('a', 'Max', 1), p('b', 'Ben', 3)];
    expect(updatePlayer(list, 'a', { name: ' Maxi ', number: null })).toEqual([p('a', 'Maxi', null), p('b', 'Ben', 3)]);
  });

  it('US5-S6 Soft-Delete blendet aus, ID bleibt für alte Tore auflösbar', () => {
    const list = softDeletePlayer([p('a', 'Max', 1), p('b', 'Ben', 3)], 'a', T0);
    expect(visiblePlayers(list).map((x) => x.id)).toEqual(['b']);
    expect(resolvePlayer(list, 'a')?.name).toBe('Max');
    expect(resolvePlayer(list, 'zz')).toBeUndefined();
  });

  it('sortiert nach Nummer, dann Name; ohne Nummer zuletzt', () => {
    const list = [p('a', 'Tom', null), p('b', 'Leo', 5), p('c', 'Ben', 5), p('d', 'Max', 1), p('e', 'Anton', null)];
    expect(visiblePlayers(list).map((x) => x.name)).toEqual(['Max', 'Ben', 'Leo', 'Anton', 'Tom']);
  });

  it('US5-S2 US5-S4 Aufgebot: nur Aufgebot, ohne Aufgebot der ganze Kader; Rest unter "Andere"', () => {
    const list = [p('a', 'Max', 1), p('b', 'Ben', 3), p('c', 'Tom', 4), p('d', 'Leo', 5, T0)];
    expect(squadPlayers(list, ['c', 'a', 'd']).map((x) => x.id)).toEqual(['a', 'c']);
    expect(otherPlayers(list, ['c', 'a']).map((x) => x.id)).toEqual(['b']);
    expect(squadPlayers(list, []).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(otherPlayers(list, [])).toEqual([]);
  });

  it('US7-S7 FR-028 Teilen-Text "Nummer Name" pro Zeile, nur sichtbare Spieler', () => {
    const list = [p('a', 'Tom', null), p('b', 'Max', 1), p('c', 'Leo', 5, T0)];
    expect(rosterShareText(list)).toBe('1 Max\nTom');
  });
});
