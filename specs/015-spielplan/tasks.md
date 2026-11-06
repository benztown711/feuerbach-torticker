# Tasks: Spielplan im Live-Spieltag (Spec 015)

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/plan-message.md`; Mockup.

Tests zuerst, müssen fehlschlagen. [P] = parallel möglich. Ein PR je Phase bzw. User Story; dieser Arbeitsbranch beginnt mit Phase 1 bis 3 (US1).

## Phase 1: Grundlagen (Domain und Meldung)

- [ ] T001 [P] `tests/unit/plan.test.ts`: Eingabe prüfen (Pflichtfelder, Längen, Datum, Anstoß, Spielzeit), anlegen und ändern (`updatedAt` streng steigend), absagen und wieder ansetzen, löschen als Grabstein, zusammenführen (jüngere gewinnt, verschiedene Spiele bleiben, Grabstein schlägt älteres), Ansicht (kommend gruppiert und sortiert, vergangen neueste zuerst, ohne Grabsteine), Kürzen (100 Einträge, Grabsteine nach 30 Tagen), "erneut senden?" (6 Stunden, `pending`), Stückeln (≤ 3.000 Zeichen), Nutzlast prüfen (strikt, unbekannte Schlüssel ignoriert), Beschriftung ("E1 – Gegner", "E1 bei Gegner", "(Gegner offen)")
- [ ] T002 `src/domain/plan.ts`, Typen `PlanEntry`, `PlanStore` in `src/domain/types.ts` (macht T001 grün, 100 % Branch-Coverage)
- [ ] T003 [P] `tests/unit/live-crypto.test.ts`: Feld `p` versiegeln und öffnen, falsche Signatur und zu langes `d` verworfen; `tests/unit/live-receiver.test.ts`: `onPlan` erhält geprüfte Nutzlast
- [ ] T004 `src/domain/live-validate.ts` (`isSignedData` mit Grenze, `MAX_PLAN_SIGNED`), `src/platform/live-crypto.ts` (`plan`), `src/platform/live-receiver.ts` (`onPlan`) (macht T003 grün)

## Phase 2: Speicher und Abgleich

- [ ] T005 `src/platform/db.ts`: `getPlan`, `putPlan` (Schlüssel `plan`)
- [ ] T006 `src/platform/live-events.ts`: `onPlanChanged`, `planChanged`
- [ ] T007 `src/platform/plan-sync.ts`: `loadPlan(live)`, `changePlan(change)` (speichern, senden, sonst `pending`), `adoptPlan(json, live)`, `refreshPlan()`, Neu ausstellen übernimmt den Plan; `live-watch.ts`: `onPlan` für Trainer-Handys, `watchPlan`; `main.tsx`: `refreshPlan` beim Start und bei Rückkehr
- [ ] T008 `tests/e2e/live-helpers.ts`: Decoder kennt `p`

## Phase 3: US1 Spielplan pflegen (P1) MVP

- [ ] T009 [P] E2E `tests/e2e/spielplan-us1.spec.ts`: 015 US1-S1 bis S7, 015 FR-P07 (erneut senden nach 6 Stunden)
- [ ] T010 `src/ui/router.ts`, `src/ui/app.tsx`: Route `#/live-spieltag/spielplan` (nachgeladen); `specs/006-live-spieltag/contracts/ui-contract.md` ergänzen
- [ ] T011 `src/ui/screens/spielplan.tsx`: Liste mit Datumsköpfen und "Vergangene Spiele", Blatt "Planspiel" (Mannschaft, Datum, Anstoß, Gegner, Heim/Auswärts, Wettbewerb, Spielzeit), "Abgesagt"/"Wieder ansetzen", "Löschen" mit Rückfrage
- [ ] T012 `src/ui/screens/live.tsx`: Karte "Spielplan" mit nächstem Spiel (Trainer- und Lead-Handys)
- [ ] T013 Hilfe `spielplan` neu, `live-verwalten` geändert (015 US1)

## Phase 4: US2 Spiel aus dem Spielplan (P1)

- [ ] T014 E2E 015 US2-S1 bis S6; Domain: Vorbelegung aus Planspiel, Verknüpfung `gameId` (FR-P09 bis P11)
- [ ] T015 `new-game.tsx`: Abschnitt "Aus dem Spielplan", Hinweis, Verknüpfung; Hilfe `spiel-aus-plan`, `neues-spiel`

## Phase 5: US6 Spiel vormerken (P2)

- [ ] T016 E2E 015 US6-S1 bis S7; Domain: Vormerkung, Name (FR-P25 bis P28)
- [ ] T017 Spielplan-Blatt "Ich tickere", Rückfragen, Startbildschirm "Heute tickerst du"; Hilfe `spiel-vormerken`

## Phase 6: US3 und US7 Dashboard (P2)

- [ ] T018 E2E 015 US3-S1 bis S6, US7-S1 bis S4; Domain `live-board.ts`: Planspiele, Ordnung, "Danach", "Nächstes Spiel", Endstand (FR-P12 bis P15, FR-P30)
- [ ] T019 `live-dashboard.tsx`: Karten, Zeilen, Abschnitt "Spielplan"; Eltern-Empfänger übernimmt `p`; Hilfe `eltern-dashboard`

## Phase 7: US4 Liste einfügen und teilen (P2)

- [ ] T020 E2E 015 US4-S1 bis S5; Domain: Einfügeformat lesen und schreiben (FR-P16 bis P19)
- [ ] T021 Spielplan "Liste einfügen" mit Vorschau, "Spielplan teilen"; Hilfe `spielplan-liste`, `spielplan-fehlt`

## Phase 8: US5 Kader (P3)

- [ ] T022 E2E 015 US5-S1 bis S5; Domain Kader (FR-P20 bis P23), Sicherung (FR-P24, `export.schema.json`)
- [ ] T023 Kader-Seite, Mannschaft, Aufgebot "Weitere Kinder"; Hilfe `kader-mehrere`, `kader`, `kader-liste`, `mannschaft`, `aufgebot`

## Abschluss je PR

- [ ] T024 `npm run check`, betroffene E2E lokal (Android-Profil), `/code-review`, `/security-review`, Screenshots iPhone hell/dunkel an Atti (Review C)
