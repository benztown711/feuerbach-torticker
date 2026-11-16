import { TeamMark } from './team-mark';

interface Props {
  homeName: string;
  awayName: string;
  homeColor: string;
  awayColor: string;
  /** Spielstand "2 : 1" (Heim links). */
  score: string;
  /** Vor dem Anpfiff: "Heim und Gast tauschen" (Doppelpfeil unter dem Spielstand). */
  onSwap?: () => void;
}

/**
 * Spec 019 US2 (FR-A10 bis FR-A13): Anzeigetafel-Zeile mit Farbmarke und Name links, Spielstand in der Mitte,
 * Name und Farbmarke rechts. Namen brechen nach FR-040 um, der Spielstand nie.
 */
export function Scoreboard({ homeName, awayName, homeColor, awayColor, score, onSwap }: Props) {
  return (
    <section class="scoreboard" aria-label="Spielstand">
      <div class="team scoreboard__home">
        <TeamMark colorId={homeColor} />
        <span class="team__name" data-testid="team-home">
          {homeName}
        </span>
      </div>
      <div class="score" data-testid="score">
        {score}
      </div>
      <div class="team team--away scoreboard__away">
        <span class="team__name" data-testid="team-away">
          {awayName}
        </span>
        <TeamMark colorId={awayColor} />
      </div>
      {onSwap && (
        <button
          type="button"
          class="icon-btn scoreboard__swap"
          aria-label="Heim und Gast tauschen"
          data-testid="btn-swap-venue"
          onClick={onSwap}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" class="icon">
            <path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" />
          </svg>
        </button>
      )}
    </section>
  );
}
