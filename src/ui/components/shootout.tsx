import { useState } from 'preact/hooks';
import { shootoutState } from '../../domain/cup';
import { personLabel } from '../../domain/events';
import { homeAway, score } from '../../domain/goals';
import { getColor, needsBorder } from '../../domain/jersey-colors';
import { otherPlayers, squadPlayers } from '../../domain/roster';
import type { EventPerson, Game, Player, Shot, Side } from '../../domain/types';

interface Props {
  game: Game;
  players: Player[];
  ownName: string;
  dark: boolean;
  onShot: (hit: boolean, who: EventPerson) => void;
  onUndo: () => void;
  onEnd: () => void;
}

function Check({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" class="icon">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}
function Cross({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" class="icon">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Kreise wie im Fernsehen: mind. 5, bei vielen Runden die letzten 6. */
const VISIBLE = 6;

/**
 * Spec 003 FR-P03: Elfmeterschießen. Übersicht je Mannschaft als Kreise (Treffer/verschossen),
 * Schützen aufklappbar in Schussreihenfolge; eigener Schütze vor dem Schuss im Aufgebot antippen.
 */
export function ShootoutView({ game, players, ownName, dark, onShot, onUndo, onEnd }: Props) {
  const [pick, setPick] = useState<string | null>(null);
  const [oppText, setOppText] = useState('');
  const [open, setOpen] = useState<Side | null>(null);
  const [others, setOthers] = useState(false);
  const so = game.shootout;
  if (!so) return null;
  const st = shootoutState(game);
  const list = (side: Side): Shot[] => so.shots.filter((s) => s.side === side);
  const name = (side: Side): string => (side === 'own' ? ownName : game.opponent);
  const color = (side: Side): string => (side === 'own' ? game.ownColor : game.oppColor);
  const [homeSide, awaySide]: [Side, Side] = game.venue === 'home' ? ['own', 'opp'] : ['opp', 'own'];
  const ha = homeAway(game.venue, { own: st.own, opp: st.opp });
  const regular = homeAway(game.venue, score(game));
  const nv = game.schema.extraMinutes ? ' n. V.' : '';

  const lengths = [list('own').length, list('opp').length];
  let cols = Math.max(5, ...lengths);
  if (!st.decided && list(st.next).length >= cols) cols = list(st.next).length + 1;
  const from = Math.max(0, cols - VISIBLE);

  const row = (side: Side) => {
    const shots = list(side);
    const isOpen = open === side;
    const count = side === 'own' ? st.own : st.opp;
    return (
      <>
        <button
          type="button"
          class="pen-team"
          aria-expanded={isOpen}
          data-testid={`pen-row-${side}`}
          onClick={() => setOpen(isOpen ? null : side)}
        >
          <span class="pen-team__name">
            <span class="team__mark" style={{ background: getColor(color(side), true).value }} aria-hidden="true" />
            <span>{name(side)}</span>
          </span>
          <span class="pen-slots">
            {from > 0 && (
              <span class="pen-more" aria-hidden="true">
                …
              </span>
            )}
            {Array.from({ length: cols - from }, (_, k) => {
              const i = from + k;
              const s = shots[i];
              const next = !st.decided && st.next === side && i === shots.length;
              const cls = s ? (s.hit ? 'pen-slot is-hit' : 'pen-slot is-miss') : next ? 'pen-slot is-next' : 'pen-slot';
              const label = s ? `${i + 1}. Schuss: ${s.hit ? 'Treffer' : 'verschossen'}` : `${i + 1}. Schuss: offen`;
              return (
                <span key={i} class={cls}>
                  <span class="visually-hidden">{label}</span>
                  {s && (s.hit ? <Check /> : <Cross />)}
                </span>
              );
            })}
          </span>
          <span class="pen-team__count">{count}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="icon">
            <path d={isOpen ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
          </svg>
        </button>
        {isOpen && (
          <div class="pen-chips" data-testid={`pen-shooters-${side}`}>
            {shots.length === 0 && <span class="pen-pick__hint">Noch kein Schuss.</span>}
            {shots.map((s, i) => (
              <span key={i} class={s.hit ? 'pen-chip' : 'pen-chip is-miss'}>
                {personLabel(s.who, players)}
                {s.hit ? <Check /> : <Cross />}
                <span class="visually-hidden">{s.hit ? 'Treffer' : 'verschossen'}</span>
              </span>
            ))}
          </div>
        )}
      </>
    );
  };

  const squad = squadPlayers(players, game.squad);
  const rest = otherPlayers(players, game.squad);
  const done = new Set(list('own').flatMap((s) => (s.who?.kind === 'player' ? [s.who.playerId] : [])));
  const nextC = getColor(color(st.next), true);
  const shoot = (hit: boolean): void => {
    const who: EventPerson =
      st.next === 'own'
        ? pick
          ? { kind: 'player', playerId: pick }
          : null
        : oppText.trim()
          ? { kind: 'text', text: oppText }
          : null;
    onShot(hit, who);
    setPick(null);
    setOppText('');
  };
  const winner = st.winner ? name(st.winner) : '';

  return (
    <>
      <div class="score" data-testid="pen-score">{`${ha.home} : ${ha.away}`}</div>
      <p class="pen-caption" data-testid="pen-caption">
        Elfmeterschießen · nach {regular.home}:{regular.away}
        {nv}
      </p>
      <section class="controls">
        <button
          type="button"
          class="btn btn--secondary"
          data-testid="pen-undo"
          disabled={so.shots.length === 0}
          onClick={onUndo}
        >
          Rückgängig
        </button>
        <button
          type="button"
          class={st.decided ? 'btn btn--primary' : 'btn btn--secondary'}
          data-testid="pen-end"
          onClick={onEnd}
        >
          Elfmeterschießen beenden
        </button>
      </section>
      <section class="pen-series" aria-label="Schüsse">
        {row(homeSide)}
        {row(awaySide)}
      </section>
      <section class="pen-pick" aria-label="Schütze">
        {st.decided ? (
          <p class="pen-done" role="status" data-testid="pen-decided">
            Entschieden: {winner} gewinnt {st.winner === 'own' ? `${st.own}:${st.opp}` : `${st.opp}:${st.own}`} im
            Elfmeterschießen.
          </p>
        ) : st.next === 'own' ? (
          <>
            <p class="t-label pen-turn__label">DRAN: {name('own').toUpperCase()} · SCHÜTZE ANTIPPEN</p>
            <div class="scorer__grid scorer__grid--5">
              {(others ? [...squad, ...rest] : squad).map((pl) => (
                <button
                  type="button"
                  key={pl.id}
                  class={done.has(pl.id) ? 'scorer__option is-done' : 'scorer__option'}
                  aria-pressed={pick === pl.id}
                  data-testid={`pen-pick-${pl.id}`}
                  onClick={() => setPick(pick === pl.id ? null : pl.id)}
                >
                  {pl.number !== null && <span class="scorer__number">{pl.number}</span>}
                  {pl.name}
                </button>
              ))}
            </div>
            {!others && rest.length > 0 && (
              <button type="button" class="btn btn--quiet btn--small" onClick={() => setOthers(true)}>
                Andere …
              </button>
            )}
            <p class="pen-pick__hint">
              Hellgrau: hat schon geschossen. Ohne Auswahl wird der Schuss ohne Namen gespeichert.
            </p>
          </>
        ) : (
          <>
            <p class="t-label pen-turn__label">DRAN: {name('opp').toUpperCase()}</p>
            <input
              class="input"
              data-testid="pen-opp"
              value={oppText}
              maxLength={30}
              autocomplete="off"
              aria-label="Schütze des Gegners"
              placeholder="Schütze (freiwillig), z. B. Nr. 7"
              onInput={(e) => setOppText(e.currentTarget.value)}
            />
          </>
        )}
      </section>
      <section class="pen-buttons" aria-label="Elfmeter erfassen">
        <button
          type="button"
          class={needsBorder(nextC.id, dark ? 'dark' : 'light') ? 'pen-button goal-button--bordered' : 'pen-button'}
          style={{ background: nextC.value, color: nextC.text }}
          data-testid="pen-hit"
          disabled={st.decided}
          onClick={() => shoot(true)}
        >
          <Check size={28} />
          Treffer
        </button>
        <button
          type="button"
          class="pen-button pen-button--miss"
          data-testid="pen-miss"
          disabled={st.decided}
          onClick={() => shoot(false)}
        >
          <Cross size={28} />
          Verschossen
        </button>
      </section>
    </>
  );
}
