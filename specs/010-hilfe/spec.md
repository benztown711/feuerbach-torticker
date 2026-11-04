# Feature Specification: Hilfe mit Suche

**Feature Branch**: `010-hilfe`

**Created**: 2026-11-04

**Status**: Umgesetzt (04.11.2026), Review C mit "Merge #32" erteilt. Mockup: https://claude.ai/artifact/TfSS1AHKmfGeD3otJ66P6j Voraussetzung: Constitution 2.1.0 (Prinzip IX, Hilfe ist Teil jeder Funktion).

**Input**: User description: "bitte erstelle eine Hilfe seite in der app mit Suchfunktion und verankere dies in unserem Vorgehensmodell von Open-Spec, dass diese immer aktuell gehalten werden muss"

## Clarifications

### Session 2026-11-04 (Review A)

- Q: Umfang: vollständige Anleitung aller Funktionen oder nur Tipps und Problemlösungen? → A: Vollständige Anleitung als kurze Fragen und Antworten (rund 40 Einträge).
- Q: Kontext-Hilfe ("?" auf einzelnen Bildschirmen)? → A: Für jetzt reicht die Hilfe unter "Mehr". Ein "?" auf einzelnen Bildschirmen kommt später als eigene User Story (Backlog).
- Q: Eltern-Ansicht über den Zuschauer-Link? → A: Ja, ein kleiner Link "Hilfe", der nur die Einträge für Eltern zeigt (FR-H16).
- Q: Strenge der Verankerung? → A: Automatische Prüfung, die den Merge blockiert, plus Constitution-Prinzip IX und Vorlagen.

### Session 2026-11-04 (Review B, Runde 1)

- Q: Themenübersicht mit allen Fragen oder erst nur Themen zum Aufklappen? → A: So lassen (alle Fragen sichtbar).
- Q: Hervorhebung der Fundstellen lesbar? → A: Hell gut, dunkel nicht besonders. → Dunkel kräftiger: Fundstelle auf `rot-tief` mit `on-rot`, hell bleibt `rot-hell` mit `ink` (FR-H06).
- Q: Fällt der Link "Hilfe" im Eltern-Dashboard genug auf? → A: Nein. Lieber eine Navigationsleiste wie in der App, z. B. mit "Link zum Dashboard teilen" und "Hilfe". → Eltern-Leiste "Spieltag", "Teilen", "Hilfe" (FR-H16, FR-H17).

### Session 2026-11-04 (Umsetzung)

- Befund: Während der Umsetzung wurde parallel Spec 009 "Vorlagen" gemergt; die Hilfe-Spec wurde deshalb von 009 auf 010 umbenannt. Die Prüfung hatte die doppelte Nummer nur indirekt gezeigt (eine Spec überdeckte die andere). → FR-H21 (d): doppelt vergebene Spec-Nummern fallen direkt auf.
- Befund: Spec 003 Teil 4 ("ein Knopf je Schalter") und Spec 008 (Signalton) kamen parallel auf `main`; die betroffenen Einträge (Karten, Wechsel, Lesezeichen, Signalton) und die neuen Einträge zu Vorlagen (Spec 009) sind im selben PR nachgezogen (Prinzip IX).

## Ausgangslage

Die heutige Hilfe (Spec 001, T086) besteht aus vier festen Absätzen mit iPhone-Tipps (Home-Bildschirm, Ton, Sicherung, Datenschutz). Seitdem sind Ereignisse, Pokal, Meine Mannschaften, Teilen als Anzeigetafel und Live-Spieltag dazugekommen, ohne dass die Hilfe mitgewachsen ist (Beispiel: Aufgabe L040 "Hilfe-Text Live-Spieltag" in Spec 006 ist noch offen). Diese Spec ersetzt die Hilfe-Seite aus T086 und schließt L040 ein.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Antwort per Suche finden (Priority: P1)

Ein Trainer steht am Spielfeldrand und fragt sich, warum kein Pfiff kommt. Er öffnet "Mehr" → "Hilfe", tippt "pfiff" und sieht sofort den passenden Eintrag, ohne lange zu blättern.

**Why this priority**: Hilfe wird unter Zeitdruck gebraucht. Ohne Suche müsste man eine wachsende Liste durchscrollen.

**Independent Test**: Hilfe öffnen, Suchbegriffe eintippen, prüfen, welche Einträge übrig bleiben und in welcher Reihenfolge.

**Acceptance Scenarios**:

1. **Given** die Hilfe ist offen, **When** der Nutzer "pfiff" tippt, **Then** erscheint der Eintrag "Warum höre ich keinen Pfiff?" ganz oben, ohne dass er die Suche absenden muss.
2. **Given** die Hilfe ist offen, **When** der Nutzer "ELFMETER", "elfmeter" oder "Elf" tippt, **Then** sind die Treffer jeweils dieselben (Groß- und Kleinschreibung egal, Wortanfang genügt).
3. **Given** die Hilfe ist offen, **When** der Nutzer "Torschuetze" oder "torschütze" tippt, **Then** findet er den Eintrag "Wie trage ich den Torschützen nach?" (ae/ä, oe/ö, ue/ü, ss/ß gelten als gleich).
4. **Given** die Hilfe ist offen, **When** der Nutzer "Backup" tippt (ein Wort, das im Text nicht vorkommt), **Then** findet er den Eintrag zur Sicherung, weil "Backup" als Suchbegriff hinterlegt ist.
5. **Given** die Hilfe ist offen, **When** der Nutzer "tor löschen" tippt, **Then** erscheinen nur Einträge, die beide Wörter enthalten, und "Wie entferne ich ein Tor?" steht oben.
6. **Given** eine Suche mit Treffern, **Then** sind die gefundenen Wörter in Titel und Textauszug hervorgehoben.
7. **Given** die Hilfe ist offen, **When** der Nutzer "xyz" tippt, **Then** steht dort "Nichts gefunden zu „xyz“" mit dem Knopf "Alle Themen anzeigen", der die Suche leert.
8. **Given** eine Suche mit Treffern, **When** der Nutzer einen Eintrag öffnet und mit der Zurück-Geste zurückgeht, **Then** stehen Suchbegriff und Trefferliste noch da.
9. **Given** das Handy ist offline, **When** der Nutzer sucht, **Then** funktioniert die Suche genauso.

---

### User Story 2 - Die Hilfe erklärt alle Funktionen (Priority: P1)

Ein neuer Trainer (oder ein Elternteil mit dem Dashboard-Link) bekommt den Torticker empfohlen. Die Hilfe erklärt ihm in kurzen Fragen und Antworten alles, was die App kann, gegliedert nach Themen.

**Why this priority**: Die Suche ist nur so gut wie der Inhalt. Die App hat inzwischen viele Funktionen, die nirgends erklärt sind.

**Independent Test**: Hilfe ohne Suchbegriff öffnen, Themen und Einträge durchgehen, einen Eintrag öffnen.

**Acceptance Scenarios**:

1. **Given** die Hilfe ist offen und das Suchfeld leer, **Then** stehen die Einträge gruppiert unter den Themen aus FR-H08 in dieser Reihenfolge, jeder Eintrag als Frage formuliert.
2. **Given** die Themenübersicht, **When** der Nutzer "Wie erfasse ich ein Tor?" antippt, **Then** öffnet sich der Eintrag mit kurzer Antwort und, wo sinnvoll, nummerierten Schritten, die die Knopf-Beschriftungen der App wörtlich nennen.
3. **Given** ein geöffneter Eintrag zu einer Funktion mit eigenem Bildschirm (z. B. Sicherung), **Then** gibt es einen Knopf "{Bereich} öffnen", der direkt dorthin führt (z. B. "Einstellungen öffnen").
4. **Given** ein geöffneter Eintrag, **Then** stehen darunter bis zu drei verwandte Einträge ("Siehe auch").
5. **Given** die Hilfe, **Then** steht ganz unten "Stand: Version {x.y.z}" mit der installierten App-Version.
6. **Given** ein Elternteil hat das Dashboard über den Zuschauer-Link offen, **Then** steht unten eine Leiste mit "Spieltag" (markiert), "Teilen" und "Hilfe".
7. **Given** die Eltern-Leiste, **When** das Elternteil auf "Hilfe" tippt, **Then** erscheint die Hilfe nur mit den Einträgen für Eltern (z. B. "Wie lege ich den Spieltag auf den Home-Bildschirm?", "Was bedeutet „Keine Verbindung“?"), mit Suchfeld; "Hilfe" ist markiert, und "Spieltag" führt ohne Neuladen zum Dashboard zurück.
8. **Given** die Eltern-Leiste, **When** das Elternteil auf "Teilen" tippt, **Then** öffnet sich das Teilen-Menü des Handys mit dem Text "Unser Spieltag live (Sportvg Feuerbach E1 und E2). Der Link gilt die ganze Saison: {Zuschauer-Link}" (Titel und Mannschaften des Spieltags); ohne Teilen-Menü wird der Link kopiert und "Link kopiert." angezeigt.

---

### User Story 3 - Die Hilfe bleibt automatisch aktuell (Priority: P1)

Atti merged eine neue Funktion. Er kann sich darauf verlassen, dass die Hilfe sie im selben Pull Request erklärt, ohne selbst daran denken zu müssen. Fehlt der Eintrag, bleibt die CI rot.

**Why this priority**: Ausdrücklicher Wunsch ("immer aktuell"). Eine Hilfe, die hinterherhinkt, schadet mehr als keine.

**Independent Test**: In einem Test-Branch eine umgesetzte User Story ohne Hilfe-Eintrag simulieren und prüfen, dass die Prüfung fehlschlägt und die fehlende Story nennt.

**Acceptance Scenarios**:

1. **Given** eine User Story hat Akzeptanztests mit ihrer ID (z. B. "006 US3-S1"), **When** kein Hilfe-Eintrag sie als Quelle nennt, **Then** schlägt die Prüfung "Hilfe-Abdeckung" fehl und nennt die Story ("006 US3 ohne Hilfe-Eintrag").
2. **Given** ein Hilfe-Eintrag nennt die Quelle "003 US9", **When** es diese User Story in Spec 003 nicht gibt, **Then** schlägt die Prüfung fehl ("Quelle 003 US9 existiert nicht").
3. **Given** zwei Einträge mit derselben ID oder ein Eintrag ohne Titel, Antwort oder Quelle, **Then** schlägt die Prüfung fehl.
4. **Given** alle umgesetzten User Stories sind abgedeckt und alle Quellen existieren, **Then** ist die Prüfung grün.

---

### Edge Cases

- Ein einzelner Buchstabe filtert noch nicht; ab zwei Zeichen wird gesucht (sonst passt fast alles).
- Satzzeichen, Anführungszeichen und Emojis in der Eingabe werden ignoriert; Eingaben über 60 Zeichen werden abgeschnitten.
- Füllwörter wie "wie", "ich", "ein", "der" zählen nicht als Suchwort, damit "wie lösche ich ein tor" funktioniert.
- Die Hilfe ist auch während eines laufenden Spiels erreichbar; "Spiel" in der Leiste zeigt weiter "Läuft …" und führt zurück (FR-037).
- Ein Eintrag kann über seine Adresse direkt geöffnet werden; eine unbekannte Adresse zeigt die Themenübersicht.
- Funktionen, die noch in Arbeit sind (z. B. Signalton, Spec 008), bekommen ihren Eintrag in dem Pull Request, der sie fertigstellt (Prinzip IX).
- Der Suchbegriff wird weder gespeichert noch übertragen.
- Bricht das Elternteil das Teilen-Menü ab, passiert nichts (keine Meldung).
- Die Eltern-Leiste erscheint auch, wenn noch kein Spiel live ist ("Heute noch kein Spiel live").

## Requirements *(mandatory)*

### Functional Requirements

**Suche (US1)**

- **FR-H01**: Oben auf der Hilfe-Seite MUSS ein Suchfeld "Hilfe durchsuchen" stehen. Die Trefferliste MUSS sich bei jeder Eingabe sofort aktualisieren, ohne Absenden. Ein Knopf im Feld leert die Suche.
- **FR-H02**: Die Suche MUSS Groß- und Kleinschreibung ignorieren, ä/ae, ö/oe, ü/ue, ß/ss gleich behandeln und Wortanfänge finden ("Elf" findet "Elfmeterschießen"); ab vier Buchstaben auch innerhalb zusammengesetzter Wörter ("pfiff" findet "Pausenpfiff").
- **FR-H03**: Bei mehreren Suchwörtern MÜSSEN alle in einem Eintrag vorkommen (in Titel, Antwort oder hinterlegten Suchbegriffen). Füllwörter (siehe Edge Cases) zählen nicht.
- **FR-H04**: Jeder Eintrag MUSS zusätzliche Suchbegriffe haben können, die nicht im Text stehen (Alltagswörter, z. B. "Backup", "WhatsApp", "Pfeife", "löschen").
- **FR-H05**: Treffer MÜSSEN so sortiert sein: zuerst Treffer im Titel, dann in den Suchbegriffen, dann nur in der Antwort; bei Gleichstand in der Reihenfolge der Themenübersicht.
- **FR-H06**: Jeder Treffer MUSS Titel und einen kurzen Textauszug zeigen; gefundene Wörter MÜSSEN hervorgehoben sein, fett und farbig hinterlegt mit mindestens 4,5:1 Kontrast in beiden Themes (hell `rot-hell` mit `ink`, dunkel `rot-tief` mit `on-rot`).
- **FR-H07**: Ohne Treffer MUSS "Nichts gefunden zu „{Eingabe}“" und der Knopf "Alle Themen anzeigen" erscheinen.

**Inhalt (US2)**

- **FR-H08**: Die Hilfe MUSS ohne Suchbegriff alle Einträge nach Themen gruppiert zeigen, in dieser Reihenfolge: "Erste Schritte", "Spiel erfassen", "Torschützen und Ereignisse", "Pokal", "Teilen", "Mannschaften und Kader", "Historie", "Live-Spieltag", "Einstellungen und Sicherung", "Probleme lösen", "Datenschutz".
- **FR-H09**: Jeder Eintrag MUSS eine Frage als Titel und eine kurze Antwort (höchstens etwa 600 Zeichen) haben, optional nummerierte Schritte. Knopf- und Menübezeichnungen MÜSSEN wörtlich wie in der App lauten. Es kommen nur fiktive Namen vor (Max, Ben, Tom, Leo, Maxi, Paul).
- **FR-H10**: Ein Eintrag zu einer Funktion mit eigenem Bildschirm MUSS einen Knopf "{Bereich} öffnen" haben (z. B. "Einstellungen öffnen"), der dorthin führt. In der Eltern-Hilfe entfällt er.
- **FR-H11**: Ein geöffneter Eintrag MUSS bis zu drei verwandte Einträge anbieten ("Siehe auch").
- **FR-H12**: Jeder Eintrag MUSS eine eigene Adresse haben (Zurück-Geste führt zur Liste mit erhaltenem Suchbegriff).
- **FR-H13**: Unten auf der Hilfe-Seite MUSS "Stand: Version {x.y.z}" stehen.
- **FR-H14**: Hilfe und Suche MÜSSEN offline funktionieren und dürfen keine Netzanfrage auslösen (Constitution II, III).
- **FR-H15**: Der Eintrag "Hilfe" unter "Mehr" MUSS den Untertitel "Suchen, Anleitungen, Tipps" tragen.
- **FR-H16**: Die Eltern-Ansicht über den Zuschauer-Link (Spec 006 US3) MUSS unten eine Navigationsleiste mit genau drei Einträgen haben, gestaltet wie die Leiste der App (FR-037): "Spieltag" (Dashboard), "Teilen" und "Hilfe". "Hilfe" zeigt nur die Einträge, die für Eltern gekennzeichnet sind, mit derselben Suche; "Spieltag" führt ohne Neuladen zurück. Der Zuschauer-Link bleibt dabei erhalten. Der Hinweis "Zum Torticker" (Spec 006) bleibt unten auf der Dashboard-Seite.
- **FR-H17**: "Teilen" in der Eltern-Leiste MUSS das Teilen-Menü des Handys mit dem Zuschauer-Link und einem kurzen Text öffnen (FR-H16, Szenario US2-8); ohne Teilen-Menü MUSS der Link in die Zwischenablage kopiert werden. Geteilt wird nur der Link, den das Elternteil bereits hat; es entstehen keine neuen Rechte.

**Aktualität (US3)**

- **FR-H20**: Jeder Eintrag MUSS mindestens eine Quelle nennen: Spec-Nummer und User Story (z. B. "006 US3") oder, für Querschnittsthemen, eine Anforderung (z. B. "001 FR-036"). Quellen sind für Nutzer unsichtbar und nicht durchsuchbar.
- **FR-H21**: Eine automatische Prüfung "Hilfe-Abdeckung" MUSS bei jedem Pull Request laufen und den Merge blockieren, wenn
  (a) eine umgesetzte User Story von keinem Eintrag als Quelle genannt wird. Als umgesetzt gilt eine User Story, sobald es einen Akzeptanztest mit ihrer ID gibt (Tests ohne Spec-Nummer gehören zu Spec 001);
  (b) eine Quelle auf eine User Story oder Anforderung verweist, die es in der Spec nicht (mehr) gibt;
  (c) eine Eintrags-ID doppelt vorkommt oder Titel, Antwort, Thema oder Quelle fehlen;
  (d) eine Spec-Nummer doppelt vergeben ist (zwei Ordner `specs/NNN-…`).
- **FR-H22**: Die Meldung der Prüfung MUSS jede Lücke einzeln mit Spec-Nummer und User Story bzw. Eintrags-ID nennen.

### Key Entities

- **Hilfe-Eintrag**: ID (für die Adresse), Thema, Titel (Frage), Antwort, optionale Schritte, Suchbegriffe, Quellen (Spec + User Story oder FR), Kennzeichen "für Eltern", optionales Ziel für "Öffnen", optionale verwandte Einträge.
- **Thema**: Name und Reihenfolge laut FR-H08.

Keine Spieldaten betroffen; die Einträge werden mit der App ausgeliefert und nicht auf dem Gerät gespeichert.

## Hilfe *(mandatory)*

Neue Einträge: der komplette Grundbestand nach FR-H08, Quellen sind alle umgesetzten User Stories der Specs 001, 003, 004, 005 und 006 (Stand 04.11.2026: 001 US1 bis US7, 003 US1 bis US6, 004 US1 bis US3, 005 US1 bis US5, 006 US1 bis US3), nachgezogen beim Merge: 008 US1 (Signalton), 009 US1 bis US4 (Vorlagen), 003 Teil 4 (ein Knopf je Schalter), 006 US6 (Spiel übernehmen) sowie die iPhone-Hinweise der bisherigen Hilfe (001 FR-036, FR-039, Sicherung, Datenschutz). Für Eltern gekennzeichnet (FR-H16): Dashboard lesen, auf den Home-Bildschirm legen, mit Familie und Freunden teilen (Quelle 010 FR-H16), "Keine Verbindung", Datenschutz (Quelle 006 US3). Die bisherige Hilfe-Seite (T086) wird ersetzt, Aufgabe L040 aus Spec 006 erledigt sich damit.

## Verankerung im Vorgehensmodell

Damit die Hilfe aktuell bleibt, ändert diese Spec den Ablauf (im selben Pull Request wie die Spec, zur Freigabe in Review A):

| Ort | Änderung |
|---|---|
| `.specify/memory/constitution.md` | Neues Prinzip IX "Hilfe ist Teil jeder Funktion", Version 2.1.0 (MINOR, Prinzip ergänzt) |
| `CLAUDE.md` | Schritt 2 (Spec nennt betroffene Hilfe-Einträge), Schritt 7 (Hilfe im selben PR), Qualitätstor "Hilfe-Abdeckung", Regel: auch kleine Änderungen pflegen die Hilfe |
| Spec-Vorlage (`.specify/templates/overrides/spec-template.md`) | Pflichtabschnitt "Hilfe": welche Einträge kommen neu dazu, ändern sich oder entfallen |
| Aufgaben-Vorlage (`.specify/templates/overrides/tasks-template.md`) | Pflichtaufgabe je User Story: Hilfe-Eintrag mit Quelle anlegen oder ändern |
| PR-Vorlage | Checkbox "Hilfe aktualisiert (Einträge: …) oder keine sichtbare Änderung" |
| CI | Prüfung "Hilfe-Abdeckung" (FR-H21) als Teil der Unit-Tests, ab Umsetzung dieser Spec |

Die Vorlagen liegen unter `overrides/`, damit ein Update von Spec Kit sie nicht überschreibt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-H01**: Für jede Frage eines festen Fragenkatalogs mit mindestens 15 Alltagsformulierungen (z. B. "kein ton", "tor löschen", "backup", "eltern zuschauen", "elfer", "gelbe karte", "whatsapp") steht der passende Eintrag unter den ersten drei Treffern.
- **SC-H02**: Die Trefferliste aktualisiert sich auf dem iPhone SE nach jedem Buchstaben ohne spürbare Verzögerung (unter 100 ms).
- **SC-H03**: 100 % der umgesetzten User Stories sind von mindestens einem Hilfe-Eintrag abgedeckt (automatisch geprüft, FR-H21).
- **SC-H04**: Hilfe und Suche funktionieren im Flugmodus (Offline-Test).
- **SC-H05**: Kontrast und Bedienbarkeit der Hilfe erfüllen die bestehenden Prüfungen (axe-core ohne Verstöße, Kontrastmatrix hell/dunkel), und das Budget für das Hauptbundle bleibt eingehalten.

## Assumptions

- Mit "Open-Spec" ist unser Spec-Kit-Ablauf gemeint (CLAUDE.md, Constitution).
- Die Hilfe richtet sich an Trainer (Erfassen) und an Eltern; Eltern ohne installierte App erreichen ihre Einträge über die Eltern-Leiste (FR-H16).
- Eltern dürfen den Zuschauer-Link weitergeben (heute per WhatsApp ohnehin möglich). Der Hilfe-Eintrag zum Teilen bittet, ihn nur an Menschen zu geben, die die Kinder kennen. Wird ein Link zu weit gestreut, stellt der Trainer neue Links aus (Spec 006 US5).
- Nur Text und die App-eigenen Symbole, keine Screenshots: Screenshots veralten bei jeder Gestaltungsänderung und belasten Offline-Speicher und Budget.
- Inhalte nur auf Deutsch, Ansprache mit "du" wie in der übrigen App.
- Keine Volltext-Bibliothek: Die Datenmenge (rund 40 Einträge) ist klein genug für eine eigene, einfache Suche (Constitution VI).
- Kein Kontaktformular und kein Link zu fremden Diensten aus der Hilfe heraus.

## Nicht im Umfang

- Kontext-Hilfe ("?" auf einzelnen Bildschirmen, das direkt den passenden Eintrag öffnet): später als eigene User Story (Review A, Frage 2).
- Screenshots oder Videos in der Hilfe.
- Kontaktformular oder Fragen an den Verein aus der App heraus.
