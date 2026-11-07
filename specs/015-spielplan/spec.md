# Feature Specification: Spielplan im Live-Spieltag

**Feature Branch**: `015-spielplan` (Arbeitsbranch `claude/sharp-brahmagupta-kxgyie`)

**Created**: 2026-11-06

**Status**: Review A und Review B erledigt (06.11.2026, "passt"). US1 und US2 umgesetzt und übernommen (PR #63, Review C "i. O.", Merge 07.11.2026). US4 umgesetzt und übernommen (PR #66, Review C und Merge 07.11.2026). US3 und US7 umgesetzt und übernommen (PR #68, Review C und Merge 07.11.2026). US6 umgesetzt und übernommen (PR #70, Review C und Merge 07.11.2026). US5 umgesetzt (Draft-PR), Review C offen. Mockup: https://claude.ai/artifact/QjwveR3KsTdwFGGp3NpBX4 Umfang entspricht Roadmap C1 (Spielplan) und B3 (Kader je Mannschaft).

**Input**: Atti (06.11.2026): "Ist es möglich, dass ich zentral die Spiele anlege? Und dann an diejenigen, die tickern sollen, gezielt den Link verteile? […] sowas wie Spielzeit, Kader, Farbe und so weiter, oder gegebenenfalls Platzhalter." Ergänzt: "Die Spielpaarungen kann ich auf fußball.de nachgucken. […] ob ich diese Spiele schon mal zentral anlegen kann, zumindest von den Gegnernamen her, und ob wir auswärts spielen oder zu Hause. Die Trainer, die sich dieses Spiel dann picken aus dieser zentralen Liste, könnten noch alles ändern: Gegnername, Heim und Auswärts, Farbe, Spielzeit, Kader, alles. Dass ich schon mal ein größeres Set an Spielen anlege, woraus sich dann die Kollegen bedienen können."

## Ausgangslage

- Heute legt das Lead-Handy jedes Spiel selbst unter "Neues Spiel" an: Mannschaft, Gegner, Heim/Auswärts, Trikots, Spielzeit, Aufgebot. Mannschaften und Trikots kommen mit dem Trainer-Link (Spec 006), der Kader nicht; ihn pflegt jeder Trainer selbst oder übernimmt ihn per "Kader teilen" und "Liste einfügen" (Spec 001 FR-028).
- Alle Trainer-Handys sind über den Trainer-Link gekoppelt und empfangen Änderungen am Live-Spieltag (Titel, Mannschaften) automatisch (Spec 006 US5).
- Das Dashboard zeigt ein Spiel erst, wenn ein Lead-Handy es anlegt.
- Der Vermittlungsdienst hält Meldungen rund 12 Stunden vor (Spec 006 FR-L16). Kindernamen außer Torschützen und Vorlagen gehen nie über ihn (FR-L10, Constitution II).
- Der Kader ist je Handy eine einzige Liste. E1 und E2 teilen sich in Wirklichkeit einen Kader, E3 hat einen eigenen.
- Der Spielplan steht auf fußball.de: Datum, Anstoßzeit, Heim- und Gastmannschaft, Wettbewerb (z. B. Kreisstaffel, Bezirksfreundschaftsspiel, Hallen-Bezirksturnier mit mehreren Spielen am Tag).

## Clarifications

### Session 2026-11-06 (Chat, erste Fassung)

- Q: Spiel-Link je Spiel oder Spielplan zentral im Live-Spieltag? → A: zunächst Spiel-Link je Spiel. **Überholt** durch die Session "Umstellung" unten.
- Q: Kader: ganzer Kader der Mannschaft oder nur das Aufgebot? → A: Beides. Die Kader sind fest: E1 und E2 gemeinsam, E3 separat.
- Q: Platzhalter (z. B. Gegner noch unbekannt)? → A: Ja; alles bleibt auf dem Lead-Handy änderbar.
- Q: Sehen die Eltern das Spiel vorab? → A: Ja, sofern ein Gegnername eingetragen ist.

### Session 2026-11-06 (Review A, Kader)

- Q: Teilen sich E1 und E2 einen Kader, E3 hat einen eigenen? → A: Ja. Ein Trainer schickt einige Tage vor dem Spieltag die Aufteilung auf E1 und E2 in die Trainergruppe, damit Kinder und Eltern planen können. E3 läuft separat. Gelegentlich spielen ausgewählte E3-Kinder in der E2 mit, ebenso selten helfen E1/E2-Kinder in der E3 aus.
- Folgerung: benannte Kader ("E1/E2", "E3"); jedes Kind gehört zu genau einem Kader, jede Mannschaft spielt mit einem Kader. Aushilfen stehen im Aufgebot unter "Weitere Kinder" (US5).

### Session 2026-11-06 (Umstellung auf Spielplan)

- Atti: Ein größeres Set an Spielen zentral anlegen, aus dem sich die Kollegen bedienen und alles anpassen. Dazu Screenshots von fußball.de mit 20 Spielen für E1, E2 und E3 (Kreisstaffel, Freundschaftsspiel, Hallen-Bezirksturnier), jeweils mit Anstoßzeit.
- Entscheidung: Spielplan im Live-Spieltag statt Spiel-Link je Spiel. Jedes Trainer-Handy bekommt ihn automatisch; kein Link pro Spiel. Der Spiel-Link entfällt.
- Kader und Aufgebot gehen nicht über den Vermittlungsdienst (FR-L10). Weil die Kader die Saison über fest sind, genügt einmal "Kader teilen" und "Liste einfügen" je Kader (US5); das Aufgebot wählt der Trainer vor Ort.
- Anstoßzeit: optional, aus fußball.de bekannt; Eltern sehen sie.
- Damit Atti die Spiele nicht abtippen muss: "Spielplan einfügen" aus einer Textliste, Zeile für Zeile wie "Liste einfügen" beim Kader (US4).

### Session 2026-11-06 (Leistungsliga)

- Atti: Leistungsliga sonntags mit 3 × 25 Minuten, WFV-Spieltage (Kreisstaffel) mit 2 × 25 Minuten. Manche Termine haben zwei parallele Spiele gegen denselben Verein (E1 und E2), andere nur ein Spiel für die E1; für die E2 wird dann evtl. noch ein Gegner gesucht.
- Folgerung: Die Einfügezeile kann die Spielzeit tragen ("(Leistungsliga, 3×25)"), und "?" steht für "Gegner offen". Zwei Planspiele am selben Tag gegen denselben Verein für verschiedene Mannschaften sind zwei Einträge.
- Q (Atti): Kann man ein zusätzliches Spiel anlegen und trotzdem aufs Dashboard übertragen? → A: Ja. Jedes Spiel einer Mannschaft des Live-Spieltags geht vom Trainer-Handy aufs Dashboard, ob aus dem Plan oder nicht (Spec 006 FR-L06, US2 Szenario 6).

### Session 2026-11-06 (Review A, Antworten)

- Q: Sportvg Feuerbach I/II/III entspricht E1/E2/E3? → A: Ja.
- Q: E3 in den Live-Spieltag aufnehmen (E3-Trainer bekommen den Trainer-Link)? → A: Ja.
- Q: Darf jedes Trainer-Handy den Plan pflegen? → A: Ja.
- Wunsch (Atti): Wer den Trainer-Link hat, wählt ein Spiel aus der Liste und bestätigt damit kurz, dass er für dieses Spiel das Lead-Handy ist. → Neue US6 "Spiel vormerken".
- Q (Atti): Wann werden die Spiele für Zuschauer sichtbar und wie lange? → A: siehe US3 (Absatz "Sichtbarkeit").

### Session 2026-11-06 (Review C, Screenshots US1)

- Befund (Atti): Datum und Anstoß erschienen im Blatt im US-Format ("11/14/2026", "12:00 PM"); "Planspiel" als Überschrift war unklar; unklar, ob "Wettbewerb" Freitext und Pflicht ist; Pflichtfelder sollen markiert sein.
- Entscheidung: Datum und Anstoß werden immer deutsch angezeigt ("Sa 14.11.2026", "12:00"), unabhängig von der Sprache des Browsers; beim Tippen öffnet sich die Auswahl des Handys. Überschrift "Spiel hinzufügen" bzw. "Spiel bearbeiten". Wettbewerb bleibt freiwilliger Freitext mit Beispiel "z. B. Kreisstaffel". Pflichtfelder (Mannschaft, Datum, Heim/Auswärts) tragen einen Stern, Legende "* Pflichtfeld". Der Gegner bleibt freiwillig, damit Platzhalter wie "E2, Gegner offen" möglich sind (Review A).

### Session 2026-11-06 (Review A, Freigabe)

- Review A: "passt" (Atti, 06.11.2026), mit US6.
- Q: Ort als Feld? → A: Nein.
- Q: "Abgesagt" statt Löschen? → A: Ja (FR-P29).
- Q: Ganzer Spielplan für Eltern auf dem Dashboard? → A: Ja, nach Datum auf- und zuklappbar; vergangene Spiele stehen im Sammler "Vergangene Spiele" (US7).
- Folgerung: Planspiele vergangener Tage verschwinden nicht mehr, sondern wandern in "Vergangene Spiele", mit Endstand, wenn das Spiel aus dem Plan angelegt und beendet wurde. Damit bleiben die Ergebnisse der Saison für alle sichtbar, solange der Plan gesendet wird (Teil von Roadmap C3).
- Hallen-Cup: 1 × 10 oder 1 × 11 Minuten (24 Minuten zwischen den eigenen Spielen, eine andere Mannschaft spielt dazwischen); Spielzeit je Planspiel, vor Ort änderbar.

### Session 2026-11-07 (Umsetzung US4)

- Entscheidung (Agent, im Rahmen der Freigabe): Zeilen mit vergangenem Datum zeigt die Vorschau mit "Datum vorbei" und übernimmt sie nicht; so lässt sich die ganze Hinrunden-Liste auch nach den ersten Spieltagen einfügen.
- Entscheidung: Eine Zeile, die genau dem Planspiel entspricht, ändert nichts ("unverändert") und geht nicht erneut hinaus; sind alle Zeilen unverändert, heißt der Knopf "Nichts Neues".
- Entscheidung: "Spielplan teilen" lässt abgesagte Spiele weg; Wochentag und Datum ohne Jahr, damit die Liste in WhatsApp gut lesbar bleibt.
- Entscheidung: Ist der Plan voll (100 Spiele, FR-P03), zeigt die Vorschau weitere neue Zeilen mit Hinweis; Aktualisieren vorhandener Spiele geht weiter.
- Befund im Code-Review (FR-P17): Der Platzhalter "So 15.11. E2 heim ?" wäre beim Einfügen der Liste mit bekanntem Gegner doppelt entstanden. Entscheidung: Genau ein Platzhalter derselben Mannschaft am selben Tag wird aktualisiert; bei mehreren bleibt es bei einem neuen Spiel.
- Befund beim Prüfen (FR-P07): Ein Handy, das beim Öffnen ältere Plan-Meldungen vom Vermittlungsdienst nachlas, hielt sie für gerade gesendet und sendete den Plan deshalb nicht erneut. Korrektur: Maßgeblich ist die Sendezeit der empfangenen Meldung; eine ältere Meldung macht den Zeitpunkt nie früher.
- Erlaubte Schreibweisen zusätzlich zum Format: Wochentag ausgeschrieben ("Samstag,"), Datum mit Jahr ("14.11.2026" oder "14.11.26"), Anstoß "9.30 Uhr", "auswaerts", Spielzeit "2 x 20 min", Aufzählungszeichen am Zeilenanfang, Mannschaft in Klein- oder Großbuchstaben.

### Session 2026-11-07 (Umsetzung US3, US7)

- Entscheidung (Agent, im Rahmen der Freigabe): "Heute außerdem" bleibt wie bisher in den aufgeklappten Details (FR-P14 "wie bisher"); "Danach" und "Nächstes Spiel" stehen ohne Aufklappen unter der Karte (Mockup).
- Entscheidung: "Nächstes Spiel" steht unter einer Karte mit beendetem Spiel; unter einem laufenden, angelegten oder heute geplanten Spiel folgt noch etwas heute ("Danach" oder nichts).
- Befund im Code-Review: Ein Planspiel von heute wird nur Karte, solange es bevorsteht (Anstoß nach dem letzten beendeten Spiel von heute); sonst bleibt das Ergebnis Karte und das Planspiel steht als "Danach" (Edge Case "Spiel ohne Plan angelegt"). Ein Planspiel, dessen Spiel gelöscht wurde, erscheint nicht wieder.
- Entscheidung: Ein heute abgesagtes Planspiel kann Karte sein ("abgesagt" statt Anstoß), wenn heute kein anderes Spiel dieser Mannschaft folgt; abgesagte kommende Planspiele werden weder Karte noch "Nächstes Spiel".
- Entscheidung: Die Trikotfarbe des Gegners eines Planspiels ist unbekannt; die Karte zeigt dort einen leeren Platzhalter. Ohne Spiel heute heißt die Überschrift über den Karten "Als Nächstes" (nur Planspiele) bzw. "Zuletzt und als Nächstes".
- Entscheidung: Vergangene Spiele im Spielplan der Eltern zeigen Heim zuerst ("FC Kirchberg – E1", Mockup), kommende "E1 gegen …" bzw. "E1 bei …" (US7-S2).

### Session 2026-11-07 (Umsetzung US6)

- Entscheidung (Agent, im Rahmen der Freigabe): "Ich tickere" steht oben im Blatt "Spiel bearbeiten" statt in einem eigenen Auswahlblatt (Mockup); so bleibt Bearbeiten bei einem Tipp, und Vormerken kostet keinen zusätzlichen Schritt.
- Entscheidung: "Nicht mehr tickern" gibt ohne Rückfrage frei; vorgemerkt werden können nur kommende, nicht abgesagte, noch nicht angelegte Planspiele. Ein angelegtes Spiel zeigt "angelegt" statt "Tickert: …".
- Entscheidung: Ohne Namen heißt die Rückfrage beim Übernehmen "Ein anderer Trainer tickert dieses Spiel. Trotzdem übernehmen?". Der Vorname steht in den Einstellungen unter "Spielplan" (nur auf Trainer-Handys).
- Entscheidung: Vormerkungen werden je Planspiel nach ihrem Zeitpunkt zusammengeführt, unabhängig von Änderungen am Planspiel (research.md R-P10).

### Session 2026-11-07 (Umsetzung US5)

- Entscheidung (Agent, im Rahmen der Freigabe): "Kader teilen" schreibt bei mehreren Kadern "Kader E3:" in die erste Zeile. Der Doppelpunkt am Ende sorgt dafür, dass ältere App-Stände die Zeile wie eine Überschrift überspringen; das Wort "Kader" davor verhindert, dass eine WhatsApp-Überschrift wie "Aufstellung Samstag:" einen Kader anlegt. Mit nur einem Kader bleibt der Text wie bisher (ohne erste Zeile).
- Entscheidung: "Liste einfügen" ordnet erkannte Kinder dem Zielkader zu (Kadername aus der ersten Zeile, sonst der angezeigte Kader), auch wenn sie bisher in einem anderen Kader standen; die Vorschau zeigt das als "aus „E1/E2“". So genügt je Kader einmal "Kader teilen" und "Liste einfügen", damit ein zweites Handy dieselbe Aufteilung hat.
- Entscheidung: Ohne Auswahl im Aufgebot gilt bei mehreren Kadern der Kader der Mannschaft als Aufgebot (Torschützen-Auswahl zuerst mit diesen Kindern, die übrigen unter "Andere …"); mit nur einem Kader wie bisher der ganze Kader.
- Entscheidung: Umbenennen und Löschen des angezeigten Kaders stehen unter der Liste, sobald es mehr als einen Kader gibt; Löschen geht nur bei leerem Kader. Mannschaften mit einem gelöschten Kader spielen danach mit dem ersten Kader.
- Entscheidung: Die Bezeichnungen der App bleiben ("Spieler hinzufügen" statt "Kind hinzufügen" aus dem Mockup), damit Hilfe und Gewohnheit passen.
- Entscheidung (FR-P24): Die Sicherung enthält die Kader, die Zuordnung der Kinder und den Spielplan des Live-Spieltags. Beim Wiederherstellen kommen fehlende Kader dazu (ohne eigene Kader alle aus der Sicherung); den Spielplan übernimmt nur ein Handy mit demselben Live-Spieltag, je Planspiel gilt die jüngere Änderung.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Spielplan pflegen (Priority: P1)

Atti trägt unter "Mehr" → "Live-Spieltag" → "Spielplan" die bekannten Spiele ein: Mannschaft, Datum, Anstoßzeit, Gegner, Heim/Auswärts, Wettbewerb. Zweite Spiele neben der Leistungsliga ergänzt er später. Jedes Trainer-Handy des Live-Spieltags bekommt den Spielplan automatisch und kann ihn ebenso ändern.

**Why this priority**: Ohne Spielplan gibt es nichts zum Auswählen; das ist der Kern des Wunsches.

**Independent Test**: Auf Trainer-Handy A "Sa 14.11. 12:00 E1 heim gegen TSV Musterstadt (Kreisstaffel)" eintragen; Trainer-Handy B zeigt unter "Spielplan" denselben Eintrag innerhalb von 10 Sekunden.

**Acceptance Scenarios**:

1. **Given** ein Trainer-Handy, **When** der Nutzer unter "Spielplan" "Spiel hinzufügen" wählt, Mannschaft E1, Datum Sa 14.11., Anstoß 12:00, Gegner "TSV Musterstadt", Heim, Wettbewerb "Kreisstaffel" einträgt und speichert, **Then** steht das Spiel in der Liste unter "Sa 14.11." mit "12:00", "E1 – TSV Musterstadt" und darunter "Heim · Kreisstaffel".
2. **Given** Anstoß, Gegner und Wettbewerb bleiben leer, **When** gespeichert wird, **Then** steht das Spiel als "E1 – (Gegner offen)" im Plan.
3. **Given** ein Spiel im Plan, **When** es angetippt wird, **Then** lassen sich alle Angaben ändern; "Löschen" entfernt es nach Rückfrage. Optional kann eine eigene Spielzeit (z. B. Halle 1 × 12 Minuten) eingetragen werden; ohne Angabe gilt die Spielzeit der Mannschaft.
4. **Given** Trainer-Handy A ändert den Spielplan, **Then** übernehmen andere Trainer-Handys die Änderung, sobald sie sie empfangen (wie Spec 006 US5); ändern zwei Handys verschiedene Spiele, bleiben beide Änderungen erhalten; beim selben Spiel gilt die jüngste.
5. **Given** ein Handy ohne Kopplung, **Then** gibt es keinen Spielplan; "Neues Spiel" verhält sich wie bisher.
6. **Given** der Spielplan, **Then** zeigt er Spiele ab heute nach Datum und Anstoß, je Datum auf- und zuklappbar; Spiele vergangener Tage stehen eingeklappt unter "Vergangene Spiele", mit Endstand, falls bekannt.
7. **Given** ein Planspiel fällt aus, **When** der Nutzer "Abgesagt" wählt, **Then** steht es mit "abgesagt" im Plan, wird unter "Neues Spiel" nicht angeboten und erscheint auf dem Dashboard als "abgesagt"; "Wieder ansetzen" hebt das auf.

---

### User Story 2 - Spiel aus dem Spielplan anlegen (Priority: P1)

Am Spieltag öffnet der Trainer "Neues Spiel". Oben stehen die Spiele aus dem Plan, heutige zuerst. Ein Tipp füllt Mannschaft, Gegner, Heim/Auswärts, Trikots und Spielzeit aus; alles bleibt änderbar, auch das Aufgebot. "Weiter zum Anpfiff" legt das Spiel an. Was er hier ändert, gilt nur für sein Spiel, nicht für den Plan.

**Why this priority**: Hier spart der Trainer am Spielfeldrand die Eingaben.

**Independent Test**: Plan enthält heute "12:00 E1 auswärts SV Beispielhausen". Auf Trainer-Handy B "Neues Spiel", Eintrag antippen, "Weiter zum Anpfiff": Spielbildschirm mit Feuerbach E1 im Auswärtstrikot gegen SV Beispielhausen, Feuerbach rechts (Gast).

**Acceptance Scenarios**:

1. **Given** der Plan enthält heute Spiele, **When** "Neues Spiel" öffnet, **Then** steht oben "Aus dem Spielplan" mit den heutigen Spielen aller Mannschaften des Live-Spieltags; "Weitere Spiele" klappt die nächsten 14 Tage auf. Ohne Spiele heute ist der Abschnitt eingeklappt.
2. **When** ein Eintrag angetippt wird, **Then** sind Mannschaft, Gegner, Heim/Auswärts, Trikots (je nach Heim/Auswärts aus "Meine Mannschaften") und Spielzeit (Plan, sonst Mannschaft) ausgefüllt; das Aufgebot ist das zuletzt gewählte dieser Mannschaft (FR-M06).
3. **Given** ein ausgewählter Eintrag, **When** der Trainer Gegner, Heim/Auswärts, Farben, Spielzeit oder Aufgebot ändert, **Then** gilt das nur für dieses Spiel; der Plan bleibt unverändert.
4. **When** "Weiter zum Anpfiff" getippt wird, **Then** ist das angelegte Spiel mit dem Planeintrag verknüpft: Im Plan steht "angelegt", und das Dashboard zeigt keine zweite Karte (US3).
5. **Given** ein anderes Handy überträgt dasselbe Planspiel schon, **When** der Eintrag angetippt und "Weiter zum Anpfiff" getippt wird, **Then** fragt die App wie in Spec 006 US6 ("Spiel übernehmen").
6. **Given** kein Eintrag passt (z. B. Spiel kurzfristig angesetzt), **Then** legt der Trainer das Spiel wie bisher ohne Plan an; es geht wie jedes Spiel einer Mannschaft des Live-Spieltags aufs Dashboard.

---

### User Story 3 - Eltern sehen die nächsten Spiele (Priority: P2)

Auf dem Dashboard sehen die Eltern je Mannschaft, wann und gegen wen das nächste Spiel ist, mit Anstoßzeit. Am Spieltag wird aus dem geplanten Spiel das laufende; am Turniertag stehen die weiteren Spiele darunter.

**Why this priority**: Nutzen für die Eltern; der Spieltag funktioniert auch ohne.

**Sichtbarkeit**: Ein Planspiel mit Gegner ist für Zuschauer sichtbar, sobald es im Plan steht und gesendet wurde: bis zu seinem Tag als Zeile "Nächstes Spiel" unter der Karte, an seinem Tag als Karte. Ein beendetes Spiel bleibt Hauptinhalt der Karte bis zum Tag des nächsten Spiels dieser Mannschaft. Planspiele verschwinden am Tag nach ihrem Datum. Grenze des Vermittlungsdienstes (Spec 006 FR-L16): Wer das Dashboard schon einmal geöffnet hatte, sieht den zuletzt empfangenen Stand ohne Zeitgrenze; wer es erst später zum ersten Mal öffnet, sieht nur, was in den letzten rund 12 Stunden gesendet wurde. Trainer-Handys senden den Plan beim Öffnen erneut (FR-P07), Lead-Handys während eines Spiels laufend.

**Independent Test**: Plan enthält "Sa 14.11. 12:00 E1 heim gegen TSV Musterstadt". Gerät C mit Zuschauer-Link am 10.11.: E1-Karte zeigt das letzte Ergebnis und darunter "Nächstes Spiel: Sa 14.11., 12:00 gegen TSV Musterstadt". Am 14.11. zeigt die Karte "Feuerbach E1 – TSV Musterstadt · heute 12:00"; nach dem Anlegen und Anpfiff aus dem Plan wird dieselbe Karte zum laufenden Spiel.

**Acceptance Scenarios**:

1. **Given** E1 hat kein Spiel heute und ein Planspiel mit Gegner am 14.11., **Then** zeigt die E1-Karte das zuletzt beendete Spiel (wie bisher) und darunter "Nächstes Spiel: Sa 14.11., 12:00 gegen TSV Musterstadt"; ohne beendetes Spiel ist das Planspiel die Karte.
2. **Given** heute ist ein Planspiel von E1, das noch nicht angelegt ist, **Then** zeigt die Karte "Feuerbach E1 – TSV Musterstadt" (Heim zuerst) mit "heute 12:00", ohne Stand.
3. **Given** das Planspiel wird aus dem Plan angelegt und angepfiffen, **Then** zeigt dieselbe Karte das laufende Spiel; eine zweite Karte entsteht nicht.
4. **Given** E1 hat heute drei Planspiele (Turnier), **When** das erste beendet ist, **Then** zeigt die Karte das nächste Planspiel, darunter "Heute außerdem: 1:0 gegen …" und "Danach: 15:42 gegen …".
5. **Given** ein Planspiel ohne Gegner, **Then** erscheint es nicht auf dem Dashboard.
6. **Given** ein Planspiel wird gelöscht oder verschoben, **Then** übernimmt das Dashboard die Änderung, sobald es sie empfängt.

---

### User Story 4 - Spielplan als Liste einfügen und teilen (Priority: P2)

Atti kopiert eine Textliste mit allen Spielen (eine Zeile je Spiel) und fügt sie unter "Spielplan" → "Liste einfügen" ein. Die App zeigt vorab, was sie erkannt hat. "Spielplan teilen" erzeugt dieselbe Liste, z. B. für die Elterngruppe.

**Why this priority**: Spart das Abtippen von 20 Spielen; ohne geht es mit US1 auch.

**Independent Test**: Liste mit drei Zeilen einfügen ("Sa 14.11. 12:00 E1 heim TSV Musterstadt (Kreisstaffel)", "Sa 14.11. 12:00 E2 auswärts SV Beispielhausen", "Sa 28.11. 14:06 E3 heim FC Probestadt (Hallen-Bezirksturnier)"); Vorschau zeigt drei erkannte Spiele; nach "Übernehmen" stehen sie im Plan.

**Acceptance Scenarios**:

1. **Given** eine Zeile im Format "<Wochentag> <TT.MM.> [<HH:MM>] <Mannschaft> heim|auswärts <Gegner> [(<Wettbewerb>[, <Spielzeit>])]", z. B. "So 15.11. 10:00 E1 auswärts SV Beispielhausen E1 (Leistungsliga, 3×25)", **When** sie eingefügt wird, **Then** erkennt die App Datum, Anstoß, Mannschaft (Kürzel wie im Live-Spieltag, z. B. "E1"), Heim/Auswärts, Gegner, Wettbewerb und Spielzeit. Wochentag, Anstoß, Wettbewerb und Spielzeit sind optional; "H"/"A" gelten wie "heim"/"auswärts"; Spielzeit als "<Abschnitte>×<Minuten>" (auch "x"); "?" als Gegner bedeutet "Gegner offen".
2. **Given** eine Zeile ohne Jahr, **Then** gilt das nächste passende Datum ab 7 Tagen vor heute (Saisonwechsel über Silvester).
3. **Given** eine Zeile passt nicht ins Format, nennt eine unbekannte Mannschaft oder Wochentag und Datum passen nicht zusammen, **Then** zeigt die Vorschau sie mit Hinweis und übernimmt sie nicht; die übrigen Zeilen werden übernommen.
4. **Given** ein Spiel derselben Mannschaft am selben Tag gegen denselben Gegner steht schon im Plan, **Then** aktualisiert die Zeile diesen Eintrag statt ihn doppelt anzulegen.
5. **When** "Spielplan teilen" getippt wird, **Then** öffnet das Teilen-Menü mit allen Spielen ab heute (ohne abgesagte) im selben Format, nach Datum sortiert; die Liste lässt sich unverändert wieder einfügen.

---

### User Story 5 - Kader E1/E2 und E3 (Priority: P3)

Atti teilt die Kinder in zwei Kader auf: "E1/E2" und "E3". E1 und E2 spielen mit "E1/E2", E3 mit "E3". Jeder Kader lässt sich einzeln teilen und auf anderen Handys einfügen. Im Aufgebot stehen die Kinder des eigenen Kaders, Aushilfen aus dem anderen Kader unter "Weitere Kinder".

**Why this priority**: Unabhängig vom Spielplan; räumt das E1/E2/E3-Gemisch in Aufgebot und Torschützen-Auswahl auf (Roadmap B3).

**Independent Test**: Auf A gehören Max, Ben, Tom, Leo, Maxi zum Kader "E1/E2", Paul zu "E3". "Neues Spiel" für E2 zeigt im Aufgebot Max, Ben, Tom, Leo, Maxi und unter "Weitere Kinder" Paul. Kader "E3" teilen und auf B einfügen: Paul steht auf B im Kader "E3".

**Acceptance Scenarios**:

1. **Given** "Mehr" → "Kader" mit einem einzigen Kader (wie bisher), **When** der Nutzer "Kader hinzufügen" mit Namen "E3" wählt und Paul dorthin verschiebt, **Then** gibt es die Kader "Kader" (umbenennbar, z. B. in "E1/E2") und "E3"; Paul steht nur in "E3".
2. **Given** "Meine Mannschaften" → E1, **When** der Nutzer unter "Kader" den Kader "E1/E2" wählt, **Then** spielt E1 mit diesem Kader; E2 kann denselben wählen.
3. **Given** es gibt nur einen Kader, **Then** spielen alle Mannschaften damit, und "Neues Spiel" sowie "Mehr" → "Kader" sehen aus wie bisher.
4. **Given** "Neues Spiel" für E2, **Then** zeigt "Aufgebot" die Kinder des Kaders "E1/E2"; die Kinder anderer Kader stehen eingeklappt unter "Weitere Kinder" und sind wählbar (Aushilfe).
5. **Given** "Kader teilen" im Kader "E3", **Then** enthält der Text nur die Kinder von "E3" mit dem Kadernamen als erster Zeile; "Liste einfügen" auf einem anderen Handy legt fehlende Kinder in einem gleichnamigen Kader an (fehlt er, wird er angelegt).

---

### User Story 6 - Spiel vormerken: "Ich tickere" (Priority: P2)

Ein Trainer wählt im Spielplan ein Spiel und bestätigt kurz, dass sein Handy dafür das Lead-Handy ist. Alle Trainer sehen, wer welches Spiel tickert. Am Spieltag zeigt sein Startbildschirm das Spiel ganz oben; zwei Tipps bis zum Spielbildschirm.

**Why this priority**: Klärt vorab, wer tickert, und spart am Spieltag die Suche; ohne Vormerken geht es mit US2.

**Independent Test**: Trainer-Handy B merkt "Sa 14.11. 12:00 E1 gegen TSV Musterstadt" vor; Trainer-Handy A zeigt im Plan "Tickert: Jonas" (fiktiver Trainername). Am 14.11. zeigt B auf dem Startbildschirm "Heute tickerst du: 12:00 E1 gegen TSV Musterstadt"; Tipp und "Weiter zum Anpfiff" führen zum Spielbildschirm.

**Acceptance Scenarios**:

1. **Given** ein Planspiel ohne Vormerkung, **When** der Trainer es im Plan antippt und "Ich tickere" wählt, **Then** fragt die App "Du tickerst Sa 14.11., 12:00 E1 gegen TSV Musterstadt. Die anderen Trainer sehen das." mit "Ja, ich tickere" und "Abbrechen"; nach "Ja" steht im Plan auf allen Trainer-Handys "Tickert: <Name>".
2. **Given** der Trainer merkt zum ersten Mal vor, **Then** fragt die App einmal nach "Dein Name für die Trainer" (Vorname, optional); ohne Namen steht "Tickert: vergeben", auf dem eigenen Handy "Tickert: du".
3. **Given** ein Spiel ist vorgemerkt, **When** ein anderer Trainer "Ich tickere" wählt, **Then** fragt die App "Jonas tickert dieses Spiel. Trotzdem übernehmen?"; nach "Übernehmen" gilt die neue Vormerkung auf allen Handys.
4. **Given** eine eigene Vormerkung, **When** "Nicht mehr tickern" gewählt wird, **Then** ist das Spiel wieder frei.
5. **Given** am Spieltag ein vorgemerktes Spiel, **Then** zeigt der Startbildschirm des vormerkenden Handys oben "Heute tickerst du: 12:00 E1 gegen TSV Musterstadt"; ein Tipp öffnet "Neues Spiel" mit dem Planspiel ausgewählt (wie US2 Szenario 2).
6. **Given** ein vorgemerktes Spiel, **When** ein anderes Handy es trotzdem unter "Neues Spiel" anlegt, **Then** fragt die App vor "Weiter zum Anpfiff" "Jonas tickert dieses Spiel. Trotzdem hier erfassen?"; die Übertragung regelt danach Spec 006 US6.
7. **Given** Vormerkungen, **Then** erscheinen sie nicht auf dem Dashboard.

---

### User Story 7 - Ganzer Spielplan für Eltern (Priority: P2)

Unter den Karten steht auf dem Dashboard "Spielplan": alle kommenden Spiele, nach Datum gruppiert und je Datum auf- und zuklappbar, darunter eingeklappt "Vergangene Spiele" mit Endstand.

**Why this priority**: Eltern fragen sonst in der WhatsApp-Gruppe nach Terminen; der Spieltag funktioniert auch ohne.

**Independent Test**: Plan mit Spielen am 14.11. (E1, E2, E3) und 22.11. (E1, E2) sowie einem beendeten Planspiel am 07.11. (2:1); Gerät C mit Zuschauer-Link zeigt "Spielplan" mit "Sa 14.11." aufgeklappt (drei Zeilen), "So 22.11." zugeklappt und "Vergangene Spiele" mit "Sa 07.11. E1 2:1 gegen …".

**Acceptance Scenarios**:

1. **Given** Planspiele ab morgen, **Then** zeigt "Spielplan" je Datum eine Zeile ("Sa 21.11.", Anzahl Spiele); das nächste Datum ist aufgeklappt, alle anderen zugeklappt; ein Tipp klappt auf bzw. zu. Heutige Spiele stehen als Karten darüber (US3), nicht noch einmal im Plan.
2. **Given** ein aufgeklapptes Datum, **Then** steht je Spiel eine Zeile: Anstoß, Mannschaft, "gegen <Gegner>" bzw. "bei <Gegner>" (auswärts), Wettbewerb; abgesagte mit "abgesagt".
3. **Given** vergangene Planspiele, **Then** stehen sie eingeklappt unter "Vergangene Spiele", neueste zuerst, mit Endstand (Heim zuerst), sofern bekannt.
4. **Given** Planspiele ohne Gegner, **Then** erscheinen sie nicht.

---

### Edge Cases

- **Vermittlungsdienst hält Meldungen rund 12 Stunden**: Jedes Trainer-Handy speichert den zuletzt empfangenen Spielplan. Eine Änderung erreicht ein Handy nur, wenn es den Torticker innerhalb von rund 12 Stunden nach dem letzten Senden öffnet. Darum sendet jedes Trainer-Handy beim Öffnen den Plan erneut, wenn die letzte Meldung dazu älter als 6 Stunden ist (FR-P07). Fehlt ein Spiel trotzdem, legt der Trainer es wie bisher an; ein Weg ohne Netz zum Abgleich ist "Spielplan teilen" und "Liste einfügen" (US4).
- **Spiel verlegt oder abgesagt**: Datum ändern bzw. löschen; bereits angelegte Spiele bleiben unverändert.
- **Planspiel ohne Spiel vorbei**: Verschwindet am Folgetag aus Plan und Dashboard.
- **Spiel ohne Plan angelegt, obwohl ein Planspiel heute existiert**: Beide erscheinen; das Planspiel steht bis Tagesende als "Danach"-Zeile bzw. kann im Plan gelöscht werden.
- **Hallenturnier**: Heim/Auswärts ist dort nur die Reihenfolge laut Plan; der Trainer ändert es bei Bedarf beim Anlegen. Die Hallenspielzeit wird je Planspiel eingetragen (US1 Szenario 3).
- **Mannschaft nicht im Live-Spieltag** (z. B. E3 noch nicht aufgenommen): Beim Einfügen bietet die Vorschau "E3 zum Live-Spieltag hinzufügen" an (Spec 006 US5); sonst werden diese Zeilen nicht übernommen.
- **Neu ausgestellter Live-Spieltag**: Der Spielplan wandert mit wie Titel und Mannschaften.
- **Kopplung beenden**: Der Plan verschwindet von diesem Handy; angelegte Spiele bleiben.
- **Gleicher Vorname in zwei Kadern**: Unterscheidung wie bisher über Rückennummer oder Kürzel (Spec 001 FR-020).
- **Größe**: Ein Plan mit 100 Spielen (Saison mit drei Mannschaften, inklusive vergangener) muss in eine Meldung passen (SC-P05). Darüber fallen die ältesten vergangenen Spiele weg.

## Requirements *(mandatory)*

### Functional Requirements

**Spielplan pflegen (US1)**

- **FR-P01**: Ein Trainer-Handy MUSS unter "Mehr" → "Live-Spieltag" den Eintrag "Spielplan" haben: Liste der Planspiele ab heute, gruppiert nach Datum, je Zeile Anstoß (falls bekannt), "E1 – <Gegner>" bei Heimspielen bzw. "E1 bei <Gegner>" bei Auswärtsspielen (ohne Gegner "E1 – (Gegner offen)"), darunter "Heim" bzw. "Auswärts", Wettbewerb und Spielzeit, rechts der Zustand ("frei", "abgesagt", ab US2 "angelegt", ab US6 "Tickert: …"). Das heutige bzw. nächste Datum ist aufgeklappt, die übrigen sind zugeklappt.
- **FR-P02**: Ein Planspiel MUSS enthalten: Mannschaft des Live-Spieltags (Pflicht), Datum (Pflicht, Vorgabe nächster Samstag), Heim/Auswärts (Pflicht, Vorgabe Heim), Anstoß (optional), Gegner (optional, 1 bis 40 Zeichen), Wettbewerb (optional, Freitext bis 40 Zeichen), Spielzeit (optional, Schema wie in "Neues Spiel"). Das Blatt heißt "Spiel hinzufügen" bzw. "Spiel bearbeiten", markiert Pflichtfelder mit "*" (Legende "* Pflichtfeld") und zeigt Datum und Anstoß immer deutsch ("Sa 14.11.2026", "12:00").
- **FR-P03**: Jedes Trainer-Handy MUSS Planspiele hinzufügen, ändern und löschen können (gleichberechtigt wie Spec 006 FR-L19). Höchstens 100 Planspiele insgesamt; ist die Grenze erreicht, fallen die ältesten vergangenen weg, sind alle künftig, erscheint ein Hinweis.
- **FR-P04**: Änderungen MÜSSEN je Planspiel zusammengeführt werden: Änderungen an verschiedenen Spielen gehen nicht verloren, beim selben Spiel gilt die jüngste; gelöschte Spiele kommen durch ältere Meldungen nicht zurück.
- **FR-P05**: Planspiele vergangener Tage MÜSSEN am Folgetag aus "Neues Spiel" verschwinden und im Plan sowie auf dem Dashboard unter "Vergangene Spiele" stehen (eingeklappt, neueste zuerst).
- **FR-P29**: Ein Planspiel MUSS sich als "abgesagt" markieren und wieder ansetzen lassen. Abgesagte Spiele erscheinen nicht unter "Neues Spiel" und auf dem Dashboard mit "abgesagt" statt Anstoß.
- **FR-P30**: Wird ein aus dem Plan angelegtes Spiel beendet (Schlusspfiff, ggf. Elfmeterschießen), MUSS das Lead-Handy den Endstand in das Planspiel übernehmen und den Plan senden; ein zurückgenommener Schlusspfiff (Spec 012) entfernt ihn wieder.

**Übertragen**

- **FR-P06**: Der Spielplan MUSS wie die Konfiguration des Live-Spieltags übertragen werden: mit dem Organisator-Schlüssel signiert, verschlüsselt, über denselben Vermittlungsdienst, sofort bei jeder Änderung. Übertragen werden nur die Angaben aus FR-P02 und die Verknüpfung mit einem angelegten Spiel; keine Kindernamen.
- **FR-P07**: Jedes Trainer-Handy MUSS den zuletzt empfangenen Spielplan speichern und beim Öffnen des Torticker die Planspiele ab heute erneut senden, die seit mehr als 6 Stunden weder von ihm gesendet noch in diesem Stand empfangen wurden; bei empfangenen Meldungen zählt ihre Sendezeit.
- **FR-P08**: Spec 006 FR-L10 wird um den Spielplan (FR-P06) ergänzt.

**Spiel aus dem Plan (US2)**

- **FR-P09**: "Neues Spiel" MUSS auf einem Trainer-Handy oben den Abschnitt "Aus dem Spielplan" zeigen: die heutigen, noch nicht angelegten Planspiele aller Mannschaften des Live-Spieltags nach Anstoß; "Weitere Spiele" zeigt die nächsten 14 Tage. Ohne heutige Spiele ist der Abschnitt eingeklappt; ohne Planspiele entfällt er.
- **FR-P10**: Ein angetipptes Planspiel MUSS Mannschaft, Gegner, Heim/Auswärts, eigene Trikotfarbe (je nach Heim/Auswärts aus "Meine Mannschaften"), Spielzeit (Plan, sonst Mannschaft) und das gemerkte Aufgebot der Mannschaft vorbelegen. Alle Felder bleiben änderbar; Änderungen betreffen nur das neue Spiel.
- **FR-P11**: Ein aus dem Plan angelegtes Spiel MUSS mit dem Planspiel verknüpft sein; im Plan steht es als "angelegt", in "Aus dem Spielplan" erscheint es nicht mehr. Die Prüfung "wird schon übertragen" (Spec 006 FR-L22) gilt unverändert; ein nicht angelegtes Planspiel zählt dort nicht als Übertragung.

**Dashboard (US3)**

- **FR-P12**: Das Dashboard MUSS Planspiele mit Gegner berücksichtigen, je Mannschaft weiter eine Karte (Spec 006 FR-L14). Hauptinhalt der Karte, in dieser Reihenfolge: laufendes Spiel; sonst ein heutiges Spiel (angelegt oder geplant), das noch nicht beendet ist, das früheste zuerst; sonst das zuletzt beendete Spiel; sonst das nächste Planspiel.
- **FR-P13**: Ein nicht angelegtes Planspiel als Karte MUSS Mannschaft, Gegner (Heim zuerst), Trikotfarben der eigenen Mannschaft und "heute 12:00" bzw. "Sa 14.11., 12:00" (ohne Anstoß nur das Datum) zeigen, ohne Stand.
- **FR-P14**: Unter der Karte MÜSSEN stehen: "Heute außerdem" (beendete Spiele von heute, wie bisher), "Danach: <Anstoß> gegen <Gegner>" für weitere Planspiele von heute und, wenn heute keines mehr folgt, "Nächstes Spiel: <Datum>, <Anstoß> gegen <Gegner>".
- **FR-P15**: Wird ein Planspiel angelegt, MUSS dieselbe Karte das Spiel zeigen (keine zweite Karte).

**Liste einfügen und teilen (US4)**

- **FR-P16**: "Spielplan" MUSS "Liste einfügen" anbieten: Textfeld (Zwischenablage wie Spec 012 FR-S02), Vorschau mit erkannten Spielen und Hinweisen je Zeile (Format, unbekannte Mannschaft, Wochentag passt nicht zum Datum, Datum vorbei), dann "Übernehmen". Format siehe US4 Szenario 1 und 2.
- **FR-P17**: Eine eingefügte Zeile zu einem vorhandenen Planspiel (gleiche Mannschaft, gleiches Datum, gleicher Gegner ohne Groß- und Kleinschreibung) MUSS dieses aktualisieren. Gibt es keines, aber genau einen Platzhalter "Gegner offen" dieser Mannschaft an diesem Tag, bekommt dieser den Gegner aus der Zeile.
- **FR-P18**: Nennt eine Zeile eine Mannschaft aus "Meine Mannschaften", die nicht zum Live-Spieltag gehört, MUSS die Vorschau "<Mannschaft> zum Live-Spieltag hinzufügen" anbieten.
- **FR-P19**: "Spielplan teilen" MUSS alle Spiele ab heute (ohne abgesagte) im Einfügeformat über das Teilen-Menü ausgeben; die Ausgabe ist ohne Änderung wieder einfügbar.

**Kader (US5)**

- **FR-P20**: "Mehr" → "Kader" MUSS mehrere benannte Kader erlauben (höchstens 6): hinzufügen, umbenennen, löschen (nur leer) und Kinder zwischen Kadern verschieben. Jedes Kind gehört zu genau einem Kader. Bestehende Kinder liegen im Kader "Kader". Mit nur einem Kader bleibt die Ansicht wie bisher.
- **FR-P21**: "Meine Mannschaften" → Mannschaft MUSS die Auswahl "Kader" haben (Vorgabe: der erste Kader). Mehrere Mannschaften dürfen denselben Kader haben.
- **FR-P22**: "Neues Spiel" MUSS im Aufgebot die Kinder des Kaders der Mannschaft zeigen und die Kinder anderer Kader eingeklappt unter "Weitere Kinder" (wählbar als Aushilfe). Torschützen-Auswahl und Vorlagen bleiben wie bisher (Aufgebot zuerst).
- **FR-P23**: "Kader teilen" MUSS den angezeigten Kader mit seinem Namen als erster Zeile teilen; "Liste einfügen" MUSS bei einer solchen ersten Zeile die Kinder dem gleichnamigen Kader zuordnen (fehlt er, wird er angelegt). Listen ohne Kadernamen gehen wie bisher in den angezeigten Kader.

**Vormerken (US6)**

- **FR-P25**: Ein Planspiel MUSS sich auf einem Trainer-Handy mit "Ich tickere" und einer Bestätigung vormerken lassen; die Vormerkung (Handy-Kennung, optionaler Vorname des Trainers, Zeitpunkt) wird wie der Plan übertragen (FR-P06) und auf allen Trainer-Handys im Plan als "Tickert: <Name>" bzw. "Tickert: vergeben" oder "Tickert: du" gezeigt.
- **FR-P26**: Den Vornamen MUSS die App beim ersten Vormerken einmal erfragen (optional, 1 bis 20 Zeichen) und in den Einstellungen änderbar machen.
- **FR-P27**: Ist ein Spiel vorgemerkt, MÜSSEN "Ich tickere" und "Weiter zum Anpfiff" auf einem anderen Handy erst nach der Rückfrage aus US6 Szenario 3 bzw. 6 weitergehen. "Nicht mehr tickern" gibt das Spiel frei.
- **FR-P28**: Der Startbildschirm MUSS am Tag eines eigenen vorgemerkten Spiels oben "Heute tickerst du: <Anstoß> <Mannschaft> gegen <Gegner>" zeigen (mehrere untereinander); ein Tipp öffnet "Neues Spiel" mit diesem Planspiel.

**Allgemein**

- **FR-P24**: Spielplan und Kader MÜSSEN in der Sicherung enthalten sein und beim Wiederherstellen übernommen werden.

### Key Entities

- **Planspiel**: Kennung, Mannschaft (Kürzel des Live-Spieltags), Datum, Anstoß (optional), Heim/Auswärts, Gegner (optional), Wettbewerb (optional), Spielzeit (optional), Zeitpunkt der letzten Änderung, gelöscht ja/nein, Kennung des daraus angelegten Spiels.
- **Spielplan**: Menge der Planspiele eines Live-Spieltags, auf jedem Trainer-Handy gespeichert.
- **Kader**: Benannte Liste von Kindern, z. B. "E1/E2" und "E3", je Handy. Jedes Kind gehört zu genau einem Kader; jede Mannschaft spielt mit einem Kader.

## Hilfe *(mandatory)*

| Eintrag | Änderung | Quelle |
|---|---|---|
| `spielplan` "Wie trage ich den Spielplan ein?" | neu | 015 US1 |
| `spiel-aus-plan` "Wie lege ich ein Spiel aus dem Spielplan an?" | neu | 015 US2 |
| `spielplan-liste` "Wie füge ich den ganzen Spielplan auf einmal ein?" | neu | 015 US4 |
| `spielplan-fehlt` "Warum fehlt ein Spiel im Spielplan?" | neu (12 Stunden, Abhilfe) | 015 FR-P07 |
| `spiel-vormerken` "Wie sage ich an, dass ich ein Spiel tickere?" | neu | 015 US6 |
| `neues-spiel` "Wie lege ich ein Spiel an?" | geändert: "Aus dem Spielplan" | 001 US1, 015 US2 |
| `live-verwalten` "Wie ändere ich Titel oder Mannschaften des Live-Spieltags?" | geändert: Verweis auf "Spielplan" | 006 US5, 015 US1 |
| `eltern-dashboard` "Wie verfolge ich die Spiele als Elternteil?" | geändert: nächstes Spiel mit Anstoß, Spielplan, vergangene Spiele | 006 US3, 015 US3, US7 |
| `kader-mehrere` "Wie lege ich einen zweiten Kader an, z. B. für die E3?" | neu | 015 US5 |
| `kader` "Wie pflege ich den Kader?" | geändert: mehrere Kader, Kinder verschieben | 001 US5, 015 US5 |
| `kader-liste` "Wie übernehme ich eine Spielerliste aus WhatsApp?" | geändert: Kadername in der ersten Zeile | 001 FR-028, 015 FR-P23 |
| `mannschaft` "Wie lege ich meine Mannschaft an?" | geändert: Auswahl "Kader" | 004 US1, 015 US5 |
| `aufgebot` "Wie wähle ich das Aufgebot für ein Spiel?" | geändert: "Weitere Kinder" für Aushilfen | 004 FR-M06, 015 US5 |

## Success Criteria *(mandatory)*

- **SC-P01**: Ein Trainer kommt am Spieltag mit 3 Tipps vom Startbildschirm auf den Spielbildschirm (Neues Spiel, Planspiel, Weiter zum Anpfiff), ohne ein Feld auszufüllen.
- **SC-P02**: Atti überträgt 20 Spiele per "Liste einfügen" in unter 2 Minuten in den Plan.
- **SC-P03**: Eine Änderung am Plan erscheint bei Netz innerhalb von 10 Sekunden auf geöffneten Trainer-Handys und Dashboards.
- **SC-P04**: Das Dashboard zeigt für ein Spiel nie zwei Karten (Planspiel und angelegtes Spiel).
- **SC-P05**: Ein Plan mit 100 Spielen passt in eine Meldung des Vermittlungsdienstes.
- **SC-P06**: Domain-Logik (Zusammenführen, Einfügeformat, Ordnung auf dem Dashboard, Kader) mit 100 % Branch-Coverage; Netzwerk-Wächter ohne neue Ziele.
- **SC-P07**: Ein Trainer mit vorgemerktem Spiel kommt am Spieltag mit 2 Tipps vom Startbildschirm auf den Spielbildschirm.

## Assumptions

- Jedes Trainer-Handy darf den Plan pflegen (wie Titel und Mannschaften, Spec 006 FR-L19); eine Rolle "nur Atti" gibt es nicht (Review A).
- Mannschaften im Plan sind die des Live-Spieltags; E3 wird aufgenommen, die E3-Trainer bekommen den Trainer-Link (Review A).
- Der Vorname des Trainers in einer Vormerkung reist wie der Plan verschlüsselt mit; das Dashboard zeigt ihn nicht. Ob er für Zuschauer technisch unlesbar sein muss, klärt der Plan (Constitution III betrifft Kinder, nicht Trainer).
- Kein automatischer Abruf von fußball.de (Netzwerk-Wächter, Constitution II); Atti fügt eine Textliste ein.
- Aufgebot und Aufteilung auf E1/E2 bleiben beim Trainer vor Ort bzw. in der Trainergruppe; eine Unterstützung der Aufteilung in der App ist nicht Teil dieser Spec.
- Keine neue Laufzeit-Abhängigkeit; Übertragung nach dem Muster der Konfiguration (Spec 006 R-L17).
- Beispiele und Tests nutzen nur fiktive Vereins- und Kindernamen.
