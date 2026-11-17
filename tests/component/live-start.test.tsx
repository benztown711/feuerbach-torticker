import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGame, markSignalled } from '../../src/domain/game';
import { setLive } from '../../src/domain/live-snapshot';
import type { Game } from '../../src/domain/types';

/**
 * Spec 020 US1 (FR-E04, FR-E09): Nach dem Teilen geht das Spiel wieder live, und zwar mit dem neuesten Stand (nicht
 * mit dem Stand beim Tippen), und es wird erst gemeldet, wenn der Live-Schalter gespeichert ist.
 */

const calls: string[] = [];

vi.mock('../../src/platform/live-setup', () => ({
  addTeamToLive: vi.fn(async () => {
    calls.push('add');
  }),
  createLive: vi.fn(),
  prepareLive: vi.fn(),
  shareViewerLink: vi.fn(),
  sendGameNow: vi.fn(async (id: string) => {
    calls.push(`send:${id}`);
  }),
}));
vi.mock('../../src/platform/db', () => ({ putGame: vi.fn(), getGame: vi.fn() }));

const { afterLive } = await import('../../src/ui/components/live-start');

const T0 = Date.UTC(2026, 10, 17, 9, 0, 0);
const game = (o: Partial<Game> = {}): Game => ({
  ...createGame(
    {
      ownTeam: 'Sportvg Feuerbach E1',
      opponent: 'TSV Musterstadt',
      venue: 'home',
      schema: { sections: 2, sectionMinutes: 25 },
      ownColor: 'rot',
      oppColor: 'schwarz',
    },
    { id: 'g1', now: T0 },
  ),
  status: 'running',
  ...o,
});

describe('020 US1 nach dem Teilen live schalten und sofort melden', () => {
  afterEach(() => {
    calls.length = 0;
  });

  it('020 US1-S4 FR-E04 Live-Schalter auf dem neuesten Spielstand; zwischenzeitliche Änderungen bleiben', async () => {
    const tapped = game({ live: false });
    // Während das Teilen-Menü offen war, hat der Spielbildschirm das Spiel geändert (z. B. Signal gemerkt).
    const newer = markSignalled(tapped, ['1:25']);
    let saved: Game | null = null;
    const onGameLive = vi.fn(async (live: (g: Game) => Game) => {
      await Promise.resolve();
      saved = live(newer);
      calls.push('saved');
    });
    const hint = await afterLive({ kind: 'share', makeLive: true, team: null }, tapped, onGameLive);
    expect(hint).toBeNull();
    expect(saved).toEqual(setLive(newer, true));
  });

  it('020 US1-S6 FR-E09 das Spiel wird erst gemeldet, wenn der Live-Schalter gespeichert ist', async () => {
    const onGameLive = vi.fn(async (live: (g: Game) => Game) => {
      await new Promise((res) => setTimeout(res, 5));
      live(game({ live: false }));
      calls.push('saved');
    });
    await afterLive({ kind: 'share', makeLive: true, team: null }, game({ live: false }), onGameLive);
    expect(calls).toEqual(['saved', 'send:g1']);
  });

  it('020 US1-S9 FR-E05 ohne Live-Schalter: Mannschaft hinzufügen, dann melden; beendete Spiele nicht', async () => {
    const onGameLive = vi.fn(async () => undefined);
    const option = { key: 'E2', team: { id: 't2', name: 'Sportvg Feuerbach E2' } } as never;
    const hint = await afterLive(
      { kind: 'share', makeLive: false, team: { kind: 'add', option, label: 'E2' } },
      game(),
      onGameLive,
    );
    expect(hint).toBe('E2 ist jetzt dabei.');
    expect(onGameLive).not.toHaveBeenCalled();
    expect(calls).toEqual(['add', 'send:g1']);
    calls.length = 0;
    await afterLive({ kind: 'share', makeLive: false, team: null }, game({ status: 'finished' }), onGameLive);
    expect(calls).toEqual([]);
  });
});
