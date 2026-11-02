import { describe, expect, it } from 'vitest';
import { formatMinute, minuteFor } from '../../src/domain/minute';

const s = (sec: number): number => sec * 1000;
const two25 = { sections: 2, sectionMinutes: 25 };

describe('T030 FR-005 Minutenformel (research.md R-3)', () => {
  it('0:00 gespielt ist die 1. Minute', () => {
    expect(minuteFor(1, 0, two25)).toEqual({ minute: 1, stoppage: null, label: "1'" });
  });

  it('US1-S2 6:12 gespielt ist die 7. Minute', () => {
    expect(minuteFor(1, s(372), two25).label).toBe("7'");
  });

  it('24:59 gespielt ist die 25. Minute', () => {
    expect(minuteFor(1, s(24 * 60 + 59), two25).label).toBe("25'");
  });

  it('US2-S4 25:40 in Halbzeit 1 ist 25+1', () => {
    expect(minuteFor(1, s(25 * 60 + 40), two25)).toEqual({ minute: 25, stoppage: 1, label: "25+1'" });
  });

  it('genau 25:00 ist bereits die 1. Nachspielminute', () => {
    expect(minuteFor(1, s(25 * 60), two25).label).toBe("25+1'");
  });

  it('US2-S6 Halbzeit 2 nach 3:10 ist die 29. Minute', () => {
    expect(minuteFor(2, s(190), two25).label).toBe("29'");
  });

  it('Halbzeit 2 beginnt bei 26', () => {
    expect(minuteFor(2, 0, two25).label).toBe("26'");
  });

  it('Halbzeit 2, 1:05 in der Nachspielzeit ist 50+2', () => {
    expect(minuteFor(2, s(25 * 60 + 65), two25).label).toBe("50+2'");
  });

  it('3 × 25 am Ende ist 75+1', () => {
    expect(minuteFor(3, s(25 * 60 + 1), { sections: 3, sectionMinutes: 25 }).label).toBe("75+1'");
  });

  it('1 × 12 Nachspielzeit ist 12+1', () => {
    expect(minuteFor(1, s(12 * 60 + 30), { sections: 1, sectionMinutes: 12 }).label).toBe("12+1'");
  });

  it('negative Werte werden wie 0 behandelt', () => {
    expect(minuteFor(1, -500, two25).label).toBe("1'");
  });

  it('formatMinute schreibt reguläre und Nachspielminuten', () => {
    expect(formatMinute(7, null)).toBe("7'");
    expect(formatMinute(50, 2)).toBe("50+2'");
  });
});
