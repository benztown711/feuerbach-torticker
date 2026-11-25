# Feature Specification: Spiel läuft schon (Einstieg ins laufende Spiel)

**Feature Branch**: `023-spiel-laeuft-schon` (Arbeitszweig `claude/confident-bohr-1yzwnf`)

**Created**: 2026-11-25

**Status**: Klärung, Review A und Review B erledigt (25.11.2026, "Passt, setz es um"). Umsetzung in PR #98. Mockup: https://claude.ai/artifact/T6uhaUepzaREv6b4QjPMkz

**Input**: Atti (25.11.2026): "Man guckt sich um und niemand tickert. Das Spiel läuft schon und dann möchte man gerne anfangen. […] Mein Use Case: Man fängt während eines laufenden Spiels an zu tickern. Dann gibt es schon einen Spielstand, auf den man aufsetzt. […] Ich möchte die Uhrzeit anpassen können, entweder die verbleibende Spielzeit oder die wievielte Spielminute. Restlaufzeit ist einfacher. […] Muss man bei 7:4 elf Tore händisch eintickern, oder gibt es eine einfache Variante? Das wäre das i-Tüpfelchen."

## Ausgangslage

Gesichtet am 25.11.2026 im Code:

- **Heutiger Behelf** (Atti, Spieltag 22.11.): Tore schnell einzeln tippen, "Pausenpfiff", nächster Abschnitt "Anpfiff", wieder Tore, bis der aktuelle Abschnitt läuft. Die Uhr beginnt dabei beim Anpfiff des aktuellen Abschnitts bei 0; das Dashboard zeigte z. B. noch 24:30 Restzeit statt 7 Minuten.
- **"Uhr korrigieren"** (Spec 012 US4, FR-S20 bis FR-S23) hilft dabei nicht: Es verstellt nur in Schritten von einer Minute und verschiebt den Anpfiff höchstens bis zum vorigen Uhr-Ereignis. Beim Behelf liegt der Pausenpfiff Sekunden vor dem Anpfiff, also gibt es keinen Spielraum, und der Eintrag fehlt im "…"-Menü. Ein Tor im Abschnitt sperrt zusätzlich das Zurückstellen.
- **Spielstand**: Jedes Tor braucht einen Tipp, eine Minute (aus der Uhr) und gehört zu einem Abschnitt. Halbzeitstand, Teilen-Text, Spieldetails und Dashboard zählen die Tore (Live-Meldung: `goals`, Spec 006).

## Clarifications

### Session 2026-11-25 (Klärung im Chat)

- Q: Wo gibt man an, dass das Spiel schon läuft? → A: Beides: Knopf "Spiel läuft schon" vor dem Anpfiff auf dem Spielbildschirm und Schalter "Spiel läuft schon" in "Neues Spiel".
- Q: Zeitangabe? → A: Restzeit ("Noch 7 Min") mit −5/−1/+1/+5, darunter klein die Spielminute.
- Q: Bisheriger Spielstand? → A: Spielstand mit +/− eingeben; die App legt die Tore als "vor Tickerbeginn" an. Sie zählen sofort, auch auf dem Dashboard. Durch Antippen lassen sich Torschütze und Vorlage nachtragen. Keine eigene Funktion zum Umsortieren (Atti: "können wir weglassen").
- Q: "Uhr korrigieren" mit verbessern? → A: Ja: Restzeit direkt mit −5/−1/+1/+5; liegt der Anpfiff zu nah am vorigen Pfiff, rückt der bisherige Verlauf mit.

- Review A (25.11.2026): "Passt".
- Festlegung bei der Umsetzung (Screenshot iPhone SE): "Spiel läuft schon" steht neben statt unter "Anpfiff", sonst schieben zwei Knopfzeilen die Tor-Knöpfe unter die Navigation. Der Schalter in "Neues Spiel" steht in der Karte "Spielzeit".

### Session 2026-11-25 (Review B, Mockup)

- Atti: "Es wäre noch schön, wenn man beim Einstieg mit Spielstand die Trikotfarbe ändern könnte." → Im Blatt "Spiel läuft schon" steht neben "Spielstand" der Link "Trikots ändern"; er öffnet das bekannte Blatt "Trikots" (Spec 017 US2) und kehrt nach "Übernehmen" bzw. Schließen ins Blatt zurück. Wer am Platz einsteigt, sieht erst dort, in welchen Farben gespielt wird.

- Folgerungen mit Empfehlung, in Review A bestätigt:
  - **Einstieg in einer Pause** ist wählbar ("Halbzeit" bzw. "Pause" zwischen zwei Abschnitten); dann gibt es keine Restzeit, der nächste Schritt ist wie gewohnt "Anpfiff 2. Halbzeit".
  - **Halbzeitstand**: Beim Einstieg in der 1. Halbzeit oder in der Halbzeitpause ist er bekannt (Tore vor Tickerbeginn gehören zur 1. Halbzeit). Beim Einstieg ab der 2. Halbzeit ist er unbekannt und entfällt im Teilen-Text.
  - **Minute nachtragen**: "Minute ändern" bleibt für Tore vor Tickerbeginn möglich; danach ist es ein normales Tor mit Minute und steht im Verlauf an seiner Stelle. So lässt sich die Reihenfolge nebenbei richtigstellen, ohne eigene Funktion.
  - **Rückgängig**: Nach "Übernehmen" erscheint die Leiste "Rückgängig" wie nach einem Tor; sie stellt den Zustand vor dem Einstieg wieder her.
  - **Verlängerung und Elfmeterschießen** sind kein Einstiegspunkt (selten, YAGNI); wer dort einsteigt, wählt den letzten regulären Abschnitt mit Restzeit 0.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ins laufende Spiel einsteigen (Priority: P1)

Atti kommt im 3. Drittel an den Platz, niemand tickert. Er legt das Spiel an, tippt "Spiel läuft schon", wählt "3. Drittel", stellt "Noch 7 Min" ein und tippt "Übernehmen". Die Uhr zeigt 07:00 Restzeit und läuft; Eltern auf dem Dashboard sehen dieselbe Restzeit.

**Why this priority**: Der Kern des Wunsches. Ohne richtige Uhr kommt der Pfiff zur falschen Zeit und das Dashboard zeigt Unsinn.

**Independent Test**: Spiel 3 × 15 anlegen, "Spiel läuft schon", "3. Drittel", −5, −1, −1, −1 (Noch 7 Min), "Übernehmen": Uhr 07:00 Restzeit, Abschnitt "3. Drittel", Spielminute 39'.

**Acceptance Scenarios**:

1. **Given** ein angelegtes Spiel vor dem ersten Anpfiff, **Then** steht neben "Anpfiff" der Zweitknopf "Spiel läuft schon" (beide mindestens 64 pt hoch, auf dem iPhone SE ohne Scrollen).
2. **Given** "Spiel läuft schon" wird getippt, **Then** öffnet das Blatt "Spiel läuft schon" mit "Abschnitt" (Auswahl aller Abschnitte und der Pausen dazwischen, z. B. "1. Halbzeit", "Halbzeit", "2. Halbzeit"), "Restzeit" ("Noch 15 Min" mit "−5", "−1", "+1", "+5", darunter "= 1. Minute"), "Spielstand" (je Mannschaft "−" und "+") und "Übernehmen". Vorgewählt: erster Abschnitt, volle Restzeit, 0:0.
3. **Given** "3. Drittel" und "Noch 7 Min" bei 3 × 15, **When** "Übernehmen" getippt wird, **Then** läuft die Uhr im 3. Drittel mit 07:00 Restzeit (Spielminute 39'), die Abschnitte davor gelten als gespielt, und "Pausenpfiff"/"Schlusspfiff", Signal bei 00:00, Nachspielzeit und Dashboard verhalten sich wie bei einem von Anfang an getickerten Spiel.
4. **Given** die Restzeit, **Then** reicht sie von 0 bis zur Abschnittslänge; "−" bzw. "+" sind an den Grenzen nicht wählbar.
5. **Given** "Halbzeit" (bzw. "Pause" zwischen zwei Dritteln) ist gewählt, **Then** fehlt "Restzeit"; nach "Übernehmen" steht das Spiel in der Pause, der Hauptknopf heißt "Anpfiff 2. Halbzeit".
6. **Given** nach "Übernehmen", **Then** erscheint die Leiste "Rückgängig"; ein Tipp stellt das Spiel vor den Anpfiff zurück (ohne Tore vor Tickerbeginn).
7. **Given** "Neues Spiel" mit eingeschaltetem Schalter "Spiel läuft schon", **When** "Weiter zum Anpfiff" getippt wird, **Then** öffnet der Spielbildschirm mit dem Blatt "Spiel läuft schon". Der Schalter ist bei jedem neuen Spiel aus.
8. **Given** ein Spiel aus dem Spielplan oder über "Nächstes Spiel" (Spec 021), **Then** gilt dasselbe (Knopf vor dem Anpfiff).
9. **Given** das Spiel wurde schon angepfiffen, **Then** fehlt "Spiel läuft schon"; die Uhr stellt man über "Uhr korrigieren" (US3).
10. **Given** das Blatt "Spiel läuft schon", **When** "Trikots ändern" getippt, beim Gegner Blau gewählt und "Übernehmen" getippt wird, **Then** steht wieder das Blatt "Spiel läuft schon" mit allen bisherigen Eingaben da, die Farbmarke des Gegners ist blau, und nach "Übernehmen" sind Tor-Knopf, Torliste und Dashboard blau. Die Gegnerfarbe wird wie in Spec 017 FR-C13 für diesen Gegner gemerkt. Schließen ohne "Übernehmen" ändert nichts.

---

### User Story 2 - Bisherigen Spielstand übernehmen (Priority: P2)

Es steht 7:4. Atti tippt im Blatt "Spiel läuft schon" bei Feuerbach siebenmal "+" und beim Gegner viermal "+". Nach "Übernehmen" zeigt die Anzeigetafel 7:4, die Torliste beginnt mit elf Toren "vor Tickerbeginn". Später erfährt er, dass Ben das 1:0 geschossen hat, tippt das Tor an und trägt ihn als Torschützen ein.

**Why this priority**: Das i-Tüpfelchen. Ohne US2 geht es über einzelne Tor-Tipps, nur mühsamer.

**Independent Test**: Blatt "Spiel läuft schon", 2. Halbzeit, Noch 10 Min, Feuerbach 3, Gegner 2, "Übernehmen": Stand 3:2, fünf Tore "vor Tickerbeginn"; erstes Feuerbach-Tor antippen, "Torschütze ändern", Ben: Spielverlauf zeigt Ben.

**Acceptance Scenarios**:

1. **Given** "Spielstand" im Blatt, **Then** steht je Mannschaft der Name (Kurzform wie auf den Tor-Knöpfen), die Zahl groß sowie "−" und "+"; "−" ist bei 0 nicht wählbar, "+" höchstens bis 30.
2. **Given** Spielstand 7:4 übernommen, **Then** zählen sieben Feuerbach- und vier Gegentore sofort in Anzeigetafel, Spieldetails, Teilen-Text, Historie und Dashboard.
3. **Given** Tore vor Tickerbeginn, **Then** stehen sie in Torliste, Spieldetails, Teilen-Text und Dashboard vor allen anderen Toren mit "vor Tickerbeginn" statt einer Minute, zuerst die Feuerbach-Tore, dann die Gegentore, mit fortlaufendem Stand (1:0 … 7:0, 7:1 … 7:4). Im Teilen-Text steht in der Minutenspalte "–".
4. **Given** ein Tor vor Tickerbeginn wird angetippt, **Then** öffnet das Tor-Blatt wie bei jedem Tor ("Tor entfernen", "Torschütze ändern", "Minute ändern", mit Schalter "Vorlagen" "Vorlage ändern"); "Torschütze ändern" und "Vorlage ändern" wirken wie bei jedem Tor (Spec 017 FR-C02).
5. **Given** "Minute ändern" bei einem Tor vor Tickerbeginn, **Then** bietet die Auswahl alle gespielten Minuten (wie bei jedem Tor); nach "Übernehmen" ist es ein normales Tor mit dieser Minute an seiner Stelle im Verlauf.
6. **Given** Einstieg in der 1. Halbzeit oder in der Halbzeitpause mit 2:1, **Then** ist der Halbzeitstand 2:1 plus Tore bis zum Pausenpfiff. **Given** Einstieg ab der 2. Halbzeit, **Then** gibt es keinen Halbzeitstand; der Teilen-Text lässt "Halbzeit x:y" weg.
7. **Given** Spielstand 0:0, **Then** entstehen keine Tore vor Tickerbeginn.

---

### User Story 3 - Uhr korrigieren mit Restzeit (Priority: P2)

Atti hat wie am 22.11. schon getickert und den Abschnitt angepfiffen, die Uhr zeigt 24:30 Restzeit, richtig wären 7 Minuten. Er tippt "…" → "Uhr korrigieren", stellt "Noch 7 Min" ein und tippt "Übernehmen". Uhr und Dashboard stimmen.

**Why this priority**: Rettet den Fall, wenn man den Einstieg übersehen hat oder die Uhr später auffällt. Heute fehlt der Eintrag genau in diesem Fall.

**Independent Test**: Spiel 2 × 25, Anpfiff, sofort Pausenpfiff, "Anpfiff 2. Halbzeit", nach einer Minute "…" → "Uhr korrigieren": Blatt zeigt "Noch 24 Min" (bzw. die aktuelle Restzeit); −5, −5, −5, −1, −1 auf "Noch 7 Min", "Übernehmen": Uhr 07:xx Restzeit, Spielminute 44'.

**Acceptance Scenarios**:

1. **Given** laufende oder angehaltene Uhr, **Then** bietet das "…"-Menü "Uhr korrigieren", auch wenn der vorige Pfiff gerade erst war.
2. **Given** "Uhr korrigieren", **Then** zeigt das Blatt "Restzeit" groß ("Noch 24 Min", in der Nachspielzeit "+2 Min") mit "−5", "−1", "+1", "+5", darunter "= 2. Minute" bzw. die Spielminute, darunter wie bisher der Hinweis zur Änderung und "Übernehmen".
3. **Given** die Restzeit wird verringert (Uhr vorstellen) und der Anpfiff rückte dadurch vor den vorigen Pfiff, **When** "Übernehmen" getippt wird, **Then** rückt der bisherige Verlauf (frühere Abschnitte mit ihren Toren und Ereignissen) entsprechend mit zurück; deren Minuten bleiben unverändert.
4. **Given** in diesem Abschnitt wurden schon Tore erfasst, **When** die Uhr vorgestellt wird, **Then** folgen ihre Minuten (wie Spec 012 US4-S2). Zurückstellen (Restzeit erhöhen) bleibt nur bis zum ersten Tor, Ereignis bzw. zur ersten Unterbrechung des Abschnitts möglich (FR-S21).
5. **Given** die Restzeit, **Then** lässt sie sich höchstens bis 0 verringern (darüber hinaus regelt der Pfiff) und höchstens bis zur Abschnittslänge bzw. zur Grenze aus S4 erhöhen; die Knöpfe sind an den Grenzen nicht wählbar.
6. **Given** vor dem Anpfiff, in der Pause oder nach dem Schlusspfiff, **Then** fehlt "Uhr korrigieren" (wie bisher).

---

### Edge Cases

- **"Tor nachtragen" nach dem Einstieg**: bietet wie bisher alle gespielten Minuten, auch die vor dem Tickerbeginn, und legt ein Tor mit Minute an. Tore "vor Tickerbeginn" entstehen nur über das Blatt "Spiel läuft schon".
- **Pfiff zurücknehmen** (Spec 012 FR-S15): Pfiffe, die die App beim Einstieg selbst gesetzt hat, lassen sich nicht zurücknehmen; dafür gibt es die Leiste "Rückgängig" (US1-S6).
- **Spiel übernehmen** (Spec 006 US6) und Sicherung: Tore vor Tickerbeginn und der Verlauf reisen mit wie jedes Tor; ältere Sicherungen bleiben gültig.
- **Ältere App auf dem Eltern-Handy**: Kennt sie "vor Tickerbeginn" noch nicht, zeigt sie diese Tore mit einer Minute aus dem Abschnittsanfang; Stand und Uhr stimmen trotzdem. Mit dem nächsten Update (Spec 010 "Update") stimmt auch die Anzeige.
- **Uhrzeit im Teilen-Text**: Die Anpfiff-Uhrzeit ergibt sich aus dem zurückgerechneten Verlauf (geschätzt, mit 5 Minuten je Pause).
- **Offline**: Alles lokal; das Dashboard bekommt den Stand mit der nächsten Verbindung.
- **Uhrzeiten früherer Tore nach "Uhr korrigieren"** (FR-J21): Rückt der Verlauf mit zurück, verschieben sich auch die erfassten Uhrzeiten früherer Tore und Ereignisse (für die Videozuordnung); ihre Spielminuten bleiben. Hinnehmbar, weil der Fall fast nur nach einem schnellen Durchklickern auftritt, bei dem die Uhrzeiten ohnehin nicht stimmen.
- **"Spiel übernehmen" nach dem Einstieg** (Spec 006 US6): Das übernehmende Handy kennt den Halbzeitstand nicht, sobald es Tore vor Tickerbeginn gibt (FR-J14), auch wenn in der Halbzeitpause eingestiegen wurde.
- **"Rückgängig" nach dem Einstieg** (FR-J05) gilt nur, bis etwas Weiteres erfasst oder geändert wird.
- **Verlängerung, Elfmeterschießen**: kein Einstiegspunkt (siehe Clarifications).
- **Großer Rückstand im Kinderfußball** (z. B. 0:15): bis 30 je Seite; mehr über "Tor nachtragen" bzw. Tor-Knöpfe.

## Requirements *(mandatory)*

### Functional Requirements

**Einstieg (US1)**

- **FR-J01**: Der Spielbildschirm MUSS vor dem ersten Anpfiff neben "Anpfiff" den Zweitknopf "Spiel läuft schon" zeigen; nach dem ersten Anpfiff fehlt er.
- **FR-J02**: "Neues Spiel" MUSS in der Karte "Spielzeit" den Schalter "Spiel läuft schon" (Vorgabe aus) anbieten; eingeschaltet öffnet "Weiter zum Anpfiff" den Spielbildschirm mit dem Blatt "Spiel läuft schon".
- **FR-J03**: Das Blatt "Spiel läuft schon" MUSS "Abschnitt" (alle regulären Abschnitte und die Pausen dazwischen), "Restzeit" (ganze Minuten, 0 bis Abschnittslänge, "−5", "−1", "+1", "+5", Anzeige "Noch N Min" und "= M. Minute"; fehlt bei gewählter Pause), "Spielstand" (US2) und "Übernehmen" enthalten.
- **FR-J04**: "Übernehmen" MUSS den Verlauf bis jetzt aus Zeitstempeln zurückrechnen (Constitution V): Anpfiff des gewählten Abschnitts = jetzt minus gespielte Zeit; frühere Abschnitte mit voller Länge davor, je 5 Minuten Pause dazwischen. Bei gewählter Pause endet der vorige Abschnitt jetzt. Uhr, Signale, Pfiffe und Live-Meldung verhalten sich danach wie bei einem durchgehend getickerten Spiel.
- **FR-J05**: Nach "Übernehmen" MUSS die Leiste "Rückgängig" erscheinen; sie stellt den Zustand vor dem Einstieg vollständig wieder her.
- **FR-J06**: Das Blatt "Spiel läuft schon" MUSS bei "Spielstand" die Trikotfarben beider Mannschaften als Farbmarken und den Link "Trikots ändern" zeigen. Er öffnet das Blatt "Trikots" (Spec 017 FR-C11 bis FR-C13); danach kehrt die App mit allen Eingaben ins Blatt "Spiel läuft schon" zurück. Die neuen Farben gelten sofort (wie "Trikots ändern" im "…"-Menü) und bleiben auch bei "Rückgängig" des Einstiegs erhalten.

**Spielstand (US2)**

- **FR-J10**: "Spielstand" MUSS je Mannschaft 0 bis 30 Tore mit "−" und "+" erlauben.
- **FR-J11**: "Übernehmen" MUSS je gezähltem Tor ein Tor "vor Tickerbeginn" anlegen (ohne Torschütze, ohne Minute, kein Elfmeter), zuerst die Feuerbach-Tore, dann die Gegentore. Sie gehören zum 1. Abschnitt (research.md R-J2); ihre Uhrzeit ist der zurückgerechnete erste Anpfiff, so stehen sie vor allen anderen Toren.
- **FR-J12**: Tore vor Tickerbeginn MÜSSEN überall zählen und vor allen anderen Toren stehen, mit "vor Tickerbeginn" statt Minute (Teilen-Text: "–").
- **FR-J13**: Tore vor Tickerbeginn MÜSSEN wie jedes Tor antippbar sein (Tor-Blatt, Spec 017 FR-C01). "Minute ändern" bietet wie bei jedem Tor alle gespielten Minuten (Spec 012 FR-S11, research.md R-J3); danach ist es ein normales Tor.
- **FR-J14**: Beim Einstieg ab dem 2. Abschnitt (Pause nach dem 1. Abschnitt ausgenommen) MUSS der Halbzeitstand leer bleiben.
- **FR-J15**: Die Live-Meldung MUSS Tore vor Tickerbeginn kennzeichnen (optionales Feld, abwärtskompatibel); der Vermittlungsdienst bleibt unverändert.

**Uhr korrigieren (US3, ändert Spec 012 FR-S20, FR-S21)**

- **FR-J20**: Das Blatt "Uhr korrigieren" MUSS die Restzeit ("Noch N Min" bzw. in der Nachspielzeit "+N Min") mit "−5", "−1", "+1", "+5" und darunter die Spielminute zeigen. "−" stellt die Uhr vor (weniger Restzeit).
- **FR-J21**: Vorstellen MUSS bis Restzeit 0 möglich sein, unabhängig vom vorigen Uhr-Ereignis: Liegt der neue Anpfiff davor, werden alle früheren Uhr-Ereignisse, Tore und Ereignisse um denselben Betrag früher gelegt (ihre Minuten bleiben). Zurückstellen bleibt nach FR-S21 begrenzt.
- **FR-J22**: Der Eintrag "Uhr korrigieren" MUSS bei laufender oder angehaltener Uhr immer erscheinen, sobald Vor- oder Zurückstellen möglich ist.

### Key Entities

- **Tor**: neu, optional: Kennzeichen "vor Tickerbeginn" (fehlt = nein). Ältere Sicherungen bleiben gültig. Mit "Minute ändern" entfällt das Kennzeichen.
- **Spiel**: keine neuen Felder; der zurückgerechnete Verlauf steht in den Uhr-Ereignissen.
- **Live-Meldung**: Tor mit optionalem Kennzeichen "vor Tickerbeginn" (FR-J15).

## Hilfe *(mandatory)*

| Eintrag | Änderung | Quelle |
|---|---|---|
| `spiel-laeuft-schon` "Wie steige ich in ein laufendes Spiel ein?" | neu: "Spiel läuft schon" vor dem Anpfiff bzw. Schalter in "Neues Spiel"; Abschnitt, Restzeit, Spielstand, "Trikots ändern"; Tore "vor Tickerbeginn" antippen, um Torschütze und Vorlage nachzutragen | 023 US1, 023 US2 |
| `uhr-korrigieren` "Was tue ich, wenn die Uhr falsch geht?" | geändert: Restzeit mit "−5", "−1", "+1", "+5"; geht auch direkt nach einem Pfiff | 012 US4, 023 US3 |
| `neues-spiel` "Wie lege ich ein Spiel an?" | geändert: Schalter "Spiel läuft schon" | 001 US2, …, 023 US1 |
| `trikots` "Wie ändere ich die Trikotfarben für ein Spiel?" | geändert: auch im Blatt "Spiel läuft schon" | 004 US2, 017 US2, 023 US1 |
| `torschuetze` "Wie trage ich den Torschützen nach?" | geändert: auch bei Toren "vor Tickerbeginn" | 001 US3, 017 US1, 023 US2 |

## Success Criteria *(mandatory)*

- **SC-J01**: Einstieg im 3. Drittel (3 × 15) bei 7:4 und 7 Minuten Restzeit mit höchstens 18 Tipps ab dem Spielbildschirm, Uhr und Dashboard stimmen sofort.
- **SC-J02**: Eine um 17 Minuten falsche Uhr ist mit höchstens 8 Tipps korrigiert ("…", "Uhr korrigieren", ≤ 5 Schritte, "Übernehmen").
- **SC-J03**: Domain-Logik (Verlauf zurückrechnen, Tore vor Tickerbeginn, Uhr vorstellen mit Verlauf) mit 100 % Branch-Coverage.
- **SC-J04**: Spielbildschirm vor dem Anpfiff und das Blatt passen auf das iPhone SE ohne Scrollen (375 × 667 pt); bestehende E2E-Tests bleiben in ihren Abläufen unverändert grün (außer den bewusst geänderten "Uhr korrigieren"-Szenarien aus Spec 012).

## Assumptions

- Keine neue Laufzeit-Abhängigkeit, keine Änderung am Vermittlungsdienst.
- Pausenlänge beim Zurückrechnen fest 5 Minuten (nur für Uhrzeiten im Verlauf sichtbar, nicht für die Uhr).
- Bezeichnungen der Abschnitte wie in der App ("1. Halbzeit", "Halbzeit", "2. Drittel", "Pause").
