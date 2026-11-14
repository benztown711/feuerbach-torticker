import { addGoalAt, defaultOption, minuteOptions, setGoalMinute } from '../../domain/corrections';
import { formatTime } from '../../domain/format';
import {
  canHaveAssist,
  goalWho,
  removeGoal,
  restoreGoal,
  scorerLabel,
  scorerPlayerId,
  setAssist,
  setPenalty,
  setScorer,
} from '../../domain/goals';
import { formatMinute } from '../../domain/minute';
import { activePlayers, otherPlayers, squadPlayers } from '../../domain/roster';
import { shortTeamName } from '../../domain/team-name';
import type { Game, Player, Settings, Side } from '../../domain/types';
import { Confirm } from './confirm';
import { ScorerPicker } from './scorer-picker';
import { Sheet } from './sheet';
import { TeamMark } from './team-mark';

/**
 * Spec 017 R-C1: Korrektur-Blätter für Tore, gemeinsam für Spielbildschirm und Spieldetails (Spec 001, 009, 012).
 * Immer höchstens ein Schritt offen; die Seite hält ihn und speichert über `update`.
 */
export type EditStep =
  | { kind: 'goal'; goalId: string }
  | { kind: 'remove'; goalId: string }
  | { kind: 'scorer'; goalId: string }
  | { kind: 'assist'; goalId: string }
  | { kind: 'text'; goalId: string; value: string }
  | { kind: 'minute'; goalId: string; label: string }
  | { kind: 'add'; side: Side; label: string };

/** Spec 012 FR-S10, FR-S11: "Tor nachtragen" mit vorgewählter letzter gespielter Minute, vor dem Anpfiff null. */
export function addGoalStep(game: Game, now: number): EditStep | null {
  const d = defaultOption(game, now);
  return d ? { kind: 'add', side: 'own', label: d.label } : null;
}

/** Spec 012 FR-S11: Auswahl der gespielten Minuten (Wert = Bezeichnung wie "25+1'"). */
function MinuteSelect(p: { id: string; options: { label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div class="field">
      <label class="field__label t-label" for={p.id}>
        MINUTE
      </label>
      <select
        id={p.id}
        class="select"
        data-testid={p.id}
        value={p.value}
        onChange={(e) => p.onChange(e.currentTarget.value)}
      >
        {p.options.map((o) => (
          <option key={o.label} value={o.label}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface Props {
  game: Game;
  players: Player[];
  settings: Settings | null;
  step: EditStep | null;
  onStep: (step: EditStep | null) => void;
  /** Neuester Stand für Handler: schnelle Taps hintereinander dürfen sich nicht überschreiben. */
  cur: () => Game;
  update: (game: Game) => void;
  now: number;
}

export function GoalEditor({ game, players, settings, step, onStep, cur, update, now }: Props) {
  if (!step) return null;
  const goalOf = (id: string) => game.goals.find((g) => g.id === id);
  const close = (): void => onStep(null);
  const [homeSide, awaySide]: [Side, Side] = game.venue === 'home' ? ['own', 'opp'] : ['opp', 'own'];
  const buttonName = (side: Side): string => (side === 'own' ? shortTeamName(game.ownTeam) : game.opponent);
  const colorOf = (side: Side): string => (side === 'own' ? game.ownColor : game.oppColor);

  if (step.kind === 'add') {
    const options = minuteOptions(game, now);
    const save = (): void => {
      const t = Date.now();
      const opt = minuteOptions(cur(), t).find((o) => o.label === step.label);
      if (!opt) return;
      const r = addGoalAt(cur(), step.side, opt, t, () => globalThis.crypto.randomUUID());
      update(r.game);
      // FR-S10: eigenes Tor mit Kader: Torschützen-Auswahl ohne Countdown.
      onStep(step.side === 'own' && activePlayers(players).length > 0 ? { kind: 'scorer', goalId: r.goal.id } : null);
    };
    return (
      <Sheet title="Tor nachtragen" testId="add-goal-sheet" onClose={close}>
        <div class="chips" role="group" aria-label="Mannschaft">
          {[homeSide, awaySide].map((side) => (
            <button
              type="button"
              key={side}
              class="chip chip--wide add-goal__side"
              aria-pressed={step.side === side}
              data-testid={`add-goal-side-${side}`}
              onClick={() => onStep({ ...step, side })}
            >
              <TeamMark colorId={colorOf(side)} />
              {buttonName(side)}
            </button>
          ))}
        </div>
        <MinuteSelect
          id="add-goal-minute"
          options={options}
          value={step.label}
          onChange={(label) => onStep({ ...step, label })}
        />
        <p class="field__help">Nur gespielte Minuten. Die Uhr bleibt, wie sie ist.</p>
        <button type="button" class="btn btn--primary" data-testid="add-goal-save" onClick={save}>
          Eintragen
        </button>
      </Sheet>
    );
  }

  const goal = goalOf(step.goalId);
  if (!goal) return null;

  if (step.kind === 'goal') {
    return (
      <Sheet
        title={`${formatMinute(goal.minute, goal.stoppage)} ${goalWho(game, goal, players)}`}
        subtitle={`erfasst um ${formatTime(goal.at)} Uhr${goal.deletedAt !== null ? ' · entfernt' : ''}`}
        testId="goal-actions"
        onClose={close}
      >
        {goal.deletedAt === null && (
          <div class="chips" role="group" aria-label="Kennzeichen">
            <button
              type="button"
              class="chip"
              aria-pressed={!!goal.penalty}
              data-testid="goal-penalty"
              onClick={() => update(setPenalty(cur(), goal.id, !goal.penalty))}
            >
              Elfmeter
            </button>
          </div>
        )}
        {goal.deletedAt === null ? (
          <button
            type="button"
            class="btn btn--primary"
            data-testid="goal-remove"
            onClick={() => onStep({ kind: 'remove', goalId: goal.id })}
          >
            Tor entfernen
          </button>
        ) : (
          <button
            type="button"
            class="btn btn--primary"
            data-testid="goal-restore"
            onClick={() => {
              update(restoreGoal(cur(), goal.id));
              close();
            }}
          >
            Tor wiederherstellen
          </button>
        )}
        <button
          type="button"
          class="btn btn--secondary"
          data-testid="goal-edit-scorer"
          onClick={() =>
            onStep(
              goal.side === 'own'
                ? { kind: 'scorer', goalId: goal.id }
                : { kind: 'text', goalId: goal.id, value: goal.scorer?.kind === 'text' ? goal.scorer.text : '' },
            )
          }
        >
          Torschütze ändern
        </button>
        {goal.deletedAt === null && (
          <button
            type="button"
            class="btn btn--secondary"
            data-testid="goal-edit-minute"
            onClick={() => onStep({ kind: 'minute', goalId: goal.id, label: formatMinute(goal.minute, goal.stoppage) })}
          >
            Minute ändern
          </button>
        )}
        {settings?.features.assists && goal.deletedAt === null && canHaveAssist(goal) && (
          <button
            type="button"
            class="btn btn--secondary"
            data-testid="goal-edit-assist"
            onClick={() => onStep({ kind: 'assist', goalId: goal.id })}
          >
            Vorlage ändern
          </button>
        )}
      </Sheet>
    );
  }

  if (step.kind === 'remove') {
    return (
      <Confirm
        title="Tor wirklich entfernen?"
        text="Es zählt nicht mehr, bleibt durchgestrichen in der Liste und lässt sich wiederherstellen."
        yesLabel="Entfernen"
        onYes={() => {
          update(removeGoal(cur(), goal.id, Date.now()));
          close();
        }}
        onNo={() => onStep({ kind: 'goal', goalId: goal.id })}
      />
    );
  }

  if (step.kind === 'scorer' || step.kind === 'assist') {
    // Spec 013 FR-K05: Reihenfolge aus den Einstellungen; Spec 009 FR-V02: bei der Vorlage ohne den Torschützen.
    const sort = settings?.rosterSort ?? 'name';
    const notScorer = (p: { id: string }): boolean => step.kind !== 'assist' || scorerPlayerId(goal) !== p.id;
    return (
      <ScorerPicker
        key={step.kind}
        kind={step.kind}
        subtitle={`Tor in Minute ${formatMinute(goal.minute, goal.stoppage)}${
          step.kind === 'assist' ? ` · ${scorerLabel(goal, players)}` : ''
        }`}
        squad={squadPlayers(players, game.squad, sort).filter(notScorer)}
        others={otherPlayers(players, game.squad, sort).filter(notScorer)}
        onPick={(scorer) => {
          update(
            step.kind === 'scorer'
              ? setScorer(cur(), goal.id, scorer)
              : setAssist(cur(), goal.id, scorer?.kind === 'player' ? scorer.playerId : null),
          );
          close();
        }}
        onClose={close}
      />
    );
  }

  if (step.kind === 'text') {
    return (
      <Sheet title="Torschütze Gegner" testId="scorer-text" onClose={close}>
        <form
          class="scorer-text"
          onSubmit={(e) => {
            e.preventDefault();
            update(setScorer(cur(), goal.id, { kind: 'text', text: step.value }));
            close();
          }}
        >
          <label class="visually-hidden" for="scorer-text-input">
            Torschütze des Gegners
          </label>
          <input
            id="scorer-text-input"
            class="input"
            data-testid="scorer-text-input"
            value={step.value}
            maxLength={30}
            autocomplete="off"
            placeholder="Name oder Rückennummer"
            onInput={(e) => onStep({ ...step, value: e.currentTarget.value })}
          />
          <div class="button-row">
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="scorer-text-clear"
              onClick={() => {
                update(setScorer(cur(), goal.id, null));
                close();
              }}
            >
              Ohne Torschütze
            </button>
            <button type="submit" class="btn btn--primary" data-testid="scorer-text-save">
              Speichern
            </button>
          </div>
        </form>
      </Sheet>
    );
  }

  // step.kind === 'minute'
  const save = (): void => {
    const t = Date.now();
    const current = cur().goals.find((g) => g.id === goal.id);
    const opt = minuteOptions(cur(), t).find((o) => o.label === step.label);
    // Unveränderte Minute: nichts tun, damit Tore derselben Minute ihre Reihenfolge behalten.
    const same = current && formatMinute(current.minute, current.stoppage) === step.label;
    if (opt && !same) update(setGoalMinute(cur(), goal.id, opt, t));
    close();
  };
  return (
    <Sheet title="Minute ändern" subtitle={`Tor ${goalWho(game, goal, players)}`} testId="minute-sheet" onClose={close}>
      <MinuteSelect
        id="goal-minute-select"
        options={minuteOptions(game, now)}
        value={step.label}
        onChange={(label) => onStep({ ...step, label })}
      />
      <button type="button" class="btn btn--primary" data-testid="goal-minute-save" onClick={save}>
        Übernehmen
      </button>
    </Sheet>
  );
}
