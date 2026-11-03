import { describe, expect, it, vi } from 'vitest';
import { checkOnForeground } from '../../src/platform/update-check';

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('FR-041 Update-Prüfung bei Rückkehr in den Vordergrund', () => {
  it('FR-041 prüft bei Rückkehr, höchstens einmal pro Minute, nicht beim Wechsel in den Hintergrund', () => {
    let now = 1_000_000;
    const update = vi.fn(() => Promise.resolve());
    const stop = checkOnForeground({ update }, document, () => now);
    setVisibility('hidden');
    expect(update).not.toHaveBeenCalled();
    setVisibility('visible');
    expect(update).toHaveBeenCalledTimes(1);
    now += 30_000;
    setVisibility('visible');
    expect(update).toHaveBeenCalledTimes(1);
    now += 31_000;
    setVisibility('visible');
    expect(update).toHaveBeenCalledTimes(2);
    stop();
    now += 120_000;
    setVisibility('visible');
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('FR-041 ohne Netz: Fehler beim Prüfen wird geschluckt', async () => {
    const update = vi.fn(() => Promise.reject(new TypeError('offline')));
    const stop = checkOnForeground({ update }, document, () => 5_000_000);
    setVisibility('visible');
    await Promise.resolve();
    expect(update).toHaveBeenCalledTimes(1);
    stop();
  });
});
