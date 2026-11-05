import { describe, expect, it } from 'vitest';
import { manifestDataUrl, viewerManifest, type WebManifest } from '../../src/domain/web-manifest';

const APP = 'https://benztown711.github.io/feuerbach-torticker/';
const base: WebManifest = {
  name: 'Feuerbach Torticker',
  short_name: 'Torticker',
  display: 'standalone',
  start_url: '/feuerbach-torticker/',
  scope: '/feuerbach-torticker/',
  icons: [
    { src: 'brand/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'brand/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

describe('006 FR-L16 Manifest auf der Seite des Zuschauer-Links', () => {
  it('nennt den Zuschauer-Link als Startadresse, sonst alles wie die App', () => {
    const m = viewerManifest(base, APP, '/live/abc');
    expect(m.start_url).toBe(`${APP}#/live/abc`);
    expect(m).toMatchObject({ name: 'Feuerbach Torticker', short_name: 'Torticker', display: 'standalone' });
  });

  it('bleibt dieselbe App (id) und nutzt nur absolute Adressen (data:-Adresse hat keine Basis)', () => {
    const m = viewerManifest(base, APP, '/live/abc');
    expect(m.id).toBe(APP);
    expect(m.scope).toBe(APP);
    expect(m.icons.map((i) => i.src)).toEqual([`${APP}brand/pwa-192x192.png`, `${APP}brand/maskable-icon-512x512.png`]);
    expect(m.icons[1]?.purpose).toBe('maskable');
    // Das Ausgangs-Manifest bleibt unverändert.
    expect(base.icons[0]?.src).toBe('brand/pwa-192x192.png');
  });

  it('verpackt das Manifest als data:-Adresse, die der Browser ohne Anfrage liest', () => {
    const url = manifestDataUrl({ ...base, name: 'Ä & #' });
    expect(url.startsWith('data:application/manifest+json,')).toBe(true);
    expect(url).not.toContain('#');
    const json: unknown = JSON.parse(decodeURIComponent(url.slice(url.indexOf(',') + 1)));
    expect(json).toMatchObject({ name: 'Ä & #', start_url: '/feuerbach-torticker/' });
  });
});
