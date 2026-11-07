import { describe, expect, it } from 'vitest';
import { updateAction } from '../../src/domain/update-policy';

describe('007 FR-N09 neue Version', () => {
  it('auf der Seite des Zuschauer-Links sofort neu laden, ohne Rückfrage', () => {
    expect(updateAction('liveView', true)).toBe('reload');
  });

  it('im Torticker bleibt der Hinweis, im Spiel wird er zurückgehalten', () => {
    expect(updateAction('start', true)).toBe('prompt');
    expect(updateAction('liveDash', true)).toBe('prompt');
    expect(updateAction('game', true)).toBe('none');
  });

  it('ohne neue Version nichts', () => {
    for (const r of ['liveView', 'start', 'game']) expect(updateAction(r, false)).toBe('none');
  });
});
