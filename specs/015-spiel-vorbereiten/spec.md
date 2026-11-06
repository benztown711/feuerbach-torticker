# Feature Specification: Spiel vorbereiten und per Spiel-Link verteilen

**Feature Branch**: `015-spiel-vorbereiten` (Arbeitsbranch `claude/sharp-brahmagupta-kxgyie`)

**Created**: 2026-11-06

**Status**: Entwurf, Review A offen. Umfang entspricht Roadmap C1 (Spielplan, hier ohne Uhrzeit) und einem Teil von B3 (Kader je Mannschaft).

**Input**: Atti (06.11.2026): "Ist es möglich, dass ich zentral die Spiele anlege? Und dann an diejenigen, die tickern sollen, die Lead-Handys haben, gezielt den Link verteile? Dann könnten sie diesem Spiel joinen und die Details einpflegen. Den Mannschaftsnamen kann ich ja jetzt machen. Aber sowas wie Spielzeit, Kader, Farbe und so weiter, oder gegebenenfalls Platzhalter, die ich erstelle."

## Ausgangslage

- Heute legt das Lead-Handy jedes Spiel selbst unter "Neues Spiel" an: Mannschaft, Gegner, Heim/Auswärts, Trikots, Spielzeit, Aufgebot. Mannschaft und Trikots kommen mit dem Trainer-Link (Spec 006), der Kader nicht; ihn muss jeder Trainer selbst pflegen oder per "Kader teilen" und "Liste einfügen" übernehmen (Spec 001 FR-028).
- Der Kader ist je Handy eine einzige Liste, nicht je Mannschaft. Nur das zuletzt gewählte Aufgebot wird je Mannschaft gemerkt (Spec 004 FR-M06).
- Das Dashboard der Eltern zeigt ein Spiel erst, wenn ein Lead-Handy es anlegt (Spec 006 FR-L06), dann mit "noch nicht angepfiffen".
- Auf dem iPhone öffnet ein Link aus WhatsApp Safari, nicht die Home-Bildschirm-App. Links werden deshalb im Torticker eingefügt (Spec 006 FR-L03, Spec 012 FR-S02). Lange Links macht WhatsApp nur bis zum Anfang antippbar; der Trainer-Link hat deshalb seit 06.11.2026 ein kurzes Format (Spec 006 FR-L02, R-L20).

## Clarifications

### Session 2026-11-06 (Chat, vor der Spec)

- Q: Spiel-Link je Spiel (alle Angaben stecken im Link, kein Server) oder Spielplan zentral im Live-Spieltag (Vermittlungsdienst hält Daten nur rund 12 Stunden)? → A: Spiel-Link je Spiel.
- Q: Kader: ganzer Kader der Mannschaft oder nur das Aufgebot? → A: Beides: Aufgebot als Vorauswahl plus Kader der Mannschaft. "Die Kader sind für E1 & E2 fix, und für E3 separat auch fix."
- Q: Platzhalter (z. B. Gegner noch unbekannt)? → A: Ja, leere Felder füllt der Trainer vor Ort; alles bleibt auf dem Lead-Handy änderbar.
- Q: Ein Link pro Spiel oder pro Spieltag? → A: Pro Spiel.
- Q: Sehen die Eltern das Spiel vorab auf dem Dashboard? → A: Ja, sofern ein Gegnername eingegeben ist. Eine Uhrzeit gibt es nicht.

### Session 2026-11-06 (Review A, Chat)

- Q: Teilen sich E1 und E2 einen Kader, E3 hat einen eigenen? → A: Ja. E1 und E2 haben einen gemeinsamen Kader; ein Trainer schickt einige Tage vor dem Spieltag die Aufteilung auf E1 und E2 in die Trainergruppe, damit Kinder und Eltern planen können. E3 läuft separat mit eigenem Kader. Gelegentlich spielen ausgewählte E3-Kinder in der E2 mit, ebenso selten helfen E1/E2-Kinder in der E3 aus.
- Folgerung für US4: Statt je Mannschaft Kinder anzuhaken gibt es benannte Kader ("E1/E2", "E3"); jedes Kind gehört zu genau einem Kader, jede Mannschaft spielt mit einem Kader. Aushilfen aus dem anderen Kader stehen im Aufgebot unter "Weitere Kinder".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Spiel vorbereiten und Link schicken (Priority: P1)

Atti füllt unter "Neues Spiel" alles aus, was er schon weiß: Mannschaft, Gegner (darf leer bleiben), Heim/Auswärts, Trikots, Spielzeit, Spieltag und Aufgebot. Statt "Weiter zum Anpfiff" tippt er "Nur vorbereiten". Das Spiel steht danach auf seinem Startbildschirm unter "Vorbereitet", und er kann den Spiel-Link gezielt an den Trainer schicken, der am Wochenende tickert, z. B. per WhatsApp.

**Why this priority**: Ohne vorbereitetes Spiel gibt es nichts zu verteilen; das ist der Kern des Wunsches.

**Independent Test**: Auf Gerät A ein E1-Spiel gegen "TSV Musterstadt" mit Aufgebot Max, Ben, Tom vorbereiten, "Link teilen"; der geteilte Text enthält einen Spiel-Link, und der Startbildschirm zeigt "Vorbereitet: Feuerbach E1 gegen TSV Musterstadt · Sa 07.11.".

**Acceptance Scenarios**:

1. **Given** "Neues Spiel" ist ausgefüllt, **When** der Nutzer "Nur vorbereiten" tippt, **Then** wird kein Spiel angepfiffen, das Spiel erscheint auf dem Startbildschirm unter "Vorbereitet" mit Mannschaft, Gegner und Spieltag, und das Teilen-Menü des Handys öffnet sich mit dem Spiel-Link.
2. **Given** der Gegner ist leer, **When** "Nur vorbereiten" getippt wird, **Then** wird das Spiel trotzdem vorbereitet und erscheint als "Feuerbach E1 gegen (Gegner offen)".
3. **Given** ein vorbereitetes Spiel, **When** der Nutzer es antippt, **Then** öffnet "Neues Spiel" mit allen Angaben; er kann ändern und erneut "Nur vorbereiten" tippen, "Link teilen", "Löschen" oder selbst "Weiter zum Anpfiff".
4. **Given** der Spiel-Link wurde schon geteilt, **When** der Nutzer das vorbereitete Spiel ändert, **Then** weist die App darauf hin, dass der bereits geschickte Link die Änderung nicht enthält, und bietet "Link teilen" an.
5. **Given** der Teilen-Text, **Then** nennt er Mannschaft, Gegner, Spieltag und den Weg: "Link kopieren und im Torticker unter 'Spiel-Link einfügen' einfügen". Er weist darauf hin, dass der Link Vornamen enthält und nur an den Trainer geht, der tickert.

---

### User Story 2 - Spiel-Link einfügen und loslegen (Priority: P1)

Der Trainer am Spielfeldrand kopiert den Spiel-Link aus WhatsApp und tippt im Torticker "Spiel-Link einfügen". Das Spiel steht danach auch auf seinem Startbildschirm unter "Vorbereitet". Am Platz öffnet er es, ergänzt bei Bedarf Gegner oder Aufgebot und tippt "Weiter zum Anpfiff". Ist sein Handy mit dem Trainer-Link gekoppelt, geht das Spiel wie jedes andere live aufs Dashboard.

**Why this priority**: Erst hier spart der Trainer am Spielfeldrand die Eingaben.

**Independent Test**: Gerät B ohne Kader und ohne E1, Spiel-Link aus US1 in der Zwischenablage; "Spiel-Link einfügen", Einsetzen bzw. Erlaubnis; "Neues Spiel" zeigt E1, TSV Musterstadt, Trikots, Spielzeit und das Aufgebot Max, Ben, Tom vorausgewählt; "Weiter zum Anpfiff" führt zum Spielbildschirm.

**Acceptance Scenarios**:

1. **Given** die Zwischenablage enthält einen Spiel-Link, **When** der Nutzer auf dem Startbildschirm "Spiel-Link einfügen" tippt, **Then** fragt die App "Vorbereitetes Spiel übernehmen: Feuerbach E1 gegen TSV Musterstadt?"; nach "Übernehmen" steht es unter "Vorbereitet" und "Neues Spiel" öffnet sich mit allen Angaben.
2. **Given** das Handy kennt die Mannschaft E1 noch nicht, **When** der Spiel-Link übernommen wird, **Then** wird E1 mit Name, Heim- und Auswärtstrikot in "Meine Mannschaften" ergänzt.
3. **Given** Kinder aus dem Aufgebot fehlen im Kader des Handys, **When** der Spiel-Link übernommen wird, **Then** werden sie mit Vorname bzw. Kürzel und Rückennummer ergänzt; Kinder mit gleichem Namen und gleicher Nummer werden nicht doppelt angelegt; das Aufgebot ist vorausgewählt.
4. **Given** ein übernommenes Spiel, **Then** sind alle Felder in "Neues Spiel" änderbar wie bei jedem neuen Spiel.
5. **Given** das Handy ist mit dem Trainer-Link gekoppelt und E1 gehört zum Live-Spieltag, **When** "Weiter zum Anpfiff" getippt wird, **Then** sendet es das Spiel wie in Spec 006 US2.
6. **Given** das Handy ist nicht gekoppelt, **When** ein Spiel-Link übernommen wird, **Then** funktioniert das Spiel lokal, und "Neues Spiel" zeigt den Hinweis "Nicht live: Für das Dashboard den Trainer-Link einfügen" mit Knopf "Trainer-Link einfügen".
7. **Given** die Zwischenablage ist leer oder enthält keinen gültigen Spiel-Link, **When** "Spiel-Link einfügen" getippt wird, **Then** öffnet das Einfügefeld, bei ungültigem Inhalt mit Hinweis. Ein eingefügter Trainer- oder Zuschauer-Link wird wie in Spec 012 FR-S02 behandelt.
8. **Given** der Spiel-Link wird im Browser angetippt (z. B. aus WhatsApp), **Then** erklärt die Seite "Kopiere den Link und füge ihn im Torticker unter 'Spiel-Link einfügen' ein", bietet "Link kopieren" und "Hier im Browser öffnen" für alle, die den Torticker nur im Browser nutzen.
9. **Given** ein Handy ohne Kopplung zeigt die Karte "Trainer-Link einfügen" (Spec 012 FR-S01), **When** dort ein Spiel-Link eingefügt wird, **Then** wird er wie in Szenario 1 übernommen.
10. **Given** dasselbe vorbereitete Spiel ist schon auf dem Handy, **When** der Spiel-Link erneut eingefügt wird, **Then** ersetzt die eingefügte Fassung die vorhandene nach Rückfrage "Vorbereitetes Spiel aktualisieren?"; ein bereits angepfiffenes Spiel bleibt unverändert, und die App öffnet es.

---

### User Story 3 - Eltern sehen das nächste Spiel (Priority: P2)

Bereitet ein gekoppeltes Trainer-Handy ein Spiel mit Gegnername vor, erscheint es auf dem Dashboard als "Nächstes Spiel" mit Spieltag, ohne Uhrzeit und ohne Stand. Pfeift das Lead-Handy es an, wird aus derselben Karte das laufende Spiel.

**Why this priority**: Nutzen für die Eltern, aber der Spieltag funktioniert auch ohne.

**Independent Test**: Gekoppeltes Gerät A bereitet E1 gegen TSV Musterstadt für Sa 07.11. vor; Gerät C mit Zuschauer-Link zeigt die Karte "Feuerbach E1 – TSV Musterstadt · Nächstes Spiel, Sa 07.11.". Gerät B übernimmt den Spiel-Link und pfeift an; auf C wird dieselbe Karte zum laufenden Spiel, eine zweite E1-Karte entsteht nicht.

**Acceptance Scenarios**:

1. **Given** Gerät A ist Trainer-Handy und E1 gehört zum Live-Spieltag, **When** A ein E1-Spiel mit Gegner vorbereitet, **Then** zeigt das Dashboard innerhalb von 10 Sekunden die Karte mit Trikotfarben, "Nächstes Spiel" und Spieltag, ohne Stand.
2. **Given** der Gegner ist leer, **Then** erscheint das vorbereitete Spiel nicht auf dem Dashboard; sobald ein Gegner eingetragen und erneut vorbereitet wird, erscheint es.
3. **Given** ein vorbereitetes Spiel steht auf dem Dashboard, **When** ein Lead-Handy es aus dem Spiel-Link anlegt und anpfeift, **Then** wird aus der Karte das laufende Spiel; es entsteht keine zweite Karte.
4. **Given** ein vorbereitetes Spiel steht auf dem Dashboard, **When** A es löscht, **Then** verschwindet es vom Dashboard.
5. **Given** ein vorbereitetes Spiel steht auf dem Dashboard, **When** ein anderes Handy ein E1-Spiel ohne Spiel-Link anlegt, **Then** fragt die App nicht "wird schon übertragen" (Spec 006 FR-L22); ein vorbereitetes Spiel zählt dort nicht als Übertragung.
6. **Given** E1 hat am selben Tag schon ein beendetes Spiel, **Then** zeigt die E1-Karte das vorbereitete Spiel und darunter "Heute außerdem: 2:1 gegen …" (FR-P15).
7. **Given** der Spieltag eines vorbereiteten Spiels ist vorbei und es wurde nicht angelegt, **Then** verschwindet es am Folgetag vom Dashboard.

---

### User Story 4 - Kader je Mannschaft mitschicken (Priority: P2)

Atti teilt die Kinder einmal in zwei Kader auf: "E1/E2" und "E3". E1 und E2 spielen mit dem Kader "E1/E2", E3 mit "E3". Ein Spiel-Link bringt dann neben dem Aufgebot den ganzen Kader der Mannschaft mit, damit der Trainer am Platz ein Kind nachwählen kann, das nicht im Aufgebot stand. Hilft ein Kind aus dem anderen Kader aus, steht es im Aufgebot und kommt mit.

**Why this priority**: Das Aufgebot aus US1 deckt den Normalfall; der ganze Kader hilft bei kurzfristigen Änderungen und räumt das E1/E2/E3-Gemisch in der Auswahl auf (Roadmap B3).

**Independent Test**: Auf A gehören Max, Ben, Tom, Leo, Maxi zum Kader "E1/E2", Paul zum Kader "E3". Spiel-Link für E2 mit Aufgebot Max, Ben, Tom und Aushilfe Paul auf Gerät B übernehmen; B zeigt im Aufgebot Max, Ben, Tom und Paul ausgewählt, Leo und Maxi auswählbar; Paul steht in B im Kader "E3".

**Acceptance Scenarios**:

1. **Given** "Mehr" → "Kader" mit einem einzigen Kader (wie bisher), **When** der Nutzer "Kader hinzufügen" mit Namen "E3" wählt und Paul dorthin verschiebt, **Then** gibt es die Kader "Kader" (umbenennbar, z. B. in "E1/E2") und "E3"; Paul steht nur in "E3".
2. **Given** "Meine Mannschaften" → E1, **When** der Nutzer unter "Kader" den Kader "E1/E2" wählt, **Then** spielt E1 mit diesem Kader; E2 kann denselben Kader wählen.
3. **Given** es gibt nur einen Kader, **Then** spielen alle Mannschaften damit, und "Neues Spiel" sowie "Mehr" → "Kader" sehen aus wie bisher.
4. **Given** "Neues Spiel" für E2, **Then** zeigt "Aufgebot" die Kinder des Kaders "E1/E2"; die Kinder der anderen Kader stehen eingeklappt unter "Weitere Kinder" und sind dort wählbar (Aushilfe).
5. **Given** ein Spiel-Link für E2, **When** er übernommen wird, **Then** werden die Kinder des Kaders "E1/E2" ergänzt (wie US2 Szenario 3) und auf diesem Handy dem gleichnamigen Kader zugeordnet (fehlt er, wird er angelegt); Aushilfen kommen in ihren eigenen Kader; das Aufgebot ist vorausgewählt.

---

### Edge Cases

- **Zwei Handys übernehmen denselben Spiel-Link und pfeifen an**: Das zweite bekommt die Frage aus Spec 006 US6 ("wird schon übertragen", "Spiel übernehmen").
- **Atti ändert nach dem Teilen**: Der geschickte Link bleibt beim alten Stand; die App weist darauf hin (US1 Szenario 4). Das Dashboard zeigt den neuen Stand, sobald Attis Handy ihn gesendet hat.
- **Atti löscht, nachdem der Trainer den Link übernommen hat**: Das Spiel verschwindet vom Dashboard, bleibt aber auf dem Handy des Trainers vorbereitet. Pfeift er es an, erscheint es wieder.
- **Mannschaft gehört nicht zum Live-Spieltag** oder Handy nicht gekoppelt: Das Spiel funktioniert lokal, wird nicht gesendet (US2 Szenario 6).
- **Spieltag in der Vergangenheit beim Einfügen**: Das Spiel wird trotzdem übernommen, mit Hinweis "Spieltag war am …".
- **Vermittlungsdienst hält Meldungen rund 12 Stunden**: Eltern, die das Dashboard erst später öffnen, sehen ein vorbereitetes Spiel, sobald ein Handy, das es kennt, den Torticker wieder öffnet (FR-P13). Wer das Dashboard schon geöffnet hatte, sieht es weiter (gemerkter Stand, Spec 006 FR-L16).
- **Offline beim Vorbereiten**: Vorbereiten und Link teilen gehen ohne Netz; die Meldung ans Dashboard folgt, sobald Netz da ist.
- **Spiel-Link zu lang für WhatsApp**: WhatsApp macht auf dem iPhone lange Links nur bis zum Anfang antippbar (Spec 006 R-L20). Der Spiel-Link nutzt deshalb ein kurzes Format wie der Trainer-Link (SC-P04). Kommt nur der Anfang an, erklärt die Seite das wie Spec 006 US1-S8.
- **Gefälschter oder beschädigter Spiel-Link**: Inhalte werden auf Länge und Format geprüft; ein ungültiger Link ändert nichts und meldet "Kein gültiger Spiel-Link".
- **Aushilfe**: Ein E3-Kind spielt in der E2 mit. Es wird im Aufgebot unter "Weitere Kinder" gewählt, bleibt im Kader "E3" und kommt mit dem Spiel-Link mit (FR-P20).
- **Gleicher Vorname in zwei Kadern**: Unterscheidung wie bisher über Rückennummer oder Kürzel (Spec 001 FR-020).
- **Neu ausgestellter Live-Spieltag**: Ein Spiel-Link enthält keine Schlüssel und bleibt gültig; gesendet wird über die aktuelle Kopplung des Handys.

## Requirements *(mandatory)*

### Functional Requirements

**Vorbereiten (US1)**

- **FR-P01**: "Neues Spiel" MUSS unter "Weiter zum Anpfiff" den Zweitknopf "Nur vorbereiten" haben. Er speichert ein vorbereitetes Spiel mit Mannschaft, Gegner (darf leer sein), Heim/Auswärts, Trikotfarben beider Seiten, Spielzeit, Spieltag und Aufgebot, ohne ein Spiel anzulegen, und öffnet das Teilen-Menü mit dem Spiel-Link (FR-P05).
- **FR-P02**: "Neues Spiel" MUSS beim Vorbereiten das Feld "Spieltag" (Datum) zeigen, Vorgabe der nächste Samstag, frühestens heute. Beim direkten Anpfiff entfällt das Feld wie bisher.
- **FR-P03**: Der Startbildschirm MUSS vorbereitete Spiele unter "Vorbereitet" auflisten, nach Spieltag aufsteigend, je Zeile Mannschaft, Gegner bzw. "(Gegner offen)" und Spieltag (z. B. "Sa 07.11."). Höchstens 20 vorbereitete Spiele; beim 21. erscheint der Hinweis, ältere zu löschen.
- **FR-P04**: Ein angetipptes vorbereitetes Spiel MUSS "Neues Spiel" mit allen Angaben öffnen; dort gibt es "Weiter zum Anpfiff", "Nur vorbereiten" (speichert Änderungen), "Link teilen" und "Löschen". "Weiter zum Anpfiff" legt das Spiel an und entfernt es aus "Vorbereitet".
- **FR-P05**: Der Spiel-Link MUSS alle Angaben aus FR-P01 enthalten, dazu eine Spielkennung und seit US4 den Kader der Mannschaft, und darf keine Schlüssel des Live-Spieltags enthalten. Die Angaben stehen im Teil der Adresse, der nicht an den Webserver geht.
- **FR-P06**: Der Teilen-Text MUSS Mannschaft, Gegner, Spieltag, den Einfüge-Weg und den Hinweis "Enthält Vornamen. Nur an den Trainer schicken, der das Spiel tickert." nennen.
- **FR-P07**: Wird ein vorbereitetes Spiel geändert, nachdem sein Link geteilt wurde, MUSS die App "Der geschickte Link enthält diese Änderung nicht" mit "Link teilen" zeigen.
- **FR-P08**: Vorbereitete Spiele, deren Spieltag vorbei ist, MÜSSEN am Folgetag aus "Vorbereitet" verschwinden. Sie erscheinen nicht in der Historie.

**Einfügen (US2)**

- **FR-P09**: Der Startbildschirm MUSS unter "Neues Spiel" den Zweitknopf "Spiel-Link einfügen" zeigen. Wie in Spec 012 FR-S02 liest er zuerst die Zwischenablage (nur nach dem Tipp), sonst öffnet das Einfügefeld. Trainer- und Zuschauer-Links werden dort wie in FR-S02 behandelt; "Trainer-Link einfügen" erkennt umgekehrt auch Spiel-Links.
- **FR-P10**: Übernehmen MUSS nach der Rückfrage "Vorbereitetes Spiel übernehmen: <Mannschaft> gegen <Gegner>?" das Spiel unter "Vorbereitet" speichern, fehlende Mannschaft (Name, Trikots) in "Meine Mannschaften" und fehlende Kinder (Vorname bzw. Kürzel, Rückennummer) in den Kader übernehmen und "Neues Spiel" mit allen Angaben und vorausgewähltem Aufgebot öffnen. Gleich gilt ein Kind bei gleichem Namen und gleicher Nummer.
- **FR-P11**: Ist das Handy nicht gekoppelt oder gehört die Mannschaft nicht zum Live-Spieltag, MUSS "Neues Spiel" den Hinweis aus US2 Szenario 6 zeigen; erfasst wird wie ohne Kopplung.
- **FR-P12**: Ein im Browser geöffneter Spiel-Link MUSS die Seite aus US2 Szenario 8 zeigen; "Hier im Browser öffnen" übernimmt das Spiel im Browser wie FR-P10.

**Dashboard (US3)**

- **FR-P13**: Ein Trainer-Handy MUSS ein vorbereitetes Spiel mit Gegnername einer Mannschaft des Live-Spieltags senden: beim Vorbereiten, bei jeder Änderung, beim Löschen (Entfernen-Meldung) und, solange es vorbereitet ist, beim Öffnen des Torticker, wenn die letzte Meldung älter als 6 Stunden ist. Das gilt für das vorbereitende Handy und für jedes Trainer-Handy, das den Spiel-Link übernommen hat. Übertragen werden nur die Angaben aus Spec 006 FR-L10 und der Spieltag; Aufgebot und Kader nie.
- **FR-P14**: Das Dashboard MUSS ein vorbereitetes Spiel als Karte mit Mannschaft, Gegner, Trikotfarben und der Phase "Nächstes Spiel, <Spieltag>" zeigen, ohne Stand. Wird es angelegt, zeigt dieselbe Karte das Spiel (gleiche Spielkennung, keine zweite Karte).
- **FR-P15**: Ordnung auf dem Dashboard: Je Mannschaft bleibt eine Karte (Spec 006 FR-L14). Läuft ein Spiel der Mannschaft, zeigt die Karte das laufende Spiel und darunter die Zeile "Danach: gegen <Gegner>". Sonst zeigt sie das vorbereitete Spiel mit dem frühesten Spieltag, ein beendetes Spiel desselben Tages als Zeile "Heute außerdem" darunter.
- **FR-P16**: Ein vorbereitetes Spiel MUSS bei der Prüfung "wird schon übertragen" (Spec 006 FR-L22) unberücksichtigt bleiben und am Folgetag seines Spieltags vom Dashboard verschwinden.

**Kader je Mannschaft (US4)**

- **FR-P17**: "Mehr" → "Kader" MUSS mehrere benannte Kader erlauben (höchstens 6): hinzufügen, umbenennen, löschen (nur leer) und Kinder zwischen Kadern verschieben. Jedes Kind gehört zu genau einem Kader. Bestehende Kinder liegen im Kader "Kader". Mit nur einem Kader bleibt die Ansicht wie bisher.
- **FR-P18**: "Meine Mannschaften" → Mannschaft MUSS die Auswahl "Kader" haben (Vorgabe: der erste Kader). Mehrere Mannschaften dürfen denselben Kader haben.
- **FR-P19**: "Neues Spiel" MUSS im Aufgebot die Kinder des Kaders der Mannschaft zeigen und die Kinder anderer Kader eingeklappt unter "Weitere Kinder" (wählbar als Aushilfe).
- **FR-P20**: Ein Spiel-Link MUSS den Kader der Mannschaft (Name und Kinder) mitbringen und für Aushilfen im Aufgebot den Namen ihres Kaders. Beim Übernehmen werden fehlende Kinder ergänzt (FR-P10) und dem gleichnamigen Kader zugeordnet; fehlt ein Kader, wird er angelegt. Kinder, die schon auf dem Handy sind, behalten ihren Kader.

**Allgemein**

- **FR-P21**: Vorbereitete Spiele und Kader MÜSSEN in der Sicherung enthalten sein und beim Wiederherstellen übernommen werden.

### Key Entities

- **Vorbereitetes Spiel**: Spielkennung, Mannschaft (Name, Heim- und Auswärtstrikot), Gegner (optional), Heim/Auswärts, Trikotfarben, Spielzeit, Spieltag (Datum), Aufgebot, Kader (US4), Zeitpunkt der letzten Änderung und des letzten Teilens.
- **Spiel-Link**: Adresse des Torticker mit dem vorbereiteten Spiel im nicht übertragenen Teil der Adresse; ohne Schlüssel.
- **Kader (US4)**: Benannte Liste von Kindern, z. B. "E1/E2" und "E3", je Handy. Jedes Kind gehört zu genau einem Kader; jede Mannschaft spielt mit einem Kader.

## Hilfe *(mandatory)*

| Eintrag | Änderung | Quelle |
|---|---|---|
| `spiel-vorbereiten` "Wie bereite ich ein Spiel für einen anderen Trainer vor?" | neu | 015 US1 |
| `spiel-link` "Wie übernehme ich ein vorbereitetes Spiel?" | neu | 015 US2 |
| `neues-spiel` "Wie lege ich ein Spiel an?" | geändert: "Nur vorbereiten", Liste "Vorbereitet" | 001 US1, 015 US1 |
| `trainer-link` "Wie kopple ich das Handy eines Trainers?" | geändert: Knopf erkennt auch Spiel-Links | 012 US1, 015 US2 |
| `eltern-dashboard` "Wie verfolge ich die Spiele als Elternteil?" | geändert: "Nächstes Spiel" ohne Uhrzeit | 006 US3, 015 US3 |
| `kader-mehrere` "Wie lege ich einen zweiten Kader an, z. B. für die E3?" | neu | 015 US4 |
| `kader` "Wie pflege ich den Kader?" | geändert: mehrere Kader, Kinder verschieben | 001 US5, 015 US4 |
| `mannschaft` "Wie lege ich meine Mannschaft an?" | geändert: Auswahl "Kader" | 004 US1, 015 US4 |
| `aufgebot` "Wie wähle ich das Aufgebot für ein Spiel?" | geändert: "Weitere Kinder" für Aushilfen | 004 FR-M06, 015 US4 |

## Success Criteria *(mandatory)*

- **SC-P01**: Ein Trainer mit Spiel-Link in der Zwischenablage steht nach höchstens 4 Tipps auf dem Spielbildschirm (Spiel-Link einfügen, Einsetzen bzw. Erlaubnis, Übernehmen, Weiter zum Anpfiff), ohne ein Feld auszufüllen.
- **SC-P02**: Atti bereitet ein Spiel mit Aufgebot von 10 Kindern in unter 1 Minute vor und teilt es.
- **SC-P03**: Ein vorbereitetes Spiel mit Gegner erscheint bei Netz innerhalb von 10 Sekunden auf dem Dashboard; beim Anlegen entsteht nie eine zweite Karte.
- **SC-P04**: Ein Spiel-Link mit 20 Kindern im Kader und 12 im Aufgebot ist höchstens rund 400 Zeichen lang und damit in WhatsApp ganz antippbar (wie Spec 006 FR-L02).
- **SC-P05**: Domain-Logik (Link bauen und prüfen, Übernehmen, Kader zusammenführen, Ordnung auf dem Dashboard) mit 100 % Branch-Coverage; Netzwerk-Wächter ohne neue Ziele.

## Assumptions

- Spieltag als Datum ist bekannt (WFV-Spielplan), eine Uhrzeit nicht. Vorgabe ist der nächste Samstag.
- E1 und E2 teilen sich einen Kader, E3 hat einen eigenen (Review A). Aushilfen zwischen den Kadern sind selten und werden im Aufgebot gewählt, nicht im Kader.
- Vorbereiten kann jedes Handy, nicht nur Atti; aufs Dashboard kommt ein vorbereitetes Spiel nur von einem Trainer-Handy (Constitution II).
- Der Spiel-Link wird wie "Kader teilen" bewusst und gezielt geteilt; Vornamen darin entsprechen Constitution III.
- Keine neue Laufzeit-Abhängigkeit; Link-Format nach dem Muster der Live-Links (Spec 006 contracts/live-link.md).
- Spec 006 FR-L10 wird um den Spieltag eines vorbereiteten Spiels ergänzt; FR-L14 und FR-L22 um FR-P15 und FR-P16.
