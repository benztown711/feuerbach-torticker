# Feature Specification: Startbildschirm mit "Spiel übernehmen" und "Spiele verfolgen"

**Feature Branch**: `018-startbildschirm` (Arbeitsbranch `claude/admiring-heisenberg-k8cbod`)

**Created**: 2026-11-15

**Status**: Review A und Review B erledigt (16.11.2026, "Passt."), Umsetzung in PR #85. Mockup: https://claude.ai/artifact/68Yc92Lj3PLVNHirF5eYDe

**Input**: Atti (15.11.2026): "mir ist aufgefallen, dass es für jemandem mit trainerlink nicht einfach ist nur zuzusehen per Dashbaord, wenn jemand anders tickert. Wie könnten wir das beheben?" Nach dem Vorschlag eines Reiters "Spieltag" in der Navigationsleiste: "ich finde es muss auf der Startseite sein die möglichkeit, dass man entweder ein neues Spiel anlegt, ein bestehendes weiterführt, eines übernimtm (wenn schon jemand tickert) und einfach nur zusieht"

## Ausgangslage

Gesichtet am 15.11.2026:

- **Startbildschirm eines gekoppelten Trainer-Handys**: gegebenenfalls "Heute tickerst du" (Spec 015 FR-P28), "Spiel fortsetzen: <Gegner>" bei einem eigenen, nicht beendeten Spiel, "Neues Spiel" und darunter die Zeile "Live: <Titel> · <Mannschaften>" (Spec 012 FR-S04). Diese Zeile öffnet die Übersicht "Live-Spieltag", nicht das Dashboard.
- **Dashboard in der App**: "Dashboard ansehen" steht in der Übersicht "Live-Spieltag" unter Zuschauer-Link, Trainer-Link, Mannschaften und Spielplan (Spec 006 FR-L17); auf dem iPhone erst nach Scrollen sichtbar. Weg vom Startbildschirm: 2 Tipps und Scrollen. Schnell geht es nur im eigenen Spiel (Kennzeichen "Live", Zeile "E2 2:1 · 31'", Spec 006 US4).
- **Spiel übernehmen**: nur als Rückfrage, wenn man unter "Neues Spiel" ein Spiel derselben Mannschaft mit "Live aufs Dashboard" anlegt, und nur, solange die letzte Meldung des anderen Handys höchstens 30 Minuten alt ist (Spec 006 US6, FR-L22). Wer übernehmen will, beginnt also erst ein neues Spiel mit Gegner und Trikots.
- **Home-Bildschirm-Symbol**: Bei Trainern öffnet es immer den Startbildschirm, bei Eltern das Dashboard (Spec 006 FR-L16).

## Clarifications

### Session 2026-11-15 (Chat)

- Q: Wie kommt ein Trainer leichter zum Dashboard, wenn ein anderer tickert? Vorschläge: A Startzeile öffnet das Dashboard, B Kurzstände auf dem Startbildschirm, C Reiter "Spieltag" in der Navigationsleiste (Empfehlung), D die App öffnet von selbst das Dashboard. → A (Atti): Auf den Startbildschirm, mit vier Möglichkeiten: neues Spiel anlegen, bestehendes fortsetzen, eines übernehmen (wenn schon jemand tickert), einfach nur zusehen. Der Reiter "Spieltag" ist damit nicht Teil dieser Spec.
- Folgerungen mit Empfehlung, in Review A zu bestätigen:
  - E1: "Spiele verfolgen" ersetzt die Zeile "Live: <Titel> · <Mannschaften>" (Spec 012 FR-S04) und nennt Titel und Mannschaften als Unterzeile. Verwalten (Links teilen, Mannschaften, Spielplan) bleibt unter "Mehr" → "Live-Spieltag".
  - E2: "Spiel übernehmen" erscheint für jedes heute angepfiffene, nicht beendete Spiel eines anderen Handys, ohne die 30-Minuten-Grenze aus FR-L22: Gerade wenn das andere Handy verstummt ist (Akku leer, Trainer weg), hilft die Übernahme. Noch nicht angepfiffene Spiele laufen weiter über "Neues Spiel" (Rückfragen aus Spec 006 US6 und Spec 015 US6).
  - E3: Feste Reihenfolge: "Spiel fortsetzen" (falls vorhanden), "Neues Spiel", "Spiel übernehmen" (falls jemand tickert), "Spiele verfolgen". Hauptknopf ist "Spiel fortsetzen", sonst "Neues Spiel"; die Knöpfe springen nicht je nach Lage.
  - E4: "Spiele verfolgen" auch auf Handys, die im Torticker nur einen Zuschauer-Link kennen (z. B. Eltern, die selbst tickern); "Spiel übernehmen" nur mit Trainer-Link.
  - E5: Bezeichnung "Spiele verfolgen" (Atti, 16.11.2026: statt "Spiele verfolgen").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Spiele verfolgen vom Startbildschirm (Priority: P1)

Ein Trainer betreut an diesem Wochenende keine Mannschaft oder steht bei dem Spiel, das ein Kollege tickert. Er öffnet den Torticker, tippt auf "Spiele verfolgen" und sieht das Dashboard mit allen Spielen des Spieltags.

**Why this priority**: Das ist der Anlass. Nur lesen, kein Risiko für die Erfassung, ein Tipp statt zwei Tipps und Scrollen.

**Independent Test**: Trainer-Handy A tickert ein E2-Spiel. Trainer-Handy B (kein eigenes Spiel) öffnet den Torticker und tippt auf "Spiele verfolgen"; das Dashboard zeigt das E2-Spiel mit Stand und laufender Minute.

**Acceptance Scenarios**:

1. **Given** ein gekoppeltes Trainer-Handy, **When** der Startbildschirm erscheint, **Then** steht nach "Neues Spiel" der Knopf "Spiele verfolgen" mit der Unterzeile "<Titel> · <Mannschaften>" (z. B. "Unser Spieltag · E1, E2, E3"); die bisherige Zeile "Live: …" gibt es nicht mehr.
2. **Given** der Startbildschirm aus Szenario 1, **When** "Spiele verfolgen" getippt wird, **Then** öffnet sich das Dashboard des Live-Spieltags wie bei den Eltern (Karten, nächste Spiele, "Letzte Spiele"); "Spiel" in der Navigationsleiste führt zurück zum Startbildschirm.
3. **Given** das Handy hat kein Netz, **When** "Spiele verfolgen" getippt wird, **Then** zeigt das Dashboard den zuletzt bekannten Stand mit "Keine Verbindung · Stand von <Uhrzeit>" (Spec 006 US3-S6).
4. **Given** ein Handy mit eigenen Mannschaften, das im Torticker nur einen Zuschauer-Link geöffnet hat (nicht gekoppelt), **Then** zeigt der Startbildschirm "Spiele verfolgen" (öffnet dieses Dashboard) und weiterhin die Karte "Trainer? Füge den Link aus der Trainergruppe ein." (Spec 012 FR-S01).
5. **Given** ein Handy ohne Live-Spieltag und ohne Zuschauer-Link, **Then** fehlt "Spiele verfolgen"; der Startbildschirm ist unverändert.
6. **Given** der Live-Spieltag wurde neu ausgestellt (Spec 006 US5-S3), **Then** fehlt "Spiele verfolgen", und wie bisher erscheint die Karte zum Einfügen des neuen Trainer-Links.
7. **Given** ein Trainer-Handy, **When** "Mehr" → "Live-Spieltag" geöffnet wird, **Then** sind Links, Mannschaften, Spielplan, Verwalten und "Dashboard ansehen" dort unverändert. (Nachtrag 17.11.2026, geändert durch Spec 020 US2: Die Seite heißt "Live für Eltern"; Trainer-Link, Mannschaften, Spielplan und Verwalten stehen eingeklappt unter "Für Trainer".)

---

### User Story 2 - Spiel übernehmen vom Startbildschirm (Priority: P2)

Ein Kollege tickert E2 und muss früher gehen, oder sein Akku ist leer. Der Trainer daneben öffnet den Torticker, sieht "Spiel übernehmen" mit dem laufenden E2-Spiel und übernimmt mit zwei Tipps, ohne erst ein neues Spiel anzulegen.

**Why this priority**: Übernehmen geht heute schon über "Neues Spiel" (Spec 006 US6), aber nur auf Umwegen und nicht, wenn das andere Handy länger als 30 Minuten nichts gesendet hat. Seltener als das Verfolgen der Spiele, im Ernstfall aber wichtig.

**Independent Test**: Trainer-Handy A erfasst E2 gegen TSV Musterstadt (1:0, 12'). Trainer-Handy B öffnet den Torticker: "Spiel übernehmen" mit "E2 1:0 TSV Musterstadt · 12'". B tippt darauf und bestätigt, erfasst ein Tor; das Dashboard zeigt 2:0, A zeigt "E2 überträgt jetzt ein anderes Handy".

**Acceptance Scenarios**:

1. **Given** Trainer-Handy A überträgt ein angepfiffenes, nicht beendetes E2-Spiel, **When** auf Trainer-Handy B der Startbildschirm erscheint, **Then** zeigt B zwischen "Neues Spiel" und "Spiele verfolgen" den Knopf "E2 übernehmen" (roter Rahmen) mit der Unterzeile "E2 1:0 TSV Musterstadt · 12'" (Stand in der Reihenfolge Heim gegen Gast, Minute bzw. Phase wie auf dem Dashboard, die Minute läuft mit).
2. **Given** Szenario 1, **When** "E2 übernehmen" getippt wird, **Then** fragt B "E2 gegen TSV Musterstadt übernehmen?" mit dem Satz "Ab dann sendet nur noch dieses Handy. Das andere Handy erfasst nur noch für sich." und den Knöpfen "Spiel übernehmen" und "Abbrechen".
3. **Given** die Frage aus Szenario 2, **When** "Spiel übernehmen" getippt wird, **Then** öffnet B das Spiel wie in Spec 006 US6-S2 (Gegner, Heim/Gast, Trikots, Spielzeit-Schema, laufende Uhr, Tore mit Torschützen, Elfmeterschießen) und sendet ab dann allein; A verhält sich wie in Spec 006 US6-S3.
4. **Given** zwei andere Handys übertragen laufende Spiele von E1 und E3, **Then** zeigt B je Spiel einen Knopf ("E1 übernehmen", "E3 übernehmen") in der Reihenfolge des Dashboards.
5. **Given** B überträgt selbst ein laufendes Spiel, **Then** erscheint dafür kein "Spiel übernehmen" (dafür gibt es "Spiel fortsetzen").
6. **Given** das Spiel eines anderen Handys ist noch nicht angepfiffen, beendet, auf "Nicht live senden" gestellt oder ein angepfiffenes Spiel von gestern ohne Schlusspfiff, **Then** erscheint dafür kein "Spiel übernehmen".
7. **Given** von A kam seit 35 Minuten keine Meldung (z. B. Akku leer), **Then** erscheint "Spiel übernehmen" trotzdem; die Unterzeile nennt zusätzlich "letzte Meldung vor 35 Min", die Minute läuft weiter.
8. **Given** B zeigt den Startbildschirm, **When** A abpfeift oder ein drittes Handy das Spiel übernimmt, **Then** verschwindet bzw. aktualisiert sich der Knopf ohne Neuladen.
9. **Given** B hat kein Netz oder den Live-Stand noch nicht empfangen, **Then** fehlt "Spiel übernehmen", und "Spiel fortsetzen", "Neues Spiel" und "Spiele verfolgen" sind sofort bedienbar; kommt der Stand an, erscheint der Knopf.
10. **Given** ein Handy, das nur einen Zuschauer-Link kennt, **Then** erscheint nie "Spiel übernehmen".

---

### Edge Cases

- **Eigenes Spiel wurde übernommen**: A zeigt weiter "Spiel fortsetzen" für sein lokales Spiel (Spec 006 FR-L24) und zusätzlich "E2 übernehmen" für dasselbe Spiel, das jetzt B sendet. So kann A es zurücknehmen; der aktuelle Stand ersetzt dabei sein lokales Spiel (gleiche Kennung), Karten und Wechsel von A gehen dabei verloren.
- **Zwei Handys übernehmen fast gleichzeitig**: wie bisher über den Übergabezähler (Spec 006 FR-L23).
- **Viele laufende Spiele** (bis zu 6 Mannschaften): je Spiel ein Knopf; reicht der Platz nicht, scrollt der Startbildschirm.
- **Halbzeit, Uhr angehalten, Verlängerung, Elfmeterschießen**: Die Unterzeile nennt die Phase wie das Dashboard ("Halbzeit", "Uhr angehalten", …).
- **Falsch gestellte Geräteuhr**: Die Minute in der Unterzeile wird wie auf dem Dashboard aus dem Spielverlauf berechnet (Constitution V, Spec 006 SC-L04).
- **Startbildschirm lange offen** (Handy liegt auf der Bank): Der Knopf bleibt aktuell, solange der Startbildschirm sichtbar ist; im Hintergrund ruht der Empfang und setzt beim Zurückkehren wieder ein.
- **Lead-Handys der ersten Version** (Lead-Link je Mannschaft, ohne Trainer-Link): sehen "Spiele verfolgen" und Übernehmen-Knöpfe nur für ihre eigene Mannschaft.
- **Gekoppelt und zusätzlich ein Zuschauer-Link gemerkt**: "Spiele verfolgen" öffnet das Dashboard der Kopplung.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Der Startbildschirm MUSS die Möglichkeiten in fester Reihenfolge zeigen: "Heute tickerst du" (Spec 015 FR-P28, unverändert), "Spiel fortsetzen: <Gegner>" (bei einem eigenen, nicht beendeten Spiel), "Neues Spiel", je laufendem Spiel eines anderen Handys "<Mannschaft> übernehmen" (FR-004), "Spiele verfolgen" (FR-002), darunter wie bisher die Karte "Trainer? …" bzw. zum Neu-Ausstellen (Spec 012 FR-S01). Hauptknopf ist "Spiel fortsetzen", ohne eigenes offenes Spiel "Neues Spiel"; alle Knöpfe sind mindestens 64 pt hoch (Constitution I). Nachtrag 17.11.2026, ergänzt durch Spec 020 FR-E01: Nach "Spiele verfolgen" folgt "Eltern live zuschauen lassen" (Unterzeile "Link für die Elterngruppe"), vor der Karte "Trainer? …".
- **FR-002**: "Spiele verfolgen" MUSS auf jedem Handy erscheinen, das gekoppelt ist (nicht neu ausgestellt) oder im Torticker einen Zuschauer-Link geöffnet hat, mit der Unterzeile "<Titel> · <Mannschaften>" (Kurzformen wie auf den Mannschafts-Chips). Ein Tipp öffnet das Dashboard in der App (Spec 006 FR-L17) mit der Navigationsleiste; ist das Handy gekoppelt, das der Kopplung.
- **FR-003**: Die Zeile "Live: <Titel> · <Mannschaften>" (Spec 012 FR-S04) MUSS entfallen. Die Übersicht "Live-Spieltag" bleibt unter "Mehr" erreichbar, mit "Dashboard ansehen". (Nachtrag 17.11.2026: heißt seit Spec 020 FR-E12 "Live für Eltern"; "Dashboard ansehen" bleibt oben sichtbar.)
- **FR-004**: Ein Handy mit Trainer-Link MUSS, solange der Startbildschirm sichtbar ist, den Live-Stand empfangen und für jedes heute angepfiffene, nicht beendete, live gesendete Spiel eines anderen Handys einer Mannschaft, für die es senden darf, den Knopf "<Mannschaft> übernehmen" (z. B. "E2 übernehmen", roter Rahmen) zeigen, ohne Grenze für das Alter der letzten Meldung. Unterzeile: Kurzform der Mannschaft, Stand Heim gegen Gast mit Gegner, Minute bzw. Phase wie auf dem Dashboard (FR-L12, FR-L13); ab 5 Minuten ohne Meldung zusätzlich "letzte Meldung vor <n> Min" (wie FR-L15). Mehrere Spiele stehen in der Reihenfolge des Dashboards (FR-L14). Ohne Netz oder vor dem ersten Empfang fehlt der Knopf; der Startbildschirm wartet nicht darauf.
- **FR-005**: Ein Tipp auf "<Mannschaft> übernehmen" MUSS die Rückfrage aus US2-S2 zeigen. "Spiel übernehmen" legt das Spiel wie Spec 006 FR-L23 an und öffnet es; das abgebende Handy verhält sich wie FR-L24. Fehlt die Mannschaft unter "Meine Mannschaften", wird sie mit Name und Trikots aus dem Live-Spieltag übernommen (wie FR-L03); Torschützen werden dem Kader dieser Mannschaft zugeordnet (Spec 015 US5).
- **FR-006**: Der Empfang für "Spiel übernehmen" MUSS enden, sobald der Startbildschirm verlassen wird oder die App in den Hintergrund geht. Ohne Trainer-Link baut der Startbildschirm keine Verbindung auf (Constitution II, Netzwerk-Wächter).
- **FR-007**: Die Rückfrage unter "Neues Spiel" (Spec 006 FR-L22, mit 30-Minuten-Grenze) und "Heute tickerst du" (Spec 015 FR-P28) MÜSSEN unverändert bleiben.

### Key Entities

- **Laufendes Spiel eines anderen Handys**: abgeleitet aus dem Live-Stand des Dashboards (Spec 006): Spiel einer Mannschaft des Live-Spieltags, heute angepfiffen, ohne Schlusspfiff, live gesendet, nicht von diesem Handy gesendet. Keine neuen gespeicherten Daten.

## Hilfe *(mandatory)*

- **Neu**: "Wie verfolge ich die Spiele, wenn ein anderer Trainer tickert?" (`spiele-verfolgen`, Thema: Live-Spieltag, Quelle: 018 US1). Startbildschirm, "Spiele verfolgen", zurück mit "Spiel"; Verwalten weiter unter "Mehr" → "Live-Spieltag".
- **Geändert**: "Wie übernehme ich ein Spiel, das schon ein anderes Handy überträgt?" (`spiel-uebernehmen`): zuerst der Weg über den Startbildschirm ("E2 übernehmen", auch wenn das andere Handy nichts mehr sendet), dann die Rückfrage unter "Neues Spiel" wie bisher (Quelle zusätzlich: 018 US2).
- **Geändert**: "Wie kopple ich das Handy eines Trainers?" (`trainer-link`): "Danach steht unter „Neues Spiel“ „Live: …“" wird zu "Danach steht auf dem Startbildschirm „Spiele verfolgen“ mit dem Titel des Live-Spieltags" (Quelle zusätzlich: 018 US1).
- **Geändert**: "Wo finde ich was?" (`navigation`): "„Spiel“ für das laufende oder ein neues Spiel" wird um "Spiele verfolgen oder ein Spiel übernehmen" ergänzt (Quelle zusätzlich: 018 US1).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Vom Startbildschirm eines gekoppelten Trainer-Handys bis zum Dashboard genügt 1 Tipp (heute 2 Tipps und Scrollen).
- **SC-002**: Läuft ein Spiel eines anderen Handys, erscheint "Spiel übernehmen" bei Netz innerhalb von 5 Sekunden nach dem Öffnen des Startbildschirms; die Übernahme braucht von dort 2 Tipps (heute mindestens 4: "Neues Spiel", Mannschaft und Gegner, "Weiter zum Anpfiff", "Spiel übernehmen").
- **SC-003**: "Spiel fortsetzen", "Neues Spiel" und "Spiele verfolgen" sind sofort nach dem Start bedienbar, auch ohne Netz.
- **SC-004**: Auf dem iPhone SE (375 × 667 pt) sind ohne eigenes offenes Spiel, ohne Vormerkung und mit einem laufenden Spiel eines anderen Handys alle Möglichkeiten ohne Scrollen sichtbar.
- **SC-005**: Ohne Kopplung bleibt der Startbildschirm unverändert, und es verlässt keine zusätzliche Anfrage das Gerät.

## Assumptions

- Übernahme, Umrechnung der Uhr und Verhalten des abgebenden Handys stammen unverändert aus Spec 006 US6 (FR-L23, FR-L24); diese Spec ändert nur, wo man sie startet und für welche Spiele sie angeboten wird.
- Das Dashboard in der App ist dasselbe wie für Eltern, mit Spielplan (Spec 015 US3) und "Letzte Spiele" (Spec 007 US3).
- Das Home-Bildschirm-Symbol eines Trainers öffnet weiter den Startbildschirm; von dort ist "Spiele verfolgen" einen Tipp entfernt.
- Betroffene Specs bekommen bei der Umsetzung einen Nachtrag: Spec 012 FR-S04 (Zeile "Live: …" entfällt), Spec 006 FR-L17 (Dashboard auch über "Spiele verfolgen") und Spec 006 US6 (Übernehmen auch vom Startbildschirm).
- Der Startbildschirm lädt den Empfang nach, das Hauptbundle bleibt im Budget (< 60 KB gzip).

## Offene Fragen

Keine.
