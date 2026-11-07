import {
  addDays,
  addEntry,
  checkPlanInput,
  formatPlanDate,
  isFull,
  planView,
  updateEntry,
  type PlanInput,
} from './plan';
import type { PlanEntry, PlanStore, Schema } from './types';

/**
 * Spec 015 US4: Spielplan als Liste einfügen und teilen (FR-P16 bis FR-P19). Eine Zeile je Spiel:
 * "<Wochentag> <TT.MM.> [<HH:MM>] <Mannschaft> heim|auswärts <Gegner> [(<Wettbewerb>[, <Spielzeit>])]".
 */

export type ListProblem = 'format' | 'team' | 'date' | 'weekday' | 'time' | 'text' | 'schema' | 'past';

export interface ListRow {
  /** Zeilennummer im eingefügten Text (ab 1, Leerzeilen mitgezählt). */
  line: number;
  text: string;
  /** Mannschaft, wie sie in der Zeile steht (FR-P18); leer, wenn die Zeile nicht erkannt wurde. */
  team: string;
  /** Erkannte Angaben; null, wenn die Zeile nicht ins Format passt. */
  input: PlanInput | null;
  problem: ListProblem | null;
  /** Hinweis für die Vorschau, leer ohne Problem. */
  hint: string;
}

/** US4-S5: so steht ein Spiel in der Liste (wie es die Vorschau zählt). */
export type ImportStatus = 'neu' | 'aktualisiert' | 'unverändert' | 'voll';

/** US4-S2: ohne Jahr gilt das nächste passende Datum ab so vielen Tagen vor heute. */
const BACK_DAYS = 7;
/** Längere Zeilen sind kein Spiel (und bremsen die Prüfung nicht aus). */
const MAX_LINE = 200;
const WEEKDAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

const BULLET_RE = /^[-•*]\s+/;
/** Wochentag (kurz oder lang), Datum mit oder ohne Jahr, Anstoß, Rest. */
const HEAD_RE =
  /^(?:(mo|di|mi|do|fr|sa|so)(?:ntag|enstag|ttwoch|nnerstag|eitag|mstag|nntag)?\.?,?\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})?,?\s+(?:(\d{1,2})[:.](\d{2})(?:\s*uhr)?,?\s+)?(.+)$/i;
/** Mannschaft bis zum ersten "heim"/"auswärts"/"H"/"A", danach Gegner und Klammer. */
const BODY_RE = /^(.+?)\s+(heim|auswärts|auswaerts|h|a)(?:\s+(.*))?$/i;
const SCHEMA_RE = /^(\d{1,2})\s*[×x]\s*(\d{1,2})(?:\s*min\.?)?$/i;

const schemaText = (s: Schema): string => `${s.sections}×${s.sectionMinutes}`;

/** US4-S2: Datum aus Tag, Monat und optionalem Jahr; ohne Jahr ab 7 Tagen vor heute (Saisonwechsel). */
function dateOf(day: string, month: string, year: string | undefined, today: string): string {
  const md = `${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  if (year) return `${year.length === 2 ? `20${year}` : year}-${md}`;
  const from = addDays(today, -BACK_DAYS);
  const y = Number(from.slice(0, 4));
  return `${y}-${md}` >= from ? `${y}-${md}` : `${y + 1}-${md}`;
}

/** Klammer am Zeilenende (auch mit Klammern darin): Gegner davor, Inhalt der Klammer. */
function splitBlock(rest: string): { opponent: string; block: string } {
  if (rest.endsWith(')')) {
    let depth = 0;
    for (let i = rest.length - 1; i >= 0; i--) {
      if (rest[i] === ')') depth++;
      else if (rest[i] === '(' && --depth === 0)
        return { opponent: rest.slice(0, i).trim(), block: rest.slice(i + 1, -1) };
    }
  }
  return { opponent: rest, block: '' };
}

/** "(Leistungsliga, 3×25)": Wettbewerb und Spielzeit (letzter Teil, wenn er wie "3×25" aussieht). */
function blockOf(block: string): { competition: string; schema: Schema | null } {
  const parts = block.split(',');
  const m = SCHEMA_RE.exec(parts[parts.length - 1]!.trim());
  if (!m) return { competition: block.trim(), schema: null };
  return {
    competition: parts.slice(0, -1).join(',').trim(),
    schema: { sections: Number(m[1]), sectionMinutes: Number(m[2]) },
  };
}

const row = (line: number, text: string, fields: Partial<ListRow> = {}): ListRow => ({
  line,
  text,
  team: '',
  input: null,
  problem: 'format',
  hint: 'Format nicht erkannt.',
  ...fields,
});

/** US4-S1 bis S3: eine Zeile lesen und prüfen. */
function parseLine(text: string, line: number, today: string, teams: readonly string[]): ListRow {
  const head = text.length <= MAX_LINE ? HEAD_RE.exec(text) : null;
  const body = head ? BODY_RE.exec(head[7]!) : null;
  if (!head || !body) return row(line, text);
  const [, wd, day, month, year, hh, mm] = head;
  const team = body[1]!;
  const { opponent, block } = splitBlock((body[3] ?? '').trim());
  const input: PlanInput = {
    team: teams.find((t) => t.toLowerCase() === team.toLowerCase()) ?? team,
    date: dateOf(day!, month!, year, today),
    time: hh ? `${hh.padStart(2, '0')}:${mm}` : '',
    venue: /^h/i.test(body[2]!) ? 'home' : 'away',
    opponent: opponent === '?' ? '' : opponent,
    ...blockOf(block),
  };
  const check = checkPlanInput(input, teams);
  const value = check.ok ? check.value : input;
  const fields = { team, input: value };
  const errors = check.ok ? {} : check.errors;
  if (errors.team)
    return row(line, text, {
      ...fields,
      problem: 'team',
      hint: `Die Mannschaft „${team}“ gehört nicht zum Live-Spieltag.`,
    });
  if (errors.date) return row(line, text, { ...fields, problem: 'date', hint: 'Dieses Datum gibt es nicht.' });
  const real = WEEKDAY_NAMES[new Date(`${value.date}T00:00:00Z`).getUTCDay()]!;
  if (wd && real.slice(0, 2).toLowerCase() !== wd.toLowerCase()) {
    const shown = `${value.date.slice(8)}.${value.date.slice(5, 7)}.${value.date.slice(0, 4)}`;
    return row(line, text, {
      ...fields,
      problem: 'weekday',
      hint: `Wochentag passt nicht: Der ${shown} ist ein ${real}.`,
    });
  }
  if (errors.time) return row(line, text, { ...fields, problem: 'time', hint: 'Anstoß ist keine Uhrzeit.' });
  if (errors.opponent || errors.competition) {
    return row(line, text, { ...fields, problem: 'text', hint: 'Gegner und Wettbewerb höchstens 40 Zeichen.' });
  }
  if (errors.schema)
    return row(line, text, { ...fields, problem: 'schema', hint: 'Spielzeit: 1 bis 4 Abschnitte, 1 bis 60 Minuten.' });
  if (value.date < today) return row(line, text, { ...fields, problem: 'past', hint: 'Datum vorbei.' });
  return row(line, text, { ...fields, problem: null, hint: '' });
}

/** FR-P16: eingefügten Text Zeile für Zeile lesen; Leerzeilen zählen mit, werden aber nicht gezeigt. */
export function parsePlanList(text: string, today: string, teams: readonly string[]): ListRow[] {
  return text.split(/\r?\n/).flatMap((raw, i) => {
    const line = raw.trim().replace(BULLET_RE, '');
    return line ? [parseLine(line, i + 1, today, teams)] : [];
  });
}

/** FR-P18: Mannschaften aus "Meine Mannschaften", die Zeilen nennen, die aber nicht zum Live-Spieltag gehören. */
export function missingTeams(rows: readonly ListRow[], options: readonly string[]): string[] {
  const keys = rows
    .filter((r) => r.problem === 'team')
    .map((r) => options.find((o) => o.toLowerCase() === r.team.toLowerCase()))
    .filter((k): k is string => k !== undefined);
  return [...new Set(keys)];
}

/** FR-P17: dasselbe Spiel = gleiche Mannschaft, gleiches Datum, gleicher Gegner ohne Groß- und Kleinschreibung. */
const sameGame = (e: PlanEntry, input: PlanInput): boolean =>
  !e.deleted &&
  e.team === input.team &&
  e.date === input.date &&
  e.opponent.toLowerCase() === input.opponent.toLowerCase();

/** Genau ein Platzhalter "Gegner offen" derselben Mannschaft am selben Tag bekommt den Gegner aus der Liste. */
function placeholderFor(entries: readonly PlanEntry[], input: PlanInput): PlanEntry | undefined {
  const open = entries.filter((e) => !e.deleted && e.team === input.team && e.date === input.date && !e.opponent);
  return open.length === 1 ? open[0] : undefined;
}

const sameAngaben = (e: PlanEntry, input: PlanInput): boolean =>
  (e.time ?? '') === input.time &&
  e.venue === input.venue &&
  e.opponent === input.opponent &&
  e.competition === input.competition &&
  (e.schema ? schemaText(e.schema) : '') === (input.schema ? schemaText(input.schema) : '');

/**
 * US4-S4, FR-P17: Zeilen übernehmen. Vorhandene Spiele werden aktualisiert (nur bei Änderung), auch ein
 * Platzhalter "Gegner offen", neue angelegt, solange Platz ist (FR-P03). Gleiche Zeilen ein zweites Mal ändern nichts.
 */
export function importPlan(
  store: PlanStore,
  inputs: readonly PlanInput[],
  today: string,
  now: number,
  newId: () => string,
): { store: PlanStore; statuses: ImportStatus[] } {
  let next = store;
  const statuses = inputs.map((input): ImportStatus => {
    const match =
      next.entries.find((e) => sameGame(e, input)) ??
      (input.opponent ? placeholderFor(next.entries, input) : undefined);
    if (match) {
      if (sameAngaben(match, input)) return 'unverändert';
      next = updateEntry(next, match.id, input, now)!.store;
      return 'aktualisiert';
    }
    if (isFull(next, today)) return 'voll';
    next = addEntry(next, input, newId(), now).store;
    return 'neu';
  });
  return { store: next, statuses };
}

/** FR-P19: ein Spiel als Zeile im Einfügeformat. */
export function planLine(e: PlanEntry): string {
  const extra = [e.competition, e.schema ? schemaText(e.schema) : ''].filter(Boolean).join(', ');
  const opponent = e.opponent || '?';
  // Endet der Gegner mit einer Klammer, hält eine leere Klammer ihn beim Wiedereinfügen zusammen.
  const block = extra ? ` (${extra})` : opponent.endsWith(')') ? ' ()' : '';
  return `${formatPlanDate(e.date)} ${e.time ? `${e.time} ` : ''}${e.team} ${e.venue === 'home' ? 'heim' : 'auswärts'} ${opponent}${block}`;
}

/** US4-S5, FR-P19: alle Spiele ab heute, nach Datum und Anstoß, ohne abgesagte; unverändert wieder einfügbar. */
export const planListText = (store: PlanStore, today: string): string =>
  planView(store, today)
    .upcoming.flatMap((g) => g.entries)
    .filter((e) => !e.cancelled)
    .map(planLine)
    .join('\n');
