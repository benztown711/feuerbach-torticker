# Feature Specification: Spiel erfassen (Tore, Minute, Countdown)

**Feature Branch**: `001-spiel-erfassen`

**Created**: 2026-11-02

**Status**: Draft (2 offene Punkte, siehe Abschnitt "Offene Fragen")

## Clarifications

### Session 2026-11-02

- Q: Torschütze per Kader oder Freitext? → A: Eigene Tore per Kaderliste; Gegentore optional per Freitext.
- Q: Was passiert bei 00:00? → A: Die Uhr läuft als Nachspielzeit weiter, deutlich gekennzeichnet (rot). Tore darin werden als "25+1'", "50+2'" usw. dokumentiert, je nach eingestelltem Spielzeit-Schema.
- Q: Torschützen beim Gegner? → A: Nur optionaler Freitext, relevant bei bekannten Gegnern.
- Q: Mehrere eigene Teams? → A: Nein, ein Team, Name einstellbar.
- Q: Signal am Abschnittsende? → A: Ton plus Vibration (wo technisch möglich). Anhalten und Zurücksetzen der Uhr nur mit Sicherheitsabfrage.
- Q: Tor vor Anpfiff? → A: Tor-Knöpfe sind erst ab Anpfiff aktiv.

**Input**: User description: "Ergebnis-Tracker für unsere Fußballspiele. Sehr einfach Tore für Heim- oder Gastmannschaft mit großen Knöpfen hinzufügen, Minute wird automatisch festgehalten. Am Anfang Gegner eintragen und ob die Sportvereinigung Feuerbach daheim oder auswärts spielt. Countdown-Timer, typischerweise 25 Minuten. Optional Torschütze (Spielerliste oder Freitext)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tor mit einem Tap erfassen (Priority: P1)

Atti steht am Spielfeldrand, das Spiel läuft. Fällt ein Tor, tippt er auf den großen Knopf der jeweiligen Mannschaft. Der Spielstand erhöht sich sofort, und das Tor wird mit der aktuellen Spielminute protokolliert.

**Why this priority**: Das ist der Kern der App. Ohne diese Funktion gibt es keinen Nutzen.

**Independent Test**: Spiel starten, auf "Tor Heim" tippen, Spielstand und Torliste prüfen.

**Acceptance Scenarios**:

1. **Given** ein angelegtes, noch nicht angepfiffenes Spiel, **Then** sind beide Tor-Knöpfe deaktiviert und sichtbar ausgegraut.
2. **Given** ein laufendes Spiel in der 7. Minute (Uhr zeigt 06:12 gespielt), **When** der Nutzer auf "Tor Feuerbach" tippt, **Then** steht es 1:0 für Feuerbach und die Torliste zeigt "7' Feuerbach".
3. **Given** ein laufendes Spiel, **When** der Nutzer auf "Tor Gegner" tippt, **Then** erhöht sich der Zähler des Gegners um 1 und der Eintrag wird mit Minute gespeichert.
4. **Given** ein gerade erfasstes Tor, **When** der Nutzer innerhalb von 10 Sekunden auf "Rückgängig" tippt, **Then** wird das Tor entfernt und der Spielstand korrigiert.
5. **Given** ein beliebiges erfasstes Tor, **When** der Nutzer es in der Torliste löscht, **Then** wird der Spielstand neu berechnet.

---

### User Story 2 - Spiel anlegen und Countdown steuern (Priority: P1)

Vor dem Anpfiff trägt der Nutzer den Gegner ein, wählt "Heim" oder "Auswärts" und übernimmt die vorbelegte Spielzeit (2 × 25 Minuten). Mit "Anpfiff" startet der Countdown. Zur Halbzeit hält die Uhr an, mit "Anpfiff 2. Halbzeit" läuft sie weiter.

**Why this priority**: Ohne laufende Uhr gibt es keine automatische Minute. Heim/Auswärts bestimmt, welcher Knopf links (Heim) und rechts (Gast) steht.

**Independent Test**: Spiel mit Gegner "TSV Musterstadt", Auswärts, 2 × 25 Min anlegen, starten, Anzeige prüfen.

**Acceptance Scenarios**:

1. **Given** der Startbildschirm, **When** der Nutzer Gegner "TSV Musterstadt" eingibt und "Auswärts" wählt, **Then** zeigt der Spielbildschirm "TSV Musterstadt" als Heim (links) und "Sportvg Feuerbach" als Gast (rechts).
2. **Given** ein angelegtes Spiel, **When** der Nutzer "Anpfiff" tippt, **Then** läuft der Countdown von 25:00 abwärts.
3. **Given** der Countdown erreicht 00:00 in Halbzeit 1, **Then** ertönt ein Signal (Ton, Vibration wo möglich), und die Uhr läuft als Nachspielzeit aufwärts weiter ("+0:01", "+0:02" ...), rot gekennzeichnet.
4. **Given** Halbzeit 1 ist seit 40 Sekunden in der Nachspielzeit (2 × 25 Min), **When** ein Tor erfasst wird, **Then** wird es als "25+1'" gespeichert.
5. **Given** Nachspielzeit läuft, **When** der Nutzer "Halbzeitpfiff" tippt und die Sicherheitsabfrage bestätigt, **Then** stoppt die Uhr und die Anzeige zeigt "Halbzeit".
6. **Given** Halbzeit 2 läuft seit 3:10 Minuten, **When** ein Tor erfasst wird, **Then** wird es als Minute 29 gespeichert (fortlaufende Zählung über beide Halbzeiten).
7. **Given** ein laufendes Spiel, **When** das Handy 5 Minuten gesperrt war und wieder geöffnet wird, **Then** zeigt die Uhr die korrekte Restzeit.
8. **Given** ein laufendes Spiel, **When** der Nutzer "Pause" tippt (z. B. Verletzung), **Then** fragt die App "Uhr wirklich anhalten?"; erst nach Bestätigung hält die Uhr an, bis "Weiter" getippt wird.
9. **Given** ein laufendes Spiel, **When** der Nutzer "Zurücksetzen" wählt, **Then** fragt die App "Uhr wirklich zurücksetzen?"; ohne Bestätigung bleibt alles unverändert.
10. **Given** eine Sicherheitsabfrage ist offen, **When** der Nutzer "Abbrechen" tippt oder daneben tippt, **Then** läuft die Uhr unverändert weiter.

---

### User Story 3 - Torschütze nachtragen (Priority: P2)

Nach einem Feuerbach-Tor kann der Nutzer optional den Torschützen auswählen, entweder sofort über ein kurz eingeblendetes Auswahlfeld oder später in der Torliste.

**Why this priority**: Wertvoll für Eltern und Trainer, aber das Spiel ist auch ohne Torschützen vollständig dokumentiert.

**Independent Test**: Tor erfassen, Torschütze aus Kader wählen, Torliste prüfen.

**Acceptance Scenarios**:

1. **Given** ein gerade erfasstes Feuerbach-Tor, **When** der Nutzer in der Schnellauswahl "Lenny" antippt, **Then** zeigt die Torliste "12' Feuerbach, Lenny".
2. **Given** die Schnellauswahl ist offen, **When** der Nutzer nichts tut, **Then** schließt sie sich nach 8 Sekunden ohne Torschützen.
3. **Given** ein Feuerbach-Tor ohne Torschützen, **When** der Nutzer es in der Torliste antippt, **Then** kann er einen Torschützen aus dem Kader wählen.
4. **Given** ein Gegentor, **When** der Nutzer es in der Torliste antippt, **Then** kann er optional einen Torschützen als Freitext eintragen (z. B. "Nr. 9").
5. **Given** ein Tor, **When** der Nutzer "Eigentor" wählt, **Then** wird es als Eigentor gekennzeichnet.

---

### User Story 4 - Ergebnis teilen (Priority: P2)

Nach Abpfiff teilt der Nutzer das Ergebnis mit Torfolge über das System-Teilen-Menü (z. B. WhatsApp-Elterngruppe).

**Why this priority**: Häufigster Anschlussschritt nach dem Spiel, ersetzt das manuelle Abtippen.

**Independent Test**: Beendetes Spiel öffnen, "Teilen" tippen, generierten Text prüfen.

**Acceptance Scenarios**:

1. **Given** ein beendetes Spiel Sportvg Feuerbach gegen TSV Musterstadt 3:1, **When** der Nutzer "Teilen" tippt, **Then** öffnet sich das Teilen-Menü mit einem Text wie:
   ```
   ⚽ Sportvg Feuerbach – TSV Musterstadt 3:1 (1:1)
   7' 1:0 Lenny
   18' 1:1
   31' 2:1 Ben
   44' 3:1 Eigentor
   ```
2. **Given** ein Gerät ohne Teilen-Funktion, **When** der Nutzer "Teilen" tippt, **Then** wird der Text in die Zwischenablage kopiert und dies bestätigt.

---

### User Story 5 - Kader pflegen (Priority: P3)

Der Nutzer legt einmalig eine Spielerliste (Vorname oder Kürzel, optional Rückennummer) an, die für die Torschützenauswahl genutzt wird.

**Why this priority**: Nur nötig, wenn Torschützen per Auswahl statt Freitext erfasst werden.

**Independent Test**: Spieler anlegen, umbenennen, löschen; Auswahl im Spiel prüfen.

**Acceptance Scenarios**:

1. **Given** ein leerer Kader, **When** der Nutzer "Lenny" mit Nummer 7 anlegt, **Then** erscheint "7 Lenny" in der Torschützenauswahl.

---

### User Story 6 - Spielhistorie (Priority: P3)

Der Nutzer sieht vergangene Spiele mit Ergebnis und kann sie erneut öffnen, teilen oder löschen.

**Independent Test**: Zwei Spiele beenden, Historie öffnen, Reihenfolge und Inhalte prüfen.

**Acceptance Scenarios**:

1. **Given** zwei beendete Spiele, **When** der Nutzer die Historie öffnet, **Then** sind beide neuestes zuerst mit Datum, Gegner und Ergebnis gelistet.

---

### Edge Cases

- Ein Tor fällt in der Nachspielzeit von Halbzeit 1 (2 × 25 Min): Es wird als "25+1'" gespeichert; Halbzeit 2 beginnt trotzdem bei 26'.
- Der Nutzer vergisst den Halbzeitpfiff: Die Nachspielzeit läuft weiter, die Anzeige bleibt rot; ab +5:00 erscheint ein deutlicher Hinweis "Halbzeitpfiff vergessen?".
- Tore während Halbzeitpause oder nach Abpfiff: Tor-Knöpfe sind deaktiviert; nachträgliche Korrektur über die Torliste.
- Kader ist beim ersten Spiel noch leer: Die Schnellauswahl bietet "Spieler anlegen" direkt an.
- Die App wird während des Spiels versehentlich geschlossen oder der Browser leert den Cache: Das laufende Spiel muss nach dem Öffnen exakt wiederhergestellt werden.
- Doppeltipp auf "Tor" (zwei Tore in einer Sekunde): Schutz gegen versehentliche Doppelerfassung (z. B. 1,5 s Sperre mit Undo-Hinweis).
- Das Display schaltet sich während des Spiels ab: App soll den Bildschirm wach halten, solange die Uhr läuft (sofern das Gerät es unterstützt).
- Der Nutzer wechselt die Seiten (Heim/Auswärts) versehentlich falsch: Nachträglich im laufenden Spiel änderbar, ohne Tore zu verlieren.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Nutzer MUSS ein Spiel mit Gegnername (Pflicht), Heim/Auswärts (Pflicht) und Spielzeit-Schema anlegen können.
- **FR-002**: Spielzeit-Schema MUSS aus Anzahl Abschnitten (1 bis 4) und Dauer pro Abschnitt (1 bis 60 Minuten) bestehen; Vorgabe 2 × 25 Minuten. Die zuletzt genutzte Einstellung wird vorbelegt.
- **FR-003**: Der Spielbildschirm MUSS zwei große Tor-Knöpfe zeigen, Heimmannschaft links, Gastmannschaft rechts, jeweils mit Mannschaftsnamen beschriftet.
- **FR-004**: Ein Tap auf einen Tor-Knopf MUSS ein Tor mit Mannschaft, Spielminute, Abschnitt und Zeitstempel speichern und den Spielstand sofort aktualisieren.
- **FR-005**: Die Spielminute MUSS als angefangene Minute fortlaufend über alle Abschnitte berechnet werden (Sekunde 0:00 bis 0:59 = 1. Minute; bei 2 × 25 Min beginnt Halbzeit 2 bei 26'). In der Nachspielzeit lautet die Minute "<Abschnittsende>+<angefangene Nachspielminute>", z. B. "25+1'", "50+2'", bei 3 × 25 Min "75+1'".
- **FR-006**: Die Uhr MUSS Anpfiff, Pause, Fortsetzen, Abschnittsende (Halbzeitpfiff), Abpfiff und Zurücksetzen unterstützen und ihre Zeit ausschließlich aus Zeitstempeln berechnen. Pause, Halbzeitpfiff, Abpfiff und Zurücksetzen MÜSSEN per Sicherheitsabfrage bestätigt werden; Anpfiff und Fortsetzen nicht.
- **FR-007**: Bei 00:00 MUSS ein deutliches Signal erfolgen (Ton, Vibration wo das Gerät es erlaubt, visuell). Danach läuft die Uhr als Nachspielzeit aufwärts weiter, in `rot-text` und mit "+" gekennzeichnet, bis der Nutzer den Abschnitt beendet.
- **FR-008**: Jedes Tor MUSS rückgängig gemacht (Undo-Leiste) und in der Torliste gelöscht oder bearbeitet werden können.
- **FR-009**: Für Feuerbach-Tore MUSS optional ein Torschütze aus dem Kader gewählt werden können, zusätzlich "Eigentor Gegner". Für Gegentore KANN optional ein Torschütze als Freitext eingetragen werden.
- **FR-010**: Der Spielzustand MUSS nach jeder Änderung lokal persistiert werden und einen App-Neustart überstehen.
- **FR-011**: Ein beendetes Spiel MUSS als Text über das System-Teilen-Menü geteilt werden können (Fallback: Zwischenablage).
- **FR-012**: Die App MUSS nach dem ersten Laden ohne Netzverbindung voll funktionsfähig sein und auf dem Home-Bildschirm installierbar sein.
- **FR-013**: Während die Uhr läuft, SOLL der Bildschirm wach gehalten werden.
- **FR-014**: Es gibt genau eine eigene Mannschaft; ihr Name MUSS einstellbar sein (Vorgabe "Sportvg Feuerbach").
- **FR-021**: Die Tor-Knöpfe MÜSSEN nur zwischen Anpfiff und Abschnittsende bzw. Abpfiff aktiv sein (einschließlich Nachspielzeit und Pause); davor, in der Halbzeitpause und nach Abpfiff sind sie deaktiviert.

### Gestaltung (Design System der Sportvg Feuerbach, Details in `design/README.md`)

- **FR-015**: Die App MUSS die Farben, Schriften und Abstände aus `design/tokens.json` verwenden; eigene Farbwerte im Code sind nicht erlaubt.
- **FR-016**: Der Tor-Knopf der Sportvg Feuerbach MUSS die einzige rote Fläche des Spielbildschirms sein (`vereinsrot`, Beschriftung `on-rot` fett ab 24px). Der Tor-Knopf des Gegners MUSS neutral sein (`ink` als Fläche, `surface` als Schrift), damit beide Knöpfe sich in der Helligkeit unterscheiden und nicht nur im Farbton.
- **FR-017**: Spielstand und Uhr MÜSSEN im Stil `ergebnis` mit gleich breiten Ziffern dargestellt werden, damit die Anzeige beim Herunterzählen nicht springt.
- **FR-018**: Die App MUSS ein helles und ein dunkles Theme nach Systemeinstellung anbieten; das Wappen bleibt in beiden Themes auf weißem Feld.
- **FR-019**: App-Icon und Kopfbereich MÜSSEN das Vereinswappen unverzerrt verwenden (Seitenverhältnis 0,84, Mindestgröße 24px, Schutzraum ringsum).
- **FR-020**: Torschützen MÜSSEN als Vorname oder Kürzel erfasst werden; die Eingabe weist darauf hin, keine Nachnamen zu verwenden. Der geteilte Text enthält nur Vornamen.

### Key Entities

- **Spiel**: Gegner, Heim/Auswärts, eigene Mannschaft, Datum, Spielzeit-Schema, Uhr-Ereignisse (Start/Pause/Fortsetzen/Abschnittsende mit Zeitstempel), Status (angelegt, läuft, Pause, Halbzeit, beendet).
- **Tor**: gehört zu einem Spiel; Mannschaft (eigene/Gegner), Minute, Nachspielminute (optional), Abschnitt, Zeitstempel, optional Torschütze (eigene: Kaderspieler; Gegner: Freitext), Eigentor-Kennzeichen.
- **Spieler (Kader)**: Vorname oder Kürzel, optional Rückennummer, aktiv/inaktiv.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Vom Tap auf "Tor" bis zur aktualisierten Anzeige vergehen unter 100 ms.
- **SC-002**: Ein neues Spiel ist in unter 20 Sekunden angelegt und angepfiffen.
- **SC-003**: Die angezeigte Restzeit weicht nach 25 Minuten (inkl. Sperrbildschirm-Phasen) um höchstens 1 Sekunde von einer Referenzuhr ab.
- **SC-004**: In einem Test mit 3 Eltern/Trainern erfassen alle ein Tor beim ersten Versuch ohne Erklärung.
- **SC-005**: Lighthouse-PWA- und Accessibility-Score jeweils ≥ 90.
- **SC-006**: Alle Text-Hintergrund-Paare erreichen in beiden Themes mindestens 4,5:1 (große Schrift ab 24px: 3:1), automatisch geprüft in der CI.

## Assumptions

- Ein Gerät erfasst ein Spiel; keine Synchronisation zwischen mehreren Geräten.
- Primärer Nutzer ist ein Trainer oder Elternteil der Mannschaft der Sportvg Feuerbach; Ansicht immer aus Sicht der Sportvg Feuerbach.
- Karten, Wechsel und Spielerstatistiken über Tore hinaus sind nicht Teil dieser Version.
- Kein Login, keine Cloud-Sicherung in Version 1.

## Offene Fragen

1. **Turniermodus**: Gewünscht? (Erläuterung im Chat vom 02.11.2026; Vorschlag: eigene Spec 002.)
2. **Vibration auf dem iPhone**: Web-Apps können auf dem iPhone nicht vibrieren. Reicht Ton plus Bildschirmsignal, oder wird die App als native Hülle (Capacitor) verpackt?
