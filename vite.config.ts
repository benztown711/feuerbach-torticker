import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa';
import tokens from './design/tokens.json' with { type: 'json' };
import pkg from './package.json' with { type: 'json' };

const color = (name: string, theme: 'light' | 'dark' = 'light'): string => {
  const token = tokens.color.tokens.find((t) => t.name === name);
  if (!token) throw new Error(`Token ${name} fehlt in design/tokens.json`);
  return token.value[theme];
};

export const BASE = '/feuerbach-torticker/';

/** Manifest der App; die Seite des Zuschauer-Links leitet daraus ihr eigenes ab (Spec 006 FR-L16). */
const manifest: Partial<ManifestOptions> = {
  name: 'Feuerbach Torticker',
  short_name: 'Torticker',
  description: 'Tore, Spielminute und Spielzeit am Spielfeldrand erfassen.',
  lang: 'de',
  display: 'standalone',
  orientation: 'portrait',
  start_url: BASE,
  scope: BASE,
  theme_color: color('vereinsrot'),
  background_color: color('surface'),
  icons: [
    { src: 'brand/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
    { src: 'brand/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'brand/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: 'brand/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

/**
 * Spec 006 FR-L16: kein Manifest-Verweis im HTML. Safari lädt das Manifest beim ersten Verweis und behält es;
 * die App setzt ihn beim Start selbst, auf der Seite des Zuschauer-Links mit dem Zuschauer-Link als Startadresse
 * (`src/platform/web-manifest.ts`). Die Datei `manifest.webmanifest` erzeugt vite-plugin-pwa weiterhin.
 */
const manifestLinkBySkript = (): Plugin => ({
  name: 'torticker:manifest-link-per-skript',
  enforce: 'post',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (html) => html.replace(/<link rel="manifest"[^>]*>/, ''),
  },
});

export default defineConfig({
  base: BASE,
  // App-Version für die Sicherung (FR-024, Feinschliff)
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __MANIFEST__: JSON.stringify(manifest) },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'generateSW',
      injectRegister: false,
      includeAssets: ['brand/*', 'fonts/OFL.txt'],
      manifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest,txt}'],
        // Vorschaubild nur für WhatsApp & Co. (FR-043), nicht offline nötig
        globIgnores: ['**/link-vorschau.png'],
        navigateFallback: `${BASE}index.html`,
      },
    }),
    manifestLinkBySkript(),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
