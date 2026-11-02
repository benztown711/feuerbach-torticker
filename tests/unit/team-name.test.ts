import { describe, expect, it } from 'vitest';
import { DEFAULT_OWN_TEAM, defaultOwnTeam, pushRecent, removeRecent, shortTeamName } from '../../src/domain/team-name';
import { defaultSettings, withSettingsDefaults } from '../../src/domain/settings';

describe('T095 FR-014 eigener Mannschaftsname', () => {
  it('Vorgabe ist "Sportvg Feuerbach", danach der zuletzt genutzte Name', () => {
    expect(DEFAULT_OWN_TEAM).toBe('Sportvg Feuerbach');
    expect(defaultOwnTeam(defaultSettings())).toBe('Sportvg Feuerbach');
    expect(defaultOwnTeam({ ...defaultSettings(), recentOwnTeams: ['Sportvg Feuerbach D3'] })).toBe(
      'Sportvg Feuerbach D3',
    );
  });

  it('Kurzform ohne "Sportvg " für die Tor-Knöpfe', () => {
    expect(shortTeamName('Sportvg Feuerbach E1')).toBe('Feuerbach E1');
    expect(shortTeamName('sportvg  Feuerbach')).toBe('Feuerbach');
    expect(shortTeamName('TSV Musterstadt')).toBe('TSV Musterstadt');
  });

  it('merkt bis zu 5 Namen, neuester zuerst, ohne Doppelte', () => {
    let list: string[] = [];
    for (const n of ['A', 'B', 'C', 'D', 'E', 'F']) list = pushRecent(list, n);
    expect(list).toEqual(['F', 'E', 'D', 'C', 'B']);
    expect(pushRecent(list, ' c ')).toEqual(['c', 'F', 'E', 'D', 'B']);
  });

  it('Einstellungen bekommen fehlende Felder mit Vorgaben', () => {
    expect(defaultSettings()).toEqual({
      recentOwnTeams: [],
      lastSchema: { sections: 2, sectionMinutes: 25 },
      lastSquad: [],
      lastOwnColor: null,
      opponentColors: {},
      theme: 'system',
      installHintDismissedAt: null,
    });
    expect(withSettingsDefaults({ theme: 'dark' }).theme).toBe('dark');
    expect(withSettingsDefaults(undefined).lastSchema).toEqual({ sections: 2, sectionMinutes: 25 });
  });

  it('FR-014 removeRecent entfernt einen gespeicherten Namen (Groß/klein egal)', () => {
    expect(removeRecent(['Sportvg Feuerbach E1', 'Sportvg Feuerbach E2'], 'sportvg feuerbach e1')).toEqual([
      'Sportvg Feuerbach E2',
    ]);
  });
});
