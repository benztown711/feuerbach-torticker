import { normalizeSounds } from './signal-sound';
import type { SoundEvent, SoundSettings } from './types';

/** Spec 025: Ereignisse mit Ton in der Eltern-Ansicht und beim Tickern über den Zuschauer-Link (ohne Spielzeitende). */
export type ParentSoundEvent = Exclude<SoundEvent, 'timeUp'>;
export type ParentSounds = Omit<SoundSettings, 'timeUp'>;

/** Spec 025 R-T4: gespeicherte Eltern-Töne (JSON) lesen; fehlt etwas oder ist es kaputt, gilt die Vorbelegung. */
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
