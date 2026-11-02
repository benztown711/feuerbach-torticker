import type { Settings } from './types';

export const DEFAULT_OWN_TEAM = 'Sportvg Feuerbach';
const MAX_RECENT = 5;

/** FR-014: Vorgabe ist der zuletzt genutzte eigene Name. */
export function defaultOwnTeam(settings: Settings): string {
  return settings.recentOwnTeams[0] ?? DEFAULT_OWN_TEAM;
}

/** Kurzform für die Tor-Knöpfe, z. B. "Sportvg Feuerbach E1" → "Feuerbach E1". */
export function shortTeamName(name: string): string {
  return name.replace(/^sportvg\s+/i, '');
}

/** Merkt bis zu fünf Namen, neuester zuerst, ohne Doppelte (Vergleich ohne Groß/klein). */
export function pushRecent(list: string[], name: string): string[] {
  const n = name.trim();
  return [n, ...list.filter((x) => x.toLowerCase() !== n.toLowerCase())].slice(0, MAX_RECENT);
}
