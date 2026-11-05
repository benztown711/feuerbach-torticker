# Implementation Plan: Kader sortieren (Spec 013)

**Branch**: `013-kader-sortierung` (umgesetzt auf `claude/friendly-fermi-kr9tmr`) | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/KJu7HV4KZQtpTrUH3H5hRP

## Summary

Neue Geräte-Einstellung `Settings.rosterSort` (`'name' | 'number'`, Vorgabe `'name'`). Die Sortierung des Kaders wandert aus der festen Reihenfolge in `visiblePlayers` in einen Parameter; jede Stelle, die den Kader zeigt, übergibt die Einstellung. Ein PR, eine User Story.

## Technical Context

Wie Spec 001; keine neue Abhängigkeit. Sortierung mit `Intl.Collator('de', { sensitivity: 'base' })` (Groß-/Kleinschreibung egal, Umlaute nach deutscher Regel). Datenänderung nur in den Einstellungen (neues Feld mit Vorgabe; fehlender oder unbekannter Wert wird `'name'`, keine Migration nötig).

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Auswahl außerhalb des Spiels; im Spiel ändert sich nur die Reihenfolge, keine zusätzlichen Taps | erfüllt |
| II. Offline-first und lokal | Einstellung bleibt auf dem Gerät, nicht in Sicherung oder Live-Übertragung | erfüllt |
| III. Datensparsamkeit | Keine neuen Daten über Spieler | erfüllt |
| IV. Spec-first und Test-first | Unit-Tests "013 FR-K0x", E2E "013 US1-Sx" vor dem Code, 100 % Branch-Coverage in `src/domain` | erfüllt |
| VI. Einfachheit | Zwei feste Werte, kein zweiter Umschalter, keine absteigende Sortierung | erfüllt |
| VII. Vereinsdesign | Segmente wie "Darstellung" (`.segmented--2`), nur Tokens | erfüllt |
| IX. Hilfe | Neuer Eintrag `kader-sortierung` (verwandt mit `kader`, `torschuetze`) | erfüllt |

## Research

### R-K1 Vergleich der Namen

- **Decision**: Ein `Intl.Collator('de', { sensitivity: 'base' })` auf Modulebene. "ben" und "Ben" gelten als gleich (dann entscheidet die Nummer), Umlaute sortieren wie der Grundbuchstabe ("Ömer" neben "Oskar"). Das Leerzeichen sortiert vor Buchstaben, daher "Max Me." und "Max Mü." vor "Maxi".
- **Alternatives considered**: `localeCompare(…, 'de')` wie bisher (unterscheidet Groß-/Kleinschreibung, Spec FR-K03 will das nicht); Sortieren nur nach Vorname ohne Kürzel (zwei "Max" wären dann zufällig geordnet).

### R-K2 Reihenfolge ohne Anzeige

- `roster-merge.ts` (Liste einfügen) braucht nur die sichtbaren Spieler, keine Reihenfolge. Dafür gibt es `activePlayers` ohne Sortierung; `visiblePlayers(players, sort)` sortiert immer ausdrücklich. So vergisst keine Anzeige die Einstellung (Typprüfung erzwingt den Parameter).

## Design

- `src/domain/types.ts`: `RosterSort = 'name' | 'number'`, `Settings.rosterSort`.
- `src/domain/settings.ts`: Vorgabe `'name'`; `isRosterSort`; `withSettingsDefaults` ersetzt fehlende oder unbekannte Werte (FR-K02).
- `src/domain/roster.ts`: `activePlayers(players)`, `sortPlayers(players, sort)` (FR-K03, FR-K04), `visiblePlayers`, `squadPlayers`, `otherPlayers`, `rosterShareText` mit Pflichtparameter `sort` (FR-K05).
- `src/domain/roster-merge.ts`: `activePlayers` statt `visiblePlayers`.
- `src/ui/screens/settings.tsx`: Abschnitt "KADER" direkt nach "MEINE MANNSCHAFTEN": Unterzeile "Sortieren nach", Segmente "Vorname" | "Rückennummer" (`aria-pressed`, Testkennungen `roster-sort-name`, `roster-sort-number`), Hilfetext "Gilt für Kader, Aufgebot und alle Spieler-Auswahlen im Spiel." (FR-K01).
- `src/ui/screens/roster.tsx`: lädt die Einstellungen; Liste und "Kader teilen" sortiert; Ladezustand, bis beides da ist (kein Umsortieren nach dem ersten Bild).
- `src/ui/screens/new-game.tsx`: Aufgebot mit `settings.rosterSort`.
- `src/ui/screens/game.tsx`: Torschützen, Vorlagen, Karten, Wechsel mit `settings.rosterSort`; "gibt es Spieler?" über `activePlayers`.
- `src/ui/components/shootout.tsx`: neuer Prop `sort`.
- `src/domain/help-entries.ts`: Eintrag `kader-sortierung` (Thema "Mannschaften und Kader", Quelle "013 US1"); `kader` bleibt, weil er schon drei verwandte Einträge hat (010 FR-H11).
- Spec 001 US5-S2: "sortiert nach Nummer" → "sortiert nach der Einstellung aus Spec 013".

## Tests

- Unit `tests/unit/roster.test.ts`: FR-K03, FR-K04 (Beispiel aus der Spec, gleiche Vornamen, gleiche Nummer, ohne Nummer, Groß-/Kleinschreibung, Umlaute, 2 vor 10), FR-K05 (Gruppen bei Aufgebot/Andere, Teilen-Text).
- Unit `tests/unit/settings.test.ts` bzw. bestehende Einstellungs-Tests: FR-K02 (Vorgabe, fehlend, unbekannt, gültig bleibt).
- E2E `tests/e2e/kader-sortierung.spec.ts`: 013 US1-S1 bis S8 im Kader "7 Max", "3 Tom", "10 Ben", "Leo".
- Bestehende E2E, die die alte feste Reihenfolge prüfen (001 US5-S2, US7-S7), erwarten jetzt die Vorgabe "Vorname"; die Reihenfolge nach Nummer prüft 013 US1-S3.

## Bundle

Wenige Zeilen; Budget 60 KB bleibt eingehalten (`npm run budget`).
