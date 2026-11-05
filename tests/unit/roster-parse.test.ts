import { describe, expect, it } from 'vitest';
import { parseRosterList } from '../../src/domain/roster-parse';

const one = (line: string) => parseRosterList(line)[0];

describe('T063 FR-025 Liste einfügen: Zeilen erkennen', () => {
  it.each([
    ['1 Max', 1, 'Max', null],
    ['1. Max', 1, 'Max', null],
    ['#1 Max', 1, 'Max', null],
    ['# 1 Max', 1, 'Max', null],
    ['1 - Max', 1, 'Max', null],
    ['1,Max', 1, 'Max', null],
    ['1) Max', 1, 'Max', null],
    ['Max 1', 1, 'Max', null],
    ['Max, 1', 1, 'Max', null],
    ['Max #7', 7, 'Max', null],
    ['Max', null, 'Max', null],
    ['7\tMax\tMüller', 7, 'Max', 'Müller'],
    ['Max\tMüller\t7', 7, 'Max', 'Müller'],
    ['  12   Jan-Ole   Meyer  ', 12, 'Jan-Ole', 'Meyer'],
    ['Max Müller-Lüdenscheidt', null, 'Max', 'Müller-Lüdenscheidt'],
  ])('%s', (line, number, firstName, lastName) => {
    expect(one(line)).toMatchObject({ number, firstName, lastName, warnings: [] });
  });

  it('überspringt Leerzeilen, Zeilen ohne Buchstaben und Kopfzeilen mit Doppelpunkt', () => {
    const rows = parseRosterList('\n1 Max\n   \n42\n---\nE1:\n2 Ben\r\n');
    expect(rows.map((r) => r.firstName)).toEqual(['Max', 'Ben']);
    expect(rows.map((r) => r.line)).toEqual([2, 7]);
  });

  it('Nummer außerhalb 1 bis 99 wird verworfen und gewarnt', () => {
    expect(one('0 Max')).toMatchObject({ number: null, warnings: ['nummer-ungueltig'] });
    expect(one('100 Max')).toMatchObject({ number: null, warnings: ['nummer-ungueltig'] });
  });

  it('entfernt Sonderzeichen außer Bindestrich und Apostroph', () => {
    expect(one('3 Ben* (TW)')).toMatchObject({ number: 3, firstName: 'Ben', lastName: 'TW' });
    expect(one("5 D'Angelo")).toMatchObject({ firstName: "D'Angelo" });
  });
});

describe('001 US7-S8 FR-028 Kürzel aus „Kader teilen“ erkennen', () => {
  it.each([
    ['14 Max Mü.', 14, 'Mü', true],
    ['Max Me. 7', 7, 'Me', true],
    ['Max M.', null, 'M', true],
    ['Max Mei.', null, 'Mei', true],
    ['Max Mü', null, 'Mü', false],
    ['Max Meie.', null, 'Meie', false],
    ['Max M. Mü.', null, 'M Mü', false],
    ['1 Max', 1, null, false],
  ])('%s', (line, number, lastName, abbreviated) => {
    expect(one(line)).toMatchObject({ number, firstName: 'Max', lastName, abbreviated });
  });
});
