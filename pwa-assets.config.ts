import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';
import tokens from './design/tokens.json' with { type: 'json' };

// App-Icons aus dem Vereinswappen (FR-019): weißer Grund (wappenfeld), Wappen unverzerrt mit Schutzraum.
// Quelle ist die von `npm run tokens` nach public/brand kopierte Datei; Icons landen daneben.
const wappenfeld = tokens.color.tokens.find((t) => t.name === 'wappenfeld')?.value.light ?? '';
const contain = { fit: 'contain' as const, background: wappenfeld };

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0.1, resizeOptions: contain },
    // maskable: Wappen innerhalb der sicheren 80-%-Zone
    maskable: { ...minimal2023Preset.maskable, padding: 0.3, resizeOptions: contain },
    apple: { ...minimal2023Preset.apple, padding: 0.2, resizeOptions: contain },
  },
  images: ['public/brand/wappen.svg'],
});
