import { DEFAULT_SIGNAL_SOUND, isSignalSound } from './signal-sound';
import { migrateTeams } from './teams';
import type { RosterSort, Settings } from './types';

/** Spec 003 FR-E02: mindestens ein Ereignis eingeschaltet (dann gibt es die Knopfzeile, FR-E09). */
export const anyEventFeature = (s: Settings): boolean => s.features.cards || s.features.subs || s.features.marks;

/** Spec 013 FR-K02: gültige Werte für "Sortieren nach". */
export const isRosterSort = (v: unknown): v is RosterSort => v === 'name' || v === 'number';

export function defaultSettings(): Settings {
  return {
    recentOwnTeams: [],
    lastSchema: { sections: 2, sectionMinutes: 25 },
    lastSquad: [],
    lastOwnColor: null,
    opponentColors: {},
    theme: 'system',
    signalSound: DEFAULT_SIGNAL_SOUND,
    rosterSort: 'name',
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
 * Spec 013 FR-K02: fehlende oder unbekannte Sortierung wird "Vorname".
 */
export function withSettingsDefaults(stored: Partial<Settings> | undefined): Settings {
  const d = defaultSettings();
  const signalSound = isSignalSound(stored?.signalSound) ? stored.signalSound : d.signalSound;
  const rosterSort = isRosterSort(stored?.rosterSort) ? stored.rosterSort : d.rosterSort;
  const s = { ...d, ...stored, features: { ...d.features, ...stored?.features }, signalSound, rosterSort };
  return stored?.teams === undefined ? { ...s, teams: migrateTeams(s) } : s;
}
