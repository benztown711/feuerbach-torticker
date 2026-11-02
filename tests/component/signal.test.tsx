import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type State = 'suspended' | 'running' | 'interrupted' | 'closed';

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: State = 'suspended';
  currentTime = 0;
  destination = {};
  started: number[] = [];
  bufferSources = 0;
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: (t: number) => this.started.push(t),
      stop: vi.fn(),
    };
  }
  createGain() {
    return { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() };
  }
  createBuffer() {
    return {};
  }
  createBufferSource() {
    this.bufferSources += 1;
    return { buffer: null, connect: vi.fn(), start: vi.fn() };
  }
}

async function load() {
  vi.resetModules();
  return import('../../src/platform/signal');
}

describe('Signal-Ton auf iOS (FR-007, Fehlerbericht 02.11.)', () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    (navigator as unknown as { audioSession?: { type: string } }).audioSession = { type: 'auto' };
  });
  afterEach(() => {
    delete (navigator as unknown as { audioSession?: unknown }).audioSession;
  });

  it('FR-007 unlockAudio setzt die Audio-Session auf "playback", damit der Lautlos-Schalter den Ton nicht stummschaltet', async () => {
    const s = await load();
    s.unlockAudio();
    expect((navigator as unknown as { audioSession: { type: string } }).audioSession.type).toBe('playback');
  });

  it('FR-007 unlockAudio spielt innerhalb der Berührung einen stillen Puffer (iOS-Freischaltung)', async () => {
    const s = await load();
    s.unlockAudio();
    expect(FakeAudioContext.instances[0]?.bufferSources).toBe(1);
    expect(FakeAudioContext.instances[0]?.state).toBe('running');
  });

  it('FR-007 nach Hintergrund ("interrupted") meldet audioReady false und die nächste Berührung schaltet erneut frei', async () => {
    const s = await load();
    s.unlockAudio();
    expect(s.audioReady()).toBe(true);
    const ctx = FakeAudioContext.instances[0]!;
    ctx.state = 'interrupted';
    expect(s.audioReady()).toBe(false);
    s.unlockAudio();
    expect(s.audioReady()).toBe(true);
  });

  it('FR-007 playSignal spielt zwei Töne, wenn der Ton freigeschaltet ist', async () => {
    const s = await load();
    s.unlockAudio();
    s.playSignal();
    expect(FakeAudioContext.instances[0]?.started.length).toBe(2);
  });

  it('FR-007 playSignal versucht bei gesperrtem Ton fortzusetzen und spielt danach', async () => {
    const s = await load();
    s.unlockAudio();
    const ctx = FakeAudioContext.instances[0]!;
    ctx.state = 'suspended';
    s.playSignal();
    await Promise.resolve();
    await Promise.resolve();
    expect(ctx.started.length).toBe(2);
  });

  it('FR-007 audioReady ist false, bevor je freigeschaltet wurde', async () => {
    const s = await load();
    expect(s.audioReady()).toBe(false);
  });
});
