# Feature Specification: Spiel erfassen (Tore, Minute, Countdown)

**Feature Branch**: `001-spiel-erfassen`

**Created**: 2026-11-02

**Status**: Geklärt (Stand 02.11.2026), Plan erstellt

## Clarifications

### Session 2026-11-02

- Q: Torschütze per Kader oder Freitext? → A: Eigene Tore per Kaderliste; Gegentore optional per Freitext.
- Q: Was passiert bei 00:00? → A: Die Uhr läuft als Nachspielzeit weiter, deutlich gekennzeichnet (rot). Tore darin werden als "25+1'", "50+2'" usw. dokumentiert, je nach eingestelltem Spielzeit-Schema.
- Q: Torschützen beim Gegner? → A: Nur optionaler Freitext, relevant bei bekannten Gegnern.
- Q: Mehrere eigene Teams? → A: Keine Mannschaftsverwaltung, aber der eigene Name ist pro Spiel frei wählbar (z. B. "Sportvg Feuerbach E1", "… E2", "… D3"), siehe Review B Runde 3.
- Q: Signal am Abschnittsende? → A: Ton plus Vibration (wo technisch möglich). Anhalten und Zurücksetzen der Uhr nur mit Sicherheitsabfrage.
- Q: Tor vor Anpfiff? → A: Tor-Knöpfe sind erst ab Anpfiff aktiv.
- Q: Signal in der Nachspielzeit? → A: Jede volle Minute erneut Ton, blinkende Anzeige und (wo möglich) Vibration, bis Pausenpfiff bzw. Abpfiff.
- Q: Vibration auf dem iPhone (in Web-Apps nicht möglich)? → A: Ton plus blinkende Anzeige genügen; keine native Hülle.
- Q: Historie? → A: Wichtig. Alle Spiele bleiben lokal auf dem Handy gespeichert, mit Datum und Uhrzeit-Zeitstempeln für Anpfiff, Abpfiff und jedes Tor.
- Q: Torschützen beim Gegner? → A (ergänzt): Freitext für Name oder Rückennummer, weil der Name oft nicht auf dem Trikot steht.
- Q: Turniermodus? → A: Gewünscht, aber Priorität 2 und eigene Spec (`specs/002-turniermodus`). Gemeint ist das Erfassen von Spielen zweier fremder Mannschaften.
- Q: E1/E2? → A: Gemeinsamer Pool; pro Spiel ca. 10 (E-Jugend) bzw. 15 (D-Jugend) im Aufgebot (→ FR-030).
- Q: Spiele mit Kollegen teilen? → A: Teilen als Text per WhatsApp genügt (FR-011); kein Import von Spielen.
- Q: Doppelte Vornamen? → A: Kürzeste eindeutige Nachnamen-Abkürzung, z. B. "Max Mü." / "Max Me." (FR-025).
- Q: Spieler löschen? → A: Ja, für den Nutzer wie gelöscht, intern erhalten (FR-029).
- Q: Hosting? → A: Repository öffentlich, Auslieferung über GitHub Pages.

### Session 2026-11-02 (Review B, Mockups)

- Q: Zielgerät? → A: Kleines, älteres iPhone als Maßstab: iPhone SE (2./3. Generation, 375 × 667 pt); alles muss dort ohne Scrollen des Spielbildschirms passen.
- Q: Dunkelmodus? → A: Ja, automatisch nach Systemeinstellung, zusätzlich in den Einstellungen fest "Hell" oder "Dunkel" wählbar.
- Q: Kosten? → A: Die Lösung muss komplett kostenlos bleiben (keine Bezahl-Accounts, -Dienste oder -APIs).
- Q: Mannschaftsfarben? → A: Pro Spiel wählbar. Feuerbach meist Rot oder Schwarz, kann abweichen; der Gegner kann jede Farbe haben. Die Tor-Knöpfe erscheinen in den Trikotfarben.
- Q: Tor zurücknehmen? → A: Jedes Tor muss jederzeit entfernt werden können (Umentscheiden, Verklicken), nicht nur in den ersten 10 Sekunden.
- Q: Torliste? → A: Scrollbar, wenn der Platz nicht reicht; zeigt alle Tore des Spiels.
- Q: Beschriftung der Uhr-Knöpfe? → A: "Uhr anhalten" / "Uhr fortsetzen" mit Pause-/Play-Symbol; Abschnittsende heißt "Pausenpfiff", der letzte Abschnitt endet mit "Schlusspfiff".

### Session 2026-11-02 (Review B, Runde 3)

- Q: Wortwahl? → A: "Tor entfernen" statt "aberkennen" (kein VAR). Entfernte Tore bleiben durchgestrichen sichtbar und lassen sich wiederherstellen.
- Q: Vorgabe-Trikotfarben? → A: Feuerbach Rot, Gegner Schwarz. Sobald die eigene Farbe einmal geändert wurde, gilt das letzte Spiel als Vorgabe.
- Q: Heim/Auswärts? → A: Ein Tausch-Knopf (Doppelpfeil) zwischen den Mannschaften vertauscht Heim und Gast.
- Q: Eigener Mannschaftsname? → A: Pro Spiel individuell, z. B. "Sportvg Feuerbach E1", "… E2", "… D3".
- Q: Icon im Knopf "Uhr anhalten"? → A: Nein, reine Textbeschriftung (das Pause-Symbol könnte als "11" gelesen werden); gilt für alle Uhr-Knöpfe.

### Session 2026-11-02 (Gerätetest MVP)

- Befund: Bildschirm bleibt an (FR-013 erfüllt), Uhr läuft im Hintergrund korrekt weiter. Kein Ton: weder mit Lautlos-Schalter noch im Vordergrund mit Ton.
- Ursache: iOS sperrt Web Audio ohne hörbare Freischaltung innerhalb einer Berührung und nach jedem Wechsel in den Hintergrund; der Lautlos-Schalter dämpft Web Audio standardmäßig.
- Entscheidung: Fix gemäß FR-036. Ton im Hintergrund bleibt technisch unmöglich (Web-App-Grenze, Constitution VIII schließt native App aus).

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
5. **Given** ein beliebiges erfasstes Tor (auch nach Minuten), **When** der Nutzer es in der Torliste antippt und "Tor entfernen" bestätigt, **Then** wird der Spielstand neu berechnet und das Tor bleibt durchgestrichen mit dem Hinweis "entfernt" in der Liste stehen.
6. **Given** ein entferntes Tor, **When** der Nutzer "Tor wiederherstellen" wählt, **Then** zählt es wieder mit seiner ursprünglichen Minute.
7. **Given** mehr Tore als in den sichtbaren Bereich passen, **When** der Nutzer in der Torliste wischt, **Then** scrollt die Liste, ohne dass sich Uhr oder Tor-Knöpfe bewegen.

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
5. **Given** Nachspielzeit läuft, **When** der Nutzer "Pausenpfiff" tippt und die Sicherheitsabfrage bestätigt, **Then** stoppt die Uhr und die Anzeige zeigt "Halbzeit".
6. **Given** Halbzeit 2 läuft seit 3:10 Minuten, **When** ein Tor erfasst wird, **Then** wird es als Minute 29 gespeichert (fortlaufende Zählung über beide Halbzeiten).
7. **Given** ein laufendes Spiel, **When** das Handy 5 Minuten gesperrt war und wieder geöffnet wird, **Then** zeigt die Uhr die korrekte Restzeit.
8. **Given** ein laufendes Spiel, **When** der Nutzer "Uhr anhalten" tippt (z. B. Verletzung), **Then** fragt die App "Uhr wirklich anhalten?"; erst nach Bestätigung hält die Uhr an, bis "Uhr fortsetzen" getippt wird.
9. **Given** ein laufendes Spiel, **When** der Nutzer "Zurücksetzen" wählt, **Then** fragt die App "Uhr wirklich zurücksetzen?"; ohne Bestätigung bleibt alles unverändert.
10. **Given** eine Sicherheitsabfrage ist offen, **When** der Nutzer "Abbrechen" tippt oder daneben tippt, **Then** läuft die Uhr unverändert weiter.

---

### User Story 3 - Torschütze nachtragen (Priority: P2)

Nach einem Feuerbach-Tor kann der Nutzer optional den Torschützen auswählen, entweder sofort über ein kurz eingeblendetes Auswahlfeld oder später in der Torliste.

**Why this priority**: Wertvoll für Eltern und Trainer, aber das Spiel ist auch ohne Torschützen vollständig dokumentiert.

**Independent Test**: Tor erfassen, Torschütze aus Kader wählen, Torliste prüfen.

**Acceptance Scenarios**:

1. **Given** ein gerade erfasstes Feuerbach-Tor, **When** der Nutzer in der Schnellauswahl "Max" antippt, **Then** zeigt die Torliste "12' Feuerbach, Max".
2. **Given** die Schnellauswahl ist offen, **When** der Nutzer nichts tut, **Then** schließt sie sich nach 8 Sekunden ohne Torschützen.
3. **Given** ein Feuerbach-Tor ohne Torschützen, **When** der Nutzer es in der Torliste antippt, **Then** kann er einen Torschützen aus dem Kader wählen.
4. **Given** ein Gegentor, **When** der Nutzer es in der Torliste antippt, **Then** kann er optional einen Torschützen als Freitext eintragen (Name oder Rückennummer, z. B. "Nr. 9"; das Feld zeigt diesen Hinweis als Platzhalter).
5. **Given** ein Tor, **When** der Nutzer "Eigentor" wählt, **Then** wird es als Eigentor gekennzeichnet.

---

### User Story 4 - Ergebnis teilen (Priority: P2)

Nach Abpfiff teilt der Nutzer das Ergebnis mit Torfolge über das System-Teilen-Menü (z. B. WhatsApp-Elterngruppe).

**Why this priority**: Häufigster Anschlussschritt nach dem Spiel, ersetzt das manuelle Abtippen.

**Independent Test**: Beendetes Spiel öffnen, "Teilen" tippen, generierten Text prüfen.

**Acceptance Scenarios**:

1. **Given** ein beendetes Spiel Sportvg Feuerbach gegen TSV Musterstadt 3:1, **When** der Nutzer "Teilen" tippt, **Then** öffnet sich das Teilen-Menü mit einem Text wie:
   ```
   ⚽ Sportvg Feuerbach - TSV Musterstadt 3:1 (1:1)
   07.11.2026, Anpfiff 10:30
   7' 1:0 Max
   18' 1:1
   31' 2:1 Ben
   44' 3:1 Eigentor
   ```
2. **Given** ein Gerät ohne Teilen-Funktion, **When** der Nutzer "Teilen" tippt, **Then** wird der Text in die Zwischenablage kopiert und dies bestätigt.

---

### User Story 5 - Kader und Aufgebot pflegen (Priority: P2)

Der Kader ist ein gemeinsamer Pool (z. B. E1 und E2 zusammen, ca. 20 bis 30 Kinder). Pro Spiel stehen davon nur ca. 10 (E-Jugend) bzw. 15 (D-Jugend) im Aufgebot. Der Nutzer wählt das Aufgebot vor dem Anpfiff, damit die Torschützen-Auswahl nur diese Kinder als große Knöpfe zeigt.

**Why this priority**: Ohne Aufgebot müsste die Schnellauswahl 20+ Namen zeigen; das ist am Spielfeldrand zu klein und zu langsam.

**Independent Test**: Spieler anlegen, umbenennen, löschen; Aufgebot wählen; Auswahl im Spiel prüfen.

**Acceptance Scenarios**:

1. **Given** ein leerer Kader, **When** der Nutzer "Max" mit Nummer 7 anlegt, **Then** erscheint "7 Max" im Kader.
2. **Given** ein Kader mit 21 Spielern, **When** der Nutzer beim Anlegen eines Spiels 10 Spieler fürs Aufgebot antippt, **Then** zeigt die Torschützen-Auswahl in diesem Spiel nur diese 10, sortiert nach Nummer.
3. **Given** ein früheres Spiel mit Aufgebot, **When** der Nutzer ein neues Spiel anlegt, **Then** ist das Aufgebot des letzten Spiels vorausgewählt und mit einem Tap übernehmbar.
4. **Given** kein Aufgebot gewählt, **When** ein Tor fällt, **Then** zeigt die Auswahl alle Spieler des Kaders.
5. **Given** ein laufendes Spiel, **When** der Nutzer in der Auswahl "Andere …" tippt, **Then** kann er einen Spieler außerhalb des Aufgebots wählen (z. B. kurzfristig eingesprungen).
6. **Given** "Max" hat in früheren Spielen Tore geschossen, **When** der Nutzer Max löscht und bestätigt, **Then** verschwindet Max aus Kader, Aufgebot und Auswahl; in alten Spielen steht er weiterhin als Torschütze.

---

### User Story 6 - Spielhistorie (Priority: P2)

Alle Spiele bleiben dauerhaft auf dem Handy gespeichert. Der Nutzer sieht vergangene Spiele mit Datum, Uhrzeit, Gegner und Ergebnis und kann sie öffnen, teilen oder löschen.

**Why this priority**: Für Atti ausdrücklich wichtig; die Saison soll nachvollziehbar bleiben, auch ohne Server.

**Independent Test**: Zwei Spiele beenden, Historie öffnen, Reihenfolge und Inhalte prüfen.

**Acceptance Scenarios**:

1. **Given** zwei beendete Spiele, **When** der Nutzer die Historie öffnet, **Then** sind beide neuestes zuerst mit Datum, Anpfiff-Uhrzeit, Gegner und Ergebnis gelistet.
2. **Given** ein Spiel aus der Historie, **When** der Nutzer es öffnet, **Then** sieht er jedes Tor mit Spielminute (z. B. "25+1'") und Uhrzeit (z. B. "10:52:13"), dazu Anpfiff, Halbzeit, Pausen und Abpfiff mit Uhrzeit.
3. **Given** die App wurde geschlossen, das Handy neu gestartet und 30 Tage nicht benutzt, **When** der Nutzer die Historie öffnet, **Then** sind alle Spiele unverändert vorhanden (installierte App vom Home-Bildschirm).
4. **Given** ein Spiel in der Historie, **When** der Nutzer "Löschen" wählt und bestätigt, **Then** ist es entfernt; ohne Bestätigung bleibt es erhalten.
5. **Given** mehrere Spiele, **When** der Nutzer "Historie sichern" wählt, **Then** wird eine Datei mit allen Spielen über das Teilen-Menü bereitgestellt (z. B. zum Speichern in iCloud Drive), die sich wieder importieren lässt.

---

### User Story 7 - Kader per Liste importieren und mit Trainerkollegen teilen (Priority: P2)

Ein Trainer fügt eine einfache Namensliste ein (z. B. aus SpielerPlus, WhatsApp oder Excel kopiert), prüft die Vorschau und übernimmt sie. Mit "Kader teilen" schickt er die Liste als Text per WhatsApp an die Kollegen; die fügen sie in ihrer App genauso ein.

**Why this priority**: Fünf Trainer der E1/E2 sollen nicht jeweils 21 Spieler abtippen. Ein SpielerPlus-Export ist nur mit Premium möglich, eine eingefügte Liste funktioniert immer.

**Independent Test**: Liste einfügen, Vorschau prüfen, übernehmen; Kader-Code auf zweitem Gerät einfügen; Kader identisch.

**Acceptance Scenarios**:

1. **Given** ein leerer Kader, **When** der Nutzer die Liste "1 Max", "2 Maxi", "5 Ben", "Tom" einfügt, **Then** zeigt die Vorschau 4 Spieler (Tom ohne Nummer), und nach "Übernehmen" stehen sie im Kader.
2. **Given** eine Zeile "Max Mustermann" und kein weiterer Max, **When** die Vorschau erscheint, **Then** wird "Max" übernommen und der Nachname verworfen.
3. **Given** die Zeilen "Max Müller" und "Max Meier", **When** die Vorschau erscheint, **Then** werden "Max Mü." und "Max Me." vorgeschlagen (so viele Buchstaben des Nachnamens wie nötig, damit die Namen eindeutig sind).
4. **Given** zwei identische Namen ohne unterscheidbaren Nachnamen, **When** die Vorschau erscheint, **Then** sind beide markiert und der Nutzer kann einen Namen direkt in der Vorschau anpassen.
5. **Given** zwei Zeilen mit derselben Nummer, **When** die Vorschau erscheint, **Then** sind beide markiert, und der Nutzer kann trotzdem übernehmen.
6. **Given** ein Kader mit "Max" (Nr. 1), **When** eine Liste mit "Max" ohne Nummer und "Leo" eingefügt wird, **Then** bleibt Max (Nr. 1) einmal erhalten und Leo kommt hinzu; nicht aufgeführte Spieler werden nicht gelöscht.
7. **Given** ein gepflegter Kader, **When** der Nutzer "Kader teilen" wählt, **Then** öffnet sich das Teilen-Menü mit der Liste im Format "Nummer Name" pro Zeile.
8. **Given** ein zweites Gerät, **When** der Kollege diese Liste in "Liste einfügen" einfügt, **Then** entsteht derselbe Kader; ein späteres erneutes Einfügen erzeugt keine Duplikate.
9. **Given** ein gelöschter Spieler, **When** er in einer neu eingefügten Liste wieder auftaucht, **Then** wird er wieder sichtbar (statt doppelt angelegt).

---

### Edge Cases

- Ein Tor fällt in der Nachspielzeit von Halbzeit 1 (2 × 25 Min): Es wird als "25+1'" gespeichert; Halbzeit 2 beginnt trotzdem bei 26'.
- Der Nutzer vergisst den Pausenpfiff: Die Nachspielzeit läuft weiter, die Anzeige bleibt rot, und jede volle Minute ertönt das Signal erneut.
- Ton auf dem iPhone: Web-Apps dürfen Töne nur nach einer Berührung abspielen und nur bei eingeschaltetem Bildschirm. Der Anpfiff schaltet den Ton frei; die App hält den Bildschirm wach (FR-013). Steht das Handy auf lautlos, bleibt nur die blinkende Anzeige.
- Speicher auf dem iPhone: Safari kann Daten von Webseiten nach 7 Tagen ohne Nutzung löschen, nicht aber von Apps auf dem Home-Bildschirm. Die App fordert dauerhaften Speicher an und weist im Browser auf "Zum Home-Bildschirm" hin.
- Tore während Halbzeitpause oder nach Abpfiff: Tor-Knöpfe sind deaktiviert; nachträgliche Korrektur über die Torliste.
- Kader ist beim ersten Spiel noch leer: Die Schnellauswahl bietet "Spieler anlegen" direkt an.
- Die App wird während des Spiels versehentlich geschlossen oder der Browser leert den Cache: Das laufende Spiel muss nach dem Öffnen exakt wiederhergestellt werden.
- Doppeltipp auf "Tor" (zwei Tore in einer Sekunde): Schutz gegen versehentliche Doppelerfassung (z. B. 1,5 s Sperre mit Undo-Hinweis).
- Das Display schaltet sich während des Spiels ab: App soll den Bildschirm wach halten, solange die Uhr läuft (sofern das Gerät es unterstützt).
- Der Nutzer wechselt die Seiten (Heim/Auswärts) versehentlich falsch: Nachträglich im laufenden Spiel änderbar, ohne Tore zu verlieren.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Nutzer MUSS ein Spiel mit eigenem Mannschaftsnamen (Pflicht, vorbelegt mit dem zuletzt genutzten), Gegnername (Pflicht), Heim/Auswärts (Pflicht) und Spielzeit-Schema anlegen können.
- **FR-035**: Heim und Gast MÜSSEN mit einem Tausch-Knopf (Doppelpfeil, `aria-label` "Heim und Gast tauschen") zwischen den beiden Mannschaftsnamen vertauscht werden können: beim Anlegen jederzeit, im Spielbildschirm vor dem Anpfiff direkt, danach nur über das Menü "…" mit Sicherheitsabfrage. Tore, Minuten und Farben bleiben ihrer Mannschaft zugeordnet.
- **FR-002**: Spielzeit-Schema MUSS aus Anzahl Abschnitten (1 bis 4) und Dauer pro Abschnitt (1 bis 60 Minuten) bestehen; Vorgabe 2 × 25 Minuten. Die zuletzt genutzte Einstellung wird vorbelegt.
- **FR-003**: Der Spielbildschirm MUSS zwei große Tor-Knöpfe zeigen, Heimmannschaft links, Gastmannschaft rechts, jeweils mit Mannschaftsnamen beschriftet und in der für dieses Spiel gewählten Trikotfarbe.
- **FR-031**: Beim Anlegen eines Spiels MÜSSEN die Trikotfarben beider Mannschaften aus einer festen Palette (`design/trikot-farben.json`) gewählt werden können. Vorgabe Feuerbach: Rot, sobald die eigene Farbe einmal geändert wurde, die Farbe des letzten Spiels. Vorgabe Gegner: zuletzt für diesen Gegnernamen genutzte Farbe, sonst Schwarz (spielt Feuerbach in Schwarz: Weiß). Gleiche Farben auf beiden Seiten sind erlaubt und werden mit einem Hinweis angezeigt.
- **FR-032**: Die Schriftfarbe auf jedem Tor-Knopf MUSS automatisch so gewählt werden, dass sie mindestens 4,5:1 Kontrast zur Trikotfarbe hat (bei fetter Schrift ab 24px mindestens 3:1, z. B. Weiß auf Rot); hebt sich ein Knopf weniger als 3:1 vom Hintergrund ab (z. B. Weiß auf hellem, Schwarz auf dunklem Theme), erhält er einen Rahmen.
- **FR-033**: Der Spielbildschirm MUSS auf 375 × 667 pt (iPhone SE) vollständig ohne Scrollen bedienbar sein; nur die Torliste darf in sich scrollen.
- **FR-004**: Ein Tap auf einen Tor-Knopf MUSS ein Tor mit Mannschaft, Spielminute, Abschnitt und Zeitstempel speichern und den Spielstand sofort aktualisieren.
- **FR-005**: Die Spielminute MUSS als angefangene Minute fortlaufend über alle Abschnitte berechnet werden (Sekunde 0:00 bis 0:59 = 1. Minute; bei 2 × 25 Min beginnt Halbzeit 2 bei 26'). In der Nachspielzeit lautet die Minute "<Abschnittsende>+<angefangene Nachspielminute>", z. B. "25+1'", "50+2'", bei 3 × 25 Min "75+1'".
- **FR-006**: Die Uhr MUSS Anpfiff, Anhalten ("Uhr anhalten"), Fortsetzen ("Uhr fortsetzen") (reine Textknöpfe, keine Symbole), Abschnittsende ("Pausenpfiff"), Spielende ("Schlusspfiff"; bei nur einem Abschnitt der einzige Endknopf) und Zurücksetzen unterstützen und ihre Zeit ausschließlich aus Zeitstempeln berechnen. Pause, Pausenpfiff, Abpfiff und Zurücksetzen MÜSSEN per Sicherheitsabfrage bestätigt werden; Anpfiff und Fortsetzen nicht.
- **FR-007**: Bei 00:00 MUSS ein deutliches Signal erfolgen (Ton, blinkende Anzeige, Vibration wo das Gerät es erlaubt). Danach läuft die Uhr als Nachspielzeit aufwärts weiter, in `rot-text` und mit "+" gekennzeichnet, und das Signal wiederholt sich zu jeder vollen Nachspielminute, bis der Nutzer den Abschnitt beendet.
- **FR-036**: Der Signalton MUSS auch bei eingeschaltetem Lautlos-Schalter hörbar sein, wo der Browser das erlaubt (iOS: Audio-Session "playback"). Ist der Ton gesperrt (z. B. nach Rückkehr aus dem Hintergrund), MUSS der Spielbildschirm den Hinweis "Ton aus · tippen" zeigen; jede Berührung des Spielbildschirms schaltet den Ton wieder frei.
- **FR-008**: Jedes Tor MUSS sofort rückgängig gemacht (Undo-Leiste, 10 s) und jederzeit über die Torliste entfernt (mit Bestätigung), wiederhergestellt oder bearbeitet werden können. Entfernte Tore zählen nicht, bleiben durchgestrichen sichtbar und erscheinen nicht im geteilten Text.
- **FR-034**: Die Torliste auf dem Spielbildschirm MUSS alle Tore zeigen (neuestes oben) und in sich scrollbar sein.
- **FR-009**: Für Feuerbach-Tore MUSS optional ein Torschütze aus dem Kader gewählt werden können, zusätzlich "Eigentor Gegner". Für Gegentore KANN optional ein Torschütze als Freitext eingetragen werden.
- **FR-010**: Der Spielzustand MUSS nach jeder Änderung lokal persistiert werden und einen App-Neustart überstehen.
- **FR-022**: Beendete Spiele MÜSSEN dauerhaft lokal in einer Historie gespeichert bleiben, bis der Nutzer sie löscht. Gespeichert werden Datum, Uhrzeit von Anpfiff, Abschnittsenden, Pausen und Abpfiff sowie für jedes Tor Spielminute und Uhrzeit.
- **FR-023**: Die App MUSS beim Browser dauerhaften Speicher anfordern und, wenn sie nicht vom Home-Bildschirm läuft, auf die Installation hinweisen.
- **FR-024**: Die Historie MUSS als Datei exportiert und wieder importiert werden können (Sicherung bei Handywechsel).
- **FR-025**: Der Kader MUSS per eingefügter Textliste importiert werden können, ein Spieler pro Zeile. Erkannt werden: optionale Rückennummer (1 bis 99) vor oder nach dem Namen, Trennzeichen Leerzeichen, Tab, Punkt, Bindestrich, Komma oder "#"; leere Zeilen werden übersprungen. Nachnamen werden nie gespeichert: Gespeichert wird der Vorname, bei gleichen Vornamen ergänzt um die kürzeste eindeutige Nachnamen-Abkürzung ("Max Mü.", "Max Me."). Beim erneuten Import werden bestehende Einträge über Vorname, Nachnamen-Anfang und Nummer zugeordnet und die Abkürzung bei Bedarf verlängert.
- **FR-026**: Vor jedem Import MUSS eine Vorschau mit Auffälligkeiten (doppelte Nummer, doppelter Name, gekürzter Nachname) gezeigt werden; erst "Übernehmen" schreibt in den Kader.
- **FR-027**: Import MUSS zusammenführen statt ersetzen: gleicher Spieler wird aktualisiert, neue werden ergänzt, keiner wird gelöscht; gelöschte Spieler, die wieder in der Liste stehen, werden wieder sichtbar.
- **FR-028**: "Kader teilen" MUSS den sichtbaren Kader als Textliste ("Nummer Name" pro Zeile) über das Teilen-Menü versenden, sodass Kollegen sie per FR-025 einfügen können.
- **FR-029**: Spieler MÜSSEN gelöscht werden können (mit Bestätigung). Gelöschte Spieler verschwinden aus Kader, Aufgebot und Auswahl, bleiben aber intern erhalten, damit Torschützen in alten Spielen lesbar bleiben.
- **FR-030**: Beim Anlegen eines Spiels KANN ein Aufgebot aus dem Kader gewählt werden; vorausgewählt ist das Aufgebot des letzten Spiels. Die Torschützen-Auswahl zeigt das Aufgebot als große Knöpfe (bis 16 ohne Scrollen) und bietet "Andere …" für den restlichen Kader.
- **FR-011**: Ein beendetes Spiel MUSS als Text über das System-Teilen-Menü geteilt werden können (Fallback: Zwischenablage).
- **FR-012**: Die App MUSS nach dem ersten Laden ohne Netzverbindung voll funktionsfähig sein und auf dem Home-Bildschirm installierbar sein.
- **FR-013**: Während die Uhr läuft, MUSS die App den Bildschirm wach halten, sofern das Gerät es unterstützt (Voraussetzung für Ton und Anzeige am Abschnittsende).
- **FR-014**: Der eigene Mannschaftsname MUSS pro Spiel frei wählbar sein (1 bis 40 Zeichen, Vorgabe "Sportvg Feuerbach" bzw. der zuletzt genutzte). Zuletzt genutzte Namen (bis 5) werden als Schnellauswahl angeboten. Auf den Tor-Knöpfen steht die Kurzform ohne "Sportvg " (z. B. "Feuerbach E1").
- **FR-021**: Die Tor-Knöpfe MÜSSEN nur zwischen Anpfiff und Abschnittsende bzw. Abpfiff aktiv sein (einschließlich Nachspielzeit und Pause); davor, in der Halbzeitpause und nach Abpfiff sind sie deaktiviert.

### Gestaltung (Design System der Sportvg Feuerbach, Details in `design/README.md`)

- **FR-015**: Die App MUSS die Farben, Schriften und Abstände aus `design/tokens.json` verwenden; eigene Farbwerte im Code sind nicht erlaubt.
- **FR-016**: Die Tor-Knöpfe sind die einzigen großen Farbflächen des Spielbildschirms (Trikotfarben, FR-031). Alle übrigen Bedienelemente bleiben neutral (`ink`/`surface`), damit keine Verwechslung mit einer Mannschaftsfarbe entsteht; Symbole statt Emojis.
- **FR-017**: Spielstand und Uhr MÜSSEN im Stil `ergebnis` mit gleich breiten Ziffern dargestellt werden, damit die Anzeige beim Herunterzählen nicht springt.
- **FR-018**: Die App MUSS ein helles und ein dunkles Theme anbieten: standardmäßig nach Systemeinstellung, in den Einstellungen fest "Hell" oder "Dunkel" wählbar; das Wappen bleibt in beiden Themes auf weißem Feld.
- **FR-019**: App-Icon und Kopfbereich MÜSSEN das Vereinswappen unverzerrt verwenden (Seitenverhältnis 0,84, Mindestgröße 24px, Schutzraum ringsum).
- **FR-020**: Torschützen MÜSSEN als Vorname oder Kürzel erfasst werden; die Eingabe weist darauf hin, keine Nachnamen zu verwenden. Der geteilte Text enthält nur Vornamen.

### Key Entities

- **Spiel**: Gegner, Heim/Auswärts, eigene Mannschaft, Datum, Spielzeit-Schema, Uhr-Ereignisse (Anpfiff/Pause/Fortsetzen/Abschnittsende/Abpfiff, jeweils mit Uhrzeit-Zeitstempel), Status (angelegt, läuft, Pause, Halbzeit, beendet).
- **Tor**: gehört zu einem Spiel; Mannschaft (eigene/Gegner), Minute, Nachspielminute (optional), Abschnitt, Zeitstempel, optional Torschütze (eigene: Kaderspieler; Gegner: Freitext), Eigentor-Kennzeichen.
- **Spieler (Kader)**: Anzeigename (Vorname, bei Bedarf mit Nachnamen-Abkürzung), optional Rückennummer, Löschmarke (Soft-Delete).
- **Aufgebot**: gehört zu einem Spiel; Liste von Spieler-IDs.

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

Keine.

Turniermodus folgt als `specs/002-turniermodus`.
