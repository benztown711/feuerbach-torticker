import { minuteFor } from './minute';
import type { ClockEvent, GameStatus, Schema } from './types';

export interface ClockState {
  status: GameStatus;
  /** Abschnitt des letzten Anpfiffs (vor dem ersten Anpfiff: 1). */
  section: number;
  /** Abschnitt, den der nächste Anpfiff startet; null, wenn kein Anpfiff möglich ist. */
  kickoffSection: number | null;
  /** Dauer eines Abschnitts in ms. */
  sectionMs: number;
  playedMs: number;
  remainingMs: number;
  overtimeMs: number;
  isOvertime: boolean;
  minute: number;
  stoppage: number | null;
  label: string;
  /** Signalschwellen (00:00 und volle Nachspielminuten), die erreicht und noch nicht signalisiert sind (FR-007). */
  dueThresholds: string[];
}

const MINUTE_MS = 60_000;

export function thresholdKey(section: number, overtimeMinute: number): string {
  return overtimeMinute === 0 ? `${section}:0` : `${section}:+${overtimeMinute}`;
}

/**
 * Leitet den Uhrzustand allein aus Ereignissen und der aktuellen Zeit ab (Constitution V, FR-006).
 * Nichts wird hochgezählt: Sperrbildschirm, Hintergrund und Neuladen ändern das Ergebnis nicht.
 */
export function deriveClock(events: ClockEvent[], nowMs: number, schema: Schema, signalled: string[] = []): ClockState {
  let status: GameStatus = 'created';
  let section = 1;
  let kickoffSection: number | null = 1;
  let played = 0;
  let since: number | null = null;

  const stop = (at: number): void => {
    if (since !== null) played += Math.max(0, at - since);
    since = null;
  };

  for (const e of events) {
    switch (e.type) {
      case 'kickoff':
        section = e.section;
        played = 0;
        since = e.at;
        status = 'running';
        kickoffSection = null;
        break;
      case 'pause':
        if (status === 'running') {
          stop(e.at);
          status = 'paused';
        }
        break;
      case 'resume':
        if (status === 'paused') {
          since = e.at;
          status = 'running';
        }
        break;
      case 'sectionEnd':
        stop(e.at);
        status = 'break';
        kickoffSection = e.section + 1;
        break;
      case 'fullTime':
        stop(e.at);
        status = 'finished';
        kickoffSection = null;
        break;
      case 'reset':
        played = 0;
        since = null;
        section = e.section;
        status = e.section === 1 ? 'created' : 'break';
        kickoffSection = e.section;
        break;
    }
  }

  const playedMs = played + (since !== null ? Math.max(0, nowMs - since) : 0);
  const sectionMs = schema.sectionMinutes * MINUTE_MS;
  const overtimeMs = Math.max(0, playedMs - sectionMs);
  const { minute, stoppage, label } = minuteFor(section, playedMs, schema);

  const dueThresholds: string[] = [];
  if ((status === 'running' || status === 'paused') && playedMs >= sectionMs) {
    const fullMinutes = Math.floor(overtimeMs / MINUTE_MS);
    for (let k = 0; k <= fullMinutes; k++) {
      const key = thresholdKey(section, k);
      if (!signalled.includes(key)) dueThresholds.push(key);
    }
  }

  return {
    status,
    section,
    kickoffSection,
    sectionMs,
    playedMs,
    remainingMs: Math.max(0, sectionMs - playedMs),
    overtimeMs,
    isOvertime: overtimeMs > 0,
    minute,
    stoppage,
    label,
    dueThresholds,
  };
}
