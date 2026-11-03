import { clockOf } from './game';
import { goalRows, goalSuffix, homeAway, score, scorerLabel } from './goals';
import { shootoutState } from './cup';
import { eventsShareLines } from './events';
import { startedAt } from './history';
import { formatMinute } from './minute';
import type { Game, Player } from './types';

/** FR-042: Zusatz für den Zwischenstand; leer vor dem Anpfiff und nach dem Schlusspfiff. */
function interimSuffix(game: Game, now: number): { text: string; atHalf: boolean } {
  const c = clockOf(game, now);
  if (c.status === 'running' || c.status === 'paused')
    return { text: ` · Zwischenstand ${formatMinute(c.minute, c.stoppage)}`, atHalf: false };
  if (c.status === 'break') {
    // Pause nach dem ersten Abschnitt: Halbzeitstand entspricht dem Spielstand und entfällt.
    const atHalf = c.kickoffSection === 2;
    if (c.kickoffSection === game.schema.sections + 1) return { text: ' · vor der Verlängerung', atHalf };
    return { text: game.schema.sections === 2 && atHalf ? ' · Halbzeit' : ' · Pause', atHalf };
  }
  return { text: '', atHalf: false };
}

/**
 * Ergebnistext zum Teilen (FR-011, contracts/share-text.md):
 * Heim zuerst, Halbzeitstand nur bei mehreren Abschnitten, eine Zeile je gezähltem Tor.
 * Mit `now` als Zwischenstand während des Spiels (FR-042).
 */
export function buildShareText(game: Game, players: Player[], timeZone?: string, now?: number): string {
  const [home, away] = game.venue === 'home' ? [game.ownTeam, game.opponent] : [game.opponent, game.ownTeam];
  const total = homeAway(game.venue, score(game));
  const interimInfo = now === undefined ? { text: '', atHalf: false } : interimSuffix(game, now);
  const interim = interimInfo.text;
  const half =
    !interimInfo.atHalf && game.schema.sections > 1 && game.halfTimeScore
      ? (() => {
          const h = homeAway(game.venue, game.halfTimeScore);
          return ` (${h.home}:${h.away})`;
        })()
      : '';
  const tz = timeZone ? { timeZone } : {};
  const kicked = game.clockEvents.some((e) => e.type === 'kickoff');
  const at = startedAt(game);
  const date = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', ...tz }).format(
    at,
  );
  const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', ...tz }).format(at);
  // FR-P02/FR-P03: "n. V." nach Verlängerung, "x:y i. E." nach beendetem Elfmeterschießen (Heim zuerst).
  const extra = game.clockEvents.some((e) => e.type === 'fullTime' && e.section > game.schema.sections) ? ' n. V.' : '';
  const pens = (() => {
    if (!game.shootout?.done) return '';
    const st = shootoutState(game);
    const p = homeAway(game.venue, { own: st.own, opp: st.opp });
    return `, ${p.home}:${p.away} i. E.`;
  })();
  const lines = [
    `⚽ ${home} - ${away} ${total.home}:${total.away}${extra}${half}${pens}${interim}`,
    kicked ? `${date}, Anpfiff ${time}` : date,
  ];
  for (const row of goalRows(game).reverse()) {
    if (row.removed) continue;
    const who = scorerLabel(row.goal, players);
    lines.push((who ? `${row.label} ${row.score} ${who}` : `${row.label} ${row.score}`) + goalSuffix(row.goal));
  }
  return [...lines, ...eventsShareLines(game, players)].join('\n');
}
