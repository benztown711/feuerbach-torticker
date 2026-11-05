import { describe, expect, it } from 'vitest';
import { createGame, endSection, kickoff, pauseClock } from '../../src/domain/game';
import {
  DOUBLE_TAP_MS,
  addGoal,
  goalRows,
  homeAway,
  refreshScores,
  removeGoal,
  restoreGoal,
  score,
  undoGoal,
} from '../../src/domain/goals';
import type { NewGameInput } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const sec = (n: number): number => n * 1000;
const min = (n: number): number => n * 60_000;
const input: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach E1',
  opponent: 'TSV Musterstadt',
  venue: 'home',
  schema: { sections: 2, sectionMinutes: 25 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};
let n = 0;
const ids = () => `goal-${++n}`;
const running = () => kickoff(createGame(input, { id: 'g', now: T0 }), T0);

describe('T044 FR-004 FR-008 FR-021 Tore', () => {
  it('US1-S2 addGoal speichert Seite, Uhrzeit, Abschnitt und Minute aus der Uhr', () => {
    const r = addGoal(running(), 'own', T0 + sec(372), ids);
    expect(r.added).toBe(true);
    expect(r.goal).toMatchObject({
      side: 'own',
      at: T0 + sec(372),
      section: 1,
      minute: 7,
      stoppage: null,
      scorer: null,
      deletedAt: null,
    });
    expect(score(r.game)).toEqual({ own: 1, opp: 0 });
  });

  it('US2-S4 Tor in der Nachspielzeit bekommt stoppage', () => {
    const r = addGoal(running(), 'opp', T0 + min(25) + sec(40), ids);
    expect(r.goal).toMatchObject({ minute: 25, stoppage: 1 });
  });

  it('FR-021 Tore nur bei laufender Uhr: nicht vor Anpfiff, nicht bei angehaltener Uhr, nicht in der Pause oder nach Schlusspfiff', () => {
    const created = createGame(input, { id: 'g', now: T0 });
    expect(addGoal(created, 'own', T0)).toMatchObject({ added: false, reason: 'locked' });
    const paused = pauseClock(running(), T0 + min(1));
    expect(addGoal(paused, 'own', T0 + min(2), ids)).toMatchObject({ added: false, reason: 'locked' });
    const brk = endSection(running(), T0 + min(25));
    expect(addGoal(brk, 'own', T0 + min(26)).reason).toBe('locked');
  });

  it('Doppeltipp-Schutz: zweiter Tap derselben Seite innerhalb 1,5 s wird ignoriert', () => {
    const first = addGoal(running(), 'own', T0 + min(1), ids).game;
    expect(addGoal(first, 'own', T0 + min(1) + DOUBLE_TAP_MS - 1)).toMatchObject({ added: false, reason: 'double' });
    expect(addGoal(first, 'opp', T0 + min(1) + 100, ids).added).toBe(true);
    expect(addGoal(first, 'own', T0 + min(1) + DOUBLE_TAP_MS, ids).added).toBe(true);
  });

  it('Doppeltipp-Schutz ignoriert entfernte Tore', () => {
    const r = addGoal(running(), 'own', T0 + min(1), ids);
    const removed = removeGoal(r.game, r.goal!.id, T0 + min(1) + 100);
    expect(addGoal(removed, 'own', T0 + min(1) + 200, ids).added).toBe(true);
  });

  it('US1-S4 undoGoal entfernt das Tor vollständig', () => {
    const r = addGoal(running(), 'own', T0 + min(1), ids);
    const g = undoGoal(r.game, r.goal!.id);
    expect(g.goals).toEqual([]);
    expect(score(g)).toEqual({ own: 0, opp: 0 });
  });

  it('US1-S5/S6 removeGoal und restoreGoal', () => {
    const r = addGoal(running(), 'own', T0 + min(1), ids);
    const removed = removeGoal(r.game, r.goal!.id, T0 + min(9));
    expect(removed.goals[0]?.deletedAt).toBe(T0 + min(9));
    expect(score(removed)).toEqual({ own: 0, opp: 0 });
    const restored = restoreGoal(removed, r.goal!.id);
    expect(restored.goals[0]?.deletedAt).toBeNull();
    expect(restored.goals[0]?.minute).toBe(2);
    expect(score(restored)).toEqual({ own: 1, opp: 0 });
  });

  it('homeAway bildet own/opp je nach Heim/Auswärts ab', () => {
    expect(homeAway('home', { own: 2, opp: 1 })).toEqual({ home: 2, away: 1 });
    expect(homeAway('away', { own: 2, opp: 1 })).toEqual({ home: 1, away: 2 });
  });

  it('FR-034 goalRows: neuestes oben, laufender Stand aus Heimsicht, entfernte ohne Stand', () => {
    let g = running();
    g = addGoal(g, 'own', T0 + min(6), ids).game;
    g = addGoal(g, 'opp', T0 + min(10), ids).game;
    const third = addGoal(g, 'own', T0 + min(20), ids);
    g = removeGoal(third.game, third.goal!.id, T0 + min(21));
    g = addGoal(g, 'own', T0 + min(22), ids).game;
    const rows = goalRows(g);
    expect(rows.map((r) => [r.label, r.score, r.removed])).toEqual([
      ["23'", '2:1', false],
      ["21'", '', true],
      ["11'", '1:1', false],
      ["7'", '1:0', false],
    ]);
    expect(goalRows({ ...g, venue: 'away' })[0]?.score).toBe('1:2');
  });

  it('goalRows schreibt Nachspielminuten', () => {
    const g = addGoal(running(), 'own', T0 + min(26), ids).game;
    expect(goalRows(g)[0]?.label).toBe("25+2'");
  });
});

describe('012 FR-S14 Halbzeit- und Endstand folgen den Toren', () => {
  /** 2 × 25: Tor Feuerbach in 10' (Halbzeit 1:0), Gegentor in 30', Schlusspfiff (Endstand 1:1). */
  const played = () => {
    let g = addGoal(running(), 'own', T0 + min(9) + sec(30), ids).game;
    g = kickoff(endSection(g, T0 + min(25)), T0 + min(30));
    g = addGoal(g, 'opp', T0 + min(34) + sec(30), ids).game;
    return endSection(g, T0 + min(55));
  };

  it('refreshScores berechnet gesetzte Stände aus den Toren neu, nicht gesetzte bleiben leer', () => {
    const g = played();
    const [first] = g.goals;
    const wrong = { ...g, halfTimeScore: { own: 5, opp: 5 }, finalScore: { own: 7, opp: 7 } };
    expect(refreshScores(wrong)).toMatchObject({ halfTimeScore: { own: 1, opp: 0 }, finalScore: { own: 1, opp: 1 } });
    const open = refreshScores({ ...g, halfTimeScore: null, finalScore: null });
    expect(open.halfTimeScore).toBeNull();
    expect(open.finalScore).toBeNull();
    const removed = { ...g, goals: g.goals.map((x) => (x === first ? { ...x, deletedAt: T0 + min(56) } : x)) };
    expect(refreshScores(removed)).toMatchObject({ halfTimeScore: { own: 0, opp: 0 }, finalScore: { own: 0, opp: 1 } });
  });

  it('012 US2-S8 Tor der 1. Halbzeit in der 2. Halbzeit entfernen oder wiederherstellen: Halbzeitstand folgt', () => {
    let g = addGoal(running(), 'own', T0 + min(9) + sec(30), ids).game;
    g = kickoff(endSection(g, T0 + min(25)), T0 + min(30));
    const id = g.goals[0]!.id;
    const removed = removeGoal(g, id, T0 + min(31));
    expect(removed.halfTimeScore).toEqual({ own: 0, opp: 0 });
    expect(removed.finalScore).toBeNull();
    expect(restoreGoal(removed, id).halfTimeScore).toEqual({ own: 1, opp: 0 });
  });

  it('nach dem Schlusspfiff folgt der Endstand', () => {
    const g = played();
    const id = g.goals[1]!.id;
    const removed = removeGoal(g, id, T0 + min(56));
    expect(removed.finalScore).toEqual({ own: 1, opp: 0 });
    expect(restoreGoal(removed, id).finalScore).toEqual({ own: 1, opp: 1 });
  });

  it('Rückgängig kurz nach dem Pausenpfiff: Halbzeitstand folgt', () => {
    const r = addGoal(running(), 'own', T0 + min(24) + sec(59), ids);
    const g = endSection(r.game, T0 + min(25) + sec(1));
    expect(g.halfTimeScore).toEqual({ own: 1, opp: 0 });
    expect(undoGoal(g, r.goal!.id).halfTimeScore).toEqual({ own: 0, opp: 0 });
  });
});
