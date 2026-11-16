/** Spec 019 US1 (FR-A01 bis FR-A04): das Meldeband direkt über den Tor-Knöpfen des Spielbildschirms. */

export interface BandAction {
  label: string;
  testId: string;
  onClick: () => void;
  /** Pfeil "zurück" vor dem Text, für "Rückgängig". */
  undo?: boolean;
}

export interface BandHint {
  testId: string;
  text: string;
}

interface Props {
  /** Testkennung des Bandes, z. B. "undo-bar"; ohne Meldung die des Bandes für Hinweise. */
  testId: string;
  /** Text der Meldung; fehlt er, steht nur der Hinweis im Band. */
  text?: string;
  actions?: BandAction[];
  hint?: BandHint | null;
}

function UndoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" class="icon band__icon">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

export function MessageBand({ testId, text, actions = [], hint = null }: Props) {
  return (
    <div class="band" data-testid={testId} role="status">
      <div class="band__body">
        {text && <span class="band__text">{text}</span>}
        {hint && (
          <span class={text ? 'band__hint' : 'band__text'} data-testid={hint.testId}>
            {hint.text}
          </span>
        )}
      </div>
      {actions.map((a) => (
        <button key={a.testId} type="button" class="band__btn" data-testid={a.testId} onClick={a.onClick}>
          {a.undo && <UndoIcon />}
          {a.label}
        </button>
      ))}
    </div>
  );
}
