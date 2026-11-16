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

/** Spec 017 FR-C21, FR-C22 (research.md R-C4): "Korrigiert. Ergebnis neu teilen?" mit "Teilen". */
export function ReshareBar({ at, onShare, onHide, hidden = false, extraClass = '' }: Props) {
  useEffect(() => {
    if (!at) return;
    const t = setTimeout(onHide, RESHARE_MS);
    return () => clearTimeout(t);
  }, [at]);
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
