import { SIGNAL_SAMPLE_RATE } from './signal-sound';
import type { SynthSound } from './types';

/**
 * Spec 008 R-K1, Spec 025 FR-T01: Klangerzeugung für Pfiff, Langer Pfiff, Doppelpfiff, Glocke und Gong. Eigene Datei,
 * die die App beim Start sofort nachlädt (specs/025-spieltoene/plan.md R-T5): so zählt sie nicht zum Hauptbundle und ist
 * trotzdem lange vor dem ersten Tippen da.
 */

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
