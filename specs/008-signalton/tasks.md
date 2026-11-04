# Tasks: Signalton wählbar (Spec 008)

Tests zuerst, müssen fehlschlagen. [P] = parallel möglich.

- [x] K001 [P] `tests/unit/signal-sound.test.ts` neu: FR-K01 (drei Töne in fester Reihenfolge mit Namen; je Ton gültige WAV, 44,1 kHz, 1,2 bis 2,6 s, Spitzenpegel über 30000, Stille vorweg, Töne unterscheiden sich, gleiche Eingabe gleiche Datei; Pfiff mit Hauptenergie um 3,1 kHz), FR-K03 (`isSignalSound`)
- [x] K002 [P] in `tests/unit/signal-sound.test.ts` und `team-name.test.ts`: FR-K03 Vorgabe Pfiff, fehlender und unbekannter Wert → Pfiff, gültiger Wert bleibt
- [x] K003 [P] `tests/component/signal.test.tsx`: WAV-Test auf `encodeWav` umstellen, neu FR-K04 (`setSignalSound` tauscht die Quelle, `data-sound`), FR-K02 (`previewSignal` spielt sofort hörbar den gewählten Ton)
- [x] K004 `src/domain/signal-sound.ts`, `types.ts`, `settings.ts` (macht K001, K002 grün, 100 % Branch-Coverage)
- [x] K005 `src/platform/signal.ts`, `src/main.tsx` (macht K003 grün)
- [x] K006 [P] `tests/e2e/signalton.spec.ts` neu: 008 US1-S1 bis S4; Fixture `lastSound`; US2-S14 (Spec 001) prüft zusätzlich den Pfiff
- [x] K007 `settings.tsx`, `new-game.tsx`, `help.tsx`, Stil `.sound-list` (macht K006 grün; axe ohne Verstöße, daher `div role="radiogroup"` statt Liste)
- [x] K008 Querverweise: Spec 001 FR-036, FR-039 (Flyer-README unverändert, Pfiff bleibt Vorgabe)
