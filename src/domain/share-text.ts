import { shootoutState } from './cup';
import { gameEvents, personLabel, subText } from './events';
import { clockOf, sectionLabel } from './game';
import { assistSuffix, goalRows, goalSuffix, homeAway, score, scorerLabel } from './goals';
import { startedAt } from './history';
import { formatMinute } from './minute';
import { shortTeamName } from './team-name';
import type { CardColor, CardEvent, Game, Player, Side } from './types';

/** Spec 005 FR-S04: Feuerbach ist im geteilten Text immer rot, auch in Leibchen. */
export const OWN_SYMBOL = '🔴';

const OPP_SYMBOLS: Record<string, string> = {
  rot: '⭕',
  schwarz: '⚫',
  weiss: '⚪',
  grau: '⚪',
  gelb: '🟡',
  orange: '🟠',
  gruen: '🟢',
  hellblau: '🔵',
  blau: '🔵',
  dunkelblau: '🔵',
  lila: '🟣',
  bordeaux: '🟤',
};

/** FR-S04: Emoji der gegnerischen Trikotfarbe; Rot wird ⭕, damit beide unterscheidbar bleiben. */
export const oppSymbol = (color: string): string => OPP_SYMBOLS[color] ?? '⚪';

const sideSymbol = (game: Game, side: Side): string => (side === 'own' ? OWN_SYMBOL : oppSymbol(game.oppColor));

const CARD_SYMBOLS: Record<CardColor, string> = { gelb: '🟨', gelbrot: '🟥', rot: '🟥', zeit: '⏱️' };
const CARD_NOTES: Partial<Record<CardColor, string>> = { gelbrot: 'Gelb-Rot', zeit: 'Zeitstrafe' };

const MONO = '```';
const separator = (label: string): string => `··· ${label} ···`;

/** FR-042: Zusatz für den Zwischenstand; leer vor dem Anpfiff und nach dem Schlusspfiff. */
function interimInfo(game: Game, now: number): { text: string; atHalf: boolean } {
  const c = clockOf(game, now);
  if (c.status === 'running' || c.status === 'paused')
    return { text: `Zwischenstand ${formatMinute(c.minute, c.stoppage)}`, atHalf: false };
  if (c.status === 'break') {
    // Pause nach dem ersten Abschnitt: Halbzeitstand entspricht dem Spielstand und entfällt.
    const atHalf = c.kickoffSection === 2;
    if (c.kickoffSection === game.schema.sections + 1) return { text: 'vor der Verlängerung', atHalf };
    return { text: game.schema.sections === 2 && atHalf ? 'Halbzeit' : 'Pause', atHalf };
  }
  return { text: '', atHalf: false };
}

/** Karte im Verlauf: "Tom", "Nr. 4 (Gegner)", "Gegner", ohne Spieler bei Feuerbach der Kurzname. */
function cardShareText(game: Game, e: CardEvent, players: Player[]): string {
  const who = personLabel(e.who, players);
  const person = e.side === 'opp' ? (who ? `${who} (Gegner)` : 'Gegner') : who || shortTeamName(game.ownTeam);
  const note = CARD_NOTES[e.card];
  return note ? `${person} (${note})` : person;
}

interface Row {
  at: number;
  rank: number;
  symbol: string;
  minute: string;
  score: string;
  text: string;
}
type Line = Row | { at: number; rank: number; sep: string };

/**
 * FR-S03: Tore, Karten und Wechsel chronologisch in Spalten; Trennzeilen an den Abschnittsgrenzen
 * ("Halbzeit", "2. Drittel", "Verlängerung"). Ohne echte Zeile gibt es keinen Verlauf.
 */
function historyLines(game: Game, players: Player[]): string[] {
  const { sections } = game.schema;
  const lines: Line[] = [];
  for (const e of game.clockEvents) {
    if (e.type !== 'kickoff' || e.section < 2 || e.section > sections + 1) continue;
    const label =
      e.section === sections + 1 ? 'Verlängerung' : sections === 2 ? 'Halbzeit' : sectionLabel(e.section, sections);
    lines.push({ at: e.at, rank: 0, sep: separator(label) });
  }
  for (const row of goalRows(game).reverse()) {
    if (row.removed) continue;
    // Spec 009 FR-V07: Vorlage in der Zeile des Tores.
    const text = `${scorerLabel(row.goal, players)}${assistSuffix(row.goal, players)}${goalSuffix(row.goal)}`.trim();
    lines.push({
      at: row.goal.at,
      rank: 1,
      symbol: sideSymbol(game, row.goal.side),
      minute: row.label,
      score: row.score,
      text,
    });
  }
  for (const e of gameEvents(game)) {
    if (e.kind === 'mark') continue; // FR-S08: Lesezeichen nie
    const minute = formatMinute(e.minute, e.stoppage);
    lines.push(
      e.kind === 'card'
        ? { at: e.at, rank: 2, symbol: CARD_SYMBOLS[e.card], minute, score: '', text: cardShareText(game, e, players) }
        : { at: e.at, rank: 2, symbol: '🔄', minute, score: '', text: subText(e, players) },
    );
  }
  const rows = lines.filter((l): l is Row => !('sep' in l));
  if (rows.length === 0) return [];
  const minuteWidth = Math.max(...rows.map((r) => r.minute.length));
  const scoreWidth = Math.max(...rows.map((r) => r.score.length));
  const format = (r: Row): string => {
    const cols = [`${r.symbol} ${r.minute.padStart(minuteWidth)}`];
    if (scoreWidth > 0) cols.push(r.score.padEnd(scoreWidth));
    cols.push(r.text);
    return cols.join('  ').trimEnd();
  };
  return lines.sort((a, b) => a.at - b.at || a.rank - b.rank).map((l) => ('sep' in l ? l.sep : format(l)));
}

/** FR-S05: Schussreihen (Heim zuerst) im Verlauf und die eigenen Schützen darunter. */
function shootoutLines(game: Game, players: Player[]): { rows: string[]; shooters: string[] } {
  const shots = game.shootout?.shots ?? [];
  if (shots.length === 0) return { rows: [], shooters: [] };
  const order: Side[] = game.venue === 'home' ? ['own', 'opp'] : ['opp', 'own'];
  const rows = [
    separator('Elfmeterschießen'),
    ...order.map((side) => {
      const mine = shots.filter((s) => s.side === side);
      const marks = mine.map((s) => (s.hit ? '✅' : '❌')).join(' ');
      return `${`${sideSymbol(game, side)} ${marks}`.trimEnd()}  ${mine.filter((s) => s.hit).length}`;
    }),
  ];
  const own = shots.filter((s) => s.side === 'own');
  const named = own.some((s) => s.who !== null);
  return {
    rows,
    shooters: named ? [`Schützen: ${own.map((s) => personLabel(s.who, players) || '?').join(', ')}`] : [],
  };
}

/** FR-S06: eigene Torschützen, meiste Tore zuerst, bei Gleichstand wer zuerst getroffen hat. */
function scorersLine(game: Game, players: Player[]): string {
  const counts = new Map<string, number>();
  for (const g of game.goals) {
    if (g.deletedAt !== null || g.side !== 'own' || g.scorer === null || g.scorer.kind === 'ownGoal') continue;
    const name = scorerLabel(g, players);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} ${'⚽'.repeat(count)}`)
    .join(' · ');
}

/** FR-S01: Siegerzeile nach beendetem Elfmeterschießen. */
function shootoutHeadline(game: Game): string | null {
  if (!game.shootout?.done) return null;
  const st = shootoutState(game);
  if (st.own === st.opp) {
    const p = homeAway(game.venue, { own: st.own, opp: st.opp });
    return `*Elfmeterschießen ${p.home}:${p.away}*`;
  }
  const winner = st.own > st.opp ? shortTeamName(game.ownTeam) : game.opponent;
  return `*${winner} gewinnt ${Math.max(st.own, st.opp)}:${Math.min(st.own, st.opp)} im Elfmeterschießen*`;
}

/**
 * Ergebnistext zum Teilen als "Anzeigetafel in Farbe" (Spec 005, contracts/share-text.md):
 * fette Kopfzeile (Heim zuerst), Infozeile, Datumszeile, Verlauf in Festbreitenschrift, Torschützen.
 * Mit `now` als Zwischenstand während des Spiels (FR-042).
 */
export function buildShareText(game: Game, players: Player[], timeZone?: string, now?: number): string {
  const [home, away] = game.venue === 'home' ? [game.ownTeam, game.opponent] : [game.opponent, game.ownTeam];
  const total = homeAway(game.venue, score(game));
  const interim = now === undefined ? { text: '', atHalf: false } : interimInfo(game, now);
  const half =
    !interim.atHalf && game.schema.sections > 1 && game.halfTimeScore ? homeAway(game.venue, game.halfTimeScore) : null;
  const extra = game.clockEvents.some((e) => e.type === 'fullTime' && e.section > game.schema.sections);
  const info = [
    interim.text,
    extra ? 'nach Verlängerung' : '',
    half ? `Halbzeit ${half.home}:${half.away}` : '',
    game.shootout && !game.shootout.done ? 'Elfmeterschießen läuft' : '',
  ].filter(Boolean);

  const tz = timeZone ? { timeZone } : {};
  const at = startedAt(game);
  const fmt = (o: Intl.DateTimeFormatOptions): string => new Intl.DateTimeFormat('de-DE', { ...o, ...tz }).format(at);
  const date = `${fmt({ weekday: 'short' })}, ${fmt({ day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  const kicked = game.clockEvents.some((e) => e.type === 'kickoff');

  const lines = [`*${home} ${total.home}:${total.away} ${away}*`];
  const headline = shootoutHeadline(game);
  if (headline) lines.push(headline);
  if (info.length > 0) lines.push(info.join(' · '));
  if (!interim.text) lines.push(kicked ? `${date}, ${fmt({ hour: '2-digit', minute: '2-digit' })} Uhr` : date);

  const shootout = shootoutLines(game, players);
  const body = [...historyLines(game, players), ...shootout.rows];
  if (body.length > 0) lines.push(MONO, ...body, MONO);
  lines.push(...shootout.shooters);
  const scorers = scorersLine(game, players);
  if (scorers) lines.push(...(shootout.shooters.length > 0 ? [''] : []), '*Torschützen*', scorers);
  return lines.join('\n');
}

/** Spec 017 FR-C20: "Ergebnis teilen" war erfolgreich (geteilt oder kopiert). */
export const markShared = (game: Game, at: number): Game => ({ ...game, sharedAt: at });

/**
 * Spec 017 FR-C21: Leiste "Korrigiert. Ergebnis neu teilen?", wenn eine Änderung an einem beendeten, schon geteilten
 * Spiel den Teilen-Text ändert. Vor dem ersten Teilen wäre "neu teilen" irreführend (research.md R-C3).
 */
export function needsReshare(before: Game, after: Game, players: Player[]): boolean {
  if (after.status !== 'finished' || after.sharedAt === undefined) return false;
  return buildShareText(before, players) !== buildShareText(after, players);
}

/** Abschnitt der Vorschau: Zeile (ganz fett oder normal) oder Block in Festbreitenschrift. */
export type ShareBlock = { kind: 'line'; text: string; bold: boolean } | { kind: 'mono'; lines: string[] };

/**
 * FR-S07: zerlegt den Teilen-Text für die Vorschau wie in WhatsApp. Zeilen zwischen ``` werden ein Block in
 * Festbreitenschrift, ganze Zeilen in *…* fett (ohne Sternchen). Ein nicht geschlossener Block läuft bis zum Ende.
 */
export function shareBlocks(text: string): ShareBlock[] {
  const blocks: ShareBlock[] = [];
  let mono: string[] | null = null;
  for (const line of text.split('\n')) {
    if (line === MONO) {
      if (mono) {
        blocks.push({ kind: 'mono', lines: mono });
        mono = null;
      } else mono = [];
    } else if (mono) mono.push(line);
    else {
      const bold = line.length > 2 && line.startsWith('*') && line.endsWith('*');
      blocks.push({ kind: 'line', text: bold ? line.slice(1, -1) : line, bold });
    }
  }
  if (mono) blocks.push({ kind: 'mono', lines: mono });
  return blocks;
}
