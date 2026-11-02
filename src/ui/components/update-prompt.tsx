import { useRegisterSW } from 'virtual:pwa-register/preact';

/**
 * Hinweis auf eine neue App-Version (T028, research.md R-7).
 * Nie automatisch neu laden; während eines Spiels (blocked) wird der Hinweis zurückgehalten.
 */
export function UpdatePrompt({ blocked }: { blocked: boolean }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });
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
