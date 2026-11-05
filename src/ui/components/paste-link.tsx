import { useState } from 'preact/hooks';
import { findLink, viewerLinkPath } from '../../domain/live-link';
import { verifyLink, type VerifiedLink } from '../../platform/live-setup';
import { navigate } from '../router';

/**
 * Spec 006 FR-L03, Spec 012 FR-S02: Einfügefeld für Trainer-, Lead- und Zuschauer-Link. Ein Zuschauer-Link öffnet
 * das Dashboard; ein geprüfter Trainer- oder Lead-Link geht an `onLink` (Kopplungsfrage).
 */
export function PasteLink({
  onCancel,
  onLink,
  initialError = '',
}: {
  onCancel: () => void;
  onLink: (p: VerifiedLink) => void;
  /** Spec 012: Hinweis, warum der Link aus der Zwischenablage nicht genommen wurde. */
  initialError?: string;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState(initialError);

  const apply = async (): Promise<void> => {
    const link = findLink(text);
    if (link.kind === 'view') {
      // US1-S5: Ein Zuschauer-Link macht das Handy nicht zum Lead-Handy, er zeigt nur das Dashboard.
      navigate(viewerLinkPath(link.view));
      return;
    }
    if (link.kind === 'invalid') {
      setError('Kein gültiger Link. Bitte den ganzen Link aus WhatsApp kopieren.');
      return;
    }
    const verified = await verifyLink(link);
    if (verified) onLink(verified);
    else setError(`Dieser ${link.kind === 'trainer' ? 'Trainer-Link' : 'Lead-Link'} ist nicht gültig.`);
  };

  return (
    <form
      class="form live"
      onSubmit={(e) => {
        e.preventDefault();
        void apply();
      }}
    >
      <div class="field">
        <label class="field__label t-label" for="paste-link">
          LINK
        </label>
        <textarea
          id="paste-link"
          class="textarea"
          rows={4}
          data-testid="paste-link-input"
          placeholder="Link aus WhatsApp hier einfügen"
          value={text}
          onInput={(e) => {
            setText((e.target as HTMLTextAreaElement).value);
            setError('');
          }}
        />
        <p class="field__help">
          Lange auf den Link in WhatsApp tippen, „Kopieren“, dann hier lange tippen und „Einsetzen“.
        </p>
        {error && (
          <p class="field__error" data-testid="paste-link-error">
            {error}
          </p>
        )}
      </div>
      <button type="submit" class="btn btn--primary" data-testid="paste-link-apply">
        Übernehmen
      </button>
      <button type="button" class="btn btn--secondary" data-testid="paste-link-cancel" onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  );
}
