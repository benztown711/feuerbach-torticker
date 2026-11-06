import { useEffect, useState } from 'preact/hooks';
import { filterGames, groupByMonth, historyEntry, startedAt, teamFilters } from '../../domain/history';
import {
  allSelected,
  countLabel,
  isSelectable,
  pruneSelection,
  toggleAll,
  toggleSelected,
} from '../../domain/history-select';
import type { Game } from '../../domain/types';
import { listGames, onGameWrite } from '../../platform/db';
import { currentTrash, finalizeTrash, onTrashChange, trashGames, trashedIds, undoTrash } from '../../platform/trash';
import { Confirm } from '../components/confirm';

const fmtDate = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
const fmtTime = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

const NO_SELECTION: ReadonlySet<string> = new Set();

function RowContent({ game }: { game: Game }) {
  const e = historyEntry(game);
  const at = startedAt(game);
  return (
    <>
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
        <span class={`history__result history__result--${e.result.toLowerCase()}`} title={RESULT_TEXT[e.result]}>
          {e.result}
        </span>
      ) : (
        <span
          class={e.openLabel === 'läuft' ? 'history__live' : 'history__live history__live--created'}
          data-testid={`history-open-${game.id}`}
        >
          {e.openLabel}
        </span>
      )}
    </>
  );
}

/**
 * Historie (FR-022, FR-038): neueste zuerst, Ergebnis aus Feuerbach-Sicht, Filter nach eigener Mannschaft; je Monat
 * eine Karte (Spec 011 FR-G09). Spec 014: "Auswählen" mit Häkchen je Zeile, "Alle auswählen", "Löschen (n)" und
 * danach 10 Sekunden "Rückgängig" (FR-D01 bis FR-D10).
 */
export function HistoryScreen() {
  const [games, setGames] = useState<Game[] | undefined>(undefined);
  const [filter, setFilter] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(NO_SELECTION);
  const [askDelete, setAskDelete] = useState(false);
  const [, setTrashVersion] = useState(0);
  useEffect(() => {
    void listGames().then(setGames);
    const offTrash = onTrashChange(() => setTrashVersion((v) => v + 1));
    // Endgültig gelöschte Spiele verlassen auch die geladene Liste.
    const offWrite = onGameWrite((c) => {
      if (c.kind === 'delete') setGames((list) => list?.filter((g) => g.id !== c.id));
    });
    return () => {
      offTrash();
      offWrite();
      // FR-D08: Wer die Historie verlässt, löscht endgültig.
      void finalizeTrash();
    };
  }, []);
  if (games === undefined) return <main class="page" aria-busy="true" />;

  const hidden = trashedIds();
  const kept = games.filter((g) => !hidden.has(g.id));
  const filters = teamFilters(kept);
  const activeFilter = filters.some((f) => f.key === filter) ? filter : null;
  const shown = filterGames(kept, activeFilter);
  const canSelect = shown.some(isSelectable);
  const trash = currentTrash();

  const chooseFilter = (key: string | null): void => {
    setFilter(key);
    setSelected(pruneSelection(filterGames(kept, key), selected));
  };
  const endSelecting = (): void => {
    setSelecting(false);
    setSelected(NO_SELECTION);
  };
  const doDelete = (): void => {
    const ids = shown.filter((g) => selected.has(g.id)).map((g) => g.id);
    setAskDelete(false);
    endSelecting();
    void trashGames(ids);
  };
  const n = selected.size;

  return (
    <main
      class={`page${selecting ? ' history-page--select' : ''}${trash ? ' history-page--undo' : ''}`}
      data-testid="history-page"
    >
      <header class="topbar">
        <h1 class="topbar__title t-zwischentitel">Historie</h1>
        <span class="topbar__meta" data-testid="history-meta">
          {selecting ? `${n} ausgewählt` : countLabel(kept.length)}
        </span>
        {(selecting || canSelect) && (
          <button
            type="button"
            class="btn btn--secondary btn--small history__mode"
            data-testid="history-select"
            onClick={() => (selecting ? endSelecting() : setSelecting(true))}
          >
            {selecting ? 'Fertig' : 'Auswählen'}
          </button>
        )}
      </header>
      {filters.length > 0 && (
        <div class="chips history__filters" role="group" aria-label="Nach Mannschaft filtern">
          <button
            type="button"
            class="chip"
            aria-pressed={activeFilter === null}
            data-testid="history-filter-all"
            onClick={() => chooseFilter(null)}
          >
            Alle
          </button>
          {filters.map((f, i) => (
            <button
              key={f.key}
              type="button"
              class="chip"
              aria-pressed={activeFilter === f.key}
              data-testid={`history-filter-${i}`}
              onClick={() => chooseFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      {selecting && shown.some((g) => !isSelectable(g)) && (
        <p class="history__hint" data-testid="history-select-hint">
          Nur beendete Spiele lassen sich auswählen. Laufende löschst du in den Spieldetails.
        </p>
      )}
      {shown.length === 0 ? (
        <p class="history__empty" data-testid="history-empty">
          Noch keine Spiele. Ein neues Spiel startest du über „Spiel“.
        </p>
      ) : (
        <div class="history-months" data-testid="history-list">
          {groupByMonth(shown).map((m, i) => (
            <section key={`${i}-${m.key}`} class="card card--list" aria-labelledby={`month-${i}`}>
              <h2 id={`month-${i}`} class="t-label card__title">
                {m.label.toUpperCase()}
              </h2>
              <ul class="history">
                {m.games.map((game) => {
                  if (!selecting)
                    return (
                      <li key={game.id}>
                        <a
                          class="history__item"
                          href={`#/spiel/${game.id}/details`}
                          data-testid={`history-item-${game.id}`}
                        >
                          <RowContent game={game} />
                        </a>
                      </li>
                    );
                  const ok = isSelectable(game);
                  const name = `Spiel gegen ${game.opponent} vom ${fmtDate.format(startedAt(game))}`;
                  return (
                    <li key={game.id}>
                      <button
                        type="button"
                        role="checkbox"
                        class="history__item history__item--select"
                        aria-checked={ok && selected.has(game.id)}
                        aria-disabled={ok ? undefined : true}
                        aria-label={ok ? name : `${name}, ${historyEntry(game).openLabel}, nicht auswählbar`}
                        data-testid={`history-item-${game.id}`}
                        onClick={() => setSelected(toggleSelected(selected, game))}
                      >
                        <span class={ok ? 'history__check' : 'history__check history__check--none'} aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" class="icon history__tick">
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        </span>
                        <RowContent game={game} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p class="history__legend">Ergebnis aus Feuerbach-Sicht · S/U/N = Sieg/Unentschieden/Niederlage</p>
      {trash && (
        <div class="undo-bar history__undo" data-testid="history-undo" role="status">
          <span class="undo-bar__text">{countLabel(trash.ids.length)} gelöscht</span>
          <button
            type="button"
            class="btn btn--secondary btn--small"
            data-testid="btn-history-undo"
            onClick={undoTrash}
          >
            Rückgängig
          </button>
        </div>
      )}
      {selecting && (
        <div class="history__actions" data-testid="history-actions">
          <div class="history__actions-inner">
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="history-select-all"
              disabled={!canSelect}
              onClick={() => setSelected(toggleAll(shown, selected))}
            >
              {allSelected(shown, selected) ? 'Alle abwählen' : 'Alle auswählen'}
            </button>
            <button
              type="button"
              class="btn btn--primary"
              data-testid="history-delete"
              disabled={n === 0}
              onClick={() => setAskDelete(true)}
            >
              Löschen ({n})
            </button>
          </div>
        </div>
      )}
      {askDelete && (
        <Confirm
          title={`${countLabel(n)} löschen?`}
          text={`${n === 1 ? 'Es verschwindet' : 'Sie verschwinden'} aus der Historie. Du kannst das gleich danach rückgängig machen, später nur über eine Sicherung.`}
          yesLabel="Löschen"
          onNo={() => setAskDelete(false)}
          onYes={doDelete}
        />
      )}
    </main>
  );
}

const RESULT_TEXT = { S: 'Sieg', U: 'Unentschieden', N: 'Niederlage' } as const;
