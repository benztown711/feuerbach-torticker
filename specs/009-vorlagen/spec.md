# Feature Specification: Vorlagen (Assists)

**Feature Branch**: `009-vorlagen`

**Created**: 2026-11-04

**Status**: Review A und Review B erledigt (04.11.2026), Plan und Aufgaben erstellt. Mockup (Entwurf 3): https://claude.ai/artifact/D7nnJDsmPzC2rGDxsyp9NK

**Input**: User description: "Ein Trainer hat gefragt, ob wir in der App beim Liveticker auch den Assist erfassen können." Ergänzt im Chat: "Ich würde die Namen sowohl bei den Toren als auch bei den Vorlagen (in der Anzeige) ohne Rückennummer anzeigen, auch wenn diese eingetragen sind. Bei den Buttons können die Rückennummern bleiben."

## Clarifications

### Session 2026-11-04 (Review A, Chat)

- Q: Für wen sind Vorlagen? → A: Für Mannschaften, die das wollen. Schalter "Vorlagen" in den Einstellungen unter "Im Spiel erfassen", Standard aus. In der E-Jugend bleibt die Erfassung damit wie bisher.
- Q: Wann wird die Vorlage erfasst? → A: Direkt nach dem Torschützen im selben Auswahlfenster ("Vorlage von?", schließt nach 5 s ohne Vorlage) und nachträglich über die Torliste ("Vorlage ändern").
- Q: Vorlagen auch beim Gegner? → A: Nein, nur bei eigenen Toren.
- Q: Bei Eigentor des Gegners oder Elfmeter? → A: Keine Vorlage.
- Q: Eigene Zeile "\*Vorlagen\*" im Teilen-Text (wie "\*Torschützen\*")? → A: Nein, die Vorlage steht nur in der Zeile des Tores.
- Q: Live-Dashboard (Spec 006)? → A: Ja, im aufgeklappten Torverlauf.
- Q: Rückennummern? → A: In jeder Anzeige stehen Torschütze und Vorlage nur mit Namen, nie mit Rückennummer, auch wenn eine eingetragen ist. Auf den Auswahlknöpfen bleiben die Nummern.

### Session 2026-11-04 (Review B, Mockup Entwurf 1)

- Q: Braucht die Torliste den Mannschaftsnamen ("Feuerbach E1, Moritz (Vorlage Anton)"), wenn der Stand schon zeigt, wer getroffen hat? → A: Nein. Steht ein Torschütze da, entfällt der Mannschaftsname, z. B. "8' 1:1 Moritz (Vorlage: Anton)". Ohne Torschützen bleibt der Mannschaftsname stehen (FR-V11).
- Q: Schreibweise im Dashboard? → A: Mit Doppelpunkt: "Max (Vorlage: Ben)" (FR-V08).
- Q: Doppelpunkt auch in Torliste und Teilen-Text? → A: Ja, überall einheitlich "Max (Vorlage: Ben)" (FR-V06 bis FR-V08).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vorlage direkt nach dem Tor erfassen (Priority: P1)

Am Spielfeldrand tippt der Nutzer nach einem Feuerbach-Tor wie gewohnt den Torschützen an. Ist der Schalter "Vorlagen" an, fragt dasselbe Fenster gleich danach "Vorlage von?". Ein weiterer Tipp speichert die Vorlage; wer nichts tippt, verliert nichts.

**Why this priority**: Das ist der Kern der Anfrage. Direkt nach dem Tor weiß jeder am Rand noch, wer vorgelegt hat.

**Independent Test**: Schalter "Vorlagen" einschalten, Tor erfassen, Max als Torschützen und Ben als Vorlage wählen, Torliste prüfen.

**Acceptance Scenarios**:

1. **Given** der Schalter "Vorlagen" ist aus, **When** der Nutzer nach einem Feuerbach-Tor Max als Torschützen wählt, **Then** schließt sich das Fenster sofort wie bisher, ohne Frage nach der Vorlage.
2. **Given** der Schalter ist an und die Uhr läuft in Minute 12, **When** der Nutzer ein Feuerbach-Tor erfasst und "7 Max" antippt, **Then** wechselt dasselbe Fenster zu "Vorlage von?" mit dem Untertitel "Tor in Minute 12' · Max" und zeigt das Aufgebot als Knöpfe mit Nummer und Name, ohne Max.
3. **Given** die Frage "Vorlage von?" ist offen, **When** der Nutzer "9 Ben" antippt, **Then** schließt sich das Fenster und die Torliste zeigt "12' 1:0 Max (Vorlage: Ben)".
4. **Given** die Frage "Vorlage von?" ist offen, **When** der Nutzer nichts tut, **Then** zählt der Knopf "Ohne Vorlage (5 s)" herunter, das Fenster schließt sich nach 5 Sekunden und das Tor steht mit Torschütze, ohne Vorlage in der Liste.
5. **Given** die Frage "Vorlage von?" ist offen, **When** der Nutzer "Ohne Vorlage" tippt, **Then** schließt sich das Fenster sofort ohne Vorlage.
6. **Given** ein Aufgebot von 10 aus 21 Spielern, **When** der Nutzer in "Vorlage von?" "Andere …" tippt, **Then** erscheint zusätzlich der restliche Kader (ohne den Torschützen).
7. **Given** der Schalter ist an, **When** der Nutzer im ersten Schritt "Eigentor Gegner" wählt oder "Ohne Torschütze" bzw. die 8 Sekunden ablaufen lässt, **Then** kommt keine Frage nach der Vorlage.
8. **Given** die Frage "Vorlage von?" ist offen und das Tor ist höchstens 10 Sekunden alt, **When** der Nutzer "Rückgängig" tippt, **Then** wird das Tor vollständig entfernt wie bisher (001 US1-S4).

---

### User Story 2 - Vorlage nachträglich ändern (Priority: P1)

In einer ruhigen Minute oder nach dem Spiel ergänzt oder korrigiert der Nutzer die Vorlage über die Torliste.

**Why this priority**: Am Rand geht es oft zu schnell; ohne Nachtragen wären Vorlagen lückenhaft und Fehler nicht zu korrigieren.

**Independent Test**: Tor von Max ohne Vorlage antippen, "Vorlage ändern", Tom wählen, Torliste prüfen; danach "Ohne Vorlage" wählen.

**Acceptance Scenarios**:

1. **Given** der Schalter ist an und ein Feuerbach-Tor von Max ohne Vorlage, **When** der Nutzer das Tor in der Torliste antippt, **Then** bietet das Fenster neben "Torschütze ändern" den Knopf "Vorlage ändern".
2. **Given** das Fenster "Vorlage von?" ist nachträglich geöffnet, **Then** zeigt es das Raster ohne den Torschützen, "Andere …", "Ohne Vorlage" und "Abbrechen", ohne Countdown.
3. **Given** ein Tor von Max mit Vorlage Ben, **When** der Nutzer "Vorlage ändern" und "Tom" wählt, **Then** zeigt die Torliste "Max (Vorlage: Tom)"; wählt er "Ohne Vorlage", steht dort nur "Max".
4. **Given** ein Gegentor, ein Tor ohne Torschütze, ein "Eigentor Gegner" oder ein als Elfmeter markiertes Tor, **When** der Nutzer es antippt, **Then** gibt es keinen Knopf "Vorlage ändern".
5. **Given** der Schalter ist aus, **When** der Nutzer ein Tor antippt, **Then** gibt es keinen Knopf "Vorlage ändern"; bereits gespeicherte Vorlagen bleiben sichtbar.

---

### User Story 3 - Vorlage im Teilen-Text und im Live-Dashboard (Priority: P2)

Eltern sehen in der WhatsApp-Gruppe und auf dem Dashboard "Unser Spieltag", wer vorgelegt hat.

**Why this priority**: Erst die Anzeige außerhalb des Trainerhandys macht die Vorlage für Eltern und Kinder sichtbar; die Erfassung (US1, US2) ist aber auch allein schon nutzbar.

**Independent Test**: Spiel mit Tor "Max, Vorlage Ben" teilen und Text prüfen; dasselbe Spiel mit aktiver Live-Kopplung auf dem Dashboard aufklappen.

**Acceptance Scenarios**:

1. **Given** ein Tor von Max mit Vorlage Ben in Minute 12 zum 1:0, **When** der Nutzer teilt, **Then** steht in der Zeile des Tores im Verlauf "Max (Vorlage: Ben)".
2. **Given** dasselbe Spiel, **Then** lautet die Zeile "\*Torschützen\*" unverändert "Max ⚽"; es gibt keine eigene Zeile für Vorlagen, und Ben zählt dort nicht.
3. **Given** eine aktive Live-Kopplung (Spec 006), **When** ein Tor mit Vorlage erfasst wird und ein Elternteil die Karte aufklappt, **Then** zeigt der Torverlauf "12' 1:0 Max (Vorlage: Ben)".
4. **Given** ein Dashboard, das noch nicht neu geladen wurde (älterer Stand der App), **When** es einen Stand mit Vorlage empfängt, **Then** zeigt es das Spiel weiterhin korrekt, nur ohne Vorlage.

---

### User Story 4 - Schlanke Anzeige: nur Namen (Priority: P1)

Torschützen und Vorlagen erscheinen überall nur mit Namen. Die Rückennummer hilft nur beim schnellen Finden auf den Knöpfen. In der Torliste entfällt der Mannschaftsname, sobald ein Torschütze dasteht, weil der Stand schon zeigt, wer getroffen hat.

**Why this priority**: Gilt für alle Anzeigen aus US1 bis US3. Ohne Mannschaftsnamen passen Torschütze und Vorlage auch auf dem iPhone SE in eine Zeile.

**Independent Test**: Spieler "Max" mit Nummer 7 und "Ben" mit Nummer 9 anlegen, Tor mit Vorlage erfassen, Torliste, Tor-Fenster, Spieldetails, Teilen-Text und Dashboard prüfen; dazu ein Tor ohne Torschützen und ein Gegentor.

**Acceptance Scenarios**:

1. **Given** Max hat die Nummer 7 und Ben die Nummer 9, **When** ein Tor "Max, Vorlage Ben" erfasst ist, **Then** stehen in Torliste, Titel des Tor-Fensters, Spieldetails, Teilen-Text und Dashboard nur "Max" und "Ben", nirgends "7" oder "9".
2. **Given** dieselben Spieler, **Then** zeigen die Knöpfe in "Wer hat getroffen?" und "Vorlage von?" "7 Max" und "9 Ben".
3. **Given** ein Tor von Max ohne Vorlage zum 1:0, **Then** zeigt die Torliste "12' 1:0 Max", ohne "Feuerbach E1"; mit Schalter "Vorlagen" aus ebenso.
4. **Given** ein Feuerbach-Tor ohne Torschützen, **Then** zeigt die Torliste wie bisher "12' 1:0 Feuerbach E1"; ein Gegentor ohne Torschützen "4' 0:1 TSV Musterstadt".
5. **Given** ein Gegentor mit Freitext "Nr. 9", **Then** zeigt die Torliste "4' 0:1 Nr. 9 (TSV Musterstadt)" (wie die Spieldetails), ein "Eigentor Gegner" "Eigentor".

---

### Edge Cases

- Torschütze wird nachträglich geändert: Ist der neue Torschütze der bisherige Vorlagengeber, wird die Vorlage entfernt (niemand legt sich selbst vor). Wird "Ohne Torschütze" oder "Eigentor Gegner" gewählt, wird die Vorlage entfernt.
- Tor wird als Elfmeter markiert: Die Vorlage wird entfernt (wie Elfmeter und Eigentor sich ausschließen, 003 FR-E01). Wird "Elfmeter" wieder abgewählt, bleibt das Tor ohne Vorlage.
- Tor wird entfernt (FR-008): Die Vorlage bleibt mit dem Tor gespeichert und erscheint durchgestrichen mit ihm; wiederhergestellt ist sie wieder da. Entfernte Tore erscheinen weder im Teilen-Text noch im Dashboard.
- Gelöschter Spieler (FR-029): Als Vorlagengeber bleibt er in alten Spielen lesbar, wie als Torschütze.
- Ohne Aufgebot zeigt "Vorlage von?" den ganzen Kader ohne den Torschützen (wie 003 FR-E04).
- Der Schalter wird während eines Spiels ausgeschaltet: Gespeicherte Vorlagen bleiben sichtbar und werden weiter geteilt und live übertragen; nur die Erfassung verschwindet (wie 003 FR-E02).
- Der Schalter "Vorlagen" allein blendet den Knopf "Ereignis" (003 FR-E09) nicht ein, weil Vorlagen am Tor hängen und kein eigenes Ereignis sind.
- Zwischenstand teilen (FR-042) während des Spiels: enthält Vorlagen wie der Teilen-Text nach dem Schlusspfiff.
- Sicherung (FR-024): Vorlagen werden mit exportiert und importiert; ältere Sicherungen ohne Vorlagen bleiben lesbar.
- Lange Namen: "Max Mü. (Vorlage: Ben Me.)" darf im Teilen-Text umbrechen; Namen werden nicht gekürzt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-V01**: Die Einstellungen MÜSSEN im Abschnitt "Im Spiel erfassen" (003 FR-E02) einen Schalter "Vorlagen" mit der Erklärung "Nach dem Torschützen fragen, wer vorgelegt hat. Nur eigene Tore." bieten, Standard aus.
- **FR-V02**: Ist der Schalter an und wählt der Nutzer in der Schnellauswahl direkt nach einem Feuerbach-Tor (001 US3) einen Spieler als Torschützen, MUSS dasselbe Fenster zu "Vorlage von?" wechseln: Untertitel "Tor in Minute {Minute} · {Torschütze}", Raster aus dem Aufgebot ohne den Torschützen mit Nummer und Name (Größe und Anordnung wie FR-030), "Andere …" für den restlichen Kader ohne den Torschützen, "Ohne Vorlage ({n} s)" mit Countdown von 5 Sekunden. Nach Ablauf schließt das Fenster ohne Vorlage. "Rückgängig" bleibt erreichbar, solange das Rückgängig-Fenster des Tores läuft.
- **FR-V03**: Bei "Eigentor Gegner", "Ohne Torschütze", abgelaufener Schnellauswahl, Gegentoren und ausgeschaltetem Schalter DARF keine Frage nach der Vorlage erscheinen.
- **FR-V04**: Ist der Schalter an, MUSS das Fenster eines Feuerbach-Tores mit Spieler als Torschütze und ohne Elfmeter-Kennzeichen den Knopf "Vorlage ändern" bieten. Er öffnet "Vorlage von?" wie FR-V02, jedoch ohne Countdown, mit "Ohne Vorlage" (entfernt die Vorlage) und "Abbrechen".
- **FR-V05**: Eine Vorlage DARF nur an einem Feuerbach-Tor mit Spieler als Torschützen und ohne Elfmeter-Kennzeichen hängen, und der Vorlagengeber DARF nicht der Torschütze sein. Ändert sich das Tor so, dass eine Bedingung verletzt ist (anderer Torschütze gleich Vorlagengeber, "Ohne Torschütze", "Eigentor Gegner", "Elfmeter"), MUSS die Vorlage entfernt werden.
- **FR-V06**: Torliste im Spiel (FR-034), Titel des Tor-Fensters und Spieldetails MÜSSEN ein Tor mit Vorlage als "{Torschütze} (Vorlage: {Vorlagengeber})" zeigen, z. B. "12' 1:0 Max (Vorlage: Ben)".
- **FR-V07**: Der Teilen-Text (Spec 005, FR-S03) MUSS die Vorlage in der Zeile des Tores als "{Torschütze} (Vorlage: {Vorlagengeber})" zeigen. Es gibt keine eigene Zeile für Vorlagen; die Zeile "\*Torschützen\*" (FR-S06) bleibt unverändert.
- **FR-V08**: Die Live-Kopplung (Spec 006) MUSS den Anzeigenamen des Vorlagengebers mit übertragen (Ergänzung zu FR-L10), und das Dashboard MUSS ihn im aufgeklappten Torverlauf (FR-L12) als "{Torschütze} (Vorlage: {Vorlagengeber})" zeigen, z. B. "Max (Vorlage: Ben)". Ein Dashboard mit älterem Stand der App MUSS solche Stände weiterhin anzeigen (ohne Vorlage), und ein neues Dashboard MUSS Stände ohne Vorlage von Trainer-Handys mit älterem Stand der App anzeigen.
- **FR-V09**: In allen Anzeigen (Torliste, Tor-Fenster, Spieldetails, Teilen-Text, Dashboard) MÜSSEN Torschütze und Vorlagengeber nur mit Anzeigenamen (FR-020) erscheinen, nie mit Rückennummer, auch wenn eine eingetragen ist. Die Auswahlknöpfe in "Wer hat getroffen?" und "Vorlage von?" MÜSSEN Nummer und Name zeigen.
- **FR-V10**: Vorlagen MÜSSEN in der Sicherung (FR-024) enthalten sein; Sicherungen ohne Vorlagen MÜSSEN weiterhin importiert werden können.
- **FR-V11**: Torliste im Spiel und Titel des Tor-Fensters MÜSSEN bei Toren mit Torschützen auf den Mannschaftsnamen verzichten: eigene Tore "{Name}", "Eigentor Gegner" als "Eigentor", Gegentore mit Freitext "{Freitext} ({Gegner})" wie in den Spieldetails; Zusätze "(Vorlage …)" und "(Elfmeter)" folgen dahinter. Ohne Torschützen MUSS wie bisher der Mannschaftsname stehen (Kurzform der eigenen Mannschaft bzw. Gegner). Gilt unabhängig vom Schalter "Vorlagen" und ändert 001 US3-S1 und 003 US1-S1.

### Key Entities

- **Tor**: zusätzlich optional ein Vorlagengeber (Spieler aus dem Kader), nur bei eigenen Toren mit Spieler als Torschützen und ohne Elfmeter.
- **Einstellungen**: zusätzlich Schalter "Vorlagen" (Standard aus).
- **Live-Stand eines Tores** (Spec 006): zusätzlich optional der Anzeigename des Vorlagengebers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-V01**: Ein Tor mit Torschütze und Vorlage ist mit drei Taps (Tor, Torschütze, Vorlage) in unter 5 Sekunden erfasst.
- **SC-V02**: Mit ausgeschaltetem Schalter braucht ein Tor mit Torschützen genau so viele Taps wie vorher, und kein Bildschirm ändert sich.
- **SC-V03**: Ohne weiteren Tipp ist das Fenster spätestens 5 Sekunden nach der Wahl des Torschützen wieder zu; das Tor und der Torschütze bleiben in jedem Fall gespeichert.
- **SC-V04**: In keiner Anzeige erscheint eine Rückennummer neben einem Torschützen oder Vorlagengeber (geprüft mit Spielern, die Nummern haben).
- **SC-V05**: Auf dem iPhone SE steht "Moritz (Vorlage: Anton)" in der Torliste ungekürzt in einer Zeile.

## Assumptions

- Eine Vorlage je Tor; keine "zweite Vorlage" oder "Elfmeter herausgeholt".
- Keine Vorlagen-Statistik oder Rangliste, weder in der App noch im Teilen-Text.
- Der Schalter gilt wie die anderen Schalter aus 003 für das ganze Gerät.
- Die Tor-Erfassung selbst bleibt ein Tap (Constitution I); die Vorlage ist optional und nachträglich möglich.
- Die Anzeige ohne Rückennummer entspricht dem heutigen Verhalten bei Torschützen; FR-V09 schreibt es fest und dehnt es auf Vorlagen aus.
- Ohne Mannschaftsnamen ist in der Torliste genug Platz (gemessen im Mockup auf dem iPhone SE); ein Zeilenumbruch für Zeilen mit Vorlage ist deshalb nicht vorgesehen. Sehr lange Namen kürzt die Torliste wie bisher mit "…"; Tor-Fenster, Spieldetails, Teilen-Text und Dashboard zeigen sie vollständig.
- Abhängigkeiten: Spec 001 (Torschützen, Aufgebot), 003 (Schalter, Elfmeter), 005 (Teilen-Text), 006 (Live-Dashboard).
