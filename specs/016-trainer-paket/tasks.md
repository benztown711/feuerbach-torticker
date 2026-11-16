# Tasks: Trainer-Paket (Spec 016)

**Input**: `spec.md`, `plan.md`, `research.md` (R-B1 bis R-B7), `data-model.md`, `contracts/squad-message.md`, `quickstart.md`; Mockup https://claude.ai/artifact/2R4hbBgR2vTAYSu95RP4qX

Tests zuerst, sie müssen fehlschlagen (Constitution IV). [P] = parallel möglich. Ein PR für US1 bis US4.

## Phase 1: Grundlagen (blockiert alle User Stories)

- [x] T001 [P] `tests/unit/relay-protocol.test.ts`: `squad` mit `slot`, `at`, `gone`, `body`, `sig` (unbekannte Felder verworfen), signierter Text laut Vertrag, Annahme bei `at` ≥, höchstens 6 geteilte Kader (`hasRoom`), Grabsteine nach 30 Tagen weg
- [x] T002 `src/domain/relay-protocol.ts` (macht T001 grün)
- [x] T003 [P] `relay/test/spieltag.test.ts`: `squad` annehmen, ersetzen je `slot`, älter `204`, siebter geteilter Kader `413`, `retire` löscht Kader
- [x] T004 `relay/src/spieltag.ts` (macht T003 grün)
- [x] T005 [P] `tests/unit/live-crypto.test.ts`: Kader-Schlüssel aus `orgKey.d` (gleich auf zwei Handys, anders als der Zuschauer-Schlüssel), Meldung nur damit zu öffnen, `slot` für Kader
- [x] T006 `src/platform/live-crypto.ts` (macht T005 grün)
- [x] T007 [P] `tests/unit/squad-sync.test.ts`: Meldung bauen und streng prüfen; stempeln (neu, geändert, gelöscht, verschoben; nur geteilte Kader); zusammenführen je Kind, Kadername, Schalter und Mannschaft (jüngere gewinnt, gleich bleibt lokal, Weglassen löscht nicht); erster Empfang mit gleichnamigem eigenen Kader (Erkennung wie "Liste einfügen"); kein Platz (6 Kader); Grabsteine älter 30 Tage fallen weg; "lokal neuer" erkennt Nachsenden
- [x] T008 `src/domain/squad-sync.ts`, Typen in `src/domain/types.ts` (macht T007 grün, 100 % Branch-Coverage)
- [x] T009 `tests/e2e/relay.ts`: Nachbau nimmt `squad` an (ersetzen je `slot`, `at` ≥)

## Phase 2: US1 Kader mit den Trainern teilen (P1)

- [x] T010 [P] [US1] E2E `tests/e2e/trainer-paket-us1.spec.ts`: 016 US1-S1 bis S5 (Hilfen in `tests/e2e/paket-helpers.ts`)
- [x] T011 [US1] `src/platform/squad-sync.ts` (nachgeladen): speichern mit Stempel, Schalter, Senden (gebündelt), offene Kader beim Start senden
- [x] T012 [US1] `src/ui/screens/live.tsx`: "Kader mit den Trainern teilen?" vor "Trainer-Link teilen"; `src/ui/screens/roster.tsx`: Schalter "Mit Trainern geteilt" mit Rückfrage, speichern über den Abgleich

## Phase 3: US2 und US3 Ein Einfügen genügt, Änderungen kommen an (P1)

- [x] T013 [P] [US2] E2E `tests/e2e/trainer-paket-us2.spec.ts`: 016 US2-S1 bis S5
- [x] T014 [P] [US3] E2E `tests/e2e/trainer-paket-us3.spec.ts`: 016 US3-S1 bis S8
- [x] T015 [US2] `src/platform/live-receiver.ts` (`onSealed`), `src/main.tsx` (Trainer-Handys halten die Verbindung, solange sichtbar), Empfang und Nachsenden in `squad-sync.ts`, Hinweis "Kader übernommen" einmal, Hinweis "kein Platz" unter "Kader"
- [x] T016 [US2] `src/ui/components/couple-dialog.tsx`: "Geteilte Kader kommen automatisch mit."
- [x] T017 [US3] Zuordnung Mannschaft → Kader ("Meine Mannschaften") über den Abgleich speichern; Neu ausstellen teilt die Kader im neuen Live-Spieltag erneut; Entkoppeln behält sie als eigene

## Phase 4: US4 "Link einfügen" erkennt alles (P2)

- [x] T018 [P] [US4] `tests/unit/paste-detect.test.ts` und E2E `tests/e2e/trainer-paket-us4.spec.ts`: 016 US4-S1 bis S6; bestehende Tests mit "Trainer-Link einfügen" auf den neuen Wortlaut
- [x] T019 [US4] `src/domain/paste-detect.ts`; `src/ui/screens/start.tsx`, `src/ui/components/start-couple.tsx`, `src/ui/components/paste-link.tsx`, `src/ui/screens/live.tsx`: "Link einfügen", Kader-Liste öffnet die Vorschau unter "Kader"

## Phase 5: Abschluss

- [x] T020 Hilfe (spec.md "Hilfe"): neu "Wie bekommen Trainerkollegen die Kader?", geändert `trainer-link`, `kader-liste`, `live-anlegen`, Datenschutz für Trainer; Hilfe-Tests
- [x] T021 `npm run check`, betroffene E2E lokal, `/code-review`, `/security-review`, Screenshots iPhone hell/dunkel an Atti; Roadmap B1, B2; Status in `spec.md`
- [ ] T022 Gerätetest P-1 bis P-5 aus `quickstart.md` mit Atti

## Abdeckung

| Anforderung | Aufgaben |
|---|---|
| FR-B01, FR-B02 | T010 bis T012 |
| FR-B03 | T013 (Link unverändert) |
| FR-B04, FR-B05 | T001 bis T008, T011 |
| FR-B06, FR-B07 | T007, T008, T014, T015 |
| FR-B08, FR-B09, FR-B10 | T007, T013, T015, T016 |
| FR-B11 | T003, T004, T017 |
| FR-B12 | T015 (ältere Stände: Zuschauer-Schlüssel öffnet nicht) |
| FR-B13 bis FR-B16 | T018, T019 |
| FR-B17 | T001 bis T004, T007 |
