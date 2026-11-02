import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: { name: 'component', include: ['tests/component/**/*.test.tsx'], environment: 'jsdom' },
      },
    ],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'scripts/**'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        'src/domain/**': { branches: 100, functions: 100, lines: 100, statements: 100 },
      },
    },
  },
});
