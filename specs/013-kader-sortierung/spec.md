# Feature Specification: Kader sortieren nach Vorname oder Rückennummer

**Feature Branch**: `013-kader-sortierung` (umgesetzt auf `claude/friendly-fermi-kr9tmr`)

**Created**: 2026-11-05

**Status**: Entwurf, Review A offen.

**Input**: Atti (05.11.2026): "Bei der Anzeige des Kaders (egal wo; insb. bei der Auswahl des Torschützen usw.) möchte ich in den Einstellungen die Auswahl haben, wie ich die sortiert haben will: nach Rückennummern oder nach Vornamen (jeweils aufsteigend)." Nachtrag: "Der Standard soll alphabetisch aufsteigend sein bzgl. der Vornamen."

## Ausgangslage

Heute ist der Kader überall fest nach Rückennummer sortiert, Spieler ohne Nummer stehen am Ende, gleiche Nummern nach Name (`visiblePlayers`, Spec 001 US5). Diese Reihenfolge erscheint an folgenden Stellen:

| Stelle | Wo in der App |
|---|---|
| Kaderliste | "Mehr" → "Kader" |
| Aufgebot | "Neues Spiel" → "Aufgebot" |
| Torschützen-Auswahl inkl. "Andere …" | Spiel, nach "Tor" bzw. in der Torliste |
| Vorlagen-Auswahl inkl. "Andere …" | Spiel, nach dem Torschützen (Spec 009) |
| Karten und Wechsel | Spiel, Knopfzeile (Spec 003) |
| Elfmeterschießen | Schützen-Auswahl (Spec 003 FR-P03) |
| Kader teilen | Text "Nummer Name" je Zeile (FR-028) |

Nicht betroffen, weil dort keine Kaderliste steht, sondern eine fachliche Reihenfolge: Torliste und Spielverlauf (nach Zeit), Torschützen-Zeile im Teilen-Text (meiste Tore zuerst, FR-S06), Vorschau von "Liste einfügen" (Reihenfolge der eingefügten Zeilen), Dashboard der Eltern (zeigt keinen Kader).

## Clarifications

### Session 2026-11-05

- Q: Standard-Sortierung? → A: Vorname, alphabetisch aufsteigend (Atti). Gilt auch für bestehende Installationen, die bisher nach Nummer sortiert waren.

### Offen für Review A (je mit Empfehlung)

- Q1: Wo liegt der Umschalter? → Empfehlung: nur in den Einstellungen, neuer Abschnitt "KADER" direkt unter "MEINE MANNSCHAFTEN". Kein zweiter Umschalter auf der Kader-Seite (YAGNI).
- Q2: Spieler ohne Rückennummer bei "Rückennummer"? → Empfehlung: am Ende, untereinander nach Vorname (wie heute).
- Q3: Folgt "Kader teilen" der Einstellung? → Empfehlung: ja ("egal wo"); der geteilte Text bleibt über "Liste einfügen" wieder einlesbar.
- Q4: Mockup (Schritt 4/5) nötig? → Empfehlung: nein. Der Umschalter nutzt das bekannte Muster von "Darstellung" (Segmente); Atti sieht das Ergebnis in den Screenshots von Review C.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Kader nach Vorname oder Rückennummer sortieren (Priority: P1)

Atti sucht nach einem Tor schnell den Torschützen. Er kennt die Kinder beim Vornamen und findet "Leo" in einer alphabetischen Liste schneller als über die Nummer. Ein Kollege, der die Kinder über die Rückennummern zuordnet, stellt in den Einstellungen "Rückennummer" ein. Die gewählte Reihenfolge gilt überall, wo der Kader angezeigt wird.

**Why this priority**: Die Torschützen-Auswahl muss am Spielfeldrand in Sekunden gehen (Constitution I). Eine Reihenfolge, die zum Kopf des Trainers passt, spart dort Zeit.

**Independent Test**: Kader mit "7 Max", "3 Tom", "10 Ben", "Leo" (ohne Nummer) anlegen; ohne Einstellung zeigt die Torschützen-Auswahl Ben, Leo, Max, Tom; nach Wechsel auf "Rückennummer" 3 Tom, 7 Max, 10 Ben, Leo; Kaderliste, Aufgebot und "Kader teilen" folgen jeweils.

**Acceptance Scenarios**:

1. **Given** eine neue Installation, **When** der Nutzer die Einstellungen öffnet, **Then** steht im Abschnitt "KADER" unter "Sortieren nach" die Auswahl "Vorname | Rückennummer", gewählt ist "Vorname".
2. **Given** der Kader "7 Max", "3 Tom", "10 Ben", "Leo" und die Sortierung "Vorname", **When** nach einem eigenen Tor die Auswahl "Wer hat getroffen?" erscheint, **Then** stehen die Spieler in der Reihenfolge Ben, Leo, Max, Tom.
3. **Given** derselbe Kader, **When** der Nutzer in den Einstellungen "Rückennummer" wählt und danach ein eigenes Tor erfasst, **Then** stehen die Spieler in der Reihenfolge 3 Tom, 7 Max, 10 Ben, Leo (ohne Nummer zuletzt).
4. **Given** die Sortierung "Rückennummer", **When** der Nutzer die Kaderliste, das Aufgebot unter "Neues Spiel", die Vorlagen-, Karten-, Wechsel- und Elfmeterschießen-Auswahl öffnet, **Then** gilt überall dieselbe Reihenfolge wie in Szenario 3.
5. **Given** ein Aufgebot (Max, Tom) und die Sortierung "Vorname", **When** der Nutzer in der Torschützen-Auswahl "Andere …" tippt, **Then** stehen erst die Spieler des Aufgebots (Max, Tom), danach die übrigen (Ben, Leo), beide Gruppen nach Vorname sortiert.
6. **Given** die Sortierung "Vorname", **When** der Nutzer "Kader teilen" tippt, **Then** lautet der Text "10 Ben", "Leo", "7 Max", "3 Tom" (je eine Zeile).
7. **Given** die App wird geschlossen und neu geöffnet, **Then** bleibt die gewählte Sortierung erhalten.
8. **Given** ein Handy, das vor diesem Update nach Rückennummer sortiert hat, **When** die App nach dem Update öffnet, **Then** gilt "Vorname", bis der Nutzer etwas anderes wählt.

### Edge Cases

- Gleiche Vornamen ("Max Me.", "Max Mü."): Reihenfolge nach dem vollständigen Anzeigenamen, dann nach Nummer.
- Gleiche Nummer (z. B. nach "Liste einfügen" mit Warnung "Nummer doppelt"): Reihenfolge nach Vorname.
- Groß-/Kleinschreibung und Umlaute: alphabetisch nach deutscher Regel ("Ömer" neben "Oskar", "ben" wie "Ben").
- Nummern numerisch, nicht als Text: 2 vor 10.
- Kein Spieler mit Nummer: "Rückennummer" ergibt dieselbe Reihenfolge wie "Vorname".
- Leerer Kader: keine Änderung (Hinweise wie heute).
- Gelöschte Spieler bleiben ausgeblendet; ihre Namen in alten Spielen sind von der Sortierung nicht betroffen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-K01**: Die Einstellungen MÜSSEN einen Abschnitt "KADER" mit der Auswahl "Sortieren nach: Vorname | Rückennummer" bieten (Segmente wie "Darstellung"). Die Wahl wird sofort gespeichert und bleibt auf dem Gerät erhalten.
- **FR-K02**: Vorgabe MUSS "Vorname" sein, auch für gespeicherte Einstellungen ohne diesen Wert (bestehende Installationen).
- **FR-K03**: "Vorname" MUSS alphabetisch aufsteigend nach dem Anzeigenamen sortieren (deutsche Sortierregel, ohne Beachtung von Groß-/Kleinschreibung); bei gleichem Namen nach Nummer aufsteigend, ohne Nummer zuletzt.
- **FR-K04**: "Rückennummer" MUSS numerisch aufsteigend sortieren; Spieler ohne Nummer stehen am Ende; bei gleicher oder fehlender Nummer nach Vorname wie FR-K03.
- **FR-K05**: Die gewählte Sortierung MUSS überall gelten, wo der Kader als Liste oder Auswahl erscheint: Kaderliste, Aufgebot unter "Neues Spiel", Torschützen- und Vorlagen-Auswahl (inkl. "Andere …"), Karten, Wechsel, Elfmeterschießen und der Text von "Kader teilen". Bei "Andere …" bleiben Aufgebot und übrige Spieler getrennte Gruppen (FR-030), jede in sich sortiert.
- **FR-K06**: Die Sortierung MUSS nur die Reihenfolge ändern; Beschriftung der Knöpfe ("7 Max"), Aufgebot, Torschützen und gespeicherte Spiele bleiben unverändert.
- **FR-K07**: Die Einstellung bleibt auf dem Gerät: kein Teil der Sicherung, nicht Teil der Live-Übertragung (wie "Darstellung").

### Key Entities

- **Einstellung "Kader-Sortierung"**: Wert "Vorname" oder "Rückennummer", Vorgabe "Vorname"; gehört zu den Geräte-Einstellungen.

## Hilfe *(mandatory)*

| Eintrag | Änderung | Quelle |
|---|---|---|
| `kader-sortierung` "Wie sortiere ich den Kader?" | neu: Einstellungen, "KADER", "Sortieren nach: Vorname oder Rückennummer"; gilt für Kader, Aufgebot und alle Spieler-Auswahlen | 013 US1 |
| `kader` "Wie pflege ich den Kader?" | geändert: `related` um `kader-sortierung` ergänzt (Wortlaut bleibt) | 001 US5, 013 US1 |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-K01**: An allen sieben Stellen aus der Ausgangslage erscheint der Kader in derselben Reihenfolge (automatisch geprüft je Sortierung).
- **SC-K02**: Ein Wechsel der Sortierung braucht höchstens zwei Taps ab "Einstellungen" und wirkt ohne Neuladen.
- **SC-K03**: Der Abschnitt "KADER" erfüllt die Kontrastmatrix beider Themes und axe-core ohne Verstöße.

## Assumptions

- Keine neue Laufzeit-Abhängigkeit; Sortierung mit `Intl.Collator`/`localeCompare('de')`, wie heute.
- Die Sortierung ist eine persönliche Vorliebe je Gerät; Trainer mit eigenem Handy stellen sie jeder selbst ein.
- Die Live-Spieltag-Daten enthalten keinen Kader (Constitution III), daher keine Auswirkung auf Dashboard und Kopplung.
