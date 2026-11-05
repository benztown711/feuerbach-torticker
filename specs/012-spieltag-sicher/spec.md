# Feature Specification: Spieltag sicher (Koppeln ohne Suchen, Korrekturen, Uhr)

**Feature Branch**: `012-spieltag-sicher` (umgesetzt auf `claude/zealous-meitner-mbtusz`)

**Created**: 2026-11-05

**Status**: Review A erledigt (05.11.2026, S1 bis S5 freigegeben). US1 bis US5 umgesetzt (PR #42), Review B und C offen. Mockup (Review B): https://claude.ai/artifact/2cLae3hhgdkyRPd9JGbP9F Ziel: produktiver Einsatz am Samstag, 07.11.2026 (E1 und E2, WFV-Spieltag 2 × 25 Minuten).

**Input**: Review vom 05.11.2026 (Zweck, UI/UX, Gegenprüfung der Roadmap aus PR #41). Atti: "S1 bis S5 können wir gerne machen, bitte mit kurzen Mockups." Samstag erfassen Atti (E1) und Ivi (E2) auf ihren eigenen Handys; samstags 2 × 25 Minuten, sonntags Leistungsliga 3 × 25 Minuten.

## Ausgangslage

Gesichtet am 05.11.2026 (Durchklicken als neuer Trainer und als Elternteil, iPhone-SE-Format):

- **Koppeln**: Ein Trainerkollege braucht 7 bis 8 Schritte (in WhatsApp kopieren, Torticker öffnen, Mehr, Live-Spieltag, Trainer-Link einfügen, einsetzen, Übernehmen, Ja). Auf "Live-Spieltag" ist ohne Kopplung "Live-Spieltag anlegen" der Hauptknopf; wer dort tippt, legt einen zweiten Spieltag an, den kein Elternteil sieht.
- **Trainer-Link im Browser**: Erneutes Antippen zeigt wieder die Kopier-Anleitung, auch wenn der Browser schon gekoppelt ist. Nach dem Koppeln landet man auf der Verwaltung statt bei "Neues Spiel". Öffnet Android den Link direkt in der installierten App, passt die Anleitung "kopieren und im Torticker einfügen" nicht.
- **Startbildschirm**: Ein ungekoppeltes Handy legt Spiele an, sendet aber still nichts; nichts weist darauf hin.
- **Korrekturen**: Nach dem Schlusspfiff kann kein Tor mehr erfasst werden (FR-021); die Minute eines Tores ist nicht änderbar; ein Pfiff lässt sich nicht zurücknehmen. Ein vergessenes letztes Tor ergibt einen falschen Endstand auf Dashboard und in WhatsApp.
- **Uhr**: Wird der Anpfiff zu spät getippt, laufen Uhr, Pfiff und Dashboard-Minute falsch; es gibt keine Korrektur. "Uhr zurücksetzen" ist entfallen (001, Runde 4) und kommt nicht zurück.
- **Dashboard**: Mannschaften ohne Spiel erscheinen nicht, sobald eine andere Mannschaft spielt. E2-Eltern sehen während des E1-Spiels nichts zu E2.
- **Speicher**: Der Torticker bittet den Browser schon beim Start um dauerhaften Speicher (001 FR-023). Der Vorschlag S4 aus dem Review entfällt deshalb.

## Clarifications

### Session 2026-11-05 (Review A)

- Q: Wer erfasst am Samstag? → A: Atti (E1) und Ivi (E2) auf ihren eigenen Handys. Koppeln ohne Suchen (US1) ist damit Pflicht für Samstag.
- Q: Spielformat? → A: Samstags WFV-Spieltag 2 × 25 Minuten, sonntags Leistungsliga 3 × 25 Minuten. Ein Spiel je Mannschaft und Tag; kein Schnellstart für mehrere Spiele nötig.
- Q: Umfang? → A: S1 bis S5, mit kurzen Mockups. S4 (dauerhafter Speicher) gibt es schon seit 001 FR-023 und entfällt; S1 = US1, S2 = US2 und US3, S5 = US4, S3 = US5.
- Q: Uhr korrigieren schon vor Samstag? → A: Ja.
- Entscheidungen mit Empfehlung, im Mockup zu bestätigen: Pfiff zurücknehmen bis 10 Minuten nach dem Pfiff; Uhr korrigieren in Schritten von einer Minute; die Trainer-Link-Seite koppelt im Browser als Hauptweg, "Link kopieren" bleibt für den Home-Bildschirm.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trainer-Handy koppeln ohne Suchen (Priority: P1)

Ivi bekommt den Trainer-Link in der Trainergruppe. Er tippt ihn an und koppelt mit einem Tipp, oder er öffnet den Torticker und fügt den Link direkt auf dem Startbildschirm ein. Danach steht er bei "Neues Spiel" und sieht, dass sein Handy live sendet. Den Trainer-Link kann er jede Woche wieder antippen; er wirkt dann wie ein Startknopf.

**Why this priority**: Ohne gekoppeltes Handy sehen die E2-Eltern am Samstag nichts. Die heutige Kopplung ist für Kollegen ohne Anleitung kaum zu finden.

**Independent Test**: Frisches Handy, Trainer-Link in der Zwischenablage; Startbildschirm, "Trainer-Link einfügen", "Ja, live senden"; der Startbildschirm zeigt "Live: Unser Spieltag · E1, E2".

**Acceptance Scenarios**:

1. **Given** ein Handy ohne Kopplung, **When** der Startbildschirm öffnet, **Then** steht unter "Neues Spiel" die Karte "Trainer? Füge den Trainer-Link aus der Trainergruppe ein." mit dem Knopf "Trainer-Link einfügen".
2. **Given** die Zwischenablage enthält einen Trainer-Link (z. B. in WhatsApp kopiert), **When** "Trainer-Link einfügen" getippt wird, **Then** fragt die App ohne Einfügefeld "Live senden für Feuerbach E1 und Feuerbach E2?" (Kopplungsfrage aus Spec 006); nach "Ja, live senden" zeigt der Startbildschirm "Neues Spiel" und die Zeile "Live: Unser Spieltag · E1, E2".
3. **Given** die Zwischenablage ist leer, nicht lesbar oder enthält keinen Link, **When** "Trainer-Link einfügen" getippt wird, **Then** öffnet das Einfügefeld (wie unter "Live-Spieltag"); nach dem Koppeln zeigt der Startbildschirm "Neues Spiel".
4. **Given** die Zwischenablage enthält einen Zuschauer-Link, **When** "Trainer-Link einfügen" getippt wird, **Then** öffnet das Dashboard; das Handy wird nicht zum Trainer-Handy (wie 006 US1-S5).
5. **Given** ein gekoppeltes Handy, **Then** fehlt die Karte; unter "Neues Spiel" steht "Live: Unser Spieltag · E1, E2", ein Tipp darauf öffnet "Live-Spieltag". Wurde der Live-Spieltag neu ausgestellt, erscheint wieder die Karte, mit dem Satz "„Unser Spieltag“ wurde neu ausgestellt. Füge den neuen Trainer-Link ein."
6. **Given** "Mehr" → "Live-Spieltag" ohne Kopplung, **Then** ist "Trainer-Link einfügen" der Hauptknopf; "Live-Spieltag anlegen" steht darunter als Zweitknopf mit dem Hinweis "Nur einmal für alle Mannschaften. Gibt es schon einen, füge den Trainer-Link ein."
7. **Given** der Trainer-Link wird im Browser angetippt und dieser Browser ist schon mit diesem Live-Spieltag gekoppelt, **Then** öffnet direkt der Startbildschirm mit "Neues Spiel".
8. **Given** der Trainer-Link wird im Browser angetippt und dieser Browser ist nicht damit gekoppelt, **Then** ist "Koppeln und loslegen" der Hauptknopf; nach "Ja, live senden" öffnet der Startbildschirm. Darunter steht "Torticker schon auf dem Home-Bildschirm? Dann den Link kopieren und dort einfügen." mit "Link kopieren".
9. **Given** die Seite des Trainer-Links läuft in der installierten App (z. B. Android öffnet den Link direkt dort), **Then** fehlen Anleitung und "Link kopieren"; es bleibt "Koppeln und loslegen".

---

### User Story 2 - Vergessenes Tor nachtragen, Minute ändern (Priority: P1)

Nach dem Schlusspfiff fällt auf, dass das 3:2 in der 48. Minute fehlt. Der Trainer trägt es mit Minute nach; Endstand, Torliste, Teilen-Text und Dashboard stimmen danach. Ein Tor mit falscher Minute korrigiert er in der Torliste.

**Why this priority**: Häufigster Fehler am Spielfeldrand; heute bleibt der Endstand dann falsch.

**Independent Test**: Spiel 2 × 25 mit Toren in 10' und 40', Schlusspfiff; "Tor nachtragen" für Feuerbach in 48'; Stand, Torliste und Teilen-Text zeigen das Tor.

**Acceptance Scenarios**:

1. **Given** das Spiel ist abgepfiffen und ein Tor fehlt, **When** im "…"-Menü "Tor nachtragen" gewählt, die Mannschaft "Feuerbach E1" und die Minute "48'" gewählt und "Eintragen" getippt wird, **Then** zählt das Tor, steht in der Torliste an der richtigen Stelle mit dem Stand danach, und "Ergebnis teilen" sowie das Dashboard zeigen den neuen Endstand.
2. **Given** ein laufendes Spiel in der 2. Halbzeit mit Toren in 5' und 20', **When** ein Gegentor für 12' nachgetragen wird, **Then** steht es zwischen den beiden Toren, die Stände in der Torliste stimmen und der Halbzeitstand (Spieldetails, Teilen-Text) enthält das Tor.
3. **Given** ein eigenes Tor wird nachgetragen und der Kader ist angelegt, **Then** öffnet danach die Torschützen-Auswahl ohne Countdown.
4. **Given** die Minutenauswahl, **Then** bietet sie nur bereits gespielte Minuten an, einschließlich gespielter Nachspielminuten (z. B. "25+2'"); vorgewählt ist die aktuelle Minute, in der Pause und nach dem Schlusspfiff die letzte gespielte.
5. **Given** ein Tor in der Torliste, **When** es angetippt, "Minute ändern" gewählt und 17' statt 15' gesetzt wird, **Then** zeigt die Liste 17' und ordnet das Tor neu ein; Torschütze, Vorlage und Elfmeter-Kennzeichen bleiben.
6. **Given** vor dem ersten Anpfiff, **Then** fehlt "Tor nachtragen" im "…"-Menü.
7. **Given** ein Tor wird nachgetragen oder seine Minute geändert, **Then** bleibt die Uhr unverändert.
8. **Given** ein Tor der 1. Halbzeit wird in der 2. Halbzeit entfernt oder wiederhergestellt, **Then** folgt der Halbzeitstand (Spieldetails, Teilen-Text).

---

### User Story 3 - Pfiff zurücknehmen (Priority: P2)

Ein Pausen- oder Schlusspfiff wurde zu früh getippt. Der Trainer nimmt ihn zurück; die Uhr läuft weiter, als hätte er nie gepfiffen.

**Why this priority**: Selten, dank Rückfrage, aber ohne Ausweg blieben Uhr, Signal und Dashboard bis zum Spielende falsch.

**Independent Test**: Spiel 2 × 25, in 18' "Pausenpfiff" bestätigen, im "…"-Menü "Pausenpfiff zurücknehmen" bestätigen; die Uhr zeigt die Zeit seit dem Anpfiff.

**Acceptance Scenarios**:

1. **Given** in Minute 18 wurde versehentlich "Pausenpfiff" bestätigt, **When** eine Minute später im "…"-Menü "Pausenpfiff zurücknehmen" gewählt und "Zurücknehmen" bestätigt wird, **Then** läuft die 1. Halbzeit weiter und die Uhr zeigt 19' (Zeit seit dem Anpfiff, als wäre nicht gepfiffen worden).
2. **Given** der Schlusspfiff kam vor 3 Minuten, **When** "Schlusspfiff zurücknehmen" bestätigt wird, **Then** läuft die Uhr in der Nachspielzeit weiter (z. B. "50+4'"), die Tor-Knöpfe sind wieder aktiv und das Dashboard zeigt wieder die laufende Minute statt "Ende".
3. **Given** seit dem Pfiff sind mehr als 10 Minuten vergangen oder der nächste Abschnitt ist angepfiffen, **Then** fehlt der Eintrag.
4. **Given** nach dem Schlusspfiff wurde Verlängerung oder Elfmeterschießen gewählt (Spec 003), **Then** fehlt der Eintrag.
5. **Given** die Rückfrage, **Then** lautet sie "Schlusspfiff zurücknehmen?" bzw. "Pausenpfiff zurücknehmen?" mit "Die Uhr läuft weiter, als wäre nicht gepfiffen worden." und "Zurücknehmen".

---

### User Story 4 - Uhr korrigieren (Priority: P2)

Der Anpfiff wurde zwei Minuten zu spät getippt. Der Trainer stellt die Spielminute im "…"-Menü mit "+1 Min" richtig; Restzeit, Pfiff am Abschnittsende, Tor-Minuten und Dashboard folgen.

**Why this priority**: Am Spielfeldrand häufig (Kinder ordnen, Anpfiff verpasst); ohne Korrektur kommt der Pfiff zur falschen Zeit.

**Independent Test**: Anpfiff, nach 10 Minuten ein Tor, "Uhr korrigieren" zweimal "+1 Min", "Übernehmen"; Uhr und Tor zeigen zwei Minuten mehr.

**Acceptance Scenarios**:

1. **Given** die Uhr zeigt 10', richtig wäre 12', **When** im "…"-Menü "Uhr korrigieren" gewählt, zweimal "+1 Min" und "Übernehmen" getippt wird, **Then** zeigt die Uhr 12' (Restzeit zwei Minuten weniger) und das Dashboard mit der nächsten Meldung ebenfalls.
2. **Given** in diesem Abschnitt wurde ein Tor in 5' erfasst, **When** die Uhr um zwei Minuten vorgestellt wird, **Then** steht das Tor bei 7'; Tore, Karten, Wechsel und Lesezeichen früherer Abschnitte bleiben unverändert.
3. **Given** die Uhr geht eine Minute vor und der Pfiff zum Abschnittsende kam deshalb zu früh, **When** "−1 Min" und "Übernehmen" getippt werden, **Then** zeigt die Uhr eine Minute weniger und der Pfiff kommt zur korrigierten Zeit erneut.
4. **Given** die Korrektur würde vor den Beginn des Abschnitts, hinter die erste Unterbrechung des Abschnitts oder vor das Ende des vorigen Abschnitts reichen, **Then** sind "−1 Min" bzw. "+1 Min" nicht wählbar.
5. **Given** vor dem Anpfiff, in der Pause oder nach dem Schlusspfiff, **Then** fehlt "Uhr korrigieren".

---

### User Story 5 - Dashboard zeigt jede Mannschaft (Priority: P2)

Spielt E1 schon und E2 noch nicht, sehen die E2-Eltern auf dem Dashboard, dass E2 heute noch kein Spiel hat, statt gar nichts.

**Why this priority**: Kleine Änderung, nimmt den Eltern die Unsicherheit "geht der Link überhaupt?".

**Independent Test**: Live-Spieltag mit E1 und E2, nur E1 sendet ein laufendes Spiel; Dashboard zeigt die E1-Karte und darunter "Feuerbach E2 · heute noch kein Spiel".

**Acceptance Scenarios**:

1. **Given** E1 spielt und E2 hat heute kein Spiel und keine Karte, **When** ein Elternteil das Dashboard öffnet, **Then** steht unter den Karten die Zeile "Feuerbach E2 · heute noch kein Spiel".
2. **Given** E2 legt ein Spiel an, **Then** ersetzt die E2-Karte ("noch nicht angepfiffen") die Zeile.
3. **Given** heute hat keine Mannschaft ein Spiel, **Then** bleibt es bei "Heute noch kein Spiel live" mit den Mannschaften (006 US3-S5).

---

### Edge Cases

- **iPhone ohne Home-Bildschirm-App**: Wer im Browser koppelt (US1-S8), erfasst auch dort. Safari löscht die Daten nach einigen Tagen ohne Besuch; erneutes Antippen des Trainer-Links koppelt dann einfach wieder (US1-S8). Auf dem iPhone SE ist der sichtbare Bereich in Safari kleiner; der Spielbildschirm kann dort scrollen.
- **Torticker auf dem Home-Bildschirm und im Browser gekoppelt**: Beide senden für die Mannschaft, je nachdem wo erfasst wird. Erfassen beide dasselbe Spiel, greift 006 US6 (Spiel übernehmen).
- **Zwischenablage**: iOS zeigt beim Lesen die Schaltfläche "Einsetzen", Android fragt einmal um Erlaubnis, manche Browser können sie nicht lesen; dann öffnet das Einfügefeld (US1-S3). Gelesen wird nur nach dem Tipp auf "Trainer-Link einfügen"; der Inhalt wird nur auf dem Handy geprüft.
- **Elfmeterschießen**: Während eines Elfmeterschießens und danach fehlt "Tor nachtragen"; Tore der regulären Spielzeit werden über die Torliste korrigiert (Entfernen, Minute ändern).
- **Verlängerung (Spec 003)**: Die Minutenauswahl enthält die gespielten Minuten der Verlängerung; "Pfiff zurücknehmen" gilt auch für die Abschnitte der Verlängerung, solange danach nichts anderes gewählt wurde.
- **Unentschieden bestätigt (FR-P01)**: Wird der Schlusspfiff zurückgenommen, fragt die App nach dem nächsten Schlusspfiff erneut.
- **Korrektur auf einem Handy, das nicht mehr sendet** (Spiel übernommen, 006 US6): wirkt nur lokal, wie jede andere Änderung.
- **Uhr korrigieren bei angehaltener Uhr**: erlaubt; die korrigierte Minute gilt sofort, die Uhr bleibt angehalten.
- **Spiel übernehmen (006 US6)**: Ein übernommenes Spiel lässt sich wie jedes andere korrigieren.

## Requirements *(mandatory)*

### Functional Requirements

**Koppeln ohne Suchen (US1)**

- **FR-S01**: Der Startbildschirm MUSS ohne Kopplung oder bei neu ausgestelltem Live-Spieltag unter "Neues Spiel" eine Karte mit "Trainer? Füge den Trainer-Link aus der Trainergruppe ein." (bzw. dem Satz zum Neu-Ausstellen) und dem Knopf "Trainer-Link einfügen" zeigen. Ein Handy, das nur einen Zuschauer-Link kennt, zeigt die Karte ebenfalls.
- **FR-S02**: "Trainer-Link einfügen" MUSS zuerst die Zwischenablage lesen (nur nach diesem Tipp). Enthält sie einen gültigen Trainer- oder Lead-Link, folgt die Kopplungsfrage aus Spec 006; ein Zuschauer-Link öffnet das Dashboard; sonst öffnet das Einfügefeld.
- **FR-S03**: Nach dem Koppeln über den Startbildschirm oder über die Seite des Trainer-Links MUSS der Startbildschirm erscheinen. Koppeln unter "Live-Spieltag" bleibt dort.
- **FR-S04**: Ein gekoppeltes Handy MUSS auf dem Startbildschirm unter "Neues Spiel" "Live: <Titel> · <Mannschaften>" zeigen (Kurzformen wie auf den Mannschafts-Chips); ein Tipp öffnet "Live-Spieltag".
- **FR-S05**: "Live-Spieltag" ohne Kopplung MUSS "Trainer-Link einfügen" als Hauptknopf vor "Live-Spieltag anlegen" (Zweitknopf mit Hinweis aus US1-S6) zeigen.
- **FR-S06**: Die Seite des Trainer-Links MUSS bei bestehender Kopplung mit demselben Live-Spieltag und demselben Trainer-Link direkt zum Startbildschirm weiterleiten; sonst "Koppeln und loslegen" als Hauptknopf und "Link kopieren" als Zweitknopf zeigen. In der installierten App (Anzeige als eigenständige App) entfallen Anleitung und "Link kopieren". Für Lead-Links (erste Version) gilt dasselbe.

**Korrekturen (US2, US3)**

- **FR-S10**: Das "…"-Menü MUSS ab dem ersten Anpfiff "Tor nachtragen" anbieten (nicht bei begonnenem Elfmeterschießen). Das Blatt zeigt die beiden Mannschaften als Auswahl, die Minutenauswahl und "Eintragen". Ein eigenes Tor öffnet danach bei vorhandenem Kader die Torschützen-Auswahl ohne Countdown.
- **FR-S11**: Die Minutenauswahl MUSS genau die bereits gespielten Minuten anbieten: je Abschnitt die angefangenen Minuten bis zum Abschnittsende bzw. bis jetzt, dazu gespielte Nachspielminuten ("25+1'"). Vorauswahl: aktuelle Minute, sonst die letzte gespielte.
- **FR-S12**: Das Tor-Blatt (Tipp auf ein Tor) MUSS "Minute ändern" mit derselben Auswahl anbieten; Torschütze, Vorlage und Kennzeichen bleiben.
- **FR-S13**: Tore MÜSSEN in Torliste, Spieldetails, Teilen-Text und Dashboard nach Spielzeit geordnet sein. Ein nachgetragenes oder verschobenes Tor erhält als Uhrzeit den Zeitpunkt im Spielverlauf, zu dem die Uhr diese Minute zeigte (Mitte der Minute, höchstens das Abschnittsende).
- **FR-S14**: Halbzeitstand und Endstand MÜSSEN jeder Tor-Korrektur folgen (Nachtragen, Minute ändern, Entfernen, Wiederherstellen).
- **FR-S15**: Das "…"-Menü MUSS in der Pause bzw. nach dem Schlusspfiff "Pausenpfiff zurücknehmen" bzw. "Schlusspfiff zurücknehmen" anbieten, solange der Pfiff das letzte Uhr-Ereignis ist, höchstens 10 Minuten nach dem Pfiff, und nicht nach Wahl von Verlängerung oder Elfmeterschießen. Nach der Rückfrage (US3-S5) entfällt der Pfiff: Die Uhr läuft weiter, als wäre nicht gepfiffen worden; Halbzeit- bzw. Endstand und "Unentschieden bestätigt" werden zurückgesetzt.

**Uhr (US4)**

- **FR-S20**: Das "…"-Menü MUSS bei laufender oder angehaltener Uhr "Uhr korrigieren" anbieten. Das Blatt zeigt die Spielminute groß mit "−1 Min" und "+1 Min" und "Übernehmen".
- **FR-S21**: Die Korrektur MUSS den Anpfiff des laufenden Abschnitts verschieben (Constitution V: weiterhin Berechnung aus Zeitstempeln); erlaubt nur, solange der Anpfiff nach dem vorigen Uhr-Ereignis und vor der ersten Unterbrechung des Abschnitts liegt und die gespielte Zeit nicht negativ wird.
- **FR-S22**: Minuten von Toren, Karten, Wechseln und Lesezeichen des laufenden Abschnitts MÜSSEN aus ihrer Uhrzeit neu berechnet werden; frühere Abschnitte bleiben unverändert.
- **FR-S23**: Signale des laufenden Abschnitts (FR-007), die nach der Korrektur noch nicht erreicht sind, MÜSSEN erneut fällig werden.

**Dashboard (US5)**

- **FR-S30**: Das Dashboard MUSS jede Mannschaft des Live-Spieltags ohne eigene Karte als Zeile "<Mannschaft> · heute noch kein Spiel" unter den Karten zeigen, sobald mindestens eine Karte da ist. Gilt für Eltern und für das Dashboard in der App.

### Key Entities

- Keine neuen Daten. Geändert werden bestehende Felder: Reihenfolge und `at`, `minute`, `stoppage`, `section` von Toren; `at` des Anpfiffs eines Abschnitts; Minuten von Ereignissen; `clockEvents` (letzter Pfiff entfällt); `halfTimeScore`, `finalScore`, `drawSettled`, `signalledThresholds`. Exportformat und Live-Meldung bleiben unverändert.

## Success Criteria *(mandatory)*

- **SC-S01**: Ein frisches Handy ist mit Trainer-Link in der Zwischenablage nach 3 Tipps gekoppelt (Trainer-Link einfügen, Einsetzen bzw. Erlaubnis, Ja, live senden) und steht bei "Neues Spiel".
- **SC-S02**: Ein vergessenes Tor ist nach dem Schlusspfiff mit 4 Tipps nachgetragen ("…", Tor nachtragen, Mannschaft, Eintragen; Minute bei Bedarf).
- **SC-S03**: Domain-Logik (Minutenauswahl, Nachtragen, Pfiff zurücknehmen, Uhr korrigieren) mit 100 % Branch-Coverage.
- **SC-S04**: Spielbildschirm bleibt auf dem iPhone SE ohne Scrollen (FR-033); alle bestehenden E2E-Tests bleiben ohne Änderung an ihren Abläufen grün, außer den Tests, deren Verhalten diese Spec ausdrücklich ändert (Knopfreihenfolge Live-Spieltag, Ziel nach dem Koppeln im Browser).

## Hilfe *(mandatory)*

| Eintrag | Änderung | Quelle |
|---|---|---|
| `trainer-link` "Wie kopple ich das Handy eines Trainers?" | geändert: Startbildschirm "Trainer-Link einfügen" bzw. Link antippen, "Koppeln und loslegen" | 006 US1, 012 US1 |
| `live-anlegen` "Wie richte ich einen Live-Spieltag ein?" | geändert: nur einmal für alle Mannschaften | 006 US1, 012 US1 |
| `tor-nachtragen` "Wie trage ich ein vergessenes Tor nach?" | neu | 012 US2 |
| `tor-minute` "Wie ändere ich die Minute eines Tores?" | neu | 012 US2 |
| `pfiff-zuruecknehmen` "Wie nehme ich einen Pfiff zurück?" | neu | 012 US3 |
| `uhr-korrigieren` "Was tue ich, wenn die Uhr falsch geht?" | neu | 012 US4 |
| `eltern-dashboard` "Wie verfolge ich die Spiele als Elternteil?" | geändert: "heute noch kein Spiel" | 006 US3, 012 US5 |
| `daten-weg` "Warum sind meine Spiele weg?" | geändert: Trainer-Link erneut antippen koppelt wieder | 001 FR-023, 012 US1 |

## Assumptions

- Keine neue Laufzeit-Abhängigkeit; die Zwischenablage ist ein Web-Standard.
- Die Live-Meldung (contracts/live-message.md) trägt schon den ganzen Spielstand (Uhr-Ereignisse, Tore mit Minute); Korrekturen kommen wie jede Änderung aufs Dashboard, auch nach dem Schlusspfiff.
- "Uhr zurücksetzen" bleibt entfallen (001); "Uhr korrigieren" verschiebt nur den Anpfiff des laufenden Abschnitts.
