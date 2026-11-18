# Implementation Plan: Spielablauf am Spieltag (UX-Welle 2, Paket B)

**Branch**: `021-spielablauf` (Arbeitszweig im Worktree von Paket B) | **Date**: 2026-11-18 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

## Summary

Drei Verbesserungen am Ablauf im Spiel aus dem Nutzertest vom 17.11.2026, ohne Änderung an Daten, Speicher, Meldungsformat oder Dienst:

- **US1 "Nächstes Spiel"**: Im Endzustand des Spielbildschirms ersetzt ein Hauptknopf die ausgegrauten Tor-Knöpfe. Er öffnet "Neues Spiel" über `#/neu/nach/<Spiel-ID>`; `nextGameDraft` (Domäne) leitet die Vorbelegung aus dem beendeten Spiel ab, `nextPlanChoice` wählt das nächste offene Planspiel der Mannschaft von heute (R-W1).
- **US2 Auswahl ohne Sperre**: Die Schnellauswahl nach dem Tor ("Wer hat getroffen?", "Vorlage von?") dockt ohne Abdunkler von unten an die Tor-Knöpfe an und legt sich über Anzeigetafel, Uhr und Torliste (R-W2). Ein Tipp auf einen Tor-Knopf schließt sie und zählt das Tor.
- **US3 Torzeile mit Pfeil**: Jede Zeile der Torliste im Spiel zeigt rechts einen Chevron in `ink-muted`.

## Technical Context

Unverändert gegenüber `specs/001-spiel-erfassen/plan.md` (TypeScript, Preact, Vitest, Playwright). Keine neue Laufzeit-Abhängigkeit, keine Änderung an IndexedDB-Schema, Sicherung, Meldungsformat oder Dienst.

**Performance/Constraints**: Hauptbundle < 60 KB gzip (vorher 59,6 KB): Korrektur-Blätter und Auswahl für Tore werden nachgeladen und vorgeladen (R-W3). iPhone SE 375 × 667 pt ohne Seiten-Scroll; Tor-Knöpfe bei offener Auswahl vollständig sichtbar.

**PR**: Ein PR für Paket B (US1 bis US3), Commits je Aufgabe. Paket E (Spec 022) läuft parallel; gemeinsame Dateien siehe unten.

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Ein Tor bleibt ein Tipp, auch bei offener Auswahl (vorher ging es verloren); Rückgängig ohne Rückfrage bleibt; "Nächstes Spiel" mindestens 64 pt; Tor-Knöpfe ändern Platz und Größe nicht | erfüllt |
| II. Offline-first und lokal | Vorbelegung aus dem Speicher des Handys, keine neue Verbindung (FR-W06); nachgeladener Teil vom Service Worker vorgehalten | erfüllt |
| III. Datensparsamkeit | keine neuen Daten | erfüllt |
| IV. Test-first | Unit-Tests für `next-game.ts` vor dem Code (100 % Branch-Coverage); je Akzeptanzszenario ein E2E-Test "021 USx-Sy", zuerst rot | erfüllt |
| V. Zeit ist Berechnung | Countdown der Auswahl weiter aus dem Zeitstempel des Tores (`until`), auch wenn der Teil später geladen wird | erfüllt |
| VI. Einfachheit | eine kleine Domänendatei, keine Abhängigkeit, kein Umbau des Spielbildschirms (CSS-Andocken statt neuem Layout) | erfüllt |
| VII. Vereinsdesign | nur bestehende Tokens (`rot-tief`, `on-rot`, `card`, `ink`, `ink-muted`) und das vorhandene Chevron; Abweichung "Hauptknopf im Spiel" für "Nächstes Spiel" in design/README.md begründet | erfüllt |
| VIII. Kostenfrei | nichts Neues | erfüllt |
| IX. Hilfe | 1 neuer, 4 geänderte Einträge laut Spec-Abschnitt "Hilfe", je User Story eine Aufgabe | erfüllt |

## Design

**Domäne**

| Datei | Änderung |
|---|---|
| `src/domain/next-game.ts` (neu) | `nextGameDraft(game, team)`: Mannschaft, Spielzeit, Heim/Gast, Trikots, "nur für dieses Spiel" beim eigenen Trikot, Live; `nextPlanChoice(choices, teamKey)`: frühestes offenes, nicht fremd vorgemerktes Planspiel |
| `src/domain/help-entries.ts` | Einträge laut Spec-Abschnitt "Hilfe" |

**Oberfläche**

| Datei | Änderung |
|---|---|
| `src/ui/router.ts`, `src/ui/app.tsx` | Route `#/neu/nach/<id>` → `NewGameScreen after` |
| `src/ui/screens/game.tsx` | Endzustand: "Nächstes Spiel" statt Tor-Knöpfen (FR-W01); Schnellauswahl im Andock-Bereich über den Tor-Knöpfen, Band darunter (FR-W10, FR-W14); `onGoal` schließt die Auswahl beim gezählten Tor (FR-W11, FR-W12); `GoalEditor` nachgeladen (R-W3) |
| `src/ui/screens/new-game.tsx` | nur Vorbelegung: Eigenschaft `after`, Laden des Spiels, `nextGameDraft`, `nextPlanChoice`, Fokus (FR-W02 bis FR-W04); kein Layout (Paket E) |
| `src/ui/screens/game-details.tsx` | `GoalEditor` nachgeladen (R-W3), Verhalten unverändert |
| `src/ui/components/scorer-picker.tsx` | Darstellung "angedockt" ohne Overlay, wenn ein Countdown läuft (FR-W10, FR-W13, FR-W15); Korrektur unverändert (FR-W16) |
| `src/ui/components/goal-list.tsx` | Chevron am Zeilenende (FR-W20) |
| `src/styles/app.css` | Block `/* Spec 021 */`: `.next-game`, `.goal-dock`, `.scorer--dock`, `.goal-row__chev` |
| `design/README.md` | Zeilen "Nächstes Spiel" und "Torschützen-Auswahl im Spiel" mit Begründung |

### Gemeinsam berührte Dateien (Paket E, Spec 022)

| Datei | Paket B | Regel |
|---|---|---|
| `src/ui/screens/new-game.tsx` | Eigenschaft `after`, ein `useEffect` für die Vorbelegung, Auswahl des Planspiels, Fokus auf `#opponent` | nur Vorbelegung, keine Änderung an Markup oder Layout; Paket E besitzt die Datei, der zweite PR löst Konflikte beim Rebase |
| `src/ui/app.tsx`, `src/ui/router.ts` | eine Route | nur ergänzen |
| `src/domain/help-entries.ts` | neu `naechstes-spiel` am Ende des Blocks "Spiel erfassen"; Änderungen an `pausenpfiff`, `torschuetze`, `vorlage`, `spielbildschirm` | Paket E fügt in Start, Einstellungen, Live ein |
| `src/styles/app.css` | eigener Block `/* Spec 021 */` am Ende des Abschnitts Spielbildschirm | keine Änderung an gemeinsamen Regeln |
| `tests/e2e/a11y.spec.ts` | eigener `describe`-Block am Dateiende | bestehende Tests unverändert |

### Tests

- **Unit (zuerst rot)**: `tests/unit/next-game.test.ts`.
- **E2E je User Story**, Namen mit "021 USx-Sy": `tests/e2e/spielablauf-us1.spec.ts`, `tests/e2e/spielablauf-us2.spec.ts`, `tests/e2e/spielablauf-us3.spec.ts`. SE-Maße per `test.use({ viewport: { width: 375, height: 667 } })` in den Layout-Tests, damit sie auch im Profil `android` greifen.
- **a11y**: `describe('021 Spielablauf …')` am Ende von `tests/e2e/a11y.spec.ts`: Endzustand mit "Nächstes Spiel" und offene Schnellauswahl, hell und dunkel.
- **Bestehende Tests**: Tests, die nach dem Schlusspfiff ausgegraute Tor-Knöpfe erwarten, prüfen stattdessen "Nächstes Spiel" (FR-W01); Tests, die die Schnellauswahl über einen Tipp auf den Abdunkler schließen, gibt es nicht. Prüftiefe bleibt.
- **Visuell**: Referenzbilder des Spielbildschirms zeigen laufendes Spiel und Halbzeit ohne Torzeilen mit Pfeil; ändern sie sich, kommen neue Bilder aus dem CI-Lauf.

## Risiken

- **Konflikt in `new-game.tsx`** mit Paket E: Änderung klein und an einer Stelle; Fokus über `id="opponent"` (bestehend). Sollte Paket E das Feld umbenennen, folgt der Fokus beim Rebase.
- **Auswahl zu hoch für kleine Handys**: nur das Raster scrollt (FR-W13); geprüft mit 16 Kindern auf 375 × 667 pt.
- **Nachgeladene Auswahl beim allerersten Tor** (Cache leer, langsames Netz): Tor zählt sofort, Auswahl folgt; im Normalfall ist der Teil beim Anpfiff längst geladen (Vorladen beim Öffnen des Spielbildschirms).
