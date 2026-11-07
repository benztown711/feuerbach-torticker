/**
 * Was die App bei einer neuen Version tut (T028, research.md R-7; Spec 007 FR-N09, R-N9):
 * - Seite des Zuschauer-Links: sofort neu laden, dort gibt es keine Eingaben, die verloren gehen könnten.
 * - Im Spiel: Hinweis zurückhalten.
 * - Sonst: Hinweis "Neue Version verfügbar" mit "Neu laden" und "Später".
 */
export type UpdateAction = 'reload' | 'prompt' | 'none';

export function updateAction(route: string, needRefresh: boolean): UpdateAction {
  if (!needRefresh) return 'none';
  if (route === 'liveView') return 'reload';
  return route === 'game' ? 'none' : 'prompt';
}
