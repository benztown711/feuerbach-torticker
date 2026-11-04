/**
 * Prüfung "Hilfe-Abdeckung" (Spec 010 FR-H21, FR-H22, Constitution IX).
 *
 * Schlägt fehl, wenn
 * (a) eine umgesetzte User Story (es gibt einen Test mit ihrer Szenario-ID, z. B. "006 US3-S1";
 *     ohne Spec-Nummer gehört der Test zu Spec 001) von keinem Hilfe-Eintrag als Quelle genannt wird,
 * (b) eine Quelle auf eine Spec, User Story oder Anforderung verweist, die es nicht (mehr) gibt,
 * (c) eine Eintrags-ID doppelt vorkommt oder Titel, Antwort, Thema oder Quelle fehlen.
 *
 * Läuft als Unit-Test (`tests/unit/help-coverage.test.ts`) in `npm run test:cov` und blockiert so den Merge;
 * `npx tsx scripts/check-help.ts` zeigt die Meldungen direkt.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HELP_ENTRIES, HELP_TOPICS, type HelpEntry } from '../src/domain/help-entries';

export interface HelpCheckInput {
  /** Spec-Nummer ("006") → Inhalt von spec.md */
  specs: Map<string, string>;
  /** Inhalte aller Testdateien */
  tests: string[];
  entries: readonly HelpEntry[];
  topics: readonly { id: string }[];
  /** Ordnernamen unter specs/; eine doppelt vergebene Nummer würde eine Spec still überdecken. */
  specDirs?: string[];
}

export interface Source {
  spec: string;
  kind: 'US' | 'FR';
  id: string;
}

export function specStories(text: string): Set<number> {
  return new Set([...text.matchAll(/^### User Story (\d+)\b/gm)].map((m) => Number(m[1])));
}

export function specRequirements(text: string): Set<string> {
  return new Set([...text.matchAll(/\*\*(FR-[A-Z]*\d+[a-z]?)\*\*/g)].map((m) => m[1] as string));
}

/**
 * "006 US3" für jeden Test mit Szenario-ID "006 US3-S1". Ohne Spec-Nummer gilt die Nummer der unmittelbar
 * davor stehenden ID ("006 US1-S2 US1-S3"), sonst Spec 001.
 */
export function implementedStories(tests: string[]): Set<string> {
  const out = new Set<string>();
  for (const t of tests) {
    let prev: { spec: string; end: number } | null = null;
    for (const m of t.matchAll(/(?<![\w-])(?:(\d{3}) )?US(\d+)-S\d+/g)) {
      const start = m.index;
      const follows: boolean = prev !== null && /^\s+$/.test(t.slice(prev.end, start));
      const spec: string = m[1] ?? (follows && prev ? prev.spec : '001');
      out.add(`${spec} US${m[2]}`);
      prev = { spec, end: start + m[0].length };
    }
  }
  return out;
}

export function parseSource(src: string): Source | null {
  const us = /^(\d{3}) US(\d+)$/.exec(src);
  if (us) return { spec: us[1] as string, kind: 'US', id: us[2] as string };
  const fr = /^(\d{3}) (FR-[A-Z]*\d+[a-z]?)$/.exec(src);
  if (fr) return { spec: fr[1] as string, kind: 'FR', id: fr[2] as string };
  return null;
}

export function checkHelp({ specs, tests, entries, topics, specDirs = [] }: HelpCheckInput): string[] {
  const errors: string[] = [];
  const byNumber = new Map<string, string[]>();
  for (const dir of specDirs) {
    const nr = /^(\d{3})-/.exec(dir)?.[1];
    if (nr) byNumber.set(nr, [...(byNumber.get(nr) ?? []), dir]);
  }
  for (const [nr, dirs] of byNumber)
    if (dirs.length > 1) errors.push(`Spec-Nummer ${nr} ist doppelt vergeben: ${dirs.join(', ')}`);

  const topicIds = new Set(topics.map((t) => t.id));
  const ids = new Set(entries.map((e) => e.id));
  const seen = new Set<string>();
  const covered = new Set<string>();

  for (const e of entries) {
    const at = `Eintrag „${e.id}“`;
    if (seen.has(e.id)) {
      errors.push(`${at} ist doppelt`);
      continue;
    }
    seen.add(e.id);
    if (!e.title.trim()) errors.push(`${at}: Titel fehlt`);
    if (!e.answer.trim()) errors.push(`${at}: Antwort fehlt`);
    if (e.sources.length === 0) errors.push(`${at}: Quelle fehlt`);
    if (!topicIds.has(e.topic)) errors.push(`${at}: Thema „${e.topic}“ ist unbekannt`);
    for (const src of e.sources) {
      const s = parseSource(src);
      if (!s) {
        errors.push(`${at}: Quelle „${src}“ hat nicht die Form „006 US3“ oder „001 FR-036“`);
        continue;
      }
      const text = specs.get(s.spec);
      if (text === undefined) {
        errors.push(`${at}: Quelle ${src} existiert nicht (keine Spec ${s.spec})`);
        continue;
      }
      const exists = s.kind === 'US' ? specStories(text).has(Number(s.id)) : specRequirements(text).has(s.id);
      if (!exists) errors.push(`${at}: Quelle ${src} existiert nicht`);
      else if (s.kind === 'US') covered.add(`${s.spec} US${s.id}`);
    }
    for (const r of e.related ?? []) if (!ids.has(r)) errors.push(`${at}: „Siehe auch“ ${r} gibt es nicht`);
  }

  const missing = [...implementedStories(tests)]
    .filter((us) => specs.has(us.slice(0, 3)) && !covered.has(us))
    .sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
  for (const us of missing) errors.push(`${us} ohne Hilfe-Eintrag`);
  return errors;
}

function files(dir: string, re: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'node_modules' || name.endsWith('-snapshots') ? [] : files(p, re);
    return re.test(name) ? [p] : [];
  });
}

/** Liest Specs und Tests des Repositorys (für den Unit-Test und den Aufruf über die Kommandozeile). */
export function repoInput(root: string): HelpCheckInput {
  const specs = new Map<string, string>();
  const specDirs = readdirSync(join(root, 'specs')).sort();
  for (const dir of specDirs) {
    const nr = /^(\d{3})-/.exec(dir)?.[1];
    const file = join(root, 'specs', dir, 'spec.md');
    if (nr && statSync(join(root, 'specs', dir)).isDirectory()) {
      try {
        specs.set(nr, readFileSync(file, 'utf8'));
      } catch {
        // Ordner ohne spec.md zählt nicht als Spec
      }
    }
  }
  const tests = files(join(root, 'tests'), /\.(test|spec)\.tsx?$/).map((f) => readFileSync(f, 'utf8'));
  return { specs, tests, entries: HELP_ENTRIES, topics: HELP_TOPICS, specDirs };
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const errors = checkHelp(repoInput(root));
  for (const e of errors) console.error(`✗ ${e}`);
  if (errors.length > 0) {
    console.error(`${errors.length} Lücken. Hilfe-Einträge in src/domain/help-entries.ts ergänzen.`);
    process.exit(1);
  }
  console.log('✓ Hilfe-Abdeckung: jede umgesetzte User Story hat einen Hilfe-Eintrag.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
