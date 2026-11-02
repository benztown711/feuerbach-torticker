import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/preact';
import { Confirm } from '../../src/ui/components/confirm';

describe('T027 FR-006 Sicherheitsabfrage', () => {
  it('zeigt Titel, Text und Knöpfe und meldet Ja/Nein', () => {
    const yes = vi.fn();
    const no = vi.fn();
    render(<Confirm title="Uhr wirklich anhalten?" text="Die Uhr steht." yesLabel="Anhalten" onYes={yes} onNo={no} />);
    expect(screen.getByRole('dialog', { name: 'Uhr wirklich anhalten?' })).toBeTruthy();
    expect(screen.getByText('Die Uhr steht.')).toBeTruthy();
    fireEvent.click(screen.getByTestId('confirm-yes'));
    expect(yes).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('confirm-no'));
    expect(no).toHaveBeenCalledTimes(1);
  });

  it('US2-S10 Tippen außerhalb bricht ab', () => {
    const no = vi.fn();
    render(<Confirm title="Schlusspfiff?" text="" yesLabel="Schlusspfiff" onYes={vi.fn()} onNo={no} />);
    fireEvent.click(screen.getByTestId('confirm-backdrop'));
    expect(no).toHaveBeenCalledTimes(1);
  });
});
