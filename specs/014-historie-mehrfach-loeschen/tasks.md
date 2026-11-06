# Tasks: Historie – mehrere Spiele auf einmal löschen (Spec 014)

**Input**: `spec.md`, `plan.md` in diesem Ordner; Mockup.

Tests zuerst, müssen fehlschlagen. [P] = parallel möglich.

## Phase 1: Grundlagen

- [x] D001 [P] `tests/unit/history-select.test.ts`: auswählbar (beendet, laufend, angelegt, Elfmeterschießen offen/fertig), anhaken/abhaken, nicht auswählbare ignorieren, alle an/ab, leere Liste, Auswahl beim Filterwechsel kürzen, `countLabel`
- [x] D002 `src/domain/history-select.ts` (macht D001 grün, 100 % Branch-Coverage)
- [x] D003 [P] `tests/unit/db.test.ts`: `deleteGames` löscht mehrere in einer Transaktion und meldet je Spiel `delete` mit Spiel; unbekannte Kennung ohne Fehler
- [x] D004 `deleteGames` in `src/platform/db.ts` statt `deleteGame` (macht D003 grün)
- [x] D005 [P] `tests/unit/trash.test.ts`: vormerken, `trashedIds`, Rückgängig ohne Datenbankzugriff, endgültig nach 10 Sekunden, bei `visibilitychange` hidden und `pagehide`, neuer Vorgang macht den alten endgültig, Beobachter
- [x] D006 `src/platform/trash.ts` (macht D005 grün)

## Phase 2: US1 und US2 Auswählen, alle auswählen, löschen

- [x] D007 [P] E2E `tests/e2e/historie-loeschen.spec.ts`: 014 US1-S1 bis S8, US2-S1 bis S6
- [x] D008 `history.tsx` und `app.css`: Auswahlmodus, Leiste, Abfrage, Ausblenden vorgemerkter Spiele, Aufräumen beim Verlassen (FR-D01 bis FR-D06, FR-D10)
- [x] D009 Hilfe `spiele-loeschen-mehrere` (neu), `historie` (verwandt) (014 US1, US2)

## Phase 3: US3 Rückgängig

- [x] D010 [P] E2E `tests/e2e/historie-loeschen.spec.ts`: 014 US3-S1 bis S6; `tests/e2e/live-us2.spec.ts`: 014 US3-S7 zusammen mit 006 US2-S7
- [x] D011 `history.tsx` Leiste "… gelöscht" mit "Rückgängig"; `game-details.tsx` Abfragetext und Vormerken; `nav-bar.tsx` (FR-D07 bis FR-D09)
- [x] D012 Hilfe `spiel-loeschen` (geändert) (014 US3)

## Phase 4: Abschluss

- [x] D013 axe-Prüfung des Auswahlmodus und der Leiste "… gelöscht" in hell und dunkel (`tests/e2e/a11y.spec.ts`, SC-D04)
- [x] D014 Lint, Typen, Unit mit Coverage, Hilfe-Abdeckung, Kontrast, Budget, E2E lokal (Android-Profil)
- [ ] D015 Screenshots iPhone hell/dunkel an Atti (Review C)
