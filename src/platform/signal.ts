import { DEFAULT_SIGNAL_SOUND, SIGNAL_SAMPLE_RATE, encodeWav, renderSignal } from '../domain/signal-sound';
import type { SignalSound } from '../domain/types';

/**
 * Signal am Abschnittsende (FR-007, FR-036, research.md R-4, R-17, R-18; Klang: Spec 008).
 *
 * Abgespielt über ein HTML-Audio-Element mit einer im Browser erzeugten WAV-Datei, nicht über
 * Web Audio. Gerätetest vom 02.11.2026: Web Audio läuft auf dem iPhone über den Klingelton-Kanal,
 * wird vom Lautlos-Schalter stummgeschaltet, ist leise und verstummt nach einigen Minuten.
 * Ein Audio-Element nutzt den Medien-Kanal (Lautstärketasten, kein Lautlos-Schalter).
 *
 * iOS erlaubt das spätere, automatische Abspielen nur, wenn dasselbe Element einmal innerhalb einer
 * Berührung gestartet wurde: unlockAudio() spielt es dort stumm an. Lehnt iOS später ab
 * (z. B. nach dem Hintergrund), meldet audioReady() false und die Oberfläche bittet um eine Berührung.
 * Ein Tonwechsel (Spec 008) tauscht nur die Quelle desselben Elements (plan.md R-K2).
 */
let audio: HTMLAudioElement | null = null;
let sound: SignalSound = DEFAULT_SIGNAL_SOUND;
const urls = new Map<SignalSound, string>();
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

function wavUrl(samples: Float32Array, rate: number): string {
  return URL.createObjectURL(new Blob([encodeWav(samples, rate)], { type: 'audio/wav' }));
}

/** WAV des Tons, je Ton einmal erzeugt und behalten (höchstens drei). */
function soundUrl(s: SignalSound): string {
  let url = urls.get(s);
  if (!url) {
    url = wavUrl(renderSignal(s), SIGNAL_SAMPLE_RATE);
    urls.set(s, url);
  }
  return url;
}

function stillElement(): HTMLAudioElement {
  if (!still) {
    still = new Audio();
    still.loop = true;
    still.preload = 'auto';
    still.setAttribute('playsinline', '');
    still.setAttribute('data-keepalive', '');
    // 1 Sekunde Stille: hält den Audio-Kanal offen, damit iOS ihn nicht stilllegt (FR-036, R-20).
    still.src = wavUrl(new Float32Array(22050), 22050);
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
    audio.dataset.sound = sound;
    audio.src = soundUrl(sound);
  }
  return audio;
}

/**
 * Spec 008 FR-K04: gewählter Signalton; gilt ab dem nächsten Signal. Erzeugt wird der Ton erst beim
 * ersten Abspielen, damit der Start (auch das Eltern-Dashboard) nicht wartet.
 */
export function setSignalSound(next: SignalSound): void {
  sound = next;
  const el = audio;
  if (el && el.dataset.sound !== next) {
    el.dataset.sound = next;
    el.src = soundUrl(next);
  }
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

/** Der gewählte Signalton (Spec 008), höchstens etwa 2,5 Sekunden. */
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

/** Spec 008 FR-K02: Ton in den Einstellungen wählen und sofort hörbar abspielen (innerhalb der Berührung). */
export function previewSignal(next: SignalSound): void {
  setSignalSound(next);
  testSignal();
}
