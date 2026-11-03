# Tasks: Spielereignisse und Pokal (Spec 003)

Tests zuerst, müssen fehlschlagen. [P] = parallel möglich.

## Teil 1: Lesezeichen und Elfmeter

- [x] E001 [P] `tests/unit/events.test.ts`: Lesezeichen setzen (laufend, Nachspielzeit, angehalten, Pause; nicht vor Anpfiff und nach Schlusspfiff), Kommentar, Löschen, ältere Spiele, `marksText`, nie im Teilen-Text, Zeitleiste; Elfmeter setzen/abwählen, Gegentor mit Freitext, Ausschluss Eigentor; Schalter-Vorgaben (FR-E01, FR-E02, FR-E05, FR-E07, FR-E08)
- [x] E002 `src/domain/events.ts`, `goals.ts` (`setPenalty`, `goalSuffix`), `share-text.ts`, `history.ts` (Zeitleiste), `settings.ts` (`features`, `anyEventFeature`), `types.ts` (macht E001 grün)
- [x] E003 [P] `tests/unit/export.test.ts`: Sicherung mit Lesezeichen und Elfmeter nach Schema, Einlesen, ungültige Werte abgelehnt
- [x] E004 `contracts/export.schema.json` und `src/domain/export.ts` (macht E003 grün)
- [x] E005 [P] E2E `tests/e2e/ereignisse.spec.ts`: 003 US2-S1 bis S6, US1-S1/S3, SC-E03 mit FR-033
- [x] E006 UI: Schalter "Lesezeichen" (`feature-marks`), Knopf `btn-event`, `event-sheet`/`event-mark`, `mark-toast` mit `mark-comment`/`mark-undo`, `mark-comment-sheet`, `mark-actions`, Liste mit `mark-row-<id>`, `goal-penalty`, Spieldetails `marks-preview`/`btn-copy-marks` (macht E005 grün)

## Teil 2: Karten und Wechsel

- [ ] E101 Tests und Umsetzung FR-E02 (Schalter Karten, Wechsel), FR-E03, FR-E04, FR-E06 (Griff), FR-E07 (Zeilen "Karten:" und "Wechsel:")

## Teil 3: Pokal

- [ ] E201 Tests und Umsetzung FR-P01 (Abfrage), FR-P02 (Verlängerung), FR-P03 (Elfmeterschießen mit Schützenwahl, TV-Übersicht, Schützen aufklappbar und in den Spieldetails)
