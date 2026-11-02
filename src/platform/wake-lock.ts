/**
 * Bildschirm wach halten, solange die Uhr läuft (FR-013, research.md R-5).
 * Ohne Wake-Lock-API passiert nichts; die App-Hilfe weist dann auf die Auto-Sperre hin.
 */
let sentinel: WakeLockSentinel | null = null;
let wanted = false;

async function request(): Promise<void> {
  if (!wanted || sentinel || !('wakeLock' in navigator)) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    sentinel = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void request();
});

export function keepAwake(on: boolean): void {
  wanted = on;
  if (on) void request();
  else if (sentinel) {
    void sentinel.release();
    sentinel = null;
  }
}

export const wakeLockSupported = (): boolean => 'wakeLock' in navigator;
