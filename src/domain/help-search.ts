import type { HelpEntry } from './help-entries';

/**
 * Suche in der Hilfe (Spec 009 FR-H01 bis FR-H06). Reine Funktionen ohne Netz und ohne Speicher:
 * Der Suchbegriff verlässt das Gerät nie (FR-H14, Constitution III).
 */

export interface Segment {
  text: string;
  hit: boolean;
}

export interface SearchResult {
  tokens: string[];
  entries: HelpEntry[];
}

/** Höchstlänge der Eingabe (Edge Case). */
export const MAX_QUERY = 60;
/** Ab dieser Länge findet ein Suchwort auch Teile zusammengesetzter Wörter ("pfiff" in "Pausenpfiff"). */
const INNER_MIN = 4;
/** Länge des Textauszugs in der Trefferliste. */
const SNIPPET = 110;

/** Füllwörter zählen nicht, damit "wie lösche ich ein tor" funktioniert (Edge Case). */
const STOP = new Set([
  'wie',
  'ich',
  'ein',
  'eine',
  'einen',
  'einem',
  'einer',
  'der',
  'die',
  'das',
  'den',
  'dem',
  'des',
  'mein',
  'meine',
  'meinen',
  'meinem',
  'kann',
  'man',
  'was',
  'wo',
  'warum',
  'wann',
  'mit',
  'und',
  'oder',
  'im',
  'in',
  'auf',
  'zu',
  'ist',
  'es',
  'fuer',
  'bei',
  'von',
  'mir',
  'mich',
  'du',
  'geht',
  'gibt',
]);

const REPLACE: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

/** Kleinschreibung, ä→ae, ö→oe, ü→ue, ß→ss; `map[i]` ist die Stelle des Zeichens im Original. */
export function normalize(text: string): { text: string; map: number[] } {
  let out = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charAt(i).toLowerCase();
    const r = REPLACE[c] ?? c;
    for (const ch of r) {
      out += ch;
      map.push(i);
    }
  }
  return { text: out, map };
}

/** Suchwörter aus der Eingabe; leer, wenn weniger als zwei Zeichen übrig bleiben. */
export function queryTokens(query: string): string[] {
  const words = normalize(query.slice(0, MAX_QUERY))
    .text.replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (words.replace(/ /g, '').length < 2) return [];
  const all = words.split(' ');
  const kept = all.filter((w) => !STOP.has(w));
  return kept.length > 0 ? kept : all;
}

const isWordChar = (ch: string | undefined): boolean => ch !== undefined && /[a-z0-9]/.test(ch);

interface Hit {
  start: number;
  end: number;
  whole: boolean;
}

/** Fundstellen eines Suchworts, als Bereiche im Originaltext. */
function hits(n: { text: string; map: number[] }, token: string): Hit[] {
  const out: Hit[] = [];
  let i = n.text.indexOf(token);
  while (i !== -1) {
    const atStart = !isWordChar(n.text[i - 1]);
    if (atStart || token.length >= INNER_MIN) {
      const last = i + token.length - 1;
      out.push({
        start: n.map[i] as number,
        end: (n.map[last] as number) + 1,
        whole: atStart && !isWordChar(n.text[last + 1]),
      });
    }
    i = n.text.indexOf(token, i + 1);
  }
  return out;
}

const bodyOf = (e: HelpEntry): string => [e.answer, ...(e.steps ?? [])].join(' ');

/** Punkte eines Suchworts: Titel vor Suchbegriffen vor Text, ganzes Wort +1 (FR-H05). */
function tokenScore(fields: { text: string; map: number[] }[], token: string): number {
  const weights = [6, 4, 2];
  for (let f = 0; f < fields.length; f++) {
    const found = hits(fields[f] as { text: string; map: number[] }, token);
    if (found.length > 0) return (weights[f] as number) + (found.some((h) => h.whole) ? 1 : 0);
  }
  return 0;
}

/** null ohne Suchbegriff (Übersicht zeigen), sonst die Treffer in Rangfolge (FR-H03, FR-H05). */
export function searchHelp(query: string, entries: readonly HelpEntry[]): SearchResult | null {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return null;
  const scored: { entry: HelpEntry; score: number; order: number }[] = [];
  entries.forEach((entry, order) => {
    const fields = [normalize(entry.title), normalize(entry.keywords), normalize(bodyOf(entry))];
    let score = 0;
    for (const t of tokens) {
      const s = tokenScore(fields, t);
      if (s === 0) return;
      score += s;
    }
    scored.push({ entry, score, order });
  });
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  return { tokens, entries: scored.map((s) => s.entry) };
}

/** Text in Abschnitte mit und ohne Fundstelle zerlegen (FR-H06). */
export function highlight(text: string, tokens: string[]): Segment[] {
  const n = normalize(text);
  const ranges = tokens.flatMap((t) => hits(n, t)).sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start < pos) continue;
    if (r.start > pos) out.push({ text: text.slice(pos, r.start), hit: false });
    out.push({ text: text.slice(r.start, r.end), hit: true });
    pos = r.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), hit: false });
  return out;
}

/** Kurzer Auszug aus Antwort und Schritten rund um die erste Fundstelle, gekürzt mit "…". */
export function snippet(entry: HelpEntry, tokens: string[]): Segment[] {
  const text = bodyOf(entry);
  const n = normalize(text);
  const first = Math.min(...tokens.flatMap((t) => hits(n, t).map((h) => h.start)), Infinity);
  let start = 0;
  if (first !== Infinity && first > 40) start = text.lastIndexOf(' ', first - 30) + 1;
  let end = Math.min(text.length, start + SNIPPET);
  if (end < text.length) {
    const cut = text.lastIndexOf(' ', end);
    if (cut > start) end = cut;
  }
  const segs = highlight(text.slice(start, end), tokens);
  if (start > 0) segs.unshift({ text: '…', hit: false });
  if (end < text.length) segs.push({ text: ' …', hit: false });
  return segs;
}
