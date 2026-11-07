/** Spec 012 FR-S02: Zwischenablage lesen, direkt im Tipp (iOS verlangt die Berührung); null = nicht lesbar. */
export function readClipboard(): Promise<string | null> {
  try {
    const read = navigator.clipboard?.readText?.();
    return read ? read.catch(() => null) : Promise.resolve(null);
  } catch {
    return Promise.resolve(null);
  }
}
