import { useEffect, useRef, useState } from 'preact/hooks';
import { goalSpeech, goalTitle, latestGoal, newGoals } from '../domain/goal-alert';
import type { BoardCard } from '../domain/live-board';
import { newSoundEvent, soundTallies, type ParentSounds } from '../domain/sound-alert';
import { playSound, vibrateShort } from '../platform/signal';

/**
 * Eigene Datei statt `hooks.ts`: der Hook gehört nur zum Dashboard, das nachgeladen wird, und soll das
 * Hauptbundle nicht vergrößern (Spec 020 R-E10).
 */

/** Spec 020 FR-E22: so lange steht "Tor! …" höchstens im Tab-Titel (Anzeigedauer, keine Spielzeit). */
const TITLE_MS = 30_000;
/** Spec 020 R-E6: danach wird der Ansagebereich geleert, damit dieselbe Ansage beim nächsten Tor wieder gelesen wird. */
const SPEECH_MS = 5000;

/**
 * Spec 020 US3: Neue Tore bei offenem Dashboard (FR-E21), erst ab dem ersten Stand vom Dienst (`ready`). Setzt den Tab-Titel auf "Tor! …" und stellt ihn zurück,
 * sobald die Seite wieder sichtbar wird, das Fenster den Fokus bekommt oder nach 30 Sekunden (FR-E22); liefert den
 * Text für den höflichen Ansagebereich (FR-E23). Mit `feedback` (nur Eltern-Ansicht, FR-E27) vibriert das Gerät
 * bei einem Tor einmal kurz (FR-E24). Spec 025 FR-T07 (ersetzt FR-E25): Mit `sounds` (Schalter "Töne" an) spielt je
 * Meldung höchstens ein Ton, der des neuesten Ereignisses (Anpfiff, Pausen-, Schlusspfiff, Tor für uns, Gegentor).
 */
export function useGoalAlert(
  cards: Pick<BoardCard, 'gameId' | 'goals' | 'updatedAt' | 'whistles'>[],
  serverNow: number,
  { feedback, sounds, ready }: { feedback: boolean; sounds: ParentSounds | null; ready: boolean },
): string {
  const counts = useRef<Map<string, number> | null>(null);
  const tallies = useRef<ReturnType<typeof soundTallies> | null>(null);
  const title = useRef<{ original: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;
  const [speech, setSpeech] = useState('');
  const signature = cards
    .map((c) => `${c.gameId}:${c.goals.length}:${c.whistles.kickoff}:${c.whistles.halftime}:${c.whistles.fulltime}`)
    .join('|');

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
    // FR-E21: Bis der erste Stand vom Dienst da ist (`ready`), zählt nichts als neu, auch nicht ein Tor, das kurz vor
    // dem Öffnen fiel und im gemerkten Stand noch fehlt; die Basis ist der erste Stand vom Dienst.
    if (!ready) {
      counts.current = null;
      tallies.current = null;
      return;
    }
    const prev = counts.current;
    counts.current = new Map(cards.map((c) => [c.gameId, c.goals.length]));
    const before = tallies.current;
    tallies.current = soundTallies(cards);
    const event = newSoundEvent(before, cards, serverNow);
    const chosen = soundsRef.current;
    if (feedback && event && chosen) void playSound(chosen[event]);
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
    if (feedback) vibrateShort();
    // Nur bei geänderter Toranzahl oder Pfiffen (signature) oder erstem Stand vom Dienst, nicht bei jedem neuen Array.
  }, [signature, ready]);

  return speech;
}
