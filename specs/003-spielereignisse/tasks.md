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

- [x] E101 [P] `tests/unit/cards-subs.test.ts`: Karten (eigener Spieler, Gegner-Freitext, ohne Spieler, Kommentar, ungültige Kombinationen, angehaltene Uhr, bearbeiten, löschen), Wechsel (gleicher Spieler ungültig, nach Schlusspfiff nicht, bearbeiten), Zeilen "Karten:"/"Wechsel:" chronologisch, gelöschte Spieler lesbar, Schalter-Migration (FR-E02 bis FR-E04, FR-E07)
- [x] E102 `src/domain/events.ts` (`addCard`, `updateCard`, `addSub`, `updateSub`, `replaceEvent`, `cardText`, `subText`, `eventsShareLines`), `types.ts` (Ereignis-Union), Teilen-Text, Zeitleiste (macht E101 grün)
- [x] E103 [P] `tests/unit/export.test.ts` und `contracts/export.schema.json`: Karten und Wechsel in der Sicherung, ungültige abgelehnt
- [x] E104 [P] E2E `tests/e2e/karten-wechsel.spec.ts`: 003 US3-S1 bis S6, US4-S1 bis S4, FR-E06 Griff, FR-033 mit allen Schaltern
- [x] E105 UI: Schalter `feature-cards`/`feature-subs`, Kacheln `event-card-<art>`/`event-sub`, `card-sheet`, `sub-sheet`, `event-actions` (Ändern, Entfernen mit Abfrage), `event-toast`/`event-undo`, Griff `list-grip`, Spieldetails (macht E104 grün)

## Teil 3: Pokal

- [x] E201 [P] `tests/unit/cup.test.ts`: Abfrage nur bei Unentschieden, "Unentschieden" beendet sie; Verlängerung (Abschnittslängen, Minuten ab Ende der regulären Spielzeit, Nachspielzeit, Bezeichnungen, "n. V." im Text, danach nur Elfmeterschießen, nur einmal, Zwischenstand vor/zwischen den Hälften); Elfmeterschießen (abwechselnd, beginnende Mannschaft, Schütze normalisiert, Rückgängig, entschieden, Sudden Death, "x:y i. E." Heim zuerst, S/N in der Historie)
- [x] E202 `src/domain/cup.ts`, `minute.ts` (`totalSections`, `sectionMinutesOf`), `clock.ts` (Ereignis `extraTime`), `game.ts`, `history.ts`, `share-text.ts` (macht E201 grün)
- [x] E203 [P] `tests/unit/export.test.ts` und `contracts/export.schema.json`: Verlängerung, Abfrage und Elfmeterschießen in der Sicherung
- [x] E204 [P] E2E `tests/e2e/pokal.spec.ts`: 003 US5-S1 bis S5, US6-S1 bis S5, FR-033; Helfer `acceptDraw` für bestehende Tests mit Unentschieden
- [x] E205 UI: `draw-dialog` (`draw-accept`, `draw-extra`, `draw-shootout`), `extra-sheet`, `first-dialog`, `ShootoutView` (`pen-*`), `shootout-result`, Spieldetails mit Schützen (macht E204 grün)
