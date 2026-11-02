/**
 * Bundle-Budget (T084): Summe aller JS-Dateien, die index.html direkt lädt, < 60 KB gzip.
 * Nachgeladene Teile (dynamischer Import) zählen nicht zum Hauptbundle.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export const BUDGET_BYTES = 60 * 1024;

export function entryScripts(html: string): string[] {
  const out: string[] = [];
  const re = /<(?:script|link)[^>]+(?:src|href)="[^"]*?\/(assets\/[^"]+\.js)"/g;
  for (const m of html.matchAll(re)) if (m[1]) out.push(m[1]);
  return [...new Set(out)];
}

function main(): void {
  const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
  const files = entryScripts(html);
  if (files.length === 0) throw new Error('Keine Einstiegs-Skripte in dist/index.html gefunden');
  let total = 0;
  for (const f of files) {
    const size = gzipSync(readFileSync(resolve(dist, f))).length;
    total += size;
    console.log(`${(size / 1024).toFixed(1).padStart(6)} KB  ${f}`);
  }
  console.log(`${(total / 1024).toFixed(1).padStart(6)} KB  gesamt (Budget ${BUDGET_BYTES / 1024} KB gzip)`);
  if (total > BUDGET_BYTES) {
    console.error('Bundle-Budget überschritten.');
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
