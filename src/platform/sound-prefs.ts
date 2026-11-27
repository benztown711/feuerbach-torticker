import { parentSounds, type ParentSounds } from '../domain/parent-sounds';

/** Spec 025 R-T4: Töne der Eltern-Ansicht auf diesem Gerät (neben dem Schalter "Töne" aus Spec 020). */
const KEY = 'torticker-parent-sounds';

export function loadParentSounds(): ParentSounds {
  try {
    return parentSounds(window.localStorage.getItem(KEY));
  } catch {
    return parentSounds(null);
  }
}

/** Privates Surfen: gilt nur bis zum Neuladen (Spec 025 Edge Cases). */
export function saveParentSounds(s: ParentSounds): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Speicher gesperrt
  }
}
