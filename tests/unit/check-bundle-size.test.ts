import { describe, expect, it } from 'vitest';
import { BUDGET_BYTES, entryScripts } from '../../scripts/check-bundle-size';

describe('T084 Bundle-Budget', () => {
  it('Budget beträgt 60 KB gzip', () => {
    expect(BUDGET_BYTES).toBe(61440);
  });

  it('findet Einstiegs-Skripte und Modul-Preloads in index.html', () => {
    const html = `
      <script type="module" crossorigin src="/feuerbach-torticker/assets/index-abc.js"></script>
      <link rel="modulepreload" crossorigin href="/feuerbach-torticker/assets/vendor-def.js">
      <link rel="stylesheet" href="/feuerbach-torticker/assets/index-123.css">`;
    expect(entryScripts(html)).toEqual(['assets/index-abc.js', 'assets/vendor-def.js']);
  });

  it('zählt doppelte Verweise nur einmal', () => {
    const html = `<script src="/x/assets/a.js"></script><link href="/x/assets/a.js">`;
    expect(entryScripts(html)).toEqual(['assets/a.js']);
  });
});
