import type { Game, Player } from './types';

/** Sicherung aller Spiele und des Kaders (FR-024, contracts/export.schema.json). */
export const BACKUP_FORMAT = 'feuerbach-torticker-backup';

export interface Backup {
  format: typeof BACKUP_FORMAT;
  schemaVersion: 1;
  exportedAt: number;
  appVersion?: string;
  games: Game[];
  players: Player[];
}

export function buildBackup(games: Game[], players: Player[], now: number, appVersion?: string): Backup {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: 1,
    exportedAt: now,
    ...(appVersion ? { appVersion } : {}),
    games,
    players,
  };
}

/** Dateiname mit Datum in Ortszeit: torticker-sicherung-JJJJ-MM-TT.json. */
export function backupFileName(now: number, timeZone?: string): string {
  const day = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(now);
  return `torticker-sicherung-${day}.json`;
}

// ---------- Prüfung beim Einlesen (gleiche Regeln wie das JSON-Schema) ----------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, min: number, max: number): boolean =>
  typeof v === 'string' && v.length >= min && v.length <= max;
const isInt = (v: unknown, min: number, max: number): boolean =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const isTime = (v: unknown): boolean => typeof v === 'number' && Number.isInteger(v);
const nullOr = (v: unknown, check: (x: unknown) => boolean): boolean => v === null || check(v);
const arrayOf = (v: unknown, check: (x: unknown) => boolean): boolean => Array.isArray(v) && v.every(check);
const oneOf = (v: unknown, values: readonly string[]): boolean => typeof v === 'string' && values.includes(v);

const BIG = Number.MAX_SAFE_INTEGER;
const EVENT_TYPES = ['kickoff', 'pause', 'resume', 'sectionEnd', 'fullTime', 'reset', 'extraTime'] as const;
const STATUS = ['created', 'running', 'paused', 'break', 'finished'] as const;

const isScore = (v: unknown): boolean => isObj(v) && isInt(v.own, 0, BIG) && isInt(v.opp, 0, BIG);

const isScorer = (v: unknown): boolean => {
  if (v === null) return true;
  if (!isObj(v)) return false;
  if (v.kind === 'player') return isStr(v.playerId, 1, 200);
  if (v.kind === 'text') return isStr(v.text, 1, 30);
  return v.kind === 'ownGoal';
};

const isEvent = (v: unknown): boolean =>
  isObj(v) && oneOf(v.type, EVENT_TYPES) && isTime(v.at) && isInt(v.section, 1, 4);

const isGoal = (v: unknown): boolean =>
  isObj(v) &&
  isStr(v.id, 1, 200) &&
  oneOf(v.side, ['own', 'opp']) &&
  isTime(v.at) &&
  isInt(v.section, 1, 4) &&
  isInt(v.minute, 1, 240) &&
  nullOr(v.stoppage, (x) => isInt(x, 1, BIG)) &&
  nullOr(v.deletedAt, isTime) &&
  (v.penalty === undefined || typeof v.penalty === 'boolean') &&
  isScorer(v.scorer);

/** Spec 003: Lesezeichen, Karten und Wechsel (optional in älteren Sicherungen). */
const isPerson = (v: unknown): boolean =>
  v === null ||
  (isObj(v) && ((v.kind === 'player' && isStr(v.playerId, 1, 200)) || (v.kind === 'text' && isStr(v.text, 1, 30))));

const isGameEvent = (v: unknown): boolean => {
  if (
    !isObj(v) ||
    !isStr(v.id, 1, 200) ||
    !isTime(v.at) ||
    !isInt(v.section, 1, 4) ||
    !isInt(v.minute, 1, 240) ||
    !nullOr(v.stoppage, (x) => isInt(x, 1, BIG))
  )
    return false;
  if (v.kind === 'mark') return isStr(v.comment, 0, 60);
  if (v.kind === 'card')
    return (
      oneOf(v.side, ['own', 'opp']) &&
      oneOf(v.card, ['gelb', 'gelbrot', 'rot', 'zeit']) &&
      isPerson(v.who) &&
      isStr(v.comment, 0, 60)
    );
  return v.kind === 'sub' && isStr(v.outId, 1, 200) && isStr(v.inId, 1, 200);
};

/** Spec 003 FR-P03: Elfmeterschießen (optional). */
const isShot = (v: unknown): boolean =>
  isObj(v) && oneOf(v.side, ['own', 'opp']) && typeof v.hit === 'boolean' && isPerson(v.who) && isTime(v.at);
const isShootout = (v: unknown): boolean =>
  isObj(v) && oneOf(v.first, ['own', 'opp']) && typeof v.done === 'boolean' && arrayOf(v.shots, isShot);

const isPlayer = (v: unknown): boolean =>
  isObj(v) &&
  isStr(v.id, 1, 200) &&
  isStr(v.name, 1, 24) &&
  nullOr(v.number, (x) => isInt(x, 1, 99)) &&
  nullOr(v.deletedAt, isTime);

const isGame = (v: unknown): boolean =>
  isObj(v) &&
  isStr(v.id, 1, 200) &&
  v.schemaVersion === 1 &&
  isStr(v.ownTeam, 1, 40) &&
  isStr(v.opponent, 1, 40) &&
  oneOf(v.venue, ['home', 'away']) &&
  isObj(v.schema) &&
  isInt(v.schema.sections, 1, 4) &&
  isInt(v.schema.sectionMinutes, 1, 60) &&
  (v.schema.extraMinutes === undefined || isInt(v.schema.extraMinutes, 1, 30)) &&
  (v.drawSettled === undefined || typeof v.drawSettled === 'boolean') &&
  (v.live === undefined || typeof v.live === 'boolean') &&
  (v.livePrivate === undefined || typeof v.livePrivate === 'boolean') &&
  (v.shootout === undefined || isShootout(v.shootout)) &&
  isStr(v.ownColor, 1, 40) &&
  isStr(v.oppColor, 1, 40) &&
  isTime(v.createdAt) &&
  oneOf(v.status, STATUS) &&
  arrayOf(v.signalledThresholds, (x) => typeof x === 'string') &&
  arrayOf(v.squad, (x) => typeof x === 'string') &&
  nullOr(v.finalScore, isScore) &&
  nullOr(v.halfTimeScore, isScore) &&
  arrayOf(v.clockEvents, isEvent) &&
  arrayOf(v.goals, isGoal) &&
  (v.events === undefined || arrayOf(v.events, isGameEvent));

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

/** Liest eine Sicherungsdatei; fremde oder beschädigte Dateien werden abgelehnt. */
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Die Datei ist keine Torticker-Sicherung (kein gültiges JSON).' };
  }
  if (!isObj(data) || data.format !== BACKUP_FORMAT || data.schemaVersion !== 1 || !isTime(data.exportedAt)) {
    return { ok: false, error: 'Die Datei ist keine Torticker-Sicherung.' };
  }
  if (!arrayOf(data.players, isPlayer)) return { ok: false, error: 'Der Kader in der Sicherung ist beschädigt.' };
  if (!arrayOf(data.games, isGame))
    return { ok: false, error: 'Mindestens ein Spiel in der Sicherung ist beschädigt.' };
  return { ok: true, backup: data as unknown as Backup };
}

export interface MergeResult {
  newGames: Game[];
  newPlayers: Player[];
  skippedGames: number;
}

/** Vorhandene Spiele (gleiche ID) werden übersprungen; Spieler per ID ergänzt, lokale Daten gewinnen. */
export function mergeBackup(existing: { games: Game[]; players: Player[] }, backup: Backup): MergeResult {
  const gameIds = new Set(existing.games.map((g) => g.id));
  const playerIds = new Set(existing.players.map((p) => p.id));
  const newGames = backup.games.filter((g) => !gameIds.has(g.id));
  return {
    newGames,
    newPlayers: backup.players.filter((p) => !playerIds.has(p.id)),
    skippedGames: backup.games.length - newGames.length,
  };
}
