# Tasks: Startbildschirm mit "E2 übernehmen" und "Spiele verfolgen" (018)

## Phase 1: US1 Spiele verfolgen (P1)

- [x] T001 [US1] E2E 018 US1-S1, S2, S4, S5, S7 in `tests/e2e/startbildschirm.spec.ts`; Tests mit "Live: …" auf "Spiele verfolgen" umstellen
- [x] T002 [US1] "Spiele verfolgen" in `src/ui/screens/start.tsx`, Zeile "Live: …" entfernen, Styles `.start__opt` in `src/styles/app.css`
- [x] T003 [US1] Hilfe: neu `spiele-verfolgen`; geändert `trainer-link`, `navigation` in `src/domain/help-entries.ts`

## Phase 2: US2 Spiel übernehmen (P2)

- [x] T004 [US2] Unit-Tests `takeoverOffers` in `tests/unit/live-board.test.ts`, dann `src/domain/live-board.ts`
- [x] T005 [US2] `watchStart` in `src/platform/live-watch.ts`
- [x] T006 [US2] E2E 018 US2-S1 bis S10 in `tests/e2e/startbildschirm.spec.ts`
- [x] T007 [US2] `src/ui/components/start-offers.tsx` (nachgeladen), Rückfrage, Übernahme
- [x] T008 [US2] Hilfe: `spiel-uebernehmen` geändert

## Phase 3: Abschluss

- [x] T009 axe hell und dunkel für Startbildschirm und Rückfrage
- [x] T010 Nachträge Spec 012 FR-S04, Spec 006 FR-L17; Roadmap N9
- [ ] T011 Review C (Atti): Screenshots iPhone hell und dunkel, Live-Test
