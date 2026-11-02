# Feature Specification: Spiel erfassen (Tore, Minute, Countdown)

**Feature Branch**: `001-spiel-erfassen`

**Created**: 2026-11-02

**Status**: Draft (wartet auf Klärung, siehe Abschnitt "Offene Fragen")

**Input**: User description: "Ergebnis-Tracker für unsere Fußballspiele. Sehr einfach Tore für Heim- oder Gastmannschaft mit großen Knöpfen hinzufügen, Minute wird automatisch festgehalten. Am Anfang Gegner eintragen und ob die Sportvereinigung Feuerbach daheim oder auswärts spielt. Countdown-Timer, typischerweise 25 Minuten. Optional Torschütze (Spielerliste oder Freitext)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tor mit einem Tap erfassen (Priority: P1)

Atti steht am Spielfeldrand, das Spiel läuft. Fällt ein Tor, tippt er auf den großen Knopf der jeweiligen Mannschaft. Der Spielstand erhöht sich sofort, und das Tor wird mit der aktuellen Spielminute protokolliert.

**Why this priority**: Das ist der Kern der App. Ohne diese Funktion gibt es keinen Nutzen.

**Independent Test**: Spiel starten, auf "Tor Heim" tippen, Spielstand und Torliste prüfen.

**Acceptance Scenarios**:

1. **Given** ein laufendes Spiel in der 7. Minute (Uhr zeigt 06:12 gespielt), **When** der Nutzer auf "Tor SVF" tippt, **Then** steht es 1:0 für SVF und die Torliste zeigt "7' SVF".
2. **Given** ein laufendes Spiel, **When** der Nutzer auf "Tor Gegner" tippt, **Then** erhöht sich der Zähler des Gegners um 1 und der Eintrag wird mit Minute gespeichert.
3. **Given** ein gerade erfasstes Tor, **When** der Nutzer innerhalb von 10 Sekunden auf "Rückgängig" tippt, **Then** wird das Tor entfernt und der Spielstand korrigiert.
4. **Given** ein beliebiges erfasstes Tor, **When** der Nutzer es in der Torliste löscht, **Then** wird der Spielstand neu berechnet.

---

### User Story 2 - Spiel anlegen und Countdown steuern (Priority: P1)

Vor dem Anpfiff trägt der Nutzer den Gegner ein, wählt "Heim" oder "Auswärts" und übernimmt die vorbelegte Spielzeit (2 × 25 Minuten). Mit "Anpfiff" startet der Countdown. Zur Halbzeit hält die Uhr an, mit "Anpfiff 2. Halbzeit" läuft sie weiter.

**Why this priority**: Ohne laufende Uhr gibt es keine automatische Minute. Heim/Auswärts bestimmt, welcher Knopf links (Heim) und rechts (Gast) steht.

**Independent Test**: Spiel mit Gegner "TSV Musterstadt", Auswärts, 2 × 25 Min anlegen, starten, Anzeige prüfen.

**Acceptance Scenarios**:

1. **Given** der Startbildschirm, **When** der Nutzer Gegner "TSV Musterstadt" eingibt und "Auswärts" wählt, **Then** zeigt der Spielbildschirm "TSV Musterstadt" als Heim (links) und "SV Feuerbach" als Gast (rechts).
2. **Given** ein angelegtes Spiel, **When** der Nutzer "Anpfiff" tippt, **Then** läuft der Countdown von 25:00 abwärts.
3. **Given** der Countdown erreicht 00:00 in Halbzeit 1, **Then** ertönt ein akustisches Signal, die Anzeige markiert "Halbzeit", und die Uhr stoppt.
4. **Given** Halbzeit 2 läuft seit 3:10 Minuten, **When** ein Tor erfasst wird, **Then** wird es als Minute 29 gespeichert (fortlaufende Zählung über beide Halbzeiten).
5. **Given** ein laufendes Spiel, **When** das Handy 5 Minuten gesperrt war und wieder geöffnet wird, **Then** zeigt die Uhr die korrekte Restzeit.
6. **Given** ein laufendes Spiel, **When** der Nutzer "Pause" tippt (z. B. Verletzung), **Then** hält die Uhr an, bis "Weiter" getippt wird.

---

### User Story 3 - Torschütze nachtragen (Priority: P2)

Nach einem SVF-Tor kann der Nutzer optional den Torschützen auswählen, entweder sofort über ein kurz eingeblendetes Auswahlfeld oder später in der Torliste.

**Why this priority**: Wertvoll für Eltern und Trainer, aber das Spiel ist auch ohne Torschützen vollständig dokumentiert.

**Independent Test**: Tor erfassen, Torschütze aus Kader wählen, Torliste prüfen.

**Acceptance Scenarios**:

1. **Given** ein gerade erfasstes SVF-Tor, **When** der Nutzer in der Schnellauswahl "Lenny" antippt, **Then** zeigt die Torliste "12' SVF, Lenny".
2. **Given** die Schnellauswahl ist offen, **When** der Nutzer nichts tut, **Then** schließt sie sich nach [NEEDS CLARIFICATION: 5 oder 8 Sekunden?] ohne Torschützen.
3. **Given** ein Tor ohne Torschützen, **When** der Nutzer es in der Torliste antippt, **Then** kann er einen Torschützen aus dem Kader oder als Freitext eintragen.
4. **Given** ein Tor, **When** der Nutzer "Eigentor" wählt, **Then** wird es als Eigentor gekennzeichnet.

---

### User Story 4 - Ergebnis teilen (Priority: P2)

Nach Abpfiff teilt der Nutzer das Ergebnis mit Torfolge über das System-Teilen-Menü (z. B. WhatsApp-Elterngruppe).

**Why this priority**: Häufigster Anschlussschritt nach dem Spiel, ersetzt das manuelle Abtippen.

**Independent Test**: Beendetes Spiel öffnen, "Teilen" tippen, generierten Text prüfen.

**Acceptance Scenarios**:

1. **Given** ein beendetes Spiel SVF gegen TSV Musterstadt 3:1, **When** der Nutzer "Teilen" tippt, **Then** öffnet sich das Teilen-Menü mit einem Text wie:
   ```
   ⚽ SV Feuerbach – TSV Musterstadt 3:1 (1:1)
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

- Ein Tor fällt in der Nachspielzeit nach 00:00: Wird es als "25+1'" oder "26'" gespeichert? [NEEDS CLARIFICATION]
- Der Nutzer vergisst "Anpfiff" und tippt auf "Tor": Startet das die Uhr automatisch, oder wird nach der Minute gefragt?
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
- **FR-005**: Die Spielminute MUSS als angefangene Minute fortlaufend über alle Abschnitte berechnet werden (Sekunde 0:00 bis 0:59 = 1. Minute; 2. Halbzeit beginnt bei 26').
- **FR-006**: Der Countdown MUSS Start, Pause, Fortsetzen, Abschnittsende und Abpfiff unterstützen und seine Zeit ausschließlich aus Zeitstempeln berechnen.
- **FR-007**: Bei Ablauf eines Abschnitts MUSS ein deutliches akustisches und visuelles Signal erfolgen.
- **FR-008**: Jedes Tor MUSS rückgängig gemacht (Undo-Leiste) und in der Torliste gelöscht oder bearbeitet werden können.
- **FR-009**: Für SVF-Tore MUSS optional ein Torschütze eingetragen werden können, per Kaderauswahl oder Freitext; zusätzlich "Eigentor (Gegner)". Für Gegentore [NEEDS CLARIFICATION: Torschütze erfassen ja/nein?].
- **FR-010**: Der Spielzustand MUSS nach jeder Änderung lokal persistiert werden und einen App-Neustart überstehen.
- **FR-011**: Ein beendetes Spiel MUSS als Text über das System-Teilen-Menü geteilt werden können (Fallback: Zwischenablage).
- **FR-012**: Die App MUSS nach dem ersten Laden ohne Netzverbindung voll funktionsfähig sein und auf dem Home-Bildschirm installierbar sein.
- **FR-013**: Während die Uhr läuft, SOLL der Bildschirm wach gehalten werden.
- **FR-014**: Der Name der eigenen Mannschaft MUSS einstellbar sein (Vorgabe "SV Feuerbach") [NEEDS CLARIFICATION: mehrere eigene Teams/Jahrgänge nötig?].

### Key Entities

- **Spiel**: Gegner, Heim/Auswärts, eigene Mannschaft, Datum, Spielzeit-Schema, Uhr-Ereignisse (Start/Pause/Fortsetzen/Abschnittsende mit Zeitstempel), Status (angelegt, läuft, Pause, Halbzeit, beendet).
- **Tor**: gehört zu einem Spiel; Mannschaft (SVF/Gegner), Minute, Abschnitt, Zeitstempel, optional Torschütze (Kaderspieler oder Freitext), Eigentor-Kennzeichen.
- **Spieler (Kader)**: Vorname oder Kürzel, optional Rückennummer, aktiv/inaktiv.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Vom Tap auf "Tor" bis zur aktualisierten Anzeige vergehen unter 100 ms.
- **SC-002**: Ein neues Spiel ist in unter 20 Sekunden angelegt und angepfiffen.
- **SC-003**: Die angezeigte Restzeit weicht nach 25 Minuten (inkl. Sperrbildschirm-Phasen) um höchstens 1 Sekunde von einer Referenzuhr ab.
- **SC-004**: In einem Test mit 3 Eltern/Trainern erfassen alle ein Tor beim ersten Versuch ohne Erklärung.
- **SC-005**: Lighthouse-PWA- und Accessibility-Score jeweils ≥ 90.

## Assumptions

- Ein Gerät erfasst ein Spiel; keine Synchronisation zwischen mehreren Geräten.
- Primärer Nutzer ist ein Trainer oder Elternteil der SVF-Mannschaft; Ansicht immer aus SVF-Perspektive.
- Karten, Wechsel und Spielerstatistiken über Tore hinaus sind nicht Teil dieser Version.
- Kein Login, keine Cloud-Sicherung in Version 1.

## Offene Fragen (für `/speckit-clarify`)

1. **Torschütze**: Kader mit Vornamen als Schnellauswahl plus Freitext-Fallback, oder nur Freitext?
2. **Nachspielzeit**: Wenn die Uhr 00:00 erreicht, endet der Abschnitt automatisch, oder läuft eine Nachspielzeit (25+1') weiter, bis der Nutzer abpfeift?
3. **Gegentore**: Torschütze beim Gegner erfassen (Rückennummer) oder nie?
4. **Turniermodus**: Mehrere kurze Spiele hintereinander (z. B. Hallenturnier) mit Turnier-Gesamtübersicht, jetzt oder später?
5. **Mehrere Teams**: Nur eine SVF-Mannschaft oder auswählbar (E1, E2, F-Jugend ...)?
6. **Signal am Abschnittsende**: Ton reicht? (Vibration ist in iOS-Web-Apps nicht verfügbar; bei gesperrtem Bildschirm ist auch der Ton nicht garantiert.)
7. **Tor ohne Anpfiff**: Startet ein Tor-Tap die Uhr automatisch, oder ist "Tor" erst nach Anpfiff aktiv?
