import { useState } from 'preact/hooks';
import type { Player, Scorer } from '../../domain/types';

interface Props {
  /** Spec 009: "scorer" = Torschütze, "assist" = Vorlage (ohne "Eigentor Gegner", Testkennungen `assist-*`). */
  kind?: 'scorer' | 'assist';
  subtitle: string;
  /** Aufgebot bzw. ganzer Kader (FR-030); bei Vorlagen ohne den Torschützen. */
  squad: Player[];
  /** Restlicher Kader für "Andere …"; leer = kein Knopf. */
  others: Player[];
  onPick: (scorer: Scorer) => void;
  onClose: () => void;
  /** Nur direkt nach dem Tor: verbleibende Sekunden bis zum Auto-Schließen (US3-S2, 009 US1-S4). */
  countdown?: number;
  /** Nur direkt nach dem Tor: Rückgängig bleibt erreichbar, solange die Auswahl offen ist. */
  onUndo?: () => void;
  /** Spec 021 FR-W10: über den Tor-Knöpfen angedockt (ohne Abdunkler, nicht modal); sonst ein Blatt. */
  docked?: boolean;
}

const TEXT = {
  scorer: { title: 'Wer hat getroffen?', none: 'Ohne Torschütze' },
  assist: { title: 'Vorlage von?', none: 'Ohne Vorlage' },
};

/**
 * Schnellauswahl aus dem Aufgebot (US3, FR-009, FR-030): Torschütze mit "Andere …" und Eigentor, oder
 * (Spec 009 FR-V02, FR-V04) Vorlagengeber. Knöpfe zeigen Nummer und Name (FR-V09).
 * Spec 021 FR-W10, FR-W15: Angedockt (direkt nach dem Tor) ohne Abdunkler und nicht-modal über den Tor-Knöpfen.
 * Sonst ein Blatt mit Abdunkler wie bisher: Korrektur ohne Countdown (FR-W16) bzw. im Elfmeterschießen mit Countdown.
 */
export function ScorerPicker({
  kind = 'scorer',
  subtitle,
  squad,
  others,
  onPick,
  onClose,
  countdown,
  onUndo,
  docked = false,
}: Props) {
  const [showOthers, setShowOthers] = useState(false);
  const shown = showOthers ? [...squad, ...others] : squad;
  const text = TEXT[kind];
  const titleId = `${kind}-title`;
  const panel = (
    <div
      class={docked ? 'sheet scorer scorer--dock' : 'sheet scorer'}
      role="dialog"
      aria-modal={docked ? undefined : 'true'}
      aria-labelledby={titleId}
      data-testid={`${kind}-picker`}
    >
      <div class="scorer__head">
        <h2 id={titleId} class="sheet__title">
          {text.title}
        </h2>
        <span class="sheet__subtitle">{subtitle}</span>
        {onUndo && (
          <button type="button" class="btn btn--secondary btn--small" data-testid="btn-undo" onClick={onUndo}>
            Rückgängig
          </button>
        )}
      </div>
      <div class="scorer__grid">
        {shown.map((p) => (
          <button
            type="button"
            key={p.id}
            class="scorer__option"
            data-testid={`${kind}-option-${p.id}`}
            onClick={() => onPick({ kind: 'player', playerId: p.id })}
          >
            {/* Sichtbarer Text = zugänglicher Name "7 Max" (Leerzeichen trennt die Zeilen). */}
            {p.number !== null && <span class="scorer__number">{p.number}</span>}
            {p.number !== null && ' '}
            <span class="scorer__name">{p.name}</span>
          </button>
        ))}
        {others.length > 0 && !showOthers && (
          <button
            type="button"
            class="scorer__option scorer__option--more"
            data-testid={`${kind}-others`}
            onClick={() => setShowOthers(true)}
          >
            Andere …
          </button>
        )}
      </div>
      {/* Spec 021 FR-W31: Fußzeile mit "Ohne Torschütze" und "Eigentor Gegner" nebeneinander, beide mindestens 56 pt. */}
      <div class={kind === 'scorer' ? 'scorer__foot' : 'scorer__foot scorer__foot--single'}>
        <button
          type="button"
          class="scorer__option scorer__option--quiet"
          data-testid={countdown !== undefined ? `${kind}-skip` : `${kind}-clear`}
          onClick={countdown !== undefined ? onClose : () => onPick(null)}
        >
          {countdown !== undefined ? `${text.none} (${countdown} s)` : text.none}
        </button>
        {kind === 'scorer' && (
          <button
            type="button"
            class="scorer__option scorer__option--quiet"
            data-testid="scorer-own-goal"
            onClick={() => onPick({ kind: 'ownGoal' })}
          >
            Eigentor Gegner
          </button>
        )}
      </div>
      {countdown === undefined && (
        <button type="button" class="btn btn--quiet" onClick={onClose}>
          Abbrechen
        </button>
      )}
    </div>
  );
  if (docked) return panel;
  return (
    <div class="overlay overlay--bottom">
      <div class="overlay__backdrop" onClick={onClose} />
      {panel}
    </div>
  );
}
