import type { Player } from './types';

/**
 * Spec 024 R-E5: Kader-Kopie für Eltern, die tickern (klein, damit sie ohne den Kader-Abgleich der Trainer ins
 * Hauptbundle passt). Gebaut wird sie in `squad-sync.ts`.
 */

/** Nur Vorname bzw. Kürzel und Nummer, nur Mannschaften mit erlaubtem Eltern-Tickern. */
export interface ViewerSquad {
  s: string;
  t: string[];
  k: [name: string, number: number | null][];
  /** Jüngste Änderung von Kader oder Konfiguration (ms); ordnet die Zeile beim Dienst. */
  at: number;
}

const MAX_KIDS = 100;
const MAX_TEAMS = 6;
const MAX_NAME = 24;

const isSid = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);
const isTime = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const isName = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim() !== '' && v.length <= max;

const isViewerKid = (v: unknown): v is [string, number | null] =>
  Array.isArray(v) &&
  v.length === 2 &&
  isName(v[0], MAX_NAME) &&
  (v[1] === null || (Number.isInteger(v[1]) && (v[1] as number) >= 0 && (v[1] as number) <= 99));

/** Kopie streng prüfen; Ungültiges ergibt null. */
export function parseViewerSquad(v: unknown): ViewerSquad | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (!isSid(o.s) || !isTime(o.at) || !Array.isArray(o.t) || !Array.isArray(o.k)) return null;
  if (o.t.length > MAX_TEAMS || !o.t.every((x) => isName(x, 20))) return null;
  if (o.k.length > MAX_KIDS || !o.k.every(isViewerKid)) return null;
  return { s: o.s, t: o.t as string[], k: o.k as [string, number | null][], at: o.at };
}

/** Kader einer Mannschaft aus den Kopien, als Spieler ohne Kader-Kennung (nur für die Auswahl). */
export const viewerPlayers = (copies: ViewerSquad[], team: string): Player[] =>
  copies
    .filter((c) => c.t.includes(team))
    .flatMap((c) =>
      c.k.map(([name, number], i): Player => ({ id: `kader:${c.s}:${i}`, name, number, deletedAt: null })),
    );
