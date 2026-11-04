import { describe, expect, it } from 'vitest';
import { addCard, addMark, addSub, setMarkComment } from '../../src/domain/events';
import { createGame, endSection, kickoff } from '../../src/domain/game';
import { addGoal, removeGoal, setPenalty, setScorer } from '../../src/domain/goals';
import {
  buildSnapshot,
  parseSnapshot,
  setLive,
  tombstone,
  type LiveGameSnapshot,
} from '../../src/domain/live-snapshot';
import type { Game, Player } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 0, 0);
const min = (n: number): number => n * 60_000;
const players: Player[] = [
  { id: 'p-max', name: 'Max', number: 7, deletedAt: null },
  { id: 'p-ben', name: 'Ben Mü.', number: 9, deletedAt: T0 },
];

function game(): Game {
  let g = kickoff(
    createGame(
      {
        ownTeam: 'Sportvg Feuerbach E1',
        opponent: 'TSV Musterstadt',
        venue: 'away',
        schema: { sections: 2, sectionMinutes: 25 },
        ownColor: 'rot',
        oppColor: 'schwarz',
        squad: ['p-max', 'p-ben'],
      },
      { id: 'g1', now: T0 },
    ),
    T0,
  );
  let n = 0;
  const id = () => `goal-${++n}`;
  const a = addGoal(g, 'own', T0 + min(5), id);
  g = setScorer(a.game, a.goal!.id, { kind: 'player', playerId: 'p-max' });
  const b = addGoal(g, 'own', T0 + min(9), id);
  g = setPenalty(setScorer(b.game, b.goal!.id, { kind: 'player', playerId: 'p-ben' }), b.goal!.id, true);
  const c = addGoal(g, 'opp', T0 + min(12), id);
  g = setScorer(c.game, c.goal!.id, { kind: 'text', text: 'Nr. 9' });
  const d = addGoal(g, 'own', T0 + min(20), id);
  g = setScorer(d.game, d.goal!.id, { kind: 'ownGoal' });
  const e = addGoal(g, 'opp', T0 + min(22), id);
  g = removeGoal(e.game, e.goal!.id, T0 + min(23));
  g = setMarkComment(addMark(g, T0 + min(15), () => 'm1')!.game, 'm1', 'Szene Veo');
  g = addCard(
    g,
    { side: 'own', card: 'gelb', who: { kind: 'player', playerId: 'p-max' } },
    T0 + min(16),
    () => 'c1',
  )!.game;
  g = addSub(g, 'p-max', 'p-ben', T0 + min(17), () => 's1')!.game;
  return endSection(g, T0 + min(25));
}

describe('006 FR-L06 FR-L10 Live-Stand bauen (contracts/live-message.md)', () => {
  it('überträgt Kurzform, Gegner, Trikots, Schema, Uhr und nur nicht entfernte Tore mit Torschützen', () => {
    const s = buildSnapshot(game(), players, 'E1', T0 + min(26)) as LiveGameSnapshot;
    expect(s).toMatchObject({
      v: 1,
      kind: 'game',
      state: 'live',
      gameId: 'g1',
      team: 'E1',
      sentAt: T0 + min(26),
      createdAt: T0,
      own: 'Feuerbach E1',
      opp: 'TSV Musterstadt',
      venue: 'away',
      ownColor: 'rot',
      oppColor: 'schwarz',
      schema: { sections: 2, sectionMinutes: 25 },
      shootout: null,
      drawSettled: false,
    });
    expect(s.clock).toEqual([
      ['kickoff', T0, 1],
      ['sectionEnd', T0 + min(25), 1],
    ]);
    expect(s.goals).toEqual([
      { side: 'own', minute: 6, stoppage: null, section: 1, who: 'Max', penalty: false, ownGoal: false },
      { side: 'own', minute: 10, stoppage: null, section: 1, who: 'Ben Mü.', penalty: true, ownGoal: false },
      { side: 'opp', minute: 13, stoppage: null, section: 1, who: 'Nr. 9', penalty: false, ownGoal: false },
      { side: 'own', minute: 21, stoppage: null, section: 1, who: null, penalty: false, ownGoal: true },
    ]);
  });

  it('enthält nie Kader, Aufgebot, Karten, Wechsel, Lesezeichen oder den vollen Vereinsnamen', () => {
    const text = JSON.stringify(buildSnapshot(game(), players, 'E1', T0));
    for (const banned of ['squad', 'events', 'Szene Veo', 'gelb', 'p-max', 'Sportvg', 'signalled'])
      expect(text).not.toContain(banned);
  });

  it('unbekannter Spieler, fehlender Torschütze und lange Freitexte', () => {
    let g = kickoff(
      createGame(
        {
          ownTeam: 'Sportvg Feuerbach E1',
          opponent: 'X'.repeat(40),
          venue: 'home',
          schema: { sections: 1, sectionMinutes: 20 },
          ownColor: 'rot',
          oppColor: 'weiss',
        },
        { id: 'g2', now: T0 },
      ),
      T0,
    );
    const a = addGoal(g, 'own', T0 + min(1), () => 'a');
    g = setScorer(a.game, 'a', { kind: 'player', playerId: 'weg' });
    g = addGoal(g, 'opp', T0 + min(2), () => 'b').game;
    g = addGoal(g, 'opp', T0 + min(3), () => 'c').game;
    // Ältere oder importierte Daten können längere oder leere Freitexte enthalten.
    g = {
      ...g,
      goals: g.goals.map((x) =>
        x.id === 'b'
          ? { ...x, scorer: { kind: 'text', text: 'Y'.repeat(60) } }
          : x.id === 'c'
            ? { ...x, scorer: { kind: 'text', text: '  ' } }
            : x,
      ),
    };
    const s = buildSnapshot(g, players, 'E1', T0) as LiveGameSnapshot;
    expect(s.goals.map((x) => x.who)).toEqual([null, 'Y'.repeat(40), null]);
  });

  it('Elfmeterschießen mit Schützen; Verlängerung im Schema', () => {
    const g: Game = {
      ...game(),
      schema: { sections: 2, sectionMinutes: 25, extraMinutes: 10 },
      drawSettled: true,
      shootout: {
        first: 'opp',
        done: false,
        shots: [
          { side: 'opp', hit: true, who: { kind: 'text', text: 'Nr. 4' }, at: T0 + min(80) },
          { side: 'own', hit: false, who: { kind: 'player', playerId: 'p-max' }, at: T0 + min(81) },
          { side: 'opp', hit: true, who: null, at: T0 + min(82) },
          { side: 'own', hit: true, who: { kind: 'player', playerId: 'weg' }, at: T0 + min(83) },
        ],
      },
    };
    const s = buildSnapshot(g, players, 'E1', T0) as LiveGameSnapshot;
    expect(s.schema).toEqual({ sections: 2, sectionMinutes: 25, extraMinutes: 10 });
    expect(s.shootout).toEqual({
      first: 'opp',
      done: false,
      shots: [
        ['opp', true, 'Nr. 4'],
        ['own', false, 'Max'],
        ['opp', true, null],
        ['own', true, null],
      ],
    });
    expect(s.drawSettled).toBe(true);
  });

  it('"Nicht live senden" ergibt den Zustand off, Löschen den Zustand deleted', () => {
    expect(buildSnapshot(setLive(game(), false), players, 'E1', T0 + 1)).toEqual({
      v: 1,
      kind: 'game',
      state: 'off',
      gameId: 'g1',
      team: 'E1',
      sentAt: T0 + 1,
    });
    expect(tombstone('g9', 'E2', T0 + 2)).toEqual({
      v: 1,
      kind: 'game',
      state: 'deleted',
      gameId: 'g9',
      team: 'E2',
      sentAt: T0 + 2,
    });
    expect(setLive(setLive(game(), false), true).live).toBe(true);
  });
});

describe('006 FR-L11 R-L9 Live-Stand prüfen', () => {
  const ok = buildSnapshot(game(), players, 'E1', T0) as LiveGameSnapshot;
  const mutate = (f: (s: Record<string, unknown>) => void): unknown => {
    const s = JSON.parse(JSON.stringify(ok)) as Record<string, unknown>;
    f(s);
    return s;
  };

  it('gültige Stände und Grabsteine werden angenommen; unbekannte Felder fallen weg', () => {
    expect(parseSnapshot(JSON.parse(JSON.stringify(ok)))).toEqual(ok);
    expect(parseSnapshot({ ...ok, extra: 'x' })).toEqual(ok);
    const off = { v: 1, kind: 'game', state: 'off', gameId: 'g1', team: 'E1', sentAt: T0 };
    expect(parseSnapshot({ ...off, own: 'egal' })).toEqual(off);
    expect(parseSnapshot({ ...off, state: 'deleted' })).toEqual({ ...off, state: 'deleted' });
  });

  it.each([
    ['kein Objekt', () => 'x'],
    ['Version', () => mutate((s) => (s.v = 2))],
    ['Art', () => mutate((s) => (s.kind = 'config'))],
    ['Zustand', () => mutate((s) => (s.state = 'pause'))],
    ['Spiel-ID', () => mutate((s) => (s.gameId = ''))],
    ['Mannschaft', () => mutate((s) => (s.team = 'x'.repeat(21)))],
    ['Sendezeit', () => mutate((s) => (s.sentAt = 'jetzt'))],
    ['Anlegezeit', () => mutate((s) => (s.createdAt = null))],
    ['eigener Name zu lang', () => mutate((s) => (s.own = 'x'.repeat(41)))],
    ['Gegner fehlt', () => mutate((s) => delete s.opp)],
    ['Heim/Gast', () => mutate((s) => (s.venue = 'neutral'))],
    ['unbekannte Farbe', () => mutate((s) => (s.oppColor = 'pink'))],
    ['eigene Farbe', () => mutate((s) => (s.ownColor = 3))],
    ['Schema Abschnitte', () => mutate((s) => (s.schema = { sections: 5, sectionMinutes: 25 }))],
    ['Schema Minuten', () => mutate((s) => (s.schema = { sections: 2, sectionMinutes: 0 }))],
    ['Schema Verlängerung', () => mutate((s) => (s.schema = { sections: 2, sectionMinutes: 25, extraMinutes: 31 }))],
    ['Schema kein Objekt', () => mutate((s) => (s.schema = 'x'))],
    ['Uhr keine Liste', () => mutate((s) => (s.clock = {}))],
    ['Uhr zu viele', () => mutate((s) => (s.clock = Array.from({ length: 51 }, () => ['pause', T0, 1])))],
    ['Uhr Typ', () => mutate((s) => (s.clock = [['tor', T0, 1]]))],
    ['Uhr Zeit', () => mutate((s) => (s.clock = [['kickoff', 'x', 1]]))],
    ['Uhr Abschnitt', () => mutate((s) => (s.clock = [['kickoff', T0, 0]]))],
    ['Uhr Eintrag', () => mutate((s) => (s.clock = ['kickoff']))],
    ['Tore keine Liste', () => mutate((s) => (s.goals = null))],
    ['zu viele Tore', () => mutate((s) => (s.goals = Array.from({ length: 201 }, () => (s.goals as unknown[])[0])))],
    ['Tor Seite', () => mutate((s) => ((s.goals as Record<string, unknown>[])[0]!.side = 'mitte'))],
    ['Tor Minute', () => mutate((s) => ((s.goals as Record<string, unknown>[])[0]!.minute = 0))],
    ['Tor Nachspielzeit', () => mutate((s) => ((s.goals as Record<string, unknown>[])[0]!.stoppage = -1))],
    ['Tor Abschnitt', () => mutate((s) => ((s.goals as Record<string, unknown>[])[0]!.section = 7))],
    ['Torschütze zu lang', () => mutate((s) => ((s.goals as Record<string, unknown>[])[0]!.who = 'x'.repeat(41)))],
    ['Torschütze Zahl', () => mutate((s) => ((s.goals as Record<string, unknown>[])[0]!.who = 5))],
    ['Elfmeter', () => mutate((s) => ((s.goals as Record<string, unknown>[])[0]!.penalty = 'ja'))],
    ['Eigentor', () => mutate((s) => ((s.goals as Record<string, unknown>[])[0]!.ownGoal = 1))],
    ['Tor kein Objekt', () => mutate((s) => (s.goals = ['x']))],
    ['Elfmeterschießen kein Objekt', () => mutate((s) => (s.shootout = 'x'))],
    ['Elfmeterschießen erster', () => mutate((s) => (s.shootout = { first: 'x', done: false, shots: [] }))],
    ['Elfmeterschießen fertig', () => mutate((s) => (s.shootout = { first: 'own', done: 'x', shots: [] }))],
    ['Elfmeterschießen Schüsse', () => mutate((s) => (s.shootout = { first: 'own', done: false, shots: {} }))],
    [
      'Elfmeterschießen zu viele',
      () =>
        mutate(
          (s) =>
            (s.shootout = { first: 'own', done: false, shots: Array.from({ length: 101 }, () => ['own', true, null]) }),
        ),
    ],
    ['Schuss Seite', () => mutate((s) => (s.shootout = { first: 'own', done: false, shots: [['x', true, null]] }))],
    ['Schuss Treffer', () => mutate((s) => (s.shootout = { first: 'own', done: false, shots: [['own', 1, null]] }))],
    [
      'Schuss Name',
      () => mutate((s) => (s.shootout = { first: 'own', done: false, shots: [['own', true, 'x'.repeat(41)]] })),
    ],
    ['Schuss kein Eintrag', () => mutate((s) => (s.shootout = { first: 'own', done: false, shots: ['x'] }))],
    ['Unentschieden bestätigt', () => mutate((s) => (s.drawSettled = 'ja'))],
  ])('abgelehnt: %s', (_, make) => {
    expect(parseSnapshot(make())).toBeNull();
  });

  it('Schema mit Verlängerung wird angenommen', () => {
    const s = mutate((x) => (x.schema = { sections: 2, sectionMinutes: 25, extraMinutes: 10 }));
    expect(parseSnapshot(s)).toMatchObject({ schema: { sections: 2, sectionMinutes: 25, extraMinutes: 10 } });
  });

  it('Elfmeterschießen mit Namen und null wird angenommen', () => {
    const s = mutate(
      (x) =>
        (x.shootout = {
          first: 'own',
          done: true,
          shots: [
            ['own', true, 'Max'],
            ['opp', false, null],
          ],
        }),
    );
    expect(parseSnapshot(s)).toMatchObject({ shootout: { first: 'own', done: true } });
  });
});
