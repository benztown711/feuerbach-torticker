import { goalRows, goalSuffix, scorerLabel, type GoalRow } from '../../domain/goals';
import { formatMinute } from '../../domain/minute';
import type { Game, GameEvent, Goal, Player } from '../../domain/types';

interface Props {
  game: Game;
  ownName: string;
  players: Player[];
  onOpen: (goal: Goal) => void;
  /** Spec 003 FR-E06: Lesezeichen erscheinen mit in der Liste. */
  marks?: GameEvent[];
  onOpenMark?: (mark: GameEvent) => void;
}

type Item = { at: number; row: GoalRow; mark?: undefined } | { at: number; mark: GameEvent; row?: undefined };

export function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="icon">
      <path d="M6.5 3.5h11v17l-5.5-4.2-5.5 4.2z" />
    </svg>
  );
}

/** Alle Tore und Lesezeichen, neuestes oben, in sich scrollbar (FR-034, FR-E06); entfernte Tore durchgestrichen (FR-008). */
export function GoalList({ game, ownName, players, onOpen, marks = [], onOpenMark }: Props) {
  const items: Item[] = [
    ...goalRows(game).map((row) => ({ at: row.goal.at, row })),
    ...marks.map((mark) => ({ at: mark.at, mark })),
  ].sort((a, b) => b.at - a.at);
  return (
    <section class="goal-list" aria-label="Torliste" data-testid="goal-list">
      {items.length === 0 && <p class="goal-list__empty">Noch keine Tore.</p>}
      {items.map((it) =>
        it.mark ? (
          <button
            type="button"
            key={it.mark.id}
            class="goal-row goal-row--mark"
            data-testid={`mark-row-${it.mark.id}`}
            onClick={() => onOpenMark?.(it.mark)}
          >
            <span class="goal-row__minute">{formatMinute(it.mark.minute, it.mark.stoppage)}</span>
            <span class="goal-row__score">
              <BookmarkIcon />
            </span>
            <span class="goal-row__team">{it.mark.comment || 'Lesezeichen'}</span>
            <span class="goal-row__tag goal-row__tag--private">nur für dich</span>
          </button>
        ) : (
          <button
            type="button"
            key={it.row.goal.id}
            class={it.row.removed ? 'goal-row goal-row--removed' : 'goal-row'}
            data-testid={`goal-row-${it.row.goal.id}`}
            onClick={() => onOpen(it.row.goal)}
          >
            <span class="goal-row__minute">{it.row.label}</span>
            <span class="goal-row__score">{it.row.score}</span>
            <span class="goal-row__team">
              {it.row.goal.side === 'own' ? ownName : game.opponent}
              {it.row.goal.scorer && `, ${scorerLabel(it.row.goal, players)}`}
              {goalSuffix(it.row.goal)}
            </span>
            {it.row.removed && <span class="goal-row__tag">entfernt</span>}
          </button>
        ),
      )}
    </section>
  );
}
