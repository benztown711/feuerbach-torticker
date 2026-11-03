import { useEffect, useState } from 'preact/hooks';
import { filterGames, historyEntry, startedAt, teamFilters } from '../../domain/history';
import type { Game } from '../../domain/types';
import { listGames } from '../../platform/db';

const fmtDate = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
const fmtTime = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

/** Historie (FR-022, FR-038): neueste zuerst, Ergebnis aus Feuerbach-Sicht, Filter nach eigener Mannschaft. */
export function HistoryScreen() {
  const [games, setGames] = useState<Game[] | undefined>(undefined);
  const [filter, setFilter] = useState<string | null>(null);
  useEffect(() => {
    void listGames().then(setGames);
  }, []);
  if (games === undefined) return <main class="page" aria-busy="true" />;

  const filters = teamFilters(games);
  const shown = filterGames(games, filters.some((f) => f.key === filter) ? filter : null);
  return (
    <main class="page">
      <header class="topbar">
        <h1 class="topbar__title t-zwischentitel">Historie</h1>
        <span class="topbar__meta">{games.length === 1 ? '1 Spiel' : `${games.length} Spiele`}</span>
      </header>
      {filters.length > 0 && (
        <div class="chips history__filters" role="group" aria-label="Nach Mannschaft filtern">
          <button
            type="button"
            class="chip"
            aria-pressed={filter === null}
            data-testid="history-filter-all"
            onClick={() => setFilter(null)}
          >
            Alle
          </button>
          {filters.map((f, i) => (
            <button
              key={f.key}
              type="button"
              class="chip"
              aria-pressed={filter === f.key}
              data-testid={`history-filter-${i}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p class="history__empty" data-testid="history-empty">
          Noch keine Spiele. Ein neues Spiel startest du über „Spiel“.
        </p>
      ) : (
        <ul class="history" data-testid="history-list">
          {shown.map((game) => {
            const e = historyEntry(game);
            const at = startedAt(game);
            return (
              <li key={game.id}>
                <a class="history__item" href={`#/spiel/${game.id}/details`} data-testid={`history-item-${game.id}`}>
                  <span class="history__when">
                    <span class="history__date">{fmtDate.format(at)}</span>
                    <span class="history__time">{fmtTime.format(at)}</span>
                  </span>
                  <span class="history__match">
                    <span class="history__opp">{game.opponent}</span>
                    <span class="history__meta">
                      {e.teamShort} · {e.venueLabel}
                    </span>
                  </span>
                  <span class="history__score" data-testid={`history-score-${game.id}`}>
                    {e.scoreText}
                  </span>
                  {e.result ? (
                    <span
                      class={`history__result history__result--${e.result.toLowerCase()}`}
                      title={RESULT_TEXT[e.result]}
                    >
                      {e.result}
                    </span>
                  ) : (
                    <span class="history__live">läuft</span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <p class="history__legend">Ergebnis aus Feuerbach-Sicht · S/U/N = Sieg/Unentschieden/Niederlage</p>
    </main>
  );
}

const RESULT_TEXT = { S: 'Sieg', U: 'Unentschieden', N: 'Niederlage' } as const;
