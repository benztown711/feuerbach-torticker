import { describe, expect, it } from 'vitest';
import { defaultSettings, withSettingsDefaults } from '../../src/domain/settings';
import {
  DEFAULT_SIGNAL_SOUND,
  SIGNAL_SAMPLE_RATE,
  SIGNAL_SOUNDS,
  encodeWav,
  isSignalSound,
  renderSignal,
  signalSoundName,
} from '../../src/domain/signal-sound';
import type { SignalSound } from '../../src/domain/types';

const IDS: SignalSound[] = ['pfiff', 'glocke', 'gong'];

function readWav(buf: ArrayBuffer): { rate: number; samples: Int16Array } {
  const v = new DataView(buf);
  const tag = (o: number) =>
    String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  expect(tag(0)).toBe('RIFF');
  expect(tag(8)).toBe('WAVE');
  expect(tag(12)).toBe('fmt ');
  expect(v.getUint16(20, true)).toBe(1); // PCM
  expect(v.getUint16(22, true)).toBe(1); // mono
  expect(v.getUint16(34, true)).toBe(16);
  expect(tag(36)).toBe('data');
  const bytes = v.getUint32(40, true);
  expect(v.getUint32(4, true)).toBe(36 + bytes);
  expect(buf.byteLength).toBe(44 + bytes);
  const samples = new Int16Array(bytes / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = v.getInt16(44 + i * 2, true);
  return { rate: v.getUint32(24, true), samples };
}

const rms = (x: Float32Array, from: number, to: number): number => {
  let sum = 0;
  const a = Math.round(from * SIGNAL_SAMPLE_RATE);
  const b = Math.round(to * SIGNAL_SAMPLE_RATE);
  for (let i = a; i < b; i++) sum += x[i]! ** 2;
  return Math.sqrt(sum / (b - a));
};

/** Leistung einer Frequenz in einem Zeitfenster (Goertzel). */
function power(x: Float32Array, hz: number, from: number, to: number): number {
  const a = Math.round(from * SIGNAL_SAMPLE_RATE);
  const b = Math.round(to * SIGNAL_SAMPLE_RATE);
  const c = 2 * Math.cos((2 * Math.PI * hz) / SIGNAL_SAMPLE_RATE);
  let s1 = 0;
  let s2 = 0;
  for (let i = a; i < b; i++) {
    const s = x[i]! + c * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return s1 * s1 + s2 * s2 - c * s1 * s2;
}

describe('Spec 008 Signaltöne (FR-K01)', () => {
  it('FR-K01 genau drei Töne in fester Reihenfolge: Pfiff, Glocke, Gong', () => {
    expect(SIGNAL_SOUNDS.map((s) => s.id)).toEqual(IDS);
    expect(SIGNAL_SOUNDS.map((s) => s.name)).toEqual(['Pfiff', 'Glocke', 'Gong']);
    for (const s of SIGNAL_SOUNDS) expect(s.description.length).toBeGreaterThan(10);
    expect(IDS.map(signalSoundName)).toEqual(['Pfiff', 'Glocke', 'Gong']);
  });

  for (const id of IDS) {
    it(`FR-K01 ${id}: gültige WAV mit 44,1 kHz, 1,2 bis 2,6 s, voll ausgesteuert, Stille vorweg`, () => {
      const samples = renderSignal(id);
      const { rate, samples: pcm } = readWav(encodeWav(samples, SIGNAL_SAMPLE_RATE));
      expect(rate).toBe(44100);
      expect(pcm.length).toBe(samples.length);
      const seconds = pcm.length / rate;
      expect(seconds).toBeGreaterThan(1.2);
      expect(seconds).toBeLessThan(2.6);
      let peak = 0;
      for (const s of pcm) peak = Math.max(peak, Math.abs(s));
      expect(peak).toBeGreaterThan(30000);
      // iOS verschluckt sonst den Anfang (Spec 001 R-19): mindestens 0,1 s Stille vorweg.
      for (let i = 0; i < 0.1 * rate; i++) expect(pcm[i]).toBe(0);
      // Am Ende ausgeklungen, kein Knacksen.
      expect(Math.abs(pcm[pcm.length - 1]!)).toBeLessThan(100);
    });
  }

  it('FR-K01 die drei Töne unterscheiden sich, gleiche Eingabe ergibt dieselbe Datei', () => {
    const [a, b, c] = IDS.map(renderSignal) as [Float32Array, Float32Array, Float32Array];
    expect(new Set([a.length, b.length, c.length]).size).toBe(3);
    expect(Array.from(renderSignal('glocke'))).toEqual(Array.from(b));
    expect(Array.from(renderSignal('pfiff'))).toEqual(Array.from(a));
  });

  it('FR-K01 Pfiff: Grundton um 3,1 kHz, kurz-kurz-lang', () => {
    const x = renderSignal('pfiff');
    const tone = power(x, 3150, 0.9, 1.3);
    expect(tone).toBeGreaterThan(20 * power(x, 2000, 0.9, 1.3));
    expect(tone).toBeGreaterThan(20 * power(x, 4500, 0.9, 1.3));
    // zwei kurze Pfiffe mit Pausen, dann ein langer
    expect(rms(x, 0.2, 0.28)).toBeGreaterThan(0.3);
    expect(rms(x, 0.36, 0.42)).toBeLessThan(0.01);
    expect(rms(x, 0.5, 0.58)).toBeGreaterThan(0.3);
    expect(rms(x, 0.66, 0.72)).toBeLessThan(0.01);
    expect(rms(x, 0.85, 1.4)).toBeGreaterThan(0.3);
  });

  it('FR-K01 Glocke: drei Schläge im Abstand von 0,3 s mit Ausklang', () => {
    const x = renderSignal('glocke');
    for (const strike of [0.45, 0.75]) {
      expect(rms(x, strike, strike + 0.03)).toBeGreaterThan(1.3 * rms(x, strike - 0.03, strike));
    }
    expect(rms(x, 1.6, 1.8)).toBeLessThan(rms(x, 0.9, 1.1));
  });

  it('FR-K01 Gong: aufsteigender Dreiklang G5, C6, E6', () => {
    const x = renderSignal('gong');
    const notes = [784, 1046.5, 1318.5];
    const at = [0.2, 0.58, 0.96];
    at.forEach((t, k) => {
      const p = notes.map((hz) => power(x, hz, t, t + 0.1));
      expect(p.indexOf(Math.max(...p))).toBe(k);
    });
  });

  it('encodeWav begrenzt auf den 16-Bit-Bereich und übernimmt die Abtastrate', () => {
    const { rate, samples } = readWav(encodeWav(Float32Array.from([0, 0.5, 2, -2]), 22050));
    expect(rate).toBe(22050);
    expect(Array.from(samples)).toEqual([0, 16384, 32767, -32767]);
  });
});

describe('Spec 008 Vorgabe Pfiff (FR-K03)', () => {
  it('FR-K03 isSignalSound erkennt nur die drei Töne', () => {
    for (const id of IDS) expect(isSignalSound(id)).toBe(true);
    for (const v of ['alarm', '', undefined, null, 3]) expect(isSignalSound(v)).toBe(false);
  });

  it('FR-K03 Vorgabe ist der Pfiff', () => {
    expect(DEFAULT_SIGNAL_SOUND).toBe('pfiff');
    expect(defaultSettings().signalSound).toBe('pfiff');
    expect(withSettingsDefaults(undefined).signalSound).toBe('pfiff');
  });

  it('FR-K03 Einstellungen vor dem Update (ohne Signalton) bekommen den Pfiff', () => {
    expect(withSettingsDefaults({ theme: 'dark' }).signalSound).toBe('pfiff');
  });

  it('FR-K03 unbekannter Signalton wird zum Pfiff, gültiger bleibt', () => {
    expect(withSettingsDefaults({ signalSound: 'alarm' as never }).signalSound).toBe('pfiff');
    expect(withSettingsDefaults({ signalSound: 'gong' }).signalSound).toBe('gong');
  });
});
