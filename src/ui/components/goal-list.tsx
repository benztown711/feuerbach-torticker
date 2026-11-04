import { cardText, subText } from '../../domain/events';
import { goalRows, goalWho, type GoalRow } from '../../domain/goals';
import { formatMinute } from '../../domain/minute';
import type { Game, GameEvent, Goal, Player } from '../../domain/types';
import { BookmarkIcon, CardGlyph, SubIcon } from './event-icons';

export { BookmarkIcon } from './event-icons';

interface Props {
  game: Game;
  players: Player[];
  onOpen: (goal: Goal) => void;
  /** Spec 003 FR-E06: Lesezeichen, Karten und Wechsel erscheinen mit in der Liste. */
  events?: GameEvent[];
  onOpenEvent?: (ev: GameEvent) => void;
}

type Item = { at: number; row: GoalRow; ev?: undefined } | { at: number; ev: GameEvent; row?: undefined };

function EventRow({
  game,
  ev,
  players,
  onOpen,
}: {
  game: Game;
  ev: GameEvent;
  players: Player[];
  onOpen?: (ev: GameEvent) => void;
}) {
  const icon = ev.kind === 'mark' ? <BookmarkIcon /> : ev.kind === 'card' ? <CardGlyph card={ev.card} /> : <SubIcon />;
  const text =
    ev.kind === 'mark'
      ? ev.comment || 'Lesezeichen'
      : ev.kind === 'card'
        ? cardText(game, ev, players)
        : subText(ev, players);
  return (
    <button
      type="button"
      class={`goal-row goal-row--event goal-row--${ev.kind}`}
      data-testid={`${ev.kind === 'mark' ? 'mark' : 'event'}-row-${ev.id}`}
      onClick={() => onOpen?.(ev)}
    >
      <span class="goal-row__minute">{formatMinute(ev.minute, ev.stoppage)}</span>
      <span class="goal-row__score">{icon}</span>
      <span class="goal-row__team">{text}</span>
      {ev.kind === 'mark' && <span class="goal-row__tag goal-row__tag--private">nur für dich</span>}
    </button>
  );
}

/** Tore und Ereignisse, neuestes oben, in sich scrollbar (FR-034, FR-E06); entfernte Tore durchgestrichen (FR-008). */
export function GoalList({ game, players, onOpen, events = [], onOpenEvent }: Props) {
  const items: Item[] = [
    ...goalRows(game).map((row) => ({ at: row.goal.at, row })),
    ...events.map((ev) => ({ at: ev.at, ev })),
  ].sort((a, b) => b.at - a.at);
  return (
    <section class="goal-list" aria-label="Torliste" data-testid="goal-list">
      {items.length === 0 && <p class="goal-list__empty">Noch keine Tore.</p>}
      {items.map((it) =>
        it.ev ? (
          <EventRow
            key={it.ev.id}
            game={game}
            ev={it.ev}
            players={players}
            {...(onOpenEvent ? { onOpen: onOpenEvent } : {})}
          />
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
            {/* Spec 009 FR-V11: mit Torschütze ohne Mannschaftsnamen, z. B. "Max (Vorlage: Ben)". */}
            <span class="goal-row__team">{goalWho(game, it.row.goal, players)}</span>
            {it.row.removed && <span class="goal-row__tag">entfernt</span>}
          </button>
        ),
      )}
    </section>
  );
}
