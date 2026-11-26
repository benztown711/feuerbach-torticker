# Feature Specification: Eltern tickern über den Zuschauer-Link

**Feature Branch**: `024-eltern-tickern` (Arbeitszweig `claude/friendly-clarke-7h75g2`)

**Created**: 2026-11-26

**Status**: Klärung, Review A und Review B erledigt (26.11.2026, "Passt, setz es um"). Constitution 3.2.0. US1 bis US5 umgesetzt in PR #100. Mockup: https://claude.ai/artifact/15FC1cxThNZLfUwgZt8r42 (Version 2 mit hervorgehobenen Namen)

**Input**: Atti (26.11.2026): "Gestern hatten wir ein Nachholspiel, das nicht in der Liste war. Ivica und ich waren auf einem anderen Platz mit Training beschäftigt, sodass niemand getickert hat. Jetzt ist die Überlegung, ob wir den Link in der Elterngruppe verteilen, und je nachdem, wer da ist, kann tickern. […] Man sieht in der App hoffentlich, wer schon tickert. […] Ist es möglich, den Zuschauerlink und den Tickerlink in einem zu belassen und über einen Button abzufragen: Möchtest du nur das Ergebnis sehen oder live tickern?"

## Ausgangslage

Gesichtet am 26.11.2026 in Specs und Code:

- **Zwei Stufen heute**: Der Zuschauer-Link (Spec 006 US3) zeigt nur das Dashboard. Der Trainer-Link (Spec 006 US1, Spec 016) darf alles: für alle Mannschaften senden, Spielplan, Mannschaften, Titel, Kader, "Alle Links neu ausstellen". Eine Zwischenstufe gibt es nicht; Spec 006 hat "zusätzliche Helfer-Links je Mannschaft" am 04.11.2026 ausdrücklich verworfen.
- **Wer tickert**: "Ich tickere" (Spec 015 US6) merkt ein Planspiel mit Namen vor, sichtbar nur auf Trainer-Handys, nicht auf dem Dashboard (015 US6-S7). "Spiel übernehmen" (Spec 006 US6) erkennt ein schon übertragenes Spiel derselben Mannschaft und übergibt es mit Stand, Uhr und Toren.
- **Technische Basis**: Die erste Version hatte Lead-Handys je Mannschaft, die senden, aber nichts verwalten durften (Lead-Zertifikat, vom Organisator signiert). Diese Stufe lässt sich als Ticker-Recht für Zuschauer wiederverwenden (Festlegung im Plan).
- **Einstieg spät**: "Spiel läuft schon" (Spec 023) gibt es; Eltern kommen oft erst während des Spiels auf die Idee zu tickern.

## Clarifications

### Session 2026-11-26 (Klärung im Chat)

- Q: Eigener Ticker-Link für Eltern oder ein Link für beides? → A: **Ein Link.** Der Zuschauer-Link darf auch tickern; schon verteilte Zuschauer-Links bekommen das automatisch, ohne neues Teilen. Hebt die Festlegung "keine zusätzlichen Helfer-Links" aus Spec 006 in diesem Punkt auf (es gibt weiter keinen zusätzlichen Link, aber Zuschauer dürfen senden).
- Q: Frage beim Öffnen ("Nur zuschauen oder tickern?")? → A: Nein (Empfehlung angenommen). Der Link öffnet wie heute das Dashboard; das Tickern startet über einen Knopf auf der Karte der Mannschaft.
- Q: Schalter "Eltern dürfen tickern", Vorgabe? → A: **An** (1A), je Mannschaft unter "Für Trainer".
- Q: Torschützen? → A: **Eltern sehen beim Tickern den gesamten Kader** der Mannschaft zum Antippen (2B). Folgerung: Constitution II wird geändert (geteilte Kader sind auch über den Zuschauer-Link lesbar, solange Eltern für diese Mannschaft tickern dürfen).
- Q: Darf ein Elternteil einem Trainer das laufende Spiel abnehmen? → A: **Ja, mit Rückfrage**, der Trainer kann es zurückholen (3A).
- Q: Kommt ein von Eltern getickertes Spiel in die Historie der Trainer? → A: Nicht automatisch (4A), aber **die Trainer-Handys fragen nach dem Schlusspfiff, ob sie es übernehmen möchten** (Präzisierung Atti).

### Folgerungen mit Empfehlung (Review A 26.11.2026: "Passt, a bis d so übernehmen")

- **Name auf dem Dashboard**: ~~Eltern erscheinen mit ihrem Namen ("Tickert: Paul"), Trainer-Handys als "Tickert: Trainer".~~ Geändert in Review B (siehe unten).
- **Vormerkungen** ("Ich tickere", Spec 015) bleiben für Eltern unsichtbar. Gestern hätte eine Vormerkung eines Trainers, der dann nicht kommt, Eltern vom Tickern abgehalten. Sobald jemand wirklich tickert, zeigt die Karte es.
- **Keine Historie für Eltern**: Die Eltern-Ansicht bleibt ohne Historie und ohne Ausgang in die Trainer-App (Spec 020 US5). Das Spiel bleibt auf dem Eltern-Handy gespeichert, bis die Mannschaft ihr nächstes Spiel hat; die dauerhafte Kopie entsteht auf Trainer-Handys (US5).
- **Eltern-Spiele sind immer live**: "Nicht live senden" gibt es beim Tickern über den Zuschauer-Link nicht, das wäre der falsche Weg.

### Session 2026-11-26 (Review B, Mockup)

- Atti: "Den Namen der jeweiligen Person farblich kennzeichnen. Wenn es ein Trainer ist, dann ‚Trainer' und den Namen, diese beiden Wörter farblich highlighten, und dann ‚tickert bereits'. Wenn es Eltern machen, ihr Name ohne den Zusatz, z. B. ‚Babsi tickert bereits'." → Die Zeile heißt "<Name> tickert bereits", bei Trainer-Handys "Trainer <Name> tickert bereits" (ohne hinterlegten Namen "Trainer tickert bereits"), auf dem eigenen Handy "Du tickerst", nach dem Schlusspfiff "Getickert von <Name>" bzw. "Getickert von Trainer <Name>". Der Name (bei Trainern mit dem Wort "Trainer") steht farbig hervorgehoben (Markierung `rot-hell`, Schrift `ink`, fett), auch in Rückfragen ("Paul tickert bereits (1:0, 12'). Übernehmen?").
- Folgerung: Der Name, den Trainer bei "Ich tickere" (Spec 015 US6-S2) hinterlegen, wird auf dem Dashboard für Eltern sichtbar. Die Abfrage heißt deshalb künftig "Dein Name (sehen Trainer und Eltern)"; schon hinterlegte Namen erscheinen ab dem Update. Ersetzt Folgerung a aus Review A.

### Festlegungen bei der Umsetzung (26.11.2026)

- **Startbildschirm (US5-S1)**: Die Frage "In deine Spiele übernehmen?" steht im Bereich der Live-Angebote direkt unter "Neues Spiel" (dort, wo auch "E2 übernehmen" steht, Spec 018), damit der Code nachgeladen bleibt (Bundle-Budget). Sie ist damit auf dem iPhone SE ohne Scrollen sichtbar.
- **Eltern-Fassung des Spielbildschirms**: ohne Vorlagen und Wechsel (beides bräuchte Kader-Kennungen auf dem Eltern-Handy); Karten, Lesezeichen und Torschützen wie bei Trainern. "Spieldetails" entfällt (führt in die Trainer-App), "Teilen" teilt den Stand als Text.
- **Hinweis beim Abgeben (FR-E12)** gilt auch zwischen Trainer-Handys: "Trainer tickert jetzt E2. Hier wird nur noch lokal erfasst." statt bisher "E2 überträgt jetzt ein anderes Handy." (Spec 006 US6-S3), sobald der neue Stand einen Ticker nennt.
- **Übernommenes Eltern-Spiel (US5)** geht vom Trainer-Handy nicht erneut an den Dienst; die Karte bleibt beim Stand der Eltern ("Getickert von Paul").
- **Nach dem Ausschalten (US4-S2)** bekommt das tickernde Eltern-Handy keinen Kader mehr; Tore gehen ohne Torschützen-Auswahl.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ich tickere dieses Spiel (Priority: P1)

Die E2 hat heute um 17:30 ein Spiel aus dem Spielplan, die Trainer sind auf einem anderen Platz. Paul hat den Zuschauer-Link aus der Elterngruppe. Auf der Karte der E2 steht "Ich tickere dieses Spiel". Er tippt darauf, gibt einmal seinen Namen ein und landet auf dem Spielbildschirm. Alle anderen sehen auf der Karte "Paul tickert bereits".

**Why this priority**: Der Kern des Wunsches. Ohne diese Story tickert niemand, wenn kein Trainer am Platz ist.

**Independent Test**: Live-Spieltag mit E2 und einem Planspiel heute 17:30 gegen TSV Musterstadt. Handy P öffnet den Zuschauer-Link, tippt "Ich tickere dieses Spiel", gibt "Paul" ein, tippt "Anpfiff" und ein Tor. Handy Z (Zuschauer) zeigt die Karte E2 mit "1:0" und "Paul tickert bereits".

**Acceptance Scenarios**:

1. **Given** eine Mannschaft mit erlaubtem Tickern, ein Spiel von heute (Planspiel, noch nicht beendet) und niemand tickert, **Then** zeigt ihre Karte auf dem Dashboard den Knopf "Ich tickere dieses Spiel" (mindestens 64 pt hoch), auch zugeklappt.
2. **Given** das Handy hat noch keinen Ticker-Namen, **When** "Ich tickere dieses Spiel" getippt wird, **Then** fragt das Blatt "Wie heißt du?" mit dem Hinweis "Die anderen sehen, dass du tickerst.", einem Feld "Vorname" und "Weiter"; "Weiter" ist erst mit mindestens 2 Zeichen wählbar.
3. **Given** ein Ticker-Name ist gespeichert, **When** "Ich tickere dieses Spiel" getippt wird, **Then** fragt die App "Du tickerst E2 gegen TSV Musterstadt als Paul." mit "Los geht's", "Name ändern" und "Abbrechen".
4. **Given** "Los geht's", **Then** öffnet der Spielbildschirm mit Gegner, Heim/Gast, Trikots und Spielzeit aus dem Spielplan, vor dem Anpfiff, mit "Anpfiff" und "Spiel läuft schon" (Spec 023); das Spiel ist sofort auf dem Dashboard und alle Zuschauer sehen auf der Karte "Paul tickert bereits", schon vor dem Anpfiff.
5. **Given** Paul tickert, **Then** verhält sich der Spielbildschirm wie bei einem Trainer (Tore, Uhr, Pfiffe, Rückgängig, Torschützen, "Teilen") mit diesen Ausnahmen: kein "Nicht live senden", keine Navigation zu Startbildschirm, Historie, Kader oder Einstellungen; statt der Navigation steht "Zurück zu Live".
6. **Given** "Zurück zu Live" während des Spiels, **Then** zeigt das Dashboard die Karte mit "Du tickerst" und dem Knopf "Weiter tickern"; das Spiel läuft weiter.
7. **Given** der Schlusspfiff, **Then** bietet der Spielbildschirm "Ergebnis teilen" und "Zurück zu Live"; die Karte zeigt den Endstand und "Getickert von Paul".
8. **Given** niemand tickert für die Mannschaft, aber ein früheres Spiel von heute ist beendet, **Then** erscheint "Ich tickere dieses Spiel" für das nächste nicht beendete Planspiel von heute; gibt es keins, erscheint der Knopf nicht (siehe US3).

---

### User Story 2 - Sehen, wer tickert, und übernehmen (Priority: P1)

Mama von Ben kommt zehn Minuten später an den Platz und öffnet den Link. Die Karte zeigt "Paul tickert bereits" und den Stand, also weiß sie sofort, dass sie nichts tun muss. Muss Paul gehen, übernimmt sie mit einem Tipp und Rückfrage; Paul sieht, dass sie übernommen hat.

**Why this priority**: Ohne sichtbaren Ticker fangen zwei Eltern gleichzeitig an, und das Dashboard zeigt zwei Spiele.

**Independent Test**: Handy P tickert E2 (1:0, 12'). Handy M öffnet den Zuschauer-Link: Karte E2 zeigt "Paul tickert bereits", kein "Ich tickere dieses Spiel". M klappt die Karte auf, tippt "Spiel übernehmen", bestätigt als "Anna" und erfasst ein Tor. Dashboard zeigt eine Karte mit 2:0 und "Anna tickert bereits", P zeigt "Anna tickert jetzt E2."

**Acceptance Scenarios**:

1. **Given** jemand tickert ein Spiel der Mannschaft, **Then** zeigt die Karte für alle Zuschauer "<Name> tickert bereits" (Eltern) bzw. "Trainer <Name> tickert bereits" (Trainer-Handy; ohne Namen "Trainer tickert bereits"), Name bzw. "Trainer <Name>" farbig hervorgehoben, zugeklappt und aufgeklappt, und keinen Knopf "Ich tickere dieses Spiel".
2. **Given** jemand tickert und das Tickern ist für die Mannschaft erlaubt, **Then** steht in der aufgeklappten Karte der Zweitknopf "Spiel übernehmen".
3. **Given** "Spiel übernehmen", **Then** fragt die App "Paul tickert bereits (1:0, 12'). Übernehmen? Paul sieht, dass du übernommen hast." mit "Übernehmen" und "Abbrechen" (ggf. vorher die Namensfrage aus US1-S2).
4. **Given** "Übernehmen", **Then** öffnet der Spielbildschirm das laufende Spiel mit Stand, Uhr, Toren und Torschützen wie in Spec 006 US6-S2; ab dann zählt nur dieses Handy, die Karte zeigt "Anna tickert bereits" ohne Sprung im Stand.
5. **Given** Anna hat übernommen, **When** Pauls Handy wieder etwas empfängt, **Then** zeigt es "Anna tickert jetzt E2. Hier wird nur noch lokal erfasst." und sendet nichts mehr; spätere Meldungen von Paul ändern das Dashboard nicht (wie Spec 006 US6-S3).
6. **Given** zwei Handys tippen innerhalb weniger Sekunden "Los geht's" für dasselbe Spiel, **Then** zählt das erste, das beim Dienst ankommt; das zweite zeigt spätestens nach 3 Sekunden "Paul tickert bereits." mit "Zuschauen" (Hauptknopf) und "Übernehmen".
7. **Given** ein Trainer-Handy tickert, **When** ein Elternteil "Spiel übernehmen" bestätigt, **Then** gilt dasselbe wie in S4 und S5; das Trainer-Handy zeigt "Anna tickert jetzt E2." und kann über "Spiel übernehmen" (Karte auf "Live für Eltern" oder Spec 006 US6) zurückholen.
8. **Given** seit mindestens 5 Minuten keine Meldung vom tickernden Handy bei laufendem Spiel (Spec 020 US4), **Then** heißt der Zweitknopf "Weiter tickern" und die Rückfrage "Von Paul kommt seit 7 Min nichts. Übernehmen?".

---

### User Story 3 - Spiel fehlt? Selbst tickern (Priority: P1)

Das Nachholspiel steht nicht im Spielplan. Unten auf dem Dashboard steht "Spiel fehlt? Selbst tickern". Paul wählt die Mannschaft, tippt den Gegner ein und legt los, auch wenn das Spiel schon läuft.

**Why this priority**: Genau der Fall von gestern. Ohne ihn hilft US1 nur bei Spielen, die ein Trainer vorher eingetragen hat.

**Independent Test**: Live-Spieltag mit E1 und E2, kein Planspiel heute. Handy P tippt "Spiel fehlt? Selbst tickern", wählt E2, gibt "SV Beispielstadt" ein, schaltet "Spiel läuft schon" ein, tippt "Weiter zum Anpfiff", stellt "2. Halbzeit", "Noch 10 Min", 1:1 ein. Dashboard zeigt Karte E2 mit 1:1, laufender Minute und "Paul tickert bereits".

**Acceptance Scenarios**:

1. **Given** mindestens eine Mannschaft mit erlaubtem Tickern, **Then** steht unten auf dem Dashboard (über der Fußzeile) der Textknopf "Spiel fehlt? Selbst tickern".
2. **Given** "Spiel fehlt? Selbst tickern", **Then** öffnet "Neues Spiel" in der Eltern-Fassung: "Mannschaft" (nur Mannschaften mit erlaubtem Tickern; bei genau einer vorgewählt), "Gegner", Heim/Gast, Trikots, Spielzeit, Schalter "Spiel läuft schon" (Spec 023) und "Weiter zum Anpfiff"; ohne Spielplan-Auswahl, ohne "Live aufs Dashboard" (immer an).
3. **Given** die gewählte Mannschaft wird gerade getickert, **When** "Weiter zum Anpfiff" getippt wird, **Then** fragt die App wie in US2-S6 ("Paul tickert bereits.") mit "Zuschauen", "Übernehmen" und "Trotzdem neues Spiel" (z. B. zweites Spiel am Turniertag).
4. **Given** das Spiel ist angelegt, **Then** gilt alles aus US1-S4 bis S7; das Spiel erscheint auf dem Dashboard als Karte der Mannschaft, im Spielplan der Trainer erscheint es nicht.
5. **Given** der Ticker-Name fehlt, **Then** kommt die Namensfrage aus US1-S2 vor "Neues Spiel".

---

### User Story 4 - Trainer behalten die Kontrolle (Priority: P2)

Ivica sieht auf "Live für Eltern", wer tickert. Unter "Für Trainer" schaltet er je Mannschaft "Eltern dürfen tickern" aus, falls es Ärger gibt. Eltern sehen dann keinen Ticker-Knopf mehr, und ein gerade tickerndes Elternteil sendet nichts mehr.

**Why this priority**: Der Link wird weitergeleitet; ohne Schalter bliebe bei Missbrauch nur "Alle Links neu ausstellen" für alle Eltern.

**Independent Test**: Trainer-Handy T schaltet für E2 "Eltern dürfen tickern" aus. Handy P (tickert E2) zeigt "Die Trainer haben das Tickern für Eltern ausgeschaltet. Hier wird nur noch lokal erfasst."; Handy Z sieht keinen Knopf "Ich tickere dieses Spiel" und keinen Knopf "Spiel übernehmen" mehr bei E2; die Karte zeigt den letzten Stand von P.

**Acceptance Scenarios**:

1. **Given** ein Live-Spieltag, **Then** steht unter "Live für Eltern" → "Für Trainer" je Mannschaft der Schalter "Eltern dürfen tickern"; Vorgabe an, auch für bestehende Live-Spieltage nach dem Update.
2. **Given** ein Trainer schaltet den Schalter aus, **Then** gilt das innerhalb von 10 Sekunden auf allen Handys mit Netz: keine Ticker-Knöpfe für diese Mannschaft, Meldungen von Zuschauer-Handys für diese Mannschaft ändern das Dashboard nicht mehr, der Kader der Mannschaft wird an Zuschauer-Handys nicht mehr ausgeliefert.
3. **Given** ein Elternteil tickert, als der Schalter ausgeht, **Then** zeigt sein Spielbildschirm "Die Trainer haben das Tickern für Eltern ausgeschaltet. Hier wird nur noch lokal erfasst."; die Erfassung geht lokal weiter.
4. **Given** ein Trainer schaltet wieder ein, **Then** erscheinen die Knöpfe wieder; das lokal weiter erfasste Spiel sendet nicht automatisch, es kann über "Spiel übernehmen" fortgesetzt werden.
5. **Given** "Live für Eltern" auf einem Trainer-Handy, **Then** zeigt jede Karte, wer tickert, wie auf dem Dashboard; die Karte bietet "Spiel übernehmen" wie in US2.

---

### User Story 5 - Eltern-Spiel in die Trainer-Historie übernehmen (Priority: P2)

Nach dem Schlusspfiff des Nachholspiels öffnet Atti den Torticker. Oben steht "Paul hat E2 gegen SV Beispielstadt getickert: 3:1. In deine Spiele übernehmen?". Ein Tipp, und das Spiel steht mit allen Toren und Torschützen in seiner Historie.

**Why this priority**: Sonst fehlen Spiele in Historie und Statistik der Trainer; wichtig, aber nicht am Spielfeldrand.

**Independent Test**: Handy P tickert E2 gegen SV Beispielstadt bis zum Schlusspfiff (3:1, zwei Tore mit Torschütze). Trainer-Handy T mit E2 in "Meine Mannschaften" öffnet den Startbildschirm: Karte mit der Frage; "Übernehmen" legt das Spiel in die Historie mit Endstand, Toren, Minuten, Torschützen und "Getickert von Paul".

**Acceptance Scenarios**:

1. **Given** ein von einem Zuschauer-Handy getickertes Spiel mit Schlusspfiff und ein Trainer-Handy, das die Mannschaft unter "Meine Mannschaften" hat und das Spiel nicht in der Historie hat, **Then** zeigt sein Startbildschirm oben die Karte "Paul hat E2 gegen SV Beispielstadt getickert: 3:1. In deine Spiele übernehmen?" mit "Übernehmen" und "Nein danke".
2. **Given** "Übernehmen", **Then** steht das Spiel in der Historie mit Datum, Gegner, Heim/Gast, Spielzeit, Endstand, Halbzeitstand, allen Toren mit Minute und Torschütze (dem Kader zugeordnet, wenn der Name passt), Elfmeterschießen und dem Hinweis "Getickert von Paul" in den Spieldetails; danach ist es ein normales Spiel (Spiel korrigieren, Teilen, Löschen).
3. **Given** "Nein danke", **Then** verschwindet die Karte auf diesem Handy und kommt für dieses Spiel nicht wieder.
4. **Given** mehrere solche Spiele, **Then** steht je Spiel eine Karte, neuestes zuerst, höchstens drei; weitere nach Erledigen der oberen.
5. **Given** die Frage wurde bis zum nächsten Spiel der Mannschaft nicht beantwortet, **Then** bleibt sie so lange stehen, wie der Dienst das Spiel vorhält (Spec 007: je Mannschaft die letzten Spiele); danach verschwindet sie ohne Hinweis.
6. **Given** ein Trainer hat das Spiel während des Spiels übernommen und selbst beendet, **Then** erscheint keine Frage (das Spiel ist schon in seiner Historie).

---

### Edge Cases

- **Zuschauer-Link weitergeleitet** (Großeltern, Gegner): Jeder mit Link kann tickern und, solange Eltern tickern dürfen, den geteilten Kader lesen. Abhilfe: Name ist sichtbar, Trainer übernehmen oder schalten "Eltern dürfen tickern" aus; als letztes Mittel "Alle Links neu ausstellen" (Spec 006 US5).
- **Kader nicht geteilt**: Hat kein Trainer den Kader dieser Mannschaft geteilt (Spec 016 US1), wählen Eltern Torschützen wie ohne Kader (Name frei eingeben oder leer lassen, Spec 003); die App zeigt keinen Hinweis darauf.
- **Ausgeschalteter Schalter und schon geladener Kader**: Ein Kader, den ein Zuschauer-Handy schon geladen hat, lässt sich nicht zurückholen; er wird beim Ausschalten auf den Zuschauer-Handys gelöscht, sobald sie es erfahren.
- **WhatsApp-Browser geschlossen**: Wird der Link in einem eingebetteten Browser geöffnet und das Fenster mitten im Spiel geschlossen, kann das lokale Spiel weg sein. Beim erneuten Öffnen zeigt die Karte "Du tickerst" mit "Weiter tickern"; das übernimmt den letzten gesendeten Stand wie "Spiel übernehmen" ohne Rückfrage.
- **Kein Netz beim Eltern-Handy**: Ohne Netz zeigt das Dashboard keinen Ticker-Knopf (die App weiß nicht, ob schon jemand tickert). Bricht das Netz während des Tickerns ab, geht die Erfassung lokal weiter und sendet nach, wie bei Trainern (Spec 006 US2).
- **Handy ist Trainer- und Zuschauer-Handy**: Ein Trainer-Handy tickert immer als Trainer; die Eltern-Wege erscheinen dort nicht.
- **Zwei Spiele derselben Mannschaft am Tag** (Turnier): "Ich tickere dieses Spiel" gilt dem nächsten nicht beendeten Planspiel; "Trotzdem neues Spiel" (US3-S3) erlaubt ein weiteres.
- **Ticker-Name**: nur Vorname bzw. Spitzname, 2 bis 20 Zeichen; er wird auf dem Gerät gespeichert und mit dem Spiel an den Dienst geschickt (verschlüsselt wie der Stand). Er ist kein Kindername; die Hilfe sagt das.
- **Altes Lead-Handy der ersten Version**: verhält sich weiter als Trainer-Handy seiner Mannschaft (Spec 006).

## Requirements *(mandatory)*

### Functional Requirements

**Ticker-Recht über den Zuschauer-Link**

- **FR-E01**: Jeder Zuschauer-Link MUSS, ohne neues Teilen, für Mannschaften mit erlaubtem Tickern ein Spiel anlegen, tickern und ein laufendes Spiel übernehmen können (US1, US2, US3).
- **FR-E02**: Ein Zuschauer-Handy DARF NICHT Spielplan, Mannschaften, Titel, Kader, Schalter oder Links ändern; der Dienst bzw. alle empfangenden Handys MÜSSEN solche Meldungen von Zuschauer-Handys verwerfen.
- **FR-E03**: Meldungen eines Zuschauer-Handys MÜSSEN nur für die Mannschaften gelten, für die beim Empfang "Eltern dürfen tickern" an ist (US4-S2).
- **FR-E04**: Beim Tickern über den Zuschauer-Link ist ein Spiel immer live; "Nicht live senden" wird dort nicht angeboten.

**Dashboard und Sichtbarkeit**

- **FR-E05**: Die Karte einer Mannschaft MUSS "Ich tickere dieses Spiel" zeigen, wenn das Tickern erlaubt ist, das Handy Netz hat, niemand tickert und es heute ein nicht beendetes Planspiel gibt (US1-S1, US1-S8).
- **FR-E06**: Tickert jemand, MUSS die Karte für alle Betrachter "<Name> tickert bereits" bzw. "Trainer <Name> tickert bereits" (ohne Namen "Trainer tickert bereits") zeigen, auf dem eigenen Handy "Du tickerst"; nach dem Schlusspfiff "Getickert von <Name>" bzw. "Getickert von Trainer <Name>". Der Name, bei Trainern mit "Trainer", ist farbig hervorgehoben, auch in Rückfragen (US1-S7, US2-S1, US2-S3).
- **FR-E06a**: Die Namensabfrage für Trainer (Spec 015 US6-S2) MUSS "Dein Name (sehen Trainer und Eltern)" heißen.
- **FR-E07**: Das Dashboard MUSS "Spiel fehlt? Selbst tickern" zeigen, solange mindestens eine Mannschaft Tickern erlaubt (US3-S1).
- **FR-E08**: Vormerkungen aus Spec 015 US6 bleiben auf dem Dashboard unsichtbar.

**Name**

- **FR-E09**: Vor dem ersten Tickern MUSS die App den Ticker-Namen erfragen (2 bis 20 Zeichen, Pflicht), auf dem Gerät speichern und vor jedem Start mit "Name ändern" anbieten (US1-S2, US1-S3).

**Übernehmen und Doppelstart**

- **FR-E10**: "Spiel übernehmen" MUSS für Zuschauer- und Trainer-Handys mit Rückfrage möglich sein, auch gegenüber einem Trainer-Handy; die Übergabe folgt Spec 006 US6 (Stand, Uhr, Tore, Torschützen, nur noch ein sendendes Handy) (US2-S2 bis S5, S7).
- **FR-E11**: Ein Start ("Los geht's", "Weiter zum Anpfiff") MUSS sofort, noch vor dem Anpfiff, melden, dass dieses Handy tickert; ein zweites Handy, dessen Start später ankommt, MUSS spätestens nach 3 Sekunden die Frage aus US2-S6 bzw. US3-S3 zeigen.
- **FR-E12**: Das abgelöste Handy MUSS "<Name> tickert jetzt <Mannschaft>. Hier wird nur noch lokal erfasst." zeigen und darf das Dashboard nicht mehr ändern.
- **FR-E13**: Kommt vom tickernden Handy bei laufendem Spiel seit mindestens 5 Minuten nichts, MUSS der Zweitknopf "Weiter tickern" heißen (US2-S8).
- **FR-E14**: Ein Handy, das selbst tickert und das Spiel lokal verloren hat, MUSS über "Weiter tickern" ohne Rückfrage am zuletzt gesendeten Stand fortsetzen können (Edge Case WhatsApp-Browser).

**Spielbildschirm für Eltern**

- **FR-E15**: Der Spielbildschirm MUSS beim Tickern über den Zuschauer-Link alle Erfassungsfunktionen wie bei Trainern bieten (inkl. "Spiel läuft schon", "Uhr korrigieren", Rückgängig, "Teilen"), aber keine Navigation in die Trainer-App; stattdessen "Zurück zu Live" (US1-S5 bis S7).
- **FR-E16**: Die Torschützen-Auswahl MUSS den gesamten geteilten Kader der Mannschaft zeigen; Eltern können ihn nicht ändern. Ohne geteilten Kader gilt die Auswahl wie ohne Kader.
- **FR-E17**: Das Spiel bleibt auf dem Eltern-Handy, bis die Mannschaft ein neues Spiel hat; eine Historie gibt es in der Eltern-Ansicht nicht.

**Trainer**

- **FR-E18**: Unter "Live für Eltern" → "Für Trainer" MUSS je Mannschaft der Schalter "Eltern dürfen tickern" stehen, Vorgabe an; jedes Trainer-Handy darf ihn ändern, es gilt die jüngste Änderung (US4-S1).
- **FR-E19**: Beim Ausschalten MUSS das tickernde Eltern-Handy den Hinweis aus US4-S3 zeigen und lokal weiter erfassen; geladene Kader dieser Mannschaft MÜSSEN auf Zuschauer-Handys gelöscht werden (US4-S2, S3).
- **FR-E20**: Trainer-Handys MÜSSEN nach dem Schlusspfiff eines von einem Zuschauer-Handy getickerten Spiels einer eigenen Mannschaft die Übernahme-Frage zeigen, solange das Spiel nicht in ihrer Historie ist und nicht abgelehnt wurde (US5-S1, S3 bis S6).
- **FR-E21**: "Übernehmen" MUSS das Spiel vollständig in die Historie legen (US5-S2), mit dem Hinweis "Getickert von <Name>"; gibt es das Spiel schon (gleiche Spiel-Kennung), wird nichts doppelt angelegt.

**Datenschutz**

- **FR-E22**: Geteilte Kader MÜSSEN für Zuschauer-Links nur für Mannschaften mit erlaubtem Tickern lesbar sein und weiterhin verschlüsselt übertragen werden; der Dienst kann sie nicht lesen. Constitution II wird entsprechend geändert (MINOR, 3.2.0).
- **FR-E23**: Der Ticker-Name wird nur mit dem Spiel verschlüsselt übertragen und nicht anderweitig gespeichert.

### Key Entities

- **Ticker-Recht**: Fähigkeit eines Zuschauer-Links, für Mannschaften mit erlaubtem Tickern zu senden; kein eigener Link.
- **Eltern-Ticker-Schalter**: je Mannschaft "Eltern dürfen tickern" (an/aus), Teil der Konfiguration des Live-Spieltags, nur von Trainer-Handys änderbar.
- **Ticker-Name**: Vorname des tickernden Elternteils, auf dem Gerät gespeichert, mit jeder Meldung des Spiels übertragen; Trainer-Handys melden "Trainer" und den bei "Ich tickere" hinterlegten Namen (Spec 015).
- **Übernahme-Frage**: je beendetem Eltern-Spiel und Trainer-Handy offen, übernommen oder abgelehnt.

## Hilfe *(mandatory)*

Einträge in `src/domain/help-entries.ts`; Bezeichnungen wörtlich wie in der App.

| Eintrag | Änderung | Quelle |
|---|---|---|
| neu `eltern-tickern` "Wie tickere ich ein Spiel als Elternteil?" (für Eltern, Thema Live-Spieltag) | Auf der Karte "Ich tickere dieses Spiel", einmal "Wie heißt du?" (nur dein Vorname, kein Kindername), dann wie gewohnt Tore tippen. Fehlt das Spiel: unten "Spiel fehlt? Selbst tickern". Läuft das Spiel schon: "Spiel läuft schon". "Zurück zu Live" und "Weiter tickern" | 024 US1, 024 US3 |
| neu `wer-tickert` "Wie sehe ich, ob schon jemand tickert?" (für Eltern) | "Paul tickert bereits" bzw. "Trainer Jonas tickert bereits" auf der Karte, "Du tickerst" auf dem eigenen Handy; "Spiel übernehmen" mit Rückfrage; "Weiter tickern", wenn seit 5 Min nichts kommt; was das abgelöste Handy sieht | 024 US2 |
| neu `eltern-tickern-aus` "Wie verhindere ich, dass Eltern tickern?" (Trainer) | "Mehr" → "Live für Eltern" → "Für Trainer" → "Eltern dürfen tickern" je Mannschaft; was Eltern dann sehen | 024 US4 |
| neu `eltern-spiel-uebernehmen` "Wie kommt ein Spiel, das Eltern getickert haben, in meine Historie?" (Trainer) | Karte auf dem Startbildschirm, "Übernehmen" bzw. "Nein danke"; "Getickert von …" in den Spieldetails | 024 US5 |
| `spiel-uebernehmen` | geändert: auch über "Spiel übernehmen" auf der Karte; Eltern können übernehmen, Trainer holen zurück | 006 US6, 024 US2 |
| `eltern-dashboard` | geändert: ergänzt "… tickert bereits" auf der Karte und den Verweis auf `eltern-tickern` | 006 US3, 024 US1 |
| `trainer-kader`, `datenschutz` | geändert: "Eltern sehen die Kader nicht" wird zu "Eltern sehen geteilte Kader nur beim Tickern, solange „Eltern dürfen tickern“ an ist"; Ticker-Name geht verschlüsselt mit dem Spiel an den Dienst | 016 US1, 024 FR-E22, 024 FR-E23 |
| `spiel-vormerken` | geändert: ergänzt "Eltern sehen Vormerkungen nicht; tickert niemand, können Eltern einspringen." und "Deinen Namen sehen Trainer und Eltern, wenn du tickerst (z. B. „Trainer Jonas tickert bereits“)." | 015 US6, 024 FR-E08, 024 FR-E06a |

Kein Eintrag entfällt. Die Eltern-Hilfe hat danach elf Einträge (bisher neun).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-E01**: Ein Elternteil kommt vom geöffneten Zuschauer-Link in höchstens 3 Tipps plus Namenseingabe (nur beim ersten Mal) zum Spielbildschirm eines Planspiels, in höchstens 5 Tipps plus Gegnername zu einem Spiel ohne Spielplan.
- **SC-E02**: "<Name> tickert bereits" erscheint auf anderen Handys mit Netz spätestens 10 Sekunden nach "Los geht's".
- **SC-E03**: Zwei gleichzeitige Starts für dasselbe Spiel führen in 100 % der Testfälle zu genau einer Karte auf dem Dashboard.
- **SC-E04**: Nach dem Ausschalten von "Eltern dürfen tickern" ändert keine Meldung eines Zuschauer-Handys dieser Mannschaft mehr das Dashboard (Test mit verzögerter Meldung).
- **SC-E05**: Ein übernommenes Eltern-Spiel in der Trainer-Historie stimmt in Endstand, Halbzeitstand, Torzahl, Minuten und Torschützen mit dem Eltern-Handy überein.
- **SC-E06**: Alle neuen Bildschirme und Blätter funktionieren auf dem iPhone SE ohne Scrollen bis zum Hauptknopf, in hell und dunkel, ohne axe-Verstöße.

## Assumptions

- Der Zuschauer-Link wird nur in Elterngruppen und an Familie verteilt; Missbrauch ist selten und mit Name, Übernahme und Schalter beherrschbar.
- Eltern öffnen den Link meist im Browser, oft aus WhatsApp; ein Installieren auf dem Home-Bildschirm ist nicht nötig. Der Bildschirm bleibt im Spiel an wie bei Trainern, wo das Gerät es kann.
- "Heute" und "nicht beendet" bestimmen sich wie auf dem Dashboard (Spec 006 FR-L16, Spec 015).
- Die Sende- und Übergabe-Mechanik aus Spec 006 US2 und US6 sowie die Kader-Verteilung aus Spec 016 werden wiederverwendet; der Dienst bleibt im Gratis-Plan (Constitution VIII). Mehr Sender je Mannschaft ändern das Mengengerüst nicht (weiter ein sendendes Handy je Spiel).
- Elternteile nutzen ein eigenes Handy; ein Handy mit Trainer-Link tickert immer als Trainer.
- Statistik über Eltern-Spiele entsteht erst mit der Übernahme in eine Trainer-Historie (US5).
