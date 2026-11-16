# Research: Spielbildschirm mit Anzeigetafel und sicherem Rückgängig

## R-A1 Ein Meldeplatz statt sieben Leisten

- **Decision**: Reine Funktion `messageSlot` in `src/domain/message-slot.ts`. Eingaben: offene Meldungen (Tor-Rückgängig, Lesezeichen, Karte/Wechsel, "neu teilen"), ob die Torschützen-Auswahl offen ist, und aktive Hinweise (Doppeltipp, Teilen-Ergebnis, Übergabe). Ergebnis: höchstens eine Meldung und höchstens ein Hinweis. Rangfolge Meldungen: Tor (nicht bei offener Auswahl) vor Lesezeichen vor Karte/Wechsel vor "neu teilen", wie die heutigen Bedingungen in `game.tsx`. Rangfolge Hinweise: Übergabe vor Teilen-Ergebnis vor Doppeltipp (der wichtigste zuerst; Doppeltipp ist der kürzeste und harmloseste).
- **Rationale**: Testbar mit 100 % Branch-Coverage, `game.tsx` wird kürzer; die Komponente zeigt nur noch, was die Funktion wählt.
- **Alternatives considered**: Bedingungen weiter inline in `game.tsx` (nicht unit-testbar, sieben verstreute Blöcke); globaler Meldungs-Store (zu viel für einen Bildschirm, Prinzip VI).

## R-A2 Lage des Bandes

- **Decision**: Tor-Knöpfe und Band liegen in einem gemeinsamen Bereich `.goal-zone` (`position: relative`). Das Band ist absolut positioniert mit `bottom: 100%` und kleinem Abstand, links und rechts wie der Inhalt (`--space-4`). Es legt sich damit immer direkt über die Tor-Knöpfe auf den unteren Teil der Torliste, egal wie hoch die Tor-Knöpfe gerade sind.
- **Rationale**: Die Höhe der Tor-Knöpfe ist künftig flexibel (R-A3); die bisherige Rechnung `bottom: calc(var(--goal-h) + …)` ginge nicht mehr. Ein Band im Fluss würde auf dem SE die Torliste auf unter eine Zeile drücken.
- **Alternatives considered**: Band im Fluss zwischen Liste und Knöpfen (wie im Mockup gezeichnet, auf dem SE zu eng); feste Höhe der Tor-Knöpfe beibehalten (widerspricht FR-A23).

## R-A3 Flexible Höhe der Tor-Knöpfe mit Vorrang der Torliste

- **Decision**: `.goal-zone` mit `flex: 0 1 33dvh; min-height: 150px` (wächst nicht über ein Drittel, schrumpft bis 150 px); `.goal-list` mit `flex: 1 1 0; min-height: 2 Zeilen` (2 × 48 px plus Linien). Abstand zwischen Heim und Gast 12 px (`calc(var(--space-2) + var(--space-1))`, nur Tokens).
- **Rationale**: Flexbox verteilt den Platz ohne Rechnung in JavaScript: Ist genug Höhe da, behalten die Knöpfe ein Drittel und die Liste bekommt den Rest; ist es eng (SE mit Ereignis-Zeile), geben zuerst die Knöpfe bis 150 px nach, die Liste behält zwei Zeilen (FR-A23, FR-A24).
- **Alternatives considered**: `clamp()` mit fester Höhe (kennt die Ereignis-Zeile nicht); Messung per `ResizeObserver` (unnötig komplex).

## R-A4 Visuelle Referenzbilder

- **Decision**: Die Referenzbilder des Spielbildschirms (`spiel-laeuft-*`, `spiel-nachspielzeit-*`, `spiel-halbzeit-*`, alle Profile) werden nach dem ersten CI-Lauf aus dem Artefakt `playwright-report-<profil>-<n>` (`*-actual.png`) übernommen, wie in Spec 001 R-22 beschrieben, und im selben PR eingecheckt. Dabei wird geprüft, warum die bisherigen Bilder für "Spiel läuft" noch den Stand vor Spec 011 zeigen (Design-Check vom 07.11.2026).
- **Rationale**: Nur das Playwright-Image der CI liefert vergleichbare Schriftdarstellung.
- **Alternatives considered**: Lokal erzeugen (Schrift weicht ab, Vergleich in der CI schlüge fehl).

## R-A5 Spielstand und Uhr

- **Decision**: Spielstand mit den Werten des Stils `ergebnis` aus `design/tokens.json` (64 px, Zeilenhöhe 1, fett, `--font-display`), gleich breite Ziffern. Uhr 40 px in `--font-display` (bisher 44 px); Beschriftung unverändert. Die Namen behalten 15 px fett und brechen nach FR-040 um.
- **Rationale**: `design/README.md` sieht `ergebnis` für Spielstand und Uhr vor; die Uhr bleibt sichtbar kleiner, damit der Spielstand führt (FR-A12). 64 px "10 : 9" in der schmalen Display-Schrift sind etwa 110 px breit; auf dem SE bleiben je Name rund 110 px (zwei Zeilen à 15 px).
- **Alternatives considered**: Uhr ebenfalls 64 px (zwei gleich laute Zahlen, der Befund bliebe); Namen in `zwischentitel` 22 px (passt auf dem SE nicht neben den Spielstand).
