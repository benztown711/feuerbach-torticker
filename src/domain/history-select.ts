import type { Game } from './types';

/**
 * Spec 013: Auswahl in der Historie zum Löschen mehrerer Spiele.
 * Die Auswahl ist eine Menge von Spiel-Kennungen und lebt nur auf dem Bildschirm.
 */

/** FR-D02, FR-D03: nur beendete Spiele mit Ergebnis (kein laufendes Elfmeterschießen), wie S/U/N in der Liste. */
export function isSelectable(game: Game): boolean {
  return game.status === 'finished' && game.shootout?.done !== false;
}

/** FR-D02: hakt ein auswählbares Spiel an bzw. ab; andere Spiele bleiben unverändert. */
export function toggleSelected(selected: ReadonlySet<string>, game: Game): ReadonlySet<string> {
  if (!isSelectable(game)) return selected;
  const next = new Set(selected);
  if (!next.delete(game.id)) next.add(game.id);
  return next;
}

/** FR-D04: alle auswählbaren der (sichtbaren) Spiele sind angehakt, mindestens eines. */
export function allSelected(games: readonly Game[], selected: ReadonlySet<string>): boolean {
  const ids = games.filter(isSelectable).map((g) => g.id);
  return ids.length > 0 && ids.every((id) => selected.has(id));
}

/** FR-D04, FR-D05: "Alle auswählen" hakt alle auswählbaren an, "Alle abwählen" leert die Auswahl. */
export function toggleAll(games: readonly Game[], selected: ReadonlySet<string>): ReadonlySet<string> {
  if (allSelected(games, selected)) return new Set();
  return new Set(games.filter(isSelectable).map((g) => g.id));
}

/** FR-D05: nach einem Filterwechsel bleiben nur angehakte Spiele, die sichtbar und auswählbar sind. */
export function pruneSelection(games: readonly Game[], selected: ReadonlySet<string>): ReadonlySet<string> {
  return new Set(games.filter((g) => isSelectable(g) && selected.has(g.id)).map((g) => g.id));
}

/** "1 Spiel", sonst "n Spiele" (Abfrage, Leiste "… gelöscht", Kopfzeile). */
export function countLabel(n: number): string {
  return n === 1 ? '1 Spiel' : `${n} Spiele`;
}
