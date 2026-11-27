import type { SignalSound, SoundChoice, SoundEvent, SoundSettings, SynthSound } from './types';

/**
 * Spec 008: Signaltöne, im Browser erzeugt (keine Audiodatei, offline); Klang: specs/008-signalton/plan.md (R-K1).
 * Spec 025: Langer Pfiff und Doppelpfiff dazu, außerdem mitgelieferte CC0-Aufnahmen (plan.md R-T1); Ton je Ereignis.
 */

export const SIGNAL_SAMPLE_RATE = 44100;
export const DEFAULT_SIGNAL_SOUND: SignalSound = 'pfiff';

/** Name (für "Ton testen") und ggf. Aufnahme unter der Basis-Adresse der App; Beschreibungen in `sound-catalog.ts`. */
const INFO: Record<SignalSound, { name: string; file?: string }> = {
  pfiff: { name: 'Pfiff' },
  'langer-pfiff': { name: 'Langer Pfiff' },
  doppelpfiff: { name: 'Doppelpfiff' },
  glocke: { name: 'Glocke' },
  gong: { name: 'Gong' },
  torhupe: { name: 'Torhupe', file: 'sounds/torhupe.mp3' },
  jubel: { name: 'Jubel', file: 'sounds/jubel.mp3' },
  'hupe-jubel': { name: 'Torhupe mit Jubel', file: 'sounds/hupe-jubel.mp3' },
  kinderjubel: { name: 'Kinderjubel', file: 'sounds/kinderjubel.mp3' },
  raunen: { name: 'Raunen', file: 'sounds/raunen.mp3' },
};

const SYNTH: readonly SynthSound[] = ['pfiff', 'langer-pfiff', 'doppelpfiff', 'glocke', 'gong'];

/** FR-K01, Spec 025 FR-T01: alle Töne in der Reihenfolge der Auswahl. */
export const SOUND_IDS = Object.keys(INFO) as SignalSound[];

export function isSignalSound(v: unknown): v is SignalSound {
  return SOUND_IDS.includes(v as SignalSound);
}

export function isSynthSound(v: SignalSound): v is SynthSound {
  return SYNTH.includes(v as SynthSound);
}

export function signalSoundName(sound: SignalSound): string {
  return INFO[sound].name;
}

/** Spec 025 FR-T02: Datei einer Aufnahme relativ zur Basis-Adresse, `undefined` bei erzeugten Tönen. */
export const soundFile = (sound: SignalSound): string | undefined => INFO[sound].file;

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
