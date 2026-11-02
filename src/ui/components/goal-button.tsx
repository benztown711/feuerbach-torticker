import { getColor, needsBorder } from '../../domain/jersey-colors';

interface Props {
  testId: string;
  team: string;
  colorId: string;
  dark: boolean;
  disabled: boolean;
  onGoal: () => void;
}

/** Großer Tor-Knopf in Trikotfarbe (FR-003, FR-016, FR-032). Farben kommen aus design/trikot-farben.json. */
export function GoalButton({ testId, team, colorId, dark, disabled, onGoal }: Props) {
  const color = getColor(colorId, true);
  const bordered = needsBorder(colorId, dark ? 'dark' : 'light');
  return (
    <button
      type="button"
      class={bordered ? 'goal-button goal-button--bordered' : 'goal-button'}
      style={{ background: color.value, color: color.text }}
      data-testid={testId}
      disabled={disabled}
      onClick={onGoal}
    >
      <span class="goal-button__tor">TOR</span>
      <span class="goal-button__team">{team}</span>
    </button>
  );
}
