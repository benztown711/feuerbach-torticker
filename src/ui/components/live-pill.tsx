import { useEffect, useState } from 'preact/hooks';
import type { Game } from '../../domain/types';
import { liveSender, onSenderChange, type LiveStatus } from '../../platform/live-sender';

/** Aktueller Sendestatus eines Spiels; null, wenn das Gerät für diese Mannschaft nicht sendet. */
export function useLiveStatus(game: Game | null | undefined): LiveStatus | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    let offStatus = liveSender()?.onStatus(bump);
    const offChange = onSenderChange(() => {
      offStatus?.();
      offStatus = liveSender()?.onStatus(bump);
      bump();
    });
    // "wartet auf Netz" hängt an der Zeit (FR-L08)
    const t = setInterval(bump, 5000);
    return () => {
      offStatus?.();
      offChange();
      clearInterval(t);
    };
  }, []);
  return game ? (liveSender()?.statusFor(game) ?? null) : null;
}

const LABEL: Record<LiveStatus, string> = { on: 'Live', wait: 'Wartet auf Netz', off: 'Nicht live' };
const ARIA: Record<LiveStatus, string> = {
  on: 'Live: Stand wird übertragen',
  wait: 'Live: wartet auf Netz',
  off: 'Nicht live gesendet',
};

/** Spec 006 FR-L08: Kennzeichen im Spielbildschirm eines Lead-Handys. */
export function LivePill({ game }: { game: Game }) {
  const status = useLiveStatus(game);
  if (!status) return null;
  return (
    <a
      class={`live-pill live-pill--${status}`}
      href="#/live-spieltag"
      data-testid="live-pill"
      data-state={status}
      aria-label={ARIA[status]}
    >
      {status === 'on' && <span class="live-pill__dot" aria-hidden="true" />}
      {LABEL[status]}
    </a>
  );
}
