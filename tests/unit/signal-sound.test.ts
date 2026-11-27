import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultSettings, withSettingsDefaults } from '../../src/domain/settings';
import {
  DEFAULT_SIGNAL_SOUND,
  DEFAULT_SOUNDS,
  SIGNAL_SAMPLE_RATE,
  encodeWav,
  isSignalSound,
  isSynthSound,
  normalizeSounds,
  signalSoundName,
} from '../../src/domain/signal-sound';
import { renderSignal } from '../../src/domain/signal-synth';
import { SIGNAL_SOUNDS, SOUND_EVENTS, soundChoiceName } from '../../src/domain/sound-catalog';
import type { SynthSound } from '../../src/domain/types';

const IDS: SynthSound[] = ['pfiff', 'langer-pfiff', 'doppelpfiff', 'glocke', 'gong'];

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

describe('Spec 008 und 025 Signaltöne (FR-K01, FR-T01)', () => {
  it('025 FR-T01 zehn Töne in fester Reihenfolge, Aufnahmen mit eigener Datei', () => {
    expect(SIGNAL_SOUNDS.map((s) => s.name)).toEqual([
      'Pfiff',
      'Langer Pfiff',
      'Doppelpfiff',
      'Glocke',
      'Gong',
      'Torhupe',
      'Jubel',
      'Torhupe mit Jubel',
      'Kinderjubel',
      'Raunen',
    ]);
    for (const s of SIGNAL_SOUNDS) expect(s.description.length).toBeGreaterThan(10);
    expect(SIGNAL_SOUNDS.filter((s) => isSynthSound(s.id)).map((s) => s.id)).toEqual(IDS);
    expect(SIGNAL_SOUNDS.filter((s) => s.file).map((s) => [s.id, s.file])).toEqual([
      ['torhupe', 'sounds/torhupe.mp3'],
      ['jubel', 'sounds/jubel.mp3'],
      ['hupe-jubel', 'sounds/hupe-jubel.mp3'],
      ['kinderjubel', 'sounds/kinderjubel.mp3'],
      ['raunen', 'sounds/raunen.mp3'],
    ]);
    expect(IDS.map(signalSoundName)).toEqual(['Pfiff', 'Langer Pfiff', 'Doppelpfiff', 'Glocke', 'Gong']);
  });

  for (const id of IDS) {
    it(`FR-K01 FR-T01 ${id}: gültige WAV mit 44,1 kHz, 1,1 bis 2,6 s, voll ausgesteuert, Stille vorweg`, () => {
      const samples = renderSignal(id);
      const { rate, samples: pcm } = readWav(encodeWav(samples, SIGNAL_SAMPLE_RATE));
      expect(rate).toBe(44100);
      expect(pcm.length).toBe(samples.length);
      const seconds = pcm.length / rate;
      expect(seconds).toBeGreaterThan(1.1);
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

  it('FR-K01 FR-T01 die erzeugten Töne unterscheiden sich, gleiche Eingabe ergibt dieselbe Datei', () => {
    const all = IDS.map(renderSignal);
    expect(new Set(all.map((x) => x.length)).size).toBe(IDS.length);
    expect(Array.from(renderSignal('glocke'))).toEqual(Array.from(all[3]!));
    expect(Array.from(renderSignal('pfiff'))).toEqual(Array.from(all[0]!));
  });

  it('025 FR-T01 Langer Pfiff: ein durchgehender Pfiff von etwa 1 s', () => {
    const x = renderSignal('langer-pfiff');
    expect(power(x, 3150, 0.4, 0.8)).toBeGreaterThan(20 * power(x, 2000, 0.4, 0.8));
    for (const t of [0.2, 0.5, 0.8, 1.05]) expect(rms(x, t, t + 0.05)).toBeGreaterThan(0.3);
  });

  it('025 FR-T01 Doppelpfiff: kurz, Pause, lang', () => {
    const x = renderSignal('doppelpfiff');
    expect(rms(x, 0.2, 0.28)).toBeGreaterThan(0.3);
    expect(rms(x, 0.36, 0.42)).toBeLessThan(0.01);
    expect(rms(x, 0.5, 0.95)).toBeGreaterThan(0.3);
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

describe('Spec 008 und 025 Vorbelegung (FR-K03, FR-T04)', () => {
  it('FR-K03 isSignalSound erkennt nur die zehn Töne, isSynthSound nur die erzeugten', () => {
    for (const s of SIGNAL_SOUNDS) expect(isSignalSound(s.id)).toBe(true);
    for (const v of ['alarm', 'aus', '', undefined, null, 3]) expect(isSignalSound(v)).toBe(false);
    expect(isSynthSound('torhupe')).toBe(false);
  });

  it('025 FR-T03 sechs Ereignisse in fester Reihenfolge', () => {
    expect(SOUND_EVENTS.map((e) => [e.id, e.name])).toEqual([
      ['timeUp', 'Spielzeitende'],
      ['kickoff', 'Anpfiff'],
      ['halftime', 'Pausenpfiff'],
      ['fulltime', 'Schlusspfiff'],
      ['goalOwn', 'Tor für uns'],
      ['goalOpp', 'Gegentor'],
    ]);
    for (const e of SOUND_EVENTS) expect(e.hint.length).toBeGreaterThan(10);
  });

  it('025 FR-T04 Vorbelegung und Namen', () => {
    expect(DEFAULT_SIGNAL_SOUND).toBe('pfiff');
    expect(DEFAULT_SOUNDS).toEqual({
      timeUp: 'pfiff',
      kickoff: 'langer-pfiff',
      halftime: 'doppelpfiff',
      fulltime: 'pfiff',
      goalOwn: 'torhupe',
      goalOpp: 'raunen',
    });
    expect(soundChoiceName('aus')).toBe('Aus');
    expect(soundChoiceName('hupe-jubel')).toBe('Torhupe mit Jubel');
    expect(defaultSettings().sounds).toEqual(DEFAULT_SOUNDS);
  });

  it('025 FR-T04 normalizeSounds: fehlend oder unbekannt wird Vorbelegung, Spielzeitende nie "Aus"', () => {
    expect(normalizeSounds(undefined)).toEqual(DEFAULT_SOUNDS);
    expect(normalizeSounds('kaputt')).toEqual(DEFAULT_SOUNDS);
    expect(normalizeSounds({ timeUp: 'aus', kickoff: 'aus', goalOwn: 'jubel', goalOpp: 'alarm' })).toEqual({
      ...DEFAULT_SOUNDS,
      kickoff: 'aus',
      goalOwn: 'jubel',
    });
    // Spec 008: bisheriger Signalton wird Spielzeitende, ein gespeichertes Spielzeitende geht vor
    expect(normalizeSounds(undefined, 'gong').timeUp).toBe('gong');
    expect(normalizeSounds({ timeUp: 'glocke' }, 'gong').timeUp).toBe('glocke');
    expect(normalizeSounds(undefined, 'alarm').timeUp).toBe('pfiff');
  });

  it('025 US1-S1 US1-S2 Einstellungen vor dem Update: Spielzeitende übernimmt den Signalton, Rest Vorbelegung', () => {
    expect(withSettingsDefaults(undefined).sounds).toEqual(DEFAULT_SOUNDS);
    expect(withSettingsDefaults({ theme: 'dark' }).sounds).toEqual(DEFAULT_SOUNDS);
    const old = withSettingsDefaults({ signalSound: 'gong' } as never);
    expect(old.sounds).toEqual({ ...DEFAULT_SOUNDS, timeUp: 'gong' });
    expect('signalSound' in old).toBe(false);
    expect(withSettingsDefaults({ signalSound: 'alarm' } as never).sounds.timeUp).toBe('pfiff');
    expect(withSettingsDefaults({ sounds: { ...DEFAULT_SOUNDS, goalOpp: 'aus' } }).sounds.goalOpp).toBe('aus');
  });
});

describe('Spec 025 Aufnahmen (FR-T02, FR-T09, SC-T03)', () => {
  const files = SIGNAL_SOUNDS.filter((s) => s.file).map((s) => `public/${s.file!}`);

  it('FR-T02 jede Aufnahme liegt in der App, ist ein MP3 und zusammen höchstens 200 KB', () => {
    let total = 0;
    for (const f of files) {
      const head = readFileSync(f).subarray(0, 3);
      // ID3-Kopf oder MPEG-Frame
      expect(head.toString('latin1') === 'ID3' || (head[0] === 0xff && (head[1]! & 0xe0) === 0xe0)).toBe(true);
      total += statSync(f).size;
    }
    expect(total).toBeLessThanOrEqual(200 * 1024);
  });

  it('FR-T02 der Service Worker speichert MP3 vorab', () => {
    expect(readFileSync('vite.config.ts', 'utf8')).toMatch(/globPatterns: \[[^\]]*\bmp3\b/);
  });

  it('FR-T09 QUELLEN.md nennt jede Datei und CC0', () => {
    const q = readFileSync('public/sounds/QUELLEN.md', 'utf8');
    expect(q).toContain('CC0');
    for (const f of files) expect(q).toContain(f.replace('public/sounds/', ''));
  });
});
