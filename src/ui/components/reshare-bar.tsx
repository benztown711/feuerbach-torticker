import { useEffect } from 'preact/hooks';

/** Spec 017 FR-C21: so lange steht die Leiste (wie "Rückgängig"). */
export const RESHARE_MS = 10_000;

interface Props {
  /** Zeitpunkt der auslösenden Korrektur; 0 = keine Leiste. Jede neue Korrektur startet die Zeit neu. */
  at: number;
  onShare: () => void;
  onHide: () => void;
  /** Gerade verdeckt (z. B. von "Rückgängig"); die Zeit läuft weiter. */
  hidden?: boolean;
  /** Zusätzliche Klasse, z. B. für die Lage über der Navigation in den Spieldetails. */
  extraClass?: string;
}

/**
 * Zeitsteuerung der Leiste: nach RESHARE_MS ausblenden; jede neue Korrektur (neues `at`) startet neu.
 * Spec 019: Der Spielbildschirm zeigt die Meldung im Meldeband und nutzt nur diesen Hook.
 */
export function useReshareTimer(at: number, onHide: () => void): void {
  useEffect(() => {
    if (!at) return;
    const t = setTimeout(onHide, RESHARE_MS);
    return () => clearTimeout(t);
  }, [at]);
}

/** Spec 017 FR-C21, FR-C22 (research.md R-C4): "Korrigiert. Ergebnis neu teilen?" mit "Teilen" (Spieldetails). */
export function ReshareBar({ at, onShare, onHide, hidden = false, extraClass = '' }: Props) {
  useReshareTimer(at, onHide);
  if (!at || hidden) return null;
  return (
    <div class={`undo-bar ${extraClass}`.trim()} data-testid="reshare-bar" role="status">
      <span class="undo-bar__text">Korrigiert. Ergebnis neu teilen?</span>
      <button type="button" class="btn btn--secondary btn--small" data-testid="reshare-share" onClick={onShare}>
        Teilen
      </button>
    </div>
  );
}
