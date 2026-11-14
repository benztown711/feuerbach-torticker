# Implementation Plan: Spiel korrigieren (Tore und Trikots, auch nach dem Spiel)

**Branch**: `017-spiel-korrigieren` (Arbeitsbranch `claude/trusting-galileo-4sqx4m`) | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/54YB4eDZx23EBH51WRWW9j

## Summary

Die Korrektur-Blätter des Spielbildschirms (Tor-Blatt, Torschützen- und Vorlagen-Auswahl, Freitext Gegner, "Minute ändern", "Tor nachtragen") wandern in eine gemeinsame Komponente `GoalEditor`, die Spielbildschirm und Spieldetails nutzen (US1). Ein neues Blatt "Trikots" setzt beide Farben eines Spiels und merkt die Gegnerfarbe (US2). Ein neues Feld `sharedAt` am Spiel und ein Vergleich des Teilen-Texts vor und nach einer Änderung steuern die Leiste "Korrigiert. Ergebnis neu teilen?" (US3). Der Live-Sender meldet Korrekturen alter Spiele nicht mehr, damit "Letzte Spiele" kein jüngeres Spiel verliert (FR-C06). Dienst und Live-Meldung bleiben unverändert.

## Technical Context

Unverändert gegenüber `specs/001-spiel-erfassen/plan.md` (TypeScript, Preact, Vitest, Playwright). Keine neue Abhängigkeit. Ein PR (#83) für US1 bis US3, Commits je User Story.

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Spielbildschirm unverändert bis auf einen Menüeintrag; Korrekturen über bekannte Blätter, Torschütze in 4 Tipps aus der Historie (SC-C01) | erfüllt |
| II. Offline-first | alles lokal gespeichert; Dashboard bekommt Korrekturen wie jede Änderung, nur für gekoppelte, live gesendete Spiele | erfüllt |
| III. Datensparsamkeit | keine neuen personenbezogenen Daten; `sharedAt` ist ein Zeitpunkt, geht nicht an den Dienst | erfüllt |
| IV. Test-first | Unit-Tests für `setKits`, `markShared`, `needsReshare`, `isRecentGame` (100 % Branch-Coverage), Sender und Import; E2E je Akzeptanzszenario ("017 USx-Sy") | erfüllt |
| V. Zeit ist Berechnung | Minuten weiter aus Uhr-Ereignissen (`minuteOptions`, `setGoalMinute`, Spec 012); keine Änderung an der Uhr | erfüllt |
| VI. Einfachheit | Blätter herausgelöst statt nachgebaut; ein optionales Feld; keine Änderung an Dienst oder Live-Meldung | erfüllt |
| VII. Vereinsdesign | Farben nur aus `design/trikot-farben.json` (Palette wie "Neues Spiel"); keine neuen Farbwerte | erfüllt |
| IX. Hilfe | 1 neuer, 8 geänderte Einträge im selben PR (Spec-Abschnitt "Hilfe") | erfüllt |

## Design

### Domain

| Datei | Änderung |
|---|---|
| `src/domain/jersey-colors.ts` | `setKits(game, own, opp)`: beide Farben setzen, nur Palettenfarben (`isPaletteColor`), unverändert bei ungültiger oder gleicher Wahl (FR-C12). Gegnerfarbe merken über das bestehende `rememberColors` (FR-C13) |
| `src/domain/share-text.ts` | `markShared(game, at)`: `sharedAt` setzen (FR-C20). `needsReshare(before, after, players)`: beendet, schon geteilt und Teilen-Text verschieden (FR-C21) |
| `src/domain/live-spieltag.ts` | `isRecentGame(games, game, live)`: gehört zu den `KEEP_PER_GROUP` (10) zuletzt angelegten Spielen derselben Live-Mannschaft auf diesem Handy; nie gesendete Spiele (`livePrivate`) zählen nicht (FR-C06, R-C2) |
| `src/domain/types.ts` | `Game.sharedAt?: number` |
| `src/domain/export.ts` | Sicherung: `sharedAt` optional, sonst Zeitpunkt |

### Plattform

- `src/platform/live-sender.ts`: Ein beendetes Spiel, das der Sender in dieser Sitzung noch nicht kennt, prüft er über die neue Abhängigkeit `isRecent(game)` (in `startLiveSender`: `listGames()` + `isRecentGame`). Nicht unter den 10 zuletzt angelegten: vergessen, nichts senden. Während der Prüfung gilt der jeweils neueste Stand des Spiels (zwei schnelle Korrekturen). Ohne die Abhängigkeit (bestehende Tests) wie bisher.

### Oberfläche

| Datei | Änderung |
|---|---|
| `src/ui/components/goal-editor.tsx` (neu) | `GoalEditor` mit Schritt `goal`, `remove`, `scorer`, `assist`, `text`, `minute`, `add` (R-C1); enthält Tor-Blatt, Rückfrage "Tor wirklich entfernen?", `ScorerPicker` ohne Countdown, "Torschütze Gegner", "Minute ändern", "Tor nachtragen" mit unveränderten Testkennungen; `addGoalStep(game, now)` |
| `src/ui/components/team-mark.tsx` (neu) | Farbmarke einer Mannschaft (bisher in `game.tsx`) |
| `src/ui/components/kits-sheet.tsx` (neu) | Blatt "Trikots" mit zwei `KitRow`, Hinweis bei gleicher Farbe, "Übernehmen"; `applyKits(cur, update, own, opp)` setzt die Farben und merkt eine neue Gegnerfarbe in den Einstellungen |
| `src/ui/components/reshare-bar.tsx` (neu) | Leiste "Korrigiert. Ergebnis neu teilen?" mit "Teilen", schließt nach 10 s (R-C4) |
| `src/ui/screens/game.tsx` | Korrektur-Blätter über `GoalEditor`; die Schnellauswahl direkt nach dem Tor (Countdown, Rückgängig, "Vorlage von?") bleibt hier. "…"-Menü: "Trikots ändern" in jedem Zustand. `update` zeigt die Leiste bei `needsReshare`; "Ergebnis teilen" setzt `sharedAt` |
| `src/ui/screens/game-details.tsx` | Spieldetails bearbeitbar: Einstellungen laden, `update` (speichern, Leiste), Tore im Spielverlauf als Knöpfe (öffnen `GoalEditor`), "Tor nachtragen" unter dem Spielverlauf, Kopfkarte mit Farbmarken und "Trikots ändern", Teilen setzt `sharedAt` |
| `src/styles/app.css` | Tor-Zeilen der Spieldetails als Knöpfe (Ziel mindestens 44 px), Pfeil, Leiste über der Navigation wie in der Historie |
| `src/domain/help-entries.ts` | Einträge laut Spec-Abschnitt "Hilfe" |

## Risiken

- **Umbau des Spielbildschirms**: Die Blätter wandern in eine Komponente. Testkennungen und Wortlaute bleiben gleich, damit die bestehenden E2E-Tests (Spec 001, 003, 009, 012) ohne Änderung grün bleiben (SC-C05).
- **Sendegrenze**: Die 10 zuletzt angelegten Spiele zählt jedes Handy nur aus seinen eigenen Spielen; tickern zwei Handys abwechselnd für eine Mannschaft, kann eine Korrektur an einem Spiel knapp an der Grenze lokal bleiben oder ein Spiel kurz verdrängen. Hinnehmbar (Annahme in der Spec).
- **Visueller Vergleich**: Spielbildschirm und Dashboard bleiben unverändert; die Spieldetails gehören nicht zu den Referenzbildern.
