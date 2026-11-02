import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { ClockDisplay } from '../../src/ui/components/clock-display';
import { deriveClock } from '../../src/domain/clock';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const two25 = { sections: 2, sectionMinutes: 25 };
const kick = [{ type: 'kickoff' as const, at: T0, section: 1 }];

describe('T033 FR-017 Uhranzeige', () => {
  it('zeigt die Restzeit mm:ss mit gleich breiten Ziffern', () => {
    render(<ClockDisplay clock={deriveClock(kick, T0 + 372_000, two25)} flash={false} />);
    const clock = screen.getByTestId('clock');
    expect(clock.textContent).toBe('18:48');
    expect(clock.getAttribute('data-overtime')).toBe('false');
    expect(clock.className).toContain('clock__time');
    expect(screen.getByTestId('clock-caption').textContent).toBe('Restzeit');
  });

  it('US2-S3 zeigt die Nachspielzeit mit Plus und markiert sie', () => {
    render(<ClockDisplay clock={deriveClock(kick, T0 + 26 * 60_000 + 12_000, two25)} flash={true} />);
    const clock = screen.getByTestId('clock');
    expect(clock.textContent).toBe('+1:12');
    expect(clock.getAttribute('data-overtime')).toBe('true');
    expect(clock.className).toContain('clock__time--overtime');
    expect(clock.className).toContain('clock__time--flash');
    expect(screen.getByTestId('clock-caption').textContent).toBe('Nachspielzeit · Signal jede volle Minute');
  });

  it('zeigt Halbzeitpause, angehaltene Uhr und Spielende', () => {
    const brk = deriveClock([...kick, { type: 'sectionEnd', at: T0 + 1_500_000, section: 1 }], T0 + 1_600_000, two25);
    const { rerender } = render(<ClockDisplay clock={brk} flash={false} />);
    expect(screen.getByTestId('clock-caption').textContent).toBe('Pause zwischen den Abschnitten');
    rerender(
      <ClockDisplay
        clock={deriveClock([...kick, { type: 'pause', at: T0 + 1000, section: 1 }], T0 + 5000, two25)}
        flash={false}
      />,
    );
    expect(screen.getByTestId('clock-caption').textContent).toBe('Uhr angehalten');
    rerender(
      <ClockDisplay
        clock={deriveClock([...kick, { type: 'fullTime', at: T0 + 1000, section: 1 }], T0 + 5000, two25)}
        flash={false}
      />,
    );
    expect(screen.getByTestId('clock').textContent).toBe('Ende');
  });
});
