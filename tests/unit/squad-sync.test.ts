import { describe, expect, it } from 'vitest';
import {
  KID_TOMBSTONE_MS,
  MAX_KIDS,
  buildRecord,
  encodeRecord,
  mergeRecord,
  parseRecord,
  recordAt,
  stamp,
  type SquadRecord,
  type SquadState,
} from '../../src/domain/squad-sync';
import type { Player, Squad, Team } from '../../src/domain/types';

/** Spec 016 data-model.md, contracts/squad-message.md, research.md R-B3 bis R-B5: geteilte Kader abgleichen. */

const T0 = 1_794_000_000_000;
const DAY = 24 * 60 * 60_000;
const p = (id: string, name: string, number: number | null, squadId: string, x: Partial<Player> = {}): Player => ({
  id,
  name,
  number,
  deletedAt: null,
  squadId,
  ...x,
});
const team = (id: string, name: string, squadId?: string, x: Partial<Team> = {}): Team => ({
  id,
  name,
  homeColor: 'rot',
  awayColor: 'schwarz',
  lastSchema: null,
  lastSquad: [],
  lastUsedAt: 0,
  ...(squadId ? { squadId } : {}),
  ...x,
});
const LIVE = [
  { key: 'E1', name: 'Sportvg Feuerbach E1' },
  { key: 'E2', name: 'Sportvg Feuerbach E2' },
  { key: 'E3', name: 'Sportvg Feuerbach E3' },
];
const E12: Squad = { id: 'e12', name: 'E1/E2' };
const E3: Squad = { id: 'e3', name: 'E3' };
const base = (): SquadState => ({
  squads: [E12, E3],
  players: [p('max', 'Max', 7, 'e12'), p('ben', 'Ben', 9, 'e12'), p('paul', 'Paul', 4, 'e3')],
  teams: [
    team('t1', 'Sportvg Feuerbach E1', 'e12'),
    team('t2', 'Sportvg Feuerbach E2', 'e12'),
    team('t3', 'Sportvg Feuerbach E3', 'e3'),
  ],
});
/** Kader teilen (Schalter an) und stempeln wie beim Speichern. */
const shareAll = (s: SquadState, now = T0) =>
  stamp(s, { ...s, squads: s.squads.map((q) => ({ ...q, shared: true })) }, now).state;
let ids = 0;
const newId = () => `n${++ids}`;

describe('016 contracts/squad-message.md Meldung bauen und prüfen', () => {
  it('kodiert und liest zurück; streng: falsche Felder → null, unbekannte ignoriert', () => {
    const r: SquadRecord = { s: 'e3', n: 'E3', na: T0, sh: true, t: [['E3', T0]], k: [['paul', 'Paul', 4, false, T0]] };
    const text = encodeRecord(r);
    expect(JSON.parse(text)).toEqual({
      v: 1,
      s: 'e3',
      n: 'E3',
      na: T0,
      sh: 1,
      t: [['E3', T0]],
      k: [['paul', 'Paul', 4, 0, T0]],
    });
    expect(parseRecord(text)).toEqual(r);
    expect(parseRecord(JSON.stringify({ ...JSON.parse(text), x: 1 }))).toEqual(r);
    expect(parseRecord(encodeRecord({ ...r, sh: false, k: [['paul', 'Paul', null, true, T0]] }))).toEqual({
      ...r,
      sh: false,
      k: [['paul', 'Paul', null, true, T0]],
    });
    const raw = JSON.parse(text) as Record<string, unknown>;
    for (const bad of [
      'kein json',
      '[]',
      { ...raw, v: 2 },
      { ...raw, s: '' },
      { ...raw, s: 'ä' },
      { ...raw, n: '' },
      { ...raw, n: 'x'.repeat(21) },
      { ...raw, na: -1 },
      { ...raw, sh: 2 },
      { ...raw, t: 'E3' },
      { ...raw, t: [['E3']] },
      { ...raw, t: [[1, T0]] },
      { ...raw, t: Array.from({ length: 7 }, (_, i) => [`E${i}`, T0]) },
      { ...raw, k: {} },
      { ...raw, k: [['paul', 'Paul', 4, 0]] },
      { ...raw, k: [['paul', '', 4, 0, T0]] },
      { ...raw, k: [['paul', 'P'.repeat(25), 4, 0, T0]] },
      { ...raw, k: [['paul', 'Paul', 100, 0, T0]] },
      { ...raw, k: [['paul', 'Paul', 4, 2, T0]] },
      { ...raw, k: [['paul', 'Paul', 4, 0, 1.5]] },
      { ...raw, k: Array.from({ length: MAX_KIDS + 1 }, (_, i) => [`k${i}`, 'Max', null, 0, T0]) },
    ])
      expect(parseRecord(typeof bad === 'string' ? bad : JSON.stringify(bad)), JSON.stringify(bad)).toBeNull();
  });

  it('at der Meldung: größter Zeitstempel (Name, Mannschaften, Kinder), mindestens 1', () => {
    expect(recordAt({ s: 'a', n: 'A', na: 5, sh: true, t: [['E1', 9]], k: [['x', 'X', null, false, 7]] })).toBe(9);
    expect(recordAt({ s: 'a', n: 'A', na: 0, sh: true, t: [], k: [] })).toBe(1);
  });

  it('aus dem Kader: Kinder mit Kennung, Mannschaften dieses Kaders, gelöschte bis 30 Tage', () => {
    const s = shareAll(base());
    const withGone = {
      ...s,
      players: [
        ...s.players,
        p('alt', 'Alt', null, 'e12', { deletedAt: T0, sid: 'alt', at: T0 - KID_TOMBSTONE_MS - 1 }),
        p('weg', 'Weg', 3, 'e12', { deletedAt: T0, sid: 'weg', at: T0 - DAY }),
      ],
    };
    expect(buildRecord(withGone, 'e12', LIVE, T0)).toEqual({
      s: 'e12',
      n: 'E1/E2',
      na: T0,
      sh: true,
      t: [
        ['E1', T0],
        ['E2', T0],
      ],
      k: [
        ['max', 'Max', 7, false, T0],
        ['ben', 'Ben', 9, false, T0],
        ['weg', 'Weg', 3, true, T0 - DAY],
      ],
    });
    // Ohne gemeinsame Kennung (nie geteilt) gibt es keine Meldung; unbekannter Kader ebenso.
    expect(buildRecord(base(), 'e12', LIVE, T0)).toBeNull();
    expect(buildRecord(s, 'gibtsnicht', LIVE, T0)).toBeNull();
  });

  it('höchstens 100 Kinder: die aktiven zuerst, dann die jüngsten Änderungen', () => {
    const s = shareAll(base());
    const many = Array.from({ length: MAX_KIDS + 5 }, (_, i) =>
      p(`k${i}`, `Kind${i}`, null, 'e3', { sid: `k${i}`, at: T0 + i, ...(i < 10 ? { deletedAt: T0 } : {}) }),
    );
    const r = buildRecord({ ...s, players: [...s.players, ...many] }, 'e3', LIVE, T0 + 200)!;
    expect(r.k).toHaveLength(MAX_KIDS);
    expect(r.k.filter((k) => k[3]).map((k) => k[0])).toEqual(['k6', 'k7', 'k8', 'k9']);
    expect(r.k[0]![0]).toBe('paul');
  });
});

describe('016 R-B5 Stempeln beim Speichern', () => {
  it('Teilen einschalten: Kader und Kinder bekommen Kennung und Zeitstempel', () => {
    const r = stamp(base(), { ...base(), squads: [{ ...E12, shared: true }, E3] }, T0);
    expect(r.changed).toEqual(['e12']);
    expect(r.state.squads[0]).toEqual({ ...E12, shared: true, sid: 'e12', at: T0 });
    expect(r.state.players.filter((x) => x.squadId === 'e12').every((x) => x.sid === x.id && x.at === T0)).toBe(true);
    expect(r.state.players.find((x) => x.id === 'paul')).toEqual(p('paul', 'Paul', 4, 'e3'));
    expect(r.gone).toEqual([]);
  });

  it('nur geänderte Kinder geteilter Kader; verschoben stempelt beide Kader', () => {
    const s = shareAll(base());
    const next: SquadState = {
      ...s,
      players: [
        ...s.players.map((x) => (x.id === 'max' ? { ...x, number: 17 } : x.id === 'ben' ? { ...x, squadId: 'e3' } : x)),
        p('neu', 'Leo', 12, 'e3'),
      ],
    };
    const r = stamp(s, next, T0 + 5);
    expect(r.changed.sort()).toEqual(['e12', 'e3']);
    const get = (id: string) => r.state.players.find((x) => x.id === id)!;
    expect([get('max').at, get('ben').at, get('neu').at, get('paul').at]).toEqual([T0 + 5, T0 + 5, T0 + 5, T0]);
    expect(get('neu').sid).toBe('neu');
    // Nichts geändert: nichts zu senden.
    expect(stamp(s, s, T0 + 9).changed).toEqual([]);
  });

  it('nicht geteilte Kader bleiben ohne Stempel; ein Kind in einen nicht geteilten Kader verschieben stempelt den alten', () => {
    const s = stamp(base(), { ...base(), squads: [{ ...E12, shared: true }, E3] }, T0).state;
    const r1 = stamp(s, { ...s, players: s.players.map((x) => (x.id === 'paul' ? { ...x, number: 5 } : x)) }, T0 + 1);
    expect(r1.changed).toEqual([]);
    expect(r1.state.players.find((x) => x.id === 'paul')!.at).toBeUndefined();
    const r2 = stamp(
      s,
      { ...s, players: s.players.map((x) => (x.id === 'max' ? { ...x, squadId: 'e3' } : x)) },
      T0 + 2,
    );
    expect(r2.changed).toEqual(['e12']);
  });

  it('Name, Schalter aus, Zuordnung einer Mannschaft, gelöschter geteilter Kader', () => {
    const s = shareAll(base());
    const renamed = stamp(
      s,
      { ...s, squads: s.squads.map((q) => (q.id === 'e3' ? { ...q, name: 'E3 Halle' } : q)) },
      T0 + 1,
    );
    expect(renamed.changed).toEqual(['e3']);
    expect(renamed.state.squads[1]!.at).toBe(T0 + 1);
    const off = stamp(s, { ...s, squads: s.squads.map((q) => (q.id === 'e3' ? { ...q, shared: false } : q)) }, T0 + 2);
    expect(off.changed).toEqual(['e3']);
    expect(off.state.squads[1]).toMatchObject({ shared: false, at: T0 + 2, sid: 'e3' });
    const moved = stamp(s, { ...s, teams: s.teams.map((t) => (t.id === 't2' ? { ...t, squadId: 'e3' } : t)) }, T0 + 3);
    expect(moved.changed.sort()).toEqual(['e12', 'e3']);
    expect(moved.state.teams[1]!.squadAt).toBe(T0 + 3);
    const unsharedTeam = stamp(base(), { ...base(), teams: base().teams.map((t) => ({ ...t, squadId: 'e3' })) }, T0);
    expect(unsharedTeam.changed).toEqual([]);
    expect(unsharedTeam.state.teams[0]!.squadAt).toBe(T0);
    // Ein leerer geteilter Kader wird gelöscht: die anderen erfahren "nicht mehr geteilt".
    const empty = { ...s, players: s.players.filter((x) => x.squadId !== 'e3') };
    const removed = stamp(empty, { ...empty, squads: [s.squads[0]!] }, T0 + 4);
    expect(removed.gone).toEqual([{ s: 'e3', n: 'E3', na: T0 + 4, sh: false, t: [], k: [] }]);
    // Ein nie geteilter Kader verschwindet ohne Meldung.
    expect(stamp(base(), { ...base(), squads: [E12] }, T0).gone).toEqual([]);
  });
});

describe('016 R-B3 FR-B07 FR-B08 Zusammenführen beim Empfang', () => {
  const sender = shareAll(base());
  const rec = (id: string, s: SquadState = sender) => buildRecord(s, id, LIVE, T0)!;
  const fresh = (): SquadState => ({
    squads: [{ id: 'kader', name: 'Kader' }],
    players: [],
    teams: base().teams.map((t) => ({ ...t, squadId: undefined })),
  });

  it('US2: neues Handy übernimmt Kader, Kinder und Zuordnung; der leere Vorgabe-Kader verschwindet', () => {
    let s = fresh();
    const a = mergeRecord(s, rec('e12'), LIVE, T0, newId);
    expect(a).toMatchObject({ changed: true, republish: [], full: null, adopted: true });
    s = a.state;
    const b = mergeRecord(s, rec('e3'), LIVE, T0, newId);
    s = b.state;
    expect(s.squads.map((q) => [q.name, q.sid, q.shared])).toEqual([
      ['E1/E2', 'e12', true],
      ['E3', 'e3', true],
    ]);
    expect(s.players.map((x) => [x.id, x.name, x.number, x.squadId])).toEqual([
      ['max', 'Max', 7, 'e12'],
      ['ben', 'Ben', 9, 'e12'],
      ['paul', 'Paul', 4, 'e3'],
    ]);
    expect(s.teams.map((t) => [t.squadId, t.squadAt])).toEqual([
      ['e12', T0],
      ['e12', T0],
      ['e3', T0],
    ]);
    // Dieselbe Meldung noch einmal: nichts ändert sich, nichts nachzusenden.
    expect(mergeRecord(s, rec('e3'), LIVE, T0, newId)).toMatchObject({ changed: false, republish: [], adopted: false });
  });

  it('US2-S3: gleichnamiger eigener Kader wird einmal zusammengeführt (Erkennung wie "Liste einfügen")', () => {
    const own: SquadState = {
      squads: [{ id: 'mein', name: 'e3' }],
      players: [p('l1', 'Paul', 14, 'mein'), p('l2', 'Leo', null, 'mein'), p('l3', 'Maxi Mü.', 8, 'mein')],
      teams: [],
    };
    const incoming: SquadRecord = {
      s: 'e3',
      n: 'E3',
      na: T0,
      sh: true,
      t: [],
      k: [
        ['paul', 'Paul', 4, false, T0],
        ['leo', 'Leo', 11, false, T0],
        ['maxi', 'Maxi Mü.', 8, false, T0],
        ['tom', 'Tom', 3, false, T0],
      ],
    };
    const r = mergeRecord(own, incoming, LIVE, T0, newId);
    expect(r.adopted).toBe(true);
    expect(r.state.squads).toEqual([{ id: 'mein', name: 'e3', sid: 'e3', shared: true, at: T0 }]);
    expect(r.state.players.map((x) => [x.id, x.name, x.number, x.sid])).toEqual([
      ['l1', 'Paul', 4, 'paul'],
      ['l2', 'Leo', 11, 'leo'],
      ['l3', 'Maxi Mü.', 8, 'maxi'],
      ['tom', 'Tom', 3, 'tom'],
    ]);
    // Paul hatte die Nummer 14: anderer Vorname-Nummer-Treffer ist nicht nötig, gleicher Name genügt.
    expect(r.republish).toEqual([]);
  });

  it('jüngere Angabe gewinnt je Kind; gleich bleibt lokal; Weglassen löscht nicht; gelöscht kommt an', () => {
    let s = mergeRecord(fresh(), rec('e12'), LIVE, T0, newId).state;
    const newer: SquadRecord = {
      ...rec('e12'),
      k: [
        ['max', 'Max', 17, false, T0 + 10],
        ['ben', 'Benjamin', 9, false, T0],
      ],
    };
    s = mergeRecord(s, newer, LIVE, T0, newId).state;
    expect(s.players.map((x) => [x.name, x.number])).toEqual([
      ['Max', 17],
      ['Ben', 9],
    ]);
    const deleted = mergeRecord(s, { ...newer, k: [['ben', 'Ben', 9, true, T0 + 20]] }, LIVE, T0 + 30, newId);
    expect(deleted.state.players.find((x) => x.id === 'ben')!.deletedAt).toBe(T0 + 30);
    const revived = mergeRecord(
      deleted.state,
      { ...newer, k: [['ben', 'Ben', 9, false, T0 + 40]] },
      LIVE,
      T0 + 50,
      newId,
    );
    expect(revived.state.players.find((x) => x.id === 'ben')!.deletedAt).toBeNull();
    // Unbekanntes, gelöschtes Kind wird nicht angelegt.
    expect(
      mergeRecord(s, { ...newer, k: [['geist', 'Geist', null, true, T0 + 60]] }, LIVE, T0, newId).state.players,
    ).toHaveLength(2);
  });

  it('FR-B07: hat das Handy Neueres oder mehr, sendet es nach', () => {
    const s = mergeRecord(fresh(), rec('e12'), LIVE, T0, newId).state;
    const local = stamp(
      s,
      {
        ...s,
        players: [...s.players.map((x) => (x.id === 'max' ? { ...x, number: 99 } : x)), p('leo', 'Leo', 1, 'e12')],
      },
      T0 + 5,
    ).state;
    const r = mergeRecord(local, rec('e12'), LIVE, T0 + 6, newId);
    expect(r.republish).toEqual(['e12']);
    expect(r.changed).toBe(false);
    // Kind lokal in einen anderen geteilten Kader verschoben (jünger): dessen Kader wird nachgesendet.
    const both = mergeRecord(s, rec('e3'), LIVE, T0, newId).state;
    const moved = stamp(
      both,
      { ...both, players: both.players.map((x) => (x.id === 'ben' ? { ...x, squadId: 'e3' } : x)) },
      T0 + 7,
    ).state;
    expect(mergeRecord(moved, rec('e12'), LIVE, T0 + 8, newId).republish).toEqual(['e3']);
  });

  it('Kader-Name und Schalter: jüngere Angabe; nicht mehr geteilt kommt an; kollidierender Name bleibt', () => {
    let s = mergeRecord(fresh(), rec('e12'), LIVE, T0, newId).state;
    s = mergeRecord(s, rec('e3'), LIVE, T0, newId).state;
    const renamed = mergeRecord(s, { ...rec('e3'), n: 'E3 Halle', na: T0 + 1 }, LIVE, T0, newId);
    expect(renamed.state.squads[1]!.name).toBe('E3 Halle');
    const clash = mergeRecord(s, { ...rec('e3'), n: 'e1/e2', na: T0 + 1 }, LIVE, T0, newId);
    expect(clash.state.squads[1]!.name).toBe('E3');
    const off = mergeRecord(s, { ...rec('e3'), sh: false, na: T0 + 2 }, LIVE, T0, newId);
    expect(off.state.squads[1]!.shared).toBe(false);
    expect(off.state.players.find((x) => x.id === 'paul')).toBeDefined();
    const older = mergeRecord(renamed.state, { ...rec('e3'), na: T0 - 1 }, LIVE, T0, newId);
    expect(older.republish).toEqual(['e3']);
    // Nicht mehr geteilt, hier unbekannt: nichts zu tun.
    expect(mergeRecord(fresh(), { ...rec('e3'), sh: false }, LIVE, T0, newId)).toMatchObject({
      changed: false,
      adopted: false,
    });
  });

  it('Mannschaft: jüngere Zuordnung gewinnt; lokal jüngere sendet nach; unbekannte Mannschaft bleibt außen vor', () => {
    let s = mergeRecord(fresh(), rec('e12'), LIVE, T0, newId).state;
    s = mergeRecord(s, rec('e3'), LIVE, T0, newId).state;
    const e2to3 = mergeRecord(
      s,
      {
        ...rec('e3'),
        t: [
          ['E2', T0 + 5],
          ['E3', T0],
          ['X9', T0 + 5],
        ],
      },
      LIVE,
      T0,
      newId,
    );
    expect(e2to3.state.teams[1]!.squadId).toBe('e3');
    const local = stamp(
      s,
      { ...s, teams: s.teams.map((t) => (t.id === 't3' ? { ...t, squadId: 'e12' } : t)) },
      T0 + 9,
    ).state;
    expect(mergeRecord(local, rec('e3'), LIVE, T0, newId).republish).toEqual(['e12']);
    // Lokal diesem Kader zugeordnet, in der Meldung fehlt die Mannschaft: nachsenden.
    expect(mergeRecord(s, { ...rec('e3'), t: [] }, LIVE, T0, newId).republish).toEqual(['e3']);
  });

  it('kein Platz (6 Kader) und erzeugte Kennung bei Kollision', () => {
    const six: SquadState = {
      squads: Array.from({ length: 6 }, (_, i) => ({ id: `q${i}`, name: `K${i}` })),
      players: [p('x', 'X', null, 'q0')],
      teams: [],
    };
    expect(mergeRecord(six, rec('e3'), LIVE, T0, newId)).toMatchObject({ changed: false, full: 'E3' });
    const taken: SquadState = {
      squads: [{ id: 'e3', name: 'Andere' }],
      players: [p('paul', 'Pauline', null, 'e3')],
      teams: [],
    };
    const r = mergeRecord(taken, rec('e3'), LIVE, T0, () => 'frei');
    expect(r.state.squads.map((q) => q.id)).toEqual(['e3', 'frei']);
    expect(r.state.players.map((x) => [x.id, x.sid])).toEqual([
      ['paul', undefined],
      ['frei', 'paul'],
    ]);
  });
});

describe('016 Randfälle beim Bauen, Stempeln und Zusammenführen', () => {
  it('Mannschaft ohne eigene Entsprechung fehlt in der Meldung; neue Mannschaft wird gestempelt', () => {
    const s = shareAll(base());
    const live = [...LIVE, { key: 'E4', name: 'Sportvg Feuerbach E4' }];
    expect(buildRecord(s, 'e3', live, T0)!.t).toEqual([['E3', T0]]);
    const added = stamp(s, { ...s, teams: [...s.teams, team('t4', 'Sportvg Feuerbach E4', 'e3')] }, T0 + 1);
    expect(added.state.teams[3]!.squadAt).toBeUndefined();
    expect(added.changed).toEqual([]);
  });

  it('Verbinden: Vorname und Nummer erkennen, vergebene Kennungen und andere Kader nicht anfassen', () => {
    const own: SquadState = {
      squads: [
        { id: 'a', name: 'E1/E2' },
        { id: 'b', name: 'E3' },
      ],
      players: [
        p('l1', 'Max Mü.', 7, 'b'),
        p('l2', 'Leon', null, 'b'),
        p('l3', 'Ben', 9, 'a'),
        p('l4', 'Tom', 3, 'b', { sid: 'schon' }),
      ],
      teams: [],
    };
    const incoming: SquadRecord = {
      s: 'e3',
      n: 'E3',
      na: T0,
      sh: true,
      t: [],
      k: [
        ['max', 'Max M.', 7, false, T0],
        ['leo', 'Leo', null, false, T0],
        ['schon', 'Tom', 3, false, T0],
        ['ben', 'Ben', 9, false, T0],
      ],
    };
    const r = mergeRecord(own, incoming, LIVE, T0 + 1, newId);
    const get = (id: string) => r.state.players.find((x) => x.id === id)!;
    expect(r.state.squads.map((q) => q.sid)).toEqual([undefined, 'e3']);
    expect(get('l1')).toMatchObject({ sid: 'max', name: 'Max M.' });
    // "Leon" ist nicht "Leo": bleibt eigenes Kind, gehört ab jetzt dazu und geht hinaus.
    expect(get('l2')).toMatchObject({ sid: 'l2', at: T0 + 1 });
    expect(get('l3').sid).toBeUndefined();
    expect(r.state.players.find((x) => x.sid === 'ben')!.squadId).toBe('b');
    expect(r.republish).toEqual(['e3']);
  });

  it('lokal jüngeres Kind oder jüngere Zuordnung in einem nicht geteilten Kader: nichts nachzusenden', () => {
    const s0 = mergeRecord(
      {
        squads: [{ id: 'kader', name: 'Kader' }],
        players: [],
        teams: base().teams.map((t) => ({ ...t, squadId: undefined })),
      },
      buildRecord(shareAll(base()), 'e3', LIVE, T0)!,
      LIVE,
      T0,
      newId,
    ).state;
    const s = { ...s0, squads: [...s0.squads, { id: 'privat', name: 'Privat' }] };
    const local = stamp(
      s,
      {
        ...s,
        players: s.players.map((x) => (x.id === 'paul' ? { ...x, squadId: 'privat', at: T0 + 5 } : x)),
        teams: s.teams.map((t) => (t.id === 't3' ? { ...t, squadId: 'privat', squadAt: T0 + 5 } : t)),
      },
      T0 + 5,
    ).state;
    const r = mergeRecord(local, buildRecord(shareAll(base()), 'e3', LIVE, T0)!, LIVE, T0 + 6, newId);
    expect(r.republish).toEqual([]);
  });
});
