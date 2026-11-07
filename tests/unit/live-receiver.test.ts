import { afterEach, describe, expect, it, vi } from 'vitest';
import { boardView } from '../../src/domain/live-board';
import type { LiveGameSnapshot } from '../../src/domain/live-snapshot';
import type { LiveConfig, PrivateKeyParts, SignedData } from '../../src/domain/types';
import { newSigningKey, newViewKey, sealMessage, signData, type OpenedMessage } from '../../src/platform/live-crypto';
import {
  LiveReceiver,
  SETTLE_QUIET_MS,
  STORAGE_PREFIX,
  newReceiver,
  type ReceiverDeps,
} from '../../src/platform/live-receiver';
import type { RelayState, SubscribeOptions } from '../../src/platform/relay';

const T0 = Date.UTC(2026, 10, 7, 9, 0, 0);
const TOPIC = 'abcdefghijklmnopqrstuv';
const view = { topic: TOPIC, viewKey: 'view', orgPub: 'org' };
const KEY = `${STORAGE_PREFIX}${TOPIC}:org`;

const snap = (p: Partial<LiveGameSnapshot> = {}): LiveGameSnapshot => ({
  v: 1,
  kind: 'game',
  state: 'live',
  gameId: 'g1',
  team: 'E1',
  sentAt: T0,
  h: 0,
  createdAt: T0 - 60_000,
  own: 'Feuerbach E1',
  opp: 'TSV Musterstadt',
  venue: 'home',
  ownColor: 'rot',
  oppColor: 'schwarz',
  schema: { sections: 2, sectionMinutes: 25 },
  clock: [['kickoff', T0, 1]],
  goals: [],
  shootout: null,
  drawSettled: false,
  ...p,
});
const config: LiveConfig = { title: 'Unser Spieltag', teams: ['E1', 'E2'], iat: T0 };

function memoryStore(init: Record<string, string> = {}) {
  const data = { ...init };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

/** Fake-Verbindung: Meldungstext ist JSON eines geöffneten Umschlags. */
function setup(o: Partial<ReceiverDeps> = {}) {
  let opts: SubscribeOptions | null = null;
  const since: (number | undefined)[] = [];
  const stop = vi.fn();
  let now = T0;
  const storage = (o.storage as ReturnType<typeof memoryStore> | undefined) ?? memoryStore();
  const deps: ReceiverDeps = {
    now: () => now,
    subscribe: (target, s) => {
      expect([target.topic, target.orgPub]).toEqual([TOPIC, 'org']);
      since.push(s.since);
      opts = s;
      return stop;
    },
    open: async (_v, text) => {
      if (text === 'throw') throw new Error('kaputt');
      return text === 'bad' ? null : (JSON.parse(text) as OpenedMessage);
    },
    storage,
    timeZone: 'Europe/Berlin',
    ...o,
  };
  const r = new LiveReceiver(view, deps);
  const changes = vi.fn();
  r.onChange(changes);
  r.start();
  const relay = () => opts as SubscribeOptions;
  const msg = async (m: Partial<OpenedMessage>, time = T0 / 1000, seq = 1) => {
    relay().onMessage({ seq, time, message: JSON.stringify({ content: null, cert: null, config: null, ...m }) });
    await vi.waitFor(() => undefined);
    await Promise.resolve();
  };
  return { r, deps, storage, stop, changes, relay, msg, since, setNow: (t: number) => (now = t) };
}

const flush = () => new Promise((res) => setTimeout(res, 0));

describe('006 US3 Empfänger', () => {
  it('FR-L11: geprüfte Meldungen füttern das Board (Konfiguration und Stand)', async () => {
    const { r, msg, changes } = setup();
    expect(r.get().relay).toBe('connecting');
    await msg({ config, content: snap() });
    await flush();
    const v = boardView(r.get().board, T0 + 60_000, 'Europe/Berlin');
    expect(v.title).toBe('Unser Spieltag');
    expect(v.cards.map((c) => [c.key, c.phase])).toEqual([['E1', "2'"]]);
    expect(changes).toHaveBeenCalled();
  });

  it('nicht prüfbare, fehlerhafte oder unbekannte Meldungen ändern nichts', async () => {
    const { r, relay } = setup();
    const before = r.get().board;
    relay().onMessage({ seq: 101, time: T0 / 1000, message: 'bad' });
    relay().onMessage({ seq: 102, time: T0 / 1000, message: 'throw' });
    relay().onMessage({
      seq: 103,
      time: T0 / 1000,
      message: JSON.stringify({ content: { v: 1, kind: 'x' }, cert: null, config: { title: '' } }),
    });
    await flush();
    expect(r.get().board).toBe(before);
  });

  it('R-L4: Serverzeit aus open/keepalive und Meldung; ohne Meldungszeit gilt die geschätzte Serverzeit', async () => {
    const { r, relay, setNow } = setup();
    setNow(T0 + 5_000);
    relay().onServerTime?.(T0 / 1000 + 65);
    expect(r.get().skew).toBe(60_000);
    expect(r.serverNow()).toBe(T0 + 65_000);
    relay().onMessage({
      seq: 104,
      time: 0,
      message: JSON.stringify({ content: snap({ sentAt: T0 + 3_000 }), cert: null, config: null }),
    });
    await flush();
    expect(r.get().board.games[0]?.at).toBe(T0 + 65_000);
    relay().onMessage({
      seq: 105,
      time: T0 / 1000 + 70,
      message: JSON.stringify({ content: snap({ sentAt: T0 + 9_000 }), cert: null, config: null }),
    });
    await flush();
    expect(r.get().board.games[0]?.at).toBe(T0 + 70_000);
  });

  it('Verbindungsstatus live/offline/connecting; "Stand von" merkt die letzte Verbindung', () => {
    const { r, relay, setNow } = setup();
    const states: RelayState[] = [];
    r.onChange(() => states.push(r.get().relay));
    setNow(T0 + 1_000);
    relay().onState?.('live');
    expect(r.get().liveAt).toBe(T0 + 1_000);
    setNow(T0 + 9_000);
    relay().onState?.('offline');
    expect(r.get().liveAt).toBe(T0 + 1_000);
    relay().onState?.('connecting');
    expect(r.get().liveAt).toBe(T0 + 1_000);
    relay().onState?.('live');
    expect(r.get().liveAt).toBe(T0 + 9_000);
    expect(states).toEqual(['live', 'offline', 'connecting', 'live']);
  });

  it('erfolgreiche Abfragen halten "Stand von" aktuell; bekannte Konfiguration gilt sofort', () => {
    const { r, relay, setNow, changes } = setup();
    setNow(T0 + 30_000);
    relay().onAlive?.();
    expect(r.get().liveAt).toBe(T0 + 30_000);
    r.seed(config);
    expect(r.get().board.config).toEqual(config);
    changes.mockClear();
    r.seed({ ...config, iat: T0 - 1 });
    expect(r.get().board.config).toEqual(config);
    expect(changes).not.toHaveBeenCalled();
  });

  it('FR-L16: merkt den Stand im Gerät und lädt ihn beim nächsten Öffnen', async () => {
    const { storage, msg } = setup();
    await msg({ config, content: snap() });
    await flush();
    const saved = JSON.parse(storage.data[KEY] ?? '{}') as { games: unknown[]; liveAt: number };
    expect(saved.games).toHaveLength(1);
    expect(saved.liveAt).toBe(T0);
    const again = new LiveReceiver(view, { ...setup().deps, storage });
    expect(again.get().board.games).toHaveLength(1);
    expect(again.get().board.config?.title).toBe('Unser Spieltag');
    expect(again.get().liveAt).toBe(T0);
  });

  it('007 FR-N03: merkt die zuletzt verarbeitete seq mit dem Stand und verbindet beim nächsten Mal mit since', async () => {
    const first = setup();
    expect(first.since).toEqual([undefined]);
    await first.msg({ config, content: snap() }, T0 / 1000, 7);
    await first.msg({ content: null, cert: null, config: null }, T0 / 1000, 9);
    await flush();
    expect(JSON.parse(first.storage.data[KEY] ?? '{}').seq).toBe(7);
    // eine weitere Meldung mit neuem Stand speichert die höchste verarbeitete seq
    await first.msg({ content: snap({ sentAt: T0 + 5_000 }) }, T0 / 1000, 12);
    await flush();
    expect(JSON.parse(first.storage.data[KEY] ?? '{}').seq).toBe(12);
    const again = setup({ storage: first.storage });
    expect(again.since).toEqual([12]);
    expect(again.r.get().board.games).toHaveLength(1);
  });

  it('007: ungültige gemerkte seq wird ignoriert (alles neu laden)', () => {
    for (const bad of [0, -3, 1.5, '7', null]) {
      const storage = memoryStore({ [KEY]: JSON.stringify({ games: [], removed: [], seq: bad }) });
      expect(setup({ storage }).since, String(bad)).toEqual([undefined]);
    }
  });

  it('007: Meldungen werden nacheinander geprüft, auch wenn eine spätere schneller fertig wäre', async () => {
    const order: number[] = [];
    let releaseFirst: () => void = () => undefined;
    const s = setup({
      open: (_v, text) => {
        const o = JSON.parse(text) as OpenedMessage & { n: number };
        return new Promise((res) => {
          const done = () => {
            order.push(o.n);
            res(o);
          };
          if (o.n === 1) releaseFirst = done;
          else done();
        });
      },
    });
    const send = (n: number) =>
      s.relay().onMessage({
        seq: n,
        time: T0 / 1000,
        message: JSON.stringify({ n, content: null, cert: null, config: null }),
      });
    send(1);
    send(2);
    await flush();
    expect(order).toEqual([]);
    releaseFirst();
    await vi.waitFor(() => expect(order).toEqual([1, 2]));
  });

  it('R-L12: gemerkter Stand gilt nur für denselben Organisator-Schlüssel', async () => {
    const { storage, msg } = setup();
    await msg({ config, content: snap() });
    await flush();
    const other = new LiveReceiver({ ...view, orgPub: 'fremd' }, { ...setup().deps, storage });
    expect(other.get().board.games).toEqual([]);
    expect(other.get().board.config).toBeNull();
    expect(new LiveReceiver(view, { ...setup().deps, storage }).get().board.games).toHaveLength(1);
  });

  it('Fehler beim Speicherzugriff werden ignoriert', async () => {
    const broken = {
      getItem: () => {
        throw new Error('gesperrt');
      },
      setItem: () => {
        throw new Error('voll');
      },
    };
    const { r, msg } = setup({ storage: broken });
    expect(r.get().board.games).toEqual([]);
    await msg({ content: snap() });
    await flush();
    expect(r.get().board.games).toHaveLength(1);
    const noStore = setup({ storage: null });
    await noStore.msg({ content: snap() });
    await flush();
    expect(noStore.r.get().board.games).toHaveLength(1);
    const bad = memoryStore({ [KEY]: '{"games":[],"removed":[],"liveAt":"x"}' });
    expect(new LiveReceiver(view, { ...setup().deps, storage: bad }).get().liveAt).toBeNull();
    const garbage = memoryStore({ [KEY]: '{kaputt' });
    expect(new LiveReceiver(view, { ...setup().deps, storage: garbage }).get().board.games).toEqual([]);
  });

  it('015 US3 R-P7: geprüfte Planspiele gehen auch auf dem Eltern-Dashboard in den Stand und überstehen das Neuladen', async () => {
    const { r, msg, storage, deps } = setup();
    const payload = JSON.stringify({
      v: 1,
      e: [{ i: 'p1', k: 'E1', d: '2026-11-14', t: '12:00', h: 1, o: 'TSV Musterstadt', u: 5 }],
    });
    await msg({ content: null, cert: null, config: null, plan: payload });
    await flush();
    expect(r.get().board.plan.map((e) => [e.id, e.opponent])).toEqual([['p1', 'TSV Musterstadt']]);
    expect(JSON.parse(storage.getItem(KEY) as string).plan).toEqual(JSON.parse(payload));
    expect(new LiveReceiver(view, deps).get().board.plan).toEqual(r.get().board.plan);
    // ungültige Nutzlast ändert nichts
    await msg({ content: null, cert: null, config: null, plan: '{kaputt' }, T0 / 1000, 2);
    await flush();
    expect(r.get().board.plan).toHaveLength(1);
  });

  it('015 US1-S4 FR-P07: reicht geprüfte Plan-Meldungen mit Sendezeit an Trainer-Handys weiter, Zuschauer ignorieren sie', async () => {
    const onPlan = vi.fn();
    const { msg } = setup({ onPlan });
    // Eine nachgelesene, 6 Stunden alte Meldung zählt mit ihrer Sendezeit, nicht als gerade empfangen.
    const old = T0 - 6 * 3600_000;
    await msg({ content: null, cert: null, config: null, plan: '{"v":1}' }, old / 1000);
    await msg({ content: null, cert: null, config: null }, T0 / 1000, 2);
    await flush();
    expect(onPlan).toHaveBeenCalledTimes(1);
    expect(onPlan).toHaveBeenCalledWith('{"v":1}', old);
    const viewer = setup();
    await viewer.msg({ content: null, cert: null, config: null, plan: '{"v":1}' });
    await flush();
    expect(viewer.r.get().board.games).toEqual([]);
  });

  it('US5-S1: meldet jede jüngere signierte Konfiguration einmal (Trainer-Handys übernehmen sie)', async () => {
    const onConfig = vi.fn();
    const { r, msg } = setup({ onConfig });
    r.seed(config);
    const signed = (iat: number) => ({ d: JSON.stringify({ ...config, iat }), s: `s${iat}` });
    await msg({ config, signedConfig: signed(T0) });
    await flush();
    expect(onConfig).not.toHaveBeenCalled();
    const newer = { ...config, title: 'Neu', iat: T0 + 1 };
    await msg({ config: newer, signedConfig: signed(T0 + 1) }, T0 / 1000, 2);
    await msg({ config: newer, signedConfig: signed(T0 + 1) }, T0 / 1000, 3);
    await flush();
    expect(onConfig).toHaveBeenCalledTimes(1);
    expect(onConfig).toHaveBeenCalledWith(signed(T0 + 1));
    expect(r.get().board.config?.title).toBe('Neu');
    // ohne Rückruf (Zuschauer) keine Weitergabe
    const viewer = setup();
    await viewer.msg({ config: newer, signedConfig: signed(T0 + 1) });
    await flush();
    expect(viewer.r.get().board.config?.title).toBe('Neu');
  });

  it('stop beendet die Verbindung; spätere Meldungen und zweites start ändern nichts', async () => {
    const { r, relay, stop, changes } = setup();
    r.start();
    r.stop();
    expect(stop).toHaveBeenCalledTimes(1);
    changes.mockClear();
    relay().onMessage({
      seq: 106,
      time: T0 / 1000,
      message: JSON.stringify({ content: snap(), cert: null, config: null }),
    });
    await flush();
    expect(r.get().board.games).toEqual([]);
    expect(changes).not.toHaveBeenCalled();
    r.start();
    r.stop();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('newReceiver nutzt echte Prüfung: gefälschte Meldung wird verworfen, echte angezeigt', async () => {
    const viewKey = newViewKey();
    const org = await newSigningKey();
    const lead = await newSigningKey();
    const fake = await newSigningKey();
    const cert = (priv: PrivateKeyParts, pub: string): Promise<SignedData> =>
      signData(priv, { key: 'E1', name: 'Sportvg Feuerbach E1', homeColor: 'rot', awayColor: 'weiss', pub, iat: T0 });
    const g = await signData(org.priv, config);
    const good = await sealMessage(viewKey, {
      content: JSON.stringify(snap()),
      leadKey: lead.priv,
      cert: await cert(org.priv, lead.pub),
      config: g,
    });
    const forged = await sealMessage(viewKey, {
      content: JSON.stringify(snap({ gameId: 'evil' })),
      leadKey: fake.priv,
      cert: await cert(fake.priv, fake.pub),
    });
    let opts: SubscribeOptions | null = null;
    const r = newReceiver(
      { topic: TOPIC, viewKey, orgPub: org.pub },
      {
        subscribe: (_t, s) => {
          opts = s;
          return () => undefined;
        },
      },
    );
    // Ohne Browser (kein window) gibt es keinen Speicher, die Anzeige läuft trotzdem.
    r.start();
    const o = opts as unknown as SubscribeOptions;
    o.onMessage({ seq: 107, time: T0 / 1000, message: forged });
    o.onMessage({ seq: 108, time: T0 / 1000, message: good });
    await vi.waitFor(() => expect(r.get().board.games).toHaveLength(1));
    expect(r.get().board.games[0]?.snap.gameId).toBe('g1');
    r.stop();
  });
});

describe('006 US6-S6 FR-L22 auf den ersten Live-Stand warten', () => {
  afterEach(() => vi.useRealTimers());
  /** Uhr und Zeitgeber laufen gemeinsam (vi.useFakeTimers), damit Ruhezeit und Höchstdauer stimmen. */
  const waiting = (maxMs = 3_000) => {
    vi.useFakeTimers({ now: T0 });
    const s = setup({ now: () => Date.now() });
    let done = false;
    void s.r.whenSettled(maxMs).then(() => (done = true));
    const send = (seq: number) =>
      s.relay().onMessage({ seq, time: T0 / 1000, message: JSON.stringify({ content: snap(), cert: null, config }) });
    return { ...s, send, done: () => done, tick: (ms: number) => vi.advanceTimersByTimeAsync(ms) };
  };

  it('wartet auf Verbindung, geprüfte Meldungen und kurze Ruhe; danach ist das Spiel bekannt', async () => {
    const w = waiting();
    await w.tick(1_000);
    expect(w.done()).toBe(false);
    w.relay().onState?.('live');
    w.send(1);
    await w.tick(SETTLE_QUIET_MS - 100);
    expect(w.done()).toBe(false);
    w.send(2);
    await w.tick(SETTLE_QUIET_MS - 1);
    expect(w.done()).toBe(false);
    await w.tick(1);
    expect(w.done()).toBe(true);
    expect(w.r.get().board.games).toHaveLength(1);
  });

  it('Stream verbunden, aber noch kein Inhalt: wartet weiter, bis "open" oder Meldungen kommen', async () => {
    const w = waiting();
    w.relay().onState?.('live');
    await w.tick(SETTLE_QUIET_MS * 3);
    expect(w.done()).toBe(false);
    w.relay().onServerTime?.(T0 / 1000);
    w.send(1);
    await w.tick(SETTLE_QUIET_MS);
    expect(w.done()).toBe(true);
    expect(w.r.get().board.games).toHaveLength(1);
  });

  it('wartet nicht, solange eine Meldung noch geprüft wird', async () => {
    let release: () => void = () => undefined;
    vi.useFakeTimers({ now: T0 });
    const s = setup({
      now: () => Date.now(),
      open: (_v, text) =>
        new Promise((res) => {
          release = () => res(JSON.parse(text) as OpenedMessage);
        }),
    });
    let done = false;
    s.relay().onState?.('live');
    s.relay().onMessage({
      seq: 109,
      time: T0 / 1000,
      message: JSON.stringify({ content: snap(), cert: null, config }),
    });
    void s.r.whenSettled(3_000).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(SETTLE_QUIET_MS * 2);
    expect(done).toBe(false);
    release();
    await vi.advanceTimersByTimeAsync(SETTLE_QUIET_MS);
    expect(done).toBe(true);
    expect(s.r.get().board.games).toHaveLength(1);
  });

  it('längst verbunden und ruhig: sofort; ohne Netz: sofort; beim Beenden: sofort', async () => {
    const quiet = waiting();
    quiet.relay().onState?.('live');
    quiet.relay().onServerTime?.(T0 / 1000);
    await quiet.tick(SETTLE_QUIET_MS);
    expect(quiet.done()).toBe(true);
    let again = false;
    void quiet.r.whenSettled(3_000).then(() => (again = true));
    await quiet.tick(0);
    expect(again).toBe(true);

    const offline = waiting();
    offline.relay().onState?.('offline');
    await offline.tick(0);
    expect(offline.done()).toBe(true);

    const stopped = waiting();
    stopped.r.stop();
    await stopped.tick(0);
    expect(stopped.done()).toBe(true);
  });

  it('höchstens so lange wie angegeben', async () => {
    const w = waiting(3_000);
    await w.tick(2_999);
    expect(w.done()).toBe(false);
    await w.tick(1);
    expect(w.done()).toBe(true);
  });
});
