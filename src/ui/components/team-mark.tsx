import { getColor } from '../../domain/jersey-colors';

/** Farbmarke einer Mannschaft in ihrer Trikotfarbe (Spielbildschirm, Spieldetails, "Tor nachtragen"). */
export function TeamMark({ colorId, testId }: { colorId: string; testId?: string }) {
  return (
    <span
      class="team__mark"
      style={{ background: getColor(colorId, true).value }}
      aria-hidden="true"
      {...(testId ? { 'data-testid': testId } : {})}
    />
  );
}
