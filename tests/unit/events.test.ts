import { describe, expect, it } from 'vitest';
import { addMark, gameEvents, marksText, MARK_COMMENT_MAX, removeEvent, setMarkComment } from '../../src/domain/events';
import { createGame, endSection, kickoff, pauseClock } from '../../src/domain/game';
import { addGoal, goalSuffix, setPenalty, setScorer } from '../../src/domain/goals';
import { timeline } from '../../src/domain/history';
import { anyEventFeature, defaultSettings, withSettingsDefaults } from '../../src/domain/settings';
import { buildShareText } from '../../src/domain/share-text';
import type { Game, NewGameInput } from '../../src/domain/types';

/** 07.11.2026, 10:30 Uhr in Stuttgart. */
const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const sec = (n: number): number => n * 1000;
const min = (n: number): number => n * 60_000;
const TZ = 'Europe/Berlin';
const base: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach U11',
  opponent: 'TSV Musterstadt',
  venue: 'home',
  schema: { sections: 2, sectionMinutes: 25 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};
let n = 0;
const ids = (): string => `id-${++n}`;
const running = (): Game => kickoff(createGame(base, { id: 'g', now: T0 - min(5) }), T0);

describe('003 FR-E05 Lesezeichen', () => {
  it('003 US2-S2 setzt sofort ein Lesezeichen mit Minute, Abschnitt und Uhrzeit', () => {
    const r = addMark(running(), T0 + min(6) + sec(12), ids);
    expect(r).not.toBeNull();
    expect(r?.event).toEqual({
      id: 'id-1',
      kind: 'mark',
      at: T0 + min(6) + sec(12),
      section: 1,
      minute: 7,
      stoppage: null,
      comment: '',
    });
    expect(gameEvents(r!.game)).toHaveLength(1);
  });

  it('in der Nachspielzeit, bei angehaltener Uhr und in der Halbzeitpause erlaubt; vorher und nachher nicht', () => {
    expect(addMark(running(), T0 + min(26), ids)?.event).toMatchObject({ minute: 25, stoppage: 2 });
    const paused = pauseClock(running(), T0 + min(10) + sec(30));
    expect(addMark(paused, T0 + min(12), ids)?.event).toMatchObject({ minute: 11, at: T0 + min(12) });
    const brk = endSection(running(), T0 + min(25));
    expect(addMark(brk, T0 + min(28), ids)?.event).toMatchObject({ section: 1, minute: 25 });
    expect(addMark(createGame(base, { id: 'c', now: T0 }), T0, ids)).toBeNull();
    let done = kickoff(endSection(running(), T0 + min(25)), T0 + min(30));
    done = endSection(done, T0 + min(55));
    expect(done.status).toBe('finished');
    expect(addMark(done, T0 + min(56), ids)).toBeNull();
  });

  it('003 US2-S3 Kommentar setzen (getrimmt, höchstens 60 Zeichen), US2-S6 löschen', () => {
    const r = addMark(running(), T0 + min(3), ids)!;
    let g = setMarkComment(r.game, r.event.id, '  Konter links  ');
    expect(gameEvents(g)[0]?.comment).toBe('Konter links');
    g = setMarkComment(g, r.event.id, 'x'.repeat(80));
    expect(gameEvents(g)[0]?.comment).toHaveLength(MARK_COMMENT_MAX);
    expect(setMarkComment(g, 'gibtsnicht', 'a')).toEqual(g);
    expect(gameEvents(removeEvent(g, r.event.id))).toEqual([]);
  });

  it('mehrere Lesezeichen: Kommentar trifft nur das gewählte; IDs ohne Vorgabe zufällig', () => {
    const a = addMark(running(), T0 + min(1))!;
    const b = addMark(a.game, T0 + min(2))!;
    expect(a.event.id).not.toBe(b.event.id);
    const g = setMarkComment(b.game, b.event.id, 'Abwehr');
    expect(gameEvents(g).map((e) => e.comment)).toEqual(['', 'Abwehr']);
  });

  it('Auswärtsspiel: Gegner zuerst; gleiche Uhrzeit: Uhr-Ereignis, Tor, Lesezeichen', () => {
    const away = kickoff(createGame({ ...base, venue: 'away' }, { id: 'a', now: T0 }), T0);
    const g = addMark(away, T0 + min(1), ids)!.game;
    expect(marksText(g, TZ).split('\n')[0]).toBe('Lesezeichen TSV Musterstadt - Feuerbach U11, 07.11.2026');
    const withGoal = addGoal(g, 'own', T0 + min(1), ids).game;
    expect(timeline(withGoal).map((i) => i.kind)).toEqual(['event', 'goal', 'mark']);
    const sameAsKickoff = addMark(away, T0, ids)!.game;
    expect(timeline(sameAsKickoff).map((i) => i.kind)).toEqual(['event', 'mark']);
  });

  it('ältere Spiele ohne Ereignisse liefern eine leere Liste', () => {
    const old = { ...running() } as Partial<Game>;
    delete old.events;
    expect(gameEvents(old as Game)).toEqual([]);
  });

  it('003 US2-S5 Lesezeichen kopieren: Kopfzeile und eine Zeile je Lesezeichen in zeitlicher Reihenfolge', () => {
    let g = running();
    const a = addMark(g, T0 + min(32) + sec(10), ids)!;
    g = setMarkComment(a.game, a.event.id, 'Torchance');
    g = addMark(g, T0 + min(6) + sec(30), ids)!.game;
    expect(marksText(g, TZ)).toBe(
      "Lesezeichen Feuerbach U11 - TSV Musterstadt, 07.11.2026\n7' · 10:36:30\n25+8' · 11:02:10 · Torchance",
    );
    expect(marksText(running(), TZ)).toBe('');
    expect(marksText(g)).toMatch(/^Lesezeichen Feuerbach U11 - TSV Musterstadt, \d\d\.\d\d\.2026\n/);
  });

  it('003 US2-S4 Lesezeichen stehen nie im geteilten Text, aber in der Zeitleiste', () => {
    const g = addMark(running(), T0 + min(6), ids)!.game;
    expect(buildShareText(g, [], TZ)).not.toContain('Lesezeichen');
    expect(buildShareText(g, [], TZ).split('\n')).toHaveLength(2);
    const items = timeline(g);
    expect(items.map((i) => i.kind)).toEqual(['event', 'mark']);
  });
});

describe('003 FR-E01 Elfmeter-Kennzeichen', () => {
  const withGoal = (side: 'own' | 'opp'): [Game, string] => {
    const r = addGoal(running(), side, T0 + min(30), ids);
    return [r.game, r.goal!.id];
  };

  it('003 US1-S1 eigenes Tor als Elfmeter: Zusatz in Liste und Teilen-Text', () => {
    const [g0, id] = withGoal('own');
    const g = setPenalty(g0, id, true);
    expect(g.goals[0]?.penalty).toBe(true);
    expect(goalSuffix(g.goals[0]!)).toBe(' (Elfmeter)');
    expect(buildShareText(g, [], TZ).split('\n')[2]).toBe("25+6' 1:0 (Elfmeter)");
  });

  it('003 US1-S2 auch beim Gegentor, mit Freitext-Torschütze', () => {
    const [g0, id] = withGoal('opp');
    let g = setScorer(g0, id, { kind: 'text', text: 'Nr. 9' });
    g = setPenalty(g, id, true);
    expect(buildShareText(g, [], TZ).split('\n')[2]).toBe("25+6' 0:1 Nr. 9 (Elfmeter)");
  });

  it('003 US1-S3 abwählen; Elfmeter und Eigentor schließen sich aus', () => {
    const [g0, id] = withGoal('own');
    let g = setScorer(g0, id, { kind: 'ownGoal' });
    g = setPenalty(g, id, true);
    expect(g.goals[0]).toMatchObject({ penalty: true, scorer: null });
    g = setScorer(g, id, { kind: 'ownGoal' });
    expect(g.goals[0]).toMatchObject({ penalty: false, scorer: { kind: 'ownGoal' } });
    g = setPenalty(g, id, true);
    g = setPenalty(g, id, false);
    expect(goalSuffix(g.goals[0]!)).toBe('');
    expect(setPenalty(g, 'gibtsnicht', true)).toEqual(g);
  });
});

describe('003 FR-E02 Schalter "Im Spiel erfassen"', () => {
  it('Standard aus; ältere Einstellungen bekommen die Schalter', () => {
    expect(defaultSettings().features).toEqual({ cards: false, subs: false, marks: false });
    expect(anyEventFeature(defaultSettings())).toBe(false);
    const s = withSettingsDefaults({ features: { cards: false, subs: false, marks: true } });
    expect(anyEventFeature(s)).toBe(true);
    expect(withSettingsDefaults({ theme: 'dark' }).features.marks).toBe(false);
  });
});
