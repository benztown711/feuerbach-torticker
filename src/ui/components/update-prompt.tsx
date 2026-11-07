import { useEffect } from 'preact/hooks';
import { useRegisterSW } from 'virtual:pwa-register/preact';
import { updateAction } from '../../domain/update-policy';
import { checkOnForeground } from '../../platform/update-check';

/**
 * Hinweis auf eine neue App-Version (T028, research.md R-7).
 * Während eines Spiels wird der Hinweis zurückgehalten; auf der Seite des Zuschauer-Links lädt die App ohne
 * Rückfrage neu (Spec 007 FR-N09, R-N9), damit Eltern nach einem Umstieg ohne Zutun wieder Stände sehen.
 * FR-041: Zusätzlich bei jeder Rückkehr in den Vordergrund nach einer neuen Version suchen.
 */
export function UpdatePrompt({ route }: { route: string }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW: (_url, registration) => {
      if (registration) checkOnForeground(registration);
    },
  });
  const action = updateAction(route, needRefresh);
  useEffect(() => {
    if (action === 'reload') void updateServiceWorker(true);
  }, [action]);
  if (action !== 'prompt') return null;
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
