import { deleteGames } from './db';

/**
 * Spec 013 FR-D07, FR-D08: verzögertes Löschen mit "Rückgängig".
 *
 * Gelöschte Spiele werden zuerst nur vorgemerkt: Historie und Navigationsleiste blenden sie aus, die Datenbank
 * bleibt unberührt. "Rückgängig" verwirft den Vorgang, die Spiele sind damit unverändert wieder da. Endgültig
 * (Datenbank, Meldung an den Live-Sender) wird das Löschen nach 10 Sekunden, beim Verlassen der Historie
 * (`finalizeTrash` beim Aufräumen des Bildschirms), wenn die App in den Hintergrund geht oder ein neuer
 * Vorgang beginnt. Es gibt höchstens einen Vorgang; er lebt nur im Speicher.
 */

export const UNDO_MS = 10_000;

export interface Trash {
  ids: readonly string[];
  /** Ende von "Rückgängig" (ms). */
  until: number;
}

let trash: Trash | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
/** Endgültig gelöscht, aber noch nicht in der Datenbank angekommen: bleibt ausgeblendet. */
const finalizing = new Set<string>();
const listeners = new Set<() => void>();

function changed(): void {
  for (const l of listeners) l();
}

const onVisibility = (): void => {
  if (document.visibilityState === 'hidden') void finalizeTrash();
};
const onPageHide = (): void => void finalizeTrash();

function watchPage(on: boolean): void {
  if (typeof document === 'undefined') return;
  if (on) {
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
  } else {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
  }
}

/** Beendet den Vorgang ohne Datenbankzugriff; liefert die vorgemerkten Kennungen. */
function take(): readonly string[] {
  const ids = trash?.ids ?? [];
  if (trash) {
    clearTimeout(timer);
    watchPage(false);
    trash = null;
  }
  return ids;
}

export function currentTrash(): Trash | null {
  return trash;
}

/** Auszublendende Spiele: vorgemerkte und solche, deren endgültiges Löschen gerade geschrieben wird. */
export function trashedIds(): ReadonlySet<string> {
  return new Set([...(trash?.ids ?? []), ...finalizing]);
}

/** Meldet Vormerken, "Rückgängig" und Ende; liefert die Abmeldung. */
export function onTrashChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Löscht den offenen Vorgang endgültig (Datenbank, Live-Meldung über `onGameWrite`). */
export async function finalizeTrash(): Promise<void> {
  const ids = take();
  if (ids.length === 0) return;
  for (const id of ids) finalizing.add(id);
  changed();
  try {
    await deleteGames(ids);
  } finally {
    // Scheitert das Schreiben, erscheinen die Spiele wieder: im Zweifel bleibt ein Spiel erhalten.
    for (const id of ids) finalizing.delete(id);
    changed();
  }
}

/** Merkt Spiele zum Löschen vor; ein offener Vorgang wird zuerst endgültig. */
export async function trashGames(ids: readonly string[], now = Date.now()): Promise<void> {
  const previous = finalizeTrash();
  if (ids.length > 0) {
    trash = { ids: [...ids], until: now + UNDO_MS };
    timer = setTimeout(() => void finalizeTrash(), UNDO_MS);
    watchPage(true);
    changed();
  }
  await previous;
}

/** "Rückgängig": verwirft den offenen Vorgang, die Spiele bleiben unverändert erhalten. */
export function undoTrash(): void {
  if (take().length > 0) changed();
}
