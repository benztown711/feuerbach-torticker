import type { Settings } from '../domain/types';

/**
 * Spec 006 US5: meldet geänderte Live-Einstellungen (verwaltet auf diesem Handy oder von einem anderen
 * Trainer-Handy übernommen), damit offene Bildschirme sie neu lesen. Ohne Abhängigkeiten, damit das
 * Hauptbundle es laden kann, ohne die Krypto mitzunehmen.
 */

type Listener = (settings: Settings) => void;
const listeners = new Set<Listener>();

export function onLiveSettings(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function liveSettingsChanged(settings: Settings): void {
  for (const l of listeners) l(settings);
}
