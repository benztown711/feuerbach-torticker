import { describe, expect, it } from 'vitest';
import { defaultSettings, withSettingsDefaults } from '../../src/domain/settings';
import {
  DEFAULT_TEAM_NAME,
  IMPLICIT_TEAM_ID,
  blankTeam,
  currentTeam,
  findTeam,
  implicitTeam,
  migrateTeams,
  ownColorFor,
  recordTeamUse,
  removeTeam,
  schemaFor,
  squadFor,
  upsertTeam,
  validateTeam,
} from '../../src/domain/teams';
import type { Settings, Team } from '../../src/domain/types';

const team = (over: Partial<Team> = {}): Team => ({
  id: 't1',
  name: 'Sportvg Feuerbach U11',
  homeColor: 'rot',
  awayColor: 'schwarz',
  lastSchema: null,
  lastSquad: [],
  lastUsedAt: 0,
  ...over,
});
const settings = (over: Partial<Settings> = {}): Settings => ({ ...defaultSettings(), ...over });

describe('004 FR-M01 Meine Mannschaften', () => {
  it('ohne angelegte Mannschaft gilt die Vorgabe "Sportvg Feuerbach", Heim und Auswärts Rot', () => {
    expect(implicitTeam()).toEqual({
      id: IMPLICIT_TEAM_ID,
      name: DEFAULT_TEAM_NAME,
      homeColor: 'rot',
      awayColor: 'rot',
      lastSchema: null,
      lastSquad: [],
      lastUsedAt: 0,
    });
    expect(DEFAULT_TEAM_NAME).toBe('Sportvg Feuerbach');
    expect(currentTeam(settings())).toEqual(implicitTeam());
    expect(defaultSettings().teams).toEqual([]);
  });

  it('neue Mannschaft: Name vorbelegt, Heim Rot, Auswärts Schwarz', () => {
    expect(blankTeam('n1')).toEqual(team({ id: 'n1', name: 'Sportvg Feuerbach ' }));
  });

  it('anlegen, ändern und löschen', () => {
    let s = upsertTeam(settings(), team());
    s = upsertTeam(s, team({ id: 't2', name: 'Sportvg Feuerbach U10' }));
    expect(s.teams.map((t) => t.id)).toEqual(['t1', 't2']);
    s = upsertTeam(s, team({ id: 't1', name: 'Sportvg Feuerbach U12', awayColor: 'weiss' }));
    expect(s.teams[0]).toMatchObject({ name: 'Sportvg Feuerbach U12', awayColor: 'weiss' });
    expect(s.teams).toHaveLength(2);
    s = removeTeam(s, 't1');
    expect(s.teams.map((t) => t.id)).toEqual(['t2']);
  });

  it('Prüfung: Name 1 bis 40 Zeichen, Farben aus der Palette', () => {
    expect(validateTeam(team({ name: '  Sportvg Feuerbach U11  ' }))).toEqual({
      ok: true,
      value: team(),
      errors: {},
    });
    const bad = validateTeam(team({ name: '   ', homeColor: 'pink', awayColor: 'lila-x' }));
    expect(bad.ok).toBe(false);
    expect(bad.errors).toEqual({
      name: 'Bitte einen Namen eintragen.',
      homeColor: 'Unbekannte Farbe.',
      awayColor: 'Unbekannte Farbe.',
    });
    expect(validateTeam(team({ name: 'x'.repeat(41) })).errors.name).toBe('Höchstens 40 Zeichen.');
  });
});

describe('004 FR-M02 FR-M03 FR-M06 Vorbelegung "Neues Spiel"', () => {
  it('zuletzt genutzte Mannschaft ist vorausgewählt, sonst die erste', () => {
    const a = team({ id: 'a', lastUsedAt: 5 });
    const b = team({ id: 'b', lastUsedAt: 9 });
    expect(currentTeam(settings({ teams: [a, b] })).id).toBe('b');
    expect(currentTeam(settings({ teams: [team({ id: 'x' }), team({ id: 'y' })] })).id).toBe('x');
    expect(findTeam(settings({ teams: [a, b] }), 'a').id).toBe('a');
    expect(findTeam(settings({ teams: [a, b] }), 'weg').id).toBe('b');
  });

  it('eigenes Trikot je nach Heim oder Auswärts', () => {
    expect(ownColorFor(team(), 'home')).toBe('rot');
    expect(ownColorFor(team(), 'away')).toBe('schwarz');
  });

  it('Spielzeit und Aufgebot je Mannschaft, Rückfall auf die globalen Werte', () => {
    const s = settings({ lastSchema: { sections: 3, sectionMinutes: 20 }, lastSquad: ['p1'] });
    expect(schemaFor(team({ lastSchema: { sections: 2, sectionMinutes: 30 } }), s)).toEqual({
      sections: 2,
      sectionMinutes: 30,
    });
    expect(schemaFor(team(), s)).toEqual({ sections: 3, sectionMinutes: 20 });
    expect(squadFor(team({ lastSquad: ['p7'] }), s)).toEqual(['p7']);
    // neue Mannschaft: kein Aufgebot einer anderen Mannschaft übernehmen
    expect(squadFor(team(), s)).toEqual([]);
    expect(squadFor(implicitTeam(), s)).toEqual(['p1']);
  });

  it('beim Anlegen eines Spiels merkt sich die Mannschaft Spielzeit, Aufgebot und Zeitpunkt', () => {
    const s = settings({ teams: [team(), team({ id: 't2' })] });
    const use = { schema: { sections: 2, sectionMinutes: 30 }, squad: ['p1', 'p2'], now: 1000 };
    const next = recordTeamUse(s, 't1', use);
    expect(next.teams[0]).toMatchObject({ lastSchema: use.schema, lastSquad: use.squad, lastUsedAt: 1000 });
    expect(next.teams[1]).toEqual(s.teams[1]);
    expect(next.lastSchema).toEqual(use.schema);
    expect(next.lastSquad).toEqual(use.squad);
    // implizite Vorgabe: nur die globalen Werte
    const implicit = recordTeamUse(settings(), IMPLICIT_TEAM_ID, use);
    expect(implicit.teams).toEqual([]);
    expect(implicit.lastSchema).toEqual(use.schema);
  });
});

describe('004 Migration alter Einstellungen', () => {
  it('bisher genutzte Namen werden Mannschaften, die zuletzt genutzte zuerst', () => {
    const old = {
      recentOwnTeams: ['Sportvg Feuerbach E2', 'Sportvg Feuerbach E1'],
      lastOwnColor: 'schwarz',
      lastSchema: { sections: 2, sectionMinutes: 20 },
      lastSquad: ['p1'],
    };
    const teams = migrateTeams(old);
    expect(teams).toEqual([
      team({
        id: 'team-1',
        name: 'Sportvg Feuerbach E2',
        homeColor: 'schwarz',
        awayColor: 'schwarz',
        lastSchema: old.lastSchema,
        lastSquad: ['p1'],
        lastUsedAt: 2,
      }),
      team({ id: 'team-2', name: 'Sportvg Feuerbach E1', homeColor: 'schwarz', awayColor: 'schwarz', lastUsedAt: 1 }),
    ]);
    expect(currentTeam(settings({ teams })).name).toBe('Sportvg Feuerbach E2');
  });

  it('ohne geänderte oder mit unbekannter Farbe: Rot; ohne Namen: keine Mannschaft', () => {
    const base = { lastSchema: { sections: 2, sectionMinutes: 25 }, lastSquad: [] };
    expect(migrateTeams({ ...base, recentOwnTeams: ['A'], lastOwnColor: null })[0]?.homeColor).toBe('rot');
    expect(migrateTeams({ ...base, recentOwnTeams: ['A'], lastOwnColor: 'pink' })[0]?.awayColor).toBe('rot');
    expect(migrateTeams({ ...base, recentOwnTeams: [], lastOwnColor: 'schwarz' })).toEqual([]);
  });

  it('withSettingsDefaults migriert nur, wenn noch keine Mannschaften gespeichert sind', () => {
    const migrated = withSettingsDefaults({ recentOwnTeams: ['Sportvg Feuerbach D3'] });
    expect(migrated.teams.map((t) => t.name)).toEqual(['Sportvg Feuerbach D3']);
    const kept = withSettingsDefaults({ recentOwnTeams: ['Alt'], teams: [] });
    expect(kept.teams).toEqual([]);
    expect(withSettingsDefaults(undefined).teams).toEqual([]);
  });
});
