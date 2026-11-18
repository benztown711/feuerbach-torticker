import { ownColorFor } from './teams';
import type { Game, Team, Venue } from './types';

/** Spec 021 FR-W02: Vorbelegung von "Neues Spiel" nach "Nächstes Spiel" (abgeleitet, nicht gespeichert). */
export interface NextGameDraft {
  /** Mannschaft aus "Meine Mannschaften"; null, wenn es sie dort nicht (mehr) gibt. */
  teamId: string | null;
  venue: Venue;
  sections: number;
  minutes: number;
  ownColor: string;
  /** Weicht vom Heim- bzw. Auswärtstrikot ab: "Feuerbach-Trikot nur für dieses Spiel geändert" (Spec 004 FR-M03). */
  ownTouched: boolean;
  oppColor: string;
  /** "Live aufs Dashboard": aus nur, wenn das beendete Spiel auf "Nicht live senden" stand. */
  live: boolean;
}

/** `venue`: Heim/Gast des neuen Spiels, falls ein Planspiel es vorgibt (FR-W03); sonst wie im beendeten Spiel. */
export function nextGameDraft(game: Game, teams: Team[], venue: Venue = game.venue): NextGameDraft {
  const team = teams.find((t) => t.name === game.ownTeam);
  return {
    teamId: team?.id ?? null,
    venue,
    sections: game.schema.sections,
    minutes: game.schema.sectionMinutes,
    ownColor: game.ownColor,
    ownTouched: !team || ownColorFor(team, venue) !== game.ownColor,
    oppColor: game.oppColor,
    live: game.live !== false,
  };
}

/**
 * Spec 021 FR-W03: das früheste Planspiel der Mannschaft unter "Aus dem Spielplan · heute" (schon ohne abgesagte
 * und angelegte), das kein anderer Trainer vorgemerkt hat (Vormerkung "" = frei, "du" = dieses Handy).
 */
export function nextPlanChoice<C extends { entry: { team: string }; claim: string }>(
  today: C[],
  teamKey: string | undefined,
): C | null {
  return today.find((c) => c.entry.team === teamKey && (c.claim === '' || c.claim === 'du')) ?? null;
}
