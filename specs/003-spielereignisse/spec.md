# Feature Specification: Spielereignisse (Elfmeter, Karten, Wechsel, Lesezeichen) und Pokal

**Feature Branch**: `003-spielereignisse`

**Created**: 2026-11-03

**Status**: Entwurf. Review A im Chat erledigt (03.11.2026); Darstellung im Spiel offen bis Review B (Mockup mit Alternativen).

**Input**: User description: "Beim Tor kennzeichnen, dass es ein Elfmeter war. Für die höher spielenden Mannschaften gelbe, gelb-rote und rote Karten sowie Auswechslungen (wer für wen), in den Einstellungen per Schalter ein- und ausschaltbar, weil das in der E-Jugend irrelevant ist. Ein interner Vermerk wie ein Lesezeichen mit optionalem Kommentar, um Szenen später in der Veo-Aufzeichnung anzuschauen. Pokalspiele mit Verlängerung und Elfmeterschießen."

## Clarifications

### Session 2026-11-03

- Q: Für wen sind Karten und Wechsel? → A: Für höhere Jugenden und Aktive. Je ein Schalter in den Einstellungen ("Karten", "Wechsel"), Standard aus. Ein Gerät gehört meist zu einer Mannschaft, deshalb gelten die Schalter für das ganze Gerät.
- Q: Zeitstrafe? → A: Ja, als fünfte Art neben Gelb, Gelb-Rot und Rot (einige Verbände nutzen sie im Jugendbereich).
- Q: Lesezeichen? → A: Eigener Schalter, Standard aus. Merker mit Spielminute, Uhrzeit und optionalem Kommentar, z. B. für die Veo-Kamera. Lesezeichen sind intern.
- Q: Was steht im geteilten Text? → A: Elfmeter-Kennzeichen, Karten, Wechsel, Verlängerung und Elfmeterschießen ja; Lesezeichen nie.
- Q: Pokal beim Anlegen abfragen? → A: Nein, das Formular soll schlank bleiben. Steht es nach dem Schlusspfiff unentschieden, bietet die App "Verlängerung" und "Elfmeterschießen" an; wer das nicht braucht, teilt einfach das Ergebnis.
- Q: Kader je Mannschaft? → A: Nein, ein gemeinsamer Kader reicht (Trainer haben meist eine Mannschaft; E1/E2 teilen sich einen Pool). Ohne Aufgebot zeigt jede Auswahl den ganzen Kader.
- Offen bis Review B: Wo im Spielbildschirm werden Ereignisse erfasst? Alternativen: A "Ereignis-Knopf" mit Auswahl-Sheet, B Symbolleiste "Lesezeichen | Karte | Wechsel" (Lesezeichen mit einem Tap), C nur über das "…"-Menü.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tor als Elfmeter kennzeichnen (Priority: P1)

Nach einem Tor markiert der Nutzer in der Torliste "Elfmeter", so wie heute "Eigentor".

**Independent Test**: Tor erfassen, in der Torliste "Elfmeter" wählen, Torliste und Teilen-Text prüfen.

**Acceptance Scenarios**:

1. **Given** ein Feuerbach-Tor von Ben in Minute 31, **When** der Nutzer es antippt und "Elfmeter" wählt, **Then** zeigt die Torliste "31' Feuerbach, Ben (Elfmeter)" und der Teilen-Text "31' 2:1 Ben (Elfmeter)".
2. **Given** ein Gegentor, **When** der Nutzer "Elfmeter" wählt, **Then** gilt das Kennzeichen ebenso (mit oder ohne Torschützen-Freitext).
3. **Given** ein als Elfmeter markiertes Tor, **When** der Nutzer die Markierung wieder abwählt, **Then** verschwindet sie aus Liste und Text.

---

### User Story 2 - Lesezeichen für die Videoauswertung (Priority: P1)

Der Trainer merkt sich während des Spiels Szenen, die er später in der Veo-Aufzeichnung ansehen will.

**Independent Test**: Schalter "Lesezeichen" einschalten, im Spiel ein Lesezeichen setzen, Kommentar ergänzen, in den Spieldetails die Liste kopieren.

**Acceptance Scenarios**:

1. **Given** der Schalter "Lesezeichen" ist aus, **Then** gibt es im Spiel keine Möglichkeit, Lesezeichen zu setzen.
2. **Given** der Schalter ist an und die Uhr läuft in Minute 7, **When** der Nutzer ein Lesezeichen setzt, **Then** wird es sofort mit Minute, Abschnitt und Uhrzeit gespeichert und ein Hinweis mit "Kommentar" und "Rückgängig" erscheint.
3. **Given** ein gerade gesetztes Lesezeichen, **When** der Nutzer "Kommentar" tippt und "Konter links" eingibt oder eine Schnellwahl ("Ansehen", "Torchance", "Abwehr", "Standard") antippt, **Then** wird der Kommentar am Lesezeichen gespeichert.
4. **Given** ein Spiel mit Lesezeichen, **When** der Nutzer den Teilen-Text erzeugt, **Then** enthält er kein Lesezeichen.
5. **Given** ein Spiel mit Lesezeichen, **When** der Nutzer in den Spieldetails "Lesezeichen kopieren" wählt, **Then** liegt eine Liste "7' · 10:37:12 · Konter links" (eine Zeile je Lesezeichen) in der Zwischenablage bzw. im Teilen-Menü.
6. **Given** ein Lesezeichen, **When** der Nutzer es in der Liste antippt, **Then** kann er den Kommentar ändern oder das Lesezeichen löschen.

---

### User Story 3 - Karten erfassen (Priority: P2)

Bei Spielen mit Karten erfasst der Nutzer Gelb, Gelb-Rot, Rot oder Zeitstrafe mit Minute, Mannschaft und optional Spieler.

**Independent Test**: Schalter "Karten" einschalten, Gelb für Tom und Rot für Nr. 9 des Gegners erfassen, Liste und Teilen-Text prüfen.

**Acceptance Scenarios**:

1. **Given** der Schalter "Karten" ist aus, **Then** gibt es im Spiel keine Kartenerfassung.
2. **Given** der Schalter ist an und die Uhr läuft in Minute 52, **When** der Nutzer "Gelb", "Feuerbach" und "Tom" wählt, **Then** zeigt die Liste "52' Gelb · Tom".
3. **Given** eine Karte für den Gegner, **When** der Nutzer "Rot", "TSV Musterstadt" und Freitext "Nr. 9" wählt, **Then** zeigt die Liste "34' Rot · Nr. 9 (TSV Musterstadt)".
4. **Given** eine Karte ohne Spieler, **When** der Nutzer "Ohne Spieler speichern" wählt, **Then** wird sie mit Minute und Mannschaft gespeichert.
5. **Given** ein beendetes Spiel mit Karten, **When** der Nutzer teilt, **Then** enthält der Text eine Zeile "Karten: 34' Rot Nr. 9 (TSV Musterstadt), 52' Gelb Tom".
6. **Given** eine erfasste Karte, **When** der Nutzer sie antippt, **Then** kann er sie bearbeiten oder löschen (mit Bestätigung).

---

### User Story 4 - Wechsel erfassen (Priority: P3)

Bei Spielen mit festen Wechseln erfasst der Nutzer, wer für wen gekommen ist.

**Independent Test**: Schalter "Wechsel" einschalten, "Ben raus, Leo rein" erfassen, Liste und Teilen-Text prüfen.

**Acceptance Scenarios**:

1. **Given** der Schalter "Wechsel" ist aus, **Then** gibt es im Spiel keine Wechselerfassung.
2. **Given** der Schalter ist an und die Uhr läuft in Minute 30, **When** der Nutzer "Ben" als "raus" und "Leo" als "rein" wählt, **Then** zeigt die Liste "30' Leo für Ben".
3. **Given** ein Aufgebot, **Then** zeigt "raus" und "rein" das Aufgebot als große Knöpfe, "Andere …" den restlichen Kader (wie FR-030).
4. **Given** ein beendetes Spiel mit Wechseln, **When** der Nutzer teilt, **Then** enthält der Text eine Zeile "Wechsel: 30' Leo für Ben".

---

### User Story 5 - Verlängerung (Priority: P2)

Ein Pokalspiel steht nach dem Schlusspfiff unentschieden; es geht in die Verlängerung.

**Independent Test**: 2 × 25 Minuten mit 2:2 beenden, "Verlängerung" 2 × 10 wählen, Tor in der Verlängerung, Teilen-Text prüfen.

**Acceptance Scenarios**:

1. **Given** ein beendetes Spiel mit Sieger, **Then** werden "Verlängerung" und "Elfmeterschießen" nicht angeboten.
2. **Given** ein beendetes Spiel 2:2, **Then** werden neben "Ergebnis teilen" auch "Verlängerung" und "Elfmeterschießen" angeboten.
3. **Given** der Nutzer wählt "Verlängerung", **When** er 2 × 10 Minuten wählt und anpfeift, **Then** läuft die Uhr für die erste Hälfte der Verlängerung mit Minuten ab 51 (bei 2 × 25), mit Nachspielzeit wie FR-005.
4. **Given** ein Tor in der Verlängerung zum 3:2, **When** das Spiel endet und geteilt wird, **Then** lautet die Kopfzeile "… 3:2 n. V. (1:1)".
5. **Given** die Verlängerung endet unentschieden, **Then** wird "Elfmeterschießen" angeboten.

---

### User Story 6 - Elfmeterschießen (Priority: P2)

Nach Unentschieden (mit oder ohne Verlängerung) erfasst der Nutzer das Elfmeterschießen Schuss für Schuss.

**Independent Test**: Elfmeterschießen starten, abwechselnd Treffer/Verschossen erfassen, beenden, Ergebnis und Teilen-Text prüfen.

**Acceptance Scenarios**:

1. **Given** das Elfmeterschießen läuft, **Then** zeigt die App, welche Mannschaft dran ist, sowie große Knöpfe "Treffer" und "Verschossen"; die Reihenfolge wechselt automatisch, die beginnende Mannschaft ist wählbar.
2. **Given** ein Schuss, **When** der Nutzer "Rückgängig" tippt, **Then** wird der letzte Schuss entfernt.
3. **Given** ein Schütze von Feuerbach, **Then** kann optional ein Spieler aus dem Kader gewählt werden; beim Gegner Freitext.
4. **Given** 4:3 nach Elfmeterschießen, **When** der Nutzer "Elfmeterschießen beenden" bestätigt und teilt, **Then** lautet die Kopfzeile "… 2:2 n. V. (1:1), 4:3 i. E." (ohne Verlängerung: "… 2:2 (1:1), 4:3 i. E.") und die Historie zeigt S/N nach dem Elfmeterschießen.

---

### Edge Cases

- Karten und Wechsel lassen sich auch bei angehaltener Uhr und in der Halbzeitpause erfassen (Minute = letzter Uhrstand), nicht vor dem Anpfiff.
- Schalter werden während eines Spiels ausgeschaltet: Bereits erfasste Ereignisse bleiben gespeichert und sichtbar; nur die Erfassung verschwindet.
- Gelb-Rot oder Rot für einen eigenen Spieler: kein automatisches Entfernen aus dem Aufgebot (keine Kaderlogik, nur Protokoll).
- Lesezeichen in der Halbzeitpause: erlaubt, Minute = letzter Uhrstand, Uhrzeit = jetzt (wichtig für die Videozuordnung).
- Sicherung (FR-024): Ereignisse, Verlängerung und Elfmeterschießen werden mit exportiert und importiert; ältere Sicherungen bleiben lesbar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-E01**: Jedes Tor MUSS zusätzlich zum Eigentor als "Elfmeter" gekennzeichnet werden können (an- und abwählbar). Torliste und Teilen-Text zeigen "(Elfmeter)" hinter dem Torschützen bzw. der Minute.
- **FR-E02**: Die Einstellungen MÜSSEN im Abschnitt "Im Spiel erfassen" die Schalter "Karten", "Wechsel" und "Lesezeichen" bieten, je mit einer Zeile Erklärung, Standard aus. Ist ein Schalter aus, erscheint die zugehörige Erfassung im Spiel nicht; erfasste Daten bleiben erhalten.
- **FR-E03**: Karten MÜSSEN als Gelb, Gelb-Rot, Rot oder Zeitstrafe mit Minute (wie FR-005), Abschnitt, Uhrzeit, Mannschaft und optional Spieler (eigene: Kader; Gegner: Freitext wie FR-009) und optionalem Kommentar erfasst, bearbeitet und gelöscht werden können.
- **FR-E04**: Wechsel MÜSSEN für die eigene Mannschaft als Paar "raus/rein" mit Minute und Uhrzeit erfasst, bearbeitet und gelöscht werden können; die Auswahl folgt FR-030 (Aufgebot, "Andere …").
- **FR-E05**: Lesezeichen MÜSSEN mit höchstens einem Tap gesetzt werden können und Minute, Abschnitt, Uhrzeit (Sekunden) und optional einen Kommentar (bis 60 Zeichen, Schnellwahl "Ansehen", "Torchance", "Abwehr", "Standard") speichern. Rückgängig wie bei Toren (10 s).
- **FR-E06**: Die Torliste im Spiel MUSS Tore, Karten, Wechsel und Lesezeichen gemeinsam chronologisch zeigen (neueste oben, Symbole statt Farbflächen, Lesezeichen gekennzeichnet "nur für dich"). FR-033 und FR-034 gelten weiter.
- **FR-E07**: Der Teilen-Text (FR-011, contracts/share-text.md) MUSS Elfmeter-Kennzeichen, eine Zeile "Karten: …" und eine Zeile "Wechsel: …" enthalten, sofern vorhanden; Lesezeichen NIE.
- **FR-E08**: Die Spieldetails MÜSSEN alle Ereignisse in der Zeitleiste zeigen und "Lesezeichen kopieren" anbieten (eine Zeile je Lesezeichen: Minute · Uhrzeit · Kommentar), wenn Lesezeichen vorhanden sind.
- **FR-P01**: Nach dem Schlusspfiff bei Unentschieden MUSS die App "Verlängerung" und "Elfmeterschießen" anbieten, sonst nicht. Es gibt beim Anlegen des Spiels keine Pokal-Abfrage.
- **FR-P02**: Die Verlängerung MUSS aus zwei Abschnitten mit wählbarer Dauer (5, 10 oder 15 Minuten, Vorgabe 10) bestehen, mit fortlaufender Minute, Nachspielzeit und Signal wie FR-005 bis FR-007; Tore zählen zum Spielstand, der Teilen-Text kennzeichnet "n. V.".
- **FR-P03**: Das Elfmeterschießen MUSS Schuss für Schuss (Treffer/Verschossen, abwechselnd, beginnende Mannschaft wählbar, Rückgängig, optional Schütze) erfasst werden und einen eigenen Stand "x:y i. E." führen; der reguläre Spielstand bleibt unverändert. S/U/N in der Historie richtet sich nach dem Elfmeterschießen.

### Key Entities

- **Ereignis**: gehört zu einem Spiel; Art (Karte, Wechsel, Lesezeichen), Minute, Nachspielminute, Abschnitt, Uhrzeit, Mannschaft, Spieler bzw. Freitext, bei Karten die Farbe (Gelb, Gelb-Rot, Rot, Zeitstrafe), bei Wechseln raus/rein, optional Kommentar, Löschmarke.
- **Tor**: zusätzlich Kennzeichen "Elfmeter".
- **Spiel**: zusätzlich optionale Verlängerung (Dauer je Abschnitt) und optionales Elfmeterschießen (Schüsse mit Mannschaft, Treffer ja/nein, optional Schütze).
- **Einstellungen**: Schalter Karten, Wechsel, Lesezeichen.

## Success Criteria *(mandatory)*

- **SC-E01**: Ein Lesezeichen ist in unter 1 Sekunde gesetzt (ein Tap).
- **SC-E02**: Eine Karte mit Spieler ist in höchstens 3 Taps erfasst.
- **SC-E03**: Mit allen Schaltern aus sieht der Spielbildschirm aus wie vorher (kein zusätzlicher Platzbedarf).

## Assumptions

- Lesezeichen werden der Veo-Aufzeichnung über die Uhrzeit zugeordnet; eine direkte Anbindung an Veo ist nicht Teil dieser Spec.
- Keine Statistiken über Karten oder Spielzeiten einzelner Spieler.
