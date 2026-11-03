# Implementation Plan: Feinschliff der Gestaltung (Karten, dunkles Theme)

**Branch**: `005-gestaltung-feinschliff` (Arbeitsbranch `claude/tender-hamilton-85mpbt`) | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/Kj4HHC1fB7ARH4faeuZLqY

## Summary

Seiten außerhalb des Spiels bekommen eine getönte Grundfläche, jeder Abschnitt wird eine Karte mit roter Abschnittsüberschrift (Vorbild VeoCam-Kalender). Das dunkle Theme erhält eigene Ebenen (fast schwarzer Grund, dunkelgraue Karten, vertiefte Felder), der Abdunkler hinter Blättern und Abfragen wird in beiden Themes dunkel. Hauptknöpfe außerhalb des Spiels werden vereinsrot, der aktive Reiter bekommt eine rote Marke. Der Spielbildschirm ändert sich nur in der Torliste (`surface-alt`). Die Historie gruppiert nach Monaten.

## Technical Context

Unverändert gegenüber `specs/001-spiel-erfassen/plan.md` (TypeScript, Preact, Vitest, Playwright). Keine neue Abhängigkeit, keine Datenänderung.

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Spielbildschirm, Tor-Knöpfe und Tippflächen unverändert; nur Torliste abgesetzt | erfüllt |
| II. Offline-first | nur CSS und Markup, keine externen Ressourcen | erfüllt |
| IV. Test-first | E2E je Akzeptanzszenario ("005 USx-Sy"), Domäne `groupByMonth` mit 100 % Branch-Coverage, Kontrastmatrix erweitert | erfüllt |
| VI. Einfachheit | eine generische Klasse `card`, Flächen-Kontext über eine Variable statt vieler Einzelregeln | erfüllt |
| VII. Vereinsdesign | neue Werte nur in `design/tokens.json`, Abweichung in `design/README.md` begründet; `radius-md` ist im Design System für Karten vorgesehen; keine Schatten, keine Verläufe | erfüllt mit Begründung |

## Design

### Neue Farb-Tokens (`design/tokens.json`)

| Token | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `canvas` | #f4f3f1 (= `surface-alt`) | #0b0b0b (neu) | Seitengrund hinter Karten |
| `card` | #ffffff (= `surface`) | #1f1f1f (= `surface-alt`) | Karten, Blätter, Abfragen |
| `tonal` | #f4f3f1 (= `surface-alt`) | #2a2928 (neu) | ruhige Knöpfe auf Karten |
| `field` | #ffffff (= `surface`) | #0b0b0b (neu) | Eingabefelder und Auswahllisten |
| `scrim` | #231f20 (= `ink` hell) | #000000 (neu) | Abdunkler hinter Blättern (Deckkraft 0,6) |

Kontraste (WCAG): `ink`, `ink-muted` und `rot-text` auf `card`, `canvas`, `tonal` und `field` in beiden Themes mindestens 6:1; neue Paare in `scripts/check-contrast.ts`.

### CSS-Konzept (`src/styles/app.css`)

- `body:has(.page)` erhält `canvas`; Startseite und Spielbildschirm bleiben auf `surface`.
- Klasse `card`: Fläche `card`, 1 px `line`, `radius-md`, Innenabstand `space-4`, Abstand zwischen Karten `space-4`. Überschrift `card__title` (Stil `label`, Farbe `rot-text`).
- **Flächen-Kontext**: `.card, .sheet, .dialog` setzen `--color-surface: var(--color-card)`. Alle Bausteine, die heute auf `surface` liegen (Knöpfe, Chips, Zeilen), übernehmen so die Kartenfläche, ohne jede Regel einzeln anzupassen. Hell ändert sich dadurch nichts (beide #ffffff).
- `.input`, `.select`: Fläche `field`. `.btn--quiet`: Fläche `tonal`.
- `.page .btn--primary`, `.start .btn--primary`: `rot-tief`, Schrift `on-rot`. Spielbildschirm (`.game`) unberührt.
- `.nav__item[aria-current='page']`: Marke `vereinsrot`, Symbol auf `rot-hell` mit `radius-md`.
- `.overlay__backdrop`: `scrim`, Deckkraft 0,6. `.sheet`: oben `radius-md`; `.dialog`: `radius-md`.
- `.goal-list`: `surface-alt`, `radius-md`, Zeilen transparent; entfernte Tore auf `surface` (weiter abgesetzt).

### Markup

| Datei | Änderung |
|---|---|
| `settings.tsx` | vier Abschnitte mit `card`, Überschriften `card__title` |
| `new-game.tsx` | Karte "Begegnung" (`card-matchup`) um Mannschafts-Chips, Gegner, Begegnung, Trikots; Karten `card-schema`, `card-squad` |
| `roster.tsx` | Liste als Karte mit Überschrift; Ändern/Löschen `btn--quiet`; Formulare als Karte |
| `history.tsx` | `groupByMonth`, je Monat `card` mit Überschrift; `history-list` bleibt Hülle aller Monate |
| `game-details.tsx` | Karten Ergebnis, Spielverlauf, Elfmeterschießen, Lesezeichen, Ergebnis teilen |
| `more.tsx`, `help.tsx` | Menü bzw. Hilfetext als Karte, Menüzeilen mit Pfeil |

### Domäne

`groupByMonth(games)` in `src/domain/history.ts`: fasst aufeinanderfolgende Spiele mit gleichem Anpfiff-Monat zusammen (lokale Zeit), Bezeichnung "November 2026" per `Intl.DateTimeFormat('de-DE')`.

### Tests

- Unit: `tests/unit/history.test.ts` (`groupByMonth`), `tests/unit/contrast.test.ts` (neue Paare).
- E2E: `tests/e2e/gestaltung.spec.ts` mit 005 US1-S1 bis S6, US2-S1 bis S3, US3-S1, US4-S1/S2, FR-G07, SC-G05; Farben werden über berechnete Stile gegen die Token-Werte geprüft.
- Visueller Vergleich: neue Referenzbilder aus dem CI-Lauf (R-22), da sich Torliste und Reiter ändern.

## Risiken

- Höhe "Neues Spiel" auf dem iPhone SE durch Karten-Innenabstände: SC-G05 prüft höchstens zwei Bildschirmhöhen.
- `:has()` ab iOS 15.4 und Chrome 105 unterstützt; Zielgeräte iOS 17+.
