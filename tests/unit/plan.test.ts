import { describe, expect, it } from 'vitest';
import {
  activeClaim,
  addEntry,
  addDays,
  checkPlanInput,
  claimLabel,
  chunkEntries,
  deleteEntry,
  emptyPlan,
  encodePayload,
  entryDetail,
  entryState,
  entryTitle,
  entryWhen,
  formatPlanDate,
  formatPlanDateLong,
  formatPlanDateShort,
  isFull,
  markPending,
  markSent,
  matchText,
  MAX_PLAN,
  myClaims,
  mergeEntries,
  mergeList,
  needsRefresh,
  nextSaturday,
  noteSeen,
  parsePayload,
  pickable,
  planFor,
  planView,
  pruneEntries,
  prunePlan,
  REFRESH_MS,
  setCancelled,
  setClaim,
  setGame,
  setScore,
  staleEntries,
  todayKey,
  trainerName,
  updateEntry,
  type PlanInput,
} from '../../src/domain/plan';
import { MAX_PLAN_SIGNED } from '../../src/domain/live-validate';
import type { PlanEntry, PlanStore } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 0, 0); // Sa 07.11.2026, 10:00 in Berlin
const TODAY = '2026-11-07';
const TOPIC = 'topic0000000000000001';
const ORG = 'org-pub';

const input = (over: Partial<PlanInput> = {}): PlanInput => ({
  team: 'E1',
  date: '2026-11-14',
  time: '12:00',
  venue: 'home',
  opponent: 'TSV Musterstadt',
  competition: 'Kreisstaffel',
  schema: { sections: 2, sectionMinutes: 25 },
  ...over,
});

const entry = (over: Partial<PlanEntry> = {}): PlanEntry => ({
  id: 'a1',
  team: 'E1',
  date: '2026-11-14',
  time: '12:00',
  venue: 'home',
  opponent: 'TSV Musterstadt',
  competition: 'Kreisstaffel',
  schema: null,
  cancelled: false,
  deleted: false,
  updatedAt: T0,
  ...over,
});

const storeWith = (entries: PlanEntry[], over: Partial<PlanStore> = {}): PlanStore => ({
  ...emptyPlan(TOPIC, ORG),
  entries,
  ...over,
});

describe('015 US1 Spielplan: Eingabe', () => {
  it('FR-P02: gültige Eingabe wird getrimmt, leere Felder werden leer bzw. null', () => {
    const r = checkPlanInput(input({ opponent: '  SV Beispielhausen ', competition: ' ', time: '', schema: null }), [
      'E1',
      'E2',
    ]);
    expect(r).toEqual({
      ok: true,
      value: input({ opponent: 'SV Beispielhausen', competition: '', time: '', schema: null }),
    });
  });

  it('FR-P02: Mannschaft, Datum, Anstoß, Längen und Spielzeit werden geprüft', () => {
    const r = checkPlanInput(
      input({
        team: 'E9',
        date: '2026-02-30',
        time: '25:00',
        opponent: 'x'.repeat(41),
        competition: 'y'.repeat(41),
        schema: { sections: 5, sectionMinutes: 25 },
      }),
      ['E1'],
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(['competition', 'date', 'opponent', 'schema', 'team', 'time']);
  });

  it('FR-P02: Datum in falschem Format und Minuten außerhalb 1 bis 60', () => {
    const r = checkPlanInput(input({ date: '14.11.2026', schema: { sections: 2, sectionMinutes: 61 } }), ['E1']);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(['date', 'schema']);
  });
});

describe('015 US1 Spielplan: Ändern', () => {
  it('US1-S1: neues Planspiel bekommt Kennung und Zeitstempel und ist unversandt', () => {
    const r = addEntry(emptyPlan(TOPIC, ORG), input(), 'k1', T0);
    expect(r.entry).toEqual({
      id: 'k1',
      team: 'E1',
      date: '2026-11-14',
      time: '12:00',
      venue: 'home',
      opponent: 'TSV Musterstadt',
      competition: 'Kreisstaffel',
      schema: { sections: 2, sectionMinutes: 25 },
      cancelled: false,
      deleted: false,
      updatedAt: T0,
    });
    expect(r.store.entries).toHaveLength(1);
    expect(r.store.pending).toEqual(['k1']);
  });

  it('US1-S2: ohne Anstoß und Gegner gespeichert', () => {
    const r = addEntry(emptyPlan(TOPIC, ORG), input({ time: '', opponent: '' }), 'k1', T0);
    expect(r.entry.time).toBeNull();
    expect(entryTitle(r.entry)).toBe('E1 – (Gegner offen)');
  });

  it('US1-S3: Ändern hält die Kennung und erhöht den Zeitstempel streng', () => {
    const s = storeWith([entry({ updatedAt: T0 + 5000 })]);
    const r = updateEntry(s, 'a1', input({ opponent: 'FC Probestadt', venue: 'away' }), T0);
    expect(r?.entry).toMatchObject({ id: 'a1', opponent: 'FC Probestadt', venue: 'away', updatedAt: T0 + 5001 });
    expect(r?.store.pending).toEqual(['a1']);
    expect(updateEntry(s, 'fehlt', input(), T0)).toBeNull();
    const two = updateEntry(storeWith([entry(), entry({ id: 'b2' })]), 'b2', input({ opponent: 'Neu' }), T0);
    expect(two?.store.entries.map((e) => e.opponent)).toEqual(['TSV Musterstadt', 'Neu']);
  });

  it('US1-S7: absagen und wieder ansetzen', () => {
    const s = storeWith([entry()]);
    const off = setCancelled(s, 'a1', true, T0 + 1);
    expect(off?.entry.cancelled).toBe(true);
    const on = setCancelled(off!.store, 'a1', false, T0 + 2);
    expect(on?.entry.cancelled).toBe(false);
    expect(setCancelled(s, 'fehlt', true, T0)).toBeNull();
  });

  it('US1-S3: Löschen hinterlässt einen Grabstein, der in der Ansicht fehlt', () => {
    const s = storeWith([entry()]);
    const r = deleteEntry(s, 'a1', T0 + 1);
    expect(r?.entry).toMatchObject({ id: 'a1', deleted: true, updatedAt: T0 + 1 });
    expect(planView(r!.store, TODAY)).toEqual({ upcoming: [], past: [] });
    expect(deleteEntry(s, 'fehlt', T0)).toBeNull();
    expect(updateEntry(r!.store, 'a1', input(), T0 + 2)).toBeNull();
  });

  it('pending ohne Doppelungen, markSent entfernt nur gesendete', () => {
    const s = markPending(storeWith([entry()], { pending: ['a1'] }), ['a1', 'b2']);
    expect(s.pending).toEqual(['a1', 'b2']);
    const sent = markSent(s, ['a1'], T0);
    expect(sent.pending).toEqual(['b2']);
    expect(sent.seen).toEqual({ a1: T0 });
  });
});

describe('015 US1 Spielplan: Zusammenführen (FR-P04)', () => {
  it('US1-S4: jüngere Änderung gewinnt, ältere und gleich alte ändern nichts', () => {
    const s = storeWith([entry({ updatedAt: T0 + 10 })]);
    const older = mergeEntries(s, [entry({ updatedAt: T0, opponent: 'Alt' })]);
    expect(older.changed).toEqual([]);
    expect(older.store).toBe(s);
    const same = mergeEntries(s, [entry({ updatedAt: T0 + 10, opponent: 'Gleich' })]);
    expect(same.changed).toEqual([]);
    const newer = mergeEntries(s, [entry({ updatedAt: T0 + 20, opponent: 'Neu' })]);
    expect(newer.store.entries[0]?.opponent).toBe('Neu');
    expect(newer.changed).toHaveLength(1);
  });

  it('US1-S4: Änderungen an verschiedenen Spielen bleiben beide erhalten', () => {
    const s = storeWith([entry({ id: 'a1' })]);
    const r = mergeEntries(s, [entry({ id: 'b2', team: 'E2' })]);
    expect(r.store.entries.map((e) => e.id).sort()).toEqual(['a1', 'b2']);
  });

  it('gelöschte Spiele kommen durch ältere Meldungen nicht zurück', () => {
    const s = storeWith([entry({ deleted: true, updatedAt: T0 + 10 })]);
    expect(mergeEntries(s, [entry({ updatedAt: T0 + 5 })]).changed).toEqual([]);
  });

  it('FR-P11: eine jüngere Änderung ohne Verknüpfung behält das angelegte Spiel', () => {
    const s = storeWith([entry({ gameId: 'g1', updatedAt: T0 })]);
    const r = mergeEntries(s, [entry({ time: '11:00', updatedAt: T0 + 1 })]);
    expect(r.store.entries[0]).toMatchObject({ time: '11:00', gameId: 'g1' });
  });

  it('übernommene Einträge werden nicht als unversandt markiert', () => {
    const r = mergeEntries(emptyPlan(TOPIC, ORG), [entry()]);
    expect(r.store.pending).toEqual([]);
  });
});

describe('015 US1 Spielplan: Ansicht', () => {
  it('US1-S6: kommende nach Datum, Anstoß (ohne Anstoß zuletzt), Mannschaft; vergangene neueste zuerst', () => {
    const s = storeWith([
      entry({ id: 'p1', date: '2026-11-01', time: '10:00' }),
      entry({ id: 'p2', date: '2026-11-06', time: null }),
      entry({ id: 'p3', date: '2026-11-06', time: '11:00' }),
      entry({ id: 'u1', date: '2026-11-14', time: '12:00', team: 'E2' }),
      entry({ id: 'u2', date: '2026-11-14', time: null }),
      entry({ id: 'u3', date: '2026-11-14', time: '12:00', team: 'E1' }),
      entry({ id: 'u4', date: '2026-11-14', time: '11:00', team: 'E3' }),
      entry({ id: 'u5', date: '2026-11-15', time: null, team: 'E2' }),
      entry({ id: 'u6', date: '2026-11-15', time: null, team: 'E1' }),
      entry({ id: 't1', date: TODAY, time: '09:00' }),
      entry({ id: 'x1', date: '2026-11-20', deleted: true }),
    ]);
    const v = planView(s, TODAY);
    expect(v.upcoming.map((g) => [g.date, g.entries.map((e) => e.id)])).toEqual([
      ['2026-11-07', ['t1']],
      ['2026-11-14', ['u4', 'u3', 'u1', 'u2']],
      ['2026-11-15', ['u6', 'u5']],
    ]);
    expect(v.past.map((e) => e.id)).toEqual(['p3', 'p2', 'p1']);
    const later = planView(storeWith([entry({ id: 'b', time: '13:00' }), entry({ id: 'a', time: '10:00' })]), TODAY);
    expect(later.upcoming[0]?.entries.map((e) => e.id)).toEqual(['a', 'b']);
    const ordered = planView(storeWith([entry({ id: 'a', time: '10:00' }), entry({ id: 'b', time: '13:00' })]), TODAY);
    expect(ordered.upcoming[0]?.entries.map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('015 US1 Spielplan: Kürzen und Grenzen', () => {
  it('Grabsteine bleiben 30 Tage nach ihrem Datum, vergangene Spiele werden über 100 gekürzt (älteste zuerst)', () => {
    const past = Array.from({ length: MAX_PLAN + 2 }, (_, i) =>
      entry({ id: `p${i}`, date: addDays('2026-10-01', i % 30), time: null }),
    );
    const s = storeWith([
      ...past,
      entry({ id: 'x-alt', date: '2026-10-07', deleted: true }),
      entry({ id: 'x-neu', date: '2026-10-08', deleted: true }),
    ]);
    const r = prunePlan(s, TODAY);
    const ids = r.entries.map((e) => e.id);
    expect(ids).not.toContain('x-alt');
    expect(ids).toContain('x-neu');
    expect(r.entries.filter((e) => !e.deleted)).toHaveLength(MAX_PLAN);
    expect(ids).not.toContain('p0');
    expect(prunePlan(storeWith([entry()]), TODAY).entries).toHaveLength(1);
  });

  it('isFull: 100 kommende Spiele lassen kein weiteres zu', () => {
    const many = Array.from({ length: MAX_PLAN }, (_, i) => entry({ id: `u${i}` }));
    expect(isFull(storeWith(many), TODAY)).toBe(true);
    expect(isFull(storeWith(many.slice(1)), TODAY)).toBe(false);
  });
});

describe('015 FR-P07 Erneut senden', () => {
  it('je Planspiel ab heute nach 6 Stunden ohne Meldung, oder bei Unversandtem', () => {
    const s = storeWith([entry()], { seen: { a1: T0 } });
    expect(needsRefresh(s, T0 + REFRESH_MS - 1, TODAY)).toBe(false);
    expect(needsRefresh(s, T0 + REFRESH_MS, TODAY)).toBe(true);
    expect(needsRefresh(storeWith([entry({ date: '2026-11-01' })]), T0, TODAY)).toBe(false);
    expect(needsRefresh(storeWith([], { pending: ['a1'], seen: {} }), T0, TODAY)).toBe(true);
  });

  it('nur veraltete Planspiele gehen erneut hinaus, Grabsteine ab heute eingeschlossen', () => {
    const s = storeWith(
      [
        entry({ id: 'frisch' }),
        entry({ id: 'alt' }),
        entry({ id: 'weg', deleted: true }),
        entry({ id: 'vorbei', date: '2026-11-01' }),
      ],
      { seen: { frisch: T0 } },
    );
    expect(staleEntries(s, T0 + 1000, TODAY).map((e) => e.id)).toEqual(['alt', 'weg']);
    // Kennungen wie "constructor" lesen keinen Wert aus dem Objekt-Prototyp (Sicherheitsreview)
    expect(staleEntries(storeWith([entry({ id: 'constructor' })]), T0, TODAY).map((e) => e.id)).toEqual([
      'constructor',
    ]);
  });

  it('noteSeen: empfangene Planspiele mit gleichem Stand zählen als frisch, ältere nicht', () => {
    const s = storeWith([entry({ id: 'a1', updatedAt: T0 + 5 }), entry({ id: 'b2', updatedAt: T0 })]);
    const r = noteSeen(
      s,
      [entry({ id: 'a1', updatedAt: T0 }), entry({ id: 'b2', updatedAt: T0 }), entry({ id: 'neu' })],
      T0 + 9,
    );
    expect(r.seen).toEqual({ b2: T0 + 9 });
  });

  it('noteSeen: eine ältere Meldung (beim Öffnen nachgelesen) macht den Zeitpunkt nicht früher', () => {
    const s = { ...storeWith([entry({ id: 'a1', updatedAt: T0 })]), seen: { a1: T0 + 100 } };
    expect(noteSeen(s, [entry({ id: 'a1', updatedAt: T0 })], T0 + 50).seen).toEqual({ a1: T0 + 100 });
    expect(noteSeen(s, [entry({ id: 'a1', updatedAt: T0 })], T0 + 200).seen).toEqual({ a1: T0 + 200 });
  });

  it('prunePlan entfernt Zeitpunkte gekürzter Planspiele', () => {
    const s = storeWith([entry({ id: 'x', date: '2026-09-01', deleted: true }), entry({ id: 'a1' })], {
      seen: { x: T0, a1: T0 },
    });
    expect(prunePlan(s, TODAY).seen).toEqual({ a1: T0 });
  });
});

describe('015 Plan-Meldung (contracts/plan-message.md)', () => {
  it('kodiert kompakt und liest wieder ein, auch Grabsteine', () => {
    const full = entry({ schema: { sections: 3, sectionMinutes: 25 }, cancelled: true, venue: 'away' });
    const bare = entry({ id: 'b2', time: null, opponent: '', competition: '' });
    const tomb = entry({ id: 'x1', deleted: true });
    const payload = encodePayload([full, bare, tomb]);
    expect(payload).toEqual({
      v: 1,
      e: [
        {
          i: 'a1',
          k: 'E1',
          d: '2026-11-14',
          u: T0,
          h: 0,
          t: '12:00',
          o: 'TSV Musterstadt',
          w: 'Kreisstaffel',
          z: [3, 25],
          c: 1,
        },
        { i: 'b2', k: 'E1', d: '2026-11-14', u: T0, h: 1 },
        { i: 'x1', k: 'E1', d: '2026-11-14', u: T0, x: 1 },
      ],
    });
    expect(parsePayload(JSON.stringify(payload))).toEqual([
      full,
      bare,
      { ...entry({ id: 'x1' }), deleted: true, time: null, opponent: '', competition: '' },
    ]);
  });

  it('ignoriert unbekannte Schlüssel', () => {
    const p = { v: 1, e: [{ i: 'a1', k: 'E1', d: '2026-11-14', u: T0, h: 1, neu: 'egal' }] };
    expect(parsePayload(JSON.stringify(p))?.[0]?.id).toBe('a1');
  });

  it.each([
    ['kein JSON', '{'],
    ['falsche Version', JSON.stringify({ v: 2, e: [] })],
    ['kein Objekt', JSON.stringify([1])],
    ['leere Liste', JSON.stringify({ v: 1, e: [] })],
    ['zu viele', JSON.stringify({ v: 1, e: Array.from({ length: 101 }, () => ({})) })],
    ['Kennung', JSON.stringify({ v: 1, e: [{ i: 'a b', k: 'E1', d: '2026-11-14', u: 1, h: 1 }] })],
    ['Mannschaft', JSON.stringify({ v: 1, e: [{ i: 'a1', k: '', d: '2026-11-14', u: 1, h: 1 }] })],
    ['Datum', JSON.stringify({ v: 1, e: [{ i: 'a1', k: 'E1', d: '2026-13-01', u: 1, h: 1 }] })],
    ['Datum kein Text', JSON.stringify({ v: 1, e: [{ i: 'a1', k: 'E1', d: 5, u: 1, h: 1 }] })],
    ['Zeitstempel', JSON.stringify({ v: 1, e: [{ i: 'a1', k: 'E1', d: '2026-11-14', u: 0, h: 1 }] })],
    ['Heim', JSON.stringify({ v: 1, e: [{ i: 'a1', k: 'E1', d: '2026-11-14', u: 1, h: 2 }] })],
    ['Anstoß', JSON.stringify({ v: 1, e: [{ i: 'a1', k: 'E1', d: '2026-11-14', u: 1, h: 1, t: '9:00' }] })],
    ['Gegner', JSON.stringify({ v: 1, e: [{ i: 'a1', k: 'E1', d: '2026-11-14', u: 1, h: 1, o: 'x'.repeat(41) }] })],
    ['Wettbewerb', JSON.stringify({ v: 1, e: [{ i: 'a1', k: 'E1', d: '2026-11-14', u: 1, h: 1, w: 5 }] })],
    ['Spielzeit', JSON.stringify({ v: 1, e: [{ i: 'a1', k: 'E1', d: '2026-11-14', u: 1, h: 1, z: [0, 25] }] })],
    ['Spielzeit Form', JSON.stringify({ v: 1, e: [{ i: 'a1', k: 'E1', d: '2026-11-14', u: 1, h: 1, z: 'x' }] })],
    ['abgesagt', JSON.stringify({ v: 1, e: [{ i: 'a1', k: 'E1', d: '2026-11-14', u: 1, h: 1, c: 2 }] })],
    ['Eintrag', JSON.stringify({ v: 1, e: [null] })],
    ['Spiel', JSON.stringify({ v: 1, e: [{ i: 'a1', k: 'E1', d: '2026-11-14', u: 1, h: 1, g: 'a b' }] })],
  ])('verwirft die ganze Meldung: %s', (_name, text) => {
    expect(parsePayload(text)).toBeNull();
  });

  it('SC-P05: 100 volle Planspiele werden in Stücke ≤ 3.000 Zeichen geteilt', () => {
    const many = Array.from({ length: MAX_PLAN }, (_, i) =>
      entry({
        id: `id${String(i).padStart(6, '0')}`,
        opponent: 'Sportvg Feuerbach D3 und noch mehr Text',
        competition: 'Sparkassen Juniorcup 2026/27',
        schema: { sections: 3, sectionMinutes: 25 },
      }),
    );
    const chunks = chunkEntries(many, MAX_PLAN_SIGNED);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.flat()).toHaveLength(MAX_PLAN);
    for (const c of chunks) expect(JSON.stringify(encodePayload(c)).length).toBeLessThanOrEqual(MAX_PLAN_SIGNED);
    expect(chunkEntries([], MAX_PLAN_SIGNED)).toEqual([]);
  });
});

describe('015 Plan und Kopplung', () => {
  it('planFor liefert den gespeicherten Plan nur zum selben Live-Spieltag', () => {
    const s = storeWith([entry()]);
    expect(planFor(s, TOPIC, ORG)).toBe(s);
    expect(planFor(s, 'anderes', ORG)).toEqual(emptyPlan('anderes', ORG));
    expect(planFor(s, TOPIC, 'anderer')).toEqual(emptyPlan(TOPIC, 'anderer'));
    expect(planFor(undefined, TOPIC, ORG)).toEqual(emptyPlan(TOPIC, ORG));
  });
});

describe('015 Anzeige', () => {
  it('FR-P01: Titel und Zeile', () => {
    expect(entryTitle(entry())).toBe('E1 – TSV Musterstadt');
    expect(entryTitle(entry({ venue: 'away' }))).toBe('E1 bei TSV Musterstadt');
    expect(entryTitle(entry({ venue: 'away', opponent: '' }))).toBe('E1 – (Gegner offen)');
    expect(entryDetail(entry({ schema: { sections: 2, sectionMinutes: 25 } }))).toBe('Heim · Kreisstaffel · 2×25');
    expect(entryDetail(entry({ venue: 'away', competition: '', schema: null }))).toBe('Auswärts');
  });

  it('Datum "Sa 14.11.", heute, nächster Samstag, Tage addieren', () => {
    expect(formatPlanDate('2026-11-14')).toBe('Sa 14.11.');
    expect(formatPlanDate('2026-11-15')).toBe('So 15.11.');
    expect(formatPlanDateLong('2026-11-14')).toBe('Sa 14.11.2026');
    expect(formatPlanDateShort('2026-11-14')).toBe('Sa 14.');
    expect(todayKey(Date.UTC(2026, 10, 7, 23, 30), 'Europe/Berlin')).toBe('2026-11-08');
    expect(nextSaturday('2026-11-07')).toBe('2026-11-07');
    expect(nextSaturday('2026-11-08')).toBe('2026-11-14');
    expect(nextSaturday('2026-11-13')).toBe('2026-11-14');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('015 US2 Spiel aus dem Spielplan', () => {
  it('FR-P09: heute und die nächsten 14 Tage, ohne abgesagte, angelegte und gelöschte', () => {
    const s = storeWith([
      entry({ id: 'heute', date: TODAY, time: '12:00' }),
      entry({ id: 'frueh', date: TODAY, time: '11:00' }),
      entry({ id: 'bald', date: '2026-11-14' }),
      entry({ id: 'grenze', date: '2026-11-21' }),
      entry({ id: 'spaet', date: '2026-11-22' }),
      entry({ id: 'ab', date: TODAY, cancelled: true }),
      entry({ id: 'an', date: TODAY, gameId: 'g1' }),
      entry({ id: 'weg', date: TODAY, deleted: true }),
      entry({ id: 'alt', date: '2026-11-06' }),
    ]);
    const r = pickable(s, TODAY);
    expect(r.today.map((e) => e.id)).toEqual(['frueh', 'heute']);
    expect(r.later.map((e) => e.id)).toEqual(['bald', 'grenze']);
  });

  it('FR-P11: Verknüpfung mit dem angelegten Spiel geht als g hinaus und kommt so zurück', () => {
    const r = setGame(storeWith([entry()]), 'a1', 'game-123', T0 + 1);
    expect(r?.entry).toMatchObject({ gameId: 'game-123', updatedAt: T0 + 1 });
    expect(r?.store.pending).toEqual(['a1']);
    expect(setGame(storeWith([entry()]), 'fehlt', 'g', T0)).toBeNull();
    // abgesagt oder schon von einem anderen Handy angelegt: keine (neue) Verknüpfung
    expect(setGame(storeWith([entry({ cancelled: true })]), 'a1', 'g', T0)).toBeNull();
    expect(setGame(storeWith([entry({ gameId: 'erstes' })]), 'a1', 'zweites', T0)).toBeNull();
    expect(setGame(storeWith([entry({ gameId: 'g' })]), 'a1', 'g', T0)?.entry.gameId).toBe('g');
    const text = JSON.stringify(encodePayload([r!.entry]));
    expect(parsePayload(text)?.[0]?.gameId).toBe('game-123');
  });

  it('FR-P01: Zustand und Zeitpunkt der Zeile', () => {
    expect(entryState(entry(), TODAY)).toBe('frei');
    expect(entryState(entry({ cancelled: true, gameId: 'g' }), TODAY)).toBe('abgesagt');
    expect(entryState(entry({ gameId: 'g' }), TODAY)).toBe('angelegt');
    expect(entryState(entry({ date: '2026-11-01' }), TODAY)).toBe('');
    expect(entryWhen(entry())).toBe('Sa 14.11., 12:00');
    expect(entryWhen(entry({ time: null }))).toBe('Sa 14.11.');
  });
});

describe('015 US3 FR-P30 Endstand im Planspiel', () => {
  it('setScore trägt den Endstand beim verknüpften Planspiel ein und entfernt ihn wieder', () => {
    const s = storeWith([entry({ id: 'a1', gameId: 'g1', updatedAt: T0 }), entry({ id: 'b2' })]);
    const r = setScore(s, 'g1', { own: 2, opp: 1 }, T0 + 5)!;
    expect(r.entry).toMatchObject({ id: 'a1', score: { own: 2, opp: 1 }, updatedAt: T0 + 5 });
    expect(r.store.pending).toEqual(['a1']);
    // gleicher Stand: nichts zu tun; anderer Stand: neu
    expect(setScore(r.store, 'g1', { own: 2, opp: 1 }, T0 + 6)).toBeNull();
    expect(setScore(r.store, 'g1', { own: 3, opp: 1 }, T0 + 6)?.entry.score).toEqual({ own: 3, opp: 1 });
    // zurückgenommener Schlusspfiff
    const back = setScore(r.store, 'g1', null, T0 + 7)!;
    expect(back.entry.score).toBeUndefined();
    expect(Object.hasOwn(back.entry, 'score')).toBe(false);
    expect(setScore(back.store, 'g1', null, T0 + 8)).toBeNull();
    // unbekanntes Spiel oder gelöschtes Planspiel
    expect(setScore(s, 'g9', { own: 1, opp: 0 }, T0)).toBeNull();
    const gone = storeWith([entry({ id: 'a1', gameId: 'g1', deleted: true })]);
    expect(setScore(gone, 'g1', { own: 1, opp: 0 }, T0)).toBeNull();
  });

  it('Meldung: Endstand als s hin und zurück, ungültige Stände verwerfen die Meldung', () => {
    const e = entry({ id: 'a1', gameId: 'g1', score: { own: 0, opp: 3 } });
    expect(encodePayload([e]).e).toEqual([expect.objectContaining({ s: [0, 3], g: 'g1' })]);
    expect(parsePayload(JSON.stringify(encodePayload([e])))).toEqual([e]);
    const raw = encodePayload([entry({ id: 'a1' })]) as { e: Record<string, unknown>[] };
    for (const bad of [[1], [1, 2, 3], [-1, 0], [0, 100], [1.5, 0], 'x']) {
      expect(parsePayload(JSON.stringify({ ...raw, e: [{ ...raw.e[0], s: bad }] }))).toBeNull();
    }
  });

  it('mergeList und pruneEntries arbeiten auch ohne Plan-Speicher (Dashboard)', () => {
    const a = entry({ id: 'a1', updatedAt: T0 });
    const r = mergeList([a], [entry({ id: 'a1', updatedAt: T0 + 1, opponent: 'Neu' }), entry({ id: 'b2' })]);
    expect(r.entries.map((e) => [e.id, e.opponent])).toEqual([
      ['a1', 'Neu'],
      ['b2', 'TSV Musterstadt'],
    ]);
    expect(r.changed).toHaveLength(2);
    expect(mergeList([a], [a])).toEqual({ entries: [a], changed: [] });
    const old = entry({ id: 'x', date: '2026-09-01', deleted: true });
    expect(pruneEntries([old, a], TODAY)).toEqual([a]);
    expect(pruneEntries([a], TODAY)).toEqual([a]);
  });
});

describe('015 US6 Spiel vormerken', () => {
  const ME = 'handyA';
  const OTHER = 'handyB';

  it('015 US6-S1 S2: setClaim merkt vor, mit Name oder ohne ("vergeben"), eigenes Handy sieht "du"', () => {
    const s = storeWith([entry({ id: 'a1', updatedAt: T0 })]);
    expect(entryState(s.entries[0]!, TODAY, ME)).toBe('frei');
    const r = setClaim(s, 'a1', ME, 'Jonas', T0 + 5)!;
    expect(r.entry.claim).toEqual({ by: ME, name: 'Jonas', at: T0 + 5 });
    expect(r.entry.updatedAt).toBe(T0 + 5);
    expect(r.store.pending).toEqual(['a1']);
    expect(entryState(r.entry, TODAY, ME)).toBe('Tickert: du');
    expect(entryState(r.entry, TODAY, OTHER)).toBe('Tickert: Jonas');
    expect(entryState(r.entry, TODAY)).toBe('Tickert: Jonas');
    const anon = setClaim(s, 'a1', OTHER, '', T0 + 5)!.entry;
    expect(entryState(anon, TODAY, ME)).toBe('Tickert: vergeben');
    expect(claimLabel(anon, OTHER)).toBe('du');
    expect(claimLabel(entry(), ME)).toBe('');
    // gleiche Vormerkung noch einmal: nichts zu tun
    expect(setClaim(r.store, 'a1', ME, 'Jonas', T0 + 6)).toBeNull();
    // Name geändert: neu
    expect(setClaim(r.store, 'a1', ME, 'Jo', T0 + 6)?.entry.claim?.name).toBe('Jo');
  });

  it('015 US6-S3 S4: übernehmen und freigeben; abgesagt, angelegt, vergangen und gelöscht', () => {
    const s = storeWith([entry({ id: 'a1', updatedAt: T0 })]);
    const mine = setClaim(s, 'a1', ME, 'Jonas', T0 + 1)!.store;
    const taken = setClaim(mine, 'a1', OTHER, 'Ben', T0 + 2)!;
    expect(taken.entry.claim).toEqual({ by: OTHER, name: 'Ben', at: T0 + 2 });
    const free = setClaim(taken.store, 'a1', '', '', T0 + 3)!;
    expect(free.entry.claim).toEqual({ by: '', name: '', at: T0 + 3 });
    expect(activeClaim(free.entry)).toBeNull();
    expect(entryState(free.entry, TODAY, OTHER)).toBe('frei');
    expect(setClaim(free.store, 'a1', '', '', T0 + 4)).toBeNull();
    expect(setClaim(s, 'a1', '', '', T0)).toBeNull();
    // Zeitpunkt der Vormerkung steigt streng, auch bei gleicher Uhrzeit
    expect(setClaim(free.store, 'a1', ME, '', T0)?.entry.claim?.at).toBe(T0 + 4);
    expect(setClaim(storeWith([entry({ id: 'a1', cancelled: true })]), 'a1', ME, '', T0)).toBeNull();
    expect(setClaim(storeWith([entry({ id: 'a1', deleted: true })]), 'a1', ME, '', T0)).toBeNull();
    expect(setClaim(s, 'fehlt', ME, '', T0)).toBeNull();
    const claimed = setClaim(s, 'a1', ME, 'Jonas', T0)!.entry;
    expect(entryState({ ...claimed, gameId: 'g1' }, TODAY, ME)).toBe('angelegt');
    expect(entryState({ ...claimed, cancelled: true }, TODAY, ME)).toBe('abgesagt');
    expect(entryState({ ...claimed, date: '2026-11-01' }, TODAY, ME)).toBe('');
  });

  it('FR-P25: Vormerkungen werden je Planspiel nach ihrem Zeitpunkt zusammengeführt, unabhängig von Änderungen', () => {
    const base = entry({ id: 'a1', updatedAt: T0 });
    const claimed = { ...base, updatedAt: T0 + 5, claim: { by: ME, name: 'Jonas', at: T0 + 5 } };
    // ein anderes Handy ändert später den Anstoß, ohne die Vormerkung schon zu kennen
    const edited = { ...base, time: '11:00', updatedAt: T0 + 9 };
    const a = mergeList([claimed], [edited]);
    expect(a.entries[0]).toMatchObject({ time: '11:00', claim: { by: ME } });
    // und umgekehrt: die ältere Meldung mit Vormerkung erreicht das Handy mit der neueren Änderung
    const b = mergeList([edited], [claimed]);
    expect(b.entries[0]).toMatchObject({ time: '11:00', claim: { by: ME } });
    expect(b.changed).toHaveLength(1);
    // Freigabe ist jünger als die Vormerkung und gewinnt
    const freed = { ...claimed, updatedAt: T0 + 6, claim: { by: '', name: '', at: T0 + 6 } };
    expect(mergeList([claimed], [freed]).entries[0]?.claim?.by).toBe('');
    expect(mergeList([freed], [claimed]).changed).toEqual([]);
    // ohne Vormerkung auf beiden Seiten bleibt alles wie bisher
    expect(mergeList([base], [{ ...base, updatedAt: T0 + 1 }]).entries[0]?.claim).toBeUndefined();
  });

  it('Meldung: Vormerkung als b hin und zurück, ungültige verwerfen die Meldung', () => {
    const e = entry({ id: 'a1', claim: { by: ME, name: 'Jonas', at: T0 } });
    expect(encodePayload([e]).e).toEqual([expect.objectContaining({ b: [ME, T0, 'Jonas'] })]);
    expect(parsePayload(JSON.stringify(encodePayload([e])))).toEqual([e]);
    const freed = entry({ id: 'a1', claim: { by: '', name: '', at: T0 } });
    expect(parsePayload(JSON.stringify(encodePayload([freed])))).toEqual([freed]);
    const raw = encodePayload([entry({ id: 'a1' })]) as { e: Record<string, unknown>[] };
    for (const bad of [[ME, T0], [ME, 0, ''], ['a b', T0, ''], [ME, T0, 'x'.repeat(21)], [ME, T0, 5], 'x']) {
      expect(parsePayload(JSON.stringify({ ...raw, e: [{ ...raw.e[0], b: bad }] }))).toBeNull();
    }
  });

  it('015 US6-S5 FR-P28: eigene Vormerkungen von heute, nicht angelegt, nicht abgesagt, nach Anstoß', () => {
    const c = (id: string, over: Partial<PlanEntry> = {}, by = ME) =>
      entry({ id, date: TODAY, ...over, claim: { by, name: '', at: T0 } });
    const s = storeWith([
      c('spaet', { time: '15:00' }),
      c('frueh', { time: '11:00' }),
      c('fremd', {}, OTHER),
      c('morgen', { date: '2026-11-08' }),
      c('angelegt', { gameId: 'g1' }),
      c('abgesagt', { cancelled: true }),
      c('weg', { deleted: true }),
      entry({ id: 'frei', date: TODAY }),
    ]);
    expect(myClaims(s, TODAY, ME).map((e) => e.id)).toEqual(['frueh', 'spaet']);
    expect(myClaims(s, TODAY, '')).toEqual([]);
  });

  it('Text der Begegnung für Rückfragen und Startbildschirm', () => {
    expect(matchText(entry())).toBe('E1 gegen TSV Musterstadt');
    expect(matchText(entry({ venue: 'away' }))).toBe('E1 bei TSV Musterstadt');
    expect(matchText(entry({ opponent: '' }))).toBe('E1 (Gegner offen)');
  });

  it('FR-P26: Name für die Trainer höchstens 20 Zeichen, ohne Leerraum außen', () => {
    expect(trainerName('  Jonas  ')).toBe('Jonas');
    expect(trainerName('x'.repeat(30))).toHaveLength(20);
  });
});
