import { describe, expect, it } from 'vitest';
import { canUndoWhistle, minuteOptions, setGoalMinute } from '../../src/domain/corrections';
import { clockOf, createGame, endSection, kickoff } from '../../src/domain/game';
import { goalRows, score } from '../../src/domain/goals';
import {
  ENTRY_BREAK_MS,
  MAX_PRE_GOALS,
  canJoin,
  entryChoices,
  entryMinute,
  joinGame,
} from '../../src/domain/late-start';
import type { Game, NewGameInput, Schema } from '../../src/domain/types';

/** 25.11.2026, 11:00 Uhr in Stuttgart. */
const NOW = Date.UTC(2026, 10, 25, 10, 0, 0);
const min = (n: number): number => n * 60_000;
const three15: Schema = { sections: 3, sectionMinutes: 15 };
const two25: Schema = { sections: 2, sectionMinutes: 25 };
const input = (schema: Schema): NewGameInput => ({
  ownTeam: 'Sportvg Feuerbach E1',
  opponent: 'TSV Musterstadt',
  venue: 'home',
  schema,
  ownColor: 'rot',
  oppColor: 'schwarz',
});
let n = 0;
const ids = (): string => `pre-${++n}`;
const fresh = (schema: Schema = three15): Game => createGame(input(schema), { id: 'g', now: NOW - min(2) });

describe('023 FR-J03 Auswahl im Blatt "Spiel läuft schon"', () => {
  it('Drittel: Abschnitte und nummerierte Pausen dazwischen', () => {
    expect(entryChoices(three15).map((c) => [c.key, c.label, c.section, c.pause])).toEqual([
      ['s1', '1. Drittel', 1, false],
      ['p1', '1. Pause', 1, true],
      ['s2', '2. Drittel', 2, false],
      ['p2', '2. Pause', 2, true],
      ['s3', '3. Drittel', 3, false],
    ]);
  });

  it('Halbzeiten: "Halbzeit" als Pause; ein Abschnitt ohne Pause; Verlängerung kein Einstiegspunkt', () => {
    expect(entryChoices({ ...two25, extraMinutes: 10 }).map((c) => c.label)).toEqual([
      '1. Halbzeit',
      'Halbzeit',
      '2. Halbzeit',
    ]);
    expect(entryChoices({ sections: 1, sectionMinutes: 40 }).map((c) => c.label)).toEqual(['Spielzeit']);
  });

  it('Spielminute zur Restzeit: "= 39. Minute" bei noch 7 Min im 3. Drittel', () => {
    expect(entryMinute(three15, 3, 7)).toBe(39);
    expect(entryMinute(three15, 3, 15)).toBe(31);
    expect(entryMinute(three15, 1, 0)).toBe(15);
  });
});

describe('023 FR-J04 Einstieg rechnet den Verlauf zurück', () => {
  it("023 US1-S3 3. Drittel, noch 7 Min: Uhr läuft mit 07:00 Restzeit in 39'", () => {
    const g = joinGame(fresh(), { section: 3, pause: false, rest: 7, own: 0, opp: 0 }, NOW, ids);
    const kick3 = NOW - min(8);
    const end2 = kick3 - ENTRY_BREAK_MS;
    const end1 = end2 - min(15) - ENTRY_BREAK_MS;
    expect(g.clockEvents).toEqual([
      { type: 'kickoff', at: end1 - min(15), section: 1, entry: true },
      { type: 'sectionEnd', at: end1, section: 1, entry: true },
      { type: 'kickoff', at: end2 - min(15), section: 2, entry: true },
      { type: 'sectionEnd', at: end2, section: 2, entry: true },
      { type: 'kickoff', at: kick3, section: 3, entry: true },
    ]);
    expect(g.status).toBe('running');
    expect(clockOf(g, NOW)).toMatchObject({ section: 3, remainingMs: min(7), label: "39'" });
    expect(g.goals).toEqual([]);
    expect(g.halfTimeScore).toBeNull();
    // Später kommt der Pfiff wie gewohnt.
    expect(clockOf(g, NOW + min(7)).dueThresholds).toEqual(['3:0']);
  });

  it('023 US1-S4 Restzeit voll bzw. 0 an den Grenzen', () => {
    const full = joinGame(fresh(), { section: 1, pause: false, rest: 15, own: 0, opp: 0 }, NOW, ids);
    expect(full.clockEvents).toEqual([{ type: 'kickoff', at: NOW, section: 1, entry: true }]);
    const zero = joinGame(fresh(), { section: 1, pause: false, rest: 0, own: 0, opp: 0 }, NOW, ids);
    expect(clockOf(zero, NOW)).toMatchObject({ remainingMs: 0, dueThresholds: ['1:0'] });
  });

  it('023 US1-S5 Einstieg in der Pause: kein Uhrlauf, nächster Anpfiff ist der nächste Abschnitt', () => {
    const g = joinGame(fresh(two25), { section: 1, pause: true, rest: 3, own: 2, opp: 1 }, NOW, ids);
    expect(g.clockEvents).toEqual([
      { type: 'kickoff', at: NOW - min(25), section: 1, entry: true },
      { type: 'sectionEnd', at: NOW, section: 1, entry: true },
    ]);
    expect(g.status).toBe('break');
    expect(clockOf(g, NOW).kickoffSection).toBe(2);
    // 023 US2-S6: Einstieg in der Halbzeitpause, Halbzeitstand bekannt.
    expect(g.halfTimeScore).toEqual({ own: 2, opp: 1 });
    // R-J5: den Einstiegs-Pfiff nimmt man über "Rückgängig" zurück, nicht über "Pfiff zurücknehmen".
    expect(canUndoWhistle(g, NOW + min(1))).toBe(false);
    const next = kickoff(g, NOW + min(5));
    expect(clockOf(next, NOW + min(5) + 30_000)).toMatchObject({ section: 2, label: "26'" });
  });

  it('023 US1-S9 nur vor dem ersten Anpfiff; ungültige Eingaben ändern nichts', () => {
    const started = kickoff(fresh(), NOW - min(1));
    expect(canJoin(fresh())).toBe(true);
    expect(canJoin(started)).toBe(false);
    const ok = { section: 1, pause: false, rest: 10, own: 0, opp: 0 };
    expect(joinGame(started, ok, NOW, ids)).toBe(started);
    const g = fresh();
    for (const bad of [
      { ...ok, section: 0 },
      { ...ok, section: 4 },
      { ...ok, section: 3, pause: true },
      { ...ok, rest: -1 },
      { ...ok, rest: 16 },
      { ...ok, rest: 2.5 },
      { ...ok, own: -1 },
      { ...ok, opp: MAX_PRE_GOALS + 1 },
    ])
      expect(joinGame(g, bad, NOW, ids)).toBe(g);
    // In der Pause zählt die Restzeit nicht.
    expect(joinGame(g, { ...ok, pause: true, rest: 99 }, NOW, ids)).not.toBe(g);
  });
});

describe('023 FR-J10 bis FR-J14 Tore vor Tickerbeginn', () => {
  it('023 US2-S2 S3 7:4: zuerst die Feuerbach-Tore, dann die Gegentore, alle am Spielbeginn', () => {
    const g = joinGame(fresh(), { section: 3, pause: false, rest: 7, own: 7, opp: 4 }, NOW, ids);
    const first = g.clockEvents[0]!.at;
    expect(score(g)).toEqual({ own: 7, opp: 4 });
    expect(g.goals.map((x) => x.side)).toEqual([...Array(7).fill('own'), ...Array(4).fill('opp')]);
    expect(g.goals[0]).toEqual({
      id: g.goals[0]!.id,
      side: 'own',
      at: first,
      section: 1,
      minute: 1,
      stoppage: null,
      scorer: null,
      deletedAt: null,
      beforeTicker: true,
    });
    // Torliste: neuestes oben, also die Tore vor Tickerbeginn unten mit "–" und laufendem Stand.
    const rows = goalRows(g);
    expect(rows.at(-1)).toMatchObject({ label: '–', score: '1:0', beforeTicker: true });
    expect(rows[0]).toMatchObject({ label: '–', score: '7:4' });
    // 023 US2-S6: Einstieg ab dem 2. Abschnitt, Halbzeitstand bleibt leer.
    expect(g.halfTimeScore).toBeNull();
  });

  it('023 US2-S6 Einstieg in der 1. Halbzeit: Halbzeitstand mit dem Pausenpfiff inklusive Toren vor Tickerbeginn', () => {
    const g = joinGame(fresh(two25), { section: 1, pause: false, rest: 10, own: 2, opp: 1 }, NOW, ids);
    expect(g.halfTimeScore).toBeNull();
    expect(endSection(g, NOW + min(10)).halfTimeScore).toEqual({ own: 2, opp: 1 });
  });

  it('023 US2-S5 "Minute ändern" macht ein Tor vor Tickerbeginn zum normalen Tor', () => {
    const g = joinGame(fresh(two25), { section: 2, pause: false, rest: 10, own: 1, opp: 1 }, NOW, ids);
    const opp = g.goals[1]!;
    const option = minuteOptions(g, NOW).find((o) => o.label === "12'")!;
    const s = setGoalMinute(g, opp.id, option, NOW);
    const moved = s.goals.find((x) => x.id === opp.id)!;
    expect(moved).not.toHaveProperty('beforeTicker');
    expect(moved).toMatchObject({ minute: 12, section: 1 });
    // Tore vor Tickerbeginn bleiben vorn, das verschobene steht an seiner Stelle.
    expect(goalRows(s).map((r) => r.label)).toEqual(["12'", '–']);
  });

  it('ohne eigene Kennungen: zufällige IDs', () => {
    const g = joinGame(fresh(), { section: 1, pause: false, rest: 5, own: 1, opp: 0 }, NOW);
    expect(g.goals[0]!.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('023 US2-S7 Spielstand 0:0 legt keine Tore an', () => {
    expect(joinGame(fresh(), { section: 2, pause: false, rest: 5, own: 0, opp: 0 }, NOW, ids).goals).toEqual([]);
  });
});
