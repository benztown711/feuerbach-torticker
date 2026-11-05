# Tasks: Feinschliff der Gestaltung (Spec 011)

**Input**: `spec.md`, `plan.md` in diesem Ordner; Mockup.

Tests zuerst, müssen fehlschlagen. [P] = parallel möglich.

## Phase 1: Tokens und Domäne

- [x] G001 [P] `tests/unit/contrast.test.ts`: Paare für `card`, `canvas`, `tonal`, `field` in der Matrix erwartet (SC-G01)
- [x] G002 Tokens `canvas`, `card`, `tonal`, `field`, `scrim` in `design/tokens.json`; Paare in `scripts/check-contrast.ts`; Begründung in `design/README.md` (macht G001 grün, FR-G10)
- [x] G003 [P] `tests/unit/history.test.ts`: `groupByMonth` leer, ein Monat, Monatswechsel, Rückkehr in einen Monat (FR-G09)
- [x] G004 `groupByMonth` in `src/domain/history.ts` (macht G003 grün)

## Phase 2: Oberfläche

- [x] G005 [P] E2E `tests/e2e/gestaltung.spec.ts`: 011 US1-S1 bis S8, US2-S1 bis S3, US3-S1, US4-S1/S2, FR-G07, SC-G05
- [x] G006 `src/styles/app.css`: Grundfläche, `card`, Flächen-Kontext, Felder, ruhige Knöpfe, Hauptknopf, Reiter, Abdunkler, Torliste (FR-G01, G02, G04 bis G08)
- [x] G007 Markup: `settings.tsx`, `new-game.tsx`, `roster.tsx`, `history.tsx`, `game-details.tsx`, `more.tsx`, `help.tsx`, `live.tsx` (FR-G01 bis G03, G08, G09; macht G005 grün)
- [x] G007a Hilfe-Einträge `historie`, `neues-spiel`, `darstellung`, `navigation` mit Quellen 011 US1 bis US4 (Constitution IX)

## Phase 3: Abschluss

- [x] G008 Lint, Typen, Unit mit Coverage, Kontrast, Budget, E2E lokal (Android-Profil)
- [ ] G009 Neue Referenzbilder für den visuellen Vergleich aus dem CI-Lauf übernehmen (R-22)
- [ ] G010 Screenshots iPhone hell/dunkel an Atti (Review C)
