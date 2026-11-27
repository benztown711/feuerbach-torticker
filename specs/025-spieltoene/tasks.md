# Tasks: Spieltöne (Spec 025)

Tests zuerst, müssen fehlschlagen. [P] = parallel möglich.

## Phase 1: Ton-Modell (US1, Grundlage)

- [x] T001 [P] `tests/unit/signal-sound.test.ts`: FR-T01 (zehn Töne in fester Reihenfolge, Aufnahmen mit Datei, Langer Pfiff und Doppelpfiff als gültige WAV), FR-T04 (Vorbelegung, `normalizeSounds` mit fehlendem, unbekanntem und altem Wert, Spielzeitende nie "Aus")
- [x] T002 [P] `tests/unit/team-name.test.ts` bzw. Einstellungen: `withSettingsDefaults` übernimmt `signalSound` als `sounds.timeUp`
- [x] T003 `src/domain/types.ts`, `signal-sound.ts`, `settings.ts` (macht T001, T002 grün, 100 % Branch-Coverage)
- [x] T004 `public/sounds/*.mp3`, `QUELLEN.md`, `vite.config.ts` (FR-T02, FR-T09)

## Phase 2: Abspielen (Plattform)

- [x] T005 `tests/component/signal.test.tsx`: `playSound` spielt hörbar mit `data-sound`, "Aus" spielt nichts, `unlockAudio` schneidet einen danach gestarteten Ton nicht ab, `playSignal` nutzt wieder den Spielzeitende-Ton
- [x] T006 `src/platform/signal.ts`, `src/main.tsx` (macht T005 grün)

## Phase 3: US1 Einstellungen

- [x] T007 [P] `tests/e2e/signalton.spec.ts` auf 025 umstellen: US1-S1 bis S5
- [x] T008 `settings.tsx`, `new-game.tsx` (FR-T03, FR-T08), Stil

## Phase 4: US2 Töne beim Tickern

- [x] T009 [P] `tests/e2e/spieltoene.spec.ts`: US2-S1 bis S6
- [x] T010 `game.tsx` (FR-T05)

## Phase 5: US3 Eltern-Ansicht

- [x] T011 [P] `tests/unit/sound-alert.test.ts`: FR-T07 (Pfiff-Zählung, neuestes Ereignis, Freshness, erstes Laden), `parentSounds`
- [x] T012 `src/domain/sound-alert.ts`, `live-board.ts` (macht T011 grün)
- [x] T013 [P] `tests/e2e/live-einfach-us3.spec.ts` und neu `spieltoene-eltern.spec.ts`: US3-S1 bis S7 (S7 über die bestehenden Tests 020 US3-S6, S12, S13); US2-S7 in `eltern-tickern.spec.ts`
- [x] T014 `live-dashboard.tsx`, `use-goal-alert.ts`, `game.tsx` (Eltern-Töne)

## Phase 6: Hilfe und Abschluss

- [x] T015 Hilfe-Einträge laut Spec (Hilfe-Abdeckung grün)
- [x] T016 Querverweise: Spec 008 FR-K02, FR-K04, FR-K05, Spec 020 FR-E25
- [ ] T017 `npm run check`, betroffene E2E, Design-Check, Screenshots iPhone hell/dunkel
