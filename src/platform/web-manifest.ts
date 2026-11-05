import { manifestDataUrl, viewerManifest, type WebManifest } from '../domain/web-manifest';

/** Manifest der App, beim Build von Vite eingesetzt (vite.config.ts `define`); fehlt im Entwicklungsmodus. */
declare const __MANIFEST__: WebManifest | undefined;

/**
 * Spec 006 FR-L16: Solange die Seite des Zuschauer-Links offen ist, zeigt der Manifest-Verweis auf ein Manifest
 * mit dem Zuschauer-Link (`path`, z. B. "/live/<Daten>") als Startadresse, damit "Zum Home-Bildschirm" das
 * Dashboard ablegt und nicht den Startbildschirm. Die zurückgegebene Funktion stellt das Manifest der App wieder her.
 */
export function pointManifestTo(path: string): () => void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link || typeof __MANIFEST__ !== 'object') return () => undefined;
  // Einmal gemerkt: auch nach einem Wechsel zwischen zwei Zuschauer-Links zurück zum Manifest der App.
  const own = (link.dataset.appManifest ??= link.getAttribute('href') ?? '');
  const appUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  link.setAttribute('href', manifestDataUrl(viewerManifest(__MANIFEST__, appUrl, path)));
  return () => link.setAttribute('href', own);
}
