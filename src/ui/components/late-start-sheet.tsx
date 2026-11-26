import type { ClockState } from '../../domain/clock';
import type { RestRange } from '../../domain/corrections';
import { formatClock } from '../../domain/format';
import { entryChoices, entryMinute, MAX_PRE_GOALS, restChangeText, type JoinInput } from '../../domain/late-start';
import { minuteFor } from '../../domain/minute';
import { shortTeamName } from '../../domain/team-name';
import type { Game, Side } from '../../domain/types';
import { Sheet } from './sheet';
import { TeamMark } from './team-mark';

/** Nachgeladen mit den Blättern (Bundle-Budget, wie die Tor-Blätter in Spec 021 R-W3). */
export { joinGame } from '../../domain/late-start';
export { setRest } from '../../domain/corrections';

/** Eingaben im Blatt "Spiel läuft schon"; bleiben erhalten, während das Blatt "Trikots" offen ist (FR-J06). */
export interface LateDraft {
  /** Schlüssel aus `entryChoices`, z. B. "s3" oder "p1". */
  key: string;
  rest: number;
  own: number;
  opp: number;
}

/** FR-J03: Vorgabe erster Abschnitt, volle Restzeit, 0:0. */
export const lateDraft = (game: Game): LateDraft => ({ key: 's1', rest: game.schema.sectionMinutes, own: 0, opp: 0 });

const choiceOf = (game: Game, key: string) =>
  entryChoices(game.schema).find((c) => c.key === key) ?? entryChoices(game.schema)[0]!;

export function lateInput(game: Game, d: LateDraft): JoinInput {
  const c = choiceOf(game, d.key);
  return { section: c.section, pause: c.pause, rest: d.rest, own: d.own, opp: d.opp };
}

/** Text der Leiste "Rückgängig" nach dem Einstieg, z. B. "Eingestiegen: 3. Drittel, noch 7 Min, 7:4". */
export function lateSummary(game: Game, d: LateDraft): string {
  const c = choiceOf(game, d.key);
  const where = c.pause ? c.label : `${c.label}, noch ${d.rest} Min`;
  const [first, second] = game.venue === 'home' ? [d.own, d.opp] : [d.opp, d.own];
  return `Eingestiegen: ${where}, ${first}:${second}`;
}

const STEPS = [-5, -1, 1, 5];

interface Props {
  game: Game;
  draft: LateDraft;
  onChange: (d: LateDraft) => void;
  onKits: () => void;
  onSave: () => void;
  onClose: () => void;
}

/** Spec 023 FR-J03, FR-J06: Blatt "Spiel läuft schon" mit Abschnitt, Restzeit, Spielstand und "Trikots ändern". */
export function LateStartSheet({ game, draft, onChange, onKits, onSave, onClose }: Props) {
  const length = game.schema.sectionMinutes;
  const choice = choiceOf(game, draft.key);
  const sides: Side[] = game.venue === 'home' ? ['own', 'opp'] : ['opp', 'own'];
  const nameOf = (side: Side): string => (side === 'own' ? shortTeamName(game.ownTeam) : game.opponent);
  const colorOf = (side: Side): string => (side === 'own' ? game.ownColor : game.oppColor);
  const next = choice.pause
    ? entryChoices(game.schema).find((c) => c.section === choice.section + 1 && !c.pause)
    : null;
  return (
    <Sheet
      title="Spiel läuft schon"
      subtitle="Stell ein, was am Platz gerade gilt."
      testId="late-sheet"
      onClose={onClose}
    >
      <div class="late">
        <span class="t-label late__label" id="late-sec">
          Abschnitt
        </span>
        <div class="late__chips" role="group" aria-labelledby="late-sec">
          {entryChoices(game.schema).map((c) => (
            <button
              key={c.key}
              type="button"
              class="chip late__chip"
              aria-pressed={c.key === draft.key}
              data-testid={`late-choice-${c.key}`}
              onClick={() => onChange({ ...draft, key: c.key, rest: length })}
            >
              {c.label}
            </button>
          ))}
        </div>
        {choice.pause ? (
          <p class="field__help" data-testid="late-pause-hint">
            In der Pause läuft keine Uhr. Danach geht es mit „Anpfiff {next?.label}“ weiter.
          </p>
        ) : (
          <>
            <span class="t-label late__label">Restzeit</span>
            <div class="late__rest">
              <output class="late__rest-value" data-testid="late-rest" aria-live="polite">
                Noch {draft.rest} Min
              </output>
              <span class="late__rest-minute" data-testid="late-minute">
                = {entryMinute(game.schema, choice.section, draft.rest)}. Minute
              </span>
            </div>
            <div class="late__steps">
              {STEPS.map((d) => (
                <button
                  key={d}
                  type="button"
                  class="btn btn--secondary"
                  data-testid={`late-rest-${d < 0 ? 'm' : 'p'}${Math.abs(d)}`}
                  aria-label={`Restzeit ${d < 0 ? 'minus' : 'plus'} ${Math.abs(d)} Minuten`}
                  disabled={draft.rest + d < 0 || draft.rest + d > length}
                  onClick={() => onChange({ ...draft, rest: draft.rest + d })}
                >
                  {d < 0 ? '−' : '+'}
                  {Math.abs(d)}
                </button>
              ))}
            </div>
          </>
        )}
        <div class="late__score-head">
          <span class="t-label late__label">Spielstand</span>
          <button type="button" class="link-btn" data-testid="late-kits" onClick={onKits}>
            Trikots ändern
          </button>
        </div>
        {sides.map((side) => (
          <div class="late__count" key={side}>
            <span class="late__team">
              <TeamMark colorId={colorOf(side)} testId={`late-mark-${side}`} />
              <span>{nameOf(side)}</span>
            </span>
            <button
              type="button"
              class="btn btn--secondary"
              data-testid={`late-${side}-minus`}
              aria-label={`${nameOf(side)} ein Tor weniger`}
              disabled={draft[side] <= 0}
              onClick={() => onChange({ ...draft, [side]: draft[side] - 1 })}
            >
              −
            </button>
            <output class="late__count-value" data-testid={`late-${side}-count`} aria-live="polite">
              {draft[side]}
            </output>
            <button
              type="button"
              class="btn btn--secondary"
              data-testid={`late-${side}-plus`}
              aria-label={`${nameOf(side)} ein Tor mehr`}
              disabled={draft[side] >= MAX_PRE_GOALS}
              onClick={() => onChange({ ...draft, [side]: draft[side] + 1 })}
            >
              +
            </button>
          </div>
        ))}
      </div>
      <button type="button" class="btn btn--primary" data-testid="late-save" onClick={onSave}>
        Übernehmen
      </button>
    </Sheet>
  );
}

interface FixProps {
  game: Game;
  clock: ClockState;
  range: RestRange;
  /** Gewählte Restzeit und gerundete Restzeit beim Öffnen. */
  fix: { rest: number; start: number };
  onChange: (fix: { rest: number; start: number }) => void;
  onSave: () => void;
  onClose: () => void;
}

/** Spec 023 FR-J20 (ersetzt Spec 012 FR-S20): Blatt "Uhr korrigieren" mit Restzeit und −5/−1/+1/+5. */
export function ClockFixSheet({ game, clock, range, fix, onChange, onSave, onClose }: FixProps) {
  const diff = fix.rest - fix.start;
  return (
    <Sheet
      title="Uhr korrigieren"
      subtitle={`Die Uhr zeigt ${formatClock(clock)}. Wie viel Zeit ist noch zu spielen?`}
      testId="clock-fix-sheet"
      onClose={onClose}
    >
      <div class="late__rest">
        <output class="late__rest-value" data-testid="clock-fix-rest" aria-live="polite">
          {fix.rest < 0 ? `+${-fix.rest} Min` : `Noch ${fix.rest} Min`}
        </output>
        <span class="late__rest-minute" data-testid="clock-fix-minute">
          {fix.rest < 0
            ? 'Nachspielzeit'
            : `= ${minuteFor(clock.section, clock.sectionMs - fix.rest * 60_000, game.schema).minute}. Minute`}
        </span>
      </div>
      <div class="late__steps">
        {STEPS.map((d) => (
          <button
            key={d}
            type="button"
            class="btn btn--secondary"
            data-testid={`clock-fix-${d < 0 ? 'm' : 'p'}${Math.abs(d)}`}
            aria-label={`Restzeit ${d < 0 ? 'minus' : 'plus'} ${Math.abs(d)} Minuten`}
            disabled={fix.rest + d < range.min || fix.rest + d > range.max}
            onClick={() => onChange({ ...fix, rest: fix.rest + d })}
          >
            {d < 0 ? '−' : '+'}
            {Math.abs(d)}
          </button>
        ))}
      </div>
      <p class="field__help" data-testid="clock-fix-help">
        {restChangeText(game.schema, clock.section, diff)}
      </p>
      <button type="button" class="btn btn--primary" data-testid="clock-fix-save" onClick={onSave}>
        Übernehmen
      </button>
    </Sheet>
  );
}
