import { useRegisterSW } from 'virtual:pwa-register/preact';
import { checkOnForeground } from '../../platform/update-check';

/**
 * Hinweis auf eine neue App-Version (T028, research.md R-7).
 * Nie automatisch neu laden; während eines Spiels (blocked) wird der Hinweis zurückgehalten.
 * FR-041: Zusätzlich bei jeder Rückkehr in den Vordergrund nach einer neuen Version suchen.
 */
export function UpdatePrompt({ blocked }: { blocked: boolean }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW: (_url, registration) => {
      if (registration) checkOnForeground(registration);
    },
  });
  if (!needRefresh || blocked) return null;
  return (
    <div class="update-prompt" role="status" data-testid="update-prompt">
      <span class="update-prompt__text">Neue Version verfügbar.</span>
      <button type="button" class="btn btn--primary btn--small" onClick={() => void updateServiceWorker(true)}>
        Neu laden
      </button>
      <button type="button" class="btn btn--quiet btn--small" onClick={() => setNeedRefresh(false)}>
        Später
      </button>
    </div>
  );
}
