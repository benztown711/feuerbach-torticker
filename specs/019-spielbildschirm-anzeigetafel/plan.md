# Implementation Plan: Spielbildschirm mit Anzeigetafel und sicherem Rückgängig

**Branch**: `019-spielbildschirm-anzeigetafel` (Arbeitsbranch `claude/gracious-fermat-zoyq6c`) | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/98UF1ac9XQguthKaAr1uPu

## Summary

Reine Umgestaltung des Spielbildschirms, keine Datenänderung. Eine reine Funktion `messageSlot` entscheidet, welche Meldung im einzigen Meldeplatz steht (Tor, Lesezeichen, Karte/Wechsel, "neu teilen") und welcher kurze Hinweis als zweite Zeile dazukommt (US1). Die Komponente `MessageBand` zeigt sie als dunkles Band über den Tor-Knöpfen; die bisherigen vier Leisten und drei Toasts in `game.tsx` gehen darin auf. Die Namenszeile und der Spielstand werden zur Anzeigetafel (`Scoreboard`), die Uhr übernimmt die Display-Schrift (US2). Griff und Aufklapp-Zustand entfallen, Knöpfe und Torzeilen wachsen, die Tor-Knöpfe bekommen eine flexible Höhe mit Vorrang der Torliste (US3).

## Technical Context

Unverändert gegenüber `specs/001-spiel-erfassen/plan.md` (TypeScript, Preact, Vitest, Playwright). Keine neue Abhängigkeit, keine Änderung an Speicher, Dienst oder Live-Meldung. Ein PR (#86) für US1 bis US3, Commits je User Story.

**Performance/Constraints**: Bundle-Budget < 60 KB gzip (eher kleiner: drei Toasts und vier Leisten werden eine Komponente). iPhone SE 375 × 667 pt ohne Seiten-Scroll (FR-033, FR-A24).

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Hauptzweck: "Rückgängig" und alle Knöpfe unter der Uhr mindestens 64 × 64 pt, Band in der Sonne erkennbar (Kontrast ≥ 3:1 zur Umgebung), Tor-Knöpfe größer, ein Tap pro Tor unverändert | erfüllt |
| II. Offline-first | keine Netzfunktion berührt | erfüllt |
| III. Datensparsamkeit | keine neuen Daten | erfüllt |
| IV. Test-first | Unit-Test für `messageSlot` (100 % Branch-Coverage) vor der Funktion; E2E je Akzeptanzszenario ("019 USx-Sy") vor dem Umbau; Kontrastpaare vor der README-Änderung | erfüllt |
| V. Zeit ist Berechnung | Uhr nur neu gesetzt (Schrift, Größe); Berechnung unverändert | erfüllt |
| VI. Einfachheit | eine Komponente statt sieben Leisten/Toasts; Aufklapp-Zustand entfällt; keine neue Abhängigkeit | erfüllt |
| VII. Vereinsdesign | nur Tokens (`ink`, `surface`, `surface-alt`, `--font-display`, Stil `ergebnis`); die Umkehrung des Bandes wird in `design/README.md` begründet (Abweichung zugunsten Prinzip I, wie die Constitution es verlangt) | erfüllt |
| IX. Hilfe | 1 neuer, 2 geänderte Einträge im selben PR (Spec-Abschnitt "Hilfe") | erfüllt |

## Design

### Domain

| Datei | Änderung |
|---|---|
| `src/domain/message-slot.ts` (neu) | `messageSlot(input)`: aus den offenen Meldungen (Tor-Rückgängig, Lesezeichen, Karte/Wechsel, "neu teilen") und Hinweisen (Doppeltipp, Teilen-Ergebnis, Übergabe) genau eine Meldung und höchstens einen Hinweis wählen. Rangfolge wie bisher in `game.tsx` (R-A1); Tor-Rückgängig ruht, solange die Torschützen-Auswahl offen ist |

### Oberfläche

| Datei | Änderung |
|---|---|
| `src/ui/components/message-band.tsx` (neu) | Band über den Tor-Knöpfen: Text, optional Hinweiszeile, Knöpfe ("Rückgängig" mit Symbol, "Kommentar", "Teilen"); `role="status"`; Testkennungen der bisherigen Leisten bleiben (`undo-bar`, `btn-undo`, `mark-toast`, `mark-comment`, `mark-undo`, `event-toast`, `event-undo`, `reshare-bar`, `reshare-share`, `double-tap-hint`, `share-result`, `live-handed-over`) |
| `src/ui/components/reshare-bar.tsx` | Zeitsteuerung (10 s) als Hook `useReshareTimer` herauslösen; die Leiste selbst bleibt für die Spieldetails unverändert, der Spielbildschirm zeigt "neu teilen" im Band |
| `src/ui/components/scoreboard.tsx` (neu) | Anzeigetafel: Farbmarke + Name (Heim), Spielstand, Name + Farbmarke (Gast); Doppelpfeil vor dem Anpfiff unter dem Spielstand; Testkennungen `team-home`, `team-away`, `score`, `btn-swap-venue` bleiben |
| `src/ui/components/clock-display.tsx` | unverändert; Größe und Schrift über CSS |
| `src/ui/screens/game.tsx` | `Scoreboard` statt `.teams` + `.score`; Griff und `expanded` entfernen; Leisten und Toasts durch `messageSlot` + `MessageBand` ersetzen; Tor-Knöpfe und Band in einem Bereich `goal-zone` (Band absolut darüber, R-A2) |
| `src/styles/app.css` | `.scoreboard`, Spielstand `ergebnis` (64 px, `--font-display`), Uhr 40 px `--font-display`; `.controls .btn` min. 64 × 64; `.goal-row` min. 48; `.goal-buttons` flexibel (R-A3), Abstand 12 px; `.band` (`ink`/`surface`, Knopf `surface`/`ink`, min. 64); `.list-grip`, `.game--expanded`, `.teams` (Spiel) und Spiel-Toasts entfernen |
| `design/README.md` | Zeile "Torliste, Undo-Leiste" aufteilen, Band mit Begründung (FR-A05) |
| `scripts/check-contrast.ts` | Paare `surface` auf `ink` (Bandtext, 4,5:1), `ink` auf `surface` (Knopf im Band, 4,5:1), `ink` gegen `surface-alt` und `surface` (Bandfläche, 3:1) |
| `src/domain/help-entries.ts` | Einträge laut Spec-Abschnitt "Hilfe" |

### Tests

- Unit: `tests/unit/message-slot.test.ts` (Rangfolge, Hinweis als Zusatzzeile oder allein, Auswahl offen, nichts offen).
- E2E: `tests/e2e/spielbildschirm-us1.spec.ts`, `-us2.spec.ts`, `-us3.spec.ts` mit "019 USx-Sy" im Namen; Maße per `boundingBox`, Farben per `getComputedStyle` gegen die Tokens.
- Bestehend: `karten-wechsel.spec.ts` prüft den Griff (Spec 003 Klärung zu FR-E06). Der Griff entfällt laut FR-A22; der Testteil wird durch "kein Griff, Liste scrollt in sich, Uhr-Knöpfe und Ereignis-Zeile bleiben sichtbar" ersetzt (gleiche Prüftiefe, neue Anforderung). Alle anderen Tests laufen mit unveränderten Testkennungen.
- Visuell: Die Referenzbilder des Spielbildschirms werden aus dem CI-Lauf übernommen (R-22 aus Spec 001, R-A4).

## Risiken

- **Viele Tests hängen an den Leisten**: Testkennungen und Wortlaute bleiben gleich (siehe `MessageBand`). Neu ist nur, dass höchstens eine Meldung sichtbar ist; Tests, die zwei Leisten zugleich erwarten, gibt es nach Suche nicht (R-A1).
- **Höhe auf dem SE**: Knöpfe +16 pt, Anzeigetafel −24 pt, Griff −14 pt. Mit Ereignis-Zeile bleiben für Liste und Tor-Knöpfe etwa 283 pt; Liste 2 × 48 pt, Tor-Knöpfe rund 185 pt (≥ 150). Die E2E-Tests für US3 messen das auf 375 × 667.
- **Visuelle Referenzen**: Die Bilder des Spielbildschirms werden mit diesem PR neu erzeugt (R-A4); der Verdacht, sie seien veraltet, hat sich nicht bestätigt.
