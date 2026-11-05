# Implementation Plan: Historie – mehrere Spiele auf einmal löschen

**Branch**: `013-historie-mehrfach-loeschen` (Arbeitsbranch `claude/charming-einstein-v3f3aw`) | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/WwNnBCdbaEVFLPjedwcyGs

## Summary

Die Historie bekommt einen Auswahlmodus ("Auswählen", Häkchen je Zeile, "Alle auswählen", "Löschen (n)") und nach jedem Löschen 10 Sekunden "Rückgängig". Gelöscht wird verzögert: Die Spiele verschwinden sofort aus der Anzeige, aus der Datenbank (und damit vom Eltern-Dashboard) erst, wenn das Löschen endgültig ist. "Rückgängig" muss dadurch nichts zurückschreiben und stellt die Spiele garantiert unverändert wieder her (SC-D03). Die Auswahllogik liegt in einem neuen Domain-Modul, das verzögerte Löschen in einem kleinen Plattform-Modul.

## Technical Context

Unverändert gegenüber `specs/001-spiel-erfassen/plan.md` (TypeScript, Preact, Vitest mit fake-indexeddb, Playwright). Keine neue Abhängigkeit. Ein PR für US1 bis US3 (eine Phase, ein Arbeitsbranch), Commits je Baustein.

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Keine Geste als einziger Weg (Knopf "Auswählen"); ganze Zeile ist Tippfläche; Knöpfe mindestens 48 pt; eine Abfrage, keine Kaskade; "Rückgängig" ohne weitere Abfrage | erfüllt |
| II. Offline-first | alles lokal; Live-Meldung "gelöscht" wie bisher, nur später (FR-D08) | erfüllt |
| III. Datensparsamkeit | keine neuen Daten; Auswahl und Löschvorgang leben nur im Speicher | erfüllt |
| IV. Test-first | Unit-Tests für `history-select.ts` (100 % Branch-Coverage) und `trash.ts`; E2E je Akzeptanzszenario ("013 USx-Sy") | erfüllt |
| VI. Einfachheit | kein neues Datenfeld, kein Papierkorb in der Datenbank; Zustand im Speicher, 10 Sekunden | erfüllt |
| VII. Vereinsdesign | nur bestehende Tokens; Hauptknopf "Löschen (n)" in `rot-tief` (FR-G06a), Häkchen-Feld eckig in `ink` | erfüllt |
| IX. Hilfe | 1 neuer, 2 geänderte Einträge im selben PR | erfüllt |

## Design

### Domain (`src/domain/history-select.ts`, neu)

- `isSelectable(game)`: beendet und kein laufendes Elfmeterschießen (gleiche Grenze wie S/U/N in `historyEntry`).
- `toggleSelected(selected, game)`: hakt ein auswählbares Spiel an bzw. ab; andere bleiben unverändert.
- `allSelected(games, selected)`: alle auswählbaren der übergebenen (sichtbaren) Spiele sind angehakt, mindestens eines.
- `toggleAll(games, selected)`: alle auswählbaren anhaken bzw., wenn schon alle angehakt sind, leeren (FR-D04, FR-D05).
- `pruneSelection(games, selected)`: nur angehakte, die unter den übergebenen Spielen auswählbar sind (Filterwechsel, FR-D05).
- `countLabel(n)`: "1 Spiel" / "n Spiele" (Abfrage, Leiste, Kopfzeile).

### Verzögertes Löschen (`src/platform/trash.ts`, neu)

- Höchstens ein Löschvorgang `{ ids, until }` im Speicher, Abmeldbare Beobachter (`onTrashChange`).
- `trashGames(ids, now)`: macht einen offenen Vorgang zuerst endgültig, merkt den neuen vor und startet einen Zeitgeber über 10 Sekunden (FR-D07, FR-D08).
- `undoTrash()`: verwirft den Vorgang; die Datenbank bleibt unberührt.
- `finalizeTrash()`: löscht die Spiele in einer Transaktion (`deleteGames` in `db.ts`) und meldet je Spiel `delete` an die Beobachter von `onGameWrite` (Live-Sender, FR-L06).
- `trashedIds()`: Kennungen des offenen Vorgangs, damit Historie und Navigationsleiste sie ausblenden.
- Endgültig bei: Zeitgeber, `visibilitychange` (hidden) und `pagehide`, Verlassen der Historie (Aufräumen des Bildschirms), neuem Vorgang.

### Datenbank (`src/platform/db.ts`)

- `deleteGames(ids)` ersetzt `deleteGame(id)`: eine Transaktion, je Spiel `notify({ kind: 'delete', id, game })`.

### Oberfläche

| Datei | Änderung |
|---|---|
| `src/ui/screens/history.tsx` | Kopfzeile "Auswählen"/"Fertig" und "n ausgewählt"; Zeilen im Auswahlmodus als `role="checkbox"` mit Häkchen-Feld, laufende ausgegraut (`aria-disabled`); Hinweis bei sichtbaren offenen Spielen; Leiste "Alle auswählen"/"Alle abwählen" und "Löschen (n)" über der Navigation; Abfrage (`Confirm`); Leiste "n Spiele gelöscht" mit "Rückgängig"; blendet vorgemerkte Spiele aus; beim Verlassen `finalizeTrash()` (FR-D01 bis FR-D10) |
| `src/ui/screens/game-details.tsx` | Abfragetext (FR-D09); "Löschen" merkt vor und öffnet die Historie (US3-S6) |
| `src/ui/components/nav-bar.tsx` | ein vorgemerktes laufendes Spiel zeigt kein "Läuft …"; nach "Rückgängig" wieder (Beobachter) |
| `src/styles/app.css` | Häkchen-Feld, gewählte Zeile (`tonal`), Aktions- und Rückgängig-Leiste über der Navigation, Platz unter der Liste |
| `src/domain/help-entries.ts` | Einträge laut Spec-Abschnitt "Hilfe" |

## Risiken

- **Bestehender Test 006 US2-S7**: erwartet "deleted" 6 Sekunden nach dem Löschen. Laut FR-D08 kommt es erst nach dem Ende von "Rückgängig"; der Test wartet länger und prüft zusätzlich, dass vorher nichts gemeldet wird (013 US3-S7). Die Erwartung selbst bleibt.
- **App wird während der 10 Sekunden abgeschossen**: Dann sind die Spiele beim nächsten Start noch da (Spec, Edge Cases). Beim normalen Wechsel in den Hintergrund wird vorher endgültig gelöscht.
- **Reihenfolge beim Verlassen der Historie**: Die Lösch-Transaktion startet im Aufräumen des Bildschirms, also vor dem Lesen des nächsten Bildschirms; IndexedDB arbeitet Transaktionen auf demselben Speicher in Startreihenfolge ab.
