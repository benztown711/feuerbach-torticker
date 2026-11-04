import { useEffect, useState } from 'preact/hooks';
import type { Game } from '../../domain/types';
import { findOpenGame, getSettings, listGames } from '../../platform/db';
import { navigate } from '../router';

const base = import.meta.env.BASE_URL;

/** Nur beim ersten Start prüfen, ob das gemerkte Dashboard geöffnet wird (R-L6). */
let redirectChecked = false;

/** Das Dashboard wurde schon geöffnet: "Zum Torticker" führt dann wirklich zum Start. */
export function skipViewerRedirect(): void {
  redirectChecked = true;
}

/**
 * Spec 006 R-L6 (FR-L16): Startet der Torticker ohne eigene Spiele und Mannschaften, aber mit einem
 * gemerkten Zuschauer-Link (z. B. vom Home-Bildschirm), öffnet er dieses Dashboard.
 */
async function viewerToOpen(): Promise<string | null> {
  const s = await getSettings();
  if (!s.liveView || s.live || s.teams.length > 0) return null;
  if ((await listGames()).length > 0) return null;
  // Nachgeladen, damit das Hauptbundle klein bleibt (R-L7).
  const { viewerLinkPath } = await import('../../domain/live-link');
  return viewerLinkPath(s.liveView);
}

export function StartScreen() {
  const [open, setOpen] = useState<Game | undefined>();
  useEffect(() => {
    void findOpenGame().then(setOpen);
    if (redirectChecked) return;
    redirectChecked = true;
    void viewerToOpen().then((path) => path && navigate(path, true));
  }, []);
  return (
    <main class="start">
      <h1 class="start__bar t-kopfzeile">TORTICKER</h1>
      <img
        class="start__wappen"
        src={`${base}brand/wappen.svg`}
        alt="Wappen der Sportvg Feuerbach"
        width={84}
        height={100}
      />
      <p class="start__verein t-zwischentitel">Sportvg Feuerbach</p>
      <div class="start__actions">
        {open && (
          <button
            type="button"
            class="btn btn--primary btn--large"
            data-testid="btn-continue"
            onClick={() => navigate(`/spiel/${open.id}`)}
          >
            Spiel fortsetzen: {open.opponent}
          </button>
        )}
        <button
          type="button"
          class={open ? 'btn btn--secondary btn--large' : 'btn btn--primary btn--large'}
          data-testid="btn-new-game"
          onClick={() => navigate('/neu')}
        >
          Neues Spiel
        </button>
      </div>
    </main>
  );
}
