import { describe, expect, it } from 'vitest';
import { createGame, endSection, kickoff, pauseClock } from '../../src/domain/game';
import { addGoal, removeGoal, setScorer } from '../../src/domain/goals';
import {
  filterGames,
  historyEntry,
  liveLabel,
  startedAt,
  teamFilters,
  teamShortLabel,
  timeline,
} from '../../src/domain/history';
import type { Game, NewGameInput, Side } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const min = (n: number): number => n * 60_000;
const input: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach E1',
  opponent: 'TSV Musterstadt',
  venue: 'away',
  schema: { sections: 1, sectionMinutes: 20 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};
let n = 0;
const ids = () => `goal-${++n}`;

function finished(goals: Side[], over: Partial<NewGameInput> = {}, id = 'g', now = T0): Game {
  let g = kickoff(createGame({ ...input, ...over }, { id, now }), now);
  goals.forEach((side, i) => {
    g = addGoal(g, side, now + min(i + 1), ids).game;
  });
  return endSection(g, now + min(20));
}

describe('T096 FR-038 Historie aus Feuerbach-Sicht', () => {
  it('US6-S7 Auswärtssieg 3:1: eigene Tore zuerst, S, auswärts', () => {
    const e = historyEntry(finished(['own', 'opp', 'own', 'own']));
    expect(e).toMatchObject({ scoreText: '3:1', result: 'S', venueLabel: 'auswärts', teamShort: 'E1', finished: true });
  });

  it('Unentschieden U, Niederlage N, Heimspiel "heim"', () => {
    expect(historyEntry(finished(['own', 'opp'], { venue: 'home' }))).toMatchObject({ result: 'U', venueLabel: 'heim' });
    expect(historyEntry(finished(['opp']))).toMatchObject({ scoreText: '0:1', result: 'N' });
  });

  it('offenes Spiel: kein S/U/N, "läuft"', () => {
    const g = kickoff(createGame(input, { id: 'o', now: T0 }), T0);
    expect(historyEntry(g)).toMatchObject({ finished: false, result: null });
  });

  it('startedAt: erster Anpfiff, sonst Anlegezeit', () => {
    expect(startedAt(finished([], {}, 'a', T0))).toBe(T0);
    expect(startedAt(createGame(input, { id: 'b', now: T0 + 5 }))).toBe(T0 + 5);
  });

  it('teamShortLabel: Kurzform E1/E2/D3, sonst "Feuerbach" bzw. der Name', () => {
    expect(teamShortLabel('Sportvg Feuerbach E1')).toBe('E1');
    expect(teamShortLabel('Feuerbach D3')).toBe('D3');
    expect(teamShortLabel('Sportvg Feuerbach')).toBe('Feuerbach');
    expect(teamShortLabel('Sportvg Feuerbach Mädchen')).toBe('Mädchen');
    expect(teamShortLabel('Eltern-Team')).toBe('Eltern-Team');
  });

  it('US6-S6 Filter-Chips nur bei mehr als einem Mannschaftsnamen, Groß/klein egal, neueste zuerst', () => {
    const e1 = finished([], { ownTeam: 'Sportvg Feuerbach E1' }, 'a', T0);
    const e2 = finished([], { ownTeam: 'Sportvg Feuerbach E2' }, 'b', T0 + min(60));
    const e1b = finished([], { ownTeam: 'sportvg feuerbach e1' }, 'c', T0 + min(120));
    expect(teamFilters([e1])).toEqual([]);
    const games = [e1b, e2, e1];
    expect(teamFilters(games)).toEqual([
      { key: 'sportvg feuerbach e1', label: 'e1' },
      { key: 'sportvg feuerbach e2', label: 'E2' },
    ]);
    expect(filterGames(games, 'sportvg feuerbach e1').map((g) => g.id)).toEqual(['c', 'a']);
    expect(filterGames(games, null)).toHaveLength(3);
  });
});

describe('T096 FR-038 Zeitleiste der Spieldetails', () => {
  it('Uhr-Ereignisse und Tore chronologisch; Tore mit Minute und Stand Heim zuerst; entfernte markiert', () => {
    let g = kickoff(createGame(input, { id: 't', now: T0 }), T0);
    const a = addGoal(g, 'own', T0 + min(2), ids);
    g = setScorer(a.game, a.goal!.id, { kind: 'player', playerId: 'p1' });
    g = addGoal(g, 'opp', T0 + min(4), ids).game;
    const c = addGoal(g, 'own', T0 + min(6), ids);
    g = removeGoal(c.game, c.goal!.id, T0 + min(7));
    g = pauseClock(g, T0 + min(5));
    const items = timeline(g);
    expect(items.map((i) => i.kind)).toEqual(['event', 'goal', 'goal', 'event', 'goal']);
    const goals = items.filter((i) => i.kind === 'goal');
    expect(goals.map((i) => (i.kind === 'goal' ? [i.label, i.score, i.removed] : null))).toEqual([
      ["3'", '0:1', false],
      ["5'", '1:1', false],
      ["7'", '', true],
    ]);
  });

  it('bei gleicher Uhrzeit steht das Uhr-Ereignis vor dem Tor', () => {
    let g = kickoff(createGame(input, { id: 's', now: T0 }), T0);
    g = addGoal(g, 'own', T0 + min(1), ids).game;
    g = { ...g, clockEvents: [...g.clockEvents, { type: 'pause', at: T0 + min(1), section: 1 }] };
    expect(timeline(g).map((i) => i.kind)).toEqual(['event', 'event', 'goal']);
  });
});

describe('T096 FR-037 Live-Anzeige in der Navigation', () => {
  it('laufend und angehalten: "Läuft <Minute>", Halbzeitpause: "Pause", sonst null', () => {
    const two = { ...input, schema: { sections: 2, sectionMinutes: 25 } };
    const created = createGame(two, { id: 'l', now: T0 });
    expect(liveLabel(created, T0)).toBeNull();
    const run = kickoff(created, T0);
    expect(liveLabel(run, T0 + min(37) / 2)).toBe("Läuft 19'");
    expect(liveLabel(pauseClock(run, T0 + min(3)), T0 + min(10))).toBe("Läuft 4'");
    expect(liveLabel(run, T0 + min(25) + 30_000)).toBe("Läuft 25+1'");
    const brk = endSection(run, T0 + min(25));
    expect(liveLabel(brk, T0 + min(26))).toBe('Pause');
    const done = endSection(kickoff(brk, T0 + min(30)), T0 + min(55));
    expect(liveLabel(done, T0 + min(56))).toBeNull();
  });
});
