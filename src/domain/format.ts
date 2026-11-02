import type { ClockState } from './clock';

/** m:ss, z. B. 1:05 oder 25:00. */
export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Anzeige der Uhr (FR-017): Restzeit aufgerundet (00:00 erscheint genau am Ende),
 * Nachspielzeit mit "+", vor dem Anpfiff bzw. in der Pause die volle Abschnittsdauer.
 */
export function formatClock(clock: ClockState): string {
  if (clock.status === 'finished') return 'Ende';
  if (clock.status === 'created' || clock.status === 'break') {
    return formatDuration(clock.sectionMs);
  }
  if (clock.isOvertime) return `+${formatDuration(clock.overtimeMs)}`;
  return formatDuration(Math.ceil(clock.remainingMs / 1000) * 1000);
}

/** Uhrzeit HH:MM:SS bzw. HH:MM (FR-022). */
export function formatTime(at: number, timeZone?: string, seconds = true): string {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    ...(timeZone ? { timeZone } : {}),
  }).format(at);
}
