import { DEFAULT_SIGNAL_SOUND, isSignalSound } from './signal-sound';
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
    signalSound: DEFAULT_SIGNAL_SOUND,
    installHintDismissedAt: null,
    teams: [],
    features: { cards: false, subs: false, marks: false, assists: false },
    live: null,
    liveView: null,
  };
}

/**
 * Ergänzt gespeicherte (ältere) Einstellungen um neue Felder; vor Spec 004 gespeicherte bekommen Mannschaften.
 * Spec 008 FR-K03: fehlender oder unbekannter Signalton wird zum Pfiff.
 */
export function withSettingsDefaults(stored: Partial<Settings> | undefined): Settings {
  const d = defaultSettings();
  const signalSound = isSignalSound(stored?.signalSound) ? stored.signalSound : d.signalSound;
  const s = { ...d, ...stored, features: { ...d.features, ...stored?.features }, signalSound };
  return stored?.teams === undefined ? { ...s, teams: migrateTeams(s) } : s;
}
