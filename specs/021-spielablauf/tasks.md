---

description: "Aufgaben für Spec 021 Spielablauf am Spieltag"
---

# Tasks: Spielablauf am Spieltag (UX-Welle 2, Paket B)

**Input**: `specs/021-spielablauf/` (spec.md, plan.md, research.md)

**Tests**: verlangt (Constitution IV): Unit-Tests für die Domäne zuerst, je Akzeptanzszenario ein E2E-Test mit ID "021 USx-Sy", zuerst rot.

## Format: `[ID] [P?] [Story] Beschreibung`

## Phase 1: Setup

- [x] T001 Spec, Plan, Research, Tasks und Checkliste unter `specs/021-spielablauf/`; Nachträge "geändert durch Spec 021" in Spec 001 (FR-009, US3-S2), 002 (FR-T05), 009 (FR-V02), 019 (FR-A23, FR-A30, Randfall Band und Tor-Auswahl)
- [x] T002 Lokale Playwright-Konfiguration mit eigenem Port im Scratchpad (nicht eingecheckt)

## Phase 2: Foundational

- [x] T003 Bundle-Budget sichern (R-W3): `GoalEditor` in `src/ui/screens/game.tsx` und `src/ui/screens/game-details.tsx` nachladen und vorladen; bestehende Tests zu Torschütze, Vorlage und Korrektur grün

**Checkpoint**: Spielbildschirm und Spieldetails verhalten sich unverändert, Hauptbundle mit Luft.

---

## Phase 3: User Story 1 - "Nächstes Spiel" (Priority: P1) 🎯 MVP

**Goal**: Vom Schlusspfiff zum nächsten Anpfiff mit 3 Tipps plus Gegnername.

**Independent Test**: spec.md US1 "Independent Test".

### Tests für User Story 1 (zuerst rot)

- [x] T010 [P] [US1] Unit-Tests `tests/unit/next-game.test.ts` für `nextGameDraft` und `nextPlanChoice` (FR-W02, FR-W03)
- [x] T011 [P] [US1] E2E `tests/e2e/spielablauf-us1.spec.ts`: 021 US1-S1 bis US1-S8

### Umsetzung für User Story 1

- [x] T012 [US1] `src/domain/next-game.ts` (FR-W02, FR-W03)
- [x] T013 [US1] Route `#/neu/nach/<id>` in `src/ui/router.ts` und `src/ui/app.tsx`
- [x] T014 [US1] `src/ui/screens/game.tsx`: "Nächstes Spiel" statt Tor-Knöpfen im Endzustand (FR-W01); Stil in `src/styles/app.css`
- [x] T015 [US1] `src/ui/screens/new-game.tsx`: Vorbelegung, Planspiel, Fokus (FR-W02 bis FR-W05), ohne Layout-Änderung
- [x] T016 [US1] Bestehende Tests anpassen, die nach dem Schlusspfiff ausgegraute Tor-Knöpfe erwarten
- [x] T017 [US1] Hilfe: neu `naechstes-spiel`, geändert `pausenpfiff`, `spielbildschirm` (Quelle "021 US1"), Hilfe-Abdeckung grün
- [x] T018 [US1] design/README.md: Zeile "Nächstes Spiel" mit Begründung

**Checkpoint**: US1 vollständig und für sich testbar.

---

## Phase 4: User Story 2 - Torschützen-Auswahl ohne Sperre (Priority: P2)

**Goal**: Kein Tor geht durch die Auswahl verloren; Tor-Knöpfe immer frei.

**Independent Test**: spec.md US2 "Independent Test".

### Tests für User Story 2 (zuerst rot)

- [x] T020 [P] [US2] E2E `tests/e2e/spielablauf-us2.spec.ts`: 021 US2-S1 bis US2-S9 (Layout auf 390 × 844 und 375 × 667)

### Umsetzung für User Story 2

- [x] T021 [US2] `src/ui/components/scorer-picker.tsx`: angedockte Darstellung ohne Overlay bei Countdown (FR-W10, FR-W13, FR-W15), Korrektur unverändert (FR-W16)
- [x] T022 [US2] `src/ui/screens/game.tsx`: Andock-Bereich in `.goal-zone` mit Auswahl und Band (FR-W14); `onGoal` schließt die Auswahl beim gezählten Tor, Doppeltipp lässt sie offen (FR-W11, FR-W12)
- [x] T023 [US2] `src/styles/app.css`: `.goal-dock`, `.scorer--dock` (R-W2)
- [x] T024 [US2] Hilfe: `torschuetze`, `vorlage` (Quelle "021 US2"); design/README.md Zeile "Torschützen-Auswahl im Spiel"

**Checkpoint**: US1 und US2 funktionieren je für sich.

---

## Phase 5: User Story 3 - Torzeile mit Pfeil (Priority: P3)

### Tests für User Story 3 (zuerst rot)

- [x] T030 [P] [US3] E2E `tests/e2e/spielablauf-us3.spec.ts`: 021 US3-S1 bis US3-S3

### Umsetzung für User Story 3

- [x] T031 [US3] `src/ui/components/goal-list.tsx`: Chevron je antippbarer Zeile (FR-W20, FR-W21); Stil in `src/styles/app.css`
- [x] T032 [US3] Hilfe: `torschuetze`, `spielbildschirm` (Quelle "021 US3")

---

## Phase 6: Polish

- [x] T040 a11y: `describe('021 Spielablauf …')` am Ende von `tests/e2e/a11y.spec.ts` (SC-W04)
- [x] T041 Hilfe gegenprüfen: Einträge laut spec.md vorhanden, Bezeichnungen wörtlich wie in der App (Constitution IX)
- [x] T042 `npm run check` grün (Lint, Typen, Unit mit 100 % Branch-Coverage `src/domain`, Build, Kontrast, Bundle-Budget)
- [x] T043 E2E: neue Specs, betroffene bestehende Specs, abschließend volle Suite (Profil `android`)
- [x] T044 Screenshots iPhone 390 × 844 und 375 × 667, hell und dunkel: Endzustand, vorbelegtes "Neues Spiel", Auswahl mit freien Tor-Knöpfen, Torliste mit Pfeil
- [ ] T045 Design-Check (Skill `attila-design-check`) der geänderten Bildschirme, P0/P1 beheben (Review C)
- [ ] T046 Referenzbilder `spiel-*` aus dem CI-Lauf übernehmen, falls sie sich ändern

## Dependencies & Execution Order

- T003 vor US1 und US2 (Bundle-Luft).
- US1, US2, US3 unabhängig; Reihenfolge nach Priorität. US2 und US1 ändern beide `game.tsx` (verschiedene Stellen).
- Hilfe je Story vor Abschluss der Story (Constitution IX).
