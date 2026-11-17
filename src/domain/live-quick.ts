import { joinList } from './format';
import { teamShortLabel } from './history';
import { addableTeams } from './live-manage';
import { isOrganizer, isRetired, liveTeamFor, liveTeamOptions, type LiveTeamOption } from './live-spieltag';
import { MAX_LIVE_TEAMS } from './live-validate';
import type { Game, Settings, Team } from './types';
import { normalizeName } from './validation';

/**
 * Spec 020 US1 (FR-E03 bis FR-E07, research.md R-E2): "Eltern live zuschauen lassen" auf dem Startbildschirm und
 * im Spielmenü. Reine Regeln; ausgeführt werden sie über die bestehenden Wege (createLive, addTeamToLive, setLive).
 */

/** Mannschaft des aktuellen Spiels: gehört dazu (null), kommt dazu (`add`) oder fehlt (`missing`). */
export type QuickTeam =
  { kind: 'add'; option: LiveTeamOption; label: string } | { kind: 'missing'; label: string } | null;

export type QuickAction =
  /** FR-E03: kein Knopf. */
  | { kind: 'hidden' }
  /** FR-E06: Blatt "Eltern live zuschauen lassen" mit "Link einfügen" und "Neu starten". */
  | { kind: 'start' }
  /** FR-E04: sofort teilen; `makeLive` schaltet das Spiel wieder auf "Live senden". */
  | { kind: 'share'; makeLive: boolean; team: QuickTeam };

/** Nicht beendetes Spiel, sonst null (beendete Spiele werden nicht nachträglich gesendet, FR-E09). */
const openGame = (game: Game | null): Game | null => (game && game.status !== 'finished' ? game : null);

const sameTeam = (a: string, b: string): boolean => normalizeName(a) === normalizeName(b);

export function quickAction(settings: Settings, game: Game | null): QuickAction {
  const live = settings.live;
  if (live && isRetired(live)) return { kind: 'hidden' };
  if (!live) return settings.teams.length > 0 ? { kind: 'start' } : { kind: 'hidden' };
  const g = openGame(game);
  if (!g) return { kind: 'share', makeLive: false, team: null };
  const makeLive = g.live === false && g.liveHandedOver !== true;
  if (liveTeamFor(g.ownTeam, live)) return { kind: 'share', makeLive, team: null };
  const label = teamShortLabel(g.ownTeam);
  const option = isOrganizer(live)
    ? addableTeams(live, settings.teams).find((o) => sameTeam(o.team.name, g.ownTeam))
    : undefined;
  return { kind: 'share', makeLive, team: option ? { kind: 'add', option, label } : { kind: 'missing', label } };
}

/**
 * FR-E07: Mannschaften für "Neu starten": die des aktuellen, nicht beendeten Spiels (falls unter "Meine
 * Mannschaften"), sonst die einzige, sonst alle in der Reihenfolge von "Meine Mannschaften", höchstens sechs.
 */
export function quickTeams(teams: Team[], game: Game | null): string[] {
  const g = openGame(game);
  const own = g ? teams.find((t) => sameTeam(t.name, g.ownTeam)) : undefined;
  if (own) return [own.id];
  return teams.slice(0, MAX_LIVE_TEAMS).map((t) => t.id);
}

/** FR-E06: "Neu mit E1 und E2." (Kurzformen wie auf den Chips). */
export function startHint(teams: Team[], ids: string[]): string {
  const keys = liveTeamOptions(teams)
    .filter((o) => ids.includes(o.team.id))
    .map((o) => o.key);
  return `Neu mit ${joinList(keys)}.`;
}

/** FR-E05: Hinweis zur Mannschaft des Spiels. */
export function teamHint(team: QuickTeam): string | null {
  if (!team) return null;
  return team.kind === 'add'
    ? `${team.label} ist jetzt dabei.`
    : `${team.label} gehört nicht zum Live-Spieltag. Eltern sehen dieses Spiel nicht.`;
}
