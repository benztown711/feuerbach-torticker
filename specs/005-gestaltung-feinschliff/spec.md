# Feature Specification: Feinschliff der Gestaltung (Karten, dunkles Theme)

**Feature Branch**: `005-gestaltung-feinschliff`

**Created**: 2026-11-03

**Status**: Freigegeben. Review A und B gemeinsam im Chat (03.11.2026): alle Empfehlungen übernommen. Mockup: https://claude.ai/artifact/Kj4HHC1fB7ARH4faeuZLqY. Stand nach Spec 003 Teil 2 und 3 (Karten, Wechsel, Pokal) nachgezogen.

**Input**: User description: "Die Tor-Ticker-App etwas aufhübschen. Der Hell-Dunkel-Modus ist vom Prinzip her okay, der Dunkel-Modus gefällt mir nicht so gut: Dort schwimmen die Sektionen, die logisch zusammengehören, noch mehr als im hellen Modus. UI und UX ein bisschen aufhübschen, nicht komplett umstellen. Die VeoCam-App gefällt mir; dort Inspiration holen, wie Sektionen hervorgehoben und Zusammengehörigkeit von Inhalten und Bausteinen gezeigt wird. Darüber hinaus gerne Best Practices aus der Community."

## Ausgangslage

Gesichtet am 03.11.2026 (Screenshots aller Bildschirme hell und dunkel, Kalender-App `veo-cam-kalender` nur lesend):

- **Torticker heute**: Alle Inhalte liegen auf einer einzigen Fläche (`surface`). Abschnitte trennen sich nur durch kleine graue Versal-Labels und 1-px-Linien. Im dunklen Theme sind Linien (`line` #3a3836 auf #141414) und Labels kaum sichtbar, deshalb "schwimmen" die Abschnitte.
- **Dunkles Theme, Fehler**: Der Abdunkler hinter Blättern und Abfragen nutzt `ink`. Im dunklen Theme ist `ink` fast weiß, der Hintergrund wird dadurch grau aufgehellt statt abgedunkelt.
- **Dunkles Theme, Gewicht**: Hauptknöpfe und gewählte Chips sind weiß gefüllte Flächen. Hauptaktion und Auswahlzustand sehen gleich aus (in "Neues Spiel": gewähltes Aufgebot und "Weiter zum Anpfiff").
- **Abweichung Code zu design/README.md**: Die Torliste soll laut README auf `surface-alt` liegen, liegt aber auf `surface`.
- **VeoCam-Kalender**: graue Grundfläche, jeder Abschnitt eine weiße Karte mit feinem Rand und Rundung, rote Kleinüberschrift über dem Kartentitel, Akzentkante links für Status, aktiver Reiter unten mit getönter Fläche und roter Marke, ruhige (getönte) Zweitknöpfe.

## Clarifications

### Session 2026-11-03

- Q: Hauptknopf Schwarz/Weiß wie bisher oder Vereinsrot? → A: Vereinsrot (`rot-tief`, Schrift `on-rot`) auf allen Seiten außerhalb des Spielbildschirms (auch Startseite und Blätter dieser Seiten). Auf dem Spielbildschirm bleiben alle Knöpfe neutral (design/README.md), damit nichts mit dem Tor-Knopf Feuerbach verwechselt wird.
- Q: Dunkler Grund fast schwarz (neuer Farbwert) oder bestehende Werte? → A: Neuer, dunklerer Grund als begründete Abweichung vom Design System in `design/tokens.json` und `design/README.md`.
- Q: Spielbildschirm nur Torliste oder auch Anzeigetafel als Karte? → A: Nur die Torliste (mit Ereignissen aus Spec 003). Elfmeterschießen, Pokal-Abfrage und Ereignis-Blatt bleiben in Aufbau und Farben gleich; sie profitieren nur vom behobenen Abdunkler.
- Q: Historie nach Monaten in Karten gruppieren? → A: Ja, neueste zuerst; der Filter nach Mannschaft wirkt vorher.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Zusammengehöriges auf einen Blick (Priority: P1)

Der Nutzer erkennt auf jeder Seite außerhalb des Spiels sofort, welche Inhalte zusammengehören, weil jeder Abschnitt eine eigene Karte auf leicht getönter Grundfläche ist.

**Independent Test**: Einstellungen, Neues Spiel, Kader, Historie, Spieldetails und Mehr in beiden Themes öffnen; jeder Abschnitt ist als Karte abgegrenzt.

**Acceptance Scenarios**:

1. **Given** die Einstellungen, **Then** stehen "Meine Mannschaften", "Im Spiel erfassen", "Darstellung" und "Sicherung" je auf einer eigenen Karte mit roter Abschnittsüberschrift.
2. **Given** "Neues Spiel", **Then** stehen Gegner, Heim/Gast und Trikots gemeinsam auf der Karte "Begegnung"; Spielzeit (mit Signaltest) und Aufgebot sind je eine Karte.
3. **Given** die Spieldetails, **Then** gibt es die Karten Ergebnis, Spielverlauf und Ergebnis teilen; die Textvorschau sitzt in der Teilen-Karte über den Knöpfen.
4. **Given** der Kader, **Then** steht die Spielerliste mit Überschrift "<n> Spieler" auf einer Karte; "Ändern" und "Löschen" sind ruhige, getönte Knöpfe.
5. **Given** "Mehr", **Then** steht das Menü auf einer Karte, jede Zeile mit Pfeil.
6. **Given** die Historie mit Spielen aus zwei Monaten, **Then** hat jeder Monat eine eigene Karte mit Überschrift (z. B. "NOVEMBER 2026"), neueste zuerst.

---

### User Story 2 - Dunkles Theme mit klaren Ebenen (Priority: P1)

Im dunklen Theme heben sich Karten deutlich vom Grund ab, Blätter und Abfragen dunkeln den Hintergrund ab, Eingabefelder sind als Felder erkennbar.

**Independent Test**: Dunkles Theme, Einstellungen und Neues Spiel öffnen; Torschützen-Blatt im Spiel öffnen.

**Acceptance Scenarios**:

1. **Given** das dunkle Theme, **Then** ist der Seitengrund dunkler als die Karten, die Karten haben einen sichtbaren Rand.
2. **Given** das dunkle Theme und ein offenes Blatt oder eine Abfrage, **Then** ist der Spielbildschirm dahinter dunkler als vorher, nicht heller.
3. **Given** das dunkle Theme, **Then** sind Eingabefelder und Auswahllisten in der Karte vertieft (dunkler als die Karte).

---

### User Story 3 - Wo bin ich (Priority: P2)

Der aktive Reiter unten ist auf einen Blick erkennbar.

**Acceptance Scenarios**:

1. **Given** eine beliebige Seite, **Then** trägt der aktive Reiter eine Marke in Vereinsrot oben und eine getönte Fläche (`rot-hell`) hinter dem Symbol; die anderen Reiter bleiben grau.

---

### User Story 4 - Hauptaktion hebt sich ab (Priority: P2)

Die eine Hauptaktion einer Seite unterscheidet sich von Auswahlzuständen.

**Acceptance Scenarios**:

1. **Given** "Neues Spiel" mit gewähltem Aufgebot, **Then** ist "Weiter zum Anpfiff" vereinsrot (`rot-tief`) und unterscheidet sich damit von den gewählten Spieler-Chips (`ink`).
2. **Given** der Spielbildschirm vor dem Anpfiff, **Then** bleibt "Anpfiff" neutral (`ink`).

### Edge Cases

- iPhone SE (375 × 667): "Neues Spiel" passt weiterhin mit höchstens einmal Scrollen (SC-M02); Karten dürfen dafür keine zusätzlichen Leerzeilen erzwingen.
- Spielbildschirm: passt weiterhin ohne Seiten-Scroll (FR-033); Tor-Knöpfe, Uhr und Spielstand bleiben unverändert.
- Startbildschirm: unverändert (roter Balken, Wappen, "Neues Spiel").
- Themewahl "Hell"/"Dunkel" in den Einstellungen wirkt auf alle neuen Flächen gleich wie die Systemeinstellung.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-G01**: Seiten außerhalb des Spiel- und Startbildschirms MÜSSEN eine getönte Grundfläche haben; jeder Abschnitt MUSS als Karte (Fläche, 1-px-Rand, `radius-md`) darauf liegen.
- **FR-G02**: Abschnittsüberschriften auf Karten MÜSSEN im Stil `label` in `rot-text` stehen; Unterlabels innerhalb einer Karte bleiben `ink-muted`.
- **FR-G03**: "Neues Spiel" MUSS Gegner, Begegnung und Trikots in einer Karte "Begegnung" zusammenfassen; Spielzeit und Aufgebot bleiben eigene Karten. Felder, Reihenfolge und Verhalten bleiben gleich.
- **FR-G04**: Der Abdunkler hinter Blättern und Abfragen MUSS in beiden Themes dunkler sein als der Inhalt dahinter.
- **FR-G05**: Im dunklen Theme MUSS der Seitengrund dunkler als die Karte sein und Eingabefelder vertieft (dunkler als die Karte).
- **FR-G06**: Der aktive Reiter der Navigationsleiste MUSS eine Marke in `vereinsrot` und eine Fläche in `rot-hell` hinter dem Symbol zeigen.
- **FR-G06a**: Hauptknöpfe (`btn--primary`) außerhalb des Spielbildschirms MÜSSEN `rot-tief` mit Schrift `on-rot` sein; auf dem Spielbildschirm bleiben sie `ink`.
- **FR-G07**: Die Torliste im Spiel (mit Ereignissen) MUSS auf `surface-alt` liegen (wie design/README.md); sonst bleibt der Spielbildschirm unverändert.
- **FR-G08**: Wiederholte Zeilenaktionen (Kader: Ändern, Löschen) MÜSSEN als ruhige, getönte Knöpfe erscheinen; Größe der Tippfläche unverändert.
- **FR-G09**: Die Historie MUSS Spiele nach Monat des Anpfiffs gruppieren, je Monat eine Karte mit Überschrift (z. B. "NOVEMBER 2026"), neueste zuerst.
- **FR-G10**: Neue Farbwerte MÜSSEN in `design/tokens.json` stehen und in `design/README.md` begründet sein; im Code bleiben Farben nur über Tokens erreichbar (Stylelint).

### Key Entities

- Keine neuen Daten. Neue semantische Farb-Tokens: `canvas` (Grundfläche), `card` (Karte), `tonal` (ruhige Knöpfe), `field` (Eingabefeld), `scrim` (Abdunkler); Werte im Plan.

## Success Criteria *(mandatory)*

- **SC-G01**: Kontrastmatrix (SC-006) um alle neuen Paare erweitert (Text auf Karte, Grundfläche, getöntem Knopf, Reiter-Fläche); beide Themes mindestens 4,5:1.
- **SC-G02**: axe-core ohne Verstöße auf allen Seiten in beiden Themes.
- **SC-G03**: Visueller Vergleich: neue Referenzbilder der Kernbildschirme hell und dunkel; der Spielbildschirm unterscheidet sich nur in der Torliste und im aktiven Reiter.
- **SC-G05**: "Neues Spiel" mit einer Mannschaft passt auf dem iPhone SE weiterhin mit höchstens einmal Scrollen (SC-M02), automatisch geprüft.
- **SC-G04**: Alle bestehenden E2E-Tests bleiben ohne Änderung an ihren Abläufen grün.

## Assumptions

- Rein optische Änderung: keine Datenmodell-, Speicher- oder Ablaufänderung, keine neue Laufzeit-Abhängigkeit.
- Die Rundung `radius-md` (6px) ist im Design System für "Karten auf Webseiten" vorgesehen; Schatten und Verläufe bleiben ausgeschlossen.
- Der VeoCam-Kalender dient nur als Vorbild für Muster, nicht für Farben oder Schriften.
