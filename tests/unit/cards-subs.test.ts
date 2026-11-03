import { describe, expect, it } from 'vitest';
import {
  addCard,
  addMark,
  addSub,
  cardLabel,
  eventsShareLines,
  gameEvents,
  isMark,
  personLabel,
  removeEvent,
  replaceEvent,
  updateCard,
  updateSub,
} from '../../src/domain/events';
import { createGame, endSection, kickoff, pauseClock } from '../../src/domain/game';
import { timeline } from '../../src/domain/history';
import { withSettingsDefaults } from '../../src/domain/settings';
import { buildShareText } from '../../src/domain/share-text';
import type { CardEvent, Game, NewGameInput, Player } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const min = (n: number): number => n * 60_000;
const TZ = 'Europe/Berlin';
const base: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach U15',
  opponent: 'TSV Musterstadt',
  venue: 'home',
  schema: { sections: 2, sectionMinutes: 35 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};
const players: Player[] = [
  { id: 'p-tom', name: 'Tom', number: 3, deletedAt: null },
  { id: 'p-ben', name: 'Ben', number: 2, deletedAt: null },
  { id: 'p-leo', name: 'Leo', number: 4, deletedAt: null },
];
let n = 0;
const ids = (): string => `ev-${++n}`;
const running = (): Game => kickoff(createGame(base, { id: 'g', now: T0 - min(5) }), T0);

describe('003 FR-E03 Karten', () => {
  it('003 US3-S2 Gelb für einen eigenen Spieler mit Minute, Uhrzeit und Mannschaft', () => {
    const r = addCard(
      running(),
      { side: 'own', card: 'gelb', who: { kind: 'player', playerId: 'p-tom' } },
      T0 + min(51),
      ids,
    );
    expect(r?.event).toEqual({
      id: 'ev-1',
      kind: 'card',
      at: T0 + min(51),
      section: 1,
      minute: 35,
      stoppage: 17,
      side: 'own',
      card: 'gelb',
      who: { kind: 'player', playerId: 'p-tom' },
      comment: '',
    });
  });

  it('003 US3-S3 US3-S4 Gegner mit Freitext (getrimmt) oder ohne Spieler; Kommentar optional', () => {
    const g = running();
    const red = addCard(
      g,
      { side: 'opp', card: 'rot', who: { kind: 'text', text: '  Nr. 9 ' }, comment: ' Foul ' },
      T0 + min(33),
      ids,
    );
    expect(red?.event).toMatchObject({ who: { kind: 'text', text: 'Nr. 9' }, comment: 'Foul', minute: 34 });
    const none = addCard(g, { side: 'opp', card: 'zeit', who: { kind: 'text', text: '   ' } }, T0 + min(10), ids);
    expect(none?.event).toMatchObject({ who: null, card: 'zeit' });
  });

  it('ungültige Kombinationen werden abgelehnt; vor dem Anpfiff und nach dem Schlusspfiff keine Karten', () => {
    const g = running();
    expect(addCard(g, { side: 'own', card: 'gelb', who: { kind: 'text', text: 'Tom' } }, T0, ids)).toBeNull();
    expect(addCard(g, { side: 'opp', card: 'gelb', who: { kind: 'player', playerId: 'p-tom' } }, T0, ids)).toBeNull();
    expect(addCard(g, { side: 'opp', card: 'gelb', who: { kind: 'text', text: 'x'.repeat(31) } }, T0, ids)).toBeNull();
    expect(
      addCard(createGame(base, { id: 'c', now: T0 }), { side: 'own', card: 'rot', who: null }, T0, ids),
    ).toBeNull();
    const paused = pauseClock(g, T0 + min(5));
    expect(addCard(paused, { side: 'own', card: 'gelbrot', who: null }, T0 + min(6), ids)?.event.minute).toBe(6);
  });

  it('003 US3-S6 bearbeiten und löschen', () => {
    const r = addCard(running(), { side: 'own', card: 'gelb', who: null }, T0 + min(20), ids)!;
    const edited: CardEvent = {
      ...(r.event as CardEvent),
      card: 'gelbrot',
      who: { kind: 'player', playerId: 'p-ben' },
    };
    const g = replaceEvent(r.game, edited);
    expect(gameEvents(g)[0]).toMatchObject({ card: 'gelbrot', who: { kind: 'player', playerId: 'p-ben' } });
    expect(replaceEvent(g, { ...edited, id: 'gibtsnicht' })).toEqual(g);
    expect(gameEvents(removeEvent(g, r.event.id))).toEqual([]);
  });

  it('003 US3-S6 bearbeiten über die Eingabe: gleiche Regeln wie beim Erfassen', () => {
    const r = addCard(running(), { side: 'own', card: 'gelb', who: null }, T0 + min(20), ids)!;
    const g = updateCard(r.game, r.event.id, {
      side: 'opp',
      card: 'rot',
      who: { kind: 'text', text: 'Nr. 4' },
      comment: 'Notbremse',
    });
    expect(gameEvents(g)[0]).toMatchObject({
      id: r.event.id,
      side: 'opp',
      card: 'rot',
      who: { kind: 'text', text: 'Nr. 4' },
      comment: 'Notbremse',
      minute: 21,
    });
    expect(updateCard(g, r.event.id, { side: 'own', card: 'rot', who: { kind: 'text', text: 'x' } })).toEqual(g);
    expect(updateCard(g, 'gibtsnicht', { side: 'own', card: 'rot', who: null })).toEqual(g);
    const s = addSub(g, 'p-ben', 'p-leo', T0 + min(22), ids)!;
    expect(updateCard(s.game, s.event.id, { side: 'own', card: 'rot', who: null })).toEqual(s.game);
  });

  it('bearbeiten ohne Kommentar; nur das gewählte Ereignis ändert sich', () => {
    const a = addCard(running(), { side: 'own', card: 'gelb', who: null, comment: 'alt' }, T0 + min(1), ids)!;
    const b = addCard(a.game, { side: 'own', card: 'rot', who: null }, T0 + min(2), ids)!;
    const g = updateCard(b.game, a.event.id, { side: 'own', card: 'zeit', who: null });
    expect(gameEvents(g).map((e) => (e.kind === 'card' ? `${e.card}:${e.comment}` : ''))).toEqual(['zeit:', 'rot:']);
  });

  it('Bezeichnungen', () => {
    expect(['gelb', 'gelbrot', 'rot', 'zeit'].map((c) => cardLabel(c as CardEvent['card']))).toEqual([
      'Gelb',
      'Gelb-Rot',
      'Rot',
      'Zeitstrafe',
    ]);
    expect(personLabel({ kind: 'player', playerId: 'p-tom' }, players)).toBe('Tom');
    expect(personLabel({ kind: 'player', playerId: 'weg' }, players)).toBe('?');
    expect(personLabel({ kind: 'text', text: 'Nr. 9' }, players)).toBe('Nr. 9');
    expect(personLabel(null, players)).toBe('');
  });
});

describe('003 FR-E04 Wechsel', () => {
  it('003 US4-S2 "Leo für Ben" mit Minute; gleicher Spieler raus und rein ist ungültig', () => {
    const r = addSub(running(), 'p-ben', 'p-leo', T0 + min(29) + 30_000, ids);
    expect(r?.event).toMatchObject({ kind: 'sub', outId: 'p-ben', inId: 'p-leo', minute: 30 });
    expect(addSub(running(), 'p-ben', 'p-ben', T0, ids)).toBeNull();
    let done = kickoff(endSection(running(), T0 + min(35)), T0 + min(45));
    done = endSection(done, T0 + min(80));
    expect(addSub(done, 'p-ben', 'p-leo', T0 + min(81), ids)).toBeNull();
  });
});

describe('003 FR-E04 Wechsel bearbeiten', () => {
  it('raus/rein ändern; gleicher Spieler, unbekannte ID oder Karte bleiben unverändert', () => {
    const r = addSub(running(), 'p-ben', 'p-leo', T0 + min(10), ids)!;
    const g = updateSub(r.game, r.event.id, 'p-tom', 'p-ben');
    expect(gameEvents(g)[0]).toMatchObject({ outId: 'p-tom', inId: 'p-ben', minute: 11 });
    expect(updateSub(g, r.event.id, 'p-tom', 'p-tom')).toEqual(g);
    expect(updateSub(g, 'gibtsnicht', 'p-tom', 'p-leo')).toEqual(g);
    const c = addCard(g, { side: 'own', card: 'gelb', who: null }, T0 + min(12), ids)!;
    expect(updateSub(c.game, c.event.id, 'p-tom', 'p-leo')).toEqual(c.game);
  });
});

describe('003 FR-E07 Teilen-Text und Zeitleiste', () => {
  it('003 US3-S5 US4-S4 Zeilen "Karten:" und "Wechsel:" in zeitlicher Reihenfolge; Lesezeichen nie', () => {
    let g = running();
    g = addCard(g, { side: 'own', card: 'gelb', who: { kind: 'player', playerId: 'p-tom' } }, T0 + min(51), ids)!.game;
    g = addCard(g, { side: 'opp', card: 'rot', who: { kind: 'text', text: 'Nr. 9' } }, T0 + min(33), ids)!.game;
    g = addCard(g, { side: 'opp', card: 'gelb', who: null }, T0 + min(40), ids)!.game;
    g = addCard(g, { side: 'own', card: 'zeit', who: null }, T0 + min(41), ids)!.game;
    g = addSub(g, 'p-ben', 'p-leo', T0 + min(29) + 30_000, ids)!.game;
    g = addMark(g, T0 + min(2), ids)!.game;
    expect(eventsShareLines(g, players)).toEqual([
      "Karten: 34' Rot Nr. 9 (TSV Musterstadt), 35+6' Gelb (TSV Musterstadt), 35+7' Zeitstrafe (Feuerbach U15), 35+17' Gelb Tom",
      "Wechsel: 30' Leo für Ben",
    ]);
    const text = buildShareText(g, players, TZ);
    expect(text.split('\n').slice(-2)).toEqual(eventsShareLines(g, players));
    expect(text).not.toContain('Lesezeichen');
    expect(eventsShareLines(running(), players)).toEqual([]);
    const kinds = timeline(g).map((i) => i.kind);
    expect(kinds.filter((k) => k === 'ev')).toHaveLength(6);
    expect(gameEvents(g).filter(isMark)).toHaveLength(1);
  });

  it('Wechsel mit gelöschtem Spieler bleibt lesbar', () => {
    const g = addSub(running(), 'weg-1', 'p-leo', T0 + min(5), ids)!.game;
    expect(eventsShareLines(g, players)).toEqual(["Wechsel: 6' Leo für ?"]);
  });
});

describe('003 FR-E02 Schalter Karten und Wechsel', () => {
  it('ältere Einstellungen mit nur "Lesezeichen" bekommen die weiteren Schalter (aus)', () => {
    const s = withSettingsDefaults({ features: { marks: true } as never });
    expect(s.features).toEqual({ cards: false, subs: false, marks: true });
  });
});
