/** Datei des App-Manifests (vite-plugin-pwa). */
export const APP_MANIFEST = `${import.meta.env.BASE_URL}manifest.webmanifest`;

/**
 * Setzt den Manifest-Verweis und legt ihn beim ersten Mal an. Safari lädt das Manifest, sobald der Verweis
 * eingefügt ist, und behält dieses erste für die ganze Seite (WebKit `DocumentLoader::loadApplicationManifest`);
 * spätere Änderungen sieht nur Chrome. Darum steht im HTML kein Verweis (vite.config.ts), und der erste muss stimmen.
 */
export function setManifest(href: string): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (link) {
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
    return;
  }
  const created = document.createElement('link');
  created.rel = 'manifest';
  created.setAttribute('href', href);
  document.head.append(created);
}
