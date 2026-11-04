import type { Schema } from './types';

export interface MinuteInfo {
  /** Reguläre Minute, höchstens das Abschnittsende. */
  minute: number;
  /** Angefangene Nachspielminute oder null. */
  stoppage: number | null;
  label: string;
}

const MINUTE_MS = 60_000;

/** Spec 003 FR-P02: reguläre Abschnitte plus zwei Abschnitte Verlängerung. */
export const totalSections = (schema: Schema): number => schema.sections + (schema.extraMinutes ? 2 : 0);

/** Länge eines Abschnitts in Minuten (Verlängerung kürzer). */
export const sectionMinutesOf = (schema: Schema, section: number): number =>
  section > schema.sections && schema.extraMinutes ? schema.extraMinutes : schema.sectionMinutes;

/** Minuten vor Beginn des Abschnitts (fortlaufende Zählung, auch in der Verlängerung). */
export function sectionOffset(schema: Schema, section: number): number {
  const regular = Math.min(section - 1, schema.sections) * schema.sectionMinutes;
  return regular + Math.max(0, section - 1 - schema.sections) * (schema.extraMinutes ?? 0);
}

export function formatMinute(minute: number, stoppage: number | null): string {
  return stoppage === null ? `${minute}'` : `${minute}+${stoppage}'`;
}

/**
 * Minutenformel (research.md R-3, FR-005): angefangene Minute, fortlaufend über alle Abschnitte.
 * In der Nachspielzeit "<Abschnittsende>+<angefangene Nachspielminute>".
 */
export function minuteFor(section: number, playedMs: number, schema: Schema): MinuteInfo {
  const played = Math.max(0, playedMs);
  const length = sectionMinutesOf(schema, section);
  const sectionMs = length * MINUTE_MS;
  const offset = sectionOffset(schema, section);
  if (played < sectionMs) {
    const minute = offset + Math.floor(played / MINUTE_MS) + 1;
    return { minute, stoppage: null, label: formatMinute(minute, null) };
  }
  const minute = offset + length;
  const stoppage = Math.floor((played - sectionMs) / MINUTE_MS) + 1;
  return { minute, stoppage, label: formatMinute(minute, stoppage) };
}
