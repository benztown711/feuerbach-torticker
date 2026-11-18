import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/domain/game';
import { nextGameDraft, nextPlanChoice } from '../../src/domain/next-game';
import type { Game, Team } from '../../src/domain/types';

const team = (id: string, name: string, over: Partial<Team> = {}): Team => ({
  id,
  name,
  homeColor: 'rot',
  awayColor: 'schwarz',
  lastSchema: null,
  lastSquad: [],
  lastUsedAt: 0,
  ...over,
});
const E1 = team('t1', 'Sportvg Feuerbach E1');
const E2 = team('t2', 'Sportvg Feuerbach E2');

const finished = (o: Partial<Game> = {}): Game => ({
  ...createGame(
    {
      ownTeam: E1.name,
      opponent: 'FC Probestadt',
      venue: 'away',
      schema: { sections: 1, sectionMinutes: 10, extraMinutes: 5 },
      ownColor: 'schwarz',
      oppColor: 'gelb',
    },
    { id: 'g1', now: 0 },
  ),
  status: 'finished',
  ...o,
});

describe('021 FR-W02 Vorbelegung "Nächstes Spiel" aus dem beendeten Spiel', () => {
  it('übernimmt Mannschaft, Spielzeit ohne Verlängerung, Heim/Gast, Trikots und Live', () => {
    expect(nextGameDraft(finished(), [E2, E1])).toEqual({
      teamId: 't1',
      venue: 'away',
      sections: 1,
      minutes: 10,
      ownColor: 'schwarz',
      ownTouched: false,
      oppColor: 'gelb',
      live: true,
    });
  });

  it('eigenes Trikot abweichend vom Auswärtstrikot gilt als "nur für dieses Spiel geändert"', () => {
    expect(nextGameDraft(finished({ ownColor: 'weiss' }), [E1]).ownTouched).toBe(true);
  });

  it('bei anderem Heim/Gast (Planspiel) zählt das Trikot dieser Seite', () => {
    const d = nextGameDraft(finished({ ownColor: 'schwarz' }), [E1], 'home');
    expect(d.venue).toBe('home');
    expect(d.ownColor).toBe('schwarz');
    expect(d.ownTouched).toBe(true);
    expect(nextGameDraft(finished({ ownColor: 'rot' }), [E1], 'home').ownTouched).toBe(false);
  });

  it('"Nicht live senden" bleibt aus', () => {
    expect(nextGameDraft(finished({ live: false }), [E1]).live).toBe(false);
  });

  it('Mannschaft nicht (mehr) unter "Meine Mannschaften": keine Mannschaft, Trikot bleibt wie gespielt', () => {
    const d = nextGameDraft(finished({ ownTeam: 'Sportvg Feuerbach D3' }), [E1]);
    expect(d.teamId).toBeNull();
    expect(d.ownTouched).toBe(true);
  });
});

describe('021 FR-W03 nächstes Planspiel der Mannschaft von heute', () => {
  const choice = (id: string, team: string, claim = '') => ({ entry: { id, team }, claim });

  it('wählt das früheste offene Planspiel der Mannschaft', () => {
    const today = [choice('a', 'E2'), choice('b', 'E1'), choice('c', 'E1')];
    expect(nextPlanChoice(today, 'E1')?.entry.id).toBe('b');
  });

  it('überspringt Vormerkungen anderer Trainer, nimmt eigene', () => {
    const today = [choice('a', 'E1', 'Ben'), choice('b', 'E1', 'vergeben'), choice('c', 'E1', 'du')];
    expect(nextPlanChoice(today, 'E1')?.entry.id).toBe('c');
  });

  it('ohne passendes Planspiel oder ohne Mannschaft im Live-Spieltag: keins', () => {
    expect(nextPlanChoice([choice('a', 'E2'), choice('b', 'E1', 'Tom')], 'E1')).toBeNull();
    expect(nextPlanChoice([choice('a', 'E1')], undefined)).toBeNull();
    expect(nextPlanChoice([], 'E1')).toBeNull();
  });
});
