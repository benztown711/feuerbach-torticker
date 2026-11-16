import { useEffect, useState } from 'preact/hooks';
import { teamShortLabel } from '../../domain/history';
import type { TakeoverOffer } from '../../domain/live-board';
import type { LiveSpieltag } from '../../domain/types';
import { getPlayers, listGames, putGame } from '../../platform/db';
import { watchStart, type StartWatch } from '../../platform/live-watch';
import { useNow } from '../hooks';
import { navigate } from '../router';

/**
 * Spec 018 US2: je laufendem Spiel eines anderen Handys "E2 übernehmen" auf dem Startbildschirm, mit Rückfrage.
 * Nachgeladen (R-L7); hört nur mit, solange der Startbildschirm sichtbar ist (FR-006).
 */
export function StartOffers({ live }: { live: LiveSpieltag }) {
  const [watch, setWatch] = useState<StartWatch | null>(null);
  const [localIds, setLocalIds] = useState<string[] | null>(null);
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden');
  const [ask, setAsk] = useState<TakeoverOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setVersion] = useState(0);
  useNow(1000);

  useEffect(() => {
    const onVis = (): void => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    // FR-004: Spiele, die dieses Handy selbst sendet (nicht abgegeben), bietet der Startbildschirm nicht an.
    void listGames().then((gs) => setLocalIds(gs.filter((g) => !g.liveHandedOver).map((g) => g.id)));
  }, []);

  useEffect(() => {
    if (!visible) return;
    const w = watchStart(live);
    const off = w.onChange(() => setVersion((v) => v + 1));
    setWatch(w);
    return () => {
      off();
      w.stop();
      setWatch(null);
    };
  }, [live.topic, live.orgPub, visible]);

  if (!watch || !localIds) return null;
  const offers = watch.offers(localIds);
  const label = (o: TakeoverOffer): string => teamShortLabel(o.entry.snap.own);
  const line = (o: TakeoverOffer): string =>
    `${o.card.home.name} ${o.card.score} ${o.card.away.name} · ${o.card.phase}`;
  const current = ask && offers.find((o) => o.card.gameId === ask.card.gameId);

  const takeover = async (o: TakeoverOffer): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      const team = live.teams.find((t) => t.key === o.card.key);
      const game = watch.takeover(o.entry, team?.name ?? o.entry.snap.own, await getPlayers(), () =>
        globalThis.crypto.randomUUID(),
      );
      await putGame(game);
      navigate(`/spiel/${game.id}`, true);
    } catch {
      setBusy(false);
    }
  };

  return (
    <>
      {offers.map((o) => (
        <button
          key={o.card.gameId}
          type="button"
          class="start__opt start__opt--take"
          data-testid={`start-take-${o.card.key}`}
          onClick={() => setAsk(o)}
        >
          <svg class="icon start__opt-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 4 3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8" />
          </svg>
          <span class="start__opt-text">
            <strong>{label(o)} übernehmen</strong>
            <span data-testid={`start-take-line-${o.card.key}`}>
              <span class="live-pill__dot start__opt-dot" aria-hidden="true" />
              {line(o)}
            </span>
            {o.card.staleMinutes !== null && (
              <span class="start__opt-warn" data-testid={`start-take-stale-${o.card.key}`}>
                letzte Meldung vor {o.card.staleMinutes} Min
              </span>
            )}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="icon start__opt-chevron">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ))}
      {current && (
        <div class="overlay overlay--bottom">
          <div class="overlay__backdrop" onClick={() => setAsk(null)} />
          <div
            class="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-take-title"
            data-testid="start-take-dialog"
          >
            <h2 id="start-take-title" class="sheet__title">
              {label(current)} {current.entry.snap.venue === 'home' ? 'gegen' : 'bei'} {current.entry.snap.opp}{' '}
              übernehmen?
            </h2>
            <p class="sheet__text">
              <strong>{line(current)}</strong>. Ab dann sendet nur noch dieses Handy. Das andere Handy erfasst nur noch
              für sich.
            </p>
            <button
              type="button"
              class="btn btn--primary"
              data-testid="start-take-yes"
              disabled={busy}
              onClick={() => void takeover(current)}
            >
              Spiel übernehmen
            </button>
            <button type="button" class="btn btn--quiet" data-testid="start-take-cancel" onClick={() => setAsk(null)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </>
  );
}
