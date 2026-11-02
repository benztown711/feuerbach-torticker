import { goalRows } from '../../domain/goals';
import type { Game, Goal } from '../../domain/types';

interface Props {
  game: Game;
  ownName: string;
  onOpen: (goal: Goal) => void;
}

/** Alle Tore, neuestes oben, in sich scrollbar (FR-034); entfernte durchgestrichen (FR-008). */
export function GoalList({ game, ownName, onOpen }: Props) {
  const rows = goalRows(game);
  return (
    <section class="goal-list" aria-label="Torliste" data-testid="goal-list">
      {rows.length === 0 && <p class="goal-list__empty">Noch keine Tore.</p>}
      {rows.map((r) => (
        <button
          type="button"
          key={r.goal.id}
          class={r.removed ? 'goal-row goal-row--removed' : 'goal-row'}
          data-testid={`goal-row-${r.goal.id}`}
          onClick={() => onOpen(r.goal)}
        >
          <span class="goal-row__minute">{r.label}</span>
          <span class="goal-row__score">{r.score}</span>
          <span class="goal-row__team">{r.goal.side === 'own' ? ownName : game.opponent}</span>
          {r.removed && <span class="goal-row__tag">entfernt</span>}
        </button>
      ))}
    </section>
  );
}
