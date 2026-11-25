# Implementation Plan: Spiel läuft schon (Spec 023)

**Branch**: `023-spiel-laeuft-schon` (Arbeitsbranch `claude/confident-bohr-1yzwnf`) | **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/T6uhaUepzaREv6b4QjPMkz

## Summary

Ein neues Blatt "Spiel läuft schon" rechnet beim Einstieg den bisherigen Verlauf als Uhr-Ereignisse zurück (R-J1) und legt den bisherigen Spielstand als Tore "vor Tickerbeginn" an (R-J2). "Uhr korrigieren" stellt künftig die Restzeit direkt ein und rückt bei Bedarf den bisherigen Verlauf mit (R-J4). Keine Änderung am Dienst, ein optionales Feld in der Live-Meldung (R-J7).

## Technical Context

Unverändert gegenüber `specs/001-spiel-erfassen/plan.md` (TypeScript, Preact, Vitest, Playwright). Keine neue Abhängigkeit. Ein PR (#98) für US1 bis US3.

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Ein Blatt, Einstieg 7:4 im 3. Drittel mit ≤ 18 Tipps (SC-J01), Knöpfe ≥ 48 pt im Blatt wie bestehende Blätter; "Rückgängig" ohne Rückfrage | erfüllt |
| II. Offline-first | alles lokal; Dashboard wie jede Änderung | erfüllt |
| III. Datensparsamkeit | keine neuen personenbezogenen Daten | erfüllt |
| IV. Test-first | Unit-Tests `late-start.ts`, `restRange`/`setRest` (100 % Branch-Coverage); E2E je Akzeptanzszenario "023 USx-Sy" | erfüllt |
| V. Zeit ist Berechnung | Einstieg und Korrektur setzen nur Zeitstempel der Uhr-Ereignisse | erfüllt |
| VI. Einfachheit | keine neuen Felder am Spiel; Wiederverwendung von Tor-Blatt und Blatt "Trikots" | erfüllt |
| VII. Vereinsdesign | nur bestehende Tokens und Komponenten (Sheet, Chips, Knöpfe) | erfüllt |
| IX. Hilfe | 1 neuer, 4 geänderte Einträge im selben PR | erfüllt |

## Design

### Domain

| Datei | Änderung |
|---|---|
| `src/domain/types.ts` | `ClockEvent.entry?: boolean`, `Goal.beforeTicker?: boolean` |
| `src/domain/late-start.ts` (neu) | `entryChoices(schema)` (Abschnitte und Pausen mit Beschriftung), `entryMinute(schema, section, rest)`, `joinGame(game, choice, now, newId)` (FR-J04, FR-J10, FR-J11, FR-J14), `MAX_PRE_GOALS = 30`, `ENTRY_BREAK_MS` |
| `src/domain/corrections.ts` | `restRange(game, now)`, `setRest(game, rest, now)` statt `clockShiftRange`/`shiftClock` (FR-J20 bis FR-J22); Tore vor Tickerbeginn begrenzen und verschieben nichts im Abschnitt; `setGoalMinute` entfernt `beforeTicker`; `canUndoWhistle` lehnt `entry` ab (R-J5) |
| `src/domain/goals.ts` | `GoalRow.label` "–" und `beforeTicker` für Tore vor Tickerbeginn |
| `src/domain/share-text.ts` | Minutenspalte "–" für Tore vor Tickerbeginn |
| `src/domain/live-snapshot.ts`, `live-takeover.ts`, `live-board.ts` | `pre` in der Live-Meldung (R-J7); Dashboard-Zeile mit "–" und Kennzeichen |
| `src/domain/export.ts` | Sicherung: `entry` und `beforeTicker` optional, boolesch |

### Oberfläche

| Datei | Änderung |
|---|---|
| `src/ui/components/late-start-sheet.tsx` (neu, nachgeladen) | Blatt "Spiel läuft schon" (Abschnitt, Restzeit, Spielstand, "Trikots ändern", "Übernehmen") |
| `src/ui/screens/game.tsx` | Zweitknopf "Spiel läuft schon" vor dem ersten Anpfiff; Leiste "Rückgängig" nach dem Einstieg; Blatt "Uhr korrigieren" mit Restzeit und −5/−1/+1/+5; Route `einstieg` öffnet das Blatt |
| `src/ui/components/goal-list.tsx`, `goal-editor.tsx`, `game-details.tsx`, `live-dashboard.tsx` | "–" und "vor Tickerbeginn" |
| `src/ui/screens/new-game.tsx`, `src/ui/router.ts` | Schalter "Spiel läuft schon", Route `#/spiel/<id>/einstieg` |
| `src/styles/app.css` | Blatt-Layout (Chips, Stepper) aus bestehenden Klassen und Tokens |
| `src/domain/help-entries.ts` | Einträge laut Spec-Abschnitt "Hilfe" |

## Risiken

- **Bestehende Tests zu "Uhr korrigieren"** (Spec 012 US4) prüfen "+1 Min"/"−1 Min" und die alte Grenze am vorigen Pfiff. Die Anforderung ändert sich bewusst (FR-J20 bis FR-J22); die Tests werden auf die Restzeit umgestellt, ihre Aussagen (Tor-Minuten folgen, Signale erneut fällig, Grenzen) bleiben.
- **iPhone SE**: Das Blatt muss bei 3 Dritteln ohne Scrollen passen (SC-J04); Abschnitts-Chips dreispaltig.
- **Bundle-Budget**: Blatt nachgeladen wie Tor-Blätter (Spec 021 R-W3).
