import { useEffect, useRef, useState } from 'preact/hooks';
import { goalSpeech, goalTitle, latestGoal, newGoals } from '../domain/goal-alert';
import type { BoardCard } from '../domain/live-board';
import type { Player } from '../domain/types';
import { getPlayers } from '../platform/db';
import { playGoalSignal, vibrateShort } from '../platform/signal';
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

/** Spec 020 FR-E22: so lange steht "Tor! …" höchstens im Tab-Titel (Anzeigedauer, keine Spielzeit). */
const TITLE_MS = 30_000;
/** Spec 020 R-E6: danach wird der Ansagebereich geleert, damit dieselbe Ansage beim nächsten Tor wieder gelesen wird. */
const SPEECH_MS = 5000;

/**
 * Spec 020 US3: Neue Tore bei offenem Dashboard (FR-E21). Setzt den Tab-Titel auf "Tor! …" und stellt ihn zurück,
 * sobald die Seite wieder sichtbar wird, das Fenster den Fokus bekommt oder nach 30 Sekunden (FR-E22); liefert den
 * Text für den höflichen Ansagebereich (FR-E23). Mit `feedback` (nur Eltern-Ansicht, FR-E27) vibriert das Gerät
 * einmal kurz (FR-E24) und spielt mit `sound` den Signalton einmal (FR-E25), höchstens je einmal je Meldung.
 */
export function useGoalAlert(
  cards: Pick<BoardCard, 'gameId' | 'goals' | 'updatedAt'>[],
  serverNow: number,
  { feedback, sound }: { feedback: boolean; sound: boolean },
): string {
  const counts = useRef<Map<string, number> | null>(null);
  const title = useRef<{ original: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const soundOn = useRef(sound);
  soundOn.current = sound;
  const [speech, setSpeech] = useState('');
  const signature = cards.map((c) => `${c.gameId}:${c.goals.length}`).join('|');

  const restore = (): void => {
    const t = title.current;
    if (!t) return;
    clearTimeout(t.timer);
    document.title = t.original;
    title.current = null;
  };

  useEffect(() => {
    const visible = (): void => {
      if (document.visibilityState === 'visible') restore();
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', restore);
    return () => {
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('focus', restore);
      restore();
      clearTimeout(speechTimer.current);
    };
  }, []);

  useEffect(() => {
    const prev = counts.current;
    counts.current = new Map(cards.map((c) => [c.gameId, c.goals.length]));
    const goals = newGoals(prev, cards, serverNow);
    if (goals.length === 0) return;
    // Ein weiteres Tor ersetzt den Titel und startet die Frist neu; zurück kommt immer der ursprüngliche Titel.
    const original = title.current?.original ?? document.title;
    if (title.current) clearTimeout(title.current.timer);
    document.title = goalTitle(latestGoal(goals));
    title.current = { original, timer: setTimeout(restore, TITLE_MS) };
    setSpeech(goals.map(goalSpeech).join('. '));
    clearTimeout(speechTimer.current);
    speechTimer.current = setTimeout(() => setSpeech(''), SPEECH_MS);
    if (feedback) {
      vibrateShort();
      if (soundOn.current) void playGoalSignal();
    }
    // Nur bei geänderter Toranzahl (signature), nicht bei jedem neuen Array.
  }, [signature]);

  return speech;
}
