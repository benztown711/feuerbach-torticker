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
  };
}

/** Ergänzt gespeicherte (ältere) Einstellungen um neue Felder. */
export function withSettingsDefaults(stored: Partial<Settings> | undefined): Settings {
  return { ...defaultSettings(), ...stored };
}
