# Feature Specification: Historie – mehrere Spiele auf einmal löschen

**Feature Branch**: `013-historie-mehrfach-loeschen` (umgesetzt auf `claude/charming-einstein-v3f3aw`)

**Created**: 2026-11-05

**Status**: Draft, Review A und B offen. Mockup: https://claude.ai/artifact/WwNnBCdbaEVFLPjedwcyGs

**Input**: Atti, 05.11.2026: "Beim Löschen der Historie würde ich mir ein Multi-Select und Select-All wünschen."

## Ausgangslage

- Ein Spiel lässt sich heute nur einzeln löschen: Historie, Spiel öffnen, in den Spieldetails "Löschen …", Abfrage "Spiel wirklich löschen?" mit "Löschen" (001 FR-038). Das sind drei Tipps je Spiel; zehn Testspiele vor dem ersten echten Spieltag kosten 30 Tipps.
- Nach dem Löschen gibt es kein Zurück außer einer Sicherung (001 FR-024).
- Im Spiel gibt es für Tore und Ereignisse schon eine Leiste "Rückgängig", 10 Sekunden lang (001 US1-S4).

## Clarifications

### Session 2026-11-05 (vor Review A)

- Q: Wie startet die Auswahl? → A: Knopf "Auswählen" oben rechts in der Historie. Danach hat jede Zeile ein Häkchen-Feld, unten erscheint eine Leiste mit "Alle auswählen" und "Löschen (n)"; "Fertig" beendet die Auswahl. Kein langes Drücken (Constitution I: keine Geste als einziger Weg).
- Q: "Alle auswählen" bei aktivem Mannschaftsfilter? → A: Nur die sichtbaren Spiele. Was man sieht, wird gelöscht.
- Q: Laufende oder nicht angepfiffene Spiele? → A: Nicht auswählbar (ausgegraut). Einzeln löschen geht weiter über die Spieldetails.
- Q: Sicherheitsnetz? → A: Eine Abfrage mit Anzahl, danach einige Sekunden "Rückgängig".
- Empfehlungen, in Review A zu bestätigen: "Rückgängig" 10 Sekunden lang wie im Spiel; "Rückgängig" auch nach dem Einzellöschen in den Spieldetails (US3); die Aktionsleiste steht über der Navigationsleiste, die Navigation bleibt sichtbar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mehrere Spiele auswählen und löschen (Priority: P1)

Vor dem ersten echten Spieltag hat Atti fünf Testspiele in der Historie. Er tippt "Auswählen", hakt die fünf Testspiele an, tippt "Löschen (5)" und bestätigt. Die echten Spiele bleiben.

**Why this priority**: Kern des Wunsches. Spart bei n Spielen rund 2n Tipps und das ständige Hin und Her zwischen Historie und Spieldetails.

**Independent Test**: Drei beendete Spiele anlegen; Historie, "Auswählen", zwei Spiele anhaken, "Löschen (2)", "Löschen"; das dritte Spiel bleibt.

**Acceptance Scenarios**:

1. **Given** die Historie mit mindestens einem beendeten Spiel, **Then** steht oben rechts der Knopf "Auswählen".
2. **Given** die Historie, **When** "Auswählen" getippt wird, **Then** zeigt jede Zeile links ein Häkchen-Feld, oben rechts steht "Fertig" statt "Auswählen", die Zeile unter dem Titel zeigt "0 ausgewählt" und über der Navigationsleiste erscheint eine Leiste mit "Alle auswählen" und "Löschen (0)" (gesperrt).
3. **Given** der Auswahlmodus, **When** eine Zeile eines beendeten Spiels angetippt wird, **Then** wird sie angehakt (erneutes Tippen hebt das auf), die Spieldetails öffnen nicht, und Zähler und Knopf zeigen die Anzahl ("2 ausgewählt", "Löschen (2)").
4. **Given** zwei angehakte Spiele, **When** "Löschen (2)" getippt wird, **Then** fragt die App "2 Spiele löschen?" mit dem Text "Sie verschwinden aus der Historie. Du kannst das gleich danach rückgängig machen, später nur über eine Sicherung." und den Knöpfen "Abbrechen" und "Löschen".
5. **Given** die Abfrage aus Szenario 4, **When** "Löschen" getippt wird, **Then** verschwinden beide Spiele aus der Historie, der Auswahlmodus endet und die Leiste "2 Spiele gelöscht" mit "Rückgängig" erscheint (US3).
6. **Given** die Abfrage aus Szenario 4, **When** "Abbrechen" getippt wird, **Then** bleiben beide Spiele erhalten und angehakt, der Auswahlmodus bleibt.
7. **Given** der Auswahlmodus, **When** "Fertig" getippt wird, **Then** endet er ohne Änderung; Zeilen öffnen wieder die Spieldetails.
8. **Given** der Auswahlmodus mit einem laufenden und einem nicht angepfiffenen Spiel, **Then** sind deren Zeilen ausgegraut ohne Häkchen-Feld und nicht anwählbar; unter den Filtern steht "Nur beendete Spiele lassen sich auswählen. Laufende löschst du in den Spieldetails."

---

### User Story 2 - Alle auswählen (Priority: P1)

Nach einer Saison will Atti die Historie der E2 leeren, die E1-Spiele aber behalten. Er wählt den Filter "E2", tippt "Auswählen", "Alle auswählen" und "Löschen (14)".

**Why this priority**: Zweiter Teil des Wunsches; ohne ihn bleibt das Leeren einer langen Historie mühsam.

**Independent Test**: Beendete Spiele der E1 (2) und der E2 (3); Filter "E2", "Auswählen", "Alle auswählen", "Löschen (3)", "Löschen"; die zwei E1-Spiele bleiben.

**Acceptance Scenarios**:

1. **Given** der Auswahlmodus, **When** "Alle auswählen" getippt wird, **Then** sind alle sichtbaren beendeten Spiele angehakt und der Knopf heißt "Alle abwählen".
2. **Given** alle sichtbaren beendeten Spiele sind angehakt, **When** "Alle abwählen" getippt wird, **Then** ist keines mehr angehakt und "Löschen (0)" ist gesperrt.
3. **Given** der Filter "E2" ist aktiv, **When** "Alle auswählen" getippt wird, **Then** sind nur die beendeten E2-Spiele angehakt; nach dem Löschen sind alle E1-Spiele unverändert da.
4. **Given** Spiele sind angehakt, **When** der Nutzer den Filter wechselt, **Then** bleiben nur angehakte Spiele angehakt, die unter dem neuen Filter sichtbar sind; Zähler und "Löschen (n)" passen sich an.
5. **Given** ein laufendes Spiel ist sichtbar, **When** "Alle auswählen" getippt wird, **Then** bleibt es unangehakt.
6. **Given** alle Spiele wurden gelöscht, **Then** zeigt die Historie den leeren Zustand "Noch keine Spiele. …", "Auswählen" fehlt und die Leiste "… gelöscht" mit "Rückgängig" bleibt bis zum Ablauf sichtbar.

---

### User Story 3 - Löschen rückgängig machen (Priority: P2)

Atti hat beim Aufräumen aus Versehen auch das Pokalspiel angehakt. Direkt nach dem Löschen tippt er "Rückgängig"; alle gelöschten Spiele sind wieder da. Dasselbe gilt, wenn er ein einzelnes Spiel in den Spieldetails löscht.

**Why this priority**: Von Atti gewünschtes Sicherheitsnetz. Mit "Alle auswählen" ist ein Versehen teurer als beim Einzellöschen.

**Independent Test**: Zwei beendete Spiele mit Toren löschen, innerhalb von 10 Sekunden "Rückgängig"; beide Spiele sind mit allen Toren, Ereignissen und Zeiten wieder in der Historie.

**Acceptance Scenarios**:

1. **Given** Spiele wurden gerade gelöscht, **Then** zeigt die Historie 10 Sekunden lang die Leiste "3 Spiele gelöscht" (bei einem: "1 Spiel gelöscht") mit dem Knopf "Rückgängig".
2. **Given** die Leiste aus Szenario 1, **When** "Rückgängig" getippt wird, **Then** sind alle Spiele dieses Löschvorgangs unverändert wieder in der Historie (Tore, Ereignisse, Zeiten, Ergebnis), an ihrer alten Stelle.
3. **Given** die Leiste aus Szenario 1, **When** 10 Sekunden ohne "Rückgängig" vergehen, **Then** verschwindet die Leiste und das Löschen ist endgültig.
4. **Given** die Leiste aus Szenario 1, **When** der Nutzer die Historie verlässt (anderer Reiter, Spiel öffnen) oder die App in den Hintergrund geht, **Then** ist das Löschen sofort endgültig.
5. **Given** die Leiste aus Szenario 1, **When** der Nutzer erneut Spiele auswählt und löscht, **Then** ist der erste Löschvorgang endgültig und die Leiste gilt für den neuen.
6. **Given** ein einzelnes Spiel wird in den Spieldetails mit "Löschen …" und "Löschen" gelöscht, **Then** öffnet die Historie mit der Leiste "1 Spiel gelöscht" und "Rückgängig"; die Abfrage in den Spieldetails nennt "Du kannst das gleich danach rückgängig machen, später nur über eine Sicherung."
7. **Given** ein gelöschtes Spiel war auf dem Eltern-Dashboard zu sehen (Spec 006), **Then** verschwindet es dort erst, wenn das Löschen endgültig ist; nach "Rückgängig" bleibt es dort ohne Unterbrechung sichtbar.

---

### Edge Cases

- **Keine beendeten Spiele sichtbar** (nur laufende, leere Historie oder Filter ohne beendete Spiele): "Auswählen" fehlt bzw. "Alle auswählen" ist gesperrt.
- **Spiel endet während des Auswahlmodus** (Schlusspfiff auf demselben Handy ist nicht möglich, weil man dafür die Historie verlässt): Der Auswahlmodus endet beim Verlassen der Historie; beim Zurückkommen ist er aus.
- **Viele Spiele** (z. B. 100 nach einer Saison): "Alle auswählen" und das Löschen dauern gefühlt nicht länger als bei einem Spiel; die Abfrage nennt die Zahl ("100 Spiele löschen?").
- **Live-Spieltag** (Spec 006): Nur beendete Spiele sind auswählbar; ein laufendes, live gesendetes Spiel kann über die Mehrfachauswahl nie gelöscht werden. Endgültig gelöschte Spiele melden das Löschen wie bisher (FR-L06); übernommene Spiele senden kein "gelöscht" (FR-L24).
- **App wird während "Rückgängig" geschlossen oder abgeschossen**: Das Löschen gilt als endgültig, sobald die App in den Hintergrund geht. Wird sie ohne diesen Schritt beendet (Absturz), sind die Spiele beim nächsten Start noch da; im Zweifel bleibt ein Spiel erhalten.
- **iPhone SE** (375 × 667): Aktionsleiste und Navigationsleiste verdecken keine Zeile; die letzte Zeile lässt sich über beide hinaus scrollen.
- **Bildschirmleser**: Häkchen-Felder sind als ankreuzbar angesagt ("Spiel gegen TSV Weilimdorf vom 02.11.26, nicht ausgewählt"); ausgegraute Zeilen sind als nicht verfügbar angesagt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-D01**: Die Historie MUSS oben rechts den Knopf "Auswählen" zeigen, sobald mindestens ein beendetes Spiel sichtbar ist.
- **FR-D02**: Im Auswahlmodus MUSS jede Zeile eines beendeten Spiels ein Häkchen-Feld zeigen; ein Tipp auf die Zeile hakt an bzw. ab und öffnet nicht die Spieldetails. Oben rechts steht "Fertig", unter dem Titel "n ausgewählt".
- **FR-D03**: Laufende und nicht angepfiffene Spiele MÜSSEN im Auswahlmodus ausgegraut und nicht anwählbar sein; ein Hinweis nennt, dass sie in den Spieldetails gelöscht werden.
- **FR-D04**: Im Auswahlmodus MUSS über der Navigationsleiste eine Leiste mit "Alle auswählen" (bzw. "Alle abwählen", wenn alle sichtbaren beendeten Spiele angehakt sind) und "Löschen (n)" stehen; "Löschen (0)" ist gesperrt.
- **FR-D05**: "Alle auswählen" MUSS genau die unter dem aktiven Filter sichtbaren beendeten Spiele anhaken. Beim Filterwechsel MÜSSEN angehakte, nicht mehr sichtbare Spiele abgehakt werden.
- **FR-D06**: "Löschen (n)" MUSS einmal nachfragen ("n Spiele löschen?" bzw. "1 Spiel löschen?"); erst nach "Löschen" verschwinden die Spiele, "Abbrechen" ändert nichts.
- **FR-D07**: Nach jedem Löschen (mehrere in der Historie oder einzeln in den Spieldetails) MUSS die Historie 10 Sekunden lang "n Spiele gelöscht" bzw. "1 Spiel gelöscht" mit "Rückgängig" zeigen. "Rückgängig" stellt alle Spiele dieses Vorgangs vollständig wieder her.
- **FR-D08**: Das Löschen MUSS endgültig werden, wenn die 10 Sekunden ablaufen, der Nutzer die Historie verlässt, die App in den Hintergrund geht oder ein neuer Löschvorgang beginnt. Erst dann wird das Löschen an das Eltern-Dashboard gemeldet (Spec 006 FR-L06).
- **FR-D09**: Die Abfragen (Mehrfach- und Einzellöschen) MÜSSEN nennen, dass das Löschen gleich danach rückgängig zu machen ist und später nur über eine Sicherung.
- **FR-D10**: Der Auswahlmodus MUSS beim Verlassen der Historie enden; beim nächsten Öffnen ist nichts angehakt.

### Key Entities

- **Auswahl**: Menge der angehakten Spiele im Auswahlmodus; lebt nur auf dem Bildschirm, wird nicht gespeichert.
- **Löschvorgang**: die zuletzt gelöschten Spiele mit vollständigem Inhalt und Ablaufzeit für "Rückgängig"; höchstens einer gleichzeitig.

## Hilfe *(mandatory)*

| Eintrag | Änderung | Quelle |
|---|---|---|
| `spiele-loeschen-mehrere` "Wie lösche ich mehrere Spiele auf einmal?" | neu: "Auswählen", Spiele antippen bzw. "Alle auswählen" (nur sichtbare, nur beendete), "Löschen (n)", "Rückgängig" | 013 US1, 013 US2 |
| `spiel-loeschen` "Wie lösche ich ein Spiel?" | geändert: nach dem Löschen 10 Sekunden "Rückgängig"; Verweis auf mehrere Spiele | 001 US6, 013 US3 |
| `historie` "Wo finde ich frühere Spiele?" | geändert: Verweis (verwandt) auf `spiele-loeschen-mehrere` | 001 US6, 013 US1 |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-D01**: Zehn beendete Testspiele sind mit höchstens 4 Tipps gelöscht ("Auswählen", "Alle auswählen", "Löschen (10)", "Löschen"), statt heute 30.
- **SC-D02**: Über die Mehrfachauswahl lässt sich in keinem Testfall ein laufendes oder nicht angepfiffenes Spiel löschen.
- **SC-D03**: Ein versehentliches Löschen ist innerhalb von 10 Sekunden mit einem Tipp vollständig rückgängig; die wiederhergestellten Spiele gleichen den gelöschten in allen gespeicherten Angaben.
- **SC-D04**: Auf dem iPhone SE sind alle Knöpfe des Auswahlmodus mindestens 48 pt hoch, und jede Zeile ist über Aktions- und Navigationsleiste hinaus erreichbar; axe-core meldet keine Verstöße in hell und dunkel.

## Assumptions

- Keine neue Laufzeit-Abhängigkeit; die Leiste "Rückgängig" nutzt das vorhandene Muster aus dem Spielbildschirm.
- Gelöscht wird weiterhin nur auf diesem Handy; andere Handys (z. B. eines Trainerkollegen) behalten ihre eigenen Spiele.
- Kein Auswählen eines ganzen Monats per Tipp auf die Monatsüberschrift (YAGNI); "Alle auswählen" zusammen mit dem Filter reicht.
- Kein Teilen oder Sichern nur der ausgewählten Spiele; die Auswahl dient nur dem Löschen.
- 10 Sekunden für "Rückgängig" wie bei Toren und Ereignissen (001 US1-S4).
