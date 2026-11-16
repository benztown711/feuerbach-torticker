# Tasks: Spielbildschirm mit Anzeigetafel und sicherem Rückgängig (Spec 019)

**Input**: `spec.md`, `plan.md`, `research.md` (R-A1 bis R-A5), `data-model.md`, `quickstart.md`; Mockup https://claude.ai/artifact/98UF1ac9XQguthKaAr1uPu

Tests zuerst, sie müssen fehlschlagen (Constitution IV). [P] = parallel möglich. Ein PR (#86) für US1 bis US3, Commits je User Story.

## Phase 1: Grundlagen (blockiert alle User Stories)

- [x] T001 [P] `tests/unit/message-slot.test.ts`: `messageSlot` wählt höchstens eine Meldung in der Rangfolge `goal` > `mark` > `event` > `reshare`; `goal` ruht bei `pickerOpen`; Hinweis in der Rangfolge `handedOver` > `shareResult` > `doubleTap`; Hinweis allein ohne Meldung; nichts offen ergibt `{ message: null, hint: null }`
- [x] T002 `src/domain/message-slot.ts` (macht T001 grün, 100 % Branch-Coverage)
- [x] T003 [P] `scripts/check-contrast.ts`: Paare `surface` auf `ink` (Bandtext, 4,5), `ink` auf `surface` (Knopf im Band, 4,5), `ink` gegen `surface-alt` und gegen `surface` (Bandfläche, 3) in beiden Themes; `npm run contrast` grün

## Phase 2: US1 Rückgängig sicher treffen (P1)

- [x] T004 [P] [US1] E2E `tests/e2e/spielbildschirm-us1.spec.ts`: 019 US1-S1 (Band `ink`/`surface` über den Tor-Knöpfen, volle Breite, Tor- und Uhr-Knöpfe frei), S2 ("Rückgängig" ≥ 64 × 64, nimmt Tor zurück, Band weg), S3 (Doppeltipp: "Schon gezählt" im Band, genau ein `role="status"` sichtbar, ein Tor), S4 (Karte und Lesezeichen mit "Karte"/"Lesezeichen" an: Band mit "Rückgängig" bzw. "Kommentar" + "Rückgängig", je ≥ 64 hoch), S5 (Spiel beendet, geteilt, korrigiert: "neu teilen" im Band, "Teilen" ≥ 64), S6 (dunkles Theme: Bandfarbe = `ink` des Themes); Randfälle: Band erscheint nach dem Schließen der Torschützen-Auswahl, langer Übergabe-Hinweis höchstens drei Zeilen; zuerst rot
- [x] T005 [US1] `src/ui/components/reshare-bar.tsx`: Zeitsteuerung als `useReshareTimer` herauslösen, `ReshareBar` für die Spieldetails unverändert
- [x] T006 [US1] `src/ui/components/message-band.tsx`: Band aus `messageSlot`-Ergebnis mit Texten, Hinweiszeile und Knöpfen; Testkennungen `undo-bar`, `btn-undo`, `mark-toast`, `mark-comment`, `mark-undo`, `event-toast`, `event-undo`, `reshare-bar`, `reshare-share`, `double-tap-hint`, `share-result`, `live-handed-over`
- [x] T007 [US1] `src/ui/screens/game.tsx`: vier Leisten und drei Toasts durch `messageSlot` + `MessageBand` ersetzen; Tor-Knöpfe und Band in `.goal-zone` (R-A2); `src/styles/app.css`: `.goal-zone`, `.band` (Fläche `ink`, Schrift `surface`, Knöpfe `surface`/`ink`, min. 64 × 64, "Rückgängig" mit Symbol), alte Spiel-Toasts entfernen (macht T004 grün; `us1-tor-erfassen`, `ereignisse`, `karten-wechsel`, `spiel-korrigieren`, `us4-teilen`, `live-us6` bleiben grün)
- [x] T008 [US1] `design/README.md`: Zeile "Torliste, Undo-Leiste" aufteilen, Meldeband mit Begründung (FR-A05)
- [x] T009 [US1] Hilfe `src/domain/help-entries.ts`: `tor-entfernen` ("Rückgängig" im dunklen Band direkt über den Tor-Knöpfen, Quelle + "019 US1"), `tor` (Doppeltipp zählt einmal, im Band "Schon gezählt", Quelle + "019 US1")

## Phase 3: US2 Spielstand auf einen Blick (P2)

- [ ] T010 [P] [US2] E2E `tests/e2e/spielbildschirm-us2.spec.ts`: 019 US2-S1 (Namen, Farbmarken und Spielstand in einer Zeile, Spielstand 64 px in `--font-display`), S2 (Uhr darunter, gleiche Schriftfamilie, kleiner als der Spielstand), S3 (langer Gegnername höchstens zwei Zeilen, Spielstand ungekürzt), S4 (vor dem Anpfiff Doppelpfeil ≥ 44 × 44 unter dem Spielstand, tauscht; nach dem Anpfiff weg), S5 (10:9 auf 375 × 667 in einer Zeile), S6 (Elfmeterschießen: Anzeigetafel bleibt); zuerst rot
- [ ] T011 [US2] `src/ui/components/scoreboard.tsx` und `src/ui/screens/game.tsx`: Anzeigetafel statt `.teams` + `.score`, Testkennungen `team-home`, `team-away`, `score`, `btn-swap-venue`; `src/styles/app.css`: `.scoreboard`, Spielstand nach `ergebnis` (R-A5), Uhr 40 px `--font-display` (macht T010 grün; `us2-layout-se`, `us2-farben-namen`, `us2-uhr`, `pokal` bleiben grün)
- [ ] T012 [US2] Hilfe: neu "Was zeigt der Spielbildschirm?" (Quelle "019 US2", "019 US3"), Bezeichnungen wörtlich wie in der App

## Phase 4: US3 Große Knöpfe, ruhige Torliste (P2)

- [ ] T013 [P] [US3] E2E `tests/e2e/spielbildschirm-us3.spec.ts`: 019 US3-S1 (Knöpfe unter der Uhr in allen Zuständen ≥ 64 × 64), S2 (Torzeilen ≥ 48), S3 (kein `list-grip`, Liste scrollt in sich, Uhr-Knöpfe und Ereignis-Zeile sichtbar), S4 (375 × 667 mit allen drei Ereignis-Schaltern, gemessen ohne Band: kein Seiten-Scroll, zwei Torzeilen ganz sichtbar), S5 (393 × 852: Tor-Knöpfe ≈ ein Drittel der Höhe, ≥ 150, Abstand 12); zuerst rot
- [ ] T014 [US3] `tests/e2e/karten-wechsel.spec.ts`: Griff-Teil (Spec 003 Klärung zu FR-E06) durch FR-A22 ersetzen (kein Griff, Uhr-Knöpfe und Ereignis-Zeile bleiben sichtbar, Liste scrollt in sich)
- [ ] T015 [US3] `src/ui/screens/game.tsx`: Griff und `expanded` entfernen; `src/styles/app.css`: `.controls .btn` min. 64 × 64, `.goal-row` min. 48, `.goal-zone` flexibel und `.goal-list` mit Mindesthöhe zwei Zeilen (R-A3), Abstand der Tor-Knöpfe 12 px, `.list-grip` und `.game--expanded` entfernen (macht T013 und T014 grün)
- [ ] T016 [US3] Hilfe: "Was zeigt der Spielbildschirm?" um Torliste (in sich scrollbar, Tor antippen zum Ändern) ergänzen

## Phase 5: Abschluss

- [ ] T017 `npm run check`, betroffene E2E lokal (siehe `quickstart.md`), `npm run e2e` (übergreifend: gemeinsame Komponente des Spielbildschirms)
- [ ] T018 Visuelle Referenzbilder des Spielbildschirms aus dem CI-Artefakt übernehmen (R-A4); prüfen, warum die alten Bilder noch den Stand vor Spec 011 zeigten
- [ ] T019 `/code-review`, `/security-review`, Design-Check (Skill `design-check`, Ziel Spielbildschirm, SC-A06), P0/P1 beheben; Screenshots iPhone hell/dunkel an Atti; Status in `spec.md`

## Dependencies

- Phase 1 vor allen User Stories (T002 für US1, T003 für FR-A05).
- US1 vor US3 (beide ändern `.goal-zone`); US2 unabhängig von US1 und US3.
- Hilfe-Aufgaben am Ende ihrer Story; T016 ergänzt den Eintrag aus T012.

## Parallel

- T001 und T003 gleichzeitig; T004, T010 und T013 (E2E) gleichzeitig schreibbar.

## Strategie

MVP ist US1 (einziger P1-Befund). US2 und US3 folgen im selben PR, je ein Commit.
