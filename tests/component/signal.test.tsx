import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Signal über ein HTML-Audio-Element (Medien-Kanal) statt Web Audio (Klingelton-Kanal),
 * Gerätetest vom 02.11.2026: Lautlos-Schalter schaltete Web Audio stumm, Ton zu leise,
 * nach einigen Minuten kein Ton mehr (FR-007, FR-036, research.md R-18).
 */
let block = false;
let played: { muted: boolean; src: string }[] = [];

async function load() {
  vi.resetModules();
  return import('../../src/platform/signal');
}

async function flush() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe('Signal-Ton über Audio-Element (FR-007, FR-036)', () => {
  beforeEach(() => {
    block = false;
    played = [];
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (block) return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      played.push({ muted: this.muted, src: this.src });
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    (navigator as unknown as { audioSession?: { type: string } }).audioSession = { type: 'auto' };
    URL.createObjectURL = vi.fn(() => 'blob:signal');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as unknown as { audioSession?: unknown }).audioSession;
  });

  it('FR-036 audioReady ist false, bevor je freigeschaltet wurde', async () => {
    const s = await load();
    expect(s.audioReady()).toBe(false);
  });

  it('FR-036 unlockAudio spielt das Signal stumm innerhalb der Berührung an und meldet danach bereit', async () => {
    const s = await load();
    s.unlockAudio();
    await flush();
    expect(played).toEqual([{ muted: true, src: 'blob:signal' }]);
    expect(s.audioReady()).toBe(true);
  });

  it('FR-036 unlockAudio setzt die Audio-Session auf "playback"', async () => {
    const s = await load();
    s.unlockAudio();
    expect((navigator as unknown as { audioSession: { type: string } }).audioSession.type).toBe('playback');
  });

  it('FR-007 playSignal spielt das Signal hörbar (nicht stumm) ab', async () => {
    const s = await load();
    s.unlockAudio();
    await flush();
    s.playSignal();
    await flush();
    expect(played.at(-1)).toEqual({ muted: false, src: 'blob:signal' });
  });

  it('FR-036 lehnt iOS das Abspielen ab, meldet audioReady false; die nächste Berührung schaltet wieder frei', async () => {
    const s = await load();
    s.unlockAudio();
    await flush();
    block = true;
    s.playSignal();
    await flush();
    expect(s.audioReady()).toBe(false);
    block = false;
    s.unlockAudio();
    await flush();
    expect(s.audioReady()).toBe(true);
  });

  it('FR-007 das erzeugte Signal ist eine gültige WAV-Datei mit lautem Pegel und etwa 1,5 s Länge', async () => {
    const s = await load();
    const wav = s.buildSignalWav();
    const view = new DataView(wav);
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');
    const sampleRate = view.getUint32(24, true);
    const dataBytes = view.getUint32(40, true);
    const seconds = dataBytes / 2 / sampleRate;
    expect(seconds).toBeGreaterThan(1.2);
    expect(seconds).toBeLessThan(2);
    let peak = 0;
    for (let i = 44; i < wav.byteLength; i += 2) peak = Math.max(peak, Math.abs(view.getInt16(i, true)));
    expect(peak).toBeGreaterThan(30000);
  });
});
