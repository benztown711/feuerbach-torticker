# Implementation Plan: Spieltag sicher (Koppeln ohne Suchen, Korrekturen, Uhr)

**Branch**: `012-spieltag-sicher` (Arbeitsbranch `claude/zealous-meitner-mbtusz`) | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/2cLae3hhgdkyRPd9JGbP9F

## Summary

Vier Bausteine für den ersten produktiven Spieltag: (1) Koppeln über Startbildschirm und Trainer-Link-Seite mit einem Tipp, (2) Tore mit Minute nachtragen und verschieben, Pfiff zurücknehmen, (3) Uhr korrigieren durch Verschieben des Anpfiffs, (4) Mannschaften ohne Spiel auf dem Dashboard. Die Rechenlogik liegt in einem neuen Domain-Modul `corrections.ts`; die Live-Meldung bleibt unverändert, weil sie den ganzen Spielstand trägt.

## Technical Context

Unverändert gegenüber `specs/001-spiel-erfassen/plan.md` (TypeScript, Preact, Vitest, Playwright). Keine neue Abhängigkeit. Ein PR für alle User Stories (nur ein Arbeitsbranch), Commits je User Story.

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Nachtragen in 4 Tipps, Uhr korrigieren in 3 bis 4; Tor-Knöpfe unverändert; Korrekturen hinter "…", nicht auf dem Hauptbildschirm | erfüllt |
| II. Offline-first | alles lokal; Zwischenablage nur nach Tipp, Inhalt nur lokal geprüft; Kopplung weiter nur nach Bestätigung | erfüllt |
| IV. Test-first | Unit-Tests für `corrections.ts` mit 100 % Branch-Coverage; E2E je Akzeptanzszenario ("012 USx-Sy") | erfüllt |
| V. Zeit ist Berechnung | Uhr korrigieren verschiebt den Zeitstempel des Anpfiffs; Minuten werden aus Zeitstempeln neu berechnet, nie gezählt | erfüllt |
| VI. Einfachheit | keine neue Abhängigkeit, kein neues Datenfeld, keine Änderung an Export oder Live-Meldung | erfüllt |
| IX. Hilfe | 4 neue, 4 geänderte Einträge im selben PR (Spec-Abschnitt "Hilfe") | erfüllt |

## Design

### Domain (`src/domain/corrections.ts`, neu)

- `sectionRuns(events)`: je Abschnitt die Laufstrecken `[von, bis|null]` aus `clockEvents` (Anpfiff öffnet, Anhalten schließt, Fortsetzen öffnet, Pausen- und Schlusspfiff schließen; ein erneuter Anpfiff desselben Abschnitts ersetzt die Strecken).
- `playedIn(runs, section, t)`: gespielte Zeit des Abschnitts bis zur Uhrzeit `t`. `timeAt(runs, section, played)`: Umkehrung, Uhrzeit zu einer gespielten Zeit (über das Ende hinaus: Ende der letzten Strecke).
- `minuteOptions(game, now)`: alle gespielten Minuten `{ section, minute, stoppage, label }` in Spielreihenfolge (FR-S11). `defaultOption(game, now)`: aktuelle Minute bei laufender oder angehaltener Uhr, sonst die letzte.
- `addGoalAt(game, side, option, newId)`: neues Tor mit `at = timeAt(Mitte der Minute, höchstens gespielte Zeit)`, Tore nach `at` sortiert (stabil), Stände aufgefrischt (FR-S10, S13, S14).
- `setGoalMinute(game, goalId, option)`: Minute, Nachspielminute, Abschnitt und `at` neu, sortiert, Stände aufgefrischt (FR-S12).
- `canUndoWhistle(game, now)` / `undoWhistle(game)`: letztes Uhr-Ereignis `sectionEnd` oder `fullTime`, höchstens 10 Minuten alt, kein Elfmeterschießen; entfernt es, setzt `halfTimeScore` (Ende Abschnitt 1) bzw. `finalScore` und `drawSettled` zurück, Status neu (FR-S15).
- `clockShiftRange(game, now)` / `shiftClock(game, minutes, now)`: verschiebt den letzten Anpfiff um `−minutes`. Grenzen: nach dem vorigen Uhr-Ereignis (ohne vorheriges höchstens 60 Minuten), nicht hinter die erste Unterbrechung, das erste Tor oder Ereignis des Abschnitts oder jetzt (FR-S21). Minuten der Tore und Ereignisse des Abschnitts aus `at` neu (FR-S22); noch nicht erreichte Signalschwellen des Abschnitts werden aus `signalledThresholds` entfernt (FR-S23).
- `refreshScores(game)` (in `goals.ts`): `halfTimeScore` (falls gesetzt) = Tore des 1. Abschnitts, `finalScore` (falls gesetzt) = alle Tore; auch in `removeGoal` und `restoreGoal` (FR-S14).

### Live (`src/domain/live-board.ts`)

- `boardView(...).waiting`: Mannschaften der Konfiguration ohne Karte (Name aus der Konfiguration, Heimtrikot); das Dashboard zeigt sie als Zeile "<Name> · heute noch kein Spiel", sobald mindestens eine Karte da ist (FR-S30).
- Live-Meldung unverändert: Korrekturen erzeugen einen normalen Schreibvorgang, der Sender meldet den neuen Stand (auch nach dem Schlusspfiff).

### Oberfläche

| Datei | Änderung |
|---|---|
| `src/ui/screens/start.tsx` | Karte "Trainer?" bzw. Live-Zeile (FR-S01, S04); Knopf liest die Zwischenablage, Kopplungsfrage (`CoupleDialog`), sonst Einfügefeld im Blatt (FR-S02, S03) |
| `src/ui/components/paste-link.tsx` (neu) | Einfügefeld aus `live.tsx` herausgelöst, von Startbildschirm und Live-Spieltag genutzt |
| `src/ui/screens/live.tsx` | ohne Kopplung "Trainer-Link einfügen" als Hauptknopf vor "Live-Spieltag anlegen" mit Hinweis (FR-S05) |
| `src/ui/screens/lead-link.tsx` | schon gekoppelt: Weiterleitung zum Start; "Koppeln und loslegen" als Hauptknopf; in der installierten App ohne Kopieren; nach dem Koppeln Start (FR-S03, S06) |
| `src/ui/screens/game.tsx` | "…"-Menü: "Tor nachtragen", "Pausenpfiff/Schlusspfiff zurücknehmen", "Uhr korrigieren"; Blätter "Tor nachtragen" und "Uhr korrigieren"; Tor-Blatt "Minute ändern"; Rückfrage zum Pfiff (FR-S10 bis S23) |
| `src/ui/screens/live-dashboard.tsx` | Zeilen für Mannschaften ohne Karte (FR-S30) |
| `src/domain/help-entries.ts` | Einträge laut Spec-Abschnitt "Hilfe" |

### Zwischenablage

`navigator.clipboard.readText()` nur im Klick-Handler; Ablehnung, Fehlen der Funktion oder Text ohne Link führen zum Einfügefeld. Auswertung mit dem bestehenden `findLink` (live-link). Die E2E-Mocks (`fixtures.ts`) erhalten `readText`, das den aufgezeichneten Text liefert.

## Risiken

- **Kopplung im Browser auf dem iPhone**: Safari-Daten können nach Tagen ohne Besuch verschwinden; erneutes Antippen des Trainer-Links koppelt wieder (Spec, Edge Cases). Kein Datenverlust beim Live-Spieltag selbst.
- **Bestehende E2E-Tests**: 006 US1-S6 erwartet die alte Anleitung und nach dem Koppeln die Verwaltung; wird laut SC-S04 an das neue Verhalten angepasst (Text und Ziel), der Ablauf bleibt.
