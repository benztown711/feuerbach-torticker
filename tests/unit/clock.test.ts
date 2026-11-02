import { describe, expect, it } from 'vitest';
import { deriveClock, thresholdKey } from '../../src/domain/clock';
import type { ClockEvent } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const sec = (n: number): number => n * 1000;
const min = (n: number): number => n * 60_000;
const two25 = { sections: 2, sectionMinutes: 25 };
const ev = (type: ClockEvent['type'], at: number, section = 1): ClockEvent => ({ type, at, section });

describe('T029 FR-006 FR-007 SC-003 deriveClock', () => {
  it('vor dem Anpfiff: Status created, Restzeit = Abschnittsdauer, Anpfiff für Abschnitt 1', () => {
    const c = deriveClock([], T0, two25);
    expect(c).toMatchObject({
      status: 'created',
      section: 1,
      kickoffSection: 1,
      playedMs: 0,
      remainingMs: min(25),
      overtimeMs: 0,
      isOvertime: false,
      label: "1'",
      dueThresholds: [],
    });
  });

  it('US2-S2 nach dem Anpfiff läuft die Restzeit herunter', () => {
    const c = deriveClock([ev('kickoff', T0)], T0 + sec(372), two25);
    expect(c.status).toBe('running');
    expect(c.kickoffSection).toBeNull();
    expect(c.playedMs).toBe(sec(372));
    expect(c.remainingMs).toBe(min(25) - sec(372));
    expect(c.label).toBe("7'");
  });

  it('US2-S7 SC-003 zeitstempelbasiert: späteres now nach Sperrbildschirm ergibt exakt die Restzeit', () => {
    const events = [ev('kickoff', T0)];
    expect(deriveClock(events, T0 + min(5), two25).remainingMs).toBe(min(20));
    expect(deriveClock(events, T0 + min(25), two25).remainingMs).toBe(0);
  });

  it('US2-S8 Pausen zählen nicht zur Spielzeit', () => {
    const events = [ev('kickoff', T0), ev('pause', T0 + min(3)), ev('resume', T0 + min(5))];
    const paused = deriveClock(events.slice(0, 2), T0 + min(4), two25);
    expect(paused.status).toBe('paused');
    expect(paused.playedMs).toBe(min(3));
    const c = deriveClock(events, T0 + min(6), two25);
    expect(c.status).toBe('running');
    expect(c.playedMs).toBe(min(4));
  });

  it('pause ohne laufende Uhr und resume ohne Pause werden ignoriert', () => {
    expect(deriveClock([ev('pause', T0)], T0 + min(1), two25).status).toBe('created');
    const c = deriveClock([ev('kickoff', T0), ev('resume', T0 + min(1))], T0 + min(2), two25);
    expect(c.status).toBe('running');
    expect(c.playedMs).toBe(min(2));
  });

  it('US2-S3 nach 00:00 Nachspielzeit aufwärts, Schwelle 1:0 fällig', () => {
    const c = deriveClock([ev('kickoff', T0)], T0 + min(25) + sec(12), two25);
    expect(c.isOvertime).toBe(true);
    expect(c.overtimeMs).toBe(sec(12));
    expect(c.remainingMs).toBe(0);
    expect(c.label).toBe("25+1'");
    expect(c.dueThresholds).toEqual([thresholdKey(1, 0)]);
  });

  it('FR-007 jede volle Nachspielminute ist eine weitere Schwelle, signalisierte entfallen', () => {
    const events = [ev('kickoff', T0)];
    const c = deriveClock(events, T0 + min(27) + sec(5), two25, ['1:0']);
    expect(c.dueThresholds).toEqual(['1:+1', '1:+2']);
    expect(deriveClock(events, T0 + min(27) + sec(5), two25, ['1:0', '1:+1', '1:+2']).dueThresholds).toEqual([]);
  });

  it('auch bei angehaltener Uhr in der Nachspielzeit bleiben Schwellen fällig', () => {
    const c = deriveClock([ev('kickoff', T0), ev('pause', T0 + min(26))], T0 + min(40), two25);
    expect(c.status).toBe('paused');
    expect(c.dueThresholds).toEqual(['1:0', '1:+1']);
  });

  it('US2-S5 Pausenpfiff: Status break, Uhr steht, Anpfiff für Abschnitt 2, keine Schwellen', () => {
    const events = [ev('kickoff', T0), ev('sectionEnd', T0 + min(26))];
    const c = deriveClock(events, T0 + min(30), two25);
    expect(c).toMatchObject({ status: 'break', section: 1, kickoffSection: 2, dueThresholds: [] });
    expect(c.playedMs).toBe(min(26));
  });

  it('Pausenpfiff bei angehaltener Uhr übernimmt die gespielte Zeit', () => {
    const events = [ev('kickoff', T0), ev('pause', T0 + min(10)), ev('sectionEnd', T0 + min(12))];
    expect(deriveClock(events, T0 + min(13), two25).playedMs).toBe(min(10));
  });

  it('US2-S6 Halbzeit 2: Minuten laufen ab 26 weiter', () => {
    const events = [ev('kickoff', T0), ev('sectionEnd', T0 + min(25)), ev('kickoff', T0 + min(35), 2)];
    const c = deriveClock(events, T0 + min(35) + sec(190), two25);
    expect(c.section).toBe(2);
    expect(c.label).toBe("29'");
  });

  it('Schlusspfiff: Status finished, kein weiterer Anpfiff', () => {
    const events = [ev('kickoff', T0, 2), ev('fullTime', T0 + min(25), 2)];
    const c = deriveClock(events, T0 + min(40), two25);
    expect(c.status).toBe('finished');
    expect(c.kickoffSection).toBeNull();
    expect(c.playedMs).toBe(min(25));
  });

  it('Schlusspfiff bei angehaltener Uhr', () => {
    const events = [ev('kickoff', T0), ev('pause', T0 + min(5)), ev('fullTime', T0 + min(6))];
    expect(deriveClock(events, T0 + min(7), { sections: 1, sectionMinutes: 12 }).playedMs).toBe(min(5));
  });

  it('US2-S9 Zurücksetzen in Abschnitt 1: zurück auf created', () => {
    const events = [ev('kickoff', T0), ev('reset', T0 + min(2))];
    expect(deriveClock(events, T0 + min(3), two25)).toMatchObject({
      status: 'created',
      kickoffSection: 1,
      playedMs: 0,
    });
  });

  it('Zurücksetzen in Abschnitt 2: Pause vor dem erneuten Anpfiff von Abschnitt 2', () => {
    const events = [ev('kickoff', T0), ev('sectionEnd', T0 + min(25)), ev('kickoff', T0 + min(30), 2), ev('reset', T0 + min(31), 2)];
    expect(deriveClock(events, T0 + min(32), two25)).toMatchObject({ status: 'break', section: 2, kickoffSection: 2 });
  });

  it('Uhr kann nicht rückwärts laufen, wenn now vor dem letzten Ereignis liegt', () => {
    expect(deriveClock([ev('kickoff', T0)], T0 - sec(5), two25).playedMs).toBe(0);
  });

  it('thresholdKey schreibt 00:00 und Nachspielminuten', () => {
    expect(thresholdKey(2, 0)).toBe('2:0');
    expect(thresholdKey(2, 3)).toBe('2:+3');
  });
});
