# Feature Specification: Spiel korrigieren (Tore und Trikots, auch nach dem Spiel)

**Feature Branch**: `017-spiel-korrigieren` (Arbeitsbranch `claude/trusting-galileo-4sqx4m`)

**Created**: 2026-11-14

**Status**: Entwurf. Klärung im Chat erledigt (14.11.2026: "1A, 2A, 3A, 4A"). Review A und Review B offen.

**Input**: Atti (14.11.2026): "Was würde es bedeuten, für Trainer eine Funktion zu implementieren, die Änderungen während und nach dem Spiel zulässt? Geändert werden können soll die Farben der Mannschaften, die Tore und dessen Schützen sowie Vorlagengeber und deren Spielminute. Wie könnte das aussehen?"

## Ausgangslage

Gesichtet am 14.11.2026:

- **Spielbildschirm**: Ein Tipp auf ein Tor in der Torliste öffnet das Tor-Blatt mit "Tor entfernen" bzw. "Tor wiederherstellen", "Torschütze ändern", "Minute ändern" und (mit Schalter "Vorlagen") "Vorlage ändern" (Spec 001, 009, 012). Im "…"-Menü steht ab dem ersten Anpfiff "Tor nachtragen" (Spec 012 FR-S10). Das gilt während des Spiels und nach dem Schlusspfiff, solange der Spielbildschirm offen ist. Halbzeit- und Endstand folgen jeder Korrektur (FR-S14), Korrekturen gehen aufs Dashboard.
- **Nach dem Verlassen des Spiels**: Der Startbildschirm bietet "Spiel fortsetzen" nur für nicht beendete Spiele. Die Historie öffnet die Spieldetails; deren "Spielverlauf" ist nur lesbar. Ein beendetes Spiel lässt sich damit nicht mehr korrigieren.
- **Trikots**: Die Farben beider Mannschaften werden beim Anlegen gewählt (Spec 004 FR-M03, FR-M04) und sind danach fest. Die Gegnerfarbe merkt sich der Torticker je Gegnername als Vorschlag (FR-031).
- **Geteilter Text**: Ein schon in WhatsApp geteiltes Ergebnis ändert sich durch eine Korrektur nicht; nichts erinnert daran, es neu zu teilen.
- **Live-Dienst**: Er hält je Mannschaft die 10 jüngsten Spiele für "Letzte Spiele" vor (Spec 007 FR-N13), sortiert nach ihrer ersten Meldung. Ein Spiel, das dort schon herausgefallen ist, käme durch eine erneute Meldung als jüngstes zurück und verdrängte ein jüngeres.

## Clarifications

### Session 2026-11-14 (Klärung im Chat)

- Q: Wer korrigiert? → A: Nur das Handy, das das Spiel erfasst hat (1A). Kein "Spiel übernehmen" nach dem Schlusspfiff (Spec 006 US6 bleibt bei laufenden Spielen).
- Q: Wie lange nach dem Spiel? → A: Ohne Frist (2A).
- Q: Geänderte Gegnerfarbe merken? → A: Ja, als Vorschlag fürs nächste Spiel gegen diesen Gegner (3A). Die eigene Mannschaft unter "Meine Mannschaften" bleibt unverändert (Spec 004 FR-M03).
- Q: Nach einer Korrektur "Korrigiert, neu teilen?" anzeigen? → A: Ja (4A). Folgerung: nur bei beendeten Spielen, deren Ergebnis von diesem Handy schon geteilt wurde, und nur wenn sich der Teilen-Text dadurch ändert; vor dem ersten Teilen wäre "neu teilen" irreführend.
- Folgerungen mit Empfehlung, in Review A zu bestätigen: Die Spieldetails nutzen dieselben Blätter wie der Spielbildschirm (nichts Neues zu lernen); "Trikots ändern" mit "Übernehmen" wie "Minute ändern" und "Uhr korrigieren"; Karten, Wechsel, Lesezeichen und Elfmeterschießen bleiben in den Spieldetails nur lesbar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tore in den Spieldetails korrigieren (Priority: P1)

Am Sonntag fällt Atti in der Historie auf, dass beim 2:1 am Samstag Ben statt Max getroffen hat und das 1:1 in der 18. statt in der 15. Minute fiel. Er öffnet das Spiel in der Historie, tippt im "Spielverlauf" auf das Tor und korrigiert Torschütze, Vorlage und Minute mit denselben Blättern wie im Spiel. Ein vergessenes Tor trägt er mit "Tor nachtragen" nach. Spielstand, Spielverlauf, Teilen-Text und Dashboard stimmen danach.

**Why this priority**: Der eigentliche Wunsch. Heute ist ein Fehler nach dem Verlassen des Spielbildschirms nicht mehr zu beheben.

**Independent Test**: Beendetes Spiel 2 × 25 mit Toren in 10' (Max) und 40' (Gegner) in der Historie öffnen; Tor in 10' antippen, "Torschütze ändern", Ben; "Minute ändern", 12'; "Tor nachtragen", Feuerbach, 48', Torschütze Tom. Spielverlauf, Endstand 2:1 und Teilen-Text zeigen die Änderungen.

**Acceptance Scenarios**:

1. **Given** ein beendetes Spiel in der Historie, **When** die Spieldetails öffnen, **Then** lässt sich jedes Tor im "Spielverlauf" antippen (auch entfernte), und unter dem Spielverlauf steht "Tor nachtragen".
2. **Given** die Spieldetails, **When** ein eigenes Tor angetippt wird, **Then** öffnet das Tor-Blatt wie im Spiel: "Tor entfernen", "Torschütze ändern", "Minute ändern" und mit Schalter "Vorlagen" "Vorlage ändern"; bei einem entfernten Tor "Tor wiederherstellen" und "Torschütze ändern".
3. **Given** das Tor-Blatt eines eigenen Tores von Max, **When** "Torschütze ändern" gewählt und Ben getippt wird, **Then** zeigt der Spielverlauf Ben, ohne Countdown und ohne Folgeschritt "Vorlage von?"; die Auswahl zeigt das Aufgebot dieses Spiels und "Weitere Kinder" wie im Spiel.
4. **Given** das Tor-Blatt eines Gegentores, **When** "Torschütze ändern" gewählt wird, **Then** öffnet das Freitextfeld "Torschütze des Gegners" wie im Spiel.
5. **Given** ein Tor in 15', **When** "Minute ändern" gewählt und 18' übernommen wird, **Then** steht das Tor bei 18' an der richtigen Stelle des Spielverlaufs; Halbzeit- und Endstand, Torschütze, Vorlage und Elfmeter-Kennzeichen bleiben bzw. folgen wie im Spiel (Spec 012 FR-S12 bis FR-S14). Die Minutenauswahl bietet alle gespielten Minuten des Spiels, vorgewählt ist die bisherige Minute des Tores.
6. **Given** "Vorlagen" ist eingeschaltet, **When** bei einem eigenen Tor "Vorlage ändern" gewählt und Leo getippt wird, **Then** zeigt der Spielverlauf "Ben (Vorlage: Leo)"; "Ohne Vorlage" entfernt sie (Spec 009 US2).
7. **Given** die Spieldetails, **When** "Tor nachtragen" gewählt, die Mannschaft "Feuerbach E1" und die Minute "48'" gewählt und "Eintragen" getippt wird, **Then** zählt das Tor, steht an der richtigen Stelle mit dem Stand danach, und bei vorhandenem Aufgebot öffnet die Torschützen-Auswahl ohne Countdown. Vorgewählt ist die letzte gespielte Minute.
8. **Given** "Tor entfernen" in den Spieldetails, **Then** bleibt das Tor durchgestrichen mit "entfernt" im Spielverlauf und zählt nicht mehr; "Tor wiederherstellen" holt es zurück.
9. **Given** vor dem ersten Anpfiff oder nach Beginn eines Elfmeterschießens, **Then** fehlt "Tor nachtragen" (wie Spec 012 FR-S10); Tore lassen sich weiter antippen.
10. **Given** ein Spiel wurde live gesendet und gehört noch zu den 10 zuletzt angelegten Spielen seiner Mannschaft, **When** es in den Spieldetails korrigiert wird, **Then** zeigen Dashboard bzw. "Letzte Spiele" mit der nächsten Meldung den neuen Stand.
11. **Given** ein laufendes Spiel, **When** die Spieldetails über "…" → "Spieldetails" geöffnet werden, **Then** gelten dieselben Korrekturen; "Zum Spiel" bleibt.

---

### User Story 2 - Trikots ändern (Priority: P2)

Der Gegner läuft in Blau statt in dem gemerkten Schwarz auf, oder Feuerbach spielt in Leibchen. Der Trainer tippt im Spiel auf "…" → "Trikots ändern" und wählt die richtigen Farben; Tor-Knöpfe, Torliste und Dashboard zeigen sie sofort. Beim nächsten Spiel gegen diesen Gegner ist Blau vorgeschlagen. Dasselbe geht nachträglich in den Spieldetails.

**Why this priority**: Fällt meist erst beim Anpfiff auf; falsche Farben verwirren auf dem Dashboard, sind aber kein falsches Ergebnis.

**Independent Test**: Spiel gegen "TSV Musterstadt" mit Gegnertrikot Schwarz anlegen und anpfeifen; "…" → "Trikots ändern", beim Gegner "Ändern", Blau, "Übernehmen"; der Tor-Knopf des Gegners ist blau. Danach ein neues Spiel gegen "TSV Musterstadt" anlegen: Gegnertrikot Blau ist vorausgewählt.

**Acceptance Scenarios**:

1. **Given** ein Spiel (vor dem Anpfiff, laufend, in der Pause oder beendet), **When** das "…"-Menü öffnet, **Then** steht dort "Trikots ändern".
2. **Given** "Trikots ändern", **Then** öffnet das Blatt "Trikots" mit je einer Zeile für beide Mannschaften (Farbfeld, Farbname, "Ändern", Palette wie bei "Neues Spiel") und dem Knopf "Übernehmen".
3. **Given** beim Gegner wurde Blau gewählt, **When** "Übernehmen" getippt wird, **Then** sind Tor-Knopf und Farbmarken des Gegners blau, und das Dashboard zeigt Blau mit der nächsten Meldung. Wird das Blatt ohne "Übernehmen" geschlossen, bleibt alles wie vorher.
4. **Given** die Gegnerfarbe wurde in "TSV Musterstadt" auf Blau geändert und übernommen, **When** ein neues Spiel gegen "TSV Musterstadt" angelegt wird, **Then** ist Blau als Gegnertrikot vorausgewählt (FR-031).
5. **Given** das eigene Trikot wurde auf Gelb (Leibchen) geändert und übernommen, **Then** gilt das nur für dieses Spiel; Heim- und Auswärtstrikot unter "Meine Mannschaften" bleiben.
6. **Given** im Blatt haben beide Mannschaften dieselbe Farbe, **Then** steht darunter der Hinweis wie bei "Neues Spiel" ("Beide Mannschaften in derselben Farbe. …"); "Übernehmen" bleibt möglich.
7. **Given** die Spieldetails eines Spiels, **Then** zeigt die Kopfkarte die Trikotfarben beider Mannschaften als Farbmarken und "Trikots ändern", das dasselbe Blatt öffnet.

---

### User Story 3 - Erinnerung an neues Teilen (Priority: P2)

Atti hat das 2:1 nach dem Spiel in die Elterngruppe geteilt. Am Abend korrigiert er den Torschützen. Die App zeigt "Korrigiert. Ergebnis neu teilen?" mit "Teilen"; ein Tipp öffnet das Teilen mit dem korrigierten Text.

**Why this priority**: Ohne Erinnerung steht in der Elterngruppe weiter der alte Torschütze; klein, aber ohne US1 wertlos.

**Independent Test**: Beendetes Spiel, "Ergebnis teilen" (Zwischenablage), dann in den Spieldetails einen Torschützen ändern; die Leiste "Korrigiert. Ergebnis neu teilen?" erscheint, "Teilen" teilt den neuen Text.

**Acceptance Scenarios**:

1. **Given** das Ergebnis eines beendeten Spiels wurde von diesem Handy geteilt, **When** danach im Spiel oder in den Spieldetails etwas korrigiert wird, das den Teilen-Text ändert (Tor nachtragen, entfernen, wiederherstellen, Torschütze, Vorlage, Minute, Gegnertrikot, Heim und Gast tauschen, Karten und Wechsel), **Then** erscheint unten die Leiste "Korrigiert. Ergebnis neu teilen?" mit dem Knopf "Teilen".
2. **Given** die Leiste, **When** "Teilen" getippt wird, **Then** öffnet das Teilen mit dem aktuellen Text (wie "Ergebnis teilen") und die Leiste verschwindet.
3. **Given** die Leiste, **Then** verschwindet sie nach 10 Sekunden ohne Tipp, beim Verlassen des Bildschirms oder bei der nächsten Korrektur (die sie neu zeigt).
4. **Given** das Ergebnis wurde noch nicht geteilt (oder nur "Zwischenstand teilen" während des Spiels), **Then** erscheint keine Leiste.
5. **Given** eine Änderung, die den Teilen-Text nicht ändert (z. B. nur das eigene Trikot, ein Lesezeichen), **Then** erscheint keine Leiste.
6. **Given** das Spiel ist noch nicht beendet, **Then** erscheint keine Leiste.

---

### Edge Cases

- **Spiel eines anderen Handys** (Dashboard-Karte, Spiel übernommen und abgegeben): Korrigiert wird nur auf dem Handy, das das Spiel erfasst hat (1A). Auf einem Handy, das das Spiel abgegeben hat (Spec 006 FR-L24), wirkt eine Korrektur nur lokal.
- **Alte Spiele**: Gehört ein live gesendetes Spiel nicht mehr zu den 10 zuletzt angelegten Spielen seiner Mannschaft auf diesem Handy, bleibt die Korrektur lokal. So verdrängt es unter "Letzte Spiele" kein jüngeres Spiel. Spiele aus einer Sicherung, die vor der Kopplung angelegt wurden, werden weiter nicht gesendet (Spec 006 FR-L06).
- **"Nicht live senden"**: Korrekturen bleiben lokal, wie jede Änderung.
- **Offline**: Korrekturen werden sofort gespeichert; das Dashboard bekommt sie mit der nächsten Verbindung, wie jede Änderung.
- **Kader geändert**: Die Torschützen-Auswahl zeigt das Aufgebot dieses Spiels und "Weitere Kinder" aus dem heutigen Kader. Ein inzwischen gelöschtes Kind bleibt als Torschütze bzw. Vorlage stehen, bis es geändert wird.
- **Uhr**: Korrekturen ändern die Uhr nicht (Spec 012 US2-S7). "Uhr korrigieren" und "Pfiff zurücknehmen" bleiben nur im Spielbildschirm mit ihren Regeln.
- **Elfmeterschießen**: Schüsse lassen sich nicht korrigieren; Tore der regulären Spielzeit und der Verlängerung schon (Edge Case aus Spec 012).
- **Spiel aus dem Spielplan** (Spec 015): Trikots ändern wirkt nur auf das Spiel, nicht auf den Spielplan.
- **Gleiche Farbe**: erlaubt, mit Hinweis (US2-S6).
- **Teilen abgebrochen**: Ein abgebrochenes Teilen zählt nicht als geteilt; "In die Zwischenablage kopiert" zählt als geteilt.
- **Zuschauer**: Eltern ohne Trainer-Handy können nichts korrigieren; der Zuschauer-Link bleibt nur lesbar.

## Requirements *(mandatory)*

### Functional Requirements

**Tore in den Spieldetails (US1)**

- **FR-C01**: Jedes Tor im "Spielverlauf" der Spieldetails MUSS antippbar sein und das Tor-Blatt mit denselben Einträgen und Regeln wie im Spielbildschirm öffnen ("Tor entfernen" bzw. "Tor wiederherstellen", "Torschütze ändern", "Minute ändern", "Vorlage ändern"; Spec 001, 009, 012). Karten, Wechsel und Lesezeichen bleiben nur lesbar.
- **FR-C02**: "Torschütze ändern" und "Vorlage ändern" MÜSSEN dieselbe Auswahl wie im Spiel öffnen (Aufgebot, "Weitere Kinder", Sortierung nach Spec 013; beim Gegner Freitext), ohne Countdown und ohne Folgeschritt.
- **FR-C03**: "Minute ändern" MUSS alle gespielten Minuten des Spiels anbieten (Spec 012 FR-S11), vorgewählt die bisherige Minute des Tores.
- **FR-C04**: Unter dem Spielverlauf MUSS "Tor nachtragen" stehen, mit denselben Regeln wie im "…"-Menü (Spec 012 FR-S10, FR-S11, FR-S13).
- **FR-C05**: Jede Korrektur MUSS sofort gespeichert werden; Spielstand in der Kopfkarte, Spielverlauf, Halbzeit- und Endstand, Teilen-Text und Historie folgen (Spec 012 FR-S13, FR-S14).
- **FR-C06**: Korrekturen eines live gesendeten Spiels MÜSSEN wie jede Änderung aufs Dashboard gehen (Karte bzw. "Letzte Spiele"), auch nach dem Schlusspfiff und ohne Frist; außer das Spiel gehört nicht mehr zu den 10 zuletzt angelegten Spielen seiner Mannschaft auf diesem Handy, dann bleiben sie lokal.

**Trikots (US2)**

- **FR-C10**: Das "…"-Menü des Spielbildschirms MUSS in jedem Zustand "Trikots ändern" anbieten; die Kopfkarte der Spieldetails MUSS beide Trikotfarben als Farbmarken und "Trikots ändern" zeigen.
- **FR-C11**: "Trikots ändern" MUSS das Blatt "Trikots" öffnen: je Mannschaft eine Zeile wie bei "Neues Spiel" (Spec 004 FR-M03, FR-M04: Farbfeld, Farbname, "Ändern" mit Palette aus `design/trikot-farben.json`), darunter bei gleicher Farbe der Hinweis aus "Neues Spiel", und "Übernehmen". Schließen ohne "Übernehmen" ändert nichts.
- **FR-C12**: "Übernehmen" MUSS beide Farben für dieses Spiel setzen; Tor-Knöpfe, Farbmarken, Teilen-Text und Dashboard folgen.
- **FR-C13**: Eine geänderte Gegnerfarbe MUSS als Vorschlag für diesen Gegnernamen gemerkt werden (FR-031). Die eigene Farbe gilt nur für dieses Spiel; "Meine Mannschaften" bleibt unverändert.

**Erinnerung an neues Teilen (US3)**

- **FR-C20**: Das Spiel MUSS sich merken, dass sein Ergebnis über "Ergebnis teilen" geteilt wurde (geteilt oder in die Zwischenablage kopiert; nicht bei Abbruch und nicht über "Zwischenstand teilen").
- **FR-C21**: Ändert eine Korrektur an einem beendeten, schon geteilten Spiel den Teilen-Text, MUSS im Spielbildschirm bzw. in den Spieldetails die Leiste "Korrigiert. Ergebnis neu teilen?" mit "Teilen" erscheinen, gestaltet wie die Leiste "Rückgängig". Sie verschwindet nach 10 Sekunden, beim Verlassen des Bildschirms oder nach "Teilen".
- **FR-C22**: "Teilen" in der Leiste MUSS wie "Ergebnis teilen" den aktuellen Text teilen.

### Key Entities

- **Spiel**: Trikotfarben beider Mannschaften (bisher fest, jetzt änderbar); neu, optional: Zeitpunkt, zu dem das Ergebnis zuletzt von diesem Handy geteilt wurde (FR-C20). Geht nicht an den Dienst; ältere Sicherungen ohne dieses Feld bleiben gültig.
- **Einstellungen**: gemerkte Gegnerfarben je Gegnername (FR-031), jetzt auch aus "Trikots ändern".
- Live-Meldung und Dienst bleiben unverändert (Trikotfarben und Tore stehen schon in der Meldung).

## Hilfe *(mandatory)*

| Eintrag | Änderung | Quelle |
|---|---|---|
| `spiel-korrigieren` "Wie korrigiere ich ein Spiel nach dem Schlusspfiff?" | neu: Historie, Spiel antippen, im Spielverlauf auf das Tor tippen; "Tor nachtragen"; "Trikots ändern"; Leiste "Korrigiert. Ergebnis neu teilen?" | 017 US1, 017 US2, 017 US3 |
| `torschuetze` "Wie trage ich den Torschützen nach?" | geändert: auch in den Spieldetails | 001 US3, 017 US1 |
| `vorlage-aendern` "Wie ändere oder entferne ich eine Vorlage?" | geändert: auch in den Spieldetails | 009 US2, 017 US1 |
| `tor-minute` "Wie ändere ich die Minute eines Tores?" | geändert: auch in den Spieldetails | 012 US2, 017 US1 |
| `tor-nachtragen` "Wie trage ich ein vergessenes Tor nach?" | geändert: auch in den Spieldetails | 012 US2, 017 US1 |
| `tor-entfernen` "Wie entferne ich ein Tor?" | geändert: auch in den Spieldetails | 001 US1, 017 US1 |
| `trikots` "Wie ändere ich die Trikotfarben für ein Spiel?" | geändert: auch im Spiel und danach über "Trikots ändern"; Gegnerfarbe wird gemerkt | 004 US2, 017 US2 |
| `historie` "Wo finde ich frühere Spiele?" | geändert: in den Spieldetails lassen sich Tore und Trikots korrigieren | 001 US6, 017 US1 |
| `ergebnis-teilen` "Wie teile ich das Ergebnis in WhatsApp?" | geändert: nach einer Korrektur erinnert die Leiste an neues Teilen | 001 US4, 017 US3 |

## Success Criteria *(mandatory)*

- **SC-C01**: Ein falscher Torschütze in einem Spiel der Vorwoche ist aus der Historie mit 4 Tipps korrigiert (Spiel, Tor, "Torschütze ändern", Name).
- **SC-C02**: Die Gegnerfarbe ist während des Spiels mit 5 Tipps geändert ("…", "Trikots ändern", "Ändern", Farbe, "Übernehmen").
- **SC-C03**: Korrigieren in den Spieldetails nutzt dieselben Blätter und Bezeichnungen wie der Spielbildschirm; kein neuer Bedienschritt ist zu lernen.
- **SC-C04**: Domain-Logik (Trikots ändern, Gegnerfarbe merken, Erinnerung an neues Teilen, Sendegrenze alter Spiele) mit 100 % Branch-Coverage.
- **SC-C05**: Spielbildschirm bleibt auf dem iPhone SE ohne Scrollen (FR-033); alle bestehenden E2E-Tests bleiben ohne Änderung an ihren Abläufen grün.

## Assumptions

- Keine neue Laufzeit-Abhängigkeit, keine Änderung am Dienst (Cloudflare) und an der Live-Meldung.
- Die Blätter des Spielbildschirms (Tor-Blatt, Torschützen- und Vorlagen-Auswahl, Freitext Gegner, "Minute ändern", "Tor nachtragen") werden in den Spieldetails wiederverwendet, nicht nachgebaut.
- Spec 006 US6 ("Spiel übernehmen") bleibt bei laufenden Spielen (1A). Ein Trainer, der ein fremd getickertes Spiel korrigieren will, bittet das tickernde Handy darum.
- Ohne Frist (2A): Auch Spiele aus dem Vorjahr lassen sich lokal korrigieren; aufs Dashboard geht nur, was FR-C06 erlaubt.
- "Korrigiert. Ergebnis neu teilen?" ist eine Erinnerung, keine Garantie: Ob der Text in WhatsApp angekommen ist, weiß die App nicht.
