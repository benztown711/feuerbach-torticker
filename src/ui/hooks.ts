import { useEffect, useRef, useState } from 'preact/hooks';
import type { BoardCard } from '../domain/live-board';
import type { Player } from '../domain/types';
import { getPlayers } from '../platform/db';
import { isDarkTheme } from '../platform/storage';

/** Aktuelle Zeit, alle `intervalMs` neu (Uhr wird daraus berechnet, nie hochgezählt). */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Folgt dem aktiven Theme (System oder fest eingestellt). */
export function useDarkTheme(): boolean {
  const [dark, setDark] = useState(isDarkTheme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setDark(isDarkTheme());
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return dark;
}

/** Kader aus IndexedDB; `undefined` solange geladen wird, `reload` nach Änderungen. */
export function usePlayers(): [Player[] | undefined, () => void] {
  const [players, setPlayers] = useState<Player[] | undefined>(undefined);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    void getPlayers().then(setPlayers);
  }, [version]);
  return [players, () => setVersion((v) => v + 1)];
}

/** Spec 006 FR-L15, US4-S3: Hervorhebung nach neuem Tor. */
const FLASH_MS = 5000;
/** Nur Tore aus frischen Meldungen hervorheben, nicht beim Nachladen der letzten 12 Stunden. */
const FRESH_MS = 60_000;

/**
 * Merkt sich die Toranzahl je Spiel und liefert die Spiele, deren neues Tor gerade hervorgehoben wird
 * (einige Sekunden, ohne Ton). Neu erscheinende Spiele zählen nicht.
 */
export function useGoalFlash(
  cards: Pick<BoardCard, 'gameId' | 'goals' | 'updatedAt'>[],
  now: number,
  serverNow: number,
): Set<string> {
  const counts = useRef<Map<string, number> | null>(null);
  const [until, setUntil] = useState<Record<string, number>>({});
  const signature = cards.map((c) => `${c.gameId}:${c.goals.length}`).join('|');
  useEffect(() => {
    const prev = counts.current;
    counts.current = new Map(cards.map((c) => [c.gameId, c.goals.length]));
    if (!prev) return;
    const fresh = cards.filter(
      (c) => c.goals.length > (prev.get(c.gameId) ?? c.goals.length) && serverNow - c.updatedAt < FRESH_MS,
    );
    if (fresh.length === 0) return;
    const t = Date.now();
    // Abgelaufene Einträge fallen dabei weg.
    setUntil((u) => ({
      ...Object.fromEntries(Object.entries(u).filter(([, end]) => end > t)),
      ...Object.fromEntries(fresh.map((c) => [c.gameId, t + FLASH_MS])),
    }));
    // Nur bei geänderter Toranzahl (signature), nicht bei jedem neuen Array.
  }, [signature]);
  return new Set(Object.keys(until).filter((id) => (until[id] ?? 0) > now));
}
