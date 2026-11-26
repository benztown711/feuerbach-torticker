# Tasks: Spiel läuft schon (Spec 023)

**Input**: `spec.md`, `plan.md`, `research.md` (R-J1 bis R-J7); Mockup https://claude.ai/artifact/T6uhaUepzaREv6b4QjPMkz

Tests zuerst, sie müssen fehlschlagen (Constitution IV). [P] = parallel möglich. Ein PR (#98) für US1 bis US3.

## Phase 1: Grundlagen

- [x] T001 [P] `tests/unit/late-start.test.ts`: `entryChoices`, `entryMinute`, `joinGame` (laufender Abschnitt, Pause, Restzeit 0 und voll, Tore vor Tickerbeginn, Halbzeitstand, nur vor dem ersten Anpfiff, Grenzen)
- [x] T002 [P] `tests/unit/corrections.test.ts`: `restRange`/`setRest` (ersetzt 012-FR-S20-Tests), Verlauf rückt mit, Tore vor Tickerbeginn; `setGoalMinute` entfernt Kennzeichen; `canUndoWhistle` nicht für Einstiegs-Pfiff
- [x] T003 [P] `tests/unit/goals.test.ts`, `share-text.test.ts`, `export.test.ts`, `live-snapshot.test.ts`, `live-takeover.test.ts`, `live-board.test.ts`: "–", Kennzeichen, Sicherung, Live-Meldung
- [x] T004 `src/domain/*` laut Plan (macht T001 bis T003 grün, 100 % Branch-Coverage)

## Phase 2: US1 Ins laufende Spiel einsteigen (P1)

- [x] T005 [US1] E2E `tests/e2e/spiel-laeuft-schon.spec.ts`: 023 US1-S1 bis S10
- [x] T006 [US1] `late-start-sheet.tsx`, `game.tsx`, `new-game.tsx`, `router.ts`, `app.css` (macht T005 grün)
- [x] T007 [US1] Hilfe: neu `spiel-laeuft-schon`; geändert `neues-spiel`, `trikots`

## Phase 3: US2 Spielstand übernehmen (P2)

- [x] T008 [US2] E2E `tests/e2e/spiel-laeuft-schon.spec.ts`: 023 US2-S1 bis S7
- [x] T009 [US2] Anzeige "–"/"vor Tickerbeginn" in Torliste, Tor-Blatt, Spieldetails, Dashboard (macht T008 grün)
- [x] T010 [US2] Hilfe: `torschuetze` geändert

## Phase 4: US3 Uhr korrigieren mit Restzeit (P2)

- [x] T011 [US3] E2E: 023 US3-S1 bis S6; `spieltag-sicher-korrekturen.spec.ts` (012 US4) auf Restzeit umstellen
- [x] T012 [US3] Blatt "Uhr korrigieren" in `game.tsx` (macht T011 grün)
- [x] T013 [US3] Hilfe: `uhr-korrigieren` geändert

## Phase 5: Abschluss

- [ ] T014 `npm run check`, betroffene E2E lokal, `/code-review`, `/security-review`, Design-Check, Screenshots iPhone hell/dunkel an Atti

## Abdeckung

| Anforderung | Aufgaben |
|---|---|
| FR-J01 bis FR-J06 | T001, T004, T005, T006 |
| FR-J10 bis FR-J15 | T001, T003, T004, T008, T009 |
| FR-J20 bis FR-J22 | T002, T004, T011, T012 |
| Hilfe (Constitution IX) | T007, T010, T013 |
