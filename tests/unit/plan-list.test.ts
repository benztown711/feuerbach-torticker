import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addEntry, emptyPlan, MAX_PLAN, setCancelled, setGame, type PlanInput } from '../../src/domain/plan';
import { importPlan, missingTeams, parsePlanList, planLine, planListText } from '../../src/domain/plan-list';
import type { PlanEntry, PlanStore } from '../../src/domain/types';

const TODAY = '2026-11-07'; // Sa
const T0 = Date.UTC(2026, 10, 7, 9, 0, 0);
const TEAMS = ['E1', 'E2', 'E3'];

const parse = (text: string, teams = TEAMS) => parsePlanList(text, TODAY, teams);
const one = (text: string, teams = TEAMS) => parse(text, teams)[0]!;

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

let n = 0;
const ids = () => `id${++n}`;
const plan = (...inputs: PlanInput[]): PlanStore =>
  inputs.reduce((s, i) => addEntry(s, i, ids(), T0).store, emptyPlan('topic', 'org'));

describe('015 US4-S1 Zeile lesen', () => {
  it('erkennt Datum, Anstoß, Mannschaft, Heim/Auswärts, Gegner, Wettbewerb und Spielzeit', () => {
    const r = one('So 15.11. 10:00 E1 auswärts SV Beispielhausen E1 (Leistungsliga, 3×25)');
    expect(r).toEqual({
      line: 1,
      text: 'So 15.11. 10:00 E1 auswärts SV Beispielhausen E1 (Leistungsliga, 3×25)',
      team: 'E1',
      problem: null,
      hint: '',
      input: {
        team: 'E1',
        date: '2026-11-15',
        time: '10:00',
        venue: 'away',
        opponent: 'SV Beispielhausen E1',
        competition: 'Leistungsliga',
        schema: { sections: 3, sectionMinutes: 25 },
      },
    });
  });

  it('Wochentag, Anstoß, Wettbewerb und Spielzeit sind optional; "?" heißt Gegner offen; H = heim', () => {
    expect(one('15.11. E2 H ?').input).toEqual({
      team: 'E2',
      date: '2026-11-15',
      time: '',
      venue: 'home',
      opponent: '',
      competition: '',
      schema: null,
    });
    expect(one('15.11. E2 heim').input?.opponent).toBe('');
    expect(one('Sa 14.11. E2 heim (Kreisstaffel)').input).toMatchObject({ opponent: '', competition: 'Kreisstaffel' });
  });

  it('A = auswärts, "x" statt "×", langer Wochentag, Jahr, Uhrzeit mit Punkt und "Uhr", Mannschaft klein', () => {
    expect(one('Samstag, 14.11.2026, 9.30 Uhr e1 A TSV Musterstadt (2 x 20 min)').input).toEqual({
      team: 'E1',
      date: '2026-11-14',
      time: '09:30',
      venue: 'away',
      opponent: 'TSV Musterstadt',
      competition: '',
      schema: { sections: 2, sectionMinutes: 20 },
    });
    expect(one('Sa. 14.11.26 12:00 E1 auswaerts X').input).toMatchObject({ date: '2026-11-14', venue: 'away' });
  });

  it('Klammern: Wettbewerb mit Komma oder Klammer, Gegner mit Klammer, offene Klammer', () => {
    expect(one('Sa 14.11. E1 heim X (Liga A, Staffel 2, 2×25)').input).toMatchObject({
      competition: 'Liga A, Staffel 2',
      schema: { sections: 2, sectionMinutes: 25 },
    });
    expect(one('Sa 14.11. E1 heim X (Liga A, Staffel 2)').input).toMatchObject({
      competition: 'Liga A, Staffel 2',
      schema: null,
    });
    expect(one('Sa 14.11. E1 heim X (Pokal (Kreis), 2×25)').input).toMatchObject({
      opponent: 'X',
      competition: 'Pokal (Kreis)',
    });
    expect(one('Sa 14.11. E1 heim TSV X (2) ()').input).toMatchObject({ opponent: 'TSV X (2)', competition: '' });
    expect(one('Sa 14.11. E1 heim TSV X)').input).toMatchObject({ opponent: 'TSV X)', competition: '' });
  });

  it('Mannschaft mit Leerzeichen, Aufzählungszeichen, Leerzeilen und Windows-Zeilenenden', () => {
    expect(one('Sa 14.11. E1 (2) heim X', ['E1 (2)']).input?.team).toBe('E1 (2)');
    const rows = parse('- Sa 14.11. E1 heim X\r\n\r\n• So 15.11. E2 a Y\n   \n* 21.11. E3 h Z');
    expect(rows.map((r) => [r.line, r.input?.team, r.problem])).toEqual([
      [1, 'E1', null],
      [3, 'E2', null],
      [5, 'E3', null],
    ]);
  });

  it('die Hinrunde aus docs/ ist ohne Hinweis lesbar', () => {
    const text = readFileSync('docs/spielplan-hinrunde-2026.txt', 'utf8');
    const rows = parse(text);
    expect(rows).toHaveLength(27);
    expect(rows.filter((r) => r.problem !== null)).toEqual([]);
  });
});

describe('015 US4-S2 ohne Jahr: nächstes passendes Datum ab 7 Tagen vor heute', () => {
  it.each([
    ['02.01.', '2027-01-02', null],
    ['07.11.', '2026-11-07', null],
    ['01.11.', '2026-11-01', 'past'],
    ['31.10.', '2026-10-31', 'past'],
    ['30.10.', '2027-10-30', null],
  ])('%s → %s', (date, expected, problem) => {
    const r = one(`${date} E1 heim X`);
    expect(r.input?.date).toBe(expected);
    expect(r.problem).toBe(problem);
  });
});

describe('015 US4-S3 Hinweise je Zeile', () => {
  it.each([
    ['Spielplan Hinrunde', 'format', 'Format nicht erkannt.'],
    ['Sa 14.11. 12:00 E1 TSV Musterstadt', 'format', 'Format nicht erkannt.'],
    ['Sa 14.11. heim TSV Musterstadt', 'format', 'Format nicht erkannt.'],
    [`Sa 14.11. E1 heim ${'X'.repeat(200)}`, 'format', 'Format nicht erkannt.'],
    ['Sa 14.11. E4 heim X', 'team', 'Die Mannschaft „E4“ gehört nicht zum Live-Spieltag.'],
    ['31.11. E1 heim X', 'date', 'Dieses Datum gibt es nicht.'],
    ['So 14.11. E1 heim X', 'weekday', 'Wochentag passt nicht: Der 14.11.2026 ist ein Samstag.'],
    ['Sa 14.11. 25:00 E1 heim X', 'time', 'Anstoß ist keine Uhrzeit.'],
    [`Sa 14.11. E1 heim ${'X'.repeat(41)}`, 'text', 'Gegner und Wettbewerb höchstens 40 Zeichen.'],
    [`Sa 14.11. E1 heim X (${'W'.repeat(41)})`, 'text', 'Gegner und Wettbewerb höchstens 40 Zeichen.'],
    ['Sa 14.11. E1 heim X (5×25)', 'schema', 'Spielzeit: 1 bis 4 Abschnitte, 1 bis 60 Minuten.'],
    ['Mo 02.11. E1 heim X', 'past', 'Datum vorbei.'],
  ])('%s', (text, problem, hint) => {
    const r = one(text);
    expect(r.problem).toBe(problem);
    expect(r.hint).toBe(hint);
    expect(r.input === null).toBe(problem === 'format');
  });

  it('übrige Zeilen bleiben erkannt', () => {
    const rows = parse('Sa 14.11. E1 heim X\nSa 14.11. E4 heim Y\nSa 14.11. E2 heim Z');
    expect(rows.map((r) => r.problem)).toEqual([null, 'team', null]);
    expect(rows[1]).toMatchObject({ line: 2, team: 'E4' });
  });
});

describe('015 US4 FR-P18 Mannschaft aus "Meine Mannschaften" anbieten', () => {
  it('nennt fehlende Mannschaften einmal, nur wenn es sie in "Meine Mannschaften" gibt', () => {
    const rows = parse('Sa 14.11. E4 heim X\nSa 21.11. e4 heim Y\nSa 14.11. D9 heim Z\nunsinn\nSa 14.11. E1 heim X');
    expect(missingTeams(rows, ['E4', 'E5'])).toEqual(['E4']);
    expect(missingTeams(rows, [])).toEqual([]);
  });
});

describe('015 US4-S4 vorhandenes Spiel aktualisieren statt doppelt', () => {
  it('neu, aktualisiert (Gegner ohne Groß-/Kleinschreibung), unverändert', () => {
    const store = plan(input(), input({ team: 'E2', opponent: 'SV Beispielhausen' }));
    const r = importPlan(
      store,
      [
        input({ opponent: 'tsv musterstadt', time: '11:00' }),
        input({ team: 'E2', opponent: 'SV Beispielhausen' }),
        input({ team: 'E3', opponent: 'FC Probestadt' }),
      ],
      TODAY,
      T0 + 1000,
      () => 'neu1',
    );
    expect(r.statuses).toEqual(['aktualisiert', 'unverändert', 'neu']);
    expect(r.store.entries).toHaveLength(3);
    const e1 = r.store.entries.find((e) => e.team === 'E1')!;
    expect(e1).toMatchObject({ opponent: 'tsv musterstadt', time: '11:00', updatedAt: T0 + 1000 });
    expect(r.store.entries.find((e) => e.id === 'neu1')).toMatchObject({ team: 'E3', opponent: 'FC Probestadt' });
    expect(r.store.pending).toEqual(expect.arrayContaining([e1.id, 'neu1']));
  });

  it('jede Angabe zählt als Änderung; abgesagt bleibt, gelöschte zählen nicht', () => {
    let store = plan(input());
    const id = store.entries[0]!.id;
    store = setCancelled(store, id, true, T0 + 1)!.store;
    for (const over of [
      { time: '' },
      { venue: 'away' as const },
      { competition: 'Pokal' },
      { schema: null },
      { schema: { sections: 3, sectionMinutes: 25 } },
    ]) {
      const r = importPlan(store, [input(over)], TODAY, T0 + 5, ids);
      expect(r.statuses).toEqual(['aktualisiert']);
      expect(r.store.entries[0]).toMatchObject({ id, cancelled: true });
    }
    const noSchema = importPlan(plan(input({ schema: null })), [input({ schema: null })], TODAY, T0, ids);
    expect(noSchema.statuses).toEqual(['unverändert']);
    const deleted: PlanStore = { ...store, entries: store.entries.map((e) => ({ ...e, deleted: true })) };
    expect(importPlan(deleted, [input()], TODAY, T0 + 5, ids).statuses).toEqual(['neu']);
  });

  it('gleiche Zeile zweimal: die zweite aktualisiert die erste; Verknüpfung mit dem Spiel bleibt', () => {
    const base = plan(input());
    const withGame = setGame(base, base.entries[0]!.id, 'game1', T0 + 1)!.store;
    const r = importPlan(withGame, [input({ time: '10:00' }), input({ time: '10:30' })], TODAY, T0 + 2, ids);
    expect(r.statuses).toEqual(['aktualisiert', 'aktualisiert']);
    expect(r.store.entries).toHaveLength(1);
    expect(r.store.entries[0]).toMatchObject({ time: '10:30', gameId: 'game1' });
    const twiceNew = importPlan(emptyPlan('t', 'o'), [input(), input()], TODAY, T0, ids);
    expect(twiceNew.statuses).toEqual(['neu', 'unverändert']);
  });

  it('Platzhalter "Gegner offen" bekommt den Gegner, wenn es genau einen für Mannschaft und Tag gibt', () => {
    const store = plan(input({ team: 'E2', date: '2026-11-15', opponent: '' }));
    const r = importPlan(store, [input({ team: 'E2', date: '2026-11-15', opponent: 'SV X' })], TODAY, T0 + 1, ids);
    expect(r.statuses).toEqual(['aktualisiert']);
    expect(r.store.entries).toHaveLength(1);
    expect(r.store.entries[0]).toMatchObject({ opponent: 'SV X' });
    // zwei Platzhalter am selben Tag: unklar welcher, also neu
    const two = plan(input({ opponent: '' }), input({ opponent: '', time: '15:00' }));
    expect(importPlan(two, [input({ opponent: 'SV X' })], TODAY, T0, ids).statuses).toEqual(['neu']);
    // eine Zeile ohne Gegner ersetzt keinen Platzhalter, sie ist selbst einer
    expect(importPlan(emptyPlan('t', 'o'), [input({ opponent: '' })], TODAY, T0, ids).statuses).toEqual(['neu']);
    // ein Platzhalter für eine andere Mannschaft zählt nicht
    expect(importPlan(plan(input({ team: 'E3', opponent: '' })), [input()], TODAY, T0, ids).statuses).toEqual(['neu']);
  });

  it('FR-P03: ist der Plan voll, kommen keine neuen Spiele mehr dazu, Aktualisieren geht weiter', () => {
    const full = plan(
      ...Array.from({ length: MAX_PLAN }, (_, i) => input({ opponent: `Gegner ${i}`, date: '2026-11-14' })),
    );
    const r = importPlan(
      full,
      [input({ opponent: 'Neu' }), input({ opponent: 'Gegner 3', time: '09:00' })],
      TODAY,
      T0,
      ids,
    );
    expect(r.statuses).toEqual(['voll', 'aktualisiert']);
  });
});

describe('015 US4-S5 Spielplan teilen', () => {
  const entry = (over: Partial<PlanEntry>): PlanEntry => ({
    id: 'a',
    team: 'E1',
    date: '2026-11-15',
    time: null,
    venue: 'home',
    opponent: '',
    competition: '',
    schema: null,
    cancelled: false,
    deleted: false,
    updatedAt: 1,
    ...over,
  });

  it('eine Zeile je Spiel im Einfügeformat', () => {
    expect(
      planLine(
        entry({
          time: '10:00',
          venue: 'away',
          opponent: 'X',
          competition: 'Liga',
          schema: { sections: 3, sectionMinutes: 25 },
        }),
      ),
    ).toBe('So 15.11. 10:00 E1 auswärts X (Liga, 3×25)');
    expect(planLine(entry({}))).toBe('So 15.11. E1 heim ?');
    expect(planLine(entry({ schema: { sections: 1, sectionMinutes: 10 } }))).toBe('So 15.11. E1 heim ? (1×10)');
    expect(planLine(entry({ opponent: 'TSV X (2)' }))).toBe('So 15.11. E1 heim TSV X (2) ()');
  });

  it('alle Spiele ab heute nach Datum und Anstoß, ohne abgesagte, gelöschte und vergangene', () => {
    let store = plan(
      input({ date: '2026-11-15', time: '10:00', opponent: 'B' }),
      input({ team: 'E2', date: '2026-11-07', time: '12:00', opponent: 'A' }),
      input({ date: '2026-11-07', time: '11:00', opponent: 'C', venue: 'away' }),
      input({ date: '2026-11-01', opponent: 'Vergangen' }),
      input({ date: '2026-11-14', opponent: 'Abgesagt' }),
      input({ date: '2026-11-14', opponent: 'Gelöscht' }),
    );
    const byOpp = (o: string) => store.entries.find((e) => e.opponent === o)!.id;
    store = setCancelled(store, byOpp('Abgesagt'), true, T0)!.store;
    store = { ...store, entries: store.entries.map((e) => (e.opponent === 'Gelöscht' ? { ...e, deleted: true } : e)) };
    expect(planListText(store, TODAY).split('\n')).toEqual([
      'Sa 07.11. 11:00 E1 auswärts C (Kreisstaffel, 2×25)',
      'Sa 07.11. 12:00 E2 heim A (Kreisstaffel, 2×25)',
      'So 15.11. 10:00 E1 heim B (Kreisstaffel, 2×25)',
    ]);
    expect(planListText(emptyPlan('t', 'o'), TODAY)).toBe('');
  });

  it('die geteilte Liste lässt sich unverändert wieder einfügen', () => {
    const store = plan(
      input({ time: '' }),
      input({ team: 'E2', opponent: '', competition: '', schema: null, venue: 'away' }),
      input({ team: 'E3', opponent: 'TSV X (2)', competition: '', schema: null }),
      input({ team: 'E1', date: '2027-01-09', opponent: 'SV Beispielhausen', competition: 'Pokal (Kreis), Runde 1' }),
    );
    const rows = parse(planListText(store, TODAY));
    expect(rows.every((r) => r.problem === null)).toBe(true);
    const r = importPlan(
      store,
      rows.map((x) => x.input!),
      TODAY,
      T0 + 10,
      ids,
    );
    expect(r.statuses).toEqual(['unverändert', 'unverändert', 'unverändert', 'unverändert']);
  });
});
