import { migrateTeams } from './teams';
import type { Settings } from './types';

/** Spec 003 FR-E02: mindestens ein Ereignis eingeschaltet (dann gibt es den Knopf "Ereignis"). */
export const anyEventFeature = (s: Settings): boolean => s.features.cards || s.features.subs || s.features.marks;

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
    features: { cards: false, subs: false, marks: false },
  };
}

/** Ergänzt gespeicherte (ältere) Einstellungen um neue Felder; vor Spec 004 gespeicherte bekommen Mannschaften. */
export function withSettingsDefaults(stored: Partial<Settings> | undefined): Settings {
  const s = { ...defaultSettings(), ...stored };
  return stored?.teams === undefined ? { ...s, teams: migrateTeams(s) } : s;
}
