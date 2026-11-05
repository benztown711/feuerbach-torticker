# Tasks: Spieltag sicher (Spec 012)

**Input**: `spec.md`, `plan.md` in diesem Ordner; Mockup.

Tests zuerst, müssen fehlschlagen. [P] = parallel möglich.

## Phase 1: Domain

- [x] S001 [P] `tests/unit/corrections.test.ts`: Laufstrecken, gespielte Zeit und Umkehrung, Minutenauswahl (laufend, angehalten, Pause, Schluss, Nachspielzeit, Verlängerung), Nachtragen und Sortierung, Minute ändern, Pfiff zurücknehmen (Grenzen 10 Min, Elfmeterschießen, Verlängerung), Uhr verschieben (Grenzen, Minuten neu, Signalschwellen), `refreshScores`
- [x] S002 `src/domain/corrections.ts` und `refreshScores` in `src/domain/goals.ts` (macht S001 grün, 100 % Branch-Coverage)
- [x] S003 [P] `tests/unit/live-board.test.ts`: Mannschaften ohne Karte (FR-S30)
- [x] S004 Feld `waiting` in `boardView` (`src/domain/live-board.ts`, macht S003 grün)

## Phase 2: US1 Koppeln ohne Suchen

- [x] S005 [P] E2E `tests/e2e/spieltag-sicher-us1.spec.ts`: 012 US1-S1 bis S9; Anpassung 006 US1-S6
- [x] S006 `paste-link.tsx` herauslösen; `start.tsx`, `live.tsx`, `lead-link.tsx` (FR-S01 bis S06)
- [x] S007 Hilfe `trainer-link`, `live-anlegen`, `daten-weg` (012 US1)

## Phase 3: US2, US3, US4 Korrekturen und Uhr

- [x] S008 [P] E2E `tests/e2e/spieltag-sicher-korrekturen.spec.ts`: 012 US2-S1 bis S8, US3-S1 bis S5, US4-S1 bis S5
- [x] S009 `game.tsx`: Menüeinträge, Blätter "Tor nachtragen", "Minute ändern", "Uhr korrigieren", Rückfrage Pfiff (FR-S10 bis S23)
- [x] S010 Hilfe `tor-nachtragen`, `tor-minute`, `pfiff-zuruecknehmen`, `uhr-korrigieren` (012 US2 bis US4)

## Phase 4: US5 Dashboard

- [x] S011 [P] E2E `tests/e2e/spieltag-sicher-us5.spec.ts`: 012 US5-S1 bis S3
- [x] S012 `live-dashboard.tsx`: Zeilen für Mannschaften ohne Karte (FR-S30)
- [x] S013 Hilfe `eltern-dashboard` (012 US5)

## Phase 5: Abschluss

- [ ] S014 Lint, Typen, Unit mit Coverage, Hilfe-Abdeckung, Kontrast, Budget, E2E lokal (Android-Profil)
- [ ] S015 Screenshots iPhone hell/dunkel an Atti (Review C)
