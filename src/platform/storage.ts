import type { Theme } from '../domain/types';

/** FR-023: dauerhaften Speicher anfragen (Safari löscht sonst Daten von Webseiten nach 7 Tagen). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Läuft die App vom Home-Bildschirm? */
export function isStandalone(): boolean {
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

/** FR-018: Theme setzen; "system" folgt prefers-color-scheme. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

/** Ist gerade das dunkle Theme aktiv (für Rahmen um Trikotfarben, FR-032)? */
export function isDarkTheme(): boolean {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'dark') return true;
  if (forced === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
