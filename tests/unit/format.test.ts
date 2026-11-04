import { describe, expect, it } from 'vitest';
import { formatClock, formatTime, formatDuration, joinList } from '../../src/domain/format';
import { deriveClock } from '../../src/domain/clock';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const two25 = { sections: 2, sectionMinutes: 25 };

describe('FR-017 Anzeigeformate', () => {
  it('formatDuration schreibt m:ss mit führender Null bei Sekunden', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(25 * 60_000)).toBe('25:00');
  });

  it('formatClock zeigt die Restzeit aufgerundet, damit 00:00 genau am Ende erscheint', () => {
    expect(formatClock(deriveClock([], T0, two25))).toBe('25:00');
    expect(formatClock(deriveClock([{ type: 'kickoff', at: T0, section: 1 }], T0 + 500, two25))).toBe('25:00');
    expect(formatClock(deriveClock([{ type: 'kickoff', at: T0, section: 1 }], T0 + 1000, two25))).toBe('24:59');
    expect(formatClock(deriveClock([{ type: 'kickoff', at: T0, section: 1 }], T0 + 25 * 60_000, two25))).toBe('0:00');
  });

  it('US2-S3 formatClock zeigt die Nachspielzeit mit Plus', () => {
    const c = deriveClock([{ type: 'kickoff', at: T0, section: 1 }], T0 + 26 * 60_000 + 12_000, two25);
    expect(formatClock(c)).toBe('+1:12');
  });

  it('FR-022 formatTime schreibt die Uhrzeit HH:MM:SS in der gewünschten Zeitzone', () => {
    expect(formatTime(T0, 'Europe/Berlin')).toBe('10:30:00');
    expect(formatTime(T0, 'Europe/Berlin', false)).toBe('10:30');
    expect(formatTime(T0)).toMatch(/^\d\d:\d\d:\d\d$/);
  });

  it('in der Pause zwischen den Abschnitten zeigt die Uhr die volle Abschnittsdauer, am Ende "Ende"', () => {
    const kick = { type: 'kickoff' as const, at: T0, section: 1 };
    const brk = deriveClock([kick, { type: 'sectionEnd', at: T0 + 26 * 60_000, section: 1 }], T0 + 30 * 60_000, two25);
    expect(formatClock(brk)).toBe('25:00');
    const end = deriveClock([kick, { type: 'fullTime', at: T0 + 60_000, section: 1 }], T0 + 2 * 60_000, two25);
    expect(formatClock(end)).toBe('Ende');
  });
});

describe('Aufzählungen', () => {
  it('"und" bzw. "oder" vor dem letzten Eintrag', () => {
    expect(joinList([])).toBe('');
    expect(joinList(['E1'])).toBe('E1');
    expect(joinList(['E1', 'E2'])).toBe('E1 und E2');
    expect(joinList(['E1', 'E2', 'E3'], 'oder')).toBe('E1, E2 oder E3');
  });
});
