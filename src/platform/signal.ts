/**
 * Signal am Abschnittsende (FR-007, research.md R-4): Ton über Web Audio, Vibration wo vorhanden.
 *
 * iOS-Besonderheiten (Fehlerbericht vom 02.11.2026):
 * - Ton nur nach einer Berührung: unlockAudio() muss in einem Tap-Handler laufen und spielt dort
 *   einen stillen Puffer ab, sonst bleibt der AudioContext gesperrt.
 * - Nach dem Wechsel in den Hintergrund steht der Context auf "interrupted"/"suspended" und muss
 *   durch die nächste Berührung erneut freigeschaltet werden (audioReady() meldet das der Oberfläche).
 * - Audio-Session "playback" (Safari 17+), damit der Lautlos-Schalter den Signalton nicht stummschaltet.
 */
let ctx: AudioContext | null = null;

interface AudioSessionNavigator {
  audioSession?: { type: string };
}

function setPlaybackSession(): void {
  const session = (navigator as unknown as AudioSessionNavigator).audioSession;
  if (session && session.type !== 'playback') {
    try {
      session.type = 'playback';
    } catch {
      /* ältere Browser: ignorieren */
    }
  }
}

function context(): AudioContext | null {
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

/** Muss aus einem Tap-Handler aufgerufen werden (Anpfiff, jede weitere Berührung im Spiel). */
export function unlockAudio(): void {
  setPlaybackSession();
  const c = context();
  if (!c) return;
  if (c.state !== 'running') void c.resume();
  // Stiller Puffer innerhalb der Berührung: schaltet Web Audio auf iOS zuverlässig frei.
  const src = c.createBufferSource();
  src.buffer = c.createBuffer(1, 1, 22050);
  src.connect(c.destination);
  src.start(0);
}

/** true, wenn ein Signal jetzt hörbar abgespielt werden kann. */
export function audioReady(): boolean {
  return ctx !== null && ctx.state === 'running';
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

function playBeeps(c: AudioContext): void {
  const t = c.currentTime;
  beep(c, t, 1760);
  beep(c, t + 0.6, 1760);
}

/** Doppelton, etwa 1,2 Sekunden. */
export function playSignal(): void {
  const c = ctx;
  if (c) {
    if (c.state === 'running') playBeeps(c);
    else
      void c
        .resume()
        .then(() => {
          if (c.state === 'running') playBeeps(c);
        })
        .catch(() => undefined);
  }
  if (typeof navigator.vibrate === 'function') navigator.vibrate([300, 150, 300]);
}
