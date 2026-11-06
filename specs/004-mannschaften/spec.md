# Feature Specification: Meine Mannschaften und schlankes "Neues Spiel"

**Feature Branch**: `004-mannschaften`

**Created**: 2026-11-03

**Status**: Entwurf. Review A im Chat erledigt (03.11.2026); Mockup offen (Review B).

**Input**: User description: "Die Seite 'Neues Spiel' ist überladen. Eigene Mannschaft und eigenes Trikot ändern sich kaum: einmal in den Einstellungen anlegen wie den Kader, mit Heim- und Auswärtstrikot. Beim Spiel ist es vorausgewählt und lässt sich über 'Ändern' aufklappen (Leibchen, Auswärtstrikot zu Hause). Gegnertrikot genauso mit Farbe und 'Ändern'. Bei der Begegnung zeigen, wie die Namen im Spiel umbrechen bzw. welche Kurzform gilt. Die Schnellauswahl 'Sportvg Feuerbach' oben braucht es nicht."

## Clarifications

### Session 2026-11-03

- Q: Eine oder mehrere eigene Mannschaften in den Einstellungen? → A: Mehrere möglich (z. B. U11 und U10 mit gemeinsamem Kader), jede mit eigenem Heim- und Auswärtstrikot. Im Formular erscheint eine Auswahl nur, wenn mehr als eine angelegt ist.
- Q: Spielzeit-Vorlagen (z. B. WFV 2 × 25, Leistungsliga 3 × 25)? → A: Nicht nötig; die Auswahl im Formular ist schnell genug.
- Q: Ein Kader je Mannschaft? → A: Nein, ein gemeinsamer Kader reicht. (Ersetzt am 06.11.2026 durch Spec 015 "Kader je Mannschaft".)
- Q: Weitere Schalter? → A: Die Einstellungen bekommen zusätzlich den Abschnitt "Im Spiel erfassen" (Karten, Wechsel, Lesezeichen, siehe Spec 003).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mannschaft einmal anlegen (Priority: P1)

Der Trainer legt in den Einstellungen seine Mannschaft mit Heim- und Auswärtstrikot an und muss beim Spiel nur noch den Gegner eintragen.

**Independent Test**: Mannschaft "Sportvg Feuerbach U11", Heim Rot, Auswärts Schwarz anlegen; Heim- und Auswärtsspiel anlegen, Trikotfarbe prüfen.

**Acceptance Scenarios**:

1. **Given** die Einstellungen, **When** der Nutzer "Mannschaft anlegen" mit Name "Sportvg Feuerbach U11", Heimtrikot Rot und Auswärtstrikot Schwarz speichert, **Then** steht sie unter "Meine Mannschaften".
2. **Given** genau eine Mannschaft, **When** der Nutzer "Neues Spiel" öffnet, **Then** ist sie gesetzt, ohne Auswahl und ohne Namensfeld; nur der Gegner muss eingetragen werden.
3. **Given** ein Heimspiel, **Then** ist das eigene Trikot Rot; **When** der Nutzer Heim und Gast tauscht, **Then** wechselt es auf Schwarz (Auswärtstrikot), solange es nicht von Hand geändert wurde.
4. **Given** zwei Mannschaften (U11, U10), **When** der Nutzer "Neues Spiel" öffnet, **Then** erscheinen Auswahl-Chips "U11 | U10", vorausgewählt die zuletzt genutzte.
5. **Given** eine Mannschaft wird gelöscht (mit Bestätigung), **Then** bleiben alte Spiele mit ihrem Namen unverändert in der Historie.

---

### User Story 2 - Trikots mit "Ändern" (Priority: P1)

Statt zwei voller Farbpaletten zeigt das Formular je Mannschaft die gewählte Farbe und einen Knopf "Ändern".

**Independent Test**: Neues Spiel öffnen, beide Trikotzeilen prüfen, "Ändern" beim Gegner, Farbe wählen, Spiel anlegen.

**Acceptance Scenarios**:

1. **Given** das Formular, **Then** zeigt es zwei Zeilen "Feuerbach U11 ■ Rot · Ändern" und "<Gegner> ■ Schwarz · Ändern".
2. **Given** der Nutzer tippt "Ändern", **Then** klappt die Palette darunter auf; nach der Wahl klappt sie wieder zu.
3. **Given** das eigene Trikot wird im Formular geändert (z. B. Leibchen), **Then** gilt das nur für dieses Spiel; die Mannschaft in den Einstellungen bleibt unverändert.
4. **Given** ein Gegnername, für den schon einmal eine Farbe gewählt wurde, **Then** ist diese vorausgewählt (wie FR-031).

---

### User Story 3 - Begegnung mit Vorschau (Priority: P2)

Die Begegnung zeigt die Namen so, wie sie im Spiel über dem Spielstand stehen (Kurzform, Umbruch).

**Independent Test**: Langen Gegnernamen eingeben, Vorschau mit Kopfzeile im Spiel vergleichen.

**Acceptance Scenarios**:

1. **Given** Mannschaft "Sportvg Feuerbach U15-Juniorinnen" und Gegner "SGM SV Prag Stuttgart/TSV Weilimdorf", **Then** zeigt die Begegnung "Feuerbach U15-Juniorinnen" und den Gegner mit demselben Umbruch (höchstens zwei Zeilen) wie die Kopfzeile im Spiel (FR-040).

### Edge Cases

- Bestehende Nutzer: Beim ersten Start werden die bisher genutzten eigenen Namen (bis 5) als Mannschaften übernommen, Heimtrikot = zuletzt genutzte eigene Farbe (sonst Rot), Auswärtstrikot = Heimtrikot, bis der Nutzer es ändert.
- Keine Mannschaft angelegt (neue Installation): Vorgabe "Sportvg Feuerbach", Heim Rot, Auswärts Rot; Hinweis "In den Einstellungen anpassen".
- Gleiche Farbe beider Mannschaften: Hinweis wie heute (FR-031).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-M01**: Die Einstellungen MÜSSEN einen Abschnitt "Meine Mannschaften" bieten: anlegen, ändern, löschen (mit Bestätigung); je Mannschaft Name (1 bis 40 Zeichen), Heimtrikot und Auswärtstrikot aus `design/trikot-farben.json`.
- **FR-M02**: "Neues Spiel" MUSS die eigene Mannschaft aus "Meine Mannschaften" übernehmen: bei einer Mannschaft ohne Auswahl, bei mehreren als Auswahl-Chips mit Kurzform (Vorauswahl: zuletzt genutzte). Freitext für den eigenen Namen und die Schnellauswahl "Zuletzt genutzt" entfallen (ersetzt FR-014 Satz 2).
- **FR-M03**: Das eigene Trikot MUSS je nach Heim/Auswärts aus Heim- bzw. Auswärtstrikot vorbelegt sein und folgt dem Tausch-Knopf, solange es nicht von Hand geändert wurde. Anzeige als Farbfeld mit Farbname und "Ändern"; "Ändern" klappt die Palette auf. Änderungen gelten nur für dieses Spiel.
- **FR-M04**: Das Gegnertrikot MUSS genauso dargestellt werden (Farbfeld, Name, "Ändern"); Vorgabe wie FR-031.
- **FR-M05**: Die Begegnung MUSS die Namen wie die Kopfzeile im Spiel darstellen (Kurzform, höchstens zwei Zeilen, FR-040).
- **FR-M06**: Spielzeit-Schema und Aufgebot MÜSSEN je Mannschaft gemerkt und beim nächsten Spiel dieser Mannschaft vorbelegt werden (statt global vom letzten Spiel).
- **FR-M07**: Die Einstellungen MÜSSEN den Abschnitt "Im Spiel erfassen" mit den Schaltern aus Spec 003 (FR-E02) enthalten.

### Key Entities

- **Mannschaft**: Name, Heimtrikot, Auswärtstrikot, zuletzt genutztes Spielzeit-Schema und Aufgebot, Zeitpunkt der letzten Nutzung.

## Success Criteria *(mandatory)*

- **SC-M01**: Ein Spiel einer angelegten Mannschaft ist in unter 10 Sekunden angelegt (Gegner tippen, "Spiel anlegen").
- **SC-M02**: Das Formular "Neues Spiel" passt bei einer Mannschaft und geschlossenen Paletten mit höchstens einmal Scrollen auf das iPhone SE.

## Assumptions

- Ein Gerät gehört meist einer Person mit einer oder wenigen Mannschaften; keine Synchronisation zwischen Geräten.
