import { useState } from 'preact/hooks';
import { OPPONENT_FALLBACK } from '../../domain/opponent';
import { Sheet } from './sheet';

interface Props {
  name: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

/**
 * Spec 022 FR-F13: Blatt "Gegner ändern" in den Spieldetails (nachgeladen). Ein leerer Name wird "Gegner"
 * (`opponentName`, FR-F11); gespeichert wird in den Spieldetails wie jede Korrektur.
 */
export function OpponentSheet({ name, onSave, onClose }: Props) {
  // Der Ersatzname "Gegner" steht als Platzhalter, nicht als Eintrag: wer nichts einträgt, behält ihn.
  const [value, setValue] = useState(name === OPPONENT_FALLBACK ? '' : name);
  return (
    <Sheet title="Gegner ändern" subtitle="Gilt für dieses Spiel." testId="opponent-sheet" onClose={onClose}>
      <form
        class="opponent-sheet"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(value);
        }}
      >
        <div class="field">
          <label class="field__label t-label" for="opponent-input">
            GEGNER
          </label>
          <input
            id="opponent-input"
            class="input"
            data-testid="opponent-input"
            value={value}
            maxLength={40}
            autocomplete="off"
            placeholder="Gegner (optional)"
            onInput={(e) => setValue(e.currentTarget.value)}
          />
        </div>
        <button type="submit" class="btn btn--primary" data-testid="opponent-save">
          Übernehmen
        </button>
      </form>
    </Sheet>
  );
}
