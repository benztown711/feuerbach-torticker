import { describe, expect, it } from 'vitest';
import { applyImport, annotateRows, planImport } from '../../src/domain/roster-merge';
import { parseRosterList } from '../../src/domain/roster-parse';
import { rosterShareText } from '../../src/domain/roster';
import type { Player } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const p = (id: string, name: string, number: number | null, deletedAt: number | null = null): Player => ({
  id,
  name,
  number,
  deletedAt,
});
let n = 0;
const ids = () => `new-${++n}`;
const plan = (existing: Player[], text: string) => planImport(existing, parseRosterList(text));

describe('T065 FR-026 FR-027 Zusammenführen', () => {
  it('US7-S1 leerer Kader: alle neu, Tom ohne Nummer', () => {
    n = 0;
    const rows = plan([], '1 Max\n2 Maxi\n5 Ben\nTom');
    expect(rows.map((r) => [r.number, r.name, r.matchId])).toEqual([
      [1, 'Max', null],
      [2, 'Maxi', null],
      [5, 'Ben', null],
      [null, 'Tom', null],
    ]);
    expect(applyImport([], rows, ids).map((x) => [x.id, x.number, x.name])).toEqual([
      ['new-1', 1, 'Max'],
      ['new-2', 2, 'Maxi'],
      ['new-3', 5, 'Ben'],
      ['new-4', null, 'Tom'],
    ]);
  });

  it('US7-S2 US7-S3 Nachnamen: gekürzt und markiert, nie gespeichert', () => {
    const rows = plan([], '1 Max Müller\n2 Max Meier\n3 Ben Mustermann');
    expect(rows.map((r) => r.name)).toEqual(['Max Mü.', 'Max Me.', 'Ben']);
    expect(rows.every((r) => r.warnings.includes('nachname'))).toBe(true);
    const saved = applyImport([], rows, ids);
    expect(JSON.stringify(saved)).not.toMatch(/Müller|Meier|Mustermann/);
  });

  it('US7-S5 doppelte Nummern und doppelte Namen werden markiert', () => {
    const rows = plan([p('a', 'Tom', 9)], '7 Leo\n7 Paul\nTom');
    expect(rows[0]?.warnings).toContain('nummer-doppelt');
    expect(rows[1]?.warnings).toContain('nummer-doppelt');
    expect(rows[2]?.warnings).toEqual([]);
    expect(rows[2]?.matchId).toBe('a');
    const dupName = plan([p('a', 'Tom', 9)], '3 Tom');
    expect(dupName[0]?.matchId).toBeNull();
    expect(dupName[0]?.warnings).toContain('name-doppelt');
  });

  it('übernimmt Warnung für ungültige Nummer aus dem Parser', () => {
    expect(plan([], '120 Max')[0]?.warnings).toEqual(['nummer-ungueltig']);
  });

  it('US7-S6 Zuordnung ohne Nummer über den Vornamen, nichts wird gelöscht', () => {
    const existing = [p('a', 'Max', 1), p('b', 'Ben', 3)];
    const rows = plan(existing, 'Max\nLeo');
    expect(rows[0]?.matchId).toBe('a');
    const result = applyImport(existing, rows, ids);
    expect(result.find((x) => x.id === 'a')).toEqual(p('a', 'Max', 1));
    expect(result.map((x) => x.name).sort()).toEqual(['Ben', 'Leo', 'Max']);
  });

  it('Zuordnung über Nummer und Vorname hat Vorrang', () => {
    const existing = [p('a', 'Max Mü.', 1), p('b', 'Max Me.', 2)];
    const rows = plan(existing, '2 Max\n1 Max');
    expect(rows.map((r) => r.matchId)).toEqual(['b', 'a']);
    expect(rows.map((r) => r.name)).toEqual(['Max Me.', 'Max Mü.']);
  });

  it('andere Nummer beim gleichen Vornamen ist ein anderes Kind', () => {
    const rows = plan([p('a', 'Max', 1)], '7 Max');
    expect(rows[0]?.matchId).toBeNull();
    expect(rows[0]?.warnings).toContain('name-doppelt');
  });

  it('Präfix-Verträglichkeit: "Max M." passt zu Müller, nicht zu Becker', () => {
    expect(plan([p('a', 'Max M.', null)], 'Max Müller')[0]?.matchId).toBe('a');
    expect(plan([p('a', 'Max M.', null)], 'Max Becker')[0]?.matchId).toBeNull();
  });

  it('T065 Abkürzung wird bei neuem Namensvetter verlängert', () => {
    const existing = [p('a', 'Max M.', 1)];
    const rows = plan(existing, '1 Max Müller\n4 Max Meier');
    expect(rows.map((r) => [r.matchId, r.name])).toEqual([
      ['a', 'Max Mü.'],
      [null, 'Max Me.'],
    ]);
    const result = applyImport(existing, rows, ids);
    expect(result.find((x) => x.id === 'a')?.name).toBe('Max Mü.');
  });

  it('bestehender Namensvetter außerhalb der Liste behält seinen Namen, neue weichen aus', () => {
    const rows = plan([p('a', 'Max M.', 1)], '4 Max Meier');
    expect(rows[0]?.name).toBe('Max Me.');
  });

  it('US7-S9 gelöschter Spieler wird wiederbelebt statt dupliziert', () => {
    const existing = [p('a', 'Max', 1, T0)];
    const rows = plan(existing, '1 Max');
    expect(rows[0]).toMatchObject({ matchId: 'a', revive: true });
    expect(applyImport(existing, rows, ids)).toEqual([p('a', 'Max', 1)]);
  });

  it('US7-S8 erneutes Einfügen derselben Liste erzeugt keine Duplikate', () => {
    const first = applyImport([], plan([], '1 Max\n2 Ben\nTom'), ids);
    const again = applyImport(first, plan(first, '1 Max\n2 Ben\nTom'), ids);
    expect(again).toEqual(first);
  });

  it('US7-S4 bearbeitete Namen werden neu geprüft und übernommen', () => {
    const rows = plan([], 'Max\nMax');
    expect(rows.every((r) => r.warnings.includes('name-doppelt'))).toBe(true);
    const edited = annotateRows(
      [],
      rows.map((r, i) => (i === 1 ? { ...r, name: '  Maxi ' } : r)),
    );
    expect(edited.every((r) => !r.warnings.includes('name-doppelt'))).toBe(true);
    expect(applyImport([], edited, ids).map((x) => x.name)).toEqual(['Max', 'Maxi']);
  });

  it('übernimmt keine Zeilen mit leerem Namen', () => {
    const rows = plan([], 'Max').map((r) => ({ ...r, name: '  ' }));
    expect(annotateRows([], rows)[0]?.warnings).toContain('name-leer');
    expect(applyImport([], rows, ids)).toEqual([]);
  });
});

describe('001 US7-S7 US7-S8 FR-028 geteilten Kader wieder einfügen', () => {
  const shared = [p('a', 'Max Me.', 7), p('b', 'Max Mü.', 14), p('c', 'Ben', null)];
  const roundTrip = (players: Player[]) => {
    const rows = plan([], rosterShareText(players));
    return { rows, saved: applyImport([], rows, ids) };
  };
  const view = (players: Player[]) => players.map((x) => [x.number, x.name]).sort();

  it('001 US7-S7 FR-028 abgekürzte Namen bleiben, ohne Hinweis "nachname" und ohne Duplikat', () => {
    const rows = plan([], '7 Max Me.\n14 Max Mü.\nBen');
    expect(rows.map((r) => [r.number, r.name, r.warnings])).toEqual([
      [7, 'Max Me.', []],
      [14, 'Max Mü.', []],
      [null, 'Ben', []],
    ]);
    expect(rows.every((r) => !r.shortened)).toBe(true);
  });

  it('001 US7-S8 FR-028 zweites Gerät: derselbe Kader, auch bei einzelnem oder langem Kürzel', () => {
    const { rows, saved } = roundTrip(shared);
    expect(rows.every((r) => r.warnings.length === 0)).toBe(true);
    expect(view(saved)).toEqual(view(shared));
    const odd = [p('a', 'Max Mei.', 3), p('b', 'Max Mü.', 4), p('c', 'Tom S.', 5)];
    expect(view(roundTrip(odd).saved)).toEqual(view(odd));
  });

  it('001 US7-S8 FR-027 erneutes Einfügen des geteilten Texts erzeugt keine Duplikate', () => {
    const first = roundTrip(shared).saved;
    const rows = plan(first, rosterShareText(first));
    expect(rows.every((r) => r.matchId !== null && r.warnings.length === 0)).toBe(true);
    expect(applyImport(first, rows, ids)).toEqual(first);
    const noNumbers = plan(first, 'Max Mü.\nMax Me.');
    expect(noNumbers.map((r) => [r.matchId, r.name])).toEqual([
      [first[1]!.id, 'Max Mü.'],
      [first[0]!.id, 'Max Me.'],
    ]);
  });

  it('001 US7-S8 FR-026 gleiches Kürzel wie ein bestehender Spieler wird als doppelt markiert', () => {
    const existing = [p('a', 'Max Mü.', 1), p('b', 'Max Me.', 2)];
    expect(plan(existing, '9 Max Mü.').map((r) => [r.matchId, r.name, r.warnings])).toEqual([
      [null, 'Max Mü.', ['name-doppelt']],
    ]);
    const rows = plan(existing, '1 Max\n9 Max Mü.');
    expect(rows.map((r) => [r.matchId, r.name, r.warnings])).toEqual([
      ['a', 'Max Mü.', ['name-doppelt']],
      [null, 'Max Mü.', ['name-doppelt']],
    ]);
  });

  it('001 US7-S8 FR-026 Kürzel benennt einen gleichnamigen Spieler nicht still um', () => {
    const rows = plan([p('a', 'Max Mü.', 1)], '1 Max\n9 Max Mü.');
    expect(rows.map((r) => [r.matchId, r.name, r.warnings])).toEqual([
      ['a', 'Max Mü.', ['name-doppelt']],
      [null, 'Max Mü.', ['name-doppelt']],
    ]);
  });

  it('001 US7-S8 FR-025 Kürzel und voller Nachname gemischt: nur der Nachname wird gekürzt', () => {
    const rows = plan([], 'Max Me.\nMax Müller');
    expect(rows.map((r) => [r.name, r.warnings])).toEqual([
      ['Max Me.', []],
      ['Max M.', ['nachname']],
    ]);
  });
});
