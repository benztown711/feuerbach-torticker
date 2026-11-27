import { normalizeSounds } from './signal-sound';
import type { SoundEvent, SoundSettings } from './types';

/**
 * Spec 025 US3: Töne in der Eltern-Ansicht. Welches Ereignis eine neue Meldung auslöst (FR-T07, plan.md R-T3) und die
 * Töne, die Eltern auf ihrem Gerät gewählt haben (FR-T06, R-T4). Nichts davon wird übertragen.
 */

/** Ereignisse mit Ton in der Eltern-Ansicht und beim Tickern über den Zuschauer-Link (ohne Spielzeitende). */
export type ParentSoundEvent = Exclude<SoundEvent, 'timeUp'>;
export type ParentSounds = Omit<SoundSettings, 'timeUp'>;

/** R-T4: gespeicherte Eltern-Töne (JSON) lesen; fehlt etwas oder ist es kaputt, gilt die Vorbelegung. */
export function parentSounds(raw: string | null): ParentSounds {
  let parsed: unknown;
  try {
    parsed = raw === null ? undefined : JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const s = normalizeSounds(parsed);
  return { kickoff: s.kickoff, halftime: s.halftime, fulltime: s.fulltime, goalOwn: s.goalOwn, goalOpp: s.goalOpp };
}
