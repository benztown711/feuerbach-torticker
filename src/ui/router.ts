import { useEffect, useState } from 'preact/hooks';

export type Route =
  | { name: 'start' }
  | { name: 'new'; plan?: string; after?: string }
  | { name: 'roster' }
  | { name: 'history' }
  | { name: 'more' }
  | { name: 'settings' }
  | { name: 'help'; entry: string | null }
  | { name: 'live' }
  | { name: 'liveDash' }
  | { name: 'plan' }
  | { name: 'liveView'; data: string; help: boolean; entry: string | null }
  /** Spec 024 R-E6: Eltern tickern über den Zuschauer-Link (ohne Navigationsleiste). */
  | { name: 'liveGame'; data: string; id: string; join?: boolean }
  | { name: 'liveNew'; data: string }
  | { name: 'leadLink'; data: string; kind: 'lead' | 'trainer' }
  | { name: 'game'; id: string; join?: boolean }
  | { name: 'details'; id: string };

/** Hash-Routen laut contracts/ui-contract.md, damit Zurück-Geste und Neuladen funktionieren. */
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/neu') return { name: 'new' };
  // Spec 015 US6-S5: "Neues Spiel" mit dem vorgemerkten Planspiel ausgewählt.
  const fromPlan = /^\/neu\/plan\/([A-Za-z0-9_-]{1,12})$/.exec(path);
  if (fromPlan?.[1]) return { name: 'new', plan: fromPlan[1] };
  // Spec 021 US1: "Nächstes Spiel", vorbelegt aus dem beendeten Spiel.
  const after = /^\/neu\/nach\/([A-Za-z0-9_-]{1,64})$/.exec(path);
  if (after?.[1]) return { name: 'new', after: after[1] };
  if (path === '/kader') return { name: 'roster' };
  if (path === '/historie') return { name: 'history' };
  if (path === '/mehr') return { name: 'more' };
  if (path === '/einstellungen') return { name: 'settings' };
  if (path === '/hilfe') return { name: 'help', entry: null };
  // Spec 010 FR-H12: jeder Hilfe-Eintrag hat eine eigene Adresse.
  const help = /^\/hilfe\/([a-z0-9-]+)$/.exec(path);
  if (help?.[1]) return { name: 'help', entry: help[1] };
  if (path === '/live-spieltag') return { name: 'live' };
  if (path === '/live-spieltag/dashboard') return { name: 'liveDash' };
  if (path === '/live-spieltag/spielplan') return { name: 'plan' };
  // Spec 024 R-E6: Spielbildschirm und "Neues Spiel" in der Eltern-Fassung.
  const liveGame = /^\/live\/([A-Za-z0-9_-]+)\/spiel\/([\w-]+)(\/einstieg)?$/.exec(path);
  if (liveGame?.[1] && liveGame[2])
    return { name: 'liveGame', data: liveGame[1], id: liveGame[2], join: !!liveGame[3] };
  const liveNew = /^\/live\/([A-Za-z0-9_-]+)\/neu$/.exec(path);
  if (liveNew?.[1]) return { name: 'liveNew', data: liveNew[1] };
  // Zuschauer-Link, mit Eltern-Hilfe unter `/hilfe[/<id>]` (Spec 010 FR-H16).
  const view = /^\/live\/([A-Za-z0-9_-]+)(\/hilfe(?:\/([a-z0-9-]+))?)?$/.exec(path);
  if (view?.[1]) return { name: 'liveView', data: view[1], help: !!view[2], entry: view[3] ?? null };
  // Auch ohne Daten: WhatsApp macht lange Links teils nur bis `#/trainer/` antippbar (research.md R-L20).
  const lead = /^\/(lead|trainer)\/([A-Za-z0-9_-]*)$/.exec(path);
  if (lead) return { name: 'leadLink', data: lead[2] ?? '', kind: lead[1] === 'trainer' ? 'trainer' : 'lead' };
  const details = /^\/spiel\/([\w-]+)\/details$/.exec(path);
  if (details?.[1]) return { name: 'details', id: details[1] };
  // Spec 023 R-J6: aus "Neues Spiel" mit "Spiel läuft schon".
  const join = /^\/spiel\/([\w-]+)\/einstieg$/.exec(path);
  if (join?.[1]) return { name: 'game', id: join[1], join: true };
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
