import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

const browserApis = ['window', 'document', 'navigator', 'indexedDB', 'localStorage', 'sessionStorage'];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.lighthouseci/**',
      'public/**',
      '.specify/**',
      '.claude/**',
      'node_modules/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // Constitution: src/domain ist reine Logik ohne Browser-APIs (testbar, Prinzip V).
    files: ['src/domain/**/*.{ts,tsx}'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-globals': ['error', ...browserApis],
    },
  },
  prettier,
);
