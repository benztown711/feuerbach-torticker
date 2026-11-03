import { migrateTeams } from './teams';
import type { Settings } from './types';

export function defaultSettings(): Settings {
  return {
    recentOwnTeams: [],
    lastSchema: { sections: 2, sectionMinutes: 25 },
    lastSquad: [],
    lastOwnColor: null,
    opponentColors: {},
    theme: 'system',
    installHintDismissedAt: null,
    teams: [],
  };
}

/** Ergänzt gespeicherte (ältere) Einstellungen um neue Felder; vor Spec 004 gespeicherte bekommen Mannschaften. */
export function withSettingsDefaults(stored: Partial<Settings> | undefined): Settings {
  const s = { ...defaultSettings(), ...stored };
  return stored?.teams === undefined ? { ...s, teams: migrateTeams(s) } : s;
}
