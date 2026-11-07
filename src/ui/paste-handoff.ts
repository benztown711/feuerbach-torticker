/**
 * Spec 016 FR-B15: eine erkannte Kader-Liste aus "Link einfügen" an "Mehr" → "Kader" übergeben, wo die Vorschau
 * von "Liste einfügen" sie zeigt. Nur im Speicher, einmal abholbar.
 */
let pending: string | null = null;

export function handOffList(text: string): void {
  pending = text;
}

export function takeList(): string | null {
  const t = pending;
  pending = null;
  return t;
}
