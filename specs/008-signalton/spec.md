# Feature Specification: Signalton wählbar

**Feature Branch**: `008-signalton`

**Created**: 2026-11-04

**Status**: Review A und Review B erledigt (04.11.2026). Mockup und Hörprobe: https://claude.ai/artifact/6XxXPXXSyYYcCDkRDMW1GV

**Input**: User description: "ist es möglich der Signalton zu ändern oder drei unterschiedliche anzubieten? Damit es weniger so klingt wie der bundesweite Katastrophenalarm auf den Handys ;-)"

## Clarifications

### Session 2026-11-04

- Q: Welche drei Töne (Hörprobe mit Glocke, Gong, Pfiff, Tröte und dem bisherigen Ton)? → A: Pfiff, Glocke, Gong.
- Q: Den bisherigen Ton als vierte Wahl "Alarm" behalten? → A: Nein, er entfällt.
- Q: Wo wird der Ton gewählt? → A: In den Einstellungen, gültig für alle Spiele.
- Q: Standard für neue und für bisherige Nutzer? → A: Pfiff, für alle (auch nach dem Update).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Signalton in den Einstellungen wählen (Priority: P1)

Der Trainer findet den bisherigen Ton zu schrill. In den Einstellungen hört er sich Pfiff, Glocke und Gong an und wählt einen aus. Ab dann ertönt bei Spielzeitende und in der Nachspielzeit dieser Ton.

**Independent Test**: Einstellungen öffnen, "Glocke" antippen, neu laden, Neues Spiel → "Ton testen".

**Acceptance Scenarios**:

1. **Given** ein Handy ohne gewählten Signalton (neu oder vor diesem Update), **When** der Nutzer die Einstellungen öffnet, **Then** zeigt der Abschnitt "SIGNALTON" die Töne Pfiff, Glocke und Gong in dieser Reihenfolge, und "Pfiff" ist ausgewählt.
2. **Given** die Einstellungen, **When** der Nutzer "Glocke" antippt, **Then** ertönt sofort die Glocke, "Glocke" ist ausgewählt, und die Auswahl bleibt nach einem Neuladen erhalten.
3. **Given** "Glocke" ist gewählt, **When** der Nutzer bei "Neues Spiel" auf "Ton testen" tippt, **Then** ertönt die Glocke, und der Hinweis darunter nennt den gewählten Ton.
4. **Given** "Gong" ist gewählt und ein Spiel läuft, **When** die Spielzeit 00:00 erreicht und eine volle Nachspielminute vergeht, **Then** ertönt jeweils der Gong (mit Blinken und Vibration wie bisher).

---

### Edge Cases

- Gespeicherte Einstellungen ohne oder mit unbekanntem Signalton (ältere Version, beschädigte Daten): es gilt der Pfiff.
- Wechsel des Tons während ein Spiel läuft (über Mehr → Einstellungen): das nächste Signal nutzt bereits den neuen Ton.
- Lautlos-Schalter, Lautstärketasten, Sperre nach dem Hintergrund und stille Tonspur gelten für alle drei Töne unverändert (Spec 001 FR-036, FR-039).
- Die Sicherung (Spec 001 FR-024) enthält nur Spiele und Kader; der Signalton bleibt eine Geräteeinstellung.

## Requirements *(mandatory)*

### Functional Requirements

Diese Anforderungen ersetzen in Spec 001 die Klangbeschreibung aus FR-036 ("drei kurze Pfiffe, ca. 1,4 s") und den "Pfiff" aus FR-039. Kanal, Freischaltung, Hinweis "Ton aus · tippen" und stille Tonspur bleiben unverändert.

- **FR-K01**: Die App MUSS genau drei Signaltöne anbieten, in dieser Reihenfolge:
  - **Pfiff**: Schiedsrichterpfeife mit Triller, kurz-kurz-lang (Abpfiff), Grundton um 3,1 kHz.
  - **Glocke**: Rundenglocke, drei Schläge mit natürlichem Ausklang.
  - **Gong**: aufsteigender Dreiklang, weich ausklingend.
  Jeder Ton MUSS im Browser erzeugt werden (keine Audiodatei, offline), höchstens etwa 2,5 s dauern, mit kurzer Stille vorweg beginnen (iOS verschluckt sonst den Anfang) und voll ausgesteuert sein. Der bisherige Ton (drei harte Pieptöne) entfällt.
- **FR-K02**: Die Einstellungen MÜSSEN einen Abschnitt "SIGNALTON" mit den drei Tönen als Auswahlliste zeigen (je Name und eine Zeile Beschreibung). Antippen MUSS den Ton auswählen, sofort speichern und ihn sofort abspielen (Hörprobe, schaltet den Ton zugleich frei).
- **FR-K03**: Vorgabe ist der Pfiff. Fehlt ein gespeicherter Signalton oder ist er unbekannt, MUSS der Pfiff gelten.
- **FR-K04**: Das Signal bei 00:00 und zu jeder vollen Nachspielminute (Spec 001 FR-007) MUSS den gewählten Ton spielen; ein Wechsel gilt ab dem nächsten Signal.
- **FR-K05**: "Ton testen" bei "Neues Spiel" (Spec 001 FR-039) MUSS den gewählten Ton spielen; der Hinweis darunter MUSS den Namen des gewählten Tons und den Weg zur Änderung nennen ("Signalton: Pfiff, änderbar unter „Mehr“ → „Einstellungen“.").

### Key Entities

- **Settings.signalSound**: `'pfiff' | 'glocke' | 'gong'`, Vorgabe `'pfiff'`. Gerätelokal wie das Theme, nicht Teil der Sicherung.

## Success Criteria *(mandatory)*

- **SC-K01**: Keiner der drei Töne erinnert an den Warnton des bundesweiten Warntags (Prüfung durch Atti in Review C, auf dem iPhone).
- **SC-K02**: Am Spielfeldrand ist der Pfiff mindestens so gut hörbar wie der bisherige Ton (gemessene Lautheit mit Handy-Lautsprecher-Filter: Pfiff ≥ bisher, Glocke höchstens 3 dB, Gong höchstens 6 dB leiser; Prüfung auf dem Platz durch Atti).

## Assumptions

- Kein eigener Ton für die Nachspielzeit und keine Option "Kein Ton" (YAGNI); Blinken und Vibration bleiben für alle Töne gleich.
- Der Pfiff kann auf dem Platz mit einem echten Pfiff verwechselt werden. Atti hat ihn trotzdem als Standard gewählt; Glocke und Gong sind die Alternative.
