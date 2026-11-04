import { useEffect, useState } from 'preact/hooks';
import type { GameWatch } from '../../platform/live-watch';
import { useGoalFlash } from '../hooks';

/**
 * Spec 006 US4: eine Zeile mit den heutigen Spielen der anderen Mannschaften unter der Kopfzeile
 * ("E2 2:1 · 31'"), ein Tipp öffnet das Dashboard. Ein neues Tor hebt die Zeile kurz hervor, ohne Ton (das
 * Signal gehört dem eigenen Spiel). Ohne andere Spiele fehlt die Zeile, damit die Torliste Platz behält (FR-033).
 */
export function LiveOthers({
  watch,
  gameId,
  team,
  now,
}: {
  watch: GameWatch;
  gameId: string;
  /** Eigene Mannschaft im Live-Spieltag (null: nicht dabei). */
  team: string | null;
  now: number;
}) {
  const [, setTick] = useState(0);
  useEffect(() => watch.onChange(() => setTick((n) => n + 1)), [watch]);
  const others = watch.others(gameId, team);
  const flash = useGoalFlash(others, now, watch.serverNow());
  if (others.length === 0) return null;
  const flashing = others.some((c) => flash.has(c.gameId));
  return (
    <a
      class={flashing ? 'live-others live-others--flash' : 'live-others'}
      href="#/live-spieltag/dashboard"
      data-testid="live-others"
      data-flash={String(flashing)}
    >
      <span class="visually-hidden">Andere Spiele, Dashboard öffnen: </span>
      <span class="live-others__list">
        {others.map((c) => (
          <span class="live-others__game" key={c.gameId} data-testid={`live-other-${c.key}`}>
            <b>{c.key}</b> {c.score} · {c.phase}
          </span>
        ))}
      </span>
      <svg class="icon live-others__chev" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </a>
  );
}
