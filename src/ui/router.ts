import { useEffect, useState } from 'preact/hooks';

export type Route =
  | { name: 'start' }
  | { name: 'new' }
  | { name: 'roster' }
  | { name: 'history' }
  | { name: 'more' }
  | { name: 'settings' }
  | { name: 'help' }
  | { name: 'game'; id: string }
  | { name: 'details'; id: string };

/** Hash-Routen laut contracts/ui-contract.md, damit Zurück-Geste und Neuladen funktionieren. */
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/neu') return { name: 'new' };
  if (path === '/kader') return { name: 'roster' };
  if (path === '/historie') return { name: 'history' };
  if (path === '/mehr') return { name: 'more' };
  if (path === '/einstellungen') return { name: 'settings' };
  if (path === '/hilfe') return { name: 'help' };
  const details = /^\/spiel\/([\w-]+)\/details$/.exec(path);
  if (details?.[1]) return { name: 'details', id: details[1] };
  const game = /^\/spiel\/([\w-]+)$/.exec(path);
  if (game?.[1]) return { name: 'game', id: game[1] };
  return { name: 'start' };
}

export function navigate(path: string, replace = false): void {
  const url = `#${path}`;
  if (replace) window.location.replace(url);
  else window.location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
