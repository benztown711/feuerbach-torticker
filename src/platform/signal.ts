/**
 * Signal am Abschnittsende (FR-007, FR-036, research.md R-4, R-17, R-18).
 *
 * Abgespielt über ein HTML-Audio-Element mit einer im Browser erzeugten WAV-Datei, nicht über
 * Web Audio. Gerätetest vom 02.11.2026: Web Audio läuft auf dem iPhone über den Klingelton-Kanal,
 * wird vom Lautlos-Schalter stummgeschaltet, ist leise und verstummt nach einigen Minuten.
 * Ein Audio-Element nutzt den Medien-Kanal (Lautstärketasten, kein Lautlos-Schalter).
 *
 * iOS erlaubt das spätere, automatische Abspielen nur, wenn dasselbe Element einmal innerhalb einer
 * Berührung gestartet wurde: unlockAudio() spielt es dort stumm an. Lehnt iOS später ab
 * (z. B. nach dem Hintergrund), meldet audioReady() false und die Oberfläche bittet um eine Berührung.
 */
const SAMPLE_RATE = 22050;
const TONE_HZ = 2900; // Bereich, in dem kleine Handy-Lautsprecher am lautesten sind
const BEEP_S = 0.3;
const GAP_S = 0.15;
const BEEPS = 3;
const TAIL_S = 0.15;
const FADE_S = 0.005;
const LEAD_S = 0.15; // Stille vorweg: iOS verschluckt sonst den Anfang des ersten Pfiffs

let audio: HTMLAudioElement | null = null;
let unlocked = false;
let still: HTMLAudioElement | null = null;
let keepAliveWanted = false;

// Gerätetest 02.11.: Nach Hintergrund hielt die App den Ton für freigeschaltet, iOS hatte ihn aber gesperrt.
// Darum gilt der Ton nach jeder Rückkehr als gesperrt, bis eine Berührung ihn neu freischaltet (FR-036, R-20).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') unlocked = false;
  });
}

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

/** Drei laute, kurze Pfeiftöne als 16-Bit-Mono-WAV. */
export function buildSignalWav(): ArrayBuffer {
  const total = LEAD_S + BEEPS * BEEP_S + (BEEPS - 1) * GAP_S + TAIL_S;
  const samples = Math.round(total * SAMPLE_RATE);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buffer);
  const text = (offset: number, s: string): void => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  v.setUint32(4, 36 + samples * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const t0 = i / SAMPLE_RATE;
    const t = t0 - LEAD_S;
    const period = BEEP_S + GAP_S;
    const inPeriod = t % period;
    const beepIndex = Math.floor(t / period);
    let value = 0;
    if (t >= 0 && beepIndex < BEEPS && inPeriod < BEEP_S) {
      const fade = Math.min(1, inPeriod / FADE_S, (BEEP_S - inPeriod) / FADE_S);
      // Stark übersteuerter Sinus: nahezu Rechteck, hoher Lautheitseindruck ohne harte Knackser.
      const raw = Math.max(-1, Math.min(1, Math.sin(2 * Math.PI * TONE_HZ * t) * 3));
      value = raw * fade * 0.98;
    }
    v.setInt16(44 + i * 2, Math.round(value * 32767), true);
  }
  return buffer;
}

/** 1 Sekunde Stille als WAV: hält den Audio-Kanal offen, damit iOS ihn nicht stilllegt (FR-036, R-20). */
function buildSilenceWav(): ArrayBuffer {
  const samples = SAMPLE_RATE;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buffer);
  const text = (offset: number, s: string): void => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  v.setUint32(4, 36 + samples * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, samples * 2, true);
  return buffer;
}

function stillElement(): HTMLAudioElement {
  if (!still) {
    still = new Audio();
    still.loop = true;
    still.preload = 'auto';
    still.setAttribute('playsinline', '');
    still.setAttribute('data-keepalive', '');
    still.src = URL.createObjectURL(new Blob([buildSilenceWav()], { type: 'audio/wav' }));
  }
  return still;
}

function startKeepAlive(): void {
  stillElement()
    .play()
    .catch(() => undefined);
}

/** Solange ein Spiel läuft oder angehalten ist, den Audio-Kanal mit Stille offen halten. */
export function setKeepAlive(on: boolean): void {
  keepAliveWanted = on;
  if (on) startKeepAlive();
  else if (still) still.pause();
}

function element(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    audio.src = URL.createObjectURL(new Blob([buildSignalWav()], { type: 'audio/wav' }));
  }
  return audio;
}

function rewind(el: HTMLAudioElement): void {
  try {
    el.currentTime = 0;
  } catch {
    /* noch nicht geladen */
  }
}

/** Muss aus einem Tap-Handler aufgerufen werden (Anpfiff, jede weitere Berührung im Spiel). */
export function unlockAudio(): void {
  setPlaybackSession();
  if (keepAliveWanted) startKeepAlive();
  const el = element();
  el.muted = true;
  rewind(el);
  el.play()
    .then(() => {
      el.pause();
      rewind(el);
      el.muted = false;
      unlocked = true;
    })
    .catch(() => {
      el.muted = false;
      unlocked = false;
    });
}

/** true, wenn ein Signal jetzt hörbar abgespielt werden kann. */
export function audioReady(): boolean {
  return unlocked;
}

/** Drei Pfiffe, etwa 1,4 Sekunden. */
export function playSignal(): void {
  const el = element();
  el.muted = false;
  rewind(el);
  el.play()
    .then(() => {
      unlocked = true;
    })
    .catch(() => {
      unlocked = false;
    });
  if (typeof navigator.vibrate === 'function') navigator.vibrate([300, 150, 300]);
}

/** "Ton testen" (FR-039): innerhalb einer Berührung sofort hörbar abspielen. */
export function testSignal(): void {
  setPlaybackSession();
  playSignal();
}
