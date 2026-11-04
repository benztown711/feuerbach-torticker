import { describe, expect, it } from 'vitest';
import { deriveClock } from '../../src/domain/clock';
import { applySnapshot, boardView, emptyBoard, type BoardEntry } from '../../src/domain/live-board';
import { MAX_TAKEOVER, type LiveGameSnapshot, type LiveGoal } from '../../src/domain/live-snapshot';
import { handOver, takenOver, takeoverGame } from '../../src/domain/live-takeover';
import type { ClockEventType, Game, Player } from '../../src/domain/types';

/** Sa, 07.11.2026, 10:00 Uhr in Stuttgart. */
const T0 = Date.UTC(2026, 10, 7, 9, 0, 0);
const TZ = 'Europe/Berlin';
const min = (n: number): number => n * 60_000;

type Clock = [ClockEventType, number, number][];

function snap(p: Partial<LiveGameSnapshot> = {}): LiveGameSnapshot {
  return {
    v: 1,
    kind: 'game',
    state: 'live',
    gameId: 'g1',
    team: 'E2',
    sentAt: T0,
    h: 0,
    createdAt: T0 - min(10),
    own: 'Feuerbach E2',
    opp: 'TSV Musterstadt',
    venue: 'away',
    ownColor: 'rot',
    oppColor: 'schwarz',
    schema: { sections: 2, sectionMinutes: 25 },
    clock: [],
    goals: [],
    shootout: null,
    drawSettled: false,
    ...p,
  };
}

const goal = (side: 'own' | 'opp', minute: number, p: Partial<LiveGoal> = {}): LiveGoal => ({
  side,
  minute,
  stoppage: null,
  section: 1,
  who: null,
  penalty: false,
  ownGoal: false,
  ...p,
});

const players: Player[] = [
  { id: 'p-max', name: 'Max', number: 7, deletedAt: null },
  { id: 'p-ben', name: 'Ben', number: 9, deletedAt: T0 },
];

let n = 0;
const newId = () => `neu-${++n}`;

/** Altes Handy geht 3 Minuten vor, die Meldung kam um T0 + 12 min beim Dienst an; eigene Uhr 1 Minute nach. */
const LEAD_AHEAD = min(3);
const SKEW = min(1);
const entry = (s: LiveGameSnapshot, at = T0 + min(12)): BoardEntry => ({ snap: s, at });
const leadTime = (serverTime: number): number => serverTime + LEAD_AHEAD;

describe('006 US6-S2 FR-L23 Spiel aus dem letzten Live-Stand übernehmen', () => {
  const clock: Clock = [['kickoff', leadTime(T0), 1]];
  const goals = [
    goal('own', 6, { who: 'max' }),
    goal('opp', 9, { who: 'Nr. 9' }),
    goal('own', 11, { who: 'Leo', penalty: true }),
    goal('own', 12, { ownGoal: true }),
    goal('opp', 12),
    goal('own', 12, { who: 'Ben' }),
  ];
  const s = snap({ sentAt: leadTime(T0 + min(12)), clock, goals, h: 2 });
  const now = T0 + min(15) - SKEW;
  const g = takeoverGame({ entry: entry(s), ownTeam: 'Sportvg Feuerbach E2', players, skew: SKEW, now, newId });

  it('Kopfdaten, gleiche Spiel-ID, Übergabezähler um eins erhöht', () => {
    expect(g).toMatchObject({
      id: 'g1',
      ownTeam: 'Sportvg Feuerbach E2',
      opponent: 'TSV Musterstadt',
      venue: 'away',
      schema: { sections: 2, sectionMinutes: 25 },
      ownColor: 'rot',
      oppColor: 'schwarz',
      live: true,
      liveTakeover: 3,
      squad: [],
      events: [],
      status: 'running',
      finalScore: null,
      halfTimeScore: null,
      drawSettled: false,
    });
    expect(g.shootout).toBeUndefined();
    // createdAt kam in der Uhr des alten Handys (3 Minuten vor)
    expect(g.createdAt).toBe(T0 - min(10) - LEAD_AHEAD - SKEW);
  });

  it('Uhr auf die eigene Uhrzeit umgerechnet: dieselbe Minute wie auf dem Dashboard', () => {
    expect(g.clockEvents).toEqual([{ type: 'kickoff', at: T0 - SKEW, section: 1 }]);
    const board = applySnapshot(emptyBoard(), s, T0 + min(12), TZ);
    const dash = boardView(board, now + SKEW, TZ).cards[0]!.phase;
    expect(deriveClock(g.clockEvents, now, g.schema).label).toBe(dash);
    expect(dash).toBe("16'");
  });

  it('geschätzte Torzeit höchstens der Zeitpunkt der Meldung (sonst gälte ein späteres Tor als Doppeltipp)', () => {
    const fresh = snap({ clock: [['kickoff', T0, 1]], goals: [goal('own', 4)], sentAt: T0 + min(3) + 5000 });
    const t = takeoverGame({
      entry: entry(fresh, T0 + min(3) + 5000),
      ownTeam: 'E2',
      players,
      skew: 0,
      now: T0 + min(4),
      newId,
    });
    expect(t.goals[0]?.at).toBe(T0 + min(3) + 5000);
  });

  it('Tore mit Torschützen: eigene über den Namen dem Kader zugeordnet, Gegner als Text', () => {
    expect(g.goals.map((x) => [x.side, x.minute, x.scorer, x.penalty])).toEqual([
      ['own', 6, { kind: 'player', playerId: 'p-max' }, false],
      ['opp', 9, { kind: 'text', text: 'Nr. 9' }, false],
      ['own', 11, null, true], // "Leo" steht nicht im Kader
      ['own', 12, { kind: 'ownGoal' }, false],
      ['opp', 12, null, false],
      ['own', 12, null, false], // gelöschte Spieler werden nicht zugeordnet
    ]);
    expect(g.goals[0]?.at).toBe(T0 - SKEW + min(5.5));
    expect(new Set(g.goals.map((x) => x.id)).size).toBe(6);
    expect(g.goals.every((x) => x.deletedAt === null)).toBe(true);
  });

  it('bereits erreichte Signalschwellen gelten als erledigt; Zähler höchstens bis zur Obergrenze', () => {
    const late = takeoverGame({
      entry: entry({ ...s, h: MAX_TAKEOVER }),
      ownTeam: 'Sportvg Feuerbach E2',
      players,
      skew: SKEW,
      now: T0 + min(27) - SKEW,
      newId,
    });
    expect(late.signalledThresholds).toEqual(['1:0', '1:+1', '1:+2']);
    expect(late.liveTakeover).toBe(MAX_TAKEOVER);
    expect(g.signalledThresholds).toEqual([]);
  });
});

describe('006 US6-S2 Pause, Nachspielzeit, Ende und Elfmeterschießen', () => {
  const full: Clock = [
    ['kickoff', T0, 1],
    ['sectionEnd', T0 + min(26), 1],
    ['kickoff', T0 + min(30), 2],
    ['fullTime', T0 + min(56), 2],
  ];
  const goals = [
    goal('own', 25, { stoppage: 1 }),
    goal('opp', 30, { section: 2 }),
    goal('own', 3, { section: 3 }), // Abschnitt ohne Anpfiff
  ];
  const shootout = {
    first: 'own' as const,
    done: true,
    shots: [
      ['own', true, 'Max'],
      ['opp', false, 'Nr. 4'],
      ['own', false, null],
    ] as ['own' | 'opp', boolean, string | null][],
  };
  const now = T0 + min(70);
  const g = takeoverGame({
    entry: entry(snap({ clock: full, goals, shootout, drawSettled: true, sentAt: T0 + min(60) }), T0 + min(60)),
    ownTeam: 'Sportvg Feuerbach E2',
    players,
    skew: 0,
    now,
    newId,
  });

  it('Halbzeitstand, Endstand, Status beendet', () => {
    expect(g.status).toBe('finished');
    expect(g.halfTimeScore).toEqual({ own: 1, opp: 0 });
    expect(g.finalScore).toEqual({ own: 2, opp: 1 });
    expect(g.drawSettled).toBe(true);
  });

  it('Uhrzeit der Tore: Nachspielzeit nach dem Abschnittsende, ohne Anpfiff jetzt', () => {
    // ohne Anpfiff des Abschnitts: Zeitpunkt der Meldung (vor jetzt)
    expect(g.goals.map((x) => x.at)).toEqual([T0 + min(25.5), T0 + min(30) + min(29.5 - 25), T0 + min(60)]);
  });

  it('Elfmeterschießen mit Schützen', () => {
    expect(g.shootout).toEqual({
      first: 'own',
      done: true,
      shots: [
        { side: 'own', hit: true, who: { kind: 'player', playerId: 'p-max' }, at: now },
        { side: 'opp', hit: false, who: { kind: 'text', text: 'Nr. 4' }, at: now },
        { side: 'own', hit: false, who: null, at: now },
      ],
    });
  });
});

describe('006 US6-S3 FR-L24 wurde das eigene Spiel übernommen?', () => {
  const game = { id: 'g1', liveTakeover: 1 } as Game;

  it('größerer Übergabezähler beim Dashboard (Stand oder Grabstein) heißt übernommen', () => {
    const b = applySnapshot(emptyBoard(), snap({ h: 2 }), T0, TZ);
    expect(takenOver(b, game, 'E2')).toBe(true);
    expect(takenOver(b, { ...game, liveTakeover: 2 }, 'E2')).toBe(false);
    expect(takenOver(b, game, 'E1')).toBe(false);
    expect(takenOver(b, { ...game, id: 'g2' }, 'E2')).toBe(false);
    expect(takenOver(applySnapshot(emptyBoard(), snap({ h: 0 }), T0, TZ), { id: 'g1' } as Game, 'E2')).toBe(false);
    const gone = applySnapshot(
      b,
      { v: 1, kind: 'game', state: 'off', h: 2, gameId: 'g1', team: 'E2', sentAt: T0 + 1 },
      T0,
      TZ,
    );
    expect(gone.games).toEqual([]);
    expect(takenOver(gone, game, 'E2')).toBe(true);
    expect(takenOver(gone, { ...game, liveTakeover: 2 }, 'E2')).toBe(false);
  });

  it('übergebenes Spiel sendet nicht mehr und bleibt lokal erhalten', () => {
    const g = { id: 'g1', goals: [], live: true } as unknown as Game;
    expect(handOver(g)).toEqual({ id: 'g1', goals: [], live: false, liveHandedOver: true });
  });
});
