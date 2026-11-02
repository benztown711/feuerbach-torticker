/**
 * Signal am Abschnittsende (FR-007, research.md R-4): Ton über Web Audio, Vibration wo vorhanden.
 * iOS spielt Töne nur nach einer Berührung: unlockAudio() wird beim Anpfiff aufgerufen.
 */
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

export function unlockAudio(): void {
  const c = context();
  if (c && c.state === 'suspended') void c.resume();
}

function beep(c: AudioContext, start: number, frequency: number): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(0.6, start + 0.02);
  gain.gain.linearRampToValueAtTime(0.0001, start + 0.45);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + 0.5);
}

/** Doppelton, etwa 1,2 Sekunden. */
export function playSignal(): void {
  const c = context();
  if (c) {
    const t = c.currentTime;
    beep(c, t, 1760);
    beep(c, t + 0.6, 1760);
  }
  if (typeof navigator.vibrate === 'function') navigator.vibrate([300, 150, 300]);
}
