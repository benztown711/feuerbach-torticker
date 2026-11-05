import { describe, expect, it } from 'vitest';
import {
  MAX_GAMES,
  MAX_REMOVED,
  applyConfig,
  applySnapshot,
  boardView,
  dayKey,
  emptyBoard,
  formatClockTime,
  formatDay,
  otherGames,
  parseBoard,
  runningElsewhere,
  type Board,
} from '../../src/domain/live-board';
import type { LiveGameSnapshot, LiveGoal, LiveSnapshot } from '../../src/domain/live-snapshot';
import type { ClockEventType, LiveConfig } from '../../src/domain/types';

/** Sa, 07.11.2026, 10:00 Uhr in Stuttgart. */
const T0 = Date.UTC(2026, 10, 7, 9, 0, 0);
const TZ = 'Europe/Berlin';
const min = (n: number): number => n * 60_000;
const DAY = min(24 * 60);

type Clock = [ClockEventType, number, number][];

function snap(p: Partial<LiveGameSnapshot> = {}): LiveGameSnapshot {
  return {
    v: 1,
    kind: 'game',
    state: 'live',
    gameId: 'g1',
    team: 'E1',
    sentAt: T0,
    h: 0,
    createdAt: T0 - min(10),
    own: 'Feuerbach E1',
    opp: 'TSV Musterstadt',
    venue: 'home',
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

const config = (teams: string[], iat = T0, title = 'Unser Spieltag'): LiveConfig => ({ title, teams, iat });

/** Meldung, deren Serverzeit der Sendezeit entspricht (Uhren richtig). */
const put = (board: Board, s: LiveSnapshot, at = s.sentAt): Board => applySnapshot(board, s, at, TZ);
const view = (board: Board, now: number) => boardView(board, now, TZ);
const one = (s: LiveGameSnapshot, now: number) => view(put(emptyBoard(), s), now).cards[0]!;

const kicked = (at = T0): Clock => [['kickoff', at, 1]];
const atHalf: Clock = [
  ['kickoff', T0, 1],
  ['sectionEnd', T0 + min(25), 1],
];
const fullTime: Clock = [...atHalf, ['kickoff', T0 + min(30), 2], ['fullTime', T0 + min(55), 2]];

describe('006 FR-L11 R-L5 Meldungen übernehmen', () => {
  it('je Spiel gewinnt das größte sentAt, ältere und gleiche Stände ändern nichts', () => {
    const b1 = put(emptyBoard(), snap({ sentAt: T0 + 2000, goals: [goal('own', 3)] }));
    expect(put(b1, snap({ sentAt: T0 + 1000 }))).toBe(b1);
    expect(put(b1, snap({ sentAt: T0 + 2000 }))).toBe(b1);
    const b2 = put(b1, snap({ sentAt: T0 + 3000, goals: [] }));
    expect(b2.games).toHaveLength(1);
    expect(b2.games[0]?.snap.goals).toEqual([]);
  });

  it('"Nicht live senden" und Löschen entfernen das Spiel; ältere Stände bringen es nicht zurück', () => {
    const b1 = put(emptyBoard(), snap({ sentAt: T0 }));
    const off = put(b1, { v: 1, kind: 'game', state: 'off', h: 0, gameId: 'g1', team: 'E1', sentAt: T0 + 10 });
    expect(off.games).toEqual([]);
    expect(off.removed).toEqual([['E1/g1', T0 + 10, 0]]);
    expect(put(off, snap({ sentAt: T0 + 5 }))).toBe(off);
    expect(put(off, { v: 1, kind: 'game', state: 'deleted', h: 0, gameId: 'g1', team: 'E1', sentAt: T0 + 9 })).toBe(
      off,
    );
    // "Live senden" wieder an: neuerer Stand
    const back = put(off, snap({ sentAt: T0 + 20 }));
    expect(back.games).toHaveLength(1);
    const deleted = put(back, {
      v: 1,
      kind: 'game',
      state: 'deleted',
      h: 0,
      gameId: 'g1',
      team: 'E1',
      sentAt: T0 + 30,
    });
    expect(deleted.games).toEqual([]);
    expect(deleted.removed).toEqual([['E1/g1', T0 + 30, 0]]);
  });

  it('FR-L23 größerer Übergabezähler gilt vor sentAt; Meldungen des alten Handys ändern nichts', () => {
    const b1 = put(emptyBoard(), snap({ sentAt: T0 + 9000, goals: [goal('own', 3)] }));
    const taken = put(b1, snap({ sentAt: T0 + 1000, h: 1, goals: [goal('own', 3), goal('own', 5)] }));
    expect(taken.games[0]?.snap.goals).toHaveLength(2);
    expect(put(taken, snap({ sentAt: T0 + 99_000, h: 0 }))).toBe(taken);
    const off = { v: 1 as const, kind: 'game' as const, gameId: 'g1', team: 'E1', sentAt: T0 + 99_000 };
    expect(put(taken, { ...off, state: 'deleted', h: 0 })).toBe(taken);
    const gone = put(taken, { ...off, state: 'off', h: 1 });
    expect(gone.games).toEqual([]);
    expect(put(gone, snap({ sentAt: T0 + 200_000, h: 0 }))).toBe(gone);
    expect(put(gone, snap({ sentAt: T0 + 1, h: 2 })).games).toHaveLength(1);
  });

  it('gleiche Spiel-ID einer anderen Mannschaft ändert das Spiel nicht', () => {
    const b = put(put(emptyBoard(), snap({ sentAt: T0 + 5 })), snap({ team: 'E2', sentAt: T0 + 1 }));
    expect(b.games.map((e) => e.snap.team).sort()).toEqual(['E1', 'E2']);
  });

  it('gemerkter Stand bleibt klein (Spiele und entfernte Spiele)', () => {
    let b = emptyBoard();
    for (let i = 0; i <= MAX_GAMES; i++) b = put(b, snap({ gameId: `g${i}`, sentAt: T0 + i }));
    expect(b.games).toHaveLength(MAX_GAMES);
    expect(b.games[0]?.snap.gameId).toBe('g1');
    for (let i = 0; i <= MAX_REMOVED; i++)
      b = put(b, { v: 1, kind: 'game', state: 'deleted', h: 0, gameId: `x${i}`, team: 'E1', sentAt: T0 });
    expect(b.removed).toHaveLength(MAX_REMOVED);
    expect(b.removed[0]?.[0]).toBe('E1/x1');
  });

  it('FR-L19: die jüngste Konfiguration gilt', () => {
    const b1 = applyConfig(emptyBoard(), config(['E1'], T0));
    expect(b1.config?.teams).toEqual(['E1']);
    expect(applyConfig(b1, config(['E9'], T0 - 1))).toBe(b1);
    expect(applyConfig(b1, config(['E1', 'E2'], T0 + 1)).config?.teams).toEqual(['E1', 'E2']);
  });
});

describe('006 FR-L12 FR-L14 Karten', () => {
  it('Leerzustand: keine Karten, Mannschaften und Titel aus der Konfiguration', () => {
    const v = view(applyConfig(emptyBoard(), config(['E1', 'E2'])), T0);
    expect(v).toEqual({ title: 'Unser Spieltag', teams: ['E1', 'E2'], cards: [], today: false });
  });

  it('ohne Konfiguration gelten die Mannschaften der Meldungen (sortiert), ohne Titel', () => {
    const b = put(put(emptyBoard(), snap({ team: 'E2', gameId: 'b' })), snap({ team: 'E1', gameId: 'a' }));
    const v = view(b, T0);
    expect(v.title).toBeNull();
    expect(v.teams).toEqual(['E1', 'E2']);
    expect(v.cards.map((c) => c.key)).toEqual(['E1', 'E2']);
  });

  it('nur Mannschaften der Konfiguration; laufend (Konfigurationsreihenfolge), angelegt, beendet', () => {
    let b = applyConfig(emptyBoard(), config(['E1', 'E2', 'E3', 'E4']));
    b = put(b, snap({ team: 'E1', gameId: 'a', clock: fullTime }));
    b = put(b, snap({ team: 'E2', gameId: 'b', clock: kicked() }));
    b = put(b, snap({ team: 'E3', gameId: 'c' }));
    b = put(b, snap({ team: 'E4', gameId: 'd', clock: kicked() }));
    b = put(b, snap({ team: 'E9', gameId: 'e', clock: kicked() }));
    const v = view(b, T0 + min(60));
    expect(v.cards.map((c) => [c.key, c.group, c.live])).toEqual([
      ['E2', 'running', true],
      ['E4', 'running', true],
      ['E3', 'created', false],
      ['E1', 'finished', false],
    ]);
    expect(v.today).toBe(true);
    expect(v.cards[0]!.gameId).toBe('b');
  });

  it('US3-S1: Heim zuerst, Stand Heim:Gast, Minute "37\'"', () => {
    const goals = [goal('own', 6, { who: 'Max' }), goal('opp', 12), goal('own', 31, { who: 'Ben', penalty: true })];
    const schema = { sections: 2, sectionMinutes: 40 };
    const c = one(snap({ schema, clock: kicked(), goals, venue: 'away' }), T0 + min(36) + 30_000);
    expect(c.home).toEqual({ name: 'TSV Musterstadt', color: 'schwarz' });
    expect(c.away).toEqual({ name: 'Feuerbach E1', color: 'rot' });
    expect(c.score).toBe('1:2');
    expect(c.phase).toBe("37'");
    expect(one(snap({ clock: kicked(), goals }), T0 + min(36)).score).toBe('2:1');
  });

  it('US3-S2: Nachspielzeit "25+2\'"', () => {
    expect(one(snap({ clock: kicked() }), T0 + min(26) + 1000).phase).toBe("25+2'");
  });

  it('Phasen: noch nicht angepfiffen, Uhr angehalten, Halbzeit, Pause, Ende', () => {
    expect(one(snap(), T0).phase).toBe('noch nicht angepfiffen');
    expect(one(snap({ clock: [...kicked(), ['pause', T0 + min(3), 1]] }), T0 + min(5)).phase).toBe('Uhr angehalten');
    expect(one(snap({ clock: atHalf }), T0 + min(27)).phase).toBe('Halbzeit');
    const thirds = { sections: 3, sectionMinutes: 15 };
    expect(one(snap({ schema: thirds, clock: atHalf }), T0 + min(27)).phase).toBe('Pause');
    const end = one(snap({ clock: fullTime }), T0 + min(56));
    expect([end.phase, end.group, end.live]).toEqual(['Ende', 'finished', false]);
  });

  it('Verlängerung: Phase vor dem Anpfiff, Minute darin, Pause, "Ende n. V."', () => {
    const schema = { sections: 2, sectionMinutes: 25, extraMinutes: 5 };
    const et: Clock = [...fullTime, ['extraTime', T0 + min(56), 2]];
    expect(one(snap({ schema, clock: et }), T0 + min(57)).phase).toBe('Verlängerung');
    const s3: Clock = [...et, ['kickoff', T0 + min(58), 3]];
    expect(one(snap({ schema, clock: s3 }), T0 + min(60)).phase).toBe("53'");
    const brk: Clock = [...s3, ['sectionEnd', T0 + min(63), 3]];
    expect(one(snap({ schema, clock: brk }), T0 + min(63)).phase).toBe('Pause');
    const done: Clock = [...brk, ['kickoff', T0 + min(64), 4], ['fullTime', T0 + min(69), 4]];
    expect(one(snap({ schema, clock: done }), T0 + min(70)).phase).toBe('Ende n. V.');
  });

  it('Elfmeterschießen: läuft mit Stand Heim:Gast, danach "Ende i. E."', () => {
    const shots: ['own' | 'opp', boolean, string | null][] = [
      ['own', true, 'Max'],
      ['opp', false, null],
      ['own', true, null],
      ['opp', true, null],
    ];
    const running = one(snap({ clock: fullTime, shootout: { first: 'own', done: false, shots } }), T0 + min(58));
    expect([running.phase, running.group, running.live]).toEqual(['Elfmeterschießen', 'running', true]);
    expect(running.shootout).toBe('Elfmeterschießen 2:1');
    const away = one(snap({ venue: 'away', clock: fullTime, shootout: { first: 'own', done: true, shots } }), T0);
    expect([away.phase, away.group, away.shootout]).toEqual(['Ende i. E.', 'finished', 'Elfmeterschießen 1:2']);
    expect(one(snap({ clock: fullTime }), T0).shootout).toBeNull();
  });

  it('US3-S3: Tore neuestes zuerst mit Minute, Stand und Torschütze', () => {
    const goals = [
      goal('own', 6, { who: 'Max' }),
      goal('opp', 12),
      goal('own', 25, { stoppage: 1, who: 'Ben', penalty: true }),
      goal('opp', 27, { who: 'Nr. 9', section: 2 }),
      goal('own', 30, { ownGoal: true, section: 2 }),
      goal('own', 33, { section: 2 }),
      goal('opp', 40, { penalty: true, section: 2 }),
    ];
    const c = one(snap({ clock: kicked(), goals }), T0 + min(45));
    expect(c.goals).toEqual([
      { side: 'opp', minute: "40'", score: '4:3', who: 'TSV Musterstadt (Elfmeter)' },
      { side: 'own', minute: "33'", score: '4:2', who: 'Feuerbach E1' },
      { side: 'own', minute: "30'", score: '3:2', who: 'Eigentor' },
      { side: 'opp', minute: "27'", score: '2:2', who: 'Nr. 9 (Gegner)' },
      { side: 'own', minute: "25+1'", score: '2:1', who: 'Ben (Elfmeter)' },
      { side: 'opp', minute: "12'", score: '1:1', who: 'TSV Musterstadt' },
      { side: 'own', minute: "6'", score: '1:0', who: 'Max' },
    ]);
  });

  it('009 US3-S3 Torverlauf mit Vorlage "Max (Vorlage: Ben)"', () => {
    const goals = [goal('own', 6, { who: 'Max', assist: 'Ben' }), goal('own', 9, { who: 'Tom' })];
    const c = one(snap({ clock: kicked(), goals }), T0 + min(12));
    expect(c.goals.map((g) => g.who)).toEqual(['Tom', 'Max (Vorlage: Ben)']);
  });

  it('Details: Kürzel, Anpfiff, Halbzeitstand nur bei mehr als einem Abschnitt; beendet mit Datum und Schlusspfiff', () => {
    expect(one(snap(), T0).info).toBe('E1');
    const goals = [goal('own', 6), goal('opp', 30, { section: 2 })];
    expect(one(snap({ clock: kicked(), goals }), T0 + min(5)).info).toBe('E1 · Anpfiff 10:00 Uhr');
    expect(one(snap({ clock: atHalf, goals }), T0 + min(26)).info).toBe('E1 · Anpfiff 10:00 Uhr · Halbzeit 1:0');
    expect(one(snap({ clock: fullTime, goals, venue: 'away' }), T0 + min(56)).info).toBe(
      'E1 · Sa, 07.11.2026 · Anpfiff 10:00 Uhr · Schlusspfiff 10:55 Uhr · Halbzeit 0:1',
    );
    const single: Clock = [...kicked(), ['fullTime', T0 + min(40), 1]];
    expect(one(snap({ schema: { sections: 1, sectionMinutes: 40 }, clock: single }), T0 + min(41)).info).toBe(
      'E1 · Sa, 07.11.2026 · Anpfiff 10:00 Uhr · Schlusspfiff 10:40 Uhr',
    );
  });

  it('Anpfiff zählt erst nach dem letzten Zurücksetzen auf den ersten Abschnitt', () => {
    const undone: Clock = [
      ['kickoff', T0 - DAY, 1],
      ['reset', T0 - DAY + 1000, 1],
    ];
    const c = one(snap({ clock: undone, createdAt: T0 - min(5) }), T0);
    expect([c.phase, c.info, c.today]).toEqual(['noch nicht angepfiffen', 'E1', true]);
    const again = one(snap({ clock: [...undone, ['kickoff', T0, 1]] }), T0 + min(3));
    expect([again.phase, again.info]).toEqual(["4'", 'E1 · Anpfiff 10:00 Uhr']);
    // Zurücksetzen eines späteren Abschnitts ändert den Anpfiff nicht.
    const second: Clock = [...atHalf, ['kickoff', T0 + min(30), 2], ['reset', T0 + min(31), 2]];
    expect(one(snap({ clock: second }), T0 + min(32)).info).toBe('E1 · Anpfiff 10:00 Uhr · Halbzeit 0:0');
  });

  it('Karte kennt die Serverzeit der letzten Meldung', () => {
    const b = put(emptyBoard(), snap({ clock: kicked(), sentAt: T0 + 5000 }), T0 + 9000);
    expect(view(b, T0 + min(1)).cards[0]!.updatedAt).toBe(T0 + 9000);
  });

  it('SC-L04 R-L4: Minute und Uhrzeiten stimmen, auch wenn die Uhr des Lead-Handys falsch geht', () => {
    const skew = min(63); // Lead-Handy geht 63 Minuten vor
    const s = snap({
      sentAt: T0 + skew + min(10),
      createdAt: T0 + skew - min(5),
      clock: kicked(T0 + skew),
      schema: { sections: 2, sectionMinutes: 40 },
    });
    const c = view(put(emptyBoard(), s, T0 + min(10)), T0 + min(36) + 30_000).cards[0]!;
    expect(c.phase).toBe("37'");
    expect(c.info).toBe('E1 · Anpfiff 10:00 Uhr');
    expect(c.today).toBe(true);
  });

  it('US3-S7 FR-L15: "Letzte Meldung vor n Min" erst nach mehr als 5 Minuten und nur bei laufendem Spiel', () => {
    const b = put(emptyBoard(), snap({ clock: kicked(), sentAt: T0 + min(10) }));
    expect(view(b, T0 + min(15)).cards[0]!.staleMinutes).toBeNull();
    expect(view(b, T0 + min(17) + 5000).cards[0]!.staleMinutes).toBe(7);
    const ended = put(emptyBoard(), snap({ clock: fullTime, sentAt: T0 + min(56) }));
    expect(view(ended, T0 + min(90)).cards[0]!.staleMinutes).toBeNull();
  });
});

describe('006 FR-L14 FR-L16 Tageslogik', () => {
  const morning = snap({
    gameId: 'm',
    createdAt: T0 - min(80),
    clock: [
      ['kickoff', T0 - min(70), 1],
      ['fullTime', T0 - min(45), 1],
    ],
    goals: [goal('own', 3), goal('own', 9), goal('opp', 20)],
    schema: { sections: 1, sectionMinutes: 25 },
    sentAt: T0 - min(44),
  });

  it('US3-S9: frühere Spiele desselben Tages als "Heute außerdem"', () => {
    const b = put(put(emptyBoard(), morning), snap({ gameId: 'n', clock: kicked() }));
    const c = view(b, T0 + min(5)).cards[0]!;
    expect(c.gameId).toBe('n');
    expect(c.earlier).toBe('Heute außerdem: 2:1 gegen TSV Musterstadt');
    expect(view(put(emptyBoard(), morning), T0).cards[0]!.earlier).toBeNull();
  });

  it('FR-L14: zwei Spiele derselben Mannschaft gleichzeitig: das laufende vorn, das andere mit Phase', () => {
    const later = snap({ gameId: 'later', createdAt: T0 + min(2), venue: 'away', opp: 'SV Beispielhausen' });
    const b = put(put(emptyBoard(), snap({ gameId: 'run', clock: kicked() })), later);
    const c = view(b, T0 + min(5)).cards[0]!;
    expect(c.gameId).toBe('run');
    expect(c.earlier).toBe('Heute außerdem: 0:0 bei SV Beispielhausen (noch nicht angepfiffen)');
  });

  it('FR-L16: neues Spiel an einem anderen Tag verdrängt die alten', () => {
    const yesterday = snap({ gameId: 'y', createdAt: T0 - DAY, clock: [['kickoff', T0 - DAY, 1]], sentAt: T0 - DAY });
    const b = put(put(emptyBoard(), yesterday), snap({ gameId: 't', sentAt: T0 + 1 }));
    expect(b.games.map((e) => e.snap.gameId)).toEqual(['t']);
    // Ein später abgerufener alter Stand (Serverzeit von gestern) verdrängt das neue Spiel nicht.
    const late = put(b, { ...yesterday, sentAt: T0 - DAY + 5 });
    expect(late.games.map((e) => e.snap.gameId)).toEqual(['t']);
  });

  it('FR-L16: angepfiffenes Spiel vom Vortag erscheint wie beendet, mit Datum, ohne Minute', () => {
    const y1 = snap({
      gameId: 'y1',
      createdAt: T0 - DAY - min(90),
      clock: [
        ['kickoff', T0 - DAY - min(80), 1],
        ['fullTime', T0 - DAY - min(55), 1],
      ],
      schema: { sections: 1, sectionMinutes: 25 },
      goals: [goal('opp', 4)],
      sentAt: T0 - DAY - min(50),
    });
    const y2 = snap({
      gameId: 'y2',
      createdAt: T0 - DAY,
      clock: [['kickoff', T0 - DAY, 1]],
      sentAt: T0 - DAY + min(10),
    });
    const v = view(put(put(emptyBoard(), y1), y2), T0);
    expect(v.today).toBe(false);
    const c = v.cards[0]!;
    expect([c.gameId, c.group, c.live, c.phase, c.staleMinutes]).toEqual([
      'y2',
      'finished',
      false,
      'Ende · 06.11.',
      null,
    ]);
    expect(c.info).toBe('E1 · Fr, 06.11.2026 · Anpfiff 10:00 Uhr');
    expect(c.earlier).toBe('Außerdem am 06.11.: 0:1 gegen TSV Musterstadt');
  });

  it('nicht angepfiffenes Spiel vom Vortag bleibt "noch nicht angepfiffen" mit Datum', () => {
    const c = one(snap({ createdAt: T0 - DAY, sentAt: T0 - DAY }), T0);
    expect([c.group, c.phase]).toEqual(['created', 'noch nicht angepfiffen · 06.11.']);
  });

  it('Datumsformate', () => {
    expect(formatDay(T0, TZ)).toBe('Sa, 07.11.2026');
    expect(dayKey(T0, TZ)).toBe('2026-11-07');
    expect(dayKey(Date.UTC(2026, 10, 7, 23, 30), TZ)).toBe('2026-11-08');
    expect(formatClockTime(T0, TZ)).toBe('10:00');
    expect(formatClockTime(T0, 'UTC')).toBe('09:00');
  });
});

describe('006 FR-L16 gemerkter Stand', () => {
  it('übersteht JSON und prüft streng', () => {
    let b = applyConfig(emptyBoard(), config(['E1']));
    b = put(b, snap({ clock: kicked(), goals: [goal('own', 4, { who: 'Max' })] }));
    b = put(b, { v: 1, kind: 'game', state: 'off', h: 0, gameId: 'old', team: 'E1', sentAt: T0 });
    expect(parseBoard(JSON.parse(JSON.stringify(b)))).toEqual(b);
  });

  it('Ungültiges fällt weg', () => {
    expect(parseBoard(null)).toEqual(emptyBoard());
    expect(parseBoard({ games: 'x', removed: [] })).toEqual(emptyBoard());
    expect(parseBoard({ games: [], removed: {} })).toEqual(emptyBoard());
    const b = parseBoard({
      config: { title: '', teams: [], iat: 1 },
      games: [
        null,
        { at: 'x', snap: snap() },
        { at: 1, snap: { v: 1, kind: 'game', state: 'off', h: 0, gameId: 'g', team: 'E1', sentAt: 1 } },
        { at: 1, snap: { ...snap(), own: '' } },
        { at: 2, snap: snap() },
      ],
      removed: [['E1/a', 1], 'x', ['', 1], ['E1/b', 'y']],
    });
    expect(b.config).toBeNull();
    expect(b.games).toEqual([{ snap: snap(), at: 2 }]);
    expect(b.removed).toEqual([['E1/a', 1, 0]]);
  });

  it('gemerkte entfernte Spiele ohne Übergabezähler gelten als 0; ungültiger Zähler fällt weg', () => {
    const b = parseBoard({
      config: null,
      games: [],
      removed: [
        ['E1/a', 1],
        ['E1/b', 2, 1],
        ['E1/c', 3, 'x'],
      ],
    });
    expect(b.removed).toEqual([
      ['E1/a', 1, 0],
      ['E1/b', 2, 1],
    ]);
  });

  it('auch gemerkt höchstens die Obergrenzen', () => {
    const games = Array.from({ length: MAX_GAMES + 2 }, (_, i) => ({ at: i, snap: snap({ gameId: `g${i}` }) }));
    const removed = Array.from({ length: MAX_REMOVED + 2 }, (_, i) => [`E1/x${i}`, i]);
    const b = parseBoard({ config: null, games, removed });
    expect(b.games).toHaveLength(MAX_GAMES);
    expect(b.removed).toHaveLength(MAX_REMOVED);
    expect(b.games[0]?.at).toBe(2);
  });
});

describe('006 FR-L22 läuft das Spiel schon auf einem anderen Handy?', () => {
  const running = snap({ team: 'E2', gameId: 'fremd', clock: kicked(), sentAt: T0 + min(10) });

  it('heute, nicht beendet, letzte Meldung höchstens 30 Minuten alt, nicht von diesem Handy', () => {
    const b = put(emptyBoard(), running);
    expect(runningElsewhere(b, 'E2', [], T0 + min(12), TZ)?.snap.gameId).toBe('fremd');
    expect(runningElsewhere(b, 'E2', ['fremd'], T0 + min(12), TZ)).toBeNull();
    expect(runningElsewhere(b, 'E1', [], T0 + min(12), TZ)).toBeNull();
    expect(runningElsewhere(b, 'E2', [], T0 + min(41), TZ)).toBeNull();
    // angelegt, noch nicht angepfiffen, zählt auch
    const created = put(emptyBoard(), snap({ team: 'E2', gameId: 'neu', sentAt: T0 }));
    expect(runningElsewhere(created, 'E2', [], T0 + min(1), TZ)?.snap.gameId).toBe('neu');
  });

  it('beendete Spiele und Spiele vom Vortag zählen nicht; das jüngste gewinnt', () => {
    const ended = put(emptyBoard(), snap({ team: 'E2', gameId: 'aus', clock: fullTime, sentAt: T0 + min(56) }));
    expect(runningElsewhere(ended, 'E2', [], T0 + min(57), TZ)).toBeNull();
    const late = Date.UTC(2026, 10, 7, 22, 50);
    const yesterday = put(emptyBoard(), snap({ team: 'E2', gameId: 'y', clock: kicked(late), sentAt: late }));
    expect(runningElsewhere(yesterday, 'E2', [], late + min(15), TZ)).toBeNull();
    const two = put(
      put(emptyBoard(), running),
      snap({ team: 'E2', gameId: 'zwei', clock: kicked(), sentAt: T0 + min(11) }),
    );
    expect(runningElsewhere(two, 'E2', [], T0 + min(12), TZ)?.snap.gameId).toBe('zwei');
  });
});

describe('006 US4 andere Spiele im Spielbildschirm', () => {
  const withConfig = (...snaps: LiveGameSnapshot[]): Board =>
    snaps.reduce((b, s) => put(b, s), applyConfig(emptyBoard(), config(['E1', 'E2', 'E3'])));
  const at = T0 + min(31);

  it('Spiele der anderen Mannschaften von heute, laufende zuerst, mit Stand und Minute wie auf dem Dashboard', () => {
    const b = withConfig(
      snap({ gameId: 'eigen', clock: kicked(), sentAt: T0 + min(30) }),
      snap({ team: 'E3', gameId: 'e3', clock: fullTime, sentAt: T0 + min(56), goals: [goal('opp', 3)] }),
      snap({ team: 'E2', gameId: 'e2', clock: kicked(T0 + min(20)), sentAt: at, goals: [goal('own', 4)] }),
    );
    const others = otherGames(b, 'eigen', 'E1', at, TZ);
    expect(others.map((c) => [c.key, c.score, c.phase, c.goals.length])).toEqual([
      ['E2', '1:0', "12'", 1],
      ['E3', '0:1', 'Ende', 1],
    ]);
  });

  it('ohne Spiele früherer Tage und ohne frühere Spiele der eigenen Mannschaft', () => {
    const late = Date.UTC(2026, 10, 6, 15, 0);
    const b = withConfig(
      snap({ team: 'E2', gameId: 'gestern', clock: kicked(late), sentAt: late }),
      snap({ gameId: 'heute-frueher', clock: fullTime, sentAt: T0 + min(56) }),
    );
    // Das eigene Spiel wird nicht gesendet: die E1-Karte zeigt das frühere E1-Spiel, es zählt nicht als anderes.
    expect(otherGames(b, 'nur-hier', 'E1', T0 + min(60), TZ)).toEqual([]);
    // Mannschaft nicht im Live-Spieltag: nur das eigene Spiel fehlt.
    expect(otherGames(b, 'nur-hier', null, T0 + min(60), TZ).map((c) => c.gameId)).toEqual(['heute-frueher']);
    expect(otherGames(emptyBoard(), 'eigen', 'E1', T0, TZ)).toEqual([]);
  });
});
