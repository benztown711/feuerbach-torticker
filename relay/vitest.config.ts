import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

/** Spec 007 research.md R-N7: Worker und Durable Object in der echten Laufzeit (workerd) testen. */
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.toml' } })],
  test: { include: ['test/**/*.test.ts'] },
});
