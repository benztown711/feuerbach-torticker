import type { SignalSound, SoundChoice, SoundEvent, SoundSettings, SynthSound } from './types';

/**
 * Spec 008: Signaltöne, im Browser erzeugt (keine Audiodatei, offline); Klang: specs/008-signalton/plan.md (R-K1).
 * Spec 025: Langer Pfiff und Doppelpfiff dazu, außerdem mitgelieferte CC0-Aufnahmen (plan.md R-T1); Ton je Ereignis.
 */

export const SIGNAL_SAMPLE_RATE = 44100;
export const DEFAULT_SIGNAL_SOUND: SignalSound = 'pfiff';

interface SoundInfo {
  name: string;
  description: string;
  /** Aufnahme unter der Basis-Adresse der App; fehlt bei erzeugten Tönen. */
  file?: string;
}

const INFO: Record<SignalSound, SoundInfo> = {
  pfiff: { name: 'Pfiff', description: 'Schiri-Pfeife mit Triller, kurz-kurz-lang. Am lautesten.' },
  'langer-pfiff': { name: 'Langer Pfiff', description: 'Ein langer Pfiff wie beim Anpfiff.' },
  doppelpfiff: { name: 'Doppelpfiff', description: 'Kurz, dann lang, wie zur Pause.' },
  glocke: { name: 'Glocke', description: 'Rundenglocke, drei Schläge. Fast so laut wie der Pfiff.' },
  gong: { name: 'Gong', description: 'Aufsteigender Dreiklang. Leiser, gut für die Halle.' },
  torhupe: { name: 'Torhupe', description: 'Fanfare wie aus der Fankurve.', file: 'sounds/torhupe.mp3' },
  jubel: { name: 'Jubel', description: 'Zuschauer jubeln und klatschen.', file: 'sounds/jubel.mp3' },
  'hupe-jubel': {
    name: 'Torhupe mit Jubel',
    description: 'Fanfare, direkt danach Jubel.',
    file: 'sounds/hupe-jubel.mp3',
  },
  kinderjubel: { name: 'Kinderjubel', description: 'Kinder jubeln kurz.', file: 'sounds/kinderjubel.mp3' },
  raunen: { name: 'Raunen', description: 'Enttäuschtes „Ohh“ der Zuschauer.', file: 'sounds/raunen.mp3' },
};

const SYNTH: readonly SynthSound[] = ['pfiff', 'langer-pfiff', 'doppelpfiff', 'glocke', 'gong'];

/** FR-K01, Spec 025 FR-T01: Reihenfolge, Name, Beschreibung und ggf. Datei für die Auswahl. */
export const SIGNAL_SOUNDS: readonly ({ id: SignalSound } & SoundInfo)[] = (Object.keys(INFO) as SignalSound[]).map(
  (id) => ({ id, ...INFO[id] }),
);

export function isSignalSound(v: unknown): v is SignalSound {
  return SIGNAL_SOUNDS.some((s) => s.id === v);
}

export function isSynthSound(v: SignalSound): v is SynthSound {
  return SYNTH.includes(v as SynthSound);
}

export function signalSoundName(sound: SignalSound): string {
  return INFO[sound].name;
}

/** Spec 025 FR-T03: Name eines gewählten Tons, auch "Aus". */
export const soundChoiceName = (c: SoundChoice): string => (c === 'aus' ? 'Aus' : INFO[c].name);

/** Spec 025 FR-T03: Ereignisse in der Reihenfolge der Einstellungen, mit Hinweis im Auswahlblatt. */
export const SOUND_EVENTS: readonly { id: SoundEvent; name: string; hint: string }[] = [
  { id: 'timeUp', name: 'Spielzeitende', hint: 'Bei 00:00 und zu jeder vollen Nachspielminute.' },
  { id: 'kickoff', name: 'Anpfiff', hint: 'Beim Anpfiff jeder Halbzeit bzw. jedes Abschnitts.' },
  { id: 'halftime', name: 'Pausenpfiff', hint: 'Wenn du den Pausenpfiff bestätigst.' },
  { id: 'fulltime', name: 'Schlusspfiff', hint: 'Wenn du den Schlusspfiff bestätigst.' },
  { id: 'goalOwn', name: 'Tor für uns', hint: 'Sofort beim Tippen auf den Tor-Knopf deiner Mannschaft.' },
  { id: 'goalOpp', name: 'Gegentor', hint: 'Sofort beim Tippen auf den Tor-Knopf des Gegners.' },
];

/** Spec 025 FR-T04: Vorbelegung (Atti, Hörprobe 26.11.2026). */
export const DEFAULT_SOUNDS: SoundSettings = {
  timeUp: 'pfiff',
  kickoff: 'langer-pfiff',
  halftime: 'doppelpfiff',
  fulltime: 'pfiff',
  goalOwn: 'torhupe',
  goalOpp: 'raunen',
};

/**
 * Spec 025 FR-T04: gespeicherte Töne prüfen; fehlende oder unbekannte Werte bekommen die Vorbelegung, das
 * Spielzeitende nie "Aus". `legacy` ist der Signalton aus Spec 008 und gilt als Spielzeitende, wenn keins gespeichert ist.
 */
export function normalizeSounds(stored: unknown, legacy?: unknown): SoundSettings {
  const raw = (typeof stored === 'object' && stored !== null ? stored : {}) as Record<string, unknown>;
  const pick = (e: Exclude<SoundEvent, 'timeUp'>): SoundChoice =>
    raw[e] === 'aus' || isSignalSound(raw[e]) ? (raw[e] as SoundChoice) : DEFAULT_SOUNDS[e];
  const timeUp = [raw.timeUp, legacy].find(isSignalSound) ?? DEFAULT_SOUNDS.timeUp;
  return {
    timeUp,
    kickoff: pick('kickoff'),
    halftime: pick('halftime'),
    fulltime: pick('fulltime'),
    goalOwn: pick('goalOwn'),
    goalOpp: pick('goalOpp'),
  };
}

const SR = SIGNAL_SAMPLE_RATE;
/** Stille vorweg: iOS verschluckt sonst den Anfang (Spec 001 R-19). */
const LEAD_S = 0.15;

/** Fester Zufallsgenerator (gleiche Eingabe, gleicher Ton), Werte in [-1, 1). */
function noise(seed: number): () => number {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s / 4294967296) * 2 - 1;
  };
}

/** Optional weich sättigen (tanh), dann auf 0,97 Spitzenpegel bringen. */
function normalize(buf: Float32Array, drive: number): Float32Array {
  let max = 0;
  for (let i = 0; i < buf.length; i++) {
    if (drive > 0) buf[i] = Math.tanh(drive * buf[i]!);
    max = Math.max(max, Math.abs(buf[i]!));
  }
  const gain = 0.97 / max;
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i]! * gain;
  return buf;
}

function fadeOut(buf: Float32Array, seconds: number): void {
  const n = Math.round(seconds * SR);
  for (let i = 0; i < n; i++) buf[buf.length - 1 - i] = buf[buf.length - 1 - i]! * (i / n);
}

/**
 * Ausklingender Sinus ab `start`, addiert in `out`: Schwingung per Rekursion, Abklingen multiplikativ
 * (schnell genug für den Tap-Handler). Endet, wenn er unhörbar ist.
 */
function ring(out: Float32Array, start: number, hz: number, amp: number, tau: number, attackS: number): void {
  const w = (2 * Math.PI * hz) / SR;
  const c = 2 * Math.cos(w);
  const decay = Math.exp(-1 / (tau * SR));
  const attack = attackS * SR;
  let s1 = 0;
  let s2 = -Math.sin(w);
  let e = amp;
  for (let n = 0; start + n < out.length && e > 1e-4 * amp; n++) {
    const s = c * s1 - s2;
    s2 = s1;
    s1 = s;
    out[start + n] = out[start + n]! + e * Math.min(1, n / attack) * s2;
    e *= decay;
  }
}

/** Pfiffmuster (Beginn, Dauer in s): kurz-kurz-lang (Schluss), Spec 025: lang (Anpfiff), kurz-lang (Pause). */
const BLOWS: Record<'pfiff' | 'langer-pfiff' | 'doppelpfiff', [number, number][]> = {
  pfiff: [
    [0, 0.16],
    [0.3, 0.16],
    [0.6, 0.72],
  ],
  'langer-pfiff': [[0, 1]],
  doppelpfiff: [
    [0, 0.16],
    [0.3, 0.6],
  ],
};

/** Schiri-Pfeife mit Kugel-Triller im gegebenen Muster. */
function pfiff(blows: [number, number][]): Float32Array {
  const [start, dur] = blows[blows.length - 1]!;
  const out = new Float32Array(Math.round((LEAD_S + start + dur + 0.12) * SR));
  const rand = noise(7);
  const f0 = 3150;
  // Resonator um f0 für das Atemrauschen
  const r = 0.985;
  const a1 = 2 * r * Math.cos((2 * Math.PI * f0) / SR);
  const a2 = -r * r;
  let y1 = 0;
  let y2 = 0;
  let phase = 0;
  let trill = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR - LEAD_S;
    let env = 0;
    let glide = 0;
    for (const [start, dur] of blows) {
      const u = t - start;
      if (u >= 0 && u < dur) {
        const att = Math.min(1, u / 0.018);
        env = att * att * (3 - 2 * att) * Math.min(1, (dur - u) / 0.035);
        // Anblasen von unten, am Ende fällt der Ton leicht ab
        glide = -0.07 * Math.exp(-u / 0.025) - 0.035 * (1 - Math.min(1, (dur - u) / 0.04));
      }
    }
    trill += (2 * Math.PI * (36 + 3 * Math.sin(2 * Math.PI * 0.9 * t))) / SR;
    const wobble = Math.sin(trill) + 0.35 * Math.sin(2 * trill + 0.6);
    phase += (2 * Math.PI * f0 * (1 + glide + 0.028 * wobble)) / SR;
    const am = 1 - 0.32 * (0.5 + 0.5 * Math.sin(trill + 1.1));
    const y = rand() * (1 - r) * 6 + a1 * y1 + a2 * y2;
    y2 = y1;
    y1 = y;
    // Erst sättigen, dann die 2. Harmonische zumischen: so faltet nichts unter den Grundton zurück.
    out[i] = Math.tanh(2.2 * env * (Math.sin(phase) * am + 0.22 * y)) + 0.1 * env * am * Math.sin(2 * phase + 0.4);
  }
  return normalize(out, 0);
}

/** Rundenglocke: drei Schläge, Teiltöne einer kleinen Glocke, je doppelt und leicht verstimmt. */
function glocke(): Float32Array {
  const out = new Float32Array(Math.round(2.2 * SR));
  const f0 = 1180;
  const partials: [number, number, number][] = [
    [1, 1, 0.85],
    [2.02, 0.55, 0.6],
    [2.76, 0.6, 0.48],
    [3.92, 0.42, 0.33],
    [5.4, 0.3, 0.22],
    [6.83, 0.16, 0.15],
    [8.9, 0.08, 0.1],
  ];
  const rand = noise(11);
  for (const strike of [0, 0.3, 0.6]) {
    const start = Math.round((LEAD_S + strike) * SR);
    for (const [ratio, amp, tau] of partials) {
      ring(out, start, f0 * ratio, amp, tau, 0.0015);
      ring(out, start, f0 * ratio * 1.0018, amp * 0.45, tau, 0.0015);
    }
    // Anschlag: kurzer heller Klick
    const clickN = Math.round(0.006 * SR);
    let hp = 0;
    let prev = 0;
    for (let i = 0; i < clickN; i++) {
      const n = rand();
      hp = 0.6 * (hp + n - prev);
      prev = n;
      out[start + i] = out[start + i]! + 0.5 * hp * (1 - i / clickN);
    }
  }
  fadeOut(out, 0.08);
  return normalize(out, 1.2);
}

/** Gong: aufsteigender Dreiklang G5, C6, E6. */
function gong(): Float32Array {
  const out = new Float32Array(Math.round(2.5 * SR));
  const notes: [number, number][] = [
    [0, 784],
    [0.38, 1046.5],
    [0.76, 1318.5],
  ];
  const partials: [number, number, number][] = [
    [1, 1, 1.25],
    [2, 0.3, 0.6],
    [3, 0.1, 0.35],
    [2.76, 0.07, 0.4],
    [4, 0.05, 0.25],
  ];
  for (const [at, f0] of notes) {
    const start = Math.round((LEAD_S + at) * SR);
    for (const [ratio, amp, tau] of partials) ring(out, start, f0 * ratio, amp, tau, 0.004);
  }
  fadeOut(out, 0.1);
  return normalize(out, 0.9);
}

/** FR-K01, Spec 025 FR-T01: Abtastwerte eines erzeugten Tons (Mono, SIGNAL_SAMPLE_RATE, Spitzenpegel 0,97). */
export function renderSignal(sound: SynthSound): Float32Array {
  return sound === 'glocke' ? glocke() : sound === 'gong' ? gong() : pfiff(BLOWS[sound]);
}

/** 16-Bit-Mono-WAV aus Abtastwerten in [-1, 1] (Werte außerhalb werden begrenzt). */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const n = samples.length;
  const buffer = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buffer);
  const text = (offset: number, s: string): void => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i]!)) * 32767), true);
  return buffer;
}
