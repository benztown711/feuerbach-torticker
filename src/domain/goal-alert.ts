import type { BoardCard } from './live-board';

/**
 * Spec 020 US3 (FR-E21 bis FR-E23): Ein neues Tor bei offenem Dashboard erkennen und beschreiben, für Tab-Titel,
 * Ansage, Vibration und Ton. Nichts davon wird gespeichert oder übertragen (R-E6).
 */

/** Eine Meldung gilt als frisch, wenn sie beim Empfang weniger als so alt ist (wie die Hervorhebung, Spec 006). */
const FRESH_MS = 60_000;

export interface GoalAlert {
  gameId: string;
  /** Mannschaft, die getroffen hat, wie auf der Karte. */
  team: string;
  /** Stand nach dem Tor, Heim:Gast. */
  score: string;
  /** Übertragener Torschütze, "Eigentor" oder `null`. */
  scorer: string | null;
  /** Serverzeit der Meldung (ms). */
  at: number;
}

type Card = Pick<BoardCard, 'gameId' | 'goals' | 'updatedAt'>;

/**
 * FR-E21: Je Spiel mit gestiegener Toranzahl und frischer Meldung das neueste Tor, in der Reihenfolge der Karten.
 * `prev` ist die Toranzahl je Spiel beim vorigen Stand; `null` (erstes Laden) und neu erscheinende Spiele melden
 * nichts, ebenso Korrekturen (gleiche Anzahl) und Entfernen (kleinere Anzahl).
 */
export function newGoals(
  prev: ReadonlyMap<string, number> | null,
  cards: readonly Card[],
  serverNow: number,
): GoalAlert[] {
  if (!prev) return [];
  return cards.flatMap((c): GoalAlert[] => {
    const before = prev.get(c.gameId) ?? c.goals.length;
    const newest = c.goals[0];
    if (!newest || c.goals.length <= before || serverNow - c.updatedAt >= FRESH_MS) return [];
    return [{ gameId: c.gameId, team: newest.team, score: newest.score, scorer: newest.scorer, at: c.updatedAt }];
  });
}

/** Bei mehreren neuen Toren zählt das zuletzt gemeldete Tor (FR-E22), bei gleichem Zeitpunkt das spätere. */
export function latestGoal(goals: readonly GoalAlert[]): GoalAlert {
  return goals.reduce((best, g) => (g.at >= best.at ? g : best));
}

/** FR-E22: "Tor! Feuerbach E1 3:1". */
export const goalTitle = (g: GoalAlert): string => `Tor! ${g.team} ${g.score}`;

/** FR-E23: "Tor für Feuerbach E1, 3 zu 1, Tom"; ohne übertragenen Torschützen entfällt der Name. */
export function goalSpeech(g: GoalAlert): string {
  const score = g.score.replace(':', ' zu ');
  return g.scorer === null ? `Tor für ${g.team}, ${score}` : `Tor für ${g.team}, ${score}, ${g.scorer}`;
}
