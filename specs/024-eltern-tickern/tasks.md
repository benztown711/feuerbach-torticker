# Tasks: Eltern tickern über den Zuschauer-Link (Spec 024)

**Input**: `spec.md`, `plan.md`, `research.md` (R-E1 bis R-E8), `data-model.md`; Mockup https://claude.ai/artifact/15FC1cxThNZLfUwgZt8r42

Tests zuerst, sie müssen fehlschlagen (Constitution IV). [P] = parallel möglich. Paket A (US1 bis US3, Constitution 3.2.0) in PR #100, Paket B (US4, US5) im Folge-PR.

## Phase 1: Grundlagen (Paket A)

- [x] T001 [P] `tests/unit/live-parent.test.ts`: Eltern-Zertifikat, Paket prüfen (gültig, fremde Signatur, kaputt), `parentAllowed` (fehlendes `x`, Mannschaft in `x`), `tickerSpieltag` (nur erlaubte Mannschaften), `checkTickerName` (2 bis 20 Zeichen, Leerzeichen), `tickerLine` (Eltern, Trainer mit/ohne Namen, eigenes Handy, beendet)
- [x] T002 [P] `tests/unit/live-snapshot.test.ts`, `live-board.test.ts`, `live-spieltag.test.ts`: `by`/`tr` bauen und prüfen; `parent`-Stände für nicht erlaubte Mannschaften verworfen, erlaubte angenommen; Karte mit Ticker; `parseConfig` mit `x`; `parseLiveSpieltag` mit `kit`
- [x] T003 [P] `tests/unit/squad-sync.test.ts`: Zuschauer-Kopie (nur erlaubte Mannschaften, ohne gelöschte Kinder, Grabstein ohne erlaubte Mannschaft bzw. nicht geteilt), Kopie lesen
- [x] T004 [P] `tests/unit/live-crypto.test.ts`: Umschlag mit `k`; Eltern-Zertifikat gilt für jede Mannschaft und meldet `parent`; Lead-Zertifikat weiter nur für seine Mannschaft
- [x] T005 `src/domain/live-parent.ts`, `types.ts`, `live-spieltag.ts`, `live-snapshot.ts`, `live-board.ts`, `squad-sync.ts`, `live-takeover.ts` (macht T001 bis T003 grün, 100 % Branch-Coverage)
- [x] T006 `src/platform/live-crypto.ts`, `live-setup.ts` (`publishConfig` mit Paket, `ensureKit`), `live-receiver.ts`, `live-sender.ts` (Eltern-Sender, `by`/`tr`), `squad-sync.ts` (Kopien) (macht T004 grün)
- [x] T007 `.specify/memory/constitution.md` 3.2.0 (Prinzip II, erledigt)

## Phase 2: US1 Ich tickere dieses Spiel (P1)

- [x] T008 [US1] E2E `tests/e2e/eltern-tickern.spec.ts`: 024 US1-S1 bis S8 (zwei Kontexte, Dienst-Attrappe)
- [x] T009 [US1] `router.ts`, `app.tsx` (Routen), `live-dashboard.tsx` (Ticker-Zeile, Knopf, Namensblatt, Bestätigung, "Weiter tickern"), `game.tsx` (Eltern-Fassung, Kader aus Kopie als Freitext, keine Vorlage), `app.css` (macht T008 grün); FR-E17: Eltern-Spiele bleiben in der Gerätedatenbank, die Eltern-Ansicht zeigt nur das aktuelle
- [x] T010 [US1] Hilfe: neu `eltern-tickern`; geändert `eltern-dashboard`, `trainer-kader`, `datenschutz`

## Phase 3: US2 Sehen, wer tickert, und übernehmen (P1)

- [x] T011 [US2] E2E: 024 US2-S1 bis S8
- [x] T012 [US2] "Spiel übernehmen" mit Rückfrage auf der Karte (Eltern und Trainer-Dashboard), Hinweis beim abgelösten Handy mit Namen, Doppelstart, "Weiter tickern" nach 5 Min und nach verlorenem lokalen Spiel (FR-E14) (macht T011 grün)
- [x] T013 [US2] Hilfe: neu `wer-tickert`; geändert `spiel-uebernehmen`, `spiel-vormerken` (Name sichtbar, FR-E06a); Trainer-Namensabfrage "Dein Name (sehen Trainer und Eltern)"

## Phase 4: US3 Spiel fehlt? Selbst tickern (P1)

- [x] T014 [US3] E2E: 024 US3-S1 bis S5
- [x] T015 [US3] `new-game.tsx` Eltern-Fassung, Frage bei laufendem Spiel derselben Mannschaft (macht T014 grün)
- [x] T016 [US3] Hilfe: `eltern-tickern` ergänzt "Spiel fehlt? Selbst tickern"

## Phase 5: US4 Trainer behalten die Kontrolle (P2, Paket B)

- [ ] T017 [US4] E2E: 024 US4-S1 bis S5
- [ ] T018 [US4] `live.tsx` Schalter je Mannschaft, Konfiguration senden, Kopien nachziehen; Hinweis auf dem Eltern-Handy (macht T017 grün)
- [ ] T019 [US4] Hilfe: neu `eltern-tickern-aus`

## Phase 6: US5 Eltern-Spiel in die Trainer-Historie (P2, Paket B)

- [ ] T020 [US5] Unit-Tests: Übernahme-Kandidaten, `tickedBy`, keine Dopplung; E2E: 024 US5-S1 bis S6
- [ ] T021 [US5] `start.tsx` Karte, Übernahme, Spieldetails "Getickert von …" (macht T020 grün)
- [ ] T022 [US5] Hilfe: neu `eltern-spiel-uebernehmen`

## Phase 7: Abschluss je Paket

- [ ] T023 `npm run check`, betroffene E2E lokal, `/code-review`, `/security-review`, Design-Check, Screenshots iPhone hell/dunkel an Atti

## Abdeckung

| Anforderung | Aufgaben |
|---|---|
| FR-E01 bis FR-E04 | T001, T004, T005, T006, T008 |
| FR-E05 bis FR-E08 | T002, T008, T009, T011 |
| FR-E09 | T001, T008 |
| FR-E10 bis FR-E14 | T011, T012 |
| FR-E15 bis FR-E17 | T003, T008, T009, T014, T015 |
| FR-E18, FR-E19 | T017, T018 |
| FR-E20, FR-E21 | T020, T021 |
| FR-E22, FR-E23 | T003, T004, T006, T007 |
| FR-E06a | T013 |
