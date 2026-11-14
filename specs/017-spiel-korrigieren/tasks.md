# Tasks: Spiel korrigieren (Spec 017)

**Input**: `spec.md`, `plan.md`, `research.md` (R-C1 bis R-C5), `data-model.md`, `quickstart.md`; Mockup https://claude.ai/artifact/54YB4eDZx23EBH51WRWW9j

Tests zuerst, sie müssen fehlschlagen (Constitution IV). [P] = parallel möglich. Ein PR (#83) für US1 bis US3.

## Phase 1: Grundlagen (blockiert alle User Stories)

- [x] T001 [P] `tests/unit/jersey-colors.test.ts`: `setKits` setzt beide Palettenfarben; ungültige Farbe oder keine Änderung lässt das Spiel unverändert
- [x] T002 [P] `tests/unit/share-text.test.ts`: `markShared` setzt `sharedAt`; `needsReshare` nur bei beendetem, geteiltem Spiel und anderem Teilen-Text (nicht bei gleichem Text, nicht vor dem Teilen, nicht bei laufendem Spiel)
- [x] T003 [P] `tests/unit/live-spieltag.test.ts`: `isRecentGame` (10 zuletzt angelegte je Live-Mannschaft, andere Mannschaften und `livePrivate` zählen nicht, Spiel ohne Live-Mannschaft nie)
- [x] T004 [P] `tests/unit/export.test.ts`: Sicherung mit `sharedAt` gültig, mit ungültigem `sharedAt` abgelehnt
- [x] T005 `src/domain/jersey-colors.ts`, `share-text.ts`, `live-spieltag.ts`, `export.ts`, `types.ts` (macht T001 bis T004 grün, 100 % Branch-Coverage)

## Phase 2: US1 Tore in den Spieldetails korrigieren (P1)

- [ ] T006 [P] [US1] E2E `tests/e2e/spiel-korrigieren.spec.ts`: 017 US1-S1 bis S11
- [ ] T007 [P] [US1] `tests/unit/live-sender.test.ts`: beendetes, in der Sitzung unbekanntes Spiel nur senden, wenn `isRecent` zustimmt; zwei schnelle Korrekturen senden den neuesten Stand (FR-C06)
- [ ] T008 [US1] `src/platform/live-sender.ts`: Abhängigkeit `isRecent`, in `startLiveSender` über `listGames()` und `isRecentGame` (macht T007 grün)
- [ ] T009 [US1] `src/ui/components/goal-editor.tsx` und `team-mark.tsx` aus `game.tsx` herauslösen (R-C1); `game.tsx` nutzt sie, Schnellauswahl nach dem Tor bleibt; bestehende E2E-Tests (001, 003, 009, 012) unverändert grün
- [ ] T010 [US1] `src/ui/screens/game-details.tsx`, `src/styles/app.css`: Tore im Spielverlauf als Knöpfe, "Tor nachtragen", Speichern (macht T006 grün)
- [ ] T011 [US1] Hilfe: neu `spiel-korrigieren`; geändert `torschuetze`, `vorlage-aendern`, `tor-minute`, `tor-nachtragen`, `tor-entfernen`, `historie`

## Phase 3: US2 Trikots ändern (P2)

- [ ] T012 [P] [US2] E2E `tests/e2e/spiel-korrigieren.spec.ts`: 017 US2-S1 bis S7
- [ ] T013 [US2] `src/ui/components/kits-sheet.tsx` (`KitsSheet`, `applyKits`); "…"-Menü "Trikots ändern" in `game.tsx`; Kopfkarte der Spieldetails mit Farbmarken und "Trikots ändern" (macht T012 grün)
- [ ] T014 [US2] Hilfe: `trikots` geändert, `spiel-korrigieren` ergänzt

## Phase 4: US3 Erinnerung an neues Teilen (P2)

- [ ] T015 [P] [US3] E2E `tests/e2e/spiel-korrigieren.spec.ts`: 017 US3-S1 bis S6, dazu Edge Case "Teilen abgebrochen" (keine Leiste)
- [ ] T016 [US3] `src/ui/components/reshare-bar.tsx`; `update` in `game.tsx` und `game-details.tsx` zeigt die Leiste bei `needsReshare`; "Ergebnis teilen" und "Teilen" setzen `sharedAt` (macht T015 grün)
- [ ] T017 [US3] Hilfe: `ergebnis-teilen` geändert

## Phase 5: Abschluss

- [ ] T018 `npm run check`, betroffene E2E lokal (`spiel-korrigieren`, `spieltag-sicher-korrekturen`, `assists`/Vorlagen, `ereignisse`, `us1-entfernen`, `a11y`), `/code-review`, `/security-review`, Screenshots iPhone hell/dunkel an Atti; Roadmap N8, Status in `spec.md`
- [ ] T019 Gerätetest K-1 bis K-3 aus `quickstart.md` mit Atti

## Abdeckung

| Anforderung | Aufgaben |
|---|---|
| FR-C01 bis FR-C05 | T006, T009, T010 |
| FR-C06 | T003, T005, T007, T008, T006 (US1-S10) |
| FR-C10 bis FR-C13 | T001, T005, T012, T013 |
| FR-C20 bis FR-C22 | T002, T004, T005, T015, T016 |
| Hilfe (Constitution IX) | T011, T014, T017 |
| SC-C04 | T001 bis T005 |
| SC-C05 | T009, T018 |
