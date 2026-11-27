import { describe, expect, it } from 'vitest';
import { DEFAULT_SOUNDS } from '../../src/domain/signal-sound';
import { NO_WHISTLES, newSoundEvent, soundTallies, whistleCounts, type SoundCard } from '../../src/domain/sound-alert';
import { parentSounds } from '../../src/domain/parent-sounds';
import type { ClockEventType, Side } from '../../src/domain/types';

const NOW = 1_800_000_000_000;

const card = (gameId: string, o: { goals?: Side[]; clock?: ClockEventType[]; at?: number } = {}): SoundCard => ({
  gameId,
  // neuestes Tor zuerst (wie BoardCard.goals)
  goals: [...(o.goals ?? [])].reverse().map((side) => ({ side })),
  whistles: whistleCounts((o.clock ?? []).map((t, i) => [t, i, 1])),
  updatedAt: o.at ?? NOW - 1000,
});

const step = (before: SoundCard[], after: SoundCard[]) => newSoundEvent(soundTallies(before), after, NOW);

describe('Spec 025 FR-T07 Ton je Meldung in der Eltern-Ansicht', () => {
  it('whistleCounts zählt Anpfiffe, Pausen- und Schlusspfiffe und merkt den letzten Pfiff', () => {
    expect(whistleCounts([])).toEqual(NO_WHISTLES);
    expect(
      whistleCounts([
        ['kickoff', 1, 1],
        ['pause', 2, 1],
        ['resume', 3, 1],
        ['sectionEnd', 4, 1],
        ['kickoff', 5, 2],
        ['fullTime', 6, 2],
        ['extraTime', 7, 2],
        ['reset', 8, 3],
      ]),
    ).toEqual({ kickoff: 2, halftime: 1, fulltime: 1, last: 'fulltime' });
  });

  it('erstes Laden und neu erscheinende Spiele: kein Ton', () => {
    expect(newSoundEvent(null, [card('a', { clock: ['kickoff'] })], NOW)).toBeNull();
    expect(step([], [card('a', { clock: ['kickoff'], goals: ['own'] })])).toBeNull();
  });

  it('US3-S3 Anpfiff, Tor für uns, Gegentor, Pausenpfiff, Schlusspfiff', () => {
    const k = ['kickoff'] as ClockEventType[];
    expect(step([card('a')], [card('a', { clock: k })])).toBe('kickoff');
    expect(step([card('a', { clock: k })], [card('a', { clock: k, goals: ['own'] })])).toBe('goalOwn');
    expect(step([card('a', { clock: k, goals: ['own'] })], [card('a', { clock: k, goals: ['own', 'opp'] })])).toBe(
      'goalOpp',
    );
    expect(step([card('a', { clock: k })], [card('a', { clock: [...k, 'sectionEnd'] })])).toBe('halftime');
    expect(step([card('a', { clock: k })], [card('a', { clock: [...k, 'fullTime'] })])).toBe('fulltime');
  });

  it('US3-S4 mehrere Ereignisse in einer Meldung: nur das neueste', () => {
    // Tor und Schlusspfiff nach einer Funklücke: Schlusspfiff
    expect(
      step([card('a', { clock: ['kickoff'] })], [card('a', { clock: ['kickoff', 'fullTime'], goals: ['own'] })]),
    ).toBe('fulltime');
    // Anpfiff und Tor: Tor
    expect(step([card('a')], [card('a', { clock: ['kickoff'], goals: ['opp'] })])).toBe('goalOpp');
    // Pausenpfiff und Wiederanpfiff: Wiederanpfiff
    expect(
      step([card('a', { clock: ['kickoff'] })], [card('a', { clock: ['kickoff', 'sectionEnd', 'kickoff'] })]),
    ).toBe('kickoff');
    // Drei Pfiffe verpasst (Pause, Wiederanpfiff, Pause im 3. Drittel): der letzte Pfiff zählt
    expect(
      step(
        [card('a', { clock: ['kickoff'] })],
        [card('a', { clock: ['kickoff', 'sectionEnd', 'kickoff', 'sectionEnd'] })],
      ),
    ).toBe('halftime');
  });

  it('US3-S4 mehrere Karten: die zuletzt gemeldete zählt', () => {
    const before = [card('a', { clock: ['kickoff'] }), card('b', { clock: ['kickoff'] })];
    const after = [
      card('a', { clock: ['kickoff'], goals: ['own'], at: NOW - 3000 }),
      card('b', { clock: ['kickoff', 'fullTime'], at: NOW - 2000 }),
    ];
    expect(step(before, after)).toBe('fulltime');
    expect(step(before, [after[1]!, after[0]!])).toBe('fulltime');
  });

  it('nichts Neues, Korrektur, Entfernen oder alte Meldung (ab 1 Minute): kein Ton', () => {
    const a = card('a', { clock: ['kickoff'], goals: ['own'] });
    expect(step([a], [a])).toBeNull();
    expect(step([a], [card('a', { clock: ['kickoff'] })])).toBeNull();
    expect(step([card('a')], [card('a', { clock: ['kickoff'], at: NOW - 60_000 })])).toBeNull();
    // nur "Uhr anhalten": kein Ton
    expect(step([card('a', { clock: ['kickoff'] })], [card('a', { clock: ['kickoff', 'pause'] })])).toBeNull();
  });
});

describe('Spec 025 R-T4 Eltern-Töne auf dem Gerät', () => {
  const d = DEFAULT_SOUNDS;
  const defaults = {
    kickoff: d.kickoff,
    halftime: d.halftime,
    fulltime: d.fulltime,
    goalOwn: d.goalOwn,
    goalOpp: d.goalOpp,
  };

  it('ohne, mit kaputtem oder fremdem Inhalt gilt die Vorbelegung', () => {
    expect(parentSounds(null)).toEqual(defaults);
    expect(parentSounds('{kaputt')).toEqual(defaults);
    expect(parentSounds('"x"')).toEqual(defaults);
  });

  it('gespeicherte Wahl bleibt, unbekannte Werte werden Vorbelegung, kein Spielzeitende', () => {
    expect(parentSounds(JSON.stringify({ goalOwn: 'jubel', goalOpp: 'aus', kickoff: 'tröte' }))).toEqual({
      ...defaults,
      goalOwn: 'jubel',
      goalOpp: 'aus',
    });
    expect('timeUp' in parentSounds(null)).toBe(false);
  });
});
