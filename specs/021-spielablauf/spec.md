# Feature Specification: Spielablauf am Spieltag (UX-Welle 2, Paket B)

**Feature Branch**: `021-spielablauf` (Arbeitszweig im Worktree von Paket B)

**Created**: 2026-11-18

**Status**: Entwurf, Umsetzung freigegeben. Entscheidungen von Atti vorab gesetzt (Nutzertest vom 17.11.2026, Freigabe 18.11.2026), daher keine Clarify-Fragen; die Entscheidungen stehen unter "Clarifications". Mockup/Review B: auf Wunsch von Atti übersprungen, Prüfung in Review C über Screenshots iPhone hell und dunkel (390 × 844 und 375 × 667). Parallel setzt Paket E Spec 022 "Erster Start" um (`new-game.tsx` Layout, Start, Einstellungen, Live); diese Spec ändert in "Neues Spiel" nur die Vorbelegung.

**Status Umsetzung (18.11.2026)**: US1 bis US3 umgesetzt im Arbeitszweig von Paket B; `npm run check` grün, E2E im Profil `android` grün (außer den lokal abweichenden Dashboard-Referenzbildern). Offen: Design-Check (T045), Referenzbilder aus der CI (T046), Review C über Screenshots.

**Input**: Nutzertest vom 17.11.2026 (Turnier-Trainer am Spielfeldrand: 5 Spiele × 10 Minuten, 2 bis 3 Minuten Wechselpause) und Atti (18.11.2026): drei Befunde zum Ablauf im Spiel umsetzen, nur bei echter Unsicherheit fragen.

## Ausgangslage

Gesichtet am 18.11.2026 im Code und im Nutzertest:

- **Nach dem Schlusspfiff tote Knöpfe**: Der Spielbildschirm zeigt nach "Schlusspfiff" unter der Uhr "Spieldetails" und "Ergebnis teilen", unten aber weiter die beiden Tor-Knöpfe, ausgegraut (Spec 019 FR-A23). Für das nächste Turnierspiel muss der Trainer über "Spiel" zum Startbildschirm, "Neues Spiel" öffnen und Heim/Gast, Trikots und Live-Schalter erneut prüfen. Spec 002 FR-T05 ("Nächstes Spiel" mit einem Tap) ist bisher nicht umgesetzt.
- **Torschützen-Auswahl sperrt die Tor-Knöpfe**: Nach einem Feuerbach-Tor öffnet sich "Wer hat getroffen?" als Blatt mit Abdunkler über dem ganzen Bildschirm (Spec 001 US3-S2, bis zu 8 Sekunden). Ein Tipp auf "TOR Gegner" in dieser Zeit trifft den Abdunkler, schließt nur das Blatt und zählt kein Gegentor. Im Nutzertest fiel so ein schnelles Gegentor unbemerkt weg (stiller Datenverlust). Ebenso beim Folgeschritt "Vorlage von?" (Spec 009 FR-V02, 5 Sekunden).
- **Torzeilen sehen nicht antippbar aus**: Die Zeilen der Torliste öffnen beim Antippen "Tor entfernen", "Torschütze ändern", "Minute ändern" (Spec 017), sehen aber wie reiner Text aus. Die Personas fanden "Torschütze nachtragen" nicht.

## Clarifications

### Session 2026-11-18 (Entscheidungen von Atti, ohne Rückfragen)

- Q: Wie kommt der Trainer im Turnier schnell ins nächste Spiel? → A: Im Endzustand des Spielbildschirms ersetzt ein großer Hauptknopf "Nächstes Spiel" (mindestens 64 pt, Vereinsrot wie die anderen Hauptknöpfe) die ausgegrauten Tor-Knöpfe. "Ergebnis teilen" und "Spieldetails" bleiben.
- Q: Was ist vorbelegt? → A: Alles aus dem beendeten Spiel: eigene Mannschaft, Spielzeit und Abschnitte, Trikots beider Seiten, Aufgebot, Heim/Gast, Live-Status (live bleibt live). Gegner: das nächste passende Spiel dieser Mannschaft von heute aus dem Spielplan (Spec 015), sonst leer. Das Gegner-Feld hat den Fokus.
- Ziel: Vom Schlusspfiff zum nächsten Anpfiff mit höchstens 3 Tipps plus Gegnername.
- Q: Spec 002 FR-T05? → A: Umgesetzt durch diese Spec, ohne den gemeinsamen Teilen-Text für den Spieltag (bleibt Backlog).
- Q: Torschützen-Auswahl? → A: Nicht-modal, sie verdeckt die Tor-Knöpfe nicht (auch nicht auf dem iPhone SE). Die Tor-Knöpfe bleiben bedienbar; ein Tipp darauf schließt die Auswahl ohne Torschützen und zählt das neue Tor sofort. Gleiches für "Vorlage von?". Rückgängig, Countdown und Barrierefreiheit bleiben.
- Q: Torzeilen? → A: Antippbare Zeilen bekommen ein Pfeil- bzw. Stift-Symbol aus den vorhandenen Symbolen, keine neuen Farben.
- Mockup und Review B: übersprungen; Prüfung in Review C über Screenshots.

### Session 2026-11-18 (Präzisierungen beim Spezifizieren)

Festlegungen des Agenten, wo die Entscheidungen eine Lücke lassen; Atti kann sie in Review C ändern.

- **Wo steht die Auswahl?** Zwischen Kopfzeile und Tor-Knöpfen, unten bündig über den Tor-Knöpfen; sie nimmt für ihre Dauer immer den ganzen Bereich darüber ein (Anzeigetafel, Uhr, Uhr-Knöpfe, Ereignis-Zeile, Torliste ruhen so lange unsichtbar), damit nichts halb verdeckt hervorschaut (research.md R-W2). Kopfzeile und Tor-Knöpfe bleiben frei; der neue Stand ist nach dem Schließen wieder zu sehen.
- **Nur die Schnellauswahl direkt nach dem Tor wird nicht-modal.** Die Auswahl aus Korrekturen ("Torschütze ändern", "Vorlage ändern", "Tor nachtragen", Spieldetails) bleibt ein Blatt mit Abdunkler und "Abbrechen": dort sucht der Trainer bewusst, ohne Zeitdruck.
- **Doppeltipp-Sperre bleibt**: Ein zweiter Tipp auf denselben Tor-Knopf innerhalb von 1,5 Sekunden zählt nicht ("Schon gezählt") und lässt die Auswahl offen.
- **Symbol der Torzeile**: Pfeil nach rechts (Chevron) wie bei "Weitere Spiele" und auf dem Startbildschirm, in `ink-muted`; er steht an jeder antippbaren Zeile der Torliste im Spiel (Tore, entfernte Tore, Karten, Wechsel, Lesezeichen), damit die Liste einheitlich bleibt.
- **Farbe "Nächstes Spiel"**: `rot-tief` mit Schrift `on-rot` (Hauptknopf außerhalb des Spiels, design/README.md). Nach dem Schlusspfiff gibt es keine Tor-Knöpfe mehr, mit denen er verwechselt werden könnte; Abweichung von "Hauptknopf im Spiel" in design/README.md begründet.
- **Trikots aus dem beendeten Spiel**, auch mit Planspiel: Im Turnier spielt Feuerbach den ganzen Tag im selben Trikot; das Gegner-Trikot ist vorbelegt und wie immer änderbar.
- **Aufgebot**: wie bisher das gemerkte Aufgebot der Mannschaft (Spec 004 FR-M06); nach einem Spiel ist das genau das Aufgebot dieses Spiels.

### Session 2026-11-18 (Präzisierungen nach dem Code-Review)

Befunde aus dem Code-Review und dem Design-Check der Umsetzung; Entscheidungen des Auftraggebers bzw. Festlegungen des Agenten.

- **Auswahl erst, wenn sie da ist**: Die Schnellauswahl liegt in einem nachgeladenen Teil (research.md R-W3). Solange er nicht geladen ist, dockt nichts an: Der Spielbildschirm bleibt, wie er ist (Anzeigetafel, Uhr, Torliste sichtbar), das Tor zählt trotzdem; die Auswahl erscheint, sobald der Teil da ist (Countdown ab dem Tor). Schlägt das Laden fehl, lädt der nächste Bedarf (neues Tor, Tipp auf eine Torzeile, auch in den Spieldetails) ihn erneut.
- **Elfmeterschießen**: Ist die Schnellauswahl noch offen, wenn das Elfmeterschießen beginnt (keine Tor-Knöpfe, an die sie andocken könnte), erscheint sie als Blatt mit Abdunkler, mit Countdown und "Ohne Torschütze (n s)", statt zu verschwinden.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - "Nächstes Spiel" nach dem Schlusspfiff (Priority: P1)

Bens Vater tickert das E1-Turnier: fünf Spiele zu 10 Minuten, dazwischen 2 bis 3 Minuten Pause. Nach dem Schlusspfiff teilt er das Ergebnis und tippt unten auf den großen roten Knopf "Nächstes Spiel". "Neues Spiel" öffnet sich mit E1, 1 × 10 Minuten, denselben Trikots, demselben Aufgebot und eingeschaltetem "Live aufs Dashboard"; steht das nächste Spiel im Spielplan, ist der Gegner schon eingetragen. Er tippt den Gegnernamen, "Weiter zum Anpfiff" und "Anpfiff".

**Why this priority**: Wichtigster Befund des Turnier-Trainers: In der kurzen Pause zwischen zwei Spielen kostet der Umweg über den Startbildschirm Zeit, und vergessene Einstellungen (Heim/Gast, Trikot, Live) fallen erst im Spiel auf.

**Independent Test**: Ein Spiel 1 × 12 Minuten auswärts mit geändertem Trikot beenden, "Nächstes Spiel" tippen: Mannschaft, Spielzeit, Heim/Gast, Trikots, Aufgebot und Live-Schalter entsprechen dem beendeten Spiel, das Gegner-Feld ist leer und hat den Fokus; nach Gegner, "Weiter zum Anpfiff" und "Anpfiff" läuft das neue Spiel.

**Acceptance Scenarios**:

1. **Given** ein beendetes Spiel (nach "Schlusspfiff"), **Then** stehen an der Stelle der Tor-Knöpfe keine Tor-Knöpfe mehr, sondern der Knopf "Nächstes Spiel" über die volle Inhaltsbreite, mindestens 64 pt hoch, Fläche `rot-tief`, Schrift `on-rot`; unter der Uhr stehen weiter "Spieldetails" und "Ergebnis teilen".
2. **Given** ein beendetes Spiel der E1 (1 × 12 Minuten, auswärts, Feuerbach-Trikot Weiß statt Schwarz, Gegner-Trikot Gelb, Aufgebot Max und Ben), **When** "Nächstes Spiel" getippt wird, **Then** erscheint "Neues Spiel" mit Mannschaft E1, Spielzeit 1 × 12, "Feuerbach" als Gast, Feuerbach-Trikot Weiß, Gegner-Trikot Gelb und dem Aufgebot Max und Ben; das Gegner-Feld ist leer und hat den Fokus.
3. **Given** ein Trainer-Handy, dessen beendetes E1-Spiel live gesendet wurde, **When** "Nächstes Spiel" getippt wird, **Then** ist "Live aufs Dashboard" an; stand das beendete Spiel auf "Nicht live senden", **Then** ist der Schalter aus.
4. **Given** ein Trainer-Handy mit Spielplan von heute (E1 11:00 gegen FC Probestadt, aus dem Plan angelegt und beendet; E1 12:00 bei SV Beispielhausen; E2 11:30 gegen TSV Musterdorf), **When** nach dem Spiel gegen FC Probestadt "Nächstes Spiel" getippt wird, **Then** ist unter "Aus dem Spielplan" das Spiel bei SV Beispielhausen gewählt (mit dem Hinweis "Aus dem Spielplan: …"), das Gegner-Feld enthält "SV Beispielhausen", Heim/Gast folgt dem Plan (Feuerbach als Gast), und die Trikots sind die des beendeten Spiels; nach "Weiter zum Anpfiff" steht das Planspiel als "angelegt".
5. **Given** heute gibt es für die Mannschaft nur abgesagte, schon angelegte oder von einem anderen Trainer vorgemerkte Planspiele (oder nur Planspiele anderer Mannschaften), **When** "Nächstes Spiel" getippt wird, **Then** ist kein Planspiel gewählt und das Gegner-Feld leer.
6. **Given** "Neues Spiel" aus Szenario 2, **When** der Gegner "TSV Musterstadt" eingetragen und "Weiter zum Anpfiff" und "Anpfiff" getippt werden, **Then** läuft das neue Spiel mit denselben Einstellungen (3 Tipps plus Gegnername ab dem beendeten Spiel), und das beendete Spiel steht unverändert in der Historie.
7. **Given** ein beendetes Spiel mit "Nächstes Spiel", **When** "…" → "Schlusspfiff zurücknehmen" getippt wird, **Then** stehen wieder die Tor-Knöpfe da und "Nächstes Spiel" ist weg. **Given** ein Spiel im Elfmeterschießen, **Then** gibt es kein "Nächstes Spiel"; **When** das Elfmeterschießen beendet ist, **Then** erscheint es.
8. **Given** ein beendetes Spiel auf einem iPhone SE (375 × 667 pt), **Then** sind "Nächstes Spiel", "Spieldetails" und "Ergebnis teilen" ohne Seiten-Scroll sichtbar und die Torliste zeigt mindestens zwei Zeilen; das Band "Korrigiert. Ergebnis neu teilen?" steht direkt über "Nächstes Spiel" und verdeckt ihn nicht.

---

### User Story 2 - Torschützen-Auswahl ohne Sperre (Priority: P2)

Leos Mutter tickert. Feuerbach trifft, sie tippt "TOR Feuerbach"; über dem Spielstand erscheint "Wer hat getroffen?". Bevor sie Leo antippen kann, kontert der Gegner und trifft. Sie tippt sofort "TOR Gegner", der Knopf liegt frei: Die Auswahl schließt sich, das Gegentor zählt, im Band steht "Tor TSV Musterstadt 13' erfasst". Den Torschützen des ersten Tores trägt sie in der Halbzeit über die Torliste nach.

**Why this priority**: Stiller Datenverlust: Ein nicht gezähltes Gegentor verfälscht Stand, Live-Anzeige und Teilen-Text. Nach US1 der wichtigste Befund; ohne US1 nutzbar.

**Independent Test**: Laufendes Spiel mit Kader: "TOR Feuerbach", dann bei offener Auswahl "TOR Gegner": Stand 1:1, beide Tore in der Torliste, das erste ohne Torschützen; die Tor-Knöpfe waren die ganze Zeit vollständig sichtbar (auch auf 375 × 667 pt).

**Acceptance Scenarios**:

1. **Given** ein laufendes Spiel mit Kader, **When** "TOR Feuerbach" getippt wird, **Then** erscheint "Wer hat getroffen?" ohne Abdunkler zwischen Kopfzeile und Tor-Knöpfen: Die Auswahl endet über den Tor-Knöpfen, beide Tor-Knöpfe und die Kopfzeile ("…") sind vollständig sichtbar und nicht verdeckt, auf 390 × 844 pt und auf 375 × 667 pt; die Auswahl nimmt den ganzen Bereich unter der Kopfzeile ein, Anzeigetafel, Uhr, Uhr-Knöpfe und Torliste ruhen so lange unsichtbar.
2. **Given** die Auswahl aus Szenario 1 ist offen, **When** "TOR Gegner" getippt wird, **Then** schließt sich die Auswahl, der Stand ist 1:1, die Torliste zeigt das Gegentor oben und das Feuerbach-Tor ohne Torschützen, und im Band steht "Tor <Gegner> <Minute> erfasst" mit "Rückgängig" für das Gegentor.
3. **Given** die Auswahl aus Szenario 1 ist offen und mehr als 1,5 Sekunden alt, **When** erneut "TOR Feuerbach" getippt wird, **Then** steht es 2:0, das erste Tor bleibt ohne Torschützen, und die Auswahl gilt dem neuen Tor (Untertitel mit dessen Minute, Countdown wieder 8 Sekunden); "Rückgängig" nimmt nur das neue Tor zurück.
4. **Given** die Auswahl aus Szenario 1 ist offen, **When** innerhalb von 1,5 Sekunden erneut "TOR Feuerbach" getippt wird, **Then** bleibt es 1:0, "Schon gezählt" erscheint im Band direkt über den Tor-Knöpfen (unter der Auswahl, nicht über ihr), und die Auswahl bleibt offen.
5. **Given** "Vorlagen" ist eingeschaltet und nach "TOR Feuerbach" wurde Max gewählt, sodass "Vorlage von?" offen ist, **When** "TOR Gegner" getippt wird, **Then** schließt sich "Vorlage von?" ohne Vorlage, das Gegentor zählt, und das erste Tor heißt "Max" ohne Vorlage.
6. **Given** die Auswahl aus Szenario 1, **Then** bleiben Titel, Untertitel "Tor in Minute …", "Rückgängig", "Andere …", "Eigentor Gegner" und "Ohne Torschütze (8 s)" mit Countdown; nach 8 Sekunden schließt sie ohne Torschützen; "Rückgängig" entfernt das Tor und schließt sie.
7. **Given** ein Aufgebot mit 16 Kindern auf einem iPhone SE, **When** "TOR Feuerbach" getippt wird, **Then** sind Titel, "Rückgängig" und "Ohne Torschütze (8 s)" sichtbar, die Namen lassen sich in der Auswahl erreichen (bei Bedarf scrollt nur das Raster der Namen), und beide Tor-Knöpfe bleiben frei.
8. **Given** ein Tor in der Torliste, **When** im Tor-Blatt "Torschütze ändern" getippt wird, **Then** erscheint die Auswahl wie bisher als Blatt mit Abdunkler und "Abbrechen" (Korrektur, ohne Countdown).
9. **Given** die Auswahl aus Szenario 1, **Then** ist sie für Screenreader ein Dialog mit dem Titel "Wer hat getroffen?" als Namen, ohne die übrige Seite zu sperren; die Tor-Knöpfe bleiben erreichbar und bedienbar (nicht ausgeblendet oder gesperrt), und axe-core meldet keinen Verstoß, hell und dunkel.

---

### User Story 3 - Torzeile als antippbar erkennbar (Priority: P3)

Toms Vater will in der Halbzeit den Torschützen nachtragen. In der Torliste hat jede Zeile rechts einen kleinen Pfeil; er tippt auf "12' Feuerbach" und findet "Torschütze ändern".

**Why this priority**: Die Funktion gibt es schon (Spec 017); sie ist nur schwer zu entdecken. Kleine Änderung, großer Nutzen für das Nachtragen nach US2.

**Independent Test**: Spiel mit Tor, Gegentor, entferntem Tor und Lesezeichen: Jede Zeile der Torliste zeigt rechts den Pfeil; die Namen der Zeilen für Screenreader bleiben gleich.

**Acceptance Scenarios**:

1. **Given** eine Torliste mit Feuerbach-Tor, Gegentor, entferntem Tor und einem Ereignis (Karte, Wechsel oder Lesezeichen), **Then** zeigt jede Zeile rechts ein Pfeil-Symbol (Chevron nach rechts) in `ink-muted`, für Screenreader verborgen; der zugängliche Name der Zeile ist unverändert, jede Zeile bleibt mindestens 48 pt hoch.
2. **Given** eine Zeile mit langem Text (z. B. Torschütze mit Vorlage) auf einem iPhone SE, **Then** wird der Text vor dem Symbol mit "…" gekürzt, und das Symbol bleibt vollständig sichtbar am rechten Rand.
3. **Given** das dunkle Theme, **Then** hat das Symbol die Farbe `ink-muted` des dunklen Themes; es gibt keine neue Farbe.

---

### Edge Cases

- **"Nächstes Spiel" aus einem übernommenen Spiel** (Spec 006 US6) oder einem Spiel einer Mannschaft, die nicht mehr unter "Meine Mannschaften" steht: Mannschaft wie bisher (die zuletzt genutzte), alles andere aus dem beendeten Spiel.
- **Mehrere offene Planspiele der Mannschaft heute**: Gewählt ist das früheste in der Reihenfolge von "Aus dem Spielplan · heute" (nach Anstoß). Ein von einem anderen Trainer vorgemerktes Planspiel wird übersprungen, damit kein Spiel doppelt getickert wird (Spec 015 US6); antippen lässt es sich weiterhin.
- **Kein Live-Spieltag oder Handy ohne Trainer-Link**: Kein Spielplan; Gegner leer. "Live aufs Dashboard" gibt es dann ohnehin nicht.
- **Live-Spieltag inzwischen beendet oder neu ausgestellt**: "Neues Spiel" verhält sich wie bisher (kein Schalter bzw. Hinweis auf neu ausgestellt); die Vorbelegung des Live-Schalters wirkt nur, wenn es den Schalter gibt.
- **Unentschieden im Pokal**: Solange die Abfrage "Unentschieden …" (Spec 003 FR-P01) offen ist, liegt sie über allem; danach erscheint "Nächstes Spiel" bzw. die Verlängerung oder das Elfmeterschießen.
- **Zurück aus "Neues Spiel"**: führt wie bisher zum Startbildschirm; das beendete Spiel bleibt unverändert, es entsteht kein Spiel.
- **Auswahl offen, Seite verlassen** (z. B. Leiste "Spiel"): Die Auswahl schließt ohne Torschützen wie bisher.
- **Auswahl offen und Meldung im Band** (z. B. "Lesezeichen gesetzt" oder "Schon gezählt"): Das Band steht unter der Auswahl direkt über den Tor-Knöpfen; Meldungen und Auswahl überdecken sich nicht.
- **Gegentor ohne Kader oder Feuerbach-Tor ohne Kader**: Es gibt keine Auswahl (wie bisher); nichts ändert sich.
- **Uhr angehalten**: Die Auswahl kann dann nicht offen sein (sie verdeckt "Uhr anhalten" für ihre Dauer); "Tor eintragen und Uhr fortsetzen?" bleibt wie bisher (Spec 001 FR-021).
- **Elfmeterschießen**: keine Tor-Knöpfe, keine neue Schnellauswahl (Spec 003). Ist die Auswahl des letzten Tores noch offen, wenn es beginnt, erscheint sie als Blatt mit Abdunkler und Countdown (FR-W10).
- **Teil mit der Auswahl noch nicht geladen** (erster Start ohne Netz, langsames Netz): Das Tor zählt, der Spielbildschirm bleibt sichtbar; die Auswahl erscheint, sobald der Teil da ist. Schlägt das Laden fehl, versucht es der nächste Bedarf erneut (FR-W10).

## Requirements *(mandatory)*

### Functional Requirements

**"Nächstes Spiel" (US1)**

- **FR-W01**: Nach dem Schlusspfiff (Spielzustand beendet, kein Elfmeterschießen offen) MUSS der Spielbildschirm an der Stelle der Tor-Knöpfe den Knopf "Nächstes Spiel" zeigen: volle Inhaltsbreite, mindestens 64 pt hoch, Fläche `rot-tief`, Schrift `on-rot` fett (Hauptknopf, design/README.md). Die ausgegrauten Tor-Knöpfe MÜSSEN in diesem Zustand entfallen. "Spieldetails" und "Ergebnis teilen" unter der Uhr bleiben unverändert (Spec 019 FR-A20, Spec 020 FR-E19); das Meldeband steht direkt über "Nächstes Spiel" (Spec 019 FR-A01). Mit "Schlusspfiff zurücknehmen" (Spec 012 FR-S15) kehren die Tor-Knöpfe zurück.
- **FR-W02**: Ein Tipp auf "Nächstes Spiel" MUSS "Neues Spiel" öffnen, vorbelegt aus dem beendeten Spiel: eigene Mannschaft (sofern unter "Meine Mannschaften", sonst wie bisher die zuletzt genutzte), Spielzeit (Abschnitte × Minuten), Heim/Gast, Feuerbach-Trikot und Gegner-Trikot, "Live aufs Dashboard" (an, außer das beendete Spiel stand auf "Nicht live senden"). Das Aufgebot ist wie bisher das gemerkte Aufgebot der Mannschaft (Spec 004 FR-M06, Spec 001 FR-030), also das des beendeten Spiels. Weicht das Feuerbach-Trikot vom Trikot für Heim bzw. Auswärts ab, gilt es als "nur für dieses Spiel geändert" (Hinweis wie bisher).
- **FR-W03**: Gibt es heute im Spielplan (Spec 015) ein Planspiel der Mannschaft, das nicht abgesagt, nicht angelegt und nicht von einem anderen Trainer vorgemerkt ist, MUSS das früheste davon ausgewählt sein wie nach einem Tipp unter "Aus dem Spielplan" (Spec 015 FR-P10, FR-P11: Gegner, Heim/Gast, Spielzeit laut Plan, Hinweis "Aus dem Spielplan: …", nach "Weiter zum Anpfiff" "angelegt"); die Trikots bleiben die des beendeten Spiels (FR-W02). Sonst MUSS das Gegner-Feld leer sein.
- **FR-W04**: Das Gegner-Feld MUSS den Fokus haben, sobald "Neues Spiel" nach "Nächstes Spiel" erscheint.
- **FR-W05**: Alle Felder bleiben änderbar; Änderungen gelten nur für das neue Spiel. Das beendete Spiel DARF sich dadurch nicht ändern. Ohne "Weiter zum Anpfiff" entsteht kein Spiel.
- **FR-W06**: "Nächstes Spiel" DARF keine Verbindung aufbauen und keine Daten senden; der Spielplan kommt aus dem Speicher des Handys wie bisher unter "Neues Spiel".

**Torschützen-Auswahl ohne Sperre (US2)**

- **FR-W10**: Die Schnellauswahl direkt nach einem Feuerbach-Tor ("Wer hat getroffen?", Spec 001 FR-009, US3-S1, US3-S2) und ihr Folgeschritt "Vorlage von?" (Spec 009 FR-V02) MÜSSEN nicht-modal sein: kein Abdunkler, keine Sperre der übrigen Seite. Sie MÜSSEN den ganzen Bereich zwischen Kopfzeile und Tor-Knöpfen einnehmen, unten bündig über den Tor-Knöpfen. Anzeigetafel, Uhr, Uhr-Knöpfe, Ereignis-Zeile und Torliste MÜSSEN so lange unsichtbar und nicht antippbar sein (nichts halb Verdecktes, kein versehentlicher Tipp auf einen angeschnittenen Knopf). Kopfzeile und beide Tor-Knöpfe MÜSSEN vollständig sichtbar und bedienbar bleiben, auf jeder unterstützten Größe ab 375 × 667 pt. Angedockt wird erst, wenn der nachgeladene Teil mit der Auswahl da ist; bis dahin MUSS der Spielbildschirm unverändert sichtbar bleiben (das Tor zählt), und ein fehlgeschlagenes Laden MUSS beim nächsten Bedarf wiederholt werden (Präzisierung nach dem Code-Review). Im Elfmeterschießen MUSS eine noch offene Schnellauswahl als Blatt mit Abdunkler und Countdown erscheinen.
- **FR-W11**: Ein Tipp auf einen Tor-Knopf bei offener Schnellauswahl MUSS das neue Tor sofort zählen (ein Tipp, Constitution I) und die Auswahl ohne Torschützen bzw. ohne Vorlage schließen. Ist das neue Tor ein Feuerbach-Tor und gibt es einen Kader, öffnet sich die Auswahl für das neue Tor (Countdown neu). Das vorige Tor bleibt ohne Torschützen bzw. Vorlage und lässt sich wie bisher nachtragen (Spec 017 FR-C01 ff., Spec 009 FR-V04). "Rückgängig" gilt danach dem neuen Tor (Spec 001 FR-008).
- **FR-W12**: Die Doppeltipp-Sperre (Spec 001, 1,5 Sekunden je Mannschaft) MUSS bleiben: Ein zweiter Tipp auf denselben Knopf in dieser Zeit zählt nicht, zeigt "Schon gezählt" (Spec 019 FR-A04) und lässt die Auswahl offen.
- **FR-W13**: Inhalt und Verhalten der Schnellauswahl MÜSSEN sonst bleiben: Titel, Untertitel, "Rückgängig" (solange das Tor zurückzunehmen ist), Aufgebot mit Nummer und Name, "Andere …", "Eigentor Gegner", "Ohne Torschütze (n s)" bzw. "Ohne Vorlage (n s)" mit Countdown, Auto-Schließen nach 8 bzw. 5 Sekunden, Reihenfolge der Namen (Spec 013 FR-K05). Reicht der Platz nicht, MUSS nur das Raster der Namen scrollen; Titel, "Rückgängig" und "Ohne Torschütze" bleiben sichtbar.
- **FR-W14**: Die Schnellauswahl MUSS sich vom Spielbildschirm abheben, ohne Abdunkler und ohne Schatten: Fläche `card`, Rahmen 2 pt `ink`, Ecken `radius-md`. Ein Meldeband (Spec 019 FR-A01 bis FR-A04) MUSS bei offener Auswahl unter ihr direkt über den Tor-Knöpfen stehen; Auswahl und Band überdecken sich nicht.
- **FR-W15**: Für Screenreader MUSS die Schnellauswahl ein Dialog mit dem Titel als Namen sein, ohne die übrige Seite zu sperren (nicht modal); die Tor-Knöpfe MÜSSEN im Bedien- und Fokusbaum bleiben. Der Fokus bleibt wie bisher, wo er ist.
- **FR-W16**: Die Torschützen- und Vorlagen-Auswahl aus Korrekturen (Tor-Blatt "Torschütze ändern" und "Vorlage ändern", "Tor nachtragen", Spieldetails) MUSS wie bisher ein Blatt mit Abdunkler, "Ohne Torschütze" bzw. "Ohne Vorlage" und "Abbrechen" bleiben.

**Torzeile erkennbar (US3)**

- **FR-W20**: Jede antippbare Zeile der Torliste im Spielbildschirm (Tore, entfernte Tore, Karten, Wechsel, Lesezeichen) MUSS am rechten Rand ein Pfeil-Symbol (Chevron nach rechts, Linien-Icon wie "Weitere Spiele") in `ink-muted` zeigen, für Screenreader verborgen. Der Text der Zeile MUSS davor mit "…" gekürzt werden; Zeilenhöhe (mindestens 48 pt, Spec 019 FR-A21) und zugänglicher Name bleiben.
- **FR-W21**: Es DÜRFEN keine neuen Farben, Schriften oder Symbole außerhalb der vorhandenen entstehen (Constitution VII).

**Unverändert**

- **FR-W30**: Unverändert bleiben: das Erfassen eines Tores mit einem Tipp, Rückgängig 10 Sekunden ohne Rückfrage (Constitution I), Uhr aus Zeitstempeln (Constitution V), "Ergebnis teilen" als ein Tipp (Spec 020 FR-E19), Spielmenü "…", Spieldetails, Live-Senden (das beendete und das neue Spiel werden wie bisher gesendet), Layout und Pflichtfelder von "Neues Spiel" (Spec 022 kann sie ändern; diese Spec ändert nur die Vorbelegung).

### Key Entities

- **Vorbelegung "Nächstes Spiel"**: abgeleitet, nicht gespeichert: Mannschaft, Spielzeit, Heim/Gast, Trikots beider Seiten und Live-Schalter aus dem beendeten Spiel, dazu gegebenenfalls das nächste offene Planspiel der Mannschaft von heute. Keine Änderung an Spiel, Einstellungen, Spielplan oder Meldungsformat.

## Hilfe *(mandatory)*

Einträge in `src/domain/help-entries.ts`; Bezeichnungen wörtlich wie in der App. Neue Einträge stehen am Ende des Themenblocks "Spiel erfassen".

| Eintrag | Änderung | Quelle |
|---|---|---|
| neu `naechstes-spiel` "Wie starte ich das nächste Spiel?" (Thema Spiel erfassen, am Ende des Blocks) | Nach dem Schlusspfiff steht unten „Nächstes Spiel“. Ein Tipp öffnet „Neues Spiel“ mit Mannschaft, Spielzeit, Heim/Gast, Trikots, Aufgebot und „Live aufs Dashboard“ aus dem eben beendeten Spiel; steht das nächste Spiel heute im Spielplan, ist es schon gewählt. Gegner eintragen, „Weiter zum Anpfiff“, „Anpfiff“. Ideal im Turnier | 021 US1 |
| `pausenpfiff` "Wie beende ich eine Halbzeit oder das Spiel?" | geändert: ergänzt "Danach startest du mit „Nächstes Spiel“ gleich das nächste Spiel."; verwandt mit `naechstes-spiel` | 001 US2, 021 US1 |
| `torschuetze` "Wie trage ich den Torschützen nach?" | geändert: Die Auswahl erscheint über dem Spielstand, die Tor-Knöpfe bleiben frei; fällt gleich das nächste Tor, einfach den Tor-Knopf tippen, die Auswahl schließt ohne Torschützen. Später über die Torliste (Zeilen mit Pfeil) „Torschütze ändern“ | 001 US3, 017 US1, 021 US2, 021 US3 |
| `vorlage` "Wie erfasse ich, wer das Tor vorgelegt hat?" | geändert: ergänzt "Auch dabei bleiben die Tor-Knöpfe frei." | 009 US1, 009 US4, 021 US2 |
| `spielbildschirm` "Was zeigt der Spielbildschirm?" | geändert: Zeilen der Torliste mit Pfeil rechts lassen sich antippen; nach dem Schlusspfiff steht unten „Nächstes Spiel“ statt der Tor-Knöpfe | 019 US2, 019 US3, 021 US1, 021 US3 |

Kein Eintrag entfällt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-W01**: Vom beendeten Spiel bis zum laufenden nächsten Spiel braucht der Trainer höchstens 3 Tipps plus den Gegnernamen ("Nächstes Spiel", "Weiter zum Anpfiff", "Anpfiff"); mit Planspiel nur die 3 Tipps (automatisch geprüft).
- **SC-W02**: Bei offener Schnellauswahl sind beide Tor-Knöpfe auf 390 × 844 pt und 375 × 667 pt vollständig sichtbar, und ein Tipp darauf zählt das Tor; kein Tor geht durch die Auswahl verloren (automatisch geprüft).
- **SC-W03**: Jede antippbare Zeile der Torliste im Spiel zeigt das Pfeil-Symbol (automatisch geprüft).
- **SC-W04**: Keine neue Laufzeit-Abhängigkeit, keine neue Farbe, keine neue Verbindung; Hauptbundle weiter unter 60 KB gzip; axe-core ohne Verstöße für den Endzustand mit "Nächstes Spiel" und die offene Schnellauswahl in beiden Themes; Kontrastmatrix grün.
- **SC-W05**: Ein Design-Check der geänderten Bildschirme ergibt keinen offenen P0- oder P1-Befund.

## Assumptions

- Grundlage ist der Nutzertest vom 17.11.2026; Atti hat die Entscheidungen vorab gesetzt. Mockup (Schritt 4) und Review B hat Atti übersprungen; geprüft wird in Review C über Screenshots.
- Die Tastatur öffnet sich beim Fokus auf das Gegner-Feld nur, wo der Browser das ohne neue Berührung zulässt (Safari auf dem iPhone in der Regel nicht); der Fokus hilft dann der Bedienung mit Tastatur und Screenreader, ein Tipp ins Feld öffnet die Tastatur.
- Der gemeinsame Teilen-Text für den ganzen Spieltag (Spec 002 FR-T05, zweiter Teil) bleibt im Backlog.
- Spec 022 (Paket E) ändert parallel Layout und Pflichtfelder von "Neues Spiel"; die Vorbelegung dieser Spec gilt für jede Form des Formulars.
