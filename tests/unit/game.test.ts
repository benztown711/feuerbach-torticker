import { describe, expect, it } from 'vitest';
import {
  canAct,
  createGame,
  endSection,
  kickoff,
  markSignalled,
  pauseClock,
  resetClock,
  resumeClock,
  sectionLabel,
  swapVenue,
} from '../../src/domain/game';
import { addGoal } from '../../src/domain/goals';
import type { NewGameInput } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const min = (n: number): number => n * 60_000;
const input: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach E1',
  opponent: 'TSV Musterstadt',
  venue: 'away',
  schema: { sections: 2, sectionMinutes: 25 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};
const fresh = () => createGame(input, { id: 'g1', now: T0 });

describe('T031 FR-006 Spiel-Reducer', () => {
  it('T057 FR-030 createGame übernimmt das Aufgebot', () => {
    expect(createGame({ ...input, squad: ['p1', 'p2'] }, { id: 'g9', now: T0 }).squad).toEqual(['p1', 'p2']);
    expect(fresh().squad).toEqual([]);
  });

  it('createGame legt ein Spiel im Zustand created an', () => {
    const g = fresh();
    expect(g).toMatchObject({
      id: 'g1',
      schemaVersion: 1,
      ownTeam: 'Sportvg Feuerbach E1',
      opponent: 'TSV Musterstadt',
      venue: 'away',
      ownColor: 'rot',
      oppColor: 'schwarz',
      createdAt: T0,
      clockEvents: [],
      goals: [],
      signalledThresholds: [],
      squad: [],
      status: 'created',
      finalScore: null,
      halfTimeScore: null,
    });
  });

  it('kompletter Ablauf created → running → paused → running → break → running → finished', () => {
    let g = kickoff(fresh(), T0);
    expect(g.status).toBe('running');
    g = pauseClock(g, T0 + min(5));
    expect(g.status).toBe('paused');
    g = resumeClock(g, T0 + min(6));
    expect(g.status).toBe('running');
    g = addGoal(g, 'own', T0 + min(10)).game;
    g = endSection(g, T0 + min(26));
    expect(g.status).toBe('break');
    expect(g.halfTimeScore).toEqual({ own: 1, opp: 0 });
    g = kickoff(g, T0 + min(36));
    expect(g.status).toBe('running');
    expect(g.clockEvents.at(-1)).toMatchObject({ type: 'kickoff', section: 2 });
    g = addGoal(g, 'opp', T0 + min(40)).game;
    g = endSection(g, T0 + min(62));
    expect(g.status).toBe('finished');
    expect(g.clockEvents.at(-1)).toMatchObject({ type: 'fullTime', section: 2 });
    expect(g.finalScore).toEqual({ own: 1, opp: 1 });
  });

  it('bei nur einem Abschnitt beendet der Schlusspfiff das Spiel ohne Halbzeitstand', () => {
    let g = createGame({ ...input, schema: { sections: 1, sectionMinutes: 12 } }, { id: 'g2', now: T0 });
    g = endSection(kickoff(g, T0), T0 + min(12));
    expect(g.status).toBe('finished');
    expect(g.halfTimeScore).toBeNull();
  });

  it('bei drei Abschnitten setzt nur das Ende von Abschnitt 1 den Halbzeitstand', () => {
    let g = createGame({ ...input, schema: { sections: 3, sectionMinutes: 15 } }, { id: 'g3', now: T0 });
    g = endSection(kickoff(g, T0), T0 + min(15));
    g = addGoal(kickoff(g, T0 + min(20)), 'own', T0 + min(21)).game;
    g = endSection(g, T0 + min(35));
    expect(g.status).toBe('break');
    expect(g.halfTimeScore).toEqual({ own: 0, opp: 0 });
  });

  it('ungültige Übergänge werden abgelehnt', () => {
    const g = fresh();
    expect(() => pauseClock(g, T0)).toThrow('Aktion nicht erlaubt: pause');
    expect(() => resumeClock(g, T0)).toThrow('Aktion nicht erlaubt: resume');
    expect(() => endSection(g, T0)).toThrow('Aktion nicht erlaubt: end');
    expect(() => resetClock(g, T0)).toThrow('Aktion nicht erlaubt: reset');
    const running = kickoff(g, T0);
    expect(() => kickoff(running, T0)).toThrow('Aktion nicht erlaubt: kickoff');
    const finished = endSection(kickoff(endSection(running, T0 + min(25)), T0 + min(30)), T0 + min(55));
    expect(finished.status).toBe('finished');
    expect(() => kickoff(finished, T0 + min(56))).toThrow('Aktion nicht erlaubt: kickoff');
  });

  it('endSection auf beendetem Spiel ist nicht erlaubt', () => {
    let g = createGame({ ...input, schema: { sections: 1, sectionMinutes: 12 } }, { id: 'g4', now: T0 });
    g = endSection(kickoff(g, T0), T0 + min(12));
    expect(() => endSection(g, T0 + min(13))).toThrow('Aktion nicht erlaubt: end');
  });

  it('canAct liefert die erlaubten Aktionen je Zustand', () => {
    const g = fresh();
    expect(canAct(g, 'kickoff', T0)).toBe(true);
    expect(canAct(g, 'pause', T0)).toBe(false);
    const r = kickoff(g, T0);
    expect(['pause', 'end', 'reset'].map((a) => canAct(r, a as never, T0))).toEqual([true, true, true]);
    expect(canAct(r, 'resume', T0)).toBe(false);
    const p = pauseClock(r, T0 + 1000);
    expect(canAct(p, 'resume', T0 + 2000)).toBe(true);
    expect(canAct(p, 'end', T0 + 2000)).toBe(true);
  });

  it('US2-S9 Zurücksetzen setzt die Uhr auf Anfang, Tore bleiben', () => {
    let g = addGoal(kickoff(fresh(), T0), 'own', T0 + min(1)).game;
    g = resetClock(g, T0 + min(2));
    expect(g.status).toBe('created');
    expect(g.goals).toHaveLength(1);
  });

  it('FR-035 swapVenue tauscht Heim und Gast, Tore und Farben bleiben ihrer Mannschaft', () => {
    let g = addGoal(kickoff(fresh(), T0), 'own', T0 + min(1)).game;
    g = swapVenue(g);
    expect(g.venue).toBe('home');
    expect(swapVenue(g).venue).toBe('away');
    expect(g.goals[0]?.side).toBe('own');
    expect(g.ownColor).toBe('rot');
  });

  it('markSignalled merkt Schwellen ohne Doppelte', () => {
    const g = markSignalled(markSignalled(fresh(), ['1:0']), ['1:0', '1:+1']);
    expect(g.signalledThresholds).toEqual(['1:0', '1:+1']);
  });

  it('sectionLabel benennt Abschnitte je Schema', () => {
    expect(sectionLabel(1, 1)).toBe('Spielzeit');
    expect(sectionLabel(1, 2)).toBe('1. Halbzeit');
    expect(sectionLabel(2, 2)).toBe('2. Halbzeit');
    expect(sectionLabel(3, 3)).toBe('3. Drittel');
    expect(sectionLabel(4, 4)).toBe('4. Viertel');
  });
});
