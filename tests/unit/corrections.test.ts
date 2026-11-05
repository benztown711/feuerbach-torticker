import { describe, expect, it } from 'vitest';
import { deriveClock } from '../../src/domain/clock';
import {
  addGoalAt,
  canAddLateGoal,
  canUndoWhistle,
  clockShiftRange,
  defaultOption,
  minuteOptions,
  playedIn,
  sectionRuns,
  setGoalMinute,
  shiftClock,
  timeAt,
  undoWhistle,
  whistleKind,
  type MinuteOption,
} from '../../src/domain/corrections';
import { settleDraw, startExtraTime, startShootout } from '../../src/domain/cup';
import { addCard, addMark } from '../../src/domain/events';
import {
  clockOf,
  createGame,
  endSection,
  kickoff,
  markSignalled,
  pauseClock,
  resumeClock,
} from '../../src/domain/game';
import { addGoal, goalRows, setAssist, setPenalty, setScorer } from '../../src/domain/goals';
import { buildShareText } from '../../src/domain/share-text';
import type { ClockEvent, Game, NewGameInput, Side } from '../../src/domain/types';

/** 07.11.2026, 10:30 Uhr in Stuttgart. */
const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const sec = (n: number): number => n * 1000;
const min = (n: number): number => n * 60_000;
const two25 = { sections: 2, sectionMinutes: 25 };
const input: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach E1',
  opponent: 'TSV Musterstadt',
  venue: 'home',
  schema: two25,
  ownColor: 'rot',
  oppColor: 'schwarz',
};
const ev = (type: ClockEvent['type'], at: number, section = 1): ClockEvent => ({ type, at, section });
let n = 0;
const ids = (): string => `goal-${++n}`;
const fresh = (): Game => createGame(input, { id: 'g', now: T0 - min(5) });
const running = (): Game => kickoff(fresh(), T0);
const goal = (g: Game, side: Side, at: number): Game => addGoal(g, side, at, ids).game;
const labels = (g: Game, now: number): string[] => minuteOptions(g, now).map((o) => o.label);
const option = (g: Game, now: number, label: string): MinuteOption => {
  const o = minuteOptions(g, now).find((x) => x.label === label);
  if (!o) throw new Error(`Minute ${label} nicht in der Auswahl`);
  return o;
};

/** Anpfiff der 2. Halbzeit. */
const K2 = T0 + min(35);
/** Schlusspfiff nach 25:30 gespielter Zeit der 2. Halbzeit (50+1'). */
const FULL = K2 + min(25) + sec(30);

/** 2 × 25: Tor Feuerbach in 10', Pausenpfiff nach 26:10 gespielter Zeit (25+2'), Halbzeit 1:0. */
const firstHalf = (): Game => endSection(goal(running(), 'own', T0 + min(9) + sec(30)), T0 + min(26) + sec(10));
const secondHalf = (): Game => kickoff(firstHalf(), K2);
/** Dazu Gegentor in 40' und Schlusspfiff: Endstand 1:1. */
const finished = (): Game => endSection(goal(secondHalf(), 'opp', K2 + min(14) + sec(30)), FULL);

describe('012 Laufstrecken der Uhr (Constitution V)', () => {
  it('ohne Uhr-Ereignisse keine Strecken', () => {
    expect(sectionRuns([]).size).toBe(0);
  });

  it('Anpfiff öffnet, Anhalten schließt, Fortsetzen öffnet, Pausen- und Schlusspfiff schließen', () => {
    const runs = sectionRuns([
      ev('kickoff', T0),
      ev('pause', T0 + min(3)),
      ev('resume', T0 + min(5)),
      ev('sectionEnd', T0 + min(27)),
      ev('kickoff', K2, 2),
      ev('fullTime', K2 + min(25), 2),
    ]);
    expect([...runs]).toEqual([
      [
        1,
        [
          { from: T0, to: T0 + min(3) },
          { from: T0 + min(5), to: T0 + min(27) },
        ],
      ],
      [2, [{ from: K2, to: K2 + min(25) }]],
    ]);
  });

  it('bei laufender Uhr bleibt die letzte Strecke offen', () => {
    expect([...sectionRuns([ev('kickoff', T0)])]).toEqual([[1, [{ from: T0, to: null }]]]);
  });

  it('Anhalten ohne laufende Uhr und Fortsetzen ohne Anhalten zählen nicht (wie deriveClock)', () => {
    const runs = sectionRuns([
      ev('pause', T0 - sec(1)),
      ev('kickoff', T0),
      ev('resume', T0 + min(1)),
      ev('pause', T0 + min(2)),
      ev('pause', T0 + min(3)),
      ev('resume', T0 + min(4)),
      ev('resume', T0 + min(5)),
    ]);
    expect([...runs]).toEqual([
      [
        1,
        [
          { from: T0, to: T0 + min(2) },
          { from: T0 + min(4), to: null },
        ],
      ],
    ]);
  });

  it('altes reset-Ereignis und erneuter Anpfiff verwerfen die Strecken des Abschnitts, Verlängerung ändert nichts', () => {
    const runs = sectionRuns([
      ev('kickoff', T0),
      ev('reset', T0 + min(2)),
      ev('resume', T0 + min(2) + sec(30)),
      ev('kickoff', T0 + min(3)),
      ev('sectionEnd', T0 + min(28)),
      ev('kickoff', K2, 2),
      ev('kickoff', K2 + min(1), 2),
      ev('fullTime', K2 + min(26), 2),
      ev('extraTime', K2 + min(27), 2),
      ev('kickoff', K2 + min(30), 3),
    ]);
    expect([...runs]).toEqual([
      [1, [{ from: T0 + min(3), to: T0 + min(28) }]],
      [2, [{ from: K2 + min(1), to: K2 + min(26) }]],
      [3, [{ from: K2 + min(30), to: null }]],
    ]);
  });

  it('gespielte Zeit aus den Strecken stimmt immer mit deriveClock überein', () => {
    const cases: ClockEvent[][] = [
      [ev('kickoff', T0)],
      [ev('kickoff', T0), ev('pause', T0 + min(3)), ev('resume', T0 + min(5)), ev('pause', T0 + min(9))],
      [
        ev('kickoff', T0),
        ev('resume', T0 + min(1)),
        ev('sectionEnd', T0 + min(26)),
        ev('kickoff', T0 + min(30), 2),
        ev('pause', T0 + min(40), 2),
        ev('fullTime', T0 + min(41), 2),
      ],
      [ev('kickoff', T0), ev('reset', T0 + min(2)), ev('resume', T0 + min(3))],
      [
        ev('kickoff', T0),
        ev('sectionEnd', T0 + min(25)),
        ev('kickoff', T0 + min(30), 2),
        ev('reset', T0 + min(31), 2),
        ev('kickoff', T0 + min(32), 2),
      ],
      [ev('kickoff', T0), ev('pause', T0 - min(1))],
      [ev('kickoff', T0), ev('kickoff', T0 + min(5), 2)],
      [
        ev('kickoff', T0),
        ev('sectionEnd', T0 + min(25)),
        ev('kickoff', T0 + min(30), 2),
        ev('fullTime', T0 + min(55), 2),
        ev('extraTime', T0 + min(56), 2),
        ev('kickoff', T0 + min(60), 3),
      ],
    ];
    for (const events of cases) {
      const runs = sectionRuns(events);
      const last = Math.max(...events.map((e) => e.at));
      for (const now of [last, last + sec(1), last + min(30)]) {
        const c = deriveClock(events, now, two25);
        expect(playedIn(runs, c.section, now)).toBe(c.playedMs);
      }
    }
  });
});

describe('012 gespielte Zeit und Uhrzeit', () => {
  const runs = sectionRuns([
    ev('kickoff', T0),
    ev('pause', T0 + min(3)),
    ev('resume', T0 + min(5)),
    ev('sectionEnd', T0 + min(27)),
    ev('kickoff', K2, 2),
  ]);

  it('playedIn: gespielte Zeit eines Abschnitts bis zu einer Uhrzeit, Anhalten zählt nicht', () => {
    expect(playedIn(runs, 1, T0 - min(1))).toBe(0);
    expect(playedIn(runs, 1, T0 + min(2))).toBe(min(2));
    expect(playedIn(runs, 1, T0 + min(4))).toBe(min(3));
    expect(playedIn(runs, 1, T0 + min(6))).toBe(min(4));
    expect(playedIn(runs, 1, T0 + min(90))).toBe(min(25));
    expect(playedIn(runs, 2, K2 + min(5))).toBe(min(5));
    expect(playedIn(runs, 3, K2 + min(5))).toBe(0);
  });

  it('timeAt: Uhrzeit zu einer gespielten Zeit, über das Ende hinaus das Ende der letzten Strecke', () => {
    expect(timeAt(runs, 1, 0)).toBe(T0);
    expect(timeAt(runs, 1, min(2))).toBe(T0 + min(2));
    expect(timeAt(runs, 1, min(3))).toBe(T0 + min(3));
    expect(timeAt(runs, 1, min(3) + 1)).toBe(T0 + min(5) + 1);
    expect(timeAt(runs, 1, min(25))).toBe(T0 + min(27));
    expect(timeAt(runs, 1, min(30))).toBe(T0 + min(27));
    expect(timeAt(runs, 2, min(90))).toBe(K2 + min(90));
  });

  it('timeAt ohne Strecken des Abschnitts ergibt keine Uhrzeit', () => {
    expect(timeAt(runs, 3, min(1))).toBeNaN();
  });

  it('timeAt ist die Umkehrung von playedIn', () => {
    for (const p of [0, sec(1), min(3), min(10), min(25)]) expect(playedIn(runs, 1, timeAt(runs, 1, p))).toBe(p);
  });
});

describe('012 FR-S11 Minutenauswahl', () => {
  it('012 US2-S6 vor dem ersten Anpfiff keine Minute und kein "Tor nachtragen"', () => {
    expect(minuteOptions(fresh(), T0)).toEqual([]);
    expect(defaultOption(fresh(), T0)).toBeNull();
    expect(canAddLateGoal(fresh(), T0)).toBe(false);
  });

  it('012 US2-S4 laufende Uhr: angefangene Minuten, vorgewählt die aktuelle', () => {
    const g = running();
    const now = T0 + min(2) + sec(30);
    expect(labels(g, now)).toEqual(["1'", "2'", "3'"]);
    expect(defaultOption(g, now)).toEqual({ section: 1, minute: 3, stoppage: null, label: "3'" });
    expect(defaultOption(g, now)?.label).toBe(clockOf(g, now).label);
    expect(canAddLateGoal(g, now)).toBe(true);
  });

  it('eine Minute beginnt erst nach Ablauf der vorigen', () => {
    expect(labels(running(), T0)).toEqual([]);
    expect(labels(running(), T0 + min(2))).toEqual(["1'", "2'"]);
  });

  it('angehaltene Uhr: bis zur Minute des Anhaltens, vorgewählt die aktuelle', () => {
    const g = pauseClock(running(), T0 + min(3) + sec(10));
    const now = T0 + min(8);
    expect(labels(g, now)).toEqual(["1'", "2'", "3'", "4'"]);
    expect(defaultOption(g, now)?.label).toBe(clockOf(g, now).label);
  });

  it('012 US2-S4 in der Pause: bis zum Pausenpfiff mit gespielten Nachspielminuten, vorgewählt die letzte', () => {
    const g = firstHalf();
    const now = T0 + min(30);
    const all = labels(g, now);
    expect(all).toHaveLength(27);
    expect(all.slice(-3)).toEqual(["25'", "25+1'", "25+2'"]);
    expect(defaultOption(g, now)).toEqual({ section: 1, minute: 25, stoppage: 2, label: "25+2'" });
  });

  it('2. Halbzeit läuft: Minuten beider Abschnitte in Spielreihenfolge', () => {
    const g = secondHalf();
    const now = K2 + min(3) + sec(30);
    const all = labels(g, now);
    expect(all).toHaveLength(31);
    expect(all.slice(25)).toEqual(["25+1'", "25+2'", "26'", "27'", "28'", "29'"]);
    expect(option(g, now, "26'")).toEqual({ section: 2, minute: 26, stoppage: null, label: "26'" });
    expect(defaultOption(g, now)?.label).toBe("29'");
  });

  it('012 US2-S4 nach dem Schlusspfiff: alle gespielten Minuten, vorgewählt die letzte', () => {
    const g = finished();
    const now = FULL + min(30);
    const all = labels(g, now);
    expect(all).toHaveLength(53);
    expect(all[0]).toBe("1'");
    expect(all.at(-1)).toBe("50+1'");
    expect(defaultOption(g, now)).toEqual({ section: 2, minute: 50, stoppage: 1, label: "50+1'" });
    expect(canAddLateGoal(g, now)).toBe(true);
  });

  it('Verlängerung: gespielte Minuten der Verlängerung fortlaufend', () => {
    let g = kickoff(startExtraTime(finished(), 5, FULL + min(1)), FULL + min(3));
    g = endSection(g, FULL + min(8) + sec(20));
    g = kickoff(g, FULL + min(10));
    const now = FULL + min(12) + sec(30);
    expect(labels(g, now).slice(-10)).toEqual([
      "50+1'",
      "51'",
      "52'",
      "53'",
      "54'",
      "55'",
      "55+1'",
      "56'",
      "57'",
      "58'",
    ]);
    expect(option(g, now, "51'").section).toBe(3);
    expect(option(g, now, "56'").section).toBe(4);
  });

  it('Elfmeterschießen: kein "Tor nachtragen"', () => {
    expect(canAddLateGoal(startShootout(finished(), 'own'), FULL + min(5))).toBe(false);
  });
});

describe('012 FR-S10 FR-S13 FR-S14 Tor nachtragen', () => {
  it('012 US2-S1 nach dem Schlusspfiff: Tor zählt, steht an der richtigen Stelle, Endstand und Teilen-Text folgen', () => {
    const g = finished();
    const now = FULL + min(2);
    const r = addGoalAt(g, 'own', option(g, now, "48'"), now, ids);
    expect(r.goal).toMatchObject({
      side: 'own',
      at: K2 + min(22) + sec(30),
      section: 2,
      minute: 48,
      stoppage: null,
      scorer: null,
      deletedAt: null,
    });
    expect(r.game.goals.at(-1)).toBe(r.goal);
    expect(goalRows(r.game).map((x) => [x.label, x.score])).toEqual([
      ["48'", '2:1'],
      ["40'", '1:1'],
      ["10'", '1:0'],
    ]);
    expect(r.game.finalScore).toEqual({ own: 2, opp: 1 });
    expect(r.game.halfTimeScore).toEqual({ own: 1, opp: 0 });
    expect(buildShareText(r.game, [], 'Europe/Berlin')).toContain('2:1');
  });

  it("012 US2-S2 laufende 2. Halbzeit: Gegentor in 12' steht zwischen 5' und 20', Halbzeitstand folgt", () => {
    let g = goal(running(), 'own', T0 + min(4) + sec(30));
    g = goal(g, 'own', T0 + min(19) + sec(30));
    g = kickoff(endSection(g, T0 + min(25) + sec(30)), K2);
    const now = K2 + min(10);
    const r = addGoalAt(g, 'opp', option(g, now, "12'"), now, ids);
    expect(r.goal.at).toBe(T0 + min(11) + sec(30));
    expect(goalRows(r.game).map((x) => [x.label, x.score])).toEqual([
      ["20'", '2:1'],
      ["12'", '1:1'],
      ["5'", '1:0'],
    ]);
    expect(r.game.halfTimeScore).toEqual({ own: 2, opp: 1 });
    expect(r.game.finalScore).toBeNull();
  });

  it('012 US2-S7 die Uhr bleibt unverändert', () => {
    const g = secondHalf();
    const now = K2 + min(5);
    const r = addGoalAt(g, 'own', option(g, now, "3'"), now, ids);
    expect(r.game.clockEvents).toBe(g.clockEvents);
    expect(r.game.status).toBe('running');
    expect(r.game.signalledThresholds).toBe(g.signalledThresholds);
  });

  it('FR-S13 Uhrzeit = Mitte der Minute im Spielverlauf, Anhalten zählt nicht', () => {
    const g = resumeClock(pauseClock(running(), T0 + min(3)), T0 + min(5));
    const now = T0 + min(10);
    expect(addGoalAt(g, 'opp', option(g, now, "3'"), now, ids).goal.at).toBe(T0 + min(2) + sec(30));
    expect(addGoalAt(g, 'opp', option(g, now, "4'"), now, ids).goal.at).toBe(T0 + min(5) + sec(30));
  });

  it('FR-S13 höchstens bis jetzt bzw. bis zum Abschnittsende', () => {
    const g = running();
    const now = T0 + min(2) + sec(10);
    expect(addGoalAt(g, 'own', option(g, now, "3'"), now, ids).goal.at).toBe(now);
    const brk = firstHalf();
    const later = T0 + min(30);
    expect(addGoalAt(brk, 'own', option(brk, later, "25+1'"), later, ids).goal).toMatchObject({
      at: T0 + min(25) + sec(30),
      minute: 25,
      stoppage: 1,
    });
    expect(addGoalAt(brk, 'own', option(brk, later, "25+2'"), later, ids).goal).toMatchObject({
      at: T0 + min(26) + sec(10),
      minute: 25,
      stoppage: 2,
    });
  });

  it('FR-S11 nicht gespielte Minuten werden abgelehnt', () => {
    const g = firstHalf();
    const now = T0 + min(30);
    expect(() => addGoalAt(g, 'own', { section: 1, minute: 30, stoppage: null, label: "30'" }, now, ids)).toThrow(
      "Minute nicht gespielt: 30'",
    );
    expect(() => addGoalAt(g, 'own', { section: 2, minute: 26, stoppage: null, label: "26'" }, now, ids)).toThrow();
    expect(() => addGoalAt(g, 'own', { section: 1, minute: 25, stoppage: 3, label: "25+3'" }, now, ids)).toThrow();
  });

  it('ohne ID-Erzeuger eine zufällige ID', () => {
    const g = running();
    const now = T0 + min(1);
    expect(addGoalAt(g, 'own', option(g, now, "1'"), now).goal.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('012 FR-S12 FR-S14 Minute ändern', () => {
  const MAX = { kind: 'player', playerId: 'p-max' } as const;
  const BEN = { kind: 'player', playerId: 'p-ben' } as const;

  it("012 US2-S5 17' statt 15': Liste ordnet neu, Torschütze, Vorlage und Elfmeter bleiben", () => {
    let g = goal(running(), 'own', T0 + min(14) + sec(30));
    g = goal(g, 'own', T0 + min(15) + sec(30));
    const [first, second] = g.goals.map((x) => x.id) as [string, string];
    g = setAssist(setScorer(g, first, MAX), first, 'p-ben');
    g = setPenalty(setScorer(g, second, BEN), second, true);
    const now = T0 + min(20);
    const moved = setGoalMinute(g, first, option(g, now, "17'"), now);
    expect(goalRows(moved).map((x) => x.label)).toEqual(["17'", "16'"]);
    expect(moved.goals[1]).toMatchObject({
      id: first,
      at: T0 + min(16) + sec(30),
      minute: 17,
      stoppage: null,
      scorer: MAX,
      assist: 'p-ben',
    });
    const again = setGoalMinute(moved, second, option(g, now, "3'"), now);
    expect(again.goals.map((x) => x.id)).toEqual([second, first]);
    expect(again.goals[0]).toMatchObject({ minute: 3, scorer: BEN, penalty: true });
    expect(again.clockEvents).toBe(g.clockEvents);
  });

  it('FR-S14 Abschnitt wechseln: Halbzeitstand folgt, Endstand bleibt', () => {
    const g = finished();
    const now = FULL + min(1);
    const [own, opp] = g.goals.map((x) => x.id) as [string, string];
    const later = setGoalMinute(g, own, option(g, now, "48'"), now);
    expect(later.goals.map((x) => [x.id, x.section, x.minute])).toEqual([
      [opp, 2, 40],
      [own, 2, 48],
    ]);
    expect(later.halfTimeScore).toEqual({ own: 0, opp: 0 });
    expect(later.finalScore).toEqual({ own: 1, opp: 1 });
    const earlier = setGoalMinute(g, opp, option(g, now, "25+1'"), now);
    expect(earlier.goals.find((x) => x.id === opp)).toMatchObject({
      section: 1,
      minute: 25,
      stoppage: 1,
      at: T0 + min(25) + sec(30),
    });
    expect(earlier.halfTimeScore).toEqual({ own: 1, opp: 1 });
  });

  it('unbekanntes Tor oder nicht gespielte Minute ändern nichts', () => {
    const g = firstHalf();
    const now = T0 + min(30);
    const id = g.goals[0]!.id;
    expect(setGoalMinute(g, 'gibt-es-nicht', option(g, now, "3'"), now)).toBe(g);
    expect(setGoalMinute(g, id, { section: 2, minute: 26, stoppage: null, label: "26'" }, now)).toBe(g);
  });
});

describe('012 FR-S15 Pfiff zurücknehmen', () => {
  it("012 US3-S1 Pausenpfiff in 18' zurücknehmen: 1. Halbzeit läuft weiter, Uhr zeigt die Zeit seit dem Anpfiff", () => {
    const g = endSection(goal(running(), 'own', T0 + min(5)), T0 + min(17) + sec(30));
    const now = T0 + min(18) + sec(30);
    expect(g.halfTimeScore).toEqual({ own: 1, opp: 0 });
    expect(whistleKind(g)).toBe('Pausenpfiff');
    expect(canUndoWhistle(g, now)).toBe(true);
    const u = undoWhistle(g, now);
    expect(u.clockEvents).toEqual([ev('kickoff', T0)]);
    expect(u.status).toBe('running');
    expect(u.halfTimeScore).toBeNull();
    expect(clockOf(u, now).label).toBe("19'");
  });

  it('012 US3-S2 Schlusspfiff vor 3 Minuten zurücknehmen: Nachspielzeit läuft weiter, Tore wieder möglich', () => {
    const g = settleDraw(finished());
    const now = FULL + min(3);
    expect(whistleKind(g)).toBe('Schlusspfiff');
    const u = undoWhistle(g, now);
    expect(u).toMatchObject({
      status: 'running',
      finalScore: null,
      drawSettled: false,
      halfTimeScore: { own: 1, opp: 0 },
    });
    expect(clockOf(u, now).label).toBe("50+4'");
    expect(addGoal(u, 'own', now, ids).added).toBe(true);
  });

  it('012 US3-S3 höchstens 10 Minuten nach dem Pfiff und nur, solange er das letzte Uhr-Ereignis ist', () => {
    const g = finished();
    expect(canUndoWhistle(g, FULL + min(10))).toBe(true);
    expect(canUndoWhistle(g, FULL + min(10) + 1)).toBe(false);
    expect(undoWhistle(g, FULL + min(10) + 1)).toBe(g);
    const next = secondHalf();
    expect(whistleKind(next)).toBeNull();
    expect(canUndoWhistle(next, K2 + min(1))).toBe(false);
    expect(whistleKind(fresh())).toBeNull();
    expect(canUndoWhistle(fresh(), T0)).toBe(false);
  });

  it('012 US3-S4 nach Wahl von Verlängerung oder Elfmeterschießen nicht mehr', () => {
    const extra = startExtraTime(finished(), 5, FULL + min(1));
    expect(whistleKind(extra)).toBeNull();
    expect(canUndoWhistle(extra, FULL + min(2))).toBe(false);
    const shootout = startShootout(finished(), 'own');
    expect(whistleKind(shootout)).toBe('Schlusspfiff');
    expect(canUndoWhistle(shootout, FULL + min(2))).toBe(false);
    expect(undoWhistle(shootout, FULL + min(2))).toBe(shootout);
  });

  it('Pfiff bei angehaltener Uhr zurücknehmen: Uhr bleibt angehalten', () => {
    const g = endSection(pauseClock(running(), T0 + min(3)), T0 + min(4));
    const u = undoWhistle(g, T0 + min(5));
    expect(u.status).toBe('paused');
    expect(u.halfTimeScore).toBeNull();
  });

  it('Pausenpfiff in der Verlängerung zurücknehmen: Halbzeit- und Endstand bleiben', () => {
    let g = kickoff(startExtraTime(finished(), 5, FULL + min(1)), FULL + min(3));
    g = endSection(g, FULL + min(8) + sec(20));
    expect(whistleKind(g)).toBe('Pausenpfiff');
    const u = undoWhistle(g, FULL + min(9));
    expect(u.status).toBe('running');
    expect(u.halfTimeScore).toEqual({ own: 1, opp: 0 });
    expect(u.finalScore).toEqual({ own: 1, opp: 1 });
  });
});

describe('012 FR-S20 bis FR-S23 Uhr korrigieren', () => {
  it('012 US4-S5 vor dem Anpfiff, in der Pause und nach dem Schlusspfiff nicht möglich', () => {
    expect(clockShiftRange(fresh(), T0)).toBeNull();
    const brk = firstHalf();
    expect(clockShiftRange(brk, T0 + min(30))).toBeNull();
    expect(shiftClock(brk, 1, T0 + min(30))).toBe(brk);
    expect(clockShiftRange(finished(), FULL + min(1))).toBeNull();
  });

  it("012 US4-S1 Uhr zeigt 10', zweimal +1 Min: Uhr zeigt 12', Restzeit zwei Minuten weniger", () => {
    const g = running();
    const now = T0 + min(9) + sec(30);
    expect(clockOf(g, now).label).toBe("10'");
    expect(clockShiftRange(g, now)).toEqual({ min: -9, max: 60 });
    const s = shiftClock(g, 2, now);
    expect(s.clockEvents).toEqual([ev('kickoff', T0 - min(2))]);
    expect(s.status).toBe('running');
    expect(clockOf(s, now)).toMatchObject({ label: "12'", remainingMs: min(13) + sec(30) });
  });

  it('012 US4-S2 Tore und Ereignisse des laufenden Abschnitts rücken mit, frühere Abschnitte bleiben', () => {
    let g = goal(running(), 'own', T0 + min(9) + sec(30));
    g = addMark(g, T0 + min(12) + sec(10), ids)!.game;
    g = kickoff(endSection(g, T0 + min(26) + sec(10)), K2);
    g = goal(g, 'opp', K2 + min(4) + sec(30));
    g = addCard(g, { side: 'own', card: 'gelb', who: null }, K2 + min(6) + sec(10), ids)!.game;
    const now = K2 + min(8);
    expect(clockShiftRange(g, now)).toEqual({ min: -4, max: 8 });
    const s = shiftClock(g, 2, now);
    expect(s.goals.map((x) => [x.id, x.section, x.minute, x.at])).toEqual([
      [g.goals[0]!.id, 1, 10, T0 + min(9) + sec(30)],
      [g.goals[1]!.id, 2, 32, K2 + min(4) + sec(30)],
    ]);
    expect(s.events?.map((e) => [e.kind, e.section, e.minute, e.at])).toEqual([
      ['mark', 1, 13, T0 + min(12) + sec(10)],
      ['card', 2, 34, K2 + min(6) + sec(10)],
    ]);
    expect(s.clockEvents.at(-1)).toEqual(ev('kickoff', K2 - min(2), 2));
  });

  it('Tor rückt in die Nachspielzeit; Spiele ohne Ereignisse bleiben ohne', () => {
    const g = goal(running(), 'opp', T0 + min(24) + sec(30));
    const now = T0 + min(24) + sec(50);
    const s = shiftClock(g, 2, now);
    expect(s.goals[0]).toMatchObject({ minute: 25, stoppage: 2 });
    expect(clockOf(s, now).label).toBe("25+2'");
    expect(s).not.toHaveProperty('events');
  });

  it('012 US4-S3 Uhr ging vor: zu früher Pfiff wird erneut fällig', () => {
    let g = running();
    const now = T0 + min(25) + sec(20);
    g = markSignalled(g, clockOf(g, now).dueThresholds);
    expect(g.signalledThresholds).toEqual(['1:0']);
    const s = shiftClock(g, -1, now);
    expect(s.signalledThresholds).toEqual([]);
    expect(clockOf(s, now).label).toBe("25'");
    expect(clockOf(s, now).dueThresholds).toEqual([]);
    expect(clockOf(s, T0 + min(26) + sec(20)).dueThresholds).toEqual(['1:0']);
  });

  it('FR-S23 nur nicht mehr erreichte Signale des laufenden Abschnitts entfallen', () => {
    let g = kickoff(endSection(running(), T0 + min(25)), T0 + min(30));
    const now = T0 + min(30) + min(27) + sec(10);
    g = markSignalled(g, ['1:0', ...clockOf(g, now).dueThresholds]);
    expect(g.signalledThresholds).toEqual(['1:0', '2:0', '2:+1', '2:+2']);
    expect(shiftClock(g, -1, now).signalledThresholds).toEqual(['1:0', '2:0', '2:+1']);
  });

  it('012 US4-S4 nicht vor das Ende des vorigen Abschnitts und nicht hinter jetzt', () => {
    const g = kickoff(endSection(running(), T0 + min(25)), T0 + min(28));
    const now = T0 + min(30);
    expect(clockShiftRange(g, now)).toEqual({ min: -2, max: 2 });
    expect(shiftClock(g, 3, now)).toBe(g);
    expect(shiftClock(g, -3, now)).toBe(g);
    expect(shiftClock(g, 2, now).clockEvents.at(-1)?.at).toBe(T0 + min(26));
    expect(shiftClock(g, -2, now).clockEvents.at(-1)?.at).toBe(now);
    expect(clockOf(shiftClock(g, -2, now), now).playedMs).toBe(0);
  });

  it('012 US4-S4 nicht hinter die erste Unterbrechung des Abschnitts, ohne vorigen Abschnitt höchstens 60 Minuten', () => {
    const g = resumeClock(pauseClock(running(), T0 + min(2) + sec(20)), T0 + min(4));
    const now = T0 + min(10);
    expect(clockShiftRange(g, now)).toEqual({ min: -2, max: 60 });
    expect(shiftClock(g, 61, now)).toBe(g);
    expect(shiftClock(g, 60, now).clockEvents[0]?.at).toBe(T0 - min(60));
  });

  it('012 US4-S4 nicht hinter das erste Tor oder Ereignis des Abschnitts', () => {
    const withGoal = goal(running(), 'own', T0 + min(4) + sec(30));
    expect(clockShiftRange(withGoal, T0 + min(9))?.min).toBe(-4);
    const withCard = addCard(withGoal, { side: 'opp', card: 'zeit', who: null }, T0 + min(3) + sec(10), ids)!.game;
    expect(clockShiftRange(withCard, T0 + min(9))?.min).toBe(-3);
  });

  it('Uhr korrigieren bei angehaltener Uhr: Korrektur gilt sofort, Uhr bleibt angehalten', () => {
    const g = pauseClock(running(), T0 + min(4) + sec(30));
    const now = T0 + min(8);
    expect(clockShiftRange(g, now)).toEqual({ min: -4, max: 60 });
    const s = shiftClock(g, 1, now);
    expect(s.status).toBe('paused');
    expect(clockOf(s, now).label).toBe("6'");
  });
});
