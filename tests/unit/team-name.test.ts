import { describe, expect, it } from 'vitest';
import { shortTeamName } from '../../src/domain/team-name';
import { defaultSettings, isRosterSort, withSettingsDefaults } from '../../src/domain/settings';
import { buildBackup } from '../../src/domain/export';
import type { Settings } from '../../src/domain/types';

describe('T095 FR-014 Kurzform und Einstellungen (Mannschaften siehe teams.test.ts)', () => {
  it('Kurzform ohne "Sportvg " für die Tor-Knöpfe', () => {
    expect(shortTeamName('Sportvg Feuerbach E1')).toBe('Feuerbach E1');
    expect(shortTeamName('sportvg  Feuerbach')).toBe('Feuerbach');
    expect(shortTeamName('TSV Musterstadt')).toBe('TSV Musterstadt');
  });

  it('Einstellungen bekommen fehlende Felder mit Vorgaben', () => {
    expect(defaultSettings()).toEqual({
      recentOwnTeams: [],
      lastSchema: { sections: 2, sectionMinutes: 25 },
      lastSquad: [],
      lastOwnColor: null,
      opponentColors: {},
      theme: 'system',
      signalSound: 'pfiff',
      rosterSort: 'name',
      installHintDismissedAt: null,
      teams: [],
      features: { cards: false, subs: false, marks: false, assists: false },
      live: null,
      liveView: null,
    });
    expect(withSettingsDefaults({ theme: 'dark' }).theme).toBe('dark');
    // Spec 006: ältere Einstellungen ohne Live-Felder bekommen null
    expect(withSettingsDefaults({ theme: 'dark' })).toMatchObject({ live: null, liveView: null });
    expect(withSettingsDefaults(undefined).lastSchema).toEqual({ sections: 2, sectionMinutes: 25 });
  });
});

describe('Spec 013 Einstellung "Sortieren nach"', () => {
  it('013 US1-S1 US1-S8 FR-K02 Vorgabe "Vorname", auch für gespeicherte Einstellungen ohne Wert', () => {
    expect(defaultSettings().rosterSort).toBe('name');
    expect(withSettingsDefaults(undefined).rosterSort).toBe('name');
    expect(withSettingsDefaults({ theme: 'dark' }).rosterSort).toBe('name');
  });

  it('013 US1-S7 FR-K02 gültiger Wert bleibt, unbekannter wird "Vorname"', () => {
    expect(withSettingsDefaults({ rosterSort: 'number' }).rosterSort).toBe('number');
    expect(withSettingsDefaults({ rosterSort: 'nummer' } as unknown as Partial<Settings>).rosterSort).toBe('name');
    expect(isRosterSort('name')).toBe(true);
    expect(isRosterSort('number')).toBe(true);
    expect(isRosterSort(undefined)).toBe(false);
  });

  it('013 FR-K07 Sicherung enthält keine Einstellungen, also auch keine Sortierung', () => {
    const backup = buildBackup([], [], Date.UTC(2026, 10, 7), '0.3.0', null);
    expect(Object.keys(backup)).not.toContain('rosterSort');
    expect(JSON.stringify(backup)).not.toContain('rosterSort');
  });
});
