---

description: "Aufgabenliste für Feature 001-spiel-erfassen"
---

# Tasks: Spiel erfassen (Tore, Minute, Countdown)

**Input**: Design-Dokumente aus `/specs/001-spiel-erfassen/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Pflicht (Constitution IV, Test-first). Jede Test-Aufgabe steht vor ihrer Implementierung und muss zuerst fehlschlagen. Testnamen beginnen mit der Story-/Szenario-ID und der FR-ID, z. B. `US2-S4 FR-005 Tor in Nachspielzeit wird als 25+1' gespeichert`.

**Organization**: Nach User Story gruppiert. Reihenfolge: P1 (US2 Uhr, US1 Tor) als MVP, danach P2 (US5 Kader/Aufgebot, US3 Torschütze, US7 Import/Teilen, US6 Historie, US4 Ergebnis teilen).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallel möglich (andere Dateien, keine offenen Abhängigkeiten)
- **[Story]**: zugehörige User Story (US1 bis US7)

## Path Conventions

Single project laut plan.md: `src/`, `tests/`, `scripts/`, `design/`, `.github/` im Repository-Root.

## Konventionen für alle Aufgaben

- Keine echten Kindernamen in Code, Tests oder Fixtures (Repo ist öffentlich). Testnamen: Max, Ben, Tom, Leo, Maxi, Paul.
- Keine Farbwerte außerhalb `src/styles/tokens.css` (Stylelint erzwingt das, siehe T008).
- `src/domain/` importiert keine Browser-APIs.

---

## Phase 1: Setup (Projekt und Pipeline)

**Purpose**: Lauffähiges Grundgerüst, das ab dem ersten Pull Request automatisch geprüft und nach `main` automatisch auf GitHub Pages deployt wird.

- [x] T001 Projekt initialisieren: `package.json` (name `feuerbach-torticker`, `"type": "module"`, `engines.node` `>=22`), Abhängigkeiten `preact@^11`, `@preact/signals@^2`, `idb@^8`; Dev: `vite@^8`, `@preact/preset-vite@^2`, `vite-plugin-pwa@^2`, `@vite-pwa/assets-generator@^2`, `typescript@^7`, `vitest@^5`, `@vitest/coverage-v8@^5`, `jsdom`, `@testing-library/preact`, `@playwright/test@^1.64`, `@axe-core/playwright@^4`, `@lhci/cli@^0.15`, `tsx`; `package-lock.json` erzeugen
- [x] T002 `tsconfig.json` (strict, `jsx: react-jsx`, `jsxImportSource: preact`, `noUncheckedIndexedAccess`) und `vite.config.ts` mit `base: '/feuerbach-torticker/'`, Preact-Preset und vite-plugin-pwa (`registerType: 'prompt'`, `generateSW`, Manifest: `name` "Feuerbach Torticker", `short_name` "Torticker", `display: standalone`, `orientation: portrait`, `lang: de`)
- [x] T003 Verzeichnisstruktur laut plan.md anlegen: `src/domain/`, `src/platform/`, `src/ui/screens/`, `src/ui/components/`, `src/styles/`, `tests/unit/`, `tests/component/`, `tests/e2e/`, `scripts/`; Platzhalter `src/main.tsx` mit leerem App-Rahmen und `index.html` (`lang="de"`, `viewport-fit=cover`)
- [x] T004 [P] npm-Skripte in `package.json`: `dev`, `build` (`tokens` → `icons` → `vite build`), `preview`, `tokens`, `icons`, `lint`, `typecheck`, `test`, `test:cov`, `e2e`, `lhci`, `contrast`
- [x] T005 [P] Test-first: `tests/unit/tokens-to-css.test.ts` prüft, dass aus `design/tokens.json` für jede Farbe `--color-<name>` in `:root` (hell) und im Dark-Block entsteht, `[data-theme="light"]` die hellen Werte erzwingt und jeder Typo-Stil eine Klasse `.t-<name>` bekommt (FR-015, FR-018)
- [x] T006 `scripts/tokens-to-css.ts` implementieren: liest `design/tokens.json`, schreibt `src/styles/tokens.css` (Farben, Spacing `--space-*`, Radius `--radius-*`, Typo-Klassen, `@font-face` für `public/fonts/*.woff2`) und kopiert `design/fonts/*.woff2` + `OFL.txt` nach `public/fonts/`; `src/styles/tokens.css` und `public/fonts/` in `.gitignore`
- [x] T007 [P] Icons: `pwa-assets.config.ts` für @vite-pwa/assets-generator mit Quelle `design/brand/wappen.svg`, Hintergrund weiß (`wappenfeld`), Padding so, dass das Wappen in der 80-%-Zone liegt; erzeugt `apple-touch-icon-180x180.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png` (FR-019)
- [x] T008 [P] Lint und Format: `eslint.config.js` (typescript-eslint, Regel: `src/domain/**` darf `window`, `document`, `navigator`, `indexedDB` nicht verwenden), `.stylelintrc.json` mit `color-no-hex` und `declaration-strict-value` für `color`, `background`, `border-color`, `fill` (Ausnahme: `src/styles/tokens.css`), `.prettierrc`
- [x] T009 [P] Test-Konfiguration: `vitest.config.ts` (jsdom für `tests/component`, node für `tests/unit`, Coverage-Schwelle 100 % Branches für `src/domain/**`), `playwright.config.ts` mit Projekten `iphone` (WebKit, `devices['iPhone 15']`) und `android` (Chromium, `devices['Pixel 7']`), `webServer` = `npm run preview`, Basis-URL mit `/feuerbach-torticker/`
- [x] T089 [P] Playwright-Projekt `iphone-se` (WebKit, `devices['iPhone SE (3rd gen)']`, 375 × 667) in `playwright.config.ts` ergänzen; Kernszenarien und Screenshot-Vergleich laufen dort zusätzlich (FR-033)
- [x] T010 [P] `tests/e2e/fixtures.ts`: Playwright-Fixture, die jeden Request außerhalb der eigenen Origin als Testfehler meldet (Prinzip III), `navigator.share` und `AudioContext` mockt und Aufrufe aufzeichnet, `page.clock.install()` bereitstellt
- [x] T011 [P] Kontrastprüfung: Test-first `tests/unit/contrast.test.ts` mit den Paaren aus `design/README.md` (Tor-Knöpfe, Text auf `surface`/`surface-alt`, `rot-text`, `ink-muted`, Hinweis auf `rot-tief`) für beide Themes; Schwellen 4,5:1 bzw. 3:1 ab 24px (SC-006); dann `scripts/check-contrast.ts` als CLI-Variante für `npm run contrast`
- [x] T012 [P] `lighthouserc.json`: `staticDistDir: dist`, Assertions `categories:accessibility >= 0.9`, `categories:best-practices >= 0.9`, PWA-Installierbarkeit (Manifest, Service Worker) als Fehler (SC-005)
- [x] T013 CI `.github/workflows/ci.yml` für `pull_request` und `push` auf `main`: Node 22 mit npm-Cache → `npm ci` → `lint` → `typecheck` → `test:cov` → `build` → `contrast` → `npx playwright install --with-deps webkit chromium` → `e2e` → `lhci autorun`; Playwright-Report und Screenshots als Artefakt; `concurrency` pro Branch
- [x] T014 Deploy `.github/workflows/deploy.yml`: bei Push auf `main` (nach erfolgreichem CI via `workflow_run` oder als eigener Job mit Tests), `npm ci && npm run build`, `actions/upload-pages-artifact` mit `dist/`, `actions/deploy-pages`; Rechte `pages: write`, `id-token: write`; Umgebung `github-pages`
- [x] T015 [P] Release: `.github/workflows/release.yml` mit `googleapis/release-please-action` (Typ `node`), `release-please-config.json`, `.release-please-manifest.json` (Start `0.1.0`); `.github/workflows/pr-title.yml` mit `amannn/action-semantic-pull-request` (Conventional Commits)
- [x] T016 [P] `.github/dependabot.yml`: npm und github-actions wöchentlich, gruppiert (Minor/Patch zusammen), Labels `dependencies`
- [x] T017 [P] `.github/pull_request_template.md` mit Abschnitten: Zusammenfassung, betroffene FR/Szenarien, Tests, Screenshots iPhone, Checkliste "keine echten Kindernamen", "keine Farbwerte im Code"
- [x] T018 README um Abschnitte "Entwicklung" (Verweis auf `specs/001-spiel-erfassen/quickstart.md`) und "App installieren" (Link `https://benztown711.github.io/feuerbach-torticker/`, Anleitung "Zum Home-Bildschirm") ergänzen in `README.md`

**Checkpoint**: Erster PR läuft komplett grün durch die CI; Merge nach `main` deployt eine leere App mit Wappen-Icon auf GitHub Pages. (Voraussetzung: Repo öffentlich und Pages-Quelle "GitHub Actions" in den Repo-Einstellungen, siehe Notes.)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Datenmodell, Speicher und App-Rahmen, auf denen alle Stories aufbauen.

**⚠️ CRITICAL**: Keine Story-Arbeit vor Abschluss dieser Phase.

- [x] T019 [P] Typen aus `data-model.md` in `src/domain/types.ts`: `Game` (inkl. `schemaVersion: 1`, `venue: "home" | "away"`, `schema: { sections: 1..4, sectionMinutes: 1..60 }`, `clockEvents`, `goals`, `signalledThresholds: string[]`, `squad: string[]`, `status: "created" | "running" | "paused" | "break" | "finished"`, `finalScore`, `halfTimeScore`), `ClockEvent` (`type: "kickoff" | "pause" | "resume" | "sectionEnd" | "fullTime" | "reset"`, `at`, `section`), `Goal` (`side: "own" | "opp"`, `minute`, `stoppage: number | null`, `scorer` als Union `player | text | ownGoal | null`, `deletedAt: number | null`), `Player` (`name` "1 bis 24 Zeichen", `number` "1 bis 99" oder null, `deletedAt`), `Settings` (`ownTeam` Vorgabe "Sportvg Feuerbach", `lastSchema` 2 × 25, `lastSquad`, `theme: "system" | "light"`, `installHintDismissedAt`)
- [x] T020 [P] Test-first `tests/unit/validation.test.ts`: `opponent` Pflicht, "1 bis 40 Zeichen, getrimmt"; `ownTeam` 1 bis 40 Zeichen; `sections` 1 bis 4; `sectionMinutes` 1 bis 60; Gegner-Torschütze Freitext max. 30 Zeichen; Spielernummer 1 bis 99 (FR-001, FR-002)
- [x] T021 Validierungsfunktionen in `src/domain/validation.ts` implementieren (macht T020 grün)
- [x] T022 Test-first `tests/unit/db.test.ts` mit `fake-indexeddb`: Stores `games` (keyPath `id`, Indizes `by-createdAt`, `by-status`), `players`, `settings` (Schlüssel `"app"`); Schreiben/Lesen/Aktualisieren; Settings-Vorgaben bei leerer DB
- [x] T023 `src/platform/db.ts` mit `idb` implementieren (DB-Name `torticker`, Version 1), Funktionen `getGame`, `putGame`, `listGames`, `findOpenGame`, `getPlayers`, `putPlayers`, `getSettings`, `putSettings` (macht T022 grün)
- [x] T024 [P] `src/platform/storage.ts`: beim Start `navigator.storage.persist()` anfragen, `isStandalone()` über `matchMedia('(display-mode: standalone)')` bzw. `navigator.standalone` (FR-023)
- [x] T025 [P] Basis-Styles `src/styles/base.css`: Body `surface`/`ink`, Fira Sans über `--font-sans`, Safe-Area-Abstände, Knöpfe `radius-sm`, Flächen `radius-0`, keine Schatten; Theme-Umschaltung über `data-theme` am `<html>`
- [x] T026 App-Rahmen `src/ui/app.tsx` und `src/ui/router.ts`: Hash-Routen laut `contracts/ui-contract.md` (`#/`, `#/neu`, `#/spiel/:id`, `#/spiel/:id/details`, `#/historie`, `#/kader`, `#/einstellungen`), Startbildschirm `src/ui/screens/start.tsx` mit rotem Balken "TORTICKER" (`kopfzeile`) und `lockup-fussball.svg`
- [x] T027 [P] Wiederverwendbare Sicherheitsabfrage `src/ui/components/confirm.tsx` (`confirm-dialog`, `confirm-yes`, `confirm-no`, Tippen außerhalb = Abbrechen) mit Komponententest `tests/component/confirm.test.tsx`
- [x] T028 [P] Update-Hinweis für neue App-Versionen `src/ui/components/update-prompt.tsx` (vite-plugin-pwa `useRegisterSW`); während eines laufenden Spiels nur anzeigen, nie automatisch neu laden

**Checkpoint**: App startet, Navigation funktioniert, Daten landen in IndexedDB, Tokens greifen.

---

## Phase 3: User Story 2 - Spiel anlegen und Uhr steuern (Priority: P1) 🎯 MVP-Teil 1

**Goal**: Spiel mit Gegner, Heim/Auswärts und Spielzeit anlegen; Uhr mit Anpfiff, Pause, Halbzeit, Nachspielzeit, Signal und Abpfiff.

**Independent Test**: Spiel "TSV Musterstadt", Auswärts, 2 × 25 anlegen, anpfeifen, per `page.clock` vorspulen, Anzeige, Nachspielzeit und Signale prüfen.

### Tests für User Story 2 ⚠️ zuerst schreiben, müssen fehlschlagen

- [x] T029 [P] [US2] `tests/unit/clock.test.ts` für `deriveClock(events, nowMs, schema)`: Restzeit, Pausen werden nicht gezählt, Abschnittswechsel, `isOvertime`, `overtimeMs`, Neuladen-Szenario (gleiche Ereignisse, späteres `now`), `reset` setzt Abschnitt auf Anfang, `dueThresholds` für 00:00 und jede volle Nachspielminute ohne bereits signalisierte (FR-006, FR-007, SC-003)
- [x] T030 [P] [US2] `tests/unit/minute.test.ts`: Formel aus research.md R-3; Fälle 0:00 → 1', 6:12 → 7', 24:59 → 25', 25:40 in HZ1 → "25+1'", HZ2 3:10 → 29', HZ2 Nachspielzeit 1:05 → "50+2'", 3 × 25 Ende → "75+1'", 1 × 12 → "12+1'" (FR-005)
- [x] T031 [P] [US2] `tests/unit/game.test.ts` für den Spiel-Reducer: Statusübergänge laut Zustandsautomat in data-model.md (`created → running → paused → running → break → running → finished`), ungültige Übergänge werden abgelehnt, `halfTimeScore` bei Ende von Abschnitt 1 gesetzt (FR-006)
- [x] T032 [P] [US2] `tests/e2e/us2-uhr.spec.ts`: Szenarien US2-S1 bis US2-S10 aus spec.md, u. a. Seitenzuordnung bei Auswärts (S1), Countdown ab 25:00 (S2), Signal-Overlay `signal-flash` und `clock[data-overtime="true"]` bei 00:00 (S3), Signal erneut nach jeder vollen Nachspielminute und nicht doppelt nach Neuladen (FR-007), Pausenpfiff mit Abfrage (S5), Neuladen stellt Restzeit ±1 s her (S7), Pause/Reset mit Abfrage und Abbrechen (S8 bis S10)
- [x] T033 [P] [US2] `tests/component/clock-display.test.tsx`: Uhr zeigt `mm:ss`, in Nachspielzeit `+m:ss` mit Klasse für `rot-text`, Ziffern mit `tabular-nums` (FR-017)
- [x] T090 [P] [US2] `tests/unit/jersey-colors.test.ts`: jede Farbe in `design/trikot-farben.json` hat Schrift ≥ 4,5:1 bzw. ≥ 3:1 bei fett ab 24px; `needsBorder(color, theme)` liefert Rahmen bei < 3:1 zum Hintergrund; Vorgaben aus `settings.lastOwnColor` und `settings.opponentColors[gegner]` (FR-031, FR-032)
- [x] T091 [P] [US2] `tests/e2e/us2-layout-se.spec.ts`: Spielbildschirm im Projekt `iphone-se` ohne Seiten-Scroll; Knopftexte "Uhr anhalten"/"Uhr fortsetzen", "Pausenpfiff" bei 2 Abschnitten in HZ1, "Schlusspfiff" im letzten bzw. einzigen Abschnitt (FR-006, FR-033)

### Implementierung für User Story 2

- [x] T034 [P] [US2] `src/domain/minute.ts` implementieren (macht T030 grün)
- [x] T035 [US2] `src/domain/clock.ts` mit `deriveClock` implementieren (macht T029 grün, nutzt T034)
- [x] T036 [US2] `src/domain/game.ts` Reducer `applyClockEvent(game, event)` und `createGame(input, settings)` implementieren (macht T031 grün)
- [x] T037 [P] [US2] `src/platform/signal.ts`: `unlockAudio()` (beim Anpfiff, `AudioContext.resume()`), `playSignal()` (Oszillator-Doppelton ca. 1,2 s), `vibrate()` nur wenn `navigator.vibrate` existiert (research.md R-4)
- [x] T038 [P] [US2] `src/platform/wake-lock.ts`: Wake Lock anfordern solange Uhr läuft, bei `visibilitychange` erneut anfordern, Fallback-Hinweis wenn API fehlt (FR-013)
- [x] T039 [US2] Bildschirm "Neues Spiel" `src/ui/screens/new-game.tsx` laut UI-Vertrag (`input-opponent`, `venue-home`/`venue-away` ohne Vorauswahl, `schema-sections`, `schema-minutes` mit Vorgabe aus `settings.lastSchema`, `btn-create`); speichert `lastSchema` (FR-001, FR-002)
- [x] T092 [US2] Trikotfarben-Auswahl in `src/ui/screens/new-game.tsx` (`color-own-<id>`, `color-opp-<id>`, `color-clash-hint`) und `src/domain/jersey-colors.ts` (Palette laden, Schriftfarbe, `needsBorder`); speichert `lastOwnColor` und `opponentColors` (macht T090 grün)
- [x] T095 [US2] Eigener Mannschaftsname pro Spiel (`input-own-team`, `own-team-recent-<n>`, `settings.recentOwnTeams`, Kurzform ohne "Sportvg " für Tor-Knöpfe) und Tausch-Knopf `btn-swap-venue` in `src/ui/screens/new-game.tsx` und `src/ui/screens/game.tsx` (vor Anpfiff direkt, danach Menü mit Abfrage); Test-first in `tests/unit/team-name.test.ts` und `tests/e2e/us2-tauschen.spec.ts` (FR-001, FR-014, FR-035)
- [x] T040 [P] [US2] Komponenten `src/ui/components/clock-display.tsx` und `src/ui/components/scoreboard.tsx` (Stil `ergebnis`, `tabular-nums lining-nums`), macht T033 grün
- [x] T041 [US2] Spielbildschirm `src/ui/screens/game.tsx`: Kopf mit Wappen 24px und `section-label`, Teams links Heim/rechts Gast, Uhr, Steuerleiste (`btn-kickoff`, `btn-pause` "Uhr anhalten"/`btn-resume` "Uhr fortsetzen" als reine Textknöpfe, `btn-section-end` mit Beschriftung "Pausenpfiff"/"Schlusspfiff", `btn-reset` im Menü), Sicherheitsabfrage für Uhr anhalten/Pausenpfiff/Schlusspfiff/Reset (FR-006)
- [x] T042 [US2] Tick-Schleife in `src/ui/screens/game.tsx`: 4× pro Sekunde `deriveClock` neu berechnen; für jede `dueThreshold` `playSignal`, `vibrate`, `signal-flash` 3 s auslösen und Schwelle in `signalledThresholds` speichern (FR-007)
- [x] T043 [US2] Persistenz: jedes Uhr-Ereignis sofort per `putGame`; beim App-Start offenes Spiel über `findOpenGame` fortsetzen (FR-010)

**Checkpoint**: Spiele lassen sich anlegen und mit korrekter Uhr inkl. Nachspielzeit und Signal durchspielen; alle US2-Tests grün.

---

## Phase 4: User Story 1 - Tor mit einem Tap erfassen (Priority: P1) 🎯 MVP-Teil 2

**Goal**: Große Tor-Knöpfe, Spielstand, Minute automatisch, Undo und Löschen.

**Independent Test**: Spiel anpfeifen, Tor Feuerbach und Tor Gegner tippen, Stand und Torliste prüfen, Undo testen.

### Tests für User Story 1 ⚠️ zuerst schreiben

- [x] T044 [P] [US1] `tests/unit/goals.test.ts`: `addGoal` speichert `side`, `at`, `section`, `minute`, `stoppage` aus `deriveClock`; Spielstand zählt nur `deletedAt = null`; Heim/Gast-Abbildung von own/opp je nach `venue`; Doppeltipp innerhalb 1,5 s auf dieselbe Seite wird ignoriert; Undo setzt `deletedAt`; Tore nur in `running`/`paused` erlaubt (FR-004, FR-008, FR-021)
- [x] T045 [P] [US1] `tests/e2e/us1-tor-erfassen.spec.ts`: US1-S1 Knöpfe vor Anpfiff `disabled`; US1-S2 bei 06:12 gespielt Tor Feuerbach → `score` "1 : 0" und Eintrag "7' Feuerbach"; US1-S3 Gegentor; US1-S4 Undo innerhalb 10 s; US1-S5 Löschen in Torliste mit Abfrage; Messung Tap bis Anzeige < 100 ms (SC-001); Knöpfe in Halbzeitpause und nach Abpfiff deaktiviert (FR-021)
- [x] T046 [P] [US1] `tests/e2e/a11y.spec.ts`: axe-core ohne Verstöße auf Start, Neues Spiel und Spielbildschirm in beiden Projekten; Tor-Knöpfe mindestens 64 × 64 CSS-Pixel
- [x] T093 [P] [US1] `tests/e2e/us1-entfernen.spec.ts`: US1-S5 bis US1-S7 (Tor nach Minuten entfernen mit Abfrage, durchgestrichen mit "entfernt", "wiederherstellen", Torliste scrollt in sich bei 8 Toren, Uhr und Knöpfe bleiben stehen) (FR-008, FR-034)

### Implementierung für User Story 1

- [x] T047 [US1] `src/domain/goals.ts`: `addGoal`, `undoGoal`, `deleteGoal`, `score(game)` implementieren (macht T044 grün)
- [x] T048 [P] [US1] Komponente `src/ui/components/goal-button.tsx`: `btn-goal-own`/`btn-goal-opp` in Trikotfarbe mit Schriftfarbe aus der Palette (fett ≥ 24px) und Rahmen nach `needsBorder`, zusammen unteres Drittel, Hinweis "Schon gezählt" bei Doppeltipp (FR-003, FR-016)
- [x] T049 [P] [US1] Komponente `src/ui/components/undo-bar.tsx` (`undo-bar`, `btn-undo`, 10 s sichtbar)
- [x] T050 [P] [US1] Komponente `src/ui/components/goal-list.tsx`: alle Tore, neuestes oben, Minute-Label, Stand, Torschütze; entfernte durchgestrichen
- [x] T051 [US1] Tor-Knöpfe, Undo-Leiste und Torliste in `src/ui/screens/game.tsx` einbauen; Aktivregel nach Status (FR-021); sofort persistieren
- [x] T052 [US1] Spieldetails `src/ui/screens/game-details.tsx`: alle Tore mit Minute-Label und Uhrzeit `HH:MM:SS` (`goal-<id>`), Löschen mit Abfrage (`goal-delete-<id>`), Uhr-Ereignisse mit Uhrzeit (`clock-events`) (FR-008, FR-022)
- [x] T094 [US1] Torliste `src/ui/components/goal-list.tsx` auf alle Tore mit eigenem Scrollbereich umstellen, Antippen öffnet `goal-actions` (`goal-remove` mit Abfrage, `goal-restore`, `goal-edit-scorer`); `src/domain/goals.ts` um `removeGoal`/`restoreGoal` erweitern (macht T093 grün)

**Checkpoint (MVP)**: Ein komplettes Spiel lässt sich mit Uhr und Toren erfassen. Ab hier ist die App am Spielfeldrand nutzbar und wird bei jedem Merge automatisch ausgeliefert.

---

## Phase 5: User Story 5 - Kader und Aufgebot pflegen (Priority: P2)

**Goal**: Gemeinsamer Kader-Pool, Spieler anlegen/bearbeiten/löschen (Soft-Delete), Aufgebot pro Spiel.

**Independent Test**: Spieler anlegen, umbenennen, löschen; Aufgebot von 10 aus 21 wählen; Vorauswahl beim nächsten Spiel prüfen.

### Tests für User Story 5 ⚠️ zuerst schreiben

- [x] T053 [P] [US5] `tests/unit/roster.test.ts`: Spieler anlegen (`name` "1 bis 24 Zeichen", `number` "1 bis 99" oder null), Soft-Delete setzt `deletedAt` und blendet aus, gelöschte bleiben über ID für alte Tore auflösbar, Sortierung nach Nummer dann Name (FR-029)
- [x] T054 [P] [US5] `tests/e2e/us5-kader.spec.ts`: US5-S1 bis US5-S6 (Anlegen, Aufgebot 10 aus 21, Vorauswahl letztes Aufgebot, ohne Aufgebot ganzer Kader, "Andere …", Löschen mit Abfrage und Anzeige in altem Spiel)

### Implementierung für User Story 5

- [x] T055 [US5] `src/domain/roster.ts`: `addPlayer`, `updatePlayer`, `softDeletePlayer`, `visiblePlayers`, `resolvePlayer(id)` (macht T053 grün)
- [x] T056 [US5] Kader-Bildschirm `src/ui/screens/roster.tsx` laut UI-Vertrag (`roster-list`, `btn-add-player`, `player-edit-<id>`, `player-delete-<id>` mit Abfrage); Hinweis "Bitte nur Vornamen" bei Leerzeichen im Namen (FR-020)
- [x] T057 [US5] Aufgebotsauswahl in `src/ui/screens/new-game.tsx` (`squad-picker`, `squad-option-<id>`, `squad-take-last`), speichert `game.squad` und `settings.lastSquad` (FR-030)

**Checkpoint**: Kader und Aufgebot funktionieren; US5-Tests grün.

---

## Phase 6: User Story 3 - Torschütze nachtragen (Priority: P2)

**Goal**: Schnellauswahl nach eigenem Tor aus dem Aufgebot, Eigentor Gegner, Freitext für Gegentore, Nachtragen in der Torliste.

**Independent Test**: Tor erfassen, "Max" in der Schnellauswahl wählen, Torliste zeigt "12' Feuerbach, Max"; Gegentor mit "Nr. 9".

**Abhängigkeit**: US5 (Kader/Aufgebot).

### Tests für User Story 3 ⚠️ zuerst schreiben

- [x] T058 [P] [US3] `tests/unit/scorer.test.ts`: `scorer.kind = "player"` nur bei `side = own`, `"text"` nur bei `side = opp` (max. 30 Zeichen), `"ownGoal"` zählt für own (FR-009)
- [x] T059 [P] [US3] `tests/e2e/us3-torschuetze.spec.ts`: US3-S1 bis US3-S5 (Schnellauswahl, Schließen nach 8 s, Nachtragen aus Kader, Gegentor Freitext mit Platzhalter "Name oder Rückennummer", Eigentor)

### Implementierung für User Story 3

- [x] T060 [US3] `src/domain/goals.ts` um `setScorer(game, goalId, scorer)` mit Regeln aus T058 erweitern
- [x] T061 [US3] Komponente `src/ui/components/scorer-picker.tsx`: Raster bis 16 Knöpfe (4 × 4) aus `game.squad` bzw. ganzem Kader, `scorer-others` für restlichen Kader, `scorer-own-goal`, `scorer-skip`, Auto-Schließen nach 8 s (FR-030)
- [x] T062 [US3] Bearbeiten in `src/ui/screens/game-details.tsx` (`goal-edit-<id>`): eigene Tore Kaderauswahl + Eigentor, Gegentore Freitextfeld mit Platzhalter "Name oder Rückennummer"

**Checkpoint**: Torschützen vollständig; US3-Tests grün.

---

## Phase 7: User Story 7 - Kader per Liste importieren und teilen (Priority: P2)

**Goal**: Namensliste einfügen, Vorschau mit Warnungen, eindeutige Kurz-Namen, Zusammenführen; Kader als Text teilen.

**Independent Test**: Liste "1 Max / 2 Maxi / 5 Ben / Tom" einfügen, übernehmen; geteilten Text auf zweitem Gerät einfügen → identischer Kader ohne Duplikate.

**Abhängigkeit**: US5 (Kader).

### Tests für User Story 7 ⚠️ zuerst schreiben

- [x] T063 [P] [US7] `tests/unit/roster-parse.test.ts`: Formate `1 Max`, `1. Max`, `#1 Max`, `1 - Max`, `1,Max`, `Max 1`, `Max`, Tab-getrennt aus Excel, Leerzeilen überspringen, Nummer außerhalb 1 bis 99 → Warnung, Zeile ohne Buchstaben → übersprungen (FR-025)
- [x] T064 [P] [US7] `tests/unit/roster-names.test.ts`: "Max Mustermann" allein → "Max"; "Max Müller" + "Max Meier" → "Max Mü." + "Max Me."; "Max Meier" + "Max Meyer" → "Max Mei." + "Max Mey."; identische Namen → Warnung "doppelt"; Ergebnis nie länger als 24 Zeichen, nie ein voller Nachname (FR-020, FR-025)
- [x] T065 [P] [US7] `tests/unit/roster-merge.test.ts`: Zuordnung über Nummer + Vorname, sonst Vorname + Präfix-Verträglichkeit; Abkürzung wird bei neuem Namensvetter verlängert ("Max M." → "Max Mü."); keine Löschung; gelöschter Spieler wird wiederbelebt statt dupliziert (FR-027)
- [x] T066 [P] [US7] `tests/e2e/us7-kader-import.spec.ts`: US7-S1 bis US7-S9 inkl. Vorschau editierbar und Teilen-Text "Nummer Name" pro Zeile (gemocktes `navigator.share`) (FR-026, FR-028)

### Implementierung für User Story 7

- [x] T067 [P] [US7] `src/domain/roster-parse.ts` implementieren (macht T063 grün)
- [x] T068 [P] [US7] `src/domain/roster-names.ts` implementieren (macht T064 grün)
- [x] T069 [US7] `src/domain/roster-merge.ts` implementieren (macht T065 grün, nutzt T067, T068)
- [x] T070 [US7] Einfügen-Dialog in `src/ui/screens/roster.tsx` (`btn-paste-list`, `paste-input`, `paste-preview` mit Warnungen und editierbaren Namen, `paste-apply`); Nachnamen nur im Speicher der Vorschau, nie persistiert
- [x] T071 [US7] `src/platform/share.ts` (`shareText` mit Fallback Zwischenablage) und `btn-share-roster` in `src/ui/screens/roster.tsx`

**Checkpoint**: Fünf Trainer können denselben Kader per WhatsApp-Text übernehmen.

---

## Phase 8: User Story 6 - Spielhistorie (Priority: P2)

**Goal**: Dauerhafte lokale Historie mit Datum und Uhrzeit-Zeitstempeln, Löschen, Export/Import als Sicherung.

**Independent Test**: Zwei Spiele beenden, Historie prüfen, exportieren, Daten löschen, importieren → identisch.

### Tests für User Story 6 ⚠️ zuerst schreiben

- [x] T072 [P] [US6] `tests/unit/export.test.ts`: Export erzeugt JSON gemäß `contracts/export.schema.json` (Validierung mit `ajv` als Dev-Abhängigkeit); Import lehnt fremde Formate ab, überspringt vorhandene Spiel-IDs, führt Spieler per ID zusammen (FR-024)
- [x] T073 [P] [US6] `tests/e2e/us6-historie.spec.ts`: US6-S1 bis US6-S5 (Liste neueste zuerst mit Anpfiff-Uhrzeit, Details mit "25+1'" und `HH:MM:SS`, Persistenz nach Kontext-Neustart, Löschen mit Abfrage, Export über gemocktes Teilen-Menü und Re-Import) (FR-022)
- [x] T074 [P] [US6] `tests/e2e/install-hint.spec.ts`: außerhalb Standalone erscheint `install-hint`, wegklickbar, kommt nicht wieder (FR-023)

### Implementierung für User Story 6

- [x] T075 [US6] `src/domain/export.ts` (`buildBackup`, `parseBackup`, `mergeBackup`) implementieren (macht T072 grün)
- [x] T076 [US6] Historie `src/ui/screens/history.tsx` (`history-list`, `history-item-<id>`, Filter `history-filter-*`), Öffnen führt zu `src/ui/screens/game-details.tsx`; Löschen dort (`btn-delete-game`, Runde 4)
- [x] T077 [US6] Einstellungen `src/ui/screens/settings.tsx`: `recent-own-teams` (FR-014), `theme-system`/`theme-light`/`theme-dark` (FR-018), `btn-export` (Datei `torticker-sicherung-JJJJ-MM-TT.json` über Teilen-Menü mit Dateien, Fallback Download), `input-import`, `install-hint` (FR-023, FR-024)

**Checkpoint**: Historie dauerhaft und sicherbar.

---

## Phase 9: User Story 4 - Ergebnis teilen (Priority: P2)

**Goal**: Beendetes Spiel als Text nach `contracts/share-text.md` teilen.

**Independent Test**: Beendetes Spiel teilen, Text exakt wie im Vertrag.

### Tests für User Story 4 ⚠️ zuerst schreiben

- [x] T078 [P] [US4] `tests/unit/share-text.test.ts`: Beispiel aus `contracts/share-text.md` exakt; Heim zuerst; Halbzeitstand nur bei mehr als einem Abschnitt; gelöschte Tore fehlen; Spiel ohne Tore nur zwei Zeilen; Eigentor; Gegner-Freitext; nur Anzeigenamen aus dem Kader (FR-011, FR-020)
- [x] T079 [P] [US4] `tests/e2e/us4-teilen.spec.ts`: US4-S1 (Teilen-Menü mit Text), US4-S2 (Fallback Zwischenablage mit Bestätigung)

### Implementierung für User Story 4

- [x] T080 [US4] `src/domain/share-text.ts` implementieren (macht T078 grün)
- [x] T081 [US4] `btn-share` in `src/ui/screens/game-details.tsx` und nach Abpfiff auf `src/ui/screens/game.tsx` (nutzt `src/platform/share.ts`)

**Checkpoint**: Alle User Stories funktionsfähig und unabhängig getestet.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [x] T082 [P] `tests/e2e/offline.spec.ts`: nach erstem Laden `context.setOffline(true)`, Neuladen, Spiel anlegen und Tor erfassen funktioniert (FR-012)
- [x] T083 [P] `tests/e2e/visual.spec.ts`: Screenshot-Vergleich Spielbildschirm (laufend, Nachspielzeit, Halbzeit) in hell und dunkel, alle drei Profile; Referenzbilder aus der CI im Repo (R-22)
- [x] T084 [P] Bundle-Budget in `vite.config.ts` bzw. CI-Schritt: JS-Hauptbundle < 60 KB gzip, sonst CI rot
- [x] T085 [P] Performance-Check in `tests/e2e/us1-tor-erfassen.spec.ts` gegen SC-001 stabilisieren (Median aus 10 Taps)
- [x] T086 [P] Hilfe-Seite `src/ui/screens/help.tsx` mit iPhone-Hinweisen: App vom Home-Bildschirm nutzen, Ton nur bei eingeschaltetem Bildschirm, Lautlos-Schalter, Sicherung exportieren (ersetzt durch Spec 010 "Hilfe mit Suche")
- [ ] T087 Gerätecheck nach `specs/001-spiel-erfassen/quickstart.md` (manuell, iPhone + Android) durchführen und Ergebnis im Release-PR dokumentieren. iPhone 16e am 06.11.2026 bestanden: Bildschirm bleibt an, Signalton, gesperrtes Handy, Offline-Neustart, Ergebnis teilen. Offen: Sichern und Wiederherstellen, Android
- [x] T088 `/speckit-analyze` laufen lassen und Abweichungen zwischen spec.md, plan.md, tasks.md und Code beheben (Ergebnis: research.md R-22)

---

## Phase 11: Review B Runde 4 (Navigation, Historie, Uhr zurücksetzen entfällt)

**Goal**: Navigationsleiste unten (FR-037), Historie mit Feuerbach-Sicht und Filter (FR-038), Spieldetails mit Zeitleiste und Teilen, "Uhr zurücksetzen" entfernt.

- [x] T096 [P] [US6] `tests/unit/history.test.ts`: Ergebnis aus Feuerbach-Sicht, S/U/N, "läuft" bei offenen Spielen, Filter-Chips aus Mannschaftsnamen (Kurzform E1/E2/D3, nur bei mehr als einem Namen), Filtern, Zeitleiste der Spieldetails (Ereignisse und Tore chronologisch, entfernte markiert), Live-Anzeige "Läuft <Minute>"/"Pause" (FR-037, FR-038)
- [x] T097 [US6] `src/domain/history.ts` implementieren (macht T096 grün)
- [x] T098 [P] `tests/e2e/nav.spec.ts`: Leiste mit drei Einträgen auf allen Bildschirmen, aktiver Eintrag, "Läuft <Minute>" bei laufendem Spiel auf anderer Seite und Rückweg, Tipp auf "Spiel" im Spiel führt zur Startseite, Spiel läuft nach Navigation weiter; FR-033 mit Leiste auf 375 × 667 (FR-037)
- [x] T099 Komponente `src/ui/components/nav-bar.tsx` und App-Rahmen in `src/ui/app.tsx` (fixe Leiste, Spielbildschirm-Höhe ohne Leiste), Seite "Mehr" `src/ui/screens/more.tsx` (`more-roster`, `more-settings`, `more-help`), Startseite ohne Kader-Knopf (macht T098 grün)
- [x] T100 [US6] Spieldetails `src/ui/screens/game-details.tsx` nach Mockup 8: Kopf "Heim : Gast" mit Halbzeit, Zeitleiste (`details-timeline`), Teilen-Vorschau (`share-preview`), `btn-share`, `btn-delete-game` mit Abfrage
- [x] T101 Uhr zurücksetzen entfernen: `resetClock`/Aktion `reset` aus `src/domain/game.ts`, Menüpunkt und Abfrage aus `src/ui/screens/game.tsx`, E2E US2-S9; `deriveClock` wertet alte `reset`-Ereignisse weiter aus (Unit-Test bleibt), Export-Schema behält `reset`

## Phase 12: Kopfzeile und Update-Prüfung (Session 2026-11-03)

**Goal**: Unterscheidbare Mannschaftsnamen in der Kopfzeile (FR-040), Update-Hinweis auch nach langer Zeit im Hintergrund (FR-041).

- [x] T102 [P] E2E in `tests/e2e/us2-layout-se.spec.ts`: Kopfzeile zeigt "Feuerbach U11", lange Namen ("Sportvg Feuerbach U15-Juniorinnen", "SGM SV Prag Stuttgart/TSV Weilimdorf") höchstens zwei Zeilen, ohne Seiten-Scroll auf 375 × 667 (FR-040, FR-033)
- [x] T103 Kopfzeile in `src/ui/screens/game.tsx` (Kurzform) und `src/styles/app.css` (`.team__name` zweizeilig) (macht T102 grün)
- [x] T104 [P] Komponententest `tests/component/update-check.test.tsx`: `update()` bei Rückkehr in den Vordergrund, höchstens einmal pro Minute, Fehler ohne Netz werden geschluckt (FR-041)
- [x] T105 `src/platform/update-check.ts` und Anbindung in `src/ui/components/update-prompt.tsx` über `onRegisteredSW` (macht T104 grün)

## Phase 13: Zwischenstand teilen (Session 2026-11-03)

**Goal**: Leute, die nicht am Platz sind, per WhatsApp auf dem Laufenden halten, ohne Server (FR-042).

- [x] T106 [P] `tests/unit/share-text.test.ts`: Zusatz "Zwischenstand <Minute>" (laufend, angehalten, Nachspielzeit), "Halbzeit"/"Pause" ohne Halbzeitstand, kein Zusatz vor Anpfiff und nach Schlusspfiff (FR-042)
- [x] T107 `src/domain/share-text.ts`: optionaler Zeitpunkt `now` für den Zwischenstand (macht T106 grün)
- [x] T108 [P] E2E `tests/e2e/us4-teilen.spec.ts`: "Zwischenstand teilen" im "…"-Menü während des Spiels, nicht vor dem Anpfiff (FR-042)
- [x] T109 Menüeintrag `menu-share-interim` in `src/ui/screens/game.tsx` (macht T108 grün)

## Phase 14: Geteilten Kader wieder einfügen (Session 2026-11-05)

**Goal**: Der Text aus "Kader teilen" ergibt auf einem zweiten Gerät denselben Kader, ohne Warnungen (FR-025, FR-028, US7-S8).

- [x] T110 [P] Unit-Tests in `tests/unit/roster-parse.test.ts`, `roster-names.test.ts`, `roster-merge.test.ts`: Kürzel "Mü." erkannt, unverändert übernommen (auch einzeln oder länger als nötig), keine Warnung "nachname", gleiches Kürzel wie ein bestehender Spieler → "Name doppelt" (FR-025, FR-028)
- [x] T111 [P] E2E in `tests/e2e/us7-kader-import.spec.ts`: Kader mit "Max Me."/"Max Mü." teilen, auf frischem Gerät einfügen, keine Warnungen, Namen unverändert, erneutes Einfügen ohne Duplikate (US7-S7, US7-S8)
- [x] T112 `src/domain/roster-parse.ts` (Merkmal `abbreviated`), `roster-names.ts` (Eintrag `kept`, Eindeutigkeit: verschiedene Nachnamen nie gleicher Name), `roster-merge.ts` (macht T110 und T111 grün)
- [x] T113 Hilfe-Eintrag `kader-liste` in `src/domain/help-entries.ts`: Kollegen fügen den geteilten Text genauso ein, Kürzel bleiben erhalten (Constitution IX)

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: keine Abhängigkeiten; T013/T014 brauchen T001 bis T012
- **Phase 2 Foundational**: nach Phase 1; blockiert alle Stories
- **US2 (Phase 3)** → **US1 (Phase 4)**: Tore brauchen eine laufende Uhr (MVP = beide)
- **US5 (Phase 5)**: nach Phase 2, unabhängig von US1/US2 testbar
- **US3 (Phase 6)**: braucht US1 (Tore) und US5 (Kader/Aufgebot)
- **US7 (Phase 7)**: braucht US5
- **US6 (Phase 8)**: braucht US1/US2 (beendete Spiele)
- **US4 (Phase 9)**: braucht US1/US2; nutzt `share.ts` aus US7 (oder legt es selbst an, falls US7 noch fehlt)
- **Polish**: nach den gewünschten Stories

### Within Each User Story

- Tests zuerst, müssen fehlschlagen → Domäne → Plattform-Adapter → UI → Persistenz
- Jede Story endet mit grüner CI und ist einzeln auslieferbar

### Parallel Opportunities

- Phase 1: T004 bis T012 und T015 bis T017 parallel nach T001 bis T003
- Phase 2: T019, T020, T024, T025, T027, T028 parallel
- Nach Phase 4 (MVP): US5, US6 und US4 parallel; danach US3 und US7 parallel

---

## Parallel Example: User Story 2

```bash
# Alle Tests für US2 gleichzeitig anlegen:
Task: "tests/unit/clock.test.ts"           # T029
Task: "tests/unit/minute.test.ts"          # T030
Task: "tests/unit/game.test.ts"            # T031
Task: "tests/e2e/us2-uhr.spec.ts"          # T032
Task: "tests/component/clock-display.test.tsx"  # T033

# Danach parallel:
Task: "src/domain/minute.ts"               # T034
Task: "src/platform/signal.ts"             # T037
Task: "src/platform/wake-lock.ts"          # T038
```

## Parallel Example: User Story 7

```bash
Task: "tests/unit/roster-parse.test.ts"    # T063
Task: "tests/unit/roster-names.test.ts"    # T064
Task: "tests/unit/roster-merge.test.ts"    # T065
# dann
Task: "src/domain/roster-parse.ts"         # T067
Task: "src/domain/roster-names.ts"         # T068
```

---

## Implementation Strategy

### MVP First

1. Phase 1 (Pipeline steht, leere App ist live)
2. Phase 2 (Fundament)
3. Phase 3 + 4 (US2 + US1): **STOP und am Spielfeldrand testen**
4. Merge → automatisches Deployment → auf dem iPhone installieren

### Incremental Delivery

1. MVP (Uhr + Tore)
2. + US5 Kader/Aufgebot → + US3 Torschützen
3. + US7 Liste einfügen/teilen (Trainerkollegen einbinden)
4. + US6 Historie mit Sicherung
5. + US4 Ergebnis teilen
6. Jede Stufe ist ein eigener PR mit grüner CI und eigenem Release (release-please)

---

## Notes

- Einmalige manuelle Schritte im GitHub-Repo (nicht automatisierbar aus dieser Session): Sichtbarkeit auf öffentlich; Settings → Pages → Source "GitHub Actions"; Settings → Branches → Schutzregel für `main` mit Pflicht-Check "ci".
- [P] = andere Dateien, keine Abhängigkeiten
- Nach jeder Aufgabe oder logischen Gruppe committen (Conventional Commits, z. B. `feat(uhr): Nachspielzeit mit 25+1'`)
