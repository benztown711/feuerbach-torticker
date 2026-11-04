# Tasks: Hilfe mit Suche (Spec 009)

**Input**: `spec.md`, `plan.md` in diesem Ordner; Mockup Runde 2 (freigegeben).

Tests zuerst, müssen fehlschlagen. [P] = parallel möglich.

## Phase 1: Domäne Suche und Inhalte (US1, US2)

- [x] H001 [P] [US1] `tests/unit/help-search.test.ts`: Normalisierung (ä/ae, ß/ss, Groß/Klein), Wortanfang und Teilwort ab vier Zeichen, unter zwei Zeichen keine Suche, Satzzeichen/Emojis ignoriert, 60 Zeichen, Füllwörter (nur Füllwörter: zählen doch), alle Wörter müssen passen, Sortierung Titel vor Suchbegriffen vor Text, ganzes Wort vor Wortanfang, Hervorhebung und Auszug als Abschnitte (FR-H01 bis FR-H06)
- [x] H002 [US1] `src/domain/help-search.ts` (macht H001 grün)
- [x] H003 [P] [US2] `tests/unit/help-entries.test.ts`: Themen in Reihenfolge FR-H08, jedes Thema hat Einträge, IDs eindeutig und adressierbar, Titel endet mit "?", Antwort höchstens 600 Zeichen, höchstens drei verwandte Einträge, Eltern-Einträge vorhanden; SC-H01 Fragenkatalog (mindestens 15 Alltagsformulierungen, passender Eintrag unter den ersten drei); SC-H02 Laufzeit
- [x] H004 [US2] `src/domain/help-entries.ts` mit dem Grundbestand (Texte aus dem Mockup, gegen die App geprüft; Einträge für 009 US1 und US3) (macht H003 grün)
- [x] H005 [P] [US2] `tests/unit/live-link.test.ts`: `viewerShareText` mit und ohne Mannschaften (FR-H17)
- [x] H006 [US2] `viewerShareText` in `src/domain/live-link.ts` (macht H005 grün)

## Phase 2: Hilfe-Seite (US1, US2)

- [ ] H007 [P] [US1] E2E `tests/e2e/hilfe.spec.ts`: 009 US1-S1 bis US1-S9 (Offline mit `context.setOffline`)
- [ ] H008 [P] [US2] E2E in `tests/e2e/hilfe.spec.ts`: 009 US2-S1 bis US2-S5, FR-H15 Untertitel unter "Mehr"
- [ ] H009 [US1] [US2] Router (`#/hilfe/<id>`), `src/ui/screens/help.tsx` neu, nachgeladen in `app.tsx`, Stile in `app.css`, Untertitel in `more.tsx` (macht H007 und H008 grün)
- [ ] H010 [US1] Kontrastmatrix: Fundstelle dunkel `on-rot` auf `rot-tief` in `scripts/check-contrast.ts` (falls fehlend)

## Phase 3: Eltern-Leiste (US2)

- [ ] H011 [P] [US2] E2E `tests/e2e/hilfe-eltern.spec.ts`: 009 US2-S6 Leiste, US2-S7 Eltern-Hilfe mit Suche und zurück zum Spieltag ohne Neuladen, US2-S8 Teilen (Teilen-Menü aufgezeichnet bzw. Zwischenablage)
- [ ] H012 [US2] Router `#/live/<Daten>/hilfe[/<id>]`, `src/ui/components/viewer-nav.tsx`, `ViewerScreen` mit Reitern (Dashboard bleibt eingehängt) (macht H011 grün)
- [ ] H013 [US2] Screenshot-Vergleich `dashboard-hell/dunkel` mit Leiste neu aufnehmen (bewusste Änderung, alle drei Profile)

## Phase 4: Prüfung Hilfe-Abdeckung (US3)

- [ ] H014 [P] [US3] `tests/unit/check-help.test.ts`: 009 US3-S1 fehlende Abdeckung mit Meldung "006 US3 ohne Hilfe-Eintrag", 009 US3-S2 unbekannte Quelle, 009 US3-S3 doppelte ID und fehlende Felder, 009 US3-S4 alles abgedeckt; Tests ohne Spec-Nummer zählen für 001; FR-Quellen; unbekannter "Siehe auch"-Verweis
- [ ] H015 [US3] `scripts/check-help.ts` (macht H014 grün)
- [ ] H016 [US3] `tests/unit/help-coverage.test.ts` am echten Repository (FR-H21); Lücken im Grundbestand schließen, bis grün

## Phase 5: Abschluss

- [ ] H017 Spec 001 `tasks.md` T086 und Spec 006 `tasks.md` L040 mit Verweis auf 009; `README.md` Hinweis auf Hilfe
- [ ] H018 `a11y.spec.ts`: Trefferliste und Eintrag zusätzlich prüfen
- [ ] H019 Lint, Typen, Unit mit Coverage, Kontrast, Budget, E2E lokal (Android), `/code-review`, `/security-review`; Screenshots iPhone hell/dunkel (Übersicht, Suche, Eintrag, Eltern-Leiste) an Atti
