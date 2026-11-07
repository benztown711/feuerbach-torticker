import type { PlanStore, Settings } from '../domain/types';

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

/** Spec 015: Spielplan geändert (auf diesem Handy oder von einem anderen Trainer-Handy übernommen). */
type PlanListener = (plan: PlanStore) => void;
const planListeners = new Set<PlanListener>();

export function onPlanChanged(cb: PlanListener): () => void {
  planListeners.add(cb);
  return () => {
    planListeners.delete(cb);
  };
}

export function planChanged(plan: PlanStore): void {
  for (const l of planListeners) l(plan);
}

/** Spec 016: geteilte Kader von einem anderen Trainer-Handy übernommen (Kader-Seite liest neu). */
const squadListeners = new Set<() => void>();

export function onSquadsChanged(cb: () => void): () => void {
  squadListeners.add(cb);
  return () => {
    squadListeners.delete(cb);
  };
}

export function squadsChanged(): void {
  for (const l of squadListeners) l();
}

/** Spec 016 FR-B09: kurzer Hinweis für die ganze App ("Kader übernommen: …"). */
const noticeListeners = new Set<(text: string) => void>();

export function onSquadNotice(cb: (text: string) => void): () => void {
  noticeListeners.add(cb);
  return () => {
    noticeListeners.delete(cb);
  };
}

export function squadNotice(text: string): void {
  for (const l of noticeListeners) l(text);
}
