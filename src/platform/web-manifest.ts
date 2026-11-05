import { viewerManifest, type WebManifest } from '../domain/web-manifest';
import { APP_MANIFEST, setManifest } from './manifest-link';

/**
 * Manifest der App, beim Build von Vite eingesetzt (vite.config.ts `define`); fehlt in Unit-Tests. Nur im
 * nachgeladenen Dashboard genutzt, damit das Hauptbundle klein bleibt (R-L7).
 */
declare const __MANIFEST__: WebManifest | undefined;

/**
 * Spec 006 FR-L16: Solange die Seite des Zuschauer-Links offen ist, nennt das Manifest den Zuschauer-Link
 * (`path`, z. B. "/live/<Daten>") als Startadresse, damit "Zum Home-Bildschirm" das Dashboard ablegt und nicht
 * den Startbildschirm. Die zurückgegebene Funktion setzt wieder das Manifest der App.
 */
export function pointManifestTo(path: string): () => void {
  if (typeof __MANIFEST__ !== 'object') return () => undefined;
  const appUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  // blob: statt data:: Safari lädt Manifeste im CORS-Modus, eine data:-Adresse gilt dort als fremde Herkunft
  // und scheitert; eine blob:-Adresse hat die Herkunft der Seite. Entsteht im Browser, nichts geht ans Netz.
  const json = JSON.stringify(viewerManifest(__MANIFEST__, appUrl, path));
  const href = URL.createObjectURL(new Blob([json], { type: 'application/manifest+json' }));
  setManifest(href);
  return () => {
    setManifest(APP_MANIFEST);
    URL.revokeObjectURL(href);
  };
}
