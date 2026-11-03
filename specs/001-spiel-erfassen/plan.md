# Implementation Plan: Spiel erfassen (Tore, Minute, Countdown)

**Branch**: `001-spiel-erfassen` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-spiel-erfassen/spec.md`

## Summary

Eine installierbare Web-App (PWA), die am Spielfeldrand Tore mit einem Tap erfasst, die Spielminute inklusive Nachspielzeit ("25+1'") automatisch aus Zeitstempeln berechnet, am Abschnittsende jede Minute ein Signal gibt und alle Spiele dauerhaft lokal in einer Historie hält. Technisch: Vite + TypeScript + Preact, Zustand in IndexedDB, Service Worker für Offline-Betrieb, Gestaltung aus `design/tokens.json`. Kern ist ein reines, vollständig unit-getestetes Zeitmodul (`src/domain/clock.ts`), das aus einer Ereignisliste und der aktuellen Uhrzeit den Spielzustand ableitet. Ausgeliefert als statische Seite, automatisch gebaut, getestet und deployt über GitHub Actions.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict; 7.0 erst, wenn typescript-eslint es unterstützt, research.md R-14), Node.js 22 LTS für Build und Tests

**Primary Dependencies**: Vite 8, Preact 11 mit @preact/signals 2, vite-plugin-pwa 2 (Workbox 7), idb 8, @vite-pwa/assets-generator 2 (Icons)

**Storage**: IndexedDB im Browser (Spiele inkl. Historie, Kader, Einstellungen); dauerhafter Speicher per `navigator.storage.persist()`; Export/Import als JSON-Datei

**Testing**: Vitest 5 (Unit, Domänenlogik, Kontrastprüfung), @testing-library/preact (Komponenten), Playwright 1.64 mit WebKit/iPhone- und Chromium/Android-Profil inkl. `page.clock` für Zeitsprünge, @axe-core/playwright (Barrierefreiheit), Lighthouse CI 0.15

**Target Platform**: iOS 17+ Safari bzw. Home-Bildschirm-App, aktuelles Android Chrome; Hochformat

**Project Type**: Web-App (Single-Page PWA, ohne Backend)

**Performance Goals**: Tor-Tap bis Anzeige < 100 ms (SC-001); erster Aufruf < 2 s auf 4G; JS-Bundle < 60 KB gzip

**Constraints**: offline-fähig nach erstem Laden; keine Drittanbieter-Requests (Schriften selbst gehostet); Uhr-Abweichung ≤ 1 s nach 25 Min mit Sperrbildschirm (SC-003); Kontrast ≥ 4,5:1 in beiden Themes (SC-006)

**Scale/Scope**: 1 Nutzer pro Gerät, ca. 30 bis 60 Spiele pro Saison, Kader-Pool bis ca. 40 Kinder, Aufgebot 10 bis 16, 7 Bildschirme

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Tor = 1 Tap, Knöpfe ≥ 64 pt (untere Bildschirmhälfte), Undo-Leiste, Sicherheitsabfrage nur für Uhr-Aktionen | erfüllt |
| II. Offline-first und lokal | Service Worker precacht alles; IndexedDB; kein Server; Daten verlassen das Gerät nur per Teilen/Export | erfüllt |
| III. Datensparsamkeit | Nur Vornamen/Kürzel im Kader (Hinweis im Eingabefeld), keine Analyse-Skripte, keine externen Requests (CI-Test prüft das) | erfüllt |
| IV. Spec-first und Test-first | Jede FR bekommt Test-IDs (`FR-0xx` im Testnamen); Akzeptanzszenarien als Playwright-Tests im iPhone-Profil; Tests vor Code in `tasks.md` | erfüllt |
| V. Zeit ist eine Berechnung | `clock.ts` ist eine reine Funktion `(events, now, schema) → Zustand`; kein Hochzählen | erfüllt |
| VI. Einfachheit | 5 Laufzeit-Abhängigkeiten, begründet in research.md; kein Router-Framework, kein State-Framework über Signals hinaus | erfüllt |
| VII. Vereinsdesign | `scripts/tokens-to-css.ts` erzeugt CSS-Variablen aus `design/tokens.json`; Lint-Regel verbietet Farbwerte in `src/` | erfüllt |
| Technische Rahmen | PWA, statisch, iOS-Grenzen (Vibration, Hintergrund, Wake Lock) in research.md adressiert | erfüllt |

**Entscheidung D-1 (Hosting)**: Repository öffentlich, GitHub Pages (research.md R-11).

**Nach Phase 1 erneut geprüft**: Datenmodell und Verträge führen keine neuen Abhängigkeiten oder Server ein. Alle Gates bleiben erfüllt.

## Project Structure

### Documentation (this feature)

```text
specs/001-spiel-erfassen/
├── plan.md              # dieser Plan
├── research.md          # Phase 0: Technikentscheidungen
├── data-model.md        # Phase 1: Entitäten, Zustände, Minutenformel
├── quickstart.md        # Phase 1: Validierung Schritt für Schritt
├── contracts/
│   ├── ui-contract.md        # Bildschirme, Aktionen, Test-IDs
│   ├── share-text.md         # Format des geteilten Ergebnistexts
│   └── export.schema.json    # JSON-Schema der Sicherungsdatei
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
design/                      # Design System (Quelle, siehe design/README.md)
public/
└── fonts/                   # aus design/fonts kopiert (Build-Schritt)
scripts/
├── tokens-to-css.ts         # design/tokens.json → src/styles/tokens.css
└── check-contrast.ts        # Kontrastmatrix beider Themes (SC-006)
src/
├── domain/                  # reine Logik, keine Browser-APIs
│   ├── clock.ts             # Spielzustand aus Ereignissen + Zeit
│   ├── minute.ts            # Minuten-Label inkl. "25+1'"
│   ├── game.ts              # Spiel-Reducer: Ereignis anwenden, Tore, Undo
│   ├── share-text.ts        # Ergebnistext
│   ├── roster-parse.ts      # Listen-Import: Zeilen erkennen
│   ├── roster-names.ts      # eindeutige Anzeigenamen ("Max Mü.")
│   ├── roster-merge.ts      # Zusammenführen, Soft-Delete, Wiederbeleben
│   └── export.ts            # Export/Import inkl. Validierung
├── platform/                # dünne Adapter auf Browser-APIs
│   ├── db.ts                # IndexedDB (idb)
│   ├── signal.ts            # Web Audio, Vibration, Blinken
│   ├── wake-lock.ts
│   ├── share.ts             # Web Share / Zwischenablage / Datei
│   └── storage.ts           # persist(), Installationshinweis
├── ui/
│   ├── app.tsx              # Bildschirmwechsel per Hash
│   ├── screens/             # Start, NeuesSpiel, Spiel, Spieldetail, Historie, Kader, Einstellungen
│   └── components/          # TorKnopf, Uhr, Spielstand, Torliste, UndoLeiste, Bestaetigung, Schnellauswahl
├── styles/                  # tokens.css (generiert), base.css
└── main.tsx
tests/
├── unit/                    # Vitest: domain/*, Kontrast
├── component/               # Vitest + Testing Library
└── e2e/                     # Playwright: ein File pro User Story
.github/
├── workflows/ci.yml         # PR: lint, typecheck, unit, build, e2e, lighthouse
├── workflows/deploy.yml     # main: build + deploy auf GitHub Pages
├── workflows/release.yml    # release-please (Conventional Commits)
└── dependabot.yml
```

**Structure Decision**: Ein einzelnes Frontend-Projekt. Trennung in `domain` (rein, 100 % unit-testbar), `platform` (Browser-Adapter, in E2E getestet) und `ui`. Kein Backend.

## Complexity Tracking

Keine Verstöße gegen die Constitution.
