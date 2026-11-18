# Implementation Plan: Erster Start und Feinschliff (UX-Welle 2, Paket E)

**Branch**: `022-erster-start` (Arbeitszweig `feat/022-erster-start`) | **Date**: 2026-11-18 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

## Summary

Vier kleine, voneinander unabhängige Verbesserungen aus Nutzertest und Design-Check, ohne Änderung an Daten, Meldungsformat oder Dienst:

- **US1 (P1)**: Installationshinweis mit "Später" unter den Aktionen des Startbildschirms (nachgeladene Komponente, reine Entscheidungslogik in `src/domain/install-hint.ts`).
- **US2 (P2)**: "Neues Spiel": Knopf unten angeheftet, Gegner optional (leer wird "Gegner"), Grund-Zeile bei gesperrtem Knopf.
- **US3 (P3)**: Wortlaut: Satz in der Karte "Trainer? …", Einstellung "Torvorlagen (Assists)".
- **US4 (P3)**: Blatt "Eltern live zuschauen lassen" (Wortlaut, "Trainer-Link teilen"), Schalter "Ton bei Toren" in Rot, "Für Trainer" als eine Fläche.

## Technical Context

TypeScript, Preact, Vitest, Playwright wie in `specs/001-spiel-erfassen/plan.md`. Keine neue Laufzeit-Abhängigkeit, keine Änderung an IndexedDB-Schema, Sicherung, Meldungsformat oder Dienst. Neu im Browserspeicher nur `localStorage["torticker-install-later"]` (Kalendertag, R-F1).

**Performance/Constraints**: Hauptbundle < 60 KB gzip (59,6 KB, kaum Luft): Der Hinweis liegt in `live-start.tsx` (nachgeladen), die Gegner-Änderung ersetzt vorhandenen Code. Netzwerk-Wächter: keine neuen Verbindungen. iPhone SE 375 × 667 pt.

**PR**: Ein PR (Paket E), Commits je User Story. Paralleler Zweig: Paket B (Spec 021), der `game.tsx`, `scorer-picker.tsx`, `goal-list.tsx` besitzt und in `new-game.tsx` nur eine Vorbelegung ergänzt.

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | "Weiter zum Anpfiff" ohne Scrollen, Gegner nicht mehr Pflicht; "Später" mindestens 48 pt, Trainer-Link teilen mindestens 64 pt | erfüllt |
| II. Offline-first und lokal | Hinweis ohne Netz; "Später" nur lokal; "Trainer-Link teilen" nur nach bewusstem Tipp wie bisher | erfüllt |
| III. Datensparsamkeit | keine neuen Daten; ein Kalendertag lokal | erfüllt |
| IV. Test-first | Unit-Tests für `install-hint.ts` (100 % Branch) und `startHint`; E2E je Szenario ("022 USx-Sy") vor dem Code, zuerst rot | erfüllt |
| V. Zeit ist Berechnung | nicht berührt; "heute" wird aus der Uhrzeit des Geräts berechnet, nicht gezählt | erfüllt |
| VI. Einfachheit | keine Abhängigkeit, kein eigener Installieren-Dialog (R-F2), Kalendertag statt Spieltag-Erkennung (R-F1) | erfüllt |
| VII. Vereinsdesign | nur Tokens (`card`, `line`, `rot-tief`, `on-rot`); Kontrastpaar in der Matrix; Design-Check nach der Umsetzung | erfüllt |
| VIII. Kostenfrei | kein neuer Dienst | erfüllt |
| IX. Hilfe | 7 geänderte Einträge laut Spec-Abschnitt "Hilfe", je User Story eine Aufgabe | erfüllt |

## Design

### Domäne

| Datei | Änderung |
|---|---|
| `src/domain/install-hint.ts` (neu) | `installPlatform(ua, touchPoints)`, `installSteps(platform)`, `showInstallHint({standalone, dismissedAt, laterDay, today})` (R-F1, R-F2) |
| `src/domain/live-quick.ts` | `startHint`: "Mit E1 und E2." (FR-F30) |
| `src/domain/help-entries.ts` | sieben Einträge (Spec "Hilfe") |

### Oberfläche

| Datei | Änderung |
|---|---|
| `src/ui/components/live-start.tsx` | `InstallHint` (US1) unter allen Aktionen von `StartLive`; Karte "Trainer? …" mit Zusatzsatz (US3); Blatt: Knopf "Live-Spieltag anlegen", Fertig-Zustand mit "Trainer-Link teilen" (US4) |
| `src/ui/screens/new-game.tsx` | Gegner optional (`opponent.trim() || 'Gegner'` vor der Prüfung), Platzhalter, Grund-Zeile, angehefteter Knopf (US2) |
| `src/ui/screens/settings.tsx` | Titel "Torvorlagen (Assists)" (US3) |
| `src/ui/screens/live-dashboard.tsx` | keine Codeänderung; Schalter nur per CSS (US4) |
| `src/ui/screens/live.tsx` | "Link einfügen" in der Karte "TRAINER" (US4); Bereich "Für Trainer" als eine Fläche (CSS) |
| `src/styles/app.css` | Block "Spec 022": angehefteter Knopf, Installationshinweis, Schalter rot, "Für Trainer" als Fläche |
| `scripts/check-contrast.ts` | Beschreibung des Paars `on-rot` auf `rot-tief` (Schalter), keine neue Schwelle (R-F4) |

### Tests

| Datei | Inhalt |
|---|---|
| `tests/unit/install-hint.test.ts` (neu) | Plattform, Anleitung, Sichtbarkeit (100 % Branch) |
| `tests/unit/live-quick.test.ts` | `startHint` "Mit …" |
| `tests/e2e/erster-start-us1.spec.ts` bis `-us4.spec.ts` (neu) | je Akzeptanzszenario ein Test mit ID im Namen |
| `tests/e2e/a11y.spec.ts` | eigener describe-Block "022 Erster Start" am Ende |
| bestehende Tests | siehe `tasks.md`, Abschnitt "Geänderte bestehende Tests" |

## Konfliktkandidaten mit Paket B (Spec 021)

`src/ui/screens/new-game.tsx` (Paket B: Vorbelegung des Gegners; Paket E: Gegnerfeld, Knopf), `src/domain/help-entries.ts` (Paket B im Block Spiel; Paket E in Start, Spiel erfassen, Ereignisse und Live), `src/styles/app.css` (je ein eigener, markierter Block am Dateiende), `tests/e2e/a11y.spec.ts` (je ein eigener describe-Block am Ende). `game.tsx`, `scorer-picker.tsx`, `goal-list.tsx` fasst Paket E nicht an.
