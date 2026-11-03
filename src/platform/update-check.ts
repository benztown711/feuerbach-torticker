/** Mindestabstand zwischen zwei Prüfungen (FR-041). */
const MIN_GAP_MS = 60_000;

/**
 * FR-041: Bei jeder Rückkehr in den Vordergrund nach einer neuen Version suchen.
 * iOS hält installierte Web-Apps oft tagelang im Speicher, ohne sie neu zu laden;
 * ohne diese Prüfung erscheint der Update-Hinweis erst nach einem Neustart der App.
 * Ohne Netz schlägt `update()` fehl; das wird bewusst ignoriert.
 */
export function checkOnForeground(
  registration: { update(): Promise<unknown> },
  doc: Document = document,
  now: () => number = Date.now,
): () => void {
  let last = Number.NEGATIVE_INFINITY;
  const onChange = (): void => {
    if (doc.visibilityState !== 'visible') return;
    const t = now();
    if (t - last < MIN_GAP_MS) return;
    last = t;
    registration.update().catch(() => undefined);
  };
  doc.addEventListener('visibilitychange', onChange);
  return () => doc.removeEventListener('visibilitychange', onChange);
}
