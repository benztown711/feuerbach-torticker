import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { backupFileName, buildBackup, mergeBackup, parseBackup } from '../../src/domain/export';
import { addShot, endShootout, startExtraTime, startShootout } from '../../src/domain/cup';
import { createGame, endSection, kickoff } from '../../src/domain/game';
import { addCard, addMark, addSub, setMarkComment } from '../../src/domain/events';
import { addGoal, setAssist, setPenalty, setScorer } from '../../src/domain/goals';
import type { Game, LiveSpieltag, MarkEvent, Player } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const min = (n: number): number => n * 60_000;
const schema = JSON.parse(
  readFileSync(new URL('../../specs/001-spiel-erfassen/contracts/export.schema.json', import.meta.url), 'utf8'),
) as object;
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const players: Player[] = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Max', number: 7, deletedAt: null },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Ben', number: null, deletedAt: T0 },
];

function game(id: string, finishedGame = true): Game {
  let g = kickoff(
    createGame(
      {
        ownTeam: 'Sportvg Feuerbach E1',
        opponent: 'TSV Musterstadt',
        venue: 'home',
        schema: { sections: 2, sectionMinutes: 25 },
        ownColor: 'rot',
        oppColor: 'schwarz',
        squad: [players[0]!.id],
      },
      { id, now: T0 },
    ),
    T0,
  );
  const a = addGoal(g, 'own', T0 + min(3), () => `${id.slice(0, 8)}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`);
  g = setScorer(a.game, a.goal!.id, { kind: 'player', playerId: players[0]!.id });
  const b = addGoal(g, 'opp', T0 + min(5), () => `${id.slice(0, 8)}-bbbb-4bbb-8bbb-bbbbbbbbbbbb`);
  g = setScorer(b.game, b.goal!.id, { kind: 'text', text: 'Nr. 9' });
  if (finishedGame) g = endSection(kickoff(endSection(g, T0 + min(25)), T0 + min(30)), T0 + min(55));
  return g;
}

const G1 = '33333333-3333-4333-8333-333333333333';
const G2 = '44444444-4444-4444-8444-444444444444';
const G3 = '55555555-5555-4555-8555-555555555555';

describe('T072 FR-024 Sicherung', () => {
  it('buildBackup erzeugt JSON gemäß contracts/export.schema.json (auch offene Spiele)', () => {
    const backup = buildBackup([game(G1), game(G2, false)], players, T0 + min(60), '0.4.0');
    const ok = validate(JSON.parse(JSON.stringify(backup)));
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
    expect(backup).toMatchObject({ format: 'feuerbach-torticker-backup', schemaVersion: 1, exportedAt: T0 + min(60) });
  });

  it('003 Sicherung enthält Lesezeichen und Elfmeter-Kennzeichen (Schema) und liest sie wieder ein', () => {
    let g = game(G2, false);
    g = setPenalty(g, g.goals[0]!.id, true);
    const m = addMark(g, T0 + min(6), () => '55555555-5555-4555-8555-555555555555')!;
    g = setMarkComment(m.game, m.event.id, 'Konter links');
    // Lesezeichen in der Nachspielzeit (Feld stoppage gesetzt)
    g = addMark(g, T0 + min(27), () => '66666666-6666-4666-8666-666666666666')!.game;
    const backup = buildBackup([g], players, T0 + min(60));
    const ok = validate(JSON.parse(JSON.stringify(backup)));
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok && (parsed.backup.games[0]?.events?.[0] as MarkEvent | undefined)?.comment).toBe('Konter links');
    expect(parsed.ok && parsed.backup.games[0]?.goals[0]?.penalty).toBe(true);
    const bad = JSON.parse(JSON.stringify(backup)) as {
      games: { events: { comment: string }[]; goals: { penalty: unknown }[] }[];
    };
    bad.games[0]!.events[0]!.comment = 'x'.repeat(61);
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false);
    const bad2 = JSON.parse(JSON.stringify(backup)) as typeof bad;
    bad2.games[0]!.goals[0]!.penalty = 'ja';
    expect(parseBackup(JSON.stringify(bad2)).ok).toBe(false);
  });

  it('003 Sicherung enthält Karten und Wechsel (Schema) und lehnt ungültige ab', () => {
    let g = game(G2, false);
    g = addCard(
      g,
      { side: 'opp', card: 'rot', who: { kind: 'text', text: 'Nr. 9' }, comment: 'Foul' },
      T0 + min(7),
      () => '77777777-7777-4777-8777-777777777777',
    )!.game;
    g = addCard(
      g,
      { side: 'own', card: 'zeit', who: { kind: 'player', playerId: players[0]!.id } },
      T0 + min(8),
      () => '88888888-8888-4888-8888-888888888888',
    )!.game;
    g = addCard(
      g,
      { side: 'own', card: 'gelb', who: null },
      T0 + min(8),
      () => 'aaaaaaaa-0000-4000-8000-000000000000',
    )!.game;
    g = addSub(g, players[0]!.id, players[1]!.id, T0 + min(9), () => '99999999-9999-4999-8999-999999999999')!.game;
    const backup = buildBackup([g], players, T0 + min(60));
    const ok = validate(JSON.parse(JSON.stringify(backup)));
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok && parsed.backup.games[0]?.events?.map((e) => e.kind)).toEqual(['card', 'card', 'card', 'sub']);
    const mutate = (f: (ev: Record<string, unknown>[]) => void): boolean => {
      const b = JSON.parse(JSON.stringify(backup)) as { games: { events: Record<string, unknown>[] }[] };
      f(b.games[0]!.events);
      return parseBackup(JSON.stringify(b)).ok;
    };
    expect(mutate((ev) => (ev[0]!.card = 'blau'))).toBe(false);
    expect(mutate((ev) => (ev[0]!.who = { kind: 'player' }))).toBe(false);
    expect(mutate((ev) => (ev[0]!.who = { kind: 'sonst' }))).toBe(false);
    expect(mutate((ev) => (ev[0]!.side = 'egal'))).toBe(false);
    expect(mutate((ev) => (ev[3]!.inId = ''))).toBe(false);
    expect(mutate((ev) => (ev[3]!.kind = 'tor'))).toBe(false);
    expect(mutate((ev) => (ev[0]!.section = 9))).toBe(false);
  });

  it('003 Sicherung enthält Verlängerung, Abfrage und Elfmeterschießen (Schema) und lehnt ungültige ab', () => {
    // game(G1) endet 1:1 nach 2 × 25 (T0 + 55 min)
    let g = startExtraTime(game(G1), 10, T0 + min(56));
    g = kickoff(g, T0 + min(57));
    g = endSection(kickoff(endSection(g, T0 + min(67)), T0 + min(68)), T0 + min(78));
    g = startShootout({ ...g, drawSettled: false }, 'opp');
    g = addShot(g, true, { kind: 'text', text: 'Nr. 7' }, T0 + min(80));
    g = endShootout(addShot(g, false, { kind: 'player', playerId: players[0]!.id }, T0 + min(81)));
    const backup = buildBackup([g], players, T0 + min(90));
    const ok = validate(JSON.parse(JSON.stringify(backup)));
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok && parsed.backup.games[0]?.shootout?.shots).toHaveLength(2);
    expect(parsed.ok && parsed.backup.games[0]?.schema.extraMinutes).toBe(10);
    type Mut = {
      schema: { extraMinutes?: unknown };
      drawSettled?: unknown;
      shootout: { first: unknown; done: unknown; shots: { hit: unknown }[] } | null;
    };
    const mutate = (f: (g: Mut) => void): boolean => {
      const b = JSON.parse(JSON.stringify(backup)) as { games: Mut[] };
      f(b.games[0]!);
      return parseBackup(JSON.stringify(b)).ok;
    };
    expect(mutate((x) => (x.schema.extraMinutes = 0))).toBe(false);
    expect(mutate((x) => (x.drawSettled = 'ja'))).toBe(false);
    expect(mutate((x) => (x.shootout!.first = 'beide'))).toBe(false);
    expect(mutate((x) => (x.shootout!.shots[0]!.hit = 'ja'))).toBe(false);
    expect(mutate((x) => (x.shootout!.done = 1))).toBe(false);
    expect(mutate((x) => (x.shootout = null))).toBe(false);
    expect(mutate((x) => (x.drawSettled = true))).toBe(true);
  });

  it('006 FR-L09 Sicherung enthält den Sendeschalter "Nicht live senden" (Schema) und lehnt ungültige ab', () => {
    const backup = buildBackup([{ ...game(G1), live: false }, { ...game(G2), live: true }, game(G3)], players, T0);
    expect(validate(JSON.parse(JSON.stringify(backup)))).toBe(true);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok && parsed.backup.games.map((g) => g.live)).toEqual([false, true, undefined]);
    const b = JSON.parse(JSON.stringify(backup)) as { games: { live?: unknown }[] };
    b.games[0]!.live = 'ja';
    expect(parseBackup(JSON.stringify(b)).ok).toBe(false);
    expect(validate(b)).toBe(false);
    const priv = buildBackup([{ ...game(G1), live: false, livePrivate: true }], players, T0);
    expect(parseBackup(JSON.stringify(priv)).ok).toBe(true);
    const bad = JSON.parse(JSON.stringify(priv)) as { games: { livePrivate?: unknown }[] };
    bad.games[0]!.livePrivate = 'ja';
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false);
    // FR-L23, FR-L24: Übergabe
    const taken = buildBackup([{ ...game(G1), live: false, liveTakeover: 2, liveHandedOver: true }], players, T0);
    expect(parseBackup(JSON.stringify(taken)).ok).toBe(true);
    expect(validate(JSON.parse(JSON.stringify(taken)))).toBe(true);
    for (const [k, v] of [
      ['liveTakeover', 101],
      ['liveTakeover', 1.5],
      ['liveHandedOver', 'ja'],
    ] as const) {
      const t = JSON.parse(JSON.stringify(taken)) as { games: Record<string, unknown>[] };
      t.games[0]![k] = v;
      expect(parseBackup(JSON.stringify(t)).ok).toBe(false);
    }
  });

  it('009 FR-V10 Sicherung enthält Vorlagen (Schema), ältere ohne Feld bleiben gültig, ungültige abgelehnt', () => {
    const roster: Player[] = [...players, { id: 'ben-id', name: 'Ben', number: 9, deletedAt: null }];
    const plain = game(G1);
    const g = setAssist(plain, plain.goals[0]!.id, 'ben-id');
    expect(g.goals[0]?.assist).toBe('ben-id');
    const backup = buildBackup([g, plain], roster, T0);
    const json = JSON.parse(JSON.stringify(backup)) as { games: { goals: { assist?: unknown }[] }[] };
    expect(validate(json)).toBe(true);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok && parsed.backup.games.map((x) => x.goals[0]?.assist)).toEqual(['ben-id', undefined]);
    for (const wrong of ['', 7, 'x'.repeat(201)]) {
      const b = JSON.parse(JSON.stringify(backup)) as typeof json;
      b.games[0]!.goals[0]!.assist = wrong;
      expect(parseBackup(JSON.stringify(b)).ok).toBe(false);
      expect(validate(b)).toBe(false);
    }
    const none = JSON.parse(JSON.stringify(backup)) as typeof json;
    none.games[0]!.goals[0]!.assist = null;
    expect(parseBackup(JSON.stringify(none)).ok).toBe(true);
    expect(validate(none)).toBe(true);
  });

  it('ohne App-Version fehlt das Feld', () => {
    expect(buildBackup([], [], T0)).not.toHaveProperty('appVersion');
  });

  it('backupFileName: torticker-sicherung-JJJJ-MM-TT.json in Ortszeit', () => {
    expect(backupFileName(Date.UTC(2026, 10, 7, 23, 30), 'Europe/Berlin')).toBe('torticker-sicherung-2026-11-08.json');
    expect(backupFileName(T0)).toMatch(/^torticker-sicherung-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('parseBackup liest eine eigene Sicherung wieder ein', () => {
    const text = JSON.stringify(buildBackup([game(G1)], players, T0));
    const r = parseBackup(text);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.backup.games[0]?.id).toBe(G1);
  });

  it('parseBackup lehnt kein JSON, fremde Formate und kaputte Einträge ab', () => {
    const good = JSON.parse(JSON.stringify(buildBackup([game(G1)], players, T0))) as Record<string, unknown>;
    const g0 = (good.games as Record<string, unknown>[])[0]!;
    const p0 = (good.players as Record<string, unknown>[])[0]!;
    const goal0 = (g0.goals as Record<string, unknown>[])[0]!;
    const ev0 = (g0.clockEvents as Record<string, unknown>[])[0]!;
    const with_ = (path: (o: Record<string, unknown>) => void): string => {
      const copy = JSON.parse(JSON.stringify(good)) as Record<string, unknown>;
      path(copy);
      return JSON.stringify(copy);
    };
    const game0 = (o: Record<string, unknown>) => (o.games as Record<string, unknown>[])[0]!;
    const cases: string[] = [
      'kein json',
      '[]',
      'null',
      with_((o) => (o.format = 'anderes-format')),
      with_((o) => (o.schemaVersion = 2)),
      with_((o) => (o.exportedAt = 'gestern')),
      with_((o) => (o.games = {})),
      with_((o) => (o.players = null)),
      with_((o) => ((o.players as unknown[])[0] = 'Max')),
      with_((o) => ((o.players as Record<string, unknown>[])[0]!.id = 5)),
      with_((o) => ((o.players as Record<string, unknown>[])[0]!.name = '')),
      with_((o) => ((o.players as Record<string, unknown>[])[0]!.number = 100)),
      with_((o) => ((o.players as Record<string, unknown>[])[0]!.deletedAt = 'nie')),
      with_((o) => ((o.games as unknown[])[0] = 7)),
      with_((o) => (game0(o).id = '')),
      with_((o) => (game0(o).schemaVersion = 0)),
      with_((o) => (game0(o).ownTeam = 'x'.repeat(41))),
      with_((o) => (game0(o).opponent = 3)),
      with_((o) => (game0(o).venue = 'neutral')),
      with_((o) => (game0(o).schema = { sections: 5, sectionMinutes: 25 })),
      with_((o) => (game0(o).schema = { sections: 2, sectionMinutes: 0 })),
      with_((o) => (game0(o).schema = null)),
      with_((o) => (game0(o).ownColor = 1)),
      with_((o) => (game0(o).oppColor = null)),
      with_((o) => (game0(o).createdAt = 'heute')),
      with_((o) => (game0(o).status = 'abgebrochen')),
      with_((o) => (game0(o).signalledThresholds = [1])),
      with_((o) => (game0(o).squad = 'alle')),
      with_((o) => (game0(o).finalScore = { own: -1, opp: 0 })),
      with_((o) => (game0(o).halfTimeScore = { own: 1 })),
      with_((o) => (game0(o).clockEvents = [{ ...ev0, type: 'jubel' }])),
      with_((o) => (game0(o).clockEvents = [{ ...ev0, at: null }])),
      with_((o) => (game0(o).clockEvents = [{ ...ev0, section: 5 }])),
      with_((o) => (game0(o).clockEvents = [null])),
      with_((o) => (game0(o).goals = [{ ...goal0, side: 'beide' }])),
      with_((o) => (game0(o).goals = [{ ...goal0, minute: 0 }])),
      with_((o) => (game0(o).goals = [{ ...goal0, stoppage: 0 }])),
      with_((o) => (game0(o).goals = [{ ...goal0, deletedAt: 'jetzt' }])),
      with_((o) => (game0(o).goals = [{ ...goal0, id: '' }])),
      with_((o) => (game0(o).goals = [{ ...goal0, at: 'x' }])),
      with_((o) => (game0(o).goals = [{ ...goal0, section: 0 }])),
      with_((o) => (game0(o).goals = [{ ...goal0, scorer: { kind: 'player' } }])),
      with_((o) => (game0(o).goals = [{ ...goal0, scorer: { kind: 'text', text: '' } }])),
      with_((o) => (game0(o).goals = [{ ...goal0, scorer: { kind: 'magie' } }])),
      with_((o) => (game0(o).goals = [{ ...goal0, scorer: 'Max' }])),
      with_((o) => (game0(o).goals = 'keine')),
      with_((o) => (game0(o).clockEvents = 'keine')),
    ];
    for (const text of cases) {
      const r = parseBackup(text);
      expect(r.ok, text.slice(0, 80)).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
    }
    void p0;
  });

  it('parseBackup akzeptiert Eigentor, null-Torschützen und ältere "reset"-Ereignisse', () => {
    const b = JSON.parse(JSON.stringify(buildBackup([game(G1)], players, T0))) as {
      games: { goals: { scorer: unknown }[]; clockEvents: unknown[] }[];
    };
    b.games[0]!.goals[0]!.scorer = { kind: 'ownGoal' };
    b.games[0]!.goals[1]!.scorer = null;
    b.games[0]!.clockEvents.push({ type: 'reset', at: T0 + min(56), section: 2 });
    expect(parseBackup(JSON.stringify(b)).ok).toBe(true);
  });

  it('mergeBackup überspringt vorhandene Spiele und führt Spieler per ID zusammen (lokal gewinnt)', () => {
    const local: Player[] = [{ id: players[0]!.id, name: 'Max L.', number: 7, deletedAt: null }];
    const backup = buildBackup([game(G1), game(G2)], players, T0);
    const r = mergeBackup({ games: [game(G1)], players: local }, backup);
    expect(r.newGames.map((g) => g.id)).toEqual([G2]);
    expect(r.skippedGames).toBe(1);
    expect(r.newPlayers.map((p) => p.id)).toEqual([players[1]!.id]);
  });
});

describe('015 FR-P24 Sicherung mit Kadern und Spielplan', () => {
  const squads = [
    { id: 'kader', name: 'E1/E2' },
    { id: 'e3', name: 'E3' },
  ];
  const withSquad: Player[] = [players[0]!, { ...players[1]!, squadId: 'e3' }];
  const plan = { topic: 'T'.repeat(21) + 'A', orgPub: 'C'.repeat(86) + 'A', p: { v: 1, e: [{ i: 'p1' }] } };

  it('Kader, Zuordnung und Spielplan stehen in der Sicherung (Schema) und kommen beim Einlesen zurück', () => {
    const backup = buildBackup([game(G1)], withSquad, T0, '1.0.0', null, { squads, plan });
    const ok = validate(JSON.parse(JSON.stringify(backup)));
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok && parsed.backup.squads).toEqual(squads);
    expect(parsed.ok && parsed.backup.players[1]?.squadId).toBe('e3');
    expect(parsed.ok && parsed.backup.plan).toEqual(plan);
  });

  it('ohne Kader und Spielplan fehlen die Felder', () => {
    const backup = buildBackup([], players, T0, undefined, null, {});
    expect('squads' in backup || 'plan' in backup).toBe(false);
  });

  it('beschädigte Kader, Zuordnung oder Spielplan werden abgelehnt', () => {
    const base = JSON.parse(
      JSON.stringify(buildBackup([], withSquad, T0, undefined, null, { squads, plan })),
    ) as Record<string, unknown>;
    const bad = (patch: Record<string, unknown>) => parseBackup(JSON.stringify({ ...base, ...patch }));
    const squadError = { ok: false, error: 'Die Kader in der Sicherung sind beschädigt.' };
    expect(bad({ squads: [] })).toEqual(squadError);
    expect(bad({ squads: [{ id: 'a', name: ' ' }] })).toEqual(squadError);
    expect(bad({ squads: [{ id: '', name: 'A' }] })).toEqual(squadError);
    expect(bad({ squads: 'E3' })).toEqual(squadError);
    expect(bad({ squads: 'ABCDEFG'.split('').map((c) => ({ id: c, name: c })) })).toEqual(squadError);
    expect(bad({ players: [{ ...withSquad[1], squadId: '' }] }).ok).toBe(false);
    const planError = { ok: false, error: 'Der Spielplan in der Sicherung ist beschädigt.' };
    expect(bad({ plan: { ...plan, topic: 'kurz' } })).toEqual(planError);
    expect(bad({ plan: { ...plan, orgPub: 'kurz' } })).toEqual(planError);
    expect(bad({ plan: { ...plan, p: { v: 2, e: [{}] } } })).toEqual(planError);
    expect(bad({ plan: { ...plan, p: { v: 1, e: [] } } })).toEqual(planError);
    expect(bad({ plan: { ...plan, p: null } })).toEqual(planError);
    expect(bad({ plan: 'x' })).toEqual(planError);
    for (const patch of [{ squads: [] }, { plan: { ...plan, topic: 'kurz' } }]) {
      expect(validate({ ...base, ...patch })).toBe(false);
    }
  });

  it('mergeBackup übernimmt Kader und ordnet neue Kinder gleichnamigen Kadern zu', () => {
    const backup = buildBackup([], [withSquad[0]!, { ...withSquad[1]!, squadId: 'x3' }], T0, undefined, null, {
      squads: [
        { id: 'kader', name: 'E1/E2' },
        { id: 'x3', name: 'e3' },
      ],
    });
    const r = mergeBackup({ games: [], players: [], squads }, backup);
    expect(r.squads).toBeNull();
    expect(r.newPlayers.map((x) => x.squadId)).toEqual([undefined, 'e3']);
    const fresh = mergeBackup({ games: [], players: [] }, buildBackup([], withSquad, T0, undefined, null, { squads }));
    expect(fresh.squads).toEqual(squads);
    expect(fresh.newPlayers[1]?.squadId).toBe('e3');
  });
});

describe('006 FR-L21 Sicherung mit Live-Spieltag', () => {
  const B43 = 'A'.repeat(42) + 'Q';
  const B87 = 'C'.repeat(86) + 'A';
  const SIG = 'B'.repeat(85) + 'A';
  const keyParts = { d: B43, x: B43, y: B43 };
  const live: LiveSpieltag = {
    v: 1,
    topic: 'abcdefghijklmnopqrstuv',
    viewKey: B43,
    orgPub: B87,
    orgKey: keyParts,
    config: { d: JSON.stringify({ title: 'Unser Spieltag', teams: ['E1'], iat: T0 }), s: SIG },
    teams: [
      {
        key: 'E1',
        name: 'Sportvg Feuerbach E1',
        homeColor: 'rot',
        awayColor: 'schwarz',
        leadKey: keyParts,
        cert: { d: '{"key":"E1"}', s: SIG },
        sends: true,
      },
    ],
    createdAt: T0,
  };

  it('enthält den Live-Spieltag (Schema) und liest ihn wieder ein; ohne Live-Spieltag fehlt das Feld', () => {
    const backup = buildBackup([game(G1)], players, T0, '0.3.0', live);
    const json = JSON.parse(JSON.stringify(backup)) as unknown;
    expect(validate(json), JSON.stringify(validate.errors)).toBe(true);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok && parsed.backup.live).toEqual(live);
    expect('live' in buildBackup([], players, T0, undefined, null)).toBe(false);
    // Lead-Handy der ersten Version: ohne Organisator-Schlüssel, keine Mannschaft mehr
    const lead = { ...live, orgKey: undefined, teams: [] };
    const leadBackup = JSON.parse(JSON.stringify(buildBackup([], players, T0, undefined, lead))) as unknown;
    expect(validate(leadBackup)).toBe(true);
    const back = parseBackup(JSON.stringify(leadBackup));
    expect(back.ok && back.backup.live).toEqual({ ...lead, orgKey: undefined });
  });

  it('beschädigter Live-Spieltag wird abgelehnt (Schema und Prüfung)', () => {
    const cred = live.teams[0]!;
    const broken: unknown[] = [
      'x',
      { ...live, v: 2 },
      { ...live, topic: 'kurz' },
      { ...live, viewKey: 'x' },
      { ...live, orgPub: B43 },
      { ...live, orgKey: { d: 'x', x: B43, y: B43 } },
      { ...live, config: { d: '', s: SIG } },
      { ...live, createdAt: 'gestern' },
      { ...live, teams: 'E1' },
      { ...live, teams: [{ ...cred, key: '' }] },
      { ...live, teams: [{ ...cred, name: 'x'.repeat(41) }] },
      { ...live, teams: [{ ...cred, homeColor: 'pink' }] },
      { ...live, teams: [{ ...cred, awayColor: 'pink' }] },
      { ...live, teams: [{ ...cred, leadKey: {} }] },
      { ...live, teams: [{ ...cred, cert: {} }] },
      { ...live, teams: [{ ...cred, sends: 'ja' }] },
      { ...live, teams: [cred, cred] },
      { ...live, teams: Array.from({ length: 7 }, (_, i) => ({ ...cred, key: `E${i}` })) },
    ];
    for (const l of broken) {
      const text = JSON.stringify({ ...buildBackup([], players, T0), live: l });
      expect(parseBackup(text)).toEqual({ ok: false, error: 'Der Live-Spieltag in der Sicherung ist beschädigt.' });
      expect(validate(JSON.parse(text)), JSON.stringify(l).slice(0, 80)).toBe(false);
    }
  });
});
