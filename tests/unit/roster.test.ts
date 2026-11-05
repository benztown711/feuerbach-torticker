import { describe, expect, it } from 'vitest';
import {
  activePlayers,
  addPlayer,
  looksLikeFullName,
  otherPlayers,
  resolvePlayer,
  rosterShareText,
  softDeletePlayer,
  sortPlayers,
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
    expect(visiblePlayers(list, 'number').map((x) => x.id)).toEqual(['b']);
    expect(activePlayers(list).map((x) => x.id)).toEqual(['b']);
    expect(resolvePlayer(list, 'a')?.name).toBe('Max');
    expect(resolvePlayer(list, 'zz')).toBeUndefined();
  });

  it('013 FR-K04 "Rückennummer": nach Nummer, dann Name; ohne Nummer zuletzt', () => {
    const list = [p('a', 'Tom', null), p('b', 'Leo', 5), p('c', 'Ben', 5), p('d', 'Max', 1), p('e', 'Anton', null)];
    expect(visiblePlayers(list, 'number').map((x) => x.name)).toEqual(['Max', 'Ben', 'Leo', 'Anton', 'Tom']);
  });

  it('US5-S2 US5-S4 Aufgebot: nur Aufgebot, ohne Aufgebot der ganze Kader; Rest unter "Andere"', () => {
    const list = [p('a', 'Max', 1), p('b', 'Ben', 3), p('c', 'Tom', 4), p('d', 'Leo', 5, T0)];
    expect(squadPlayers(list, ['c', 'a', 'd'], 'number').map((x) => x.id)).toEqual(['a', 'c']);
    expect(otherPlayers(list, ['c', 'a'], 'number').map((x) => x.id)).toEqual(['b']);
    expect(squadPlayers(list, [], 'number').map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(otherPlayers(list, [], 'number')).toEqual([]);
  });

  it('US7-S7 FR-028 Teilen-Text "Nummer Name" pro Zeile, nur sichtbare Spieler', () => {
    const list = [p('a', 'Tom', null), p('b', 'Max', 1), p('c', 'Leo', 5, T0)];
    expect(rosterShareText(list, 'number')).toBe('1 Max\nTom');
  });
});

describe('Spec 013 Kader sortieren', () => {
  // Kader aus der Spec: "7 Max", "3 Tom", "10 Ben", "Leo" (ohne Nummer).
  const spec = [p('m', 'Max', 7), p('t', 'Tom', 3), p('b', 'Ben', 10), p('l', 'Leo', null)];
  const names = (list: Player[]): string[] => list.map((x) => x.name);

  it('013 US1-S2 FR-K03 "Vorname": alphabetisch aufsteigend', () => {
    expect(names(visiblePlayers(spec, 'name'))).toEqual(['Ben', 'Leo', 'Max', 'Tom']);
  });

  it('013 US1-S3 FR-K04 "Rückennummer": numerisch aufsteigend, ohne Nummer zuletzt', () => {
    expect(names(visiblePlayers(spec, 'number'))).toEqual(['Tom', 'Max', 'Ben', 'Leo']);
  });

  it('013 FR-K03 gleiche Vornamen nach ganzem Namen, dann Nummer; ohne Nummer zuletzt', () => {
    const list = [
      p('a', 'Maxi', 2),
      p('b', 'Max Mü.', 14),
      p('c', 'Max Me.', 7),
      p('d', 'Ben', null),
      p('e', 'Ben', 4),
    ];
    expect(sortPlayers(list, 'name').map((x) => x.id)).toEqual(['e', 'd', 'c', 'b', 'a']);
  });

  it('013 FR-K03 ohne Beachtung von Groß-/Kleinschreibung, Umlaute nach deutscher Regel', () => {
    const list = [p('a', 'Paul', 1), p('b', 'ömer', 2), p('c', 'Oskar', 3), p('d', 'ben', 4), p('e', 'Anton', 5)];
    expect(names(sortPlayers(list, 'name'))).toEqual(['Anton', 'ben', 'ömer', 'Oskar', 'Paul']);
    const same = [p('x', 'ben', 9), p('y', 'Ben', 3)];
    expect(sortPlayers(same, 'name').map((x) => x.id)).toEqual(['y', 'x']);
  });

  it('013 FR-K04 Nummern numerisch (2 vor 10), gleiche Nummer nach Vorname', () => {
    const list = [p('a', 'Tom', 10), p('b', 'Leo', 2), p('c', 'Ben', 2), p('d', 'Max', null), p('e', 'Anton', null)];
    expect(names(sortPlayers(list, 'number'))).toEqual(['Ben', 'Leo', 'Tom', 'Anton', 'Max']);
  });

  it('013 FR-K04 ohne Nummern ergibt "Rückennummer" dieselbe Reihenfolge wie "Vorname"', () => {
    const list = [p('a', 'Tom', null), p('b', 'Ben', null), p('c', 'Leo', null)];
    expect(sortPlayers(list, 'number')).toEqual(sortPlayers(list, 'name'));
  });

  it('013 FR-K06 sortiert nur, ohne die Eingabe zu verändern', () => {
    const list = [...spec];
    sortPlayers(list, 'name');
    expect(list).toEqual(spec);
  });

  it('013 US1-S5 FR-K05 Aufgebot und "Andere …" je für sich sortiert', () => {
    const squad = ['m', 't'];
    expect(names(squadPlayers(spec, squad, 'name'))).toEqual(['Max', 'Tom']);
    expect(names(otherPlayers(spec, squad, 'name'))).toEqual(['Ben', 'Leo']);
    expect(names(squadPlayers(spec, squad, 'number'))).toEqual(['Tom', 'Max']);
    expect(names(otherPlayers(spec, squad, 'number'))).toEqual(['Ben', 'Leo']);
    expect(names(squadPlayers(spec, [], 'name'))).toEqual(['Ben', 'Leo', 'Max', 'Tom']);
  });

  it('013 US1-S6 FR-K05 "Kader teilen" folgt der Sortierung', () => {
    expect(rosterShareText(spec, 'name')).toBe('10 Ben\nLeo\n7 Max\n3 Tom');
    expect(rosterShareText(spec, 'number')).toBe('3 Tom\n7 Max\n10 Ben\nLeo');
  });
});
