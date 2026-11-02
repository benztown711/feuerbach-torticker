import { useEffect, useState } from 'preact/hooks';
import { formatTime } from '../../domain/format';
import { sectionLabel } from '../../domain/game';
import { goalRows, homeAway, score, scorerLabel } from '../../domain/goals';
import { shortTeamName } from '../../domain/team-name';
import type { ClockEvent, Game, Player } from '../../domain/types';
import { getGame, getPlayers } from '../../platform/db';
import { navigate } from '../router';

const eventText = (e: ClockEvent, game: Game): string => {
  const sec = sectionLabel(e.section, game.schema.sections);
  switch (e.type) {
    case 'kickoff':
      return `Anpfiff ${sec}`;
    case 'pause':
      return 'Uhr angehalten';
    case 'resume':
      return 'Uhr fortgesetzt';
    case 'sectionEnd':
      return `Pausenpfiff ${sec}`;
    case 'fullTime':
      return 'Schlusspfiff';
    case 'reset':
      return `Uhr zurückgesetzt (${sec})`;
  }
};

/** Spieldetails (FR-022): alle Tore mit Minute und Uhrzeit, Uhr-Ereignisse mit Uhrzeit. */
export function GameDetailsScreen({ id }: { id: string }) {
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [players, setPlayers] = useState<Player[]>([]);
  useEffect(() => {
    void getGame(id).then((g) => setGame(g ?? null));
    void getPlayers().then(setPlayers);
  }, [id]);
  if (game === undefined) return <main class="page" aria-busy="true" />;
  if (game === null) {
    return (
      <main class="page">
        <p class="t-text">Dieses Spiel gibt es nicht mehr.</p>
      </main>
    );
  }
  const ha = homeAway(game.venue, score(game));
  const [home, away] = game.venue === 'home' ? [game.ownTeam, game.opponent] : [game.opponent, game.ownTeam];
  return (
    <main class="page">
      <header class="topbar">
        <button
          type="button"
          class="icon-btn"
          aria-label="Zurück zum Spiel"
          onClick={() => navigate(`/spiel/${game.id}`)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 class="topbar__title t-zwischentitel">Spieldetails</h1>
      </header>
      <div class="details">
        <p class="details__match t-text">
          {home} gegen {away}
        </p>
        <p class="details__score">{`${ha.home} : ${ha.away}`}</p>
        <p class="details__meta">{new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(game.createdAt)}</p>

        <h2 class="details__heading t-label">TORE</h2>
        <ul class="details__list" data-testid="details-goals">
          {goalRows(game).map((r) => (
            <li key={r.goal.id} class={r.removed ? 'details__item details__item--removed' : 'details__item'}>
              <span class="details__minute">{r.label}</span>
              <span>
                {r.goal.side === 'own' ? shortTeamName(game.ownTeam) : game.opponent}
                {r.goal.scorer && `, ${scorerLabel(r.goal, players)}`}
              </span>
              <span class="details__time">{formatTime(r.goal.at)}</span>
              {r.removed && <span class="goal-row__tag">entfernt</span>}
            </li>
          ))}
          {game.goals.length === 0 && <li class="details__item">Noch keine Tore.</li>}
        </ul>

        <h2 class="details__heading t-label">UHR</h2>
        <ul class="details__list" data-testid="clock-events">
          {game.clockEvents.map((e, i) => (
            <li key={i} class="details__item">
              <span>{eventText(e, game)}</span>
              <span class="details__time">{formatTime(e.at)}</span>
            </li>
          ))}
          {game.clockEvents.length === 0 && <li class="details__item">Noch nicht angepfiffen.</li>}
        </ul>
      </div>
    </main>
  );
}
