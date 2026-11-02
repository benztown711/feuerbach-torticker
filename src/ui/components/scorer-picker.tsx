import { useState } from 'preact/hooks';
import type { Player, Scorer } from '../../domain/types';

interface Props {
  subtitle: string;
  /** Aufgebot bzw. ganzer Kader (FR-030). */
  squad: Player[];
  /** Restlicher Kader für "Andere …"; leer = kein Knopf. */
  others: Player[];
  onPick: (scorer: Scorer) => void;
  onClose: () => void;
  /** Nur direkt nach dem Tor: verbleibende Sekunden bis zum Auto-Schließen (US3-S2). */
  countdown?: number;
  /** Nur direkt nach dem Tor: Rückgängig bleibt erreichbar, solange die Auswahl offen ist. */
  onUndo?: () => void;
}

/** Torschützen-Schnellauswahl (US3, FR-009, FR-030): Raster aus dem Aufgebot, "Andere …", Eigentor. */
export function ScorerPicker({ subtitle, squad, others, onPick, onClose, countdown, onUndo }: Props) {
  const [showOthers, setShowOthers] = useState(false);
  const shown = showOthers ? [...squad, ...others] : squad;
  return (
    <div class="overlay overlay--bottom">
      <div class="overlay__backdrop" onClick={onClose} />
      <div
        class="sheet scorer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scorer-title"
        data-testid="scorer-picker"
      >
        <div class="scorer__head">
          <h2 id="scorer-title" class="sheet__title">
            Wer hat getroffen?
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
              data-testid={`scorer-option-${p.id}`}
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
              data-testid="scorer-others"
              onClick={() => setShowOthers(true)}
            >
              Andere …
            </button>
          )}
          <button
            type="button"
            class="scorer__option scorer__option--quiet"
            data-testid="scorer-own-goal"
            onClick={() => onPick({ kind: 'ownGoal' })}
          >
            Eigentor Gegner
          </button>
        </div>
        {countdown !== undefined ? (
          <button type="button" class="btn btn--quiet" data-testid="scorer-skip" onClick={onClose}>
            Ohne Torschütze ({countdown} s)
          </button>
        ) : (
          <div class="button-row">
            <button type="button" class="btn btn--secondary" data-testid="scorer-clear" onClick={() => onPick(null)}>
              Ohne Torschütze
            </button>
            <button type="button" class="btn btn--quiet" onClick={onClose}>
              Abbrechen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
