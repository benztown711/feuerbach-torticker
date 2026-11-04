/**
 * Datenmodell laut specs/001-spiel-erfassen/data-model.md.
 * Alle Zeitstempel sind Epoch-Millisekunden (Date.now()).
 */

export type Venue = 'home' | 'away';
export type Side = 'own' | 'opp';
export type GameStatus = 'created' | 'running' | 'paused' | 'break' | 'finished';
export type Theme = 'system' | 'light' | 'dark';

/** Spec 008 FR-K01. */
export type SignalSound = 'pfiff' | 'glocke' | 'gong';

export interface Schema {
  /** Anzahl Abschnitte, 1 bis 4. */
  sections: number;
  /** Dauer eines Abschnitts in Minuten, 1 bis 60. */
  sectionMinutes: number;
  /** Spec 003 FR-P02: Verlängerung mit zwei Abschnitten dieser Länge (fehlt = keine). */
  extraMinutes?: number;
}

export type ClockEventType = 'kickoff' | 'pause' | 'resume' | 'sectionEnd' | 'fullTime' | 'reset' | 'extraTime';

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

/** Spec 003 FR-P03: ein Schuss im Elfmeterschießen. */
export interface Shot {
  side: Side;
  hit: boolean;
  who: EventPerson;
  at: number;
}

export interface Shootout {
  first: Side;
  shots: Shot[];
  /** "Elfmeterschießen beenden" bestätigt. */
  done: boolean;
}

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
  /** Spec 003 FR-P01: Unentschieden bestätigt (keine Abfrage mehr). */
  drawSettled?: boolean;
  /** Spec 003 FR-P03: Elfmeterschießen. */
  shootout?: Shootout;
  signalledThresholds: string[];
  squad: string[];
  status: GameStatus;
  finalScore: Score | null;
  halfTimeScore: Score | null;
  /** Spec 006 FR-L09: false = "Nicht live senden"; fehlt = senden, wenn die Mannschaft gekoppelt ist. */
  live?: boolean;
  /**
   * Spec 006 FR-L09: beim Anlegen "Live aufs Dashboard" aus und seitdem nie eingeschaltet. Von diesem Spiel
   * ging nie etwas an den Vermittlungsdienst, darum auch kein "off" und beim Löschen kein "deleted".
   */
  livePrivate?: boolean;
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
  /** Spec 008 FR-K03: gewählter Signalton, Vorgabe Pfiff. */
  signalSound: SignalSound;
  installHintDismissedAt: number | null;
  /** Spec 006: Live-Spieltag dieses Geräts (Organisator und/oder Lead), höchstens einer. */
  live: LiveSpieltag | null;
  /** Spec 006 R-L6: zuletzt geöffneter Zuschauer-Link. */
  liveView: ViewerLink | null;
}

/** Spec 006: signierter JSON-Text (`d`) mit ECDSA-Signatur (`s`, base64url). */
export interface SignedData {
  d: string;
  s: string;
}

/** Spec 006 FR-L19: Titel und Mannschaften (Kurzlabel), signiert vom Organisator. */
export interface LiveConfig {
  title: string;
  teams: string[];
  iat: number;
}

/** Spec 006 R-L5: Lead-Zertifikat einer Mannschaft. */
export interface LeadCert {
  /** Kurzlabel, z. B. "E1". */
  key: string;
  /** Voller Name aus "Meine Mannschaften". */
  name: string;
  homeColor: string;
  awayColor: string;
  /** Öffentlicher Lead-Schlüssel, roh (65 Byte), base64url. */
  pub: string;
  iat: number;
}

/** Privater ECDSA-P-256-Schlüssel als JWK-Teile (base64url). */
export interface PrivateKeyParts {
  d: string;
  x: string;
  y: string;
}

/** Spec 006: eine Mannschaft des Live-Spieltags mit Sende-Berechtigung. */
export interface LiveTeamCred {
  key: string;
  name: string;
  homeColor: string;
  awayColor: string;
  leadKey: PrivateKeyParts;
  cert: SignedData;
  /** Dieses Gerät sendet für die Mannschaft. */
  sends: boolean;
}

/** Spec 006: Live-Spieltag (data-model.md). */
export interface LiveSpieltag {
  v: 1;
  /** Topic bei ntfy.sh (22 Zeichen base64url). */
  topic: string;
  /** AES-GCM-256, roh, base64url. */
  viewKey: string;
  /** Öffentlicher Organisator-Schlüssel, roh, base64url. */
  orgPub: string;
  /** Nur auf dem Organisator-Gerät. */
  orgKey?: PrivateKeyParts;
  config: SignedData;
  teams: LiveTeamCred[];
  createdAt: number;
}

/** Spec 006: Inhalt eines Zuschauer-Links. */
export interface ViewerLink {
  topic: string;
  viewKey: string;
  orgPub: string;
  title: string;
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
