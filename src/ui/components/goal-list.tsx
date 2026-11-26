import { cardText, subText } from '../../domain/events';
import { useState } from 'preact/hooks';
import { goalRows, goalWho, preGroup, type GoalRow } from '../../domain/goals';
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

/** Spec 021 FR-W20: Pfeil am Zeilenende zeigt, dass sich die Zeile antippen lässt (für Screenreader verborgen). */
function Chevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      class={open ? 'icon goal-row__chev goal-row__chev--open' : 'icon goal-row__chev'}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

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
      {onOpen && <Chevron />}
    </button>
  );
}

/** Tore und Ereignisse, neuestes oben, in sich scrollbar (FR-034, FR-E06); entfernte Tore durchgestrichen (FR-008). */
function GoalButton({
  game,
  row,
  players,
  onOpen,
  sub = false,
}: {
  game: Game;
  row: GoalRow;
  players: Player[];
  onOpen: (goal: Goal) => void;
  sub?: boolean;
}) {
  const cls = `goal-row${row.removed ? ' goal-row--removed' : ''}${sub ? ' goal-row--sub' : ''}`;
  return (
    <button type="button" class={cls} data-testid={`goal-row-${row.goal.id}`} onClick={() => onOpen(row.goal)}>
      <span class="goal-row__minute">{row.label}</span>
      <span class="goal-row__score">{row.score}</span>
      {/* Spec 009 FR-V11: mit Torschütze ohne Mannschaftsnamen, z. B. "Max (Vorlage: Ben)". */}
      <span class="goal-row__team">{goalWho(game, row.goal, players)}</span>
      {row.removed && <span class="goal-row__tag">entfernt</span>}
      <Chevron />
    </button>
  );
}

/** Spec 023 FR-J16: "Vor Tickerbeginn · 11 Tore", ein Tor bzw. mehrere. */
export const preText = (count: number): string => `Vor Tickerbeginn · ${count} ${count === 1 ? 'Tor' : 'Tore'}`;

export function GoalList({ game, players, onOpen, events = [], onOpenEvent }: Props) {
  const [preOpen, setPreOpen] = useState(false);
  const rows = goalRows(game);
  // Spec 023 FR-J16: Tore vor Tickerbeginn stehen als eine Zeile ganz unten und klappen auf.
  const pre = preGroup(rows);
  const items: Item[] = [
    ...rows.filter((row) => !row.beforeTicker).map((row) => ({ at: row.goal.at, row })),
    ...events.map((ev) => ({ at: ev.at, ev })),
  ].sort((a, b) => b.at - a.at);
  return (
    <section class="goal-list" aria-label="Torliste" data-testid="goal-list">
      {items.length === 0 && !pre && <p class="goal-list__empty">Noch keine Tore.</p>}
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
          <GoalButton key={it.row.goal.id} game={game} row={it.row} players={players} onOpen={onOpen} />
        ),
      )}
      {pre && (
        <>
          <button
            type="button"
            class="goal-row goal-row--pre"
            data-testid="goal-pre-row"
            aria-expanded={preOpen}
            onClick={() => setPreOpen(!preOpen)}
          >
            <span class="goal-row__minute">–</span>
            <span class="goal-row__score">{pre.score}</span>
            <span class="goal-row__team">{preText(pre.count)}</span>
            <Chevron open={preOpen} />
          </button>
          {preOpen &&
            pre.rows.map((row) => (
              <GoalButton key={row.goal.id} game={game} row={row} players={players} onOpen={onOpen} sub />
            ))}
        </>
      )}
    </section>
  );
}
