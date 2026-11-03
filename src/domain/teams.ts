import { isPaletteColor } from './jersey-colors';
import type { Schema, Settings, Team, Venue } from './types';

/** Spec 004: Name der impliziten Mannschaft, solange keine angelegt ist. */
export const DEFAULT_TEAM_NAME = 'Sportvg Feuerbach';
export const IMPLICIT_TEAM_ID = 'vorgabe';
const MAX_MIGRATED = 5;

/** Vorgabe ohne angelegte Mannschaft: Heim und Auswärts Rot (nicht gespeichert). */
export function implicitTeam(): Team {
  return {
    id: IMPLICIT_TEAM_ID,
    name: DEFAULT_TEAM_NAME,
    homeColor: 'rot',
    awayColor: 'rot',
    lastSchema: null,
    lastSquad: [],
    lastUsedAt: 0,
  };
}

/** Neue Mannschaft im Formular: Name zum Ergänzen ("… U11"), Heim Rot, Auswärts Schwarz. */
export function blankTeam(id: string): Team {
  return { ...implicitTeam(), id, name: `${DEFAULT_TEAM_NAME} `, awayColor: 'schwarz' };
}

/**
 * Migration (vor Spec 004): bisher genutzte Namen werden Mannschaften, die zuletzt genutzte zuerst.
 * Heim- und Auswärtstrikot = zuletzt gewählte eigene Farbe, sonst Rot.
 */
export function migrateTeams(
  old: Pick<Settings, 'recentOwnTeams' | 'lastOwnColor' | 'lastSchema' | 'lastSquad'>,
): Team[] {
  const color = old.lastOwnColor !== null && isPaletteColor(old.lastOwnColor) ? old.lastOwnColor : 'rot';
  const names = old.recentOwnTeams.slice(0, MAX_MIGRATED);
  return names.map((name, i) => ({
    id: `team-${i + 1}`,
    name,
    homeColor: color,
    awayColor: color,
    lastSchema: i === 0 ? old.lastSchema : null,
    lastSquad: i === 0 ? old.lastSquad : [],
    lastUsedAt: names.length - i,
  }));
}

/** FR-M02: zuletzt genutzte Mannschaft, sonst die erste, sonst die Vorgabe. */
export function currentTeam(settings: Settings): Team {
  const [first, ...rest] = settings.teams;
  if (!first) return implicitTeam();
  return rest.reduce((a, b) => (b.lastUsedAt > a.lastUsedAt ? b : a), first);
}

export function findTeam(settings: Settings, id: string): Team {
  return settings.teams.find((t) => t.id === id) ?? currentTeam(settings);
}

/** FR-M03: eigenes Trikot je nach Begegnung. */
export const ownColorFor = (team: Team, venue: Venue): string => (venue === 'home' ? team.homeColor : team.awayColor);

/** FR-M06: Spielzeit der Mannschaft, sonst die zuletzt genutzte. */
export const schemaFor = (team: Team, settings: Settings): Schema => team.lastSchema ?? settings.lastSchema;

/** FR-M06: Aufgebot der Mannschaft; nie das Aufgebot einer anderen Mannschaft übernehmen. */
export const squadFor = (team: Team, settings: Settings): string[] =>
  team.id === IMPLICIT_TEAM_ID ? settings.lastSquad : team.lastSquad;

export function upsertTeam(settings: Settings, team: Team): Settings {
  const exists = settings.teams.some((t) => t.id === team.id);
  return {
    ...settings,
    teams: exists ? settings.teams.map((t) => (t.id === team.id ? team : t)) : [...settings.teams, team],
  };
}

export function removeTeam(settings: Settings, id: string): Settings {
  return { ...settings, teams: settings.teams.filter((t) => t.id !== id) };
}

/** FR-M06: Spielzeit, Aufgebot und Zeitpunkt beim Anlegen eines Spiels merken. */
export function recordTeamUse(
  settings: Settings,
  teamId: string,
  use: { schema: Schema; squad: string[]; now: number },
): Settings {
  return {
    ...settings,
    lastSchema: use.schema,
    lastSquad: use.squad,
    teams: settings.teams.map((t) =>
      t.id === teamId ? { ...t, lastSchema: use.schema, lastSquad: use.squad, lastUsedAt: use.now } : t,
    ),
  };
}

export interface TeamValidation {
  ok: boolean;
  value: Team;
  errors: Partial<Record<'name' | 'homeColor' | 'awayColor', string>>;
}

/** FR-M01: Name 1 bis 40 Zeichen, Trikots aus der Palette. */
export function validateTeam(input: Team): TeamValidation {
  const value = { ...input, name: input.name.trim().replace(/\s+/g, ' ') };
  const errors: TeamValidation['errors'] = {};
  if (value.name.length === 0) errors.name = 'Bitte einen Namen eintragen.';
  else if (value.name.length > 40) errors.name = 'Höchstens 40 Zeichen.';
  if (!isPaletteColor(value.homeColor)) errors.homeColor = 'Unbekannte Farbe.';
  if (!isPaletteColor(value.awayColor)) errors.awayColor = 'Unbekannte Farbe.';
  return { ok: Object.keys(errors).length === 0, value, errors };
}
