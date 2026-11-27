import { DEFAULT_SOUNDS, normalizeSounds } from './signal-sound';
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
    sounds: { ...DEFAULT_SOUNDS },
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
 * Spec 025 FR-T04: Töne je Ereignis; der Signalton aus Spec 008 (`signalSound`) wird zum Spielzeitende und entfällt.
 * Spec 013 FR-K02: fehlende oder unbekannte Sortierung wird "Vorname".
 */
export function withSettingsDefaults(stored: Partial<Settings> | undefined): Settings {
  const d = defaultSettings();
  const { signalSound: legacy, ...rest } = (stored ?? {}) as Partial<Settings> & { signalSound?: unknown };
  const sounds = normalizeSounds(rest.sounds, legacy);
  const rosterSort = isRosterSort(rest.rosterSort) ? rest.rosterSort : d.rosterSort;
  const s = { ...d, ...rest, features: { ...d.features, ...rest.features }, sounds, rosterSort };
  return rest.teams === undefined ? { ...s, teams: migrateTeams(s) } : s;
}
