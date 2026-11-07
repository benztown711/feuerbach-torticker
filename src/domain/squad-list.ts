import { parseRosterList } from './roster-parse';
import { listSquadName } from './squads';

/**
 * Spec 016 FR-B14 (R-B7): Kader-Liste aus "Kader teilen" (erste Zeile "Kader <Name>:" und mindestens ein Kind).
 * Eigenes Modul, damit das Lesen von Listen nur in den nachgeladenen Teilen landet (Bundle-Budget).
 */
export const isSquadList = (text: string): boolean => listSquadName(text) !== null && parseRosterList(text).length > 0;
