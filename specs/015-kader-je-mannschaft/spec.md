# Feature Specification: Kader je Mannschaft (mehrere Kader, Mannschaften zuordnen)

**Feature Branch**: `015-kader-je-mannschaft` (Arbeit auf `claude/gallant-goldberg-99d9pu`)

**Created**: 2026-11-06

**Status**: Entwurf, wartet auf Review A. Roadmap-Punkt B3 (`docs/roadmap.md`). Ersetzt die Entscheidung "ein gemeinsamer Kader reicht" aus Spec 004 (Clarifications 03.11.2026).

**Input**: Atti (06.11.2026): "Kann man einen Kader einer bestimmten Mannschaft zuweisen, sowas wie Kader anlegen, dass man sagen kann, hey, wir haben hier das Set an E1-, E2-Spielern und das würden wir dann entsprechend meiner E1 und auch der E2-Mannschaft zuweisen. Jedoch ist der Kader der E3 ein ganz anderer und separat. Ich möchte nicht so viele Kinder in meinem Kader haben, um dann auszuwählen, wer jetzt bei der E1, E2 spielt, weil die unteren 19 nie in Frage kommen würden." Nachtrag: "Gemeinsamer Pool für E1 und E2."

## Ausgangslage

Heute gibt es genau einen Kader für alle Mannschaften eines Handys (Spec 001 US5, Spec 004 Clarifications). Wer E1, E2 und E3 betreut, hat alle Kinder in einer Liste. Aufgebot (Spec 004 FR-M06, gemerkt je Mannschaft) und "Andere …" (FR-030) mildern das, aber ohne Aufgebot zeigt die Torschützen-Auswahl alle Kinder, und das Aufgebot unter "Neues Spiel" listet alle Kinder zur Auswahl.

Betroffene Stellen (dieselben wie Spec 013, Ausgangslage):

| Stelle | Wo in der App | Neu |
|---|---|---|
| Kaderliste | "Mehr" → "Kader" | zeigt einen Kader; Auswahl, wenn es mehrere gibt |
| Aufgebot | "Neues Spiel" → "Aufgebot" | nur der Kader der gewählten Mannschaft |
| Torschützen- und Vorlagen-Auswahl inkl. "Andere …" | Spiel | nur der Kader des Spiels |
| Karten, Wechsel, Elfmeterschießen | Spiel | nur der Kader des Spiels |
| Liste einfügen, Kader teilen | "Kader" | wirkt auf den angezeigten Kader |
| Sicherung | Einstellungen | enthält alle Kader und die Zuordnung |

## Clarifications

### Session 2026-11-06

- Q: Ein Kader je Mannschaft oder Kader für mehrere Mannschaften? → A: Kader für mehrere Mannschaften möglich; E1 und E2 teilen sich einen Kader, E3 hat einen eigenen (Atti).

### Vorschläge für Review A (Empfehlung des Agenten, noch offen)

- V1 Modell: Ein Kader ist eine benannte Spielerliste (z. B. "E1/E2", "E3"). Jede Mannschaft aus "Meine Mannschaften" gehört zu genau einem Kader; ein Kader kann für mehrere Mannschaften gelten. Jeder Spieler steht in genau einem Kader. Alternative (verworfen): Häkchen "spielt für E1, E2, E3" je Spieler; mehr Pflege je Kind, und beim Einfügen einer Liste müsste jede Zeile zugeordnet werden.
- V2 Zuordnung: Auf der Kader-Seite unter "Gilt für" mit Auswahl-Chips der Mannschaften (Mehrfachauswahl). Wählt man dort eine Mannschaft, die bisher zu einem anderen Kader gehörte, wechselt sie (ohne Rückfrage, die Chips zeigen es). Alternative: Auswahl "Kader" im Formular der Mannschaft unter "Einstellungen".
- V3 Aushilfe (E3-Kind spielt bei der E2): Im Aufgebot unter "Neues Spiel" gibt es "Spieler aus anderem Kader …"; die dort gewählten Kinder gehören nur für dieses Spiel zum Aufgebot und erscheinen damit auch in der Torschützen-Auswahl. "Andere …" im Spiel zeigt weiterhin nur den übrigen eigenen Kader. Alternative: Spieler in mehreren Kadern führen.
- V4 Unsichtbar, solange es nur einen Kader gibt: Bestehende Installationen bekommen einen Kader "Kader" mit allen Spielern, alle Mannschaften gehören dazu. Bis ein zweiter Kader angelegt wird, sieht die App aus wie heute (nur ein neuer Knopf "Neuer Kader").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Zweiten Kader anlegen und Mannschaften zuordnen (Priority: P1)

Atti betreut E1, E2 und E3. Sein bisheriger Kader enthält die neun Kinder von E1 und E2. Er legt einen zweiten Kader "E3" an, fügt dort die Liste der 19 E3-Kinder ein und ordnet ihm die Mannschaft E3 zu. Den bisherigen Kader nennt er "E1/E2"; er gilt für E1 und E2.

**Why this priority**: Ohne getrennte Kader gibt es nichts zu filtern; das ist die Grundlage für US2.

**Independent Test**: Kader mit Ben, Leo, Max, Tom (E1, E2, E3 angelegt). "Neuer Kader" mit Namen "E3", Liste "Paul, Maxi" einfügen, "Gilt für: E3" wählen. Kader-Seite zeigt Auswahl "Kader | E3"; "Kader" gilt für E1, E2; "E3" für E3 und enthält Paul, Maxi.

**Acceptance Scenarios**:

1. **Given** ein Handy mit einem Kader (Ben, Leo, Max, Tom) und den Mannschaften E1, E2, E3, **When** der Nutzer "Mehr" → "Kader" öffnet, **Then** sieht er den Kader wie heute, darunter "Gilt für: E1 · E2 · E3" und den Knopf "Neuer Kader".
2. **Given** dieselbe Ausgangslage, **When** der Nutzer "Neuer Kader" tippt, den Namen "E3" einträgt und unter "Gilt für" E3 wählt, **Then** gibt es zwei Kader: "Kader" (gilt für E1, E2) und "E3" (gilt für E3, noch leer); oben auf der Kader-Seite steht die Auswahl "Kader | E3", gewählt ist "E3".
3. **Given** der Kader "E3" ist gewählt, **When** der Nutzer "Liste einfügen" mit "5 Paul" und "11 Maxi" übernimmt, **Then** stehen Paul und Maxi im Kader "E3", nicht im Kader "Kader".
4. **Given** zwei Kader, **When** der Nutzer beim Kader "Kader" auf "Umbenennen" tippt und "E1/E2" einträgt, **Then** heißt die Auswahl oben "E1/E2 | E3".
5. **Given** zwei Kader, **When** der Nutzer beim Kader "E1/E2" unter "Gilt für" zusätzlich E3 antippt, **Then** gilt "E1/E2" für E1, E2, E3 und "E3" für keine Mannschaft; der Kader "E3" zeigt den Hinweis "Gilt für keine Mannschaft".
6. **Given** zwei Kader, **When** der Nutzer einen Spieler über "Ändern" mit "In Kader verschieben: E1/E2" verschiebt (z. B. Aufstieg zur Rückrunde), **Then** steht er nur noch im Kader "E1/E2"; Tore in alten Spielen behalten seinen Namen.
7. **Given** der Kader "E3" ist gewählt, **When** der Nutzer "Kader teilen" tippt, **Then** enthält der Text nur die Spieler von "E3".
8. **Given** zwei Kader, **When** der Nutzer beim Kader "E3" "Kader löschen" tippt und bestätigt, **Then** verschwindet er, seine Spieler sind ausgeblendet (wie gelöschte Spieler), Mannschaften, die zu ihm gehörten, gehören danach zum verbliebenen Kader; der letzte Kader lässt sich nicht löschen.

---

### User Story 2 - Nur die passenden Kinder im Spiel (Priority: P1)

Bei einem Spiel der E2 sieht Atti im Aufgebot und in der Torschützen-Auswahl nur die Kinder aus dem Kader "E1/E2". Die E3-Kinder erscheinen nirgends, auch nicht hinter "Andere …".

**Why this priority**: Das ist der eigentliche Nutzen: schnelle Auswahl am Spielfeldrand ohne Kinder, die nie in Frage kommen (Constitution I).

**Independent Test**: Kader "E1/E2" (Ben, Leo, Max, Tom, gilt für E1, E2) und "E3" (Paul, Maxi, gilt für E3). E2-Spiel ohne Aufgebot anlegen, Tor erfassen: Auswahl zeigt Ben, Leo, Max, Tom. E3-Spiel: Auswahl zeigt Maxi, Paul.

**Acceptance Scenarios**:

1. **Given** die Kader aus dem Independent Test, **When** der Nutzer "Neues Spiel" für E2 öffnet, **Then** zeigt "Aufgebot · 0 von 4" nur Ben, Leo, Max, Tom.
2. **Given** "Neues Spiel" ist für E2 offen, **When** der Nutzer die Mannschaft auf E3 wechselt, **Then** zeigt das Aufgebot "0 von 2" mit Maxi, Paul; das gemerkte Aufgebot von E3 ist vorbelegt (Spec 004 FR-M06).
3. **Given** ein E2-Spiel ohne Aufgebot, **When** ein eigenes Tor erfasst wird, **Then** zeigt "Wer hat getroffen?" Ben, Leo, Max, Tom und "Eigentor Gegner", aber weder Paul noch Maxi.
4. **Given** ein E2-Spiel mit Aufgebot Max, Tom, **When** der Nutzer in der Torschützen-Auswahl "Andere …" tippt, **Then** erscheinen zusätzlich Ben und Leo, aber nicht Paul und Maxi.
5. **Given** ein E2-Spiel, **Then** zeigen Vorlagen-, Karten-, Wechsel- und Elfmeterschießen-Auswahl ebenfalls nur den Kader "E1/E2" (inkl. "Andere …").
6. **Given** ein laufendes E2-Spiel, **When** der Nutzer währenddessen die Zuordnung ändert (E2 gehört jetzt zu "E3"), **Then** bleibt das laufende Spiel beim Kader, mit dem es angelegt wurde.
7. **Given** ein Spiel, das vor diesem Update angelegt wurde, **Then** zeigt es wie bisher alle Spieler (aller Kader) zur Auswahl.

---

### User Story 3 - Aushilfe aus einem anderen Kader (Priority: P2)

Leo aus der E3 hilft bei der E2 aus. Atti nimmt ihn beim Anlegen des Spiels ins Aufgebot, ohne ihn dauerhaft in den Kader "E1/E2" zu verschieben.

**Why this priority**: Kommt vor, aber selten; ohne diese Story müsste man Kinder hin- und herschieben.

**Independent Test**: E2-Spiel anlegen, unter "Aufgebot" "Spieler aus anderem Kader …", Kader "E3", Paul wählen; im Spiel ein Tor Paul zuordnen; im Kader "E1/E2" steht Paul danach nicht.

**Acceptance Scenarios**:

1. **Given** "Neues Spiel" für E2, **When** der Nutzer unter "Aufgebot" auf "Spieler aus anderem Kader …" tippt, **Then** öffnet sich eine Auswahl mit den anderen Kadern (Überschrift je Kader) und ihren Spielern.
2. **Given** der Nutzer wählt dort Paul (Kader "E3"), **Then** steht Paul mit dem Zusatz "E3" im Aufgebot und zählt mit ("Aufgebot · 5 von 4 + 1"). [Wortlaut im Mockup festlegen]
3. **Given** ein E2-Spiel mit Aushilfe Paul, **When** ein eigenes Tor erfasst wird, **Then** steht Paul in "Wer hat getroffen?" wie die anderen Spieler des Aufgebots.
4. **Given** das nächste E2-Spiel, **Then** ist Paul nicht im gemerkten Aufgebot vorbelegt (Aushilfen gelten nur für das eine Spiel). [Empfehlung; Alternative: mit merken]

### Edge Cases

- Nur ein Kader (Normalfall nach dem Update): keine Auswahl oben auf der Kader-Seite, kein "Spieler aus anderem Kader …"; Aufgebot und Auswahlen wie heute.
- Mannschaft ohne Kader kann es nicht geben: Neue Mannschaften gehören zum Kader der zuletzt genutzten Mannschaft, sonst zum ersten Kader; "Gilt für" lässt sich so nur von einem Kader zum anderen umhängen.
- Neue Installation ohne Spieler: ein leerer Kader "Kader" existiert von Anfang an; Hinweise wie heute.
- Namensvetter ("Max" in "E1/E2" und "Max" in "E3"): Die Kürzel-Regel (FR-020, "Max Mü.") gilt weiter über alle Kader, damit Aushilfen eindeutig bleiben.
- "Liste einfügen" erkennt Wiederholungen (gleiche Nummer bzw. gleicher Name) nur im gewählten Kader; ein Name, der in einem anderen Kader schon existiert, bekommt den Hinweis "Name in Kader E3".
- Gelöschte Spieler bleiben dem Kader zugeordnet und ausgeblendet; Namen in alten Spielen bleiben.
- Sicherung wiederherstellen auf einem Handy, das schon Kader hat: Kader mit gleicher Kennung werden zusammengeführt, neue Kader kommen dazu; die Zuordnung der Mannschaften auf dem Handy bleibt, außer eine Mannschaft hat noch keinen Kader. [Details in plan.md]
- "Spiel übernehmen" (Spec 006 US6): Torschützen werden über den Namen dem Kader der übernommenen Mannschaft zugeordnet.
- Live-Spieltag: Kader werden nie übertragen (Constitution III); keine Auswirkung auf Dashboard und Trainer-Link. Das spätere Trainer-Paket (Roadmap B1) nimmt Kader und Zuordnung mit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-KM01**: Die App MUSS mehrere Kader verwalten können. Ein Kader hat einen Namen (1 bis 24 Zeichen) und eine Spielerliste; jeder Spieler gehört zu genau einem Kader. Es gibt immer mindestens einen Kader.
- **FR-KM02**: Jede Mannschaft aus "Meine Mannschaften" MUSS zu genau einem Kader gehören; ein Kader kann für keine, eine oder mehrere Mannschaften gelten.
- **FR-KM03**: Die Kader-Seite MUSS bei mehr als einem Kader oben eine Auswahl der Kader zeigen (Segmente bzw. Chips mit Kadernamen, wie die Mannschafts-Chips unter "Neues Spiel"); bei einem Kader entfällt sie. "Spieler hinzufügen", "Liste einfügen" und "Kader teilen" wirken auf den gewählten Kader.
- **FR-KM04**: Die Kader-Seite MUSS je Kader "Gilt für" mit Auswahl-Chips aller Mannschaften zeigen (Mehrfachauswahl). Eine dort gewählte Mannschaft gehört ab sofort zu diesem Kader und nicht mehr zu ihrem bisherigen. Ein Kader ohne Mannschaft zeigt "Gilt für keine Mannschaft".
- **FR-KM05**: Die Kader-Seite MUSS "Neuer Kader" (Name und "Gilt für"), "Umbenennen" und "Kader löschen" (mit Bestätigung, nicht für den letzten Kader) bieten. Beim Löschen werden die Spieler des Kaders ausgeblendet wie gelöschte Spieler; seine Mannschaften gehören danach zum ersten verbliebenen Kader.
- **FR-KM06**: "Ändern" eines Spielers MUSS bei mehr als einem Kader "In Kader verschieben" anbieten.
- **FR-KM07**: "Neues Spiel" MUSS im Aufgebot nur die Spieler des Kaders der gewählten Mannschaft zeigen; beim Wechsel der Mannschaft wechselt die Liste mit. Das angelegte Spiel merkt sich seinen Kader.
- **FR-KM08**: Torschützen-, Vorlagen-, Karten-, Wechsel- und Elfmeterschießen-Auswahl MÜSSEN nur Spieler aus dem Kader des Spiels zeigen, plus Aushilfen aus seinem Aufgebot (FR-KM09); "Andere …" zeigt den übrigen Kader des Spiels (FR-030 gilt sonst unverändert). Spiele ohne gemerkten Kader (vor diesem Update angelegt) zeigen alle Spieler.
- **FR-KM09**: Das Aufgebot MUSS bei mehr als einem Kader "Spieler aus anderem Kader …" bieten. Gewählte Spieler gehören nur zum Aufgebot dieses Spiels, werden mit dem Kadernamen gekennzeichnet und nicht als gemerktes Aufgebot der Mannschaft gespeichert.
- **FR-KM10**: Beim Update MUSS die App einen Kader "Kader" mit allen bisherigen Spielern anlegen und ihm alle Mannschaften zuordnen; danach verhält sie sich wie vorher, bis ein zweiter Kader angelegt wird.
- **FR-KM11**: Die Sicherung MUSS alle Kader, die Kader-Zugehörigkeit der Spieler, die Zuordnung der Mannschaften und den Kader jedes Spiels enthalten; Wiederherstellen legt nichts doppelt an.
- **FR-KM12**: Kader und Zuordnung DÜRFEN NICHT live übertragen werden (Constitution III, Spec 006 FR-L10 unverändert).

### Key Entities

- **Kader**: Name, Spielerliste; gilt für keine, eine oder mehrere Mannschaften.
- **Spieler** (erweitert): gehört zu genau einem Kader.
- **Mannschaft** (erweitert, Spec 004): gehört zu genau einem Kader.
- **Spiel** (erweitert): merkt sich den Kader, mit dem es angelegt wurde; Aufgebot kann Aushilfen aus anderen Kadern enthalten.

## Hilfe *(mandatory)*

| Eintrag | Änderung | Quelle |
|---|---|---|
| `kader-mehrere` "Wie lege ich einen eigenen Kader für eine Mannschaft an?" | neu: "Kader", "Neuer Kader", Name, "Gilt für"; Beispiel E1/E2 gemeinsam, E3 getrennt; "In Kader verschieben"; verwandt mit `kader`, `aufgebot`, `mannschaft` | 015 US1 |
| `aufgebot` "Wie wähle ich das Aufgebot für ein Spiel?" | geändert: zeigt nur den Kader der Mannschaft; Satz zu "Spieler aus anderem Kader …" für Aushilfen | 015 US2, 015 US3 |
| `torschuetze` "Wie trage ich den Torschützen nach?" | geändert: Auswahl zeigt das Aufgebot bzw. den Kader der Mannschaft | 015 US2 |
| `kader-liste` "Wie übernehme ich eine Spielerliste aus WhatsApp?" | geändert: Liste landet im gewählten Kader; "Kader teilen" teilt den gewählten Kader | 015 US1 |

Keywords für `kader-mehrere`: "e1 e2 e3 kader trennen getrennt zweiter kader mannschaft zuordnen pool aushilfe jahrgang".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-KM01**: Mit den Kadern "E1/E2" (9 Kinder) und "E3" (19 Kinder) zeigt die Torschützen-Auswahl in einem E2-Spiel ohne Aufgebot 9 Kinder, keines aus E3 (automatisch geprüft).
- **SC-KM02**: Einen zweiten Kader anlegen, eine Liste einfügen und eine Mannschaft zuordnen dauert unter 2 Minuten und braucht keine Anleitung.
- **SC-KM03**: Mit nur einem Kader verhalten sich alle bestehenden E2E-Tests unverändert (keine sichtbare Änderung außer "Neuer Kader" und "Gilt für").
- **SC-KM04**: Kader-Seite und Aushilfe-Auswahl erfüllen Kontrastmatrix beider Themes und axe-core ohne Verstöße; iPhone SE ohne waagrechtes Scrollen.

## Assumptions

- Ein Handy betreut meist zwei bis drei Mannschaften; zwei bis drei Kader genügen. Keine Obergrenze nötig, Gestaltung für bis zu 4 Kader.
- Keine neue Laufzeit-Abhängigkeit; Speicherung in der bestehenden IndexedDB (Schema-Erweiterung mit Migration).
- Die Kader-Sortierung (Spec 013) gilt in jedem Kader unverändert.
- Synchronisation von Kadern zwischen Handys ist nicht Teil dieser Spec; sie folgt mit dem Trainer-Paket (Roadmap B1). Bis dahin teilt man einen Kader über "Kader teilen" und "Liste einfügen".
