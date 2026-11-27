import { DEFAULT_SIGNAL_SOUND, SIGNAL_SAMPLE_RATE, encodeWav, isSynthSound, soundFile } from '../domain/signal-sound';
import type { SignalSound, SoundChoice } from '../domain/types';

/**
 * Spec 025 R-T5: Die Klangerzeugung ist ein eigener Teil (Bundle-Budget), der sofort beim Start lädt. Bis er da ist
 * (wenige Millisekunden), kommt die Quelle eines erzeugten Tons nach; Aufnahmen brauchen ihn nicht.
 */
type Synth = typeof import('../domain/signal-synth');
let synth: Synth | null = null;
const synthLoad: Promise<Synth> = import('../domain/signal-synth').then((m) => (synth = m));

/** Für Tests: erfüllt sich, sobald die Klangerzeugung geladen ist. */
export const soundsReady: Promise<void> = synthLoad.then(() => undefined);

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
 * Ein Tonwechsel (Spec 008) tauscht nur die Quelle desselben Elements (plan.md R-K2); auch die Ereignis-Töne aus
 * Spec 025 spielen über dieses Element (specs/025-spieltoene/plan.md R-T2).
 */
let audio: HTMLAudioElement | null = null;
/** Ton für Spielzeitende (Spec 025 `sounds.timeUp`). */
let sound: SignalSound = DEFAULT_SIGNAL_SOUND;
/** Zählt Abspielaufträge; eine Freischaltung hält das Element nur an, wenn seitdem nichts gestartet wurde (R-T2). */
let plays = 0;
/**
 * R-T2: Ein Ton läuft hörbar (bis `ended`). Eine Freischaltung in derselben Berührung, z. B. weil der Klick nach der
 * Hörprobe zur Seite hochblubbert, darf ihn weder stummschalten noch anhalten.
 */
let audible: Promise<void> | null = null;
const urls = new Map<SignalSound, string>();
let unlocked = false;
let still: HTMLAudioElement | null = null;
let keepAliveWanted = false;

// Gerätetest 02.11.: Nach Hintergrund hielt die App den Ton für freigeschaltet, iOS hatte ihn aber gesperrt.
// Darum gilt der Ton nach jeder Rückkehr als gesperrt, bis eine Berührung ihn neu freischaltet (FR-036, R-20).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      unlocked = false;
      audible = null;
    }
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

/**
 * Erzeugte Töne als WAV, je Ton einmal erzeugt und behalten (höchstens fünf); Aufnahmen von der eigenen Adresse
 * (FR-T02). `null`, solange die Klangerzeugung noch lädt (R-T5).
 */
function soundUrl(s: SignalSound): string | null {
  let url = urls.get(s);
  if (!url) {
    if (isSynthSound(s)) {
      if (!synth) return null;
      url = wavUrl(synth.renderSignal(s), SIGNAL_SAMPLE_RATE);
    } else {
      url = `${import.meta.env.BASE_URL}${soundFile(s)!}`;
    }
    urls.set(s, url);
  }
  return url;
}

/**
 * Quelle nur tauschen, wenn sich der Ton ändert (`data-sound` nennt ihn, auch für Tests). Lädt die Klangerzeugung
 * noch, kommt die Quelle nach, sofern bis dahin kein anderer Ton gewählt ist.
 */
function load(el: HTMLAudioElement, s: SignalSound): void {
  if (el.dataset.sound === s) return;
  el.dataset.sound = s;
  const url = soundUrl(s);
  if (url) el.src = url;
  else {
    // Nicht den vorigen Ton weiterspielen, bis die Quelle da ist.
    el.removeAttribute('src');
    void synthLoad.then(() => {
      if (el.dataset.sound === s) el.src = soundUrl(s)!;
    });
  }
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
    audio.addEventListener('ended', () => (audible = null));
    // Von außen angehalten (z. B. Unterbrechung durch das System): gilt nicht mehr als laufend.
    audio.addEventListener('pause', () => {
      if (audio?.paused) audible = null;
    });
    load(audio, sound);
  }
  return audio;
}

/**
 * Spec 008 FR-K04, Spec 025: Ton für Spielzeitende; gilt ab dem nächsten Signal. Erzeugt wird der Ton erst beim
 * ersten Abspielen, damit der Start (auch das Eltern-Dashboard) nicht wartet.
 */
export function setSignalSound(next: SignalSound): void {
  sound = next;
  if (audio) load(audio, next);
}

function rewind(el: HTMLAudioElement): void {
  try {
    el.currentTime = 0;
  } catch {
    /* noch nicht geladen */
  }
}

/**
 * Muss aus einem Tap-Handler aufgerufen werden (Anpfiff, jede weitere Berührung im Spiel). Erfüllt sich, sobald
 * feststeht, ob der Ton frei ist (`audioReady()`), damit ein Hinweis wie "Ton aus · tippen" sofort verschwinden kann.
 */
export function unlockAudio(): Promise<void> {
  setPlaybackSession();
  if (keepAliveWanted) startKeepAlive();
  const el = element();
  if (audible) return audible;
  const mine = plays;
  el.muted = true;
  rewind(el);
  return el
    .play()
    .then(() => {
      unlocked = true;
      // R-T2: Ist inzwischen ein Ton gestartet (Tor-Knopf nach pointerdown), läuft er weiter.
      if (plays !== mine) return;
      el.pause();
      rewind(el);
      el.muted = false;
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

/** Der Ton für Spielzeitende (Spec 008, Spec 025), höchstens etwa 2,5 Sekunden, mit Vibrationsmuster. */
export function playSignal(): void {
  void start(sound);
  if (typeof navigator.vibrate === 'function') navigator.vibrate([300, 150, 300]);
}

/**
 * Spec 025 FR-T05, FR-T07 (ersetzt Spec 020 FR-E25): Ton eines Ereignisses, einmal und ohne das Vibrationsmuster von
 * `playSignal()` (das ist für das Abschnittsende gedacht, Spec 020 R-E4); "Aus" spielt nichts. Aus einer Berührung
 * heraus schaltet das Abspielen den Ton auch frei.
 */
export function playSound(choice: SoundChoice): Promise<void> {
  if (choice === 'aus') return Promise.resolve();
  setPlaybackSession();
  return start(choice);
}

/** Ton hörbar von vorn starten; gilt bis `ended` als laufend (R-T2). */
function start(s: SignalSound): Promise<void> {
  const el = element();
  plays++;
  load(el, s);
  el.muted = false;
  rewind(el);
  const p = el.play().then(
    () => {
      unlocked = true;
    },
    () => {
      unlocked = false;
      if (audible === p) audible = null;
    },
  );
  audible = p;
  return p;
}

/** Spec 020 FR-E24: einmal kurz (etwa 0,2 Sekunden) vibrieren, wo der Browser es anbietet (nicht Safari auf dem iPhone). */
export function vibrateShort(): void {
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(200);
  } catch {
    /* Vibration verweigert: ignorieren */
  }
}

/** "Ton testen" (FR-039): innerhalb einer Berührung sofort hörbar abspielen. */
export function testSignal(): void {
  setPlaybackSession();
  playSignal();
}

/** Spec 008 FR-K02, Spec 025 FR-T03: Hörprobe in der Auswahl, sofort hörbar (innerhalb der Berührung). */
export function previewSignal(next: SignalSound): void {
  void playSound(next);
}
