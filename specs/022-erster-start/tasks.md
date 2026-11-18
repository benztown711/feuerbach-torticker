# Tasks: Erster Start und Feinschliff (Spec 022)

**Input**: `spec.md`, `plan.md`, `research.md` (R-F1 bis R-F7)

Tests zuerst, sie müssen fehlschlagen (Constitution IV). [P] = parallel möglich. Ein PR (Paket E), Commits je User Story (Conventional Commits, Scope 022).

## Phase 1: Vorbereitung

- [ ] T001 Spec, Plan, Research, Tasks und Checkliste anlegen (`specs/022-erster-start/`)
- [ ] T002 [P] Spec 020 nachtragen ("geändert durch Spec 022"), `tasks.md` T043 abhaken und Ergebnis in `specs/020-live-einfach/research.md` (Gerätetest 18.11.2026)
- [ ] T003 [P] Nachträge "geändert durch Spec 022" in Spec 001 (FR-001, FR-023), 009 (FR-V01), 012 (FR-S01)

## Phase 2: User Story 1 - Hinweis zur Installation auf dem Startbildschirm (P1)

**Independent Test**: Browser (nicht installiert): Hinweis unter den Aktionen; "Später" blendet bis morgen aus; installierte App nie.

- [ ] T010 [P] [US1] Unit-Test `tests/unit/install-hint.test.ts`: `installPlatform`, `installSteps`, `showInstallHint` (100 % Branch), rot
- [ ] T011 [P] [US1] E2E `tests/e2e/erster-start-us1.spec.ts` (US1-S1 bis US1-S9), rot
- [ ] T012 [US1] `src/domain/install-hint.ts` und `InstallHint` in `src/ui/components/live-start.tsx` (unter allen Aktionen von `StartLive`), CSS-Block "Spec 022"
- [ ] T013 [US1] Hilfe: `installieren` (Quelle 022 US1)
- [ ] T014 [US1] Bestehende Tests prüfen (Startbildschirm-Tests, `install-hint.spec.ts` unverändert grün), `npm run budget`

## Phase 3: User Story 2 - Neues Spiel schneller (P2)

**Independent Test**: "Neues Spiel" auf 390 × 844 und 375 × 667: Knopf sichtbar, ohne Gegner bedienbar, Gegner heißt "Gegner".

- [ ] T020 [P] [US2] E2E `tests/e2e/erster-start-us2.spec.ts` (US2-S1 bis US2-S8), rot
- [ ] T020a [P] [US2] Unit-Test `tests/unit/opponent.test.ts` (`opponentName`, `setOpponent`, 100 % Branch), rot
- [ ] T021 [US2] `src/domain/opponent.ts`, `src/ui/screens/new-game.tsx`: Gegner optional, Platzhalter "Gegner (optional)", Grund-Zeile, angehefteter Knopf; `game-details.tsx` und `opponent-sheet.tsx`: "Gegner ändern"; CSS-Block
- [ ] T022 [US2] Hilfe: `neues-spiel` (Quelle 022 US2)
- [ ] T023 [US2] Bestehende Tests anpassen (Gegner leer = erlaubt statt gesperrt), siehe "Geänderte bestehende Tests"

## Phase 4: User Story 3 - Klarere Texte (P3)

**Independent Test**: Karte "Trainer? …" mit dem Satz; Einstellung "Torvorlagen (Assists)".

- [ ] T030 [P] [US3] E2E `tests/e2e/erster-start-us3.spec.ts` (US3-S1 bis US3-S3), rot
- [ ] T031 [US3] `live-start.tsx` (Karte), `settings.tsx` (Titel)
- [ ] T032 [US3] Hilfe: `vorlage`, `trainer-link` (Quelle 022 US3)

## Phase 5: User Story 4 - Design-Restpunkte (P3)

**Independent Test**: Blatt, Schalter rot, "Für Trainer" als Fläche.

- [ ] T040 [P] [US4] Unit-Test `startHint` "Mit …" in `tests/unit/live-quick.test.ts`, rot
- [ ] T041 [P] [US4] E2E `tests/e2e/erster-start-us4.spec.ts` (US4-S1 bis US4-S10), rot
- [ ] T042 [US4] `live-quick.ts`, `live-start.tsx` (Blatt, "Trainer-Link teilen"), `live.tsx` ("Link einfügen" in "TRAINER"), CSS (Schalter, "Für Trainer"), `scripts/check-contrast.ts` (Beschreibung)
- [ ] T043 [US4] Hilfe: `eltern-zuschauen`, `live-anlegen`, `tor-hinweis` (Quelle 022 US4)
- [ ] T044 [US4] Bestehende Tests anpassen ("Neu starten", "Neu mit", `btn-paste-link` im Bereich), siehe unten

## Phase 6: Abschluss

- [ ] T050 a11y-Test (axe) als eigener describe-Block "022 Erster Start" am Ende von `tests/e2e/a11y.spec.ts`: Startbildschirm mit Hinweis, "Neues Spiel", Blatt (beide Zustände), Dashboard mit Schalter an, "Live für Eltern" mit "Für Trainer", hell und dunkel
- [ ] T051 Hilfe gegenprüfen (Constitution IX): alle sieben Einträge aus spec.md "Hilfe", Bezeichnungen wörtlich, kein „Neu starten“, kein „Vorlagen“ als Schaltername mehr
- [ ] T052 `npm run check` grün (100 % Branch-Coverage `src/domain`, Kontrastmatrix, Bundle-Budget)
- [ ] T053 E2E: neue Specs, alle betroffenen bestehenden, volle Suite einmal (`visual.spec.ts` lokal abweichend, Referenzbilder aus der CI)
- [ ] T054 `/code-review`, `/security-review`; Design-Check (Skill `anthropic-skills:attila-design-check`), P0/P1 beheben; Screenshots iPhone 390 × 844 und 375 × 667 hell/dunkel an Atti
- [ ] T055 Gerätetest iPhone (Safari) und Android: Installationshinweis, angehefteter Knopf mit offener Tastatur (R-F3), Ergebnis in `research.md` (Review C, Atti)

## Geänderte bestehende Tests

Wird beim Umsetzen gepflegt (Datei, Grund).

## Gemeinsam berührte Dateien (Konfliktkandidaten mit Paket B)

`src/ui/screens/new-game.tsx`, `src/domain/help-entries.ts`, `src/styles/app.css`, `tests/e2e/a11y.spec.ts`; `visual.spec.ts-snapshots` (Referenzbilder von Start und Dashboard ändern sich, kommen aus der CI).
