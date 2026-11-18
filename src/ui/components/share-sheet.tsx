import { quickAction } from '../../domain/live-quick';
import { LiveIcon, quickTap, type QuickHost } from './live-start';
import { Sheet } from './sheet';

/**
 * Spec 020 US2 (FR-E18, nachgeladen, R-E10): Blatt "Teilen" im Spielmenü statt "Zwischenstand teilen", mit
 * "Live-Link für Eltern" (wie "Eltern live zuschauen lassen") und "Stand als Text" (Zwischenstand). "Ergebnis teilen"
 * nach dem Schlusspfiff bleibt ein Tipp ohne dieses Blatt (Präzisierung 2026-11-17).
 */

// Der Spielbildschirm lädt nur dieses Modul vorab; es bringt den Ablauf aus US1 mit.
export { LiveStartSheet } from './live-start';

type Props = QuickHost & {
  /** "Stand als Text": Zwischenstand teilen (Spec 001 FR-042). */
  onText: () => void;
  onClose: () => void;
};

export function ShareSheet({ onText, onClose, ...host }: Props) {
  return (
    <Sheet title="Teilen" testId="share-sheet" onClose={onClose}>
      {quickAction(host.settings, host.game).kind !== 'hidden' && (
        <button
          type="button"
          class="start__opt"
          data-testid="share-live"
          onClick={() => {
            onClose();
            quickTap(host);
          }}
        >
          <LiveIcon />
          <span class="start__opt-text">
            <strong>Live-Link für Eltern</strong>
            <span>Eltern sehen Stand und Minute live</span>
          </span>
        </button>
      )}
      <button
        type="button"
        class="start__opt"
        data-testid="share-text"
        onClick={() => {
          onClose();
          onText();
        }}
      >
        <svg class="icon start__opt-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16v11H9l-5 4z" />
          <path d="M8 9h8M8 12h5" />
        </svg>
        <span class="start__opt-text">
          <strong>Stand als Text</strong>
          <span>Zwischenstand für WhatsApp</span>
        </span>
      </button>
    </Sheet>
  );
}
