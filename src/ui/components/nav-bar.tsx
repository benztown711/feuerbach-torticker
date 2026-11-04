import { useEffect, useState } from 'preact/hooks';
import { liveLabel } from '../../domain/history';
import type { Game } from '../../domain/types';
import { findOpenGame } from '../../platform/db';
import { useNow } from '../hooks';
import type { Route } from '../router';

type Tab = 'game' | 'history' | 'more';

const TAB_OF: Record<Exclude<Route['name'], 'leadLink' | 'liveView'>, Tab> = {
  start: 'game',
  new: 'game',
  game: 'game',
  history: 'history',
  details: 'history',
  more: 'more',
  roster: 'more',
  settings: 'more',
  help: 'more',
  live: 'more',
  liveDash: 'more',
};

/**
 * Navigationsleiste unten (FR-037): Spiel, Historie, Mehr.
 * Läuft ein Spiel und ist eine andere Seite offen, zeigt "Spiel" die Minute und führt direkt zurück.
 */
export function NavBar({ route }: { route: Exclude<Route, { name: 'leadLink' | 'liveView' }> }) {
  const active = TAB_OF[route.name];
  const now = useNow(1000);
  const [open, setOpen] = useState<Game | undefined>();
  const routeKey = route.name === 'game' || route.name === 'details' ? `${route.name}:${route.id}` : route.name;
  useEffect(() => {
    void findOpenGame().then(setOpen);
  }, [routeKey]);

  const onGameScreen = route.name === 'game';
  const live = open && !onGameScreen ? liveLabel(open, now) : null;
  const gameHref = live && open ? `#/spiel/${open.id}` : '#/';
  const current = (tab: Tab) => (active === tab ? { 'aria-current': 'page' as const } : {});

  return (
    <nav class="nav" aria-label="Hauptmenü" data-testid="nav">
      <a class="nav__item" href={gameHref} data-testid="nav-game" {...current('game')}>
        <svg class="nav__icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2.5M9 2h6" />
        </svg>
        {live ? (
          <span class="nav__live" data-testid="nav-live">
            {live}
          </span>
        ) : (
          <span>Spiel</span>
        )}
      </a>
      <a class="nav__item" href="#/historie" data-testid="nav-history" {...current('history')}>
        <svg class="nav__icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6h11M9 12h11M9 18h11" />
          <path class="nav__dots" d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
        </svg>
        <span>Historie</span>
      </a>
      <a class="nav__item" href="#/mehr" data-testid="nav-more" {...current('more')}>
        <svg class="nav__icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <span>Mehr</span>
      </a>
    </nav>
  );
}
