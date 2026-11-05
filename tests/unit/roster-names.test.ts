import { describe, expect, it } from 'vitest';
import { MAX_NAME, abbreviationOf, firstNameOf, uniqueNames } from '../../src/domain/roster-names';

const names = (entries: { first: string; last: string | null; fixed?: boolean }[]) =>
  uniqueNames(entries).map((r) => r.name);

describe('T064 FR-020 FR-025 eindeutige Anzeigenamen', () => {
  it('US7-S2 allein: nur Vorname, Nachname verworfen', () => {
    expect(names([{ first: 'Max', last: 'Mustermann' }])).toEqual(['Max']);
  });

  it('US7-S3 kürzeste eindeutige Abkürzung', () => {
    expect(
      names([
        { first: 'Max', last: 'Müller' },
        { first: 'Max', last: 'Meier' },
      ]),
    ).toEqual(['Max Mü.', 'Max Me.']);
    expect(
      names([
        { first: 'Max', last: 'Meier' },
        { first: 'max', last: 'Meyer' },
        { first: 'Ben', last: 'Meier' },
      ]),
    ).toEqual(['Max Mei.', 'max Mey.', 'Ben']);
  });

  it('nie ein voller Nachname, auch bei kurzen Nachnamen', () => {
    const r = names([
      { first: 'Max', last: 'Li' },
      { first: 'Max', last: 'Lin' },
    ]);
    expect(r).toEqual(['Max L.', 'Max Li.']);
    expect(r.every((n) => !/\bLin\b/.test(n))).toBe(true);
  });

  it('ohne Nachname bleibt der Vorname; mit Nachname wird abgekürzt', () => {
    expect(
      names([
        { first: 'Max', last: null },
        { first: 'Max', last: 'Meier' },
      ]),
    ).toEqual(['Max', 'Max M.']);
  });

  it('US7-S4 identische Namen werden als doppelt markiert', () => {
    const r = uniqueNames([
      { first: 'Max', last: null },
      { first: 'Max', last: null },
      { first: 'Ben', last: 'Meier' },
      { first: 'Ben', last: 'Meier' },
    ]);
    expect(r.map((x) => x.duplicate)).toEqual([true, true, true, true]);
    expect(r.map((x) => x.name)).toEqual(['Max', 'Max', 'Ben M.', 'Ben M.']);
  });

  it('feste Abkürzungen bestehender Spieler werden nicht verlängert, neue weichen aus', () => {
    expect(
      names([
        { first: 'Max', last: 'M', fixed: true },
        { first: 'Max', last: 'Meier' },
      ]),
    ).toEqual(['Max M.', 'Max Me.']);
  });

  it('nie länger als 24 Zeichen', () => {
    const long = 'Maximilian-Alexander-Friedrich';
    const r = names([
      { first: long, last: 'Müller' },
      { first: long, last: 'Meier' },
    ]);
    expect(r.every((n) => n.length <= MAX_NAME)).toBe(true);
    expect(r[0]).toMatch(/ Mü\.$/);
    expect(names([{ first: long, last: null }])[0]).toHaveLength(MAX_NAME);
  });

  it('liest Vorname und Abkürzung aus gespeicherten Namen', () => {
    expect(firstNameOf('Max Mü.')).toBe('Max');
    expect(abbreviationOf('Max Mü.')).toBe('Mü');
    expect(abbreviationOf('Max')).toBeNull();
    expect(abbreviationOf('Max Müller')).toBe('Müller');
  });
});

describe('001 US7-S8 FR-028 Kürzel aus der Liste bleiben unverändert', () => {
  it('001 US7-S8 FR-028 Kürzel werden weder gekürzt noch verlängert', () => {
    expect(
      names([
        { first: 'Max', last: 'Me', kept: true },
        { first: 'Max', last: 'Mü', kept: true },
      ]),
    ).toEqual(['Max Me.', 'Max Mü.']);
    expect(
      names([
        { first: 'Max', last: 'Mei', kept: true },
        { first: 'Max', last: 'Mü', kept: true },
      ]),
    ).toEqual(['Max Mei.', 'Max Mü.']);
  });

  it('001 US7-S8 FR-028 ein Kürzel bleibt auch ohne Namensvetter stehen', () => {
    expect(names([{ first: 'Tom', last: 'S', kept: true }])).toEqual(['Tom S.']);
  });

  it('001 US7-S8 FR-028 neue Nachnamen weichen Kürzeln aus, gleiche Kürzel sind doppelt', () => {
    expect(
      names([
        { first: 'Max', last: 'M', kept: true },
        { first: 'Max', last: 'Meier' },
      ]),
    ).toEqual(['Max M.', 'Max Me.']);
    const r = uniqueNames([
      { first: 'Max', last: 'Mü', kept: true },
      { first: 'Max', last: 'Mü', kept: true },
    ]);
    expect(r).toEqual([
      { name: 'Max Mü.', duplicate: true },
      { name: 'Max Mü.', duplicate: true },
    ]);
  });
});
