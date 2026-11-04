import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGame, endSection, kickoff } from '../../src/domain/game';
import { addGoal } from '../../src/domain/goals';
import type { LiveGameSnapshot, LiveSnapshot } from '../../src/domain/live-snapshot';
import { setLive, startPrivate } from '../../src/domain/live-snapshot';
import { handOver } from '../../src/domain/live-takeover';
import type { Game, LiveSpieltag, Player } from '../../src/domain/types';
import type { MessageParts } from '../../src/platform/live-crypto';
import { HEARTBEAT_MS, LiveSender, MIN_GAP_MS, WAIT_AFTER_MS } from '../../src/platform/live-sender';

const T0 = Date.UTC(2026, 10, 7, 9, 0, 0);
const E1_NAME = 'Sportvg Feuerbach E1';
const players: Player[] = [{ id: 'p1', name: 'Max', number: 7, deletedAt: null }];

const cred = (key: string, name: string, sends: boolean) => ({
  key,
  name,
  homeColor: 'rot',
  awayColor: 'schwarz',
  leadKey: { d: `d-${key}`, x: 'x', y: 'y' },
  cert: { d: `cert-${key}`, s: 's' },
  sends,
});
const live: LiveSpieltag = {
  v: 1,
  topic: 'abcdefghijklmnopqrstuv',
  viewKey: 'view',
  orgPub: 'org',
  config: { d: '{"title":"Unser Spieltag"}', s: 's' },
  teams: [cred('E1', 'Sportvg Feuerbach E1', true), cred('E2', 'Sportvg Feuerbach E2', false)],
  createdAt: T0,
};

function newGame(ownTeam = 'Sportvg Feuerbach E1', id = 'g1'): Game {
  return createGame(
    {
      ownTeam,
      opponent: 'TSV Musterstadt',
      venue: 'home',
      schema: { sections: 2, sectionMinutes: 25 },
      ownColor: 'rot',
      oppColor: 'schwarz',
    },
    { id, now: Date.now() },
  );
}

/** Fake-Abhängigkeiten: "Versiegeln" liefert lesbares JSON, Senden zeichnet auf. */
function setup(o: { online?: boolean; big?: boolean; live?: LiveSpieltag } = {}) {
  const sent: { topic: string; parts: MessageParts & { snap: LiveSnapshot } }[] = [];
  const attempts: number[] = [];
  let online = o.online ?? true;
  const hidden = { value: false };
  const visCbs = new Set<() => void>();
  const sender = new LiveSender(o.live ?? live, {
    now: () => Date.now(),
    getPlayers: async () => players,
    seal: async (_key, parts) => {
      const text = JSON.stringify({ ...parts, snap: JSON.parse(parts.content as string) });
      return o.big && parts.config ? 'x'.repeat(5000) : text;
    },
    publish: async (topic, text) => {
      attempts.push(Date.now() - T0);
      if (!online) return false;
      sent.push({ topic, parts: JSON.parse(text) });
      return true;
    },
    visibility: {
      hidden: () => hidden.value,
      onChange: (cb) => {
        visCbs.add(cb);
        return () => visCbs.delete(cb);
      },
    },
  });
  const snaps = () => sent.map((s) => s.parts.snap);
  return {
    sender,
    sent,
    attempts,
    snaps,
    setOnline: (v: boolean) => (online = v),
    setHidden: (v: boolean) => {
      hidden.value = v;
      for (const cb of visCbs) cb();
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

describe('006 FR-L06 SC-L01 Lead-Handy sendet automatisch (research.md R-L3)', () => {
  it('sendet ab dem Anlegen den Stand eines Spiels der gekoppelten Mannschaft, signiert mit dem Lead-Schlüssel', async () => {
    const t = setup();
    t.sender.handle({ kind: 'put', game: newGame() });
    await vi.advanceTimersByTimeAsync(0);
    expect(t.sent).toHaveLength(1);
    expect(t.sent[0]?.topic).toBe(live.topic);
    expect(t.sent[0]?.parts).toMatchObject({ leadKey: { d: 'd-E1' }, cert: { d: 'cert-E1' }, config: live.config });
    expect(t.snaps()[0]).toMatchObject({ state: 'live', gameId: 'g1', team: 'E1', own: 'Feuerbach E1', sentAt: T0 });
    t.sender.stop();
  });

  it('ignoriert andere Mannschaften und Mannschaften, für die ein anderes Handy sendet (FR-L06, US2-S5)', async () => {
    const t = setup();
    t.sender.handle({ kind: 'put', game: newGame('Sportvg Feuerbach E2') });
    t.sender.handle({ kind: 'put', game: newGame('Sportvg Feuerbach E3') });
    t.sender.handle({ kind: 'delete', id: 'unbekannt' });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(t.sent).toHaveLength(0);
    expect(t.sender.status('g1')).toBeNull();
    t.sender.stop();
  });

  it('FR-L04 Trainer-Handy sendet je Spiel für jede Mannschaft des Live-Spieltags, ohne Umstellen', async () => {
    const t = setup({ live: { ...live, orgKey: { d: 'org', x: 'x', y: 'y' } } });
    t.sender.handle({ kind: 'put', game: newGame('Sportvg Feuerbach E2', 'g2') });
    t.sender.handle({ kind: 'put', game: newGame('Sportvg Feuerbach E3', 'g3') });
    await vi.advanceTimersByTimeAsync(0);
    expect(t.snaps().map((s) => [s.gameId, s.team])).toEqual([['g2', 'E2']]);
    expect(t.sent[0]?.parts).toMatchObject({ leadKey: { d: 'd-E2' }, cert: { d: 'cert-E2' } });
    t.sender.stop();
  });

  it('FR-L09 "Live aufs Dashboard" beim Anlegen aus: nichts senden, Status "off"; einschalten sendet', async () => {
    const t = setup();
    const g = startPrivate(newGame());
    t.sender.handle({ kind: 'put', game: g });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(t.sent).toHaveLength(0);
    expect(t.sender.status('g1')).toBe('off');
    t.sender.handle({ kind: 'put', game: setLive(g, true) });
    await vi.advanceTimersByTimeAsync(0);
    expect(t.snaps().map((s) => s.state)).toEqual(['live']);
    t.sender.stop();
  });

  it('FR-L09 nie gesendetes Spiel löschen schickt nichts, auch nach einem Neustart', async () => {
    const t = setup();
    const g = startPrivate(newGame());
    t.sender.handle({ kind: 'put', game: g });
    t.sender.handle({ kind: 'delete', id: g.id, game: g });
    const fresh = setup();
    fresh.sender.handle({ kind: 'delete', id: 'g9', game: { ...startPrivate(newGame()), id: 'g9' } });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(t.sent).toHaveLength(0);
    expect(fresh.sent).toHaveLength(0);
    t.sender.stop();
    fresh.sender.stop();
  });

  it('FR-L24 übernommenes Spiel: nichts mehr senden, auch kein "off" und beim Löschen kein "deleted"', async () => {
    const t = setup();
    const g = kickoff(newGame(), T0);
    t.sender.handle({ kind: 'put', game: g });
    await vi.advanceTimersByTimeAsync(0);
    expect(t.sent).toHaveLength(1);
    const handed = handOver(g);
    t.sender.handle({ kind: 'put', game: handed });
    expect(t.sender.status(g.id)).toBe('handed');
    expect(t.sender.statusFor(handed)).toBe('handed');
    expect(setup().sender.statusFor(handed)).toBe('handed');
    t.sender.handle({ kind: 'delete', id: g.id, game: handed });
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 2);
    expect(t.sent).toHaveLength(1);
    t.sender.stop();
  });

  it('übernommenes Spiel sendet mit dem Übergabezähler', async () => {
    const t = setup();
    t.sender.handle({ kind: 'put', game: { ...newGame(), liveTakeover: 2 } });
    await vi.advanceTimersByTimeAsync(0);
    expect(t.snaps()[0]?.h).toBe(2);
    t.sender.stop();
  });

  it('FR-L09 "Nicht live senden" ohne Netz, dann Neustart: "off" wird trotzdem gesendet', async () => {
    const t = setup();
    t.sender.handle({ kind: 'put', game: setLive(newGame(), false) });
    await vi.advanceTimersByTimeAsync(0);
    expect(t.snaps().map((s) => s.state)).toEqual(['off']);
    t.sender.stop();
  });

  it('höchstens eine Sendung je 5 s, mit dem jeweils letzten Stand (kein Rückstau, FR-L07)', async () => {
    const t = setup();
    let g = kickoff(newGame(), T0);
    t.sender.handle({ kind: 'put', game: g });
    await vi.advanceTimersByTimeAsync(0);
    // drei Tore innerhalb von 5 s nach der ersten Sendung
    const sides = ['own', 'opp', 'own'] as const;
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(1000);
      g = addGoal(g, sides[i]!, Date.now(), () => `goal${i}`).game;
      t.sender.handle({ kind: 'put', game: g });
    }
    await vi.advanceTimersByTimeAsync(MIN_GAP_MS - 3000 - 1);
    expect(t.sent).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(t.sent).toHaveLength(2);
    expect((t.snaps()[1] as LiveGameSnapshot).goals).toHaveLength(3);
    t.sender.stop();
  });

  it('ohne Netz: Erfassung unberührt, Status "wait" nach 30 s, Wiederholung nach 5, 10, 20, 30 s (FR-L07, FR-L08)', async () => {
    const t = setup({ online: false });
    const g = kickoff(newGame(), T0);
    t.sender.handle({ kind: 'put', game: g });
    await vi.advanceTimersByTimeAsync(0);
    expect(t.sender.status('g1')).toBe('on');
    await vi.advanceTimersByTimeAsync(WAIT_AFTER_MS + 1);
    expect(t.sender.status('g1')).toBe('wait');
    await vi.advanceTimersByTimeAsync(100_000 - WAIT_AFTER_MS - 1);
    // Versuche bei 0, dann nach 5, 10, 20 und danach alle 30 s
    expect(t.attempts.map((ms) => ms / 1000)).toEqual([0, 5, 15, 35, 65, 95]);
    t.setOnline(true);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(t.sent).toHaveLength(1);
    expect(t.sender.status('g1')).toBe('on');
    t.sender.stop();
  });

  it('Lebenszeichen alle 3 Minuten nur bei laufendem, angehaltenem oder pausiertem Spiel', async () => {
    const t = setup();
    let g = kickoff(newGame(), T0);
    t.sender.handle({ kind: 'put', game: g });
    await vi.advanceTimersByTimeAsync(0);
    // Die Sendung nach dem Lebenszeichen ist ein eigener Timer im selben Moment.
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS + 1);
    expect(t.sent).toHaveLength(2);
    g = endSection(kickoff(endSection(g, Date.now()), Date.now() + 1000), Date.now() + 2000);
    expect(g.status).toBe('finished');
    t.sender.handle({ kind: 'put', game: g });
    await vi.advanceTimersByTimeAsync(MIN_GAP_MS);
    const before = t.sent.length;
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 2);
    expect(t.sent).toHaveLength(before);
    t.sender.stop();
  });

  it('Rückkehr in den Vordergrund sendet laufende Spiele sofort erneut', async () => {
    const t = setup();
    t.sender.handle({ kind: 'put', game: kickoff(newGame(), T0) });
    await vi.advanceTimersByTimeAsync(MIN_GAP_MS);
    t.setHidden(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(t.sent).toHaveLength(1);
    t.setHidden(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(t.sent).toHaveLength(2);
    t.sender.stop();
  });

  it('"Nicht live senden" sendet off, Löschen sendet deleted (US2-S6, US2-S7)', async () => {
    const t = setup();
    const g = kickoff(newGame(), T0);
    t.sender.handle({ kind: 'put', game: g });
    await vi.advanceTimersByTimeAsync(0);
    t.sender.handle({ kind: 'put', game: setLive(g, false) });
    expect(t.sender.status('g1')).toBe('off');
    await vi.advanceTimersByTimeAsync(MIN_GAP_MS);
    expect(t.snaps()[1]).toMatchObject({ state: 'off', gameId: 'g1', team: 'E1' });
    // ausgenommene Spiele bekommen kein Lebenszeichen
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);
    expect(t.sent).toHaveLength(2);
    t.sender.handle({ kind: 'delete', id: 'g1' });
    await vi.advanceTimersByTimeAsync(MIN_GAP_MS);
    expect(t.snaps()[2]).toMatchObject({ state: 'deleted', gameId: 'g1', team: 'E1' });
    expect(t.sender.status('g1')).toBeNull();
    t.sender.stop();
  });

  it('Löschen eines noch nicht gesehenen Spiels (nach Neustart) schickt trotzdem deleted', async () => {
    const t = setup();
    t.sender.handle({ kind: 'delete', id: 'alt', game: newGame(E1_NAME, 'alt') });
    t.sender.handle({ kind: 'delete', id: 'fremd', game: newGame('Sportvg Feuerbach E3', 'fremd') });
    await vi.advanceTimersByTimeAsync(0);
    expect(t.snaps()).toEqual([expect.objectContaining({ state: 'deleted', gameId: 'alt', team: 'E1' })]);
    t.sender.stop();
  });

  it('nicht mehr gekoppelte Mannschaft: kein Lebenszeichen mehr, Spiel vergessen', async () => {
    const t = setup();
    t.sender.handle({ kind: 'put', game: kickoff(newGame(), T0) });
    await vi.advanceTimersByTimeAsync(0);
    t.sender.updateLive({ ...live, teams: [cred('E2', 'Sportvg Feuerbach E2', true)] });
    expect(t.sender.status('g1')).toBeNull();
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 2);
    expect(t.sent).toHaveLength(1);
    t.sender.stop();
  });

  it('alte, beendete Spiele aus der Zeit vor der Kopplung werden nicht gesendet', async () => {
    const t = setup();
    vi.setSystemTime(T0 - 86_400_000);
    const old = endSection(
      kickoff(
        createGame(
          {
            ownTeam: E1_NAME,
            opponent: 'X',
            venue: 'home',
            schema: { sections: 1, sectionMinutes: 10 },
            ownColor: 'rot',
            oppColor: 'schwarz',
          },
          { id: 'alt', now: Date.now() },
        ),
        Date.now(),
      ),
      Date.now() + 1000,
    );
    vi.setSystemTime(T0);
    t.sender.handle({ kind: 'put', game: old });
    await vi.advanceTimersByTimeAsync(MIN_GAP_MS);
    expect(t.sent).toHaveLength(0);
    t.sender.stop();
  });

  it('nach stop() keine weiteren Sendungen, auch keine Wiederholungen', async () => {
    const t = setup({ online: false });
    t.sender.handle({ kind: 'put', game: kickoff(newGame(), T0) });
    await vi.advanceTimersByTimeAsync(0);
    t.sender.stop();
    t.setOnline(true);
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);
    expect(t.sent).toHaveLength(0);
  });

  it('Spiel wechselt auf eine nicht gekoppelte Mannschaft: wird vergessen', async () => {
    const t = setup();
    const g = kickoff(newGame(), T0);
    t.sender.handle({ kind: 'put', game: g });
    await vi.advanceTimersByTimeAsync(0);
    t.sender.handle({ kind: 'put', game: { ...g, ownTeam: 'Sportvg Feuerbach E3' } });
    expect(t.sender.status('g1')).toBeNull();
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);
    expect(t.sent).toHaveLength(1);
    t.sender.stop();
  });

  it('zu große Meldung: ohne Konfiguration und ohne Namen; neue Kopplung wird übernommen', async () => {
    const t = setup({ big: true });
    let g = kickoff(newGame(), T0);
    g = addGoal(g, 'own', T0 + 60_000, () => 'a').game;
    g = {
      ...g,
      goals: g.goals.map((x) => ({ ...x, scorer: { kind: 'player' as const, playerId: 'p1' } })),
      shootout: {
        first: 'own',
        done: false,
        shots: [{ side: 'own', hit: true, who: { kind: 'player', playerId: 'p1' }, at: T0 }],
      },
    };
    t.sender.handle({ kind: 'put', game: g });
    await vi.advanceTimersByTimeAsync(0);
    expect(t.sent[0]?.parts.config).toBeUndefined();
    expect((t.snaps()[0] as LiveGameSnapshot).goals[0]?.who).toBeNull();
    expect((t.snaps()[0] as LiveGameSnapshot).shootout?.shots).toEqual([['own', true, null]]);
    t.sender.updateLive({ ...live, teams: [cred('E3', 'Sportvg Feuerbach E3', true)] });
    t.sender.handle({ kind: 'put', game: newGame('Sportvg Feuerbach E3', 'g3') });
    await vi.advanceTimersByTimeAsync(MIN_GAP_MS);
    expect(t.snaps().at(-1)).toMatchObject({ gameId: 'g3', team: 'E3' });
    t.sender.stop();
  });

  it('Statusänderungen werden gemeldet; Abmelden wirkt', async () => {
    const t = setup();
    const seen = vi.fn();
    const off = t.sender.onStatus(seen);
    t.sender.handle({ kind: 'put', game: newGame() });
    await vi.advanceTimersByTimeAsync(0);
    expect(seen).toHaveBeenCalled();
    off();
    seen.mockClear();
    t.sender.handle({ kind: 'put', game: newGame() });
    expect(seen).not.toHaveBeenCalled();
    t.sender.stop();
  });
});
