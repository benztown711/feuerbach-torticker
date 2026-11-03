# Tasks: Teilen-Text als Anzeigetafel in Farbe (Spec 005)

Tests zuerst, müssen fehlschlagen. [P] = parallel möglich.

- [x] S001 [P] `tests/unit/share-text.test.ts` neu: 005 US1-S1 bis S7 (Kopf, Info- und Datumszeile, Tabelle, Auswärts, Torschützen, ohne Tore, Elfmeter, Gegner in Rot), US4-S1 bis S3 (Zwischenstand), Spaltenbreiten, Abschnitte, Farbtabelle, ohne Anpfiff
- [x] S002 [P] Bestehende Unit-Tests auf das neue Format umstellen: `events.test.ts` (Elfmeter, Lesezeichen nie), `cards-subs.test.ts` (Karten und Wechsel im Verlauf, 005 US2-S1 bis S4), `cup.test.ts` (005 US3-S1 bis S3, n. V., i. E., Siegerzeile, unentschieden beendet)
- [x] S003 `src/domain/share-text.ts` neu (macht S001 und S002 grün, 100 % Branch-Coverage)
- [x] S004 [P] E2E an das neue Format anpassen: `us4-teilen.spec.ts` (inkl. 005 US5-S1 Vorschau), `karten-wechsel.spec.ts`, `pokal.spec.ts`, übrige Stellen mit `shares`
- [x] S005 `src/ui/components/share-preview.tsx`, `game-details.tsx`, Stil `.share-preview` (macht S004 grün)
- [x] S006 Verträge und Querverweise: `contracts/share-text.md`, Spec 001 FR-011/FR-042, Spec 003 FR-E01/FR-E07/FR-P02/FR-P03
