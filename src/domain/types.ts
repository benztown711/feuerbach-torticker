/**
 * Datenmodell laut specs/001-spiel-erfassen/data-model.md.
 * Alle Zeitstempel sind Epoch-Millisekunden (Date.now()).
 */

export type Venue = 'home' | 'away';
export type Side = 'own' | 'opp';
export type GameStatus = 'created' | 'running' | 'paused' | 'break' | 'finished';
export type Theme = 'system' | 'light' | 'dark';

export interface Schema {
  /** Anzahl Abschnitte, 1 bis 4. */
  sections: number;
  /** Dauer eines Abschnitts in Minuten, 1 bis 60. */
  sectionMinutes: number;
}

export type ClockEventType = 'kickoff' | 'pause' | 'resume' | 'sectionEnd' | 'fullTime' | 'reset';

export interface ClockEvent {
  type: ClockEventType;
  at: number;
  /** 1-basiert. */
  section: number;
}

export type Scorer = { kind: 'player'; playerId: string } | { kind: 'text'; text: string } | { kind: 'ownGoal' } | null;

export interface Goal {
  id: string;
  side: Side;
  /** Uhrzeit des Taps (FR-022). */
  at: number;
  section: number;
  /** Reguläre Minute, höchstens das Abschnittsende. */
  minute: number;
  /** Angefangene Nachspielminute, z. B. 1 für "25+1'". */
  stoppage: number | null;
  scorer: Scorer;
  /** Gesetzt, wenn das Tor entfernt wurde (FR-008); zählt dann nicht. */
  deletedAt: number | null;
}

export interface Score {
  own: number;
  opp: number;
}

export interface Game {
  id: string;
  schemaVersion: 1;
  ownTeam: string;
  opponent: string;
  venue: Venue;
  schema: Schema;
  ownColor: string;
  oppColor: string;
  createdAt: number;
  clockEvents: ClockEvent[];
  goals: Goal[];
  signalledThresholds: string[];
  squad: string[];
  status: GameStatus;
  finalScore: Score | null;
  halfTimeScore: Score | null;
}

export interface Player {
  id: string;
  name: string;
  number: number | null;
  deletedAt: number | null;
}

export interface Settings {
  recentOwnTeams: string[];
  lastSchema: Schema;
  lastSquad: string[];
  /** null = Vorgabe Rot; gesetzt, sobald die eigene Farbe einmal geändert wurde (FR-031). */
  lastOwnColor: string | null;
  /** Zuletzt genutzte Farbe je Gegnername (normalisiert). */
  opponentColors: Record<string, string>;
  theme: Theme;
  installHintDismissedAt: number | null;
}

export interface NewGameInput {
  ownTeam: string;
  opponent: string;
  venue: Venue;
  schema: Schema;
  ownColor: string;
  oppColor: string;
  /** FR-030: Spieler-IDs des Aufgebots; leer = ganzer Kader. */
  squad?: string[];
}
