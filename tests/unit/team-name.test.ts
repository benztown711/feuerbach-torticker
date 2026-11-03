import { describe, expect, it } from 'vitest';
import { shortTeamName } from '../../src/domain/team-name';
import { defaultSettings, withSettingsDefaults } from '../../src/domain/settings';

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
      installHintDismissedAt: null,
      teams: [],
    });
    expect(withSettingsDefaults({ theme: 'dark' }).theme).toBe('dark');
    expect(withSettingsDefaults(undefined).lastSchema).toEqual({ sections: 2, sectionMinutes: 25 });
  });
});
