import { useEffect, useRef } from 'preact/hooks';

interface Props {
  title: string;
  text: string;
  yesLabel: string;
  onYes: () => void;
  onNo: () => void;
}

/** Sicherheitsabfrage (FR-006, T027). Tippen außerhalb bricht ab. */
export function Confirm({ title, text, yesLabel, onYes, onNo }: Props) {
  const noRef = useRef<HTMLButtonElement>(null);
  useEffect(() => noRef.current?.focus(), []);
  return (
    <div class="overlay overlay--center">
      <div class="overlay__backdrop" data-testid="confirm-backdrop" onClick={onNo} />
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        data-testid="confirm-dialog"
        onKeyDown={(e) => e.key === 'Escape' && onNo()}
      >
        <h2 id="confirm-title" class="dialog__title">
          {title}
        </h2>
        {text && <p class="dialog__text">{text}</p>}
        <div class="button-row">
          <button ref={noRef} type="button" class="btn btn--secondary" data-testid="confirm-no" onClick={onNo}>
            Abbrechen
          </button>
          <button type="button" class="btn btn--primary" data-testid="confirm-yes" onClick={onYes}>
            {yesLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
