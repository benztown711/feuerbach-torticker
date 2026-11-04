import { describe, expect, it, vi } from 'vitest';
import type { LiveGameSnapshot } from '../../src/domain/live-snapshot';
import type { Game, LiveSpieltag } from '../../src/domain/types';
import type { OpenedMessage } from '../../src/platform/live-crypto';
import type { SubscribeOptions } from '../../src/platform/relay';
import { watchGame, watchSpieltag } from '../../src/platform/live-watch';

const T0 = Date.UTC(2026, 10, 7, 9, 0, 0);
const live = {
  v: 1,
  topic: 'abcdefghijklmnopqrstuv',
  viewKey: 'k',
  orgPub: 'o',
  config: { d: JSON.stringify({ title: 'Unser Spieltag', teams: ['E1', 'E2'], iat: T0 }), s: 's' },
  teams: [],
  createdAt: T0,
} as LiveSpieltag;

const snap = (p: Partial<LiveGameSnapshot> = {}): LiveGameSnapshot => ({
  v: 1,
  kind: 'game',
  state: 'live',
  gameId: 'fremd',
  team: 'E2',
  sentAt: T0 + 60_000,
  h: 0,
  createdAt: T0 - 60_000,
  own: 'Feuerbach E2',
  opp: 'TSV Musterstadt',
  venue: 'home',
  ownColor: 'rot',
  oppColor: 'schwarz',
  schema: { sections: 2, sectionMinutes: 25 },
  clock: [['kickoff', T0, 1]],
  goals: [{ side: 'own', minute: 1, stoppage: null, section: 1, who: null, penalty: false, ownGoal: false }],
  shootout: null,
  drawSettled: false,
  ...p,
});

/** Fake-Verbindung: Meldungstext ist der Live-Stand als JSON. */
function fakeDeps() {
  let opts: SubscribeOptions | null = null;
  const stop = vi.fn();
  return {
    stop,
    send: async (s: LiveGameSnapshot, time = (T0 + 60_000) / 1000) => {
      opts?.onMessage({ id: String(Math.random()), time, message: JSON.stringify(s) });
      await new Promise((r) => setTimeout(r, 0));
    },
    deps: {
      now: () => T0 + 2 * 60_000,
      storage: null,
      subscribe: (_t: string, o: SubscribeOptions) => {
        opts = o;
        return stop;
      },
      open: async (_v: unknown, text: string): Promise<OpenedMessage> => ({
        content: JSON.parse(text) as unknown,
        cert: null,
        config: null,
      }),
    },
  };
}

describe('006 US6 Mithören', () => {
  it('FR-L22 FR-L23 erkennt ein laufendes Spiel eines anderen Handys und übernimmt es', async () => {
    const f = fakeDeps();
    const w = watchSpieltag(live, f.deps);
    expect(w.running('E2', [])).toBeNull();
    await f.send(snap());
    const r = w.running('E2', []);
    expect(r?.summary).toBe("Feuerbach E2 1:0 TSV Musterstadt · 3'");
    expect(w.running('E2', ['fremd'])).toBeNull();
    const g = w.takeover(r!.entry, 'Sportvg Feuerbach E2', [], () => 'id');
    expect([g.id, g.liveTakeover, g.goals.length]).toEqual(['fremd', 1, 1]);
    w.stop();
    expect(f.stop).toHaveBeenCalled();
  });

  it('FR-L24 meldet die Übernahme einmal je Übergabestand, nur wenn dieses Handy sendet, und hört beim Beenden auf', async () => {
    const f = fakeDeps();
    let game: Game | null = null;
    let team: string | null = 'E2';
    const taken = vi.fn();
    const w = watchGame(live, { team: () => team, current: () => game, onTakenOver: taken }, f.deps);
    await f.send(snap({ h: 1 }));
    expect(taken).not.toHaveBeenCalled();
    // Spiel geladen, sendet aber (noch) nicht
    game = { id: 'fremd', liveTakeover: 0 } as Game;
    team = null;
    w.check();
    expect(taken).not.toHaveBeenCalled();
    // sendet wieder: Prüfung ohne neue Meldung
    team = 'E2';
    w.check();
    expect(taken).toHaveBeenCalledTimes(1);
    await f.send(snap({ h: 2, sentAt: T0 + 63_000 }));
    expect(taken).toHaveBeenCalledTimes(1);
    // abgegeben: keine weitere Meldung
    game = { ...game, liveHandedOver: true };
    w.check();
    expect(taken).toHaveBeenCalledTimes(1);
    // selbst wieder übernommen (h 3), dann erneut abgelöst (h 4)
    game = { id: 'fremd', liveTakeover: 3 } as Game;
    await f.send(snap({ h: 3, sentAt: T0 + 64_000 }));
    expect(taken).toHaveBeenCalledTimes(1);
    await f.send(snap({ h: 4, sentAt: T0 + 65_000 }));
    expect(taken).toHaveBeenCalledTimes(2);
    w.stop();
    expect(f.stop).toHaveBeenCalled();
  });
});

describe('006 US4 andere Spiele', () => {
  it('heutige Spiele der anderen Mannschaften; neue Stände werden gemeldet', async () => {
    const f = fakeDeps();
    const w = watchGame(live, { team: () => null, current: () => null, onTakenOver: vi.fn() }, f.deps);
    const changed = vi.fn();
    const off = w.onChange(changed);
    expect(w.others('eigen', 'E1')).toEqual([]);
    await f.send(snap());
    expect(changed).toHaveBeenCalled();
    const first = w.others('eigen', 'E1');
    expect(first.map((c) => [c.key, c.score, c.phase])).toEqual([['E2', '1:0', "3'"]]);
    // gleicher Stand, gleiche Sekunde: dieselbe Liste ohne Neuberechnung
    expect(w.others('eigen', 'E1')).toBe(first);
    expect(w.others('fremd', 'E1')).toEqual([]);
    expect(w.others('eigen', 'E2')).toEqual([]);
    expect(w.serverNow()).toBe(T0 + 2 * 60_000);
    off();
    changed.mockClear();
    await f.send(snap({ sentAt: T0 + 70_000, goals: [] }));
    expect(changed).not.toHaveBeenCalled();
    expect(w.others('eigen', 'E1')[0]?.score).toBe('0:0');
    w.stop();
  });
});
