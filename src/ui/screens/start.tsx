import { useEffect, useState } from 'preact/hooks';
import type { Game } from '../../domain/types';
import { findOpenGame } from '../../platform/db';
import { navigate } from '../router';

const base = import.meta.env.BASE_URL;

export function StartScreen() {
  const [open, setOpen] = useState<Game | undefined>();
  useEffect(() => {
    void findOpenGame().then(setOpen);
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
