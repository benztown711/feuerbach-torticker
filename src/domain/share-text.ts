import { goalRows, homeAway, score, scorerLabel } from './goals';
import { startedAt } from './history';
import type { Game, Player } from './types';

/**
 * Ergebnistext zum Teilen (FR-011, contracts/share-text.md):
 * Heim zuerst, Halbzeitstand nur bei mehreren Abschnitten, eine Zeile je gezähltem Tor.
 */
export function buildShareText(game: Game, players: Player[], timeZone?: string): string {
  const [home, away] = game.venue === 'home' ? [game.ownTeam, game.opponent] : [game.opponent, game.ownTeam];
  const total = homeAway(game.venue, score(game));
  const half =
    game.schema.sections > 1 && game.halfTimeScore
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
  const lines = [`⚽ ${home} - ${away} ${total.home}:${total.away}${half}`, kicked ? `${date}, Anpfiff ${time}` : date];
  for (const row of goalRows(game).reverse()) {
    if (row.removed) continue;
    const who = scorerLabel(row.goal, players);
    lines.push(who ? `${row.label} ${row.score} ${who}` : `${row.label} ${row.score}`);
  }
  return lines.join('\n');
}
