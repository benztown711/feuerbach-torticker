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
  /** Spec 003 FR-E01: Elfmeter (fehlt bei älteren Spielen = nein). */
  penalty?: boolean;
}

interface EventBase {
  id: string;
  /** Uhrzeit (z. B. Zuordnung zur Videoaufnahme). */
  at: number;
  section: number;
  minute: number;
  stoppage: number | null;
}

/** Spec 003 FR-E05: Lesezeichen (intern, nie im geteilten Text). */
export interface MarkEvent extends EventBase {
  kind: 'mark';
  comment: string;
}

export type CardColor = 'gelb' | 'gelbrot' | 'rot' | 'zeit';
/** Spieler bei Ereignissen: eigene aus dem Kader, Gegner als Freitext. */
export type EventPerson = { kind: 'player'; playerId: string } | { kind: 'text'; text: string } | null;

/** Spec 003 FR-E03: Karte (Gelb, Gelb-Rot, Rot, Zeitstrafe). */
export interface CardEvent extends EventBase {
  kind: 'card';
  side: Side;
  card: CardColor;
  who: EventPerson;
  comment: string;
}

/** Spec 003 FR-E04: Wechsel der eigenen Mannschaft. */
export interface SubEvent extends EventBase {
  kind: 'sub';
  outId: string;
  inId: string;
}

/** Spec 003: Ereignis im Spiel. */
export type GameEvent = MarkEvent | CardEvent | SubEvent;

/** Spec 003 FR-E02: Schalter "Im Spiel erfassen". */
export interface EventFeatures {
  cards: boolean;
  subs: boolean;
  marks: boolean;
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
  /** Spec 003; fehlt bei älteren Spielen. */
  events?: GameEvent[];
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

/** Spec 004: eigene Mannschaft mit Heim- und Auswärtstrikot. */
export interface Team {
  id: string;
  name: string;
  homeColor: string;
  awayColor: string;
  lastSchema: Schema | null;
  lastSquad: string[];
  /** 0 = noch nie genutzt. */
  lastUsedAt: number;
}

export interface Settings {
  /** Spec 004 FR-M01. */
  teams: Team[];
  /** Spec 003 FR-E02. */
  features: EventFeatures;
  /** Nur noch Quelle der Migration (vor Spec 004). */
  recentOwnTeams: string[];
  lastSchema: Schema;
  lastSquad: string[];
  /** Nur noch Quelle der Migration (vor Spec 004); die eigene Farbe kommt aus der Mannschaft. */
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
