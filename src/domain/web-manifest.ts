/** Web-App-Manifest (nur die Felder, die die App setzt oder anpasst). */
export interface WebManifest {
  id?: string;
  start_url: string;
  scope: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
  [field: string]: unknown;
}

/**
 * Spec 006 FR-L16: Manifest für die Seite des Zuschauer-Links. iOS übernimmt beim "Zum Home-Bildschirm" die
 * Startadresse aus dem Manifest, nicht die aktuelle Adresse; die Home-Bildschirm-App sieht außerdem keine
 * Daten aus Safari. Startadresse ist darum der Zuschauer-Link selbst. `id` bleibt die der App (keine zweite
 * App auf Android). Alle Adressen absolut, weil eine data:-Adresse keine Basis für relative Pfade hat.
 */
export function viewerManifest(base: WebManifest, appUrl: string, path: string): WebManifest {
  return {
    ...base,
    id: appUrl,
    start_url: `${appUrl}#${path}`,
    scope: appUrl,
    icons: base.icons.map((icon) => ({ ...icon, src: new URL(icon.src, appUrl).href })),
  };
}

/** Manifest als data:-Adresse: entsteht im Browser, keine Anfrage an den Server, Schlüssel bleiben auf dem Gerät. */
export const manifestDataUrl = (m: WebManifest): string =>
  `data:application/manifest+json,${encodeURIComponent(JSON.stringify(m))}`;
