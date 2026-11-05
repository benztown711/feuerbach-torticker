# Tasks: Kader sortieren (Spec 013)

Tests zuerst, müssen fehlschlagen. [P] = parallel möglich.

- [ ] S001 [P] `tests/unit/roster.test.ts`: FR-K03, FR-K04 (Sortierung nach Vorname bzw. Nummer, Gleichstände, Groß-/Kleinschreibung, Umlaute, numerisch), FR-K05 (Aufgebot/Andere je sortiert, Teilen-Text folgt), `activePlayers`
- [ ] S002 [P] Einstellungs-Test: FR-K02 Vorgabe `'name'`, fehlender und unbekannter Wert → `'name'`, gültiger Wert bleibt; FR-K07 Sicherung enthält die Einstellung nicht
- [ ] S003 `src/domain/types.ts`, `settings.ts`, `roster.ts`, `roster-merge.ts` (macht S001, S002 grün, 100 % Branch-Coverage)
- [ ] S004 [P] `tests/e2e/kader-sortierung.spec.ts` neu: 013 US1-S1 bis S8; 001 US5-S2 und US7-S7 auf die Vorgabe "Vorname" umstellen
- [ ] S005 `settings.tsx` (Abschnitt "KADER"), `roster.tsx`, `new-game.tsx`, `game.tsx`, `shootout.tsx` (macht S004 grün; axe ohne Verstöße)
- [ ] S006 Hilfe: `help-entries.ts` Eintrag `kader-sortierung` (Quelle 013 US1), `kader.related` (Constitution IX)
- [ ] S007 Querverweis: Spec 001 US5-S2
