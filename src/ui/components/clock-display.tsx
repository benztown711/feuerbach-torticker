import type { ClockState } from '../../domain/clock';
import { formatClock } from '../../domain/format';

const caption = (c: ClockState): string => {
  switch (c.status) {
    case 'created':
      return 'Vor dem Anpfiff';
    case 'paused':
      return 'Uhr angehalten';
    case 'break':
      return 'Pause zwischen den Abschnitten';
    case 'finished':
      return 'Spiel beendet';
    case 'running':
      return c.isOvertime ? 'Nachspielzeit · Signal jede volle Minute' : 'Restzeit';
  }
};

/** Uhr mit gleich breiten Ziffern (FR-017), Nachspielzeit in rot-text, Blinken beim Signal. */
export function ClockDisplay({ clock, flash }: { clock: ClockState; flash: boolean }) {
  const overtime = clock.isOvertime && clock.status !== 'finished' && clock.status !== 'break';
  const cls = ['clock__time', overtime ? 'clock__time--overtime' : '', flash ? 'clock__time--flash' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div class="clock">
      <div class={cls} data-testid="clock" data-overtime={String(overtime)} role="timer" aria-live="off">
        {formatClock(clock)}
      </div>
      <div class={overtime ? 'clock__caption clock__caption--overtime' : 'clock__caption'} data-testid="clock-caption">
        {caption(clock)}
      </div>
    </div>
  );
}
