import type { Schema } from './types';

export interface MinuteInfo {
  /** Reguläre Minute, höchstens das Abschnittsende. */
  minute: number;
  /** Angefangene Nachspielminute oder null. */
  stoppage: number | null;
  label: string;
}

const MINUTE_MS = 60_000;

export function formatMinute(minute: number, stoppage: number | null): string {
  return stoppage === null ? `${minute}'` : `${minute}+${stoppage}'`;
}

/**
 * Minutenformel (research.md R-3, FR-005): angefangene Minute, fortlaufend über alle Abschnitte.
 * In der Nachspielzeit "<Abschnittsende>+<angefangene Nachspielminute>".
 */
export function minuteFor(section: number, playedMs: number, schema: Schema): MinuteInfo {
  const played = Math.max(0, playedMs);
  const sectionMs = schema.sectionMinutes * MINUTE_MS;
  const offset = (section - 1) * schema.sectionMinutes;
  if (played < sectionMs) {
    const minute = offset + Math.floor(played / MINUTE_MS) + 1;
    return { minute, stoppage: null, label: formatMinute(minute, null) };
  }
  const minute = offset + schema.sectionMinutes;
  const stoppage = Math.floor((played - sectionMs) / MINUTE_MS) + 1;
  return { minute, stoppage, label: formatMinute(minute, stoppage) };
}
