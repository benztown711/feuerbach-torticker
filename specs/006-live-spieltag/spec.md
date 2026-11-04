# Feature Specification: Live-Spieltag (Dashboard für Eltern, Lead-Handys senden automatisch)

**Feature Branch**: `006-live-spieltag`

**Created**: 2026-11-04

**Status**: Review A und Review B erledigt (04.11.2026), Plan erstellt. Mockup: https://claude.ai/artifact/FFj3NdrNzW4UqR9munviqo Voraussetzung: Constitution 2.0.0 (Prinzip II, Live-Kopplung).

**Input**: User description: "Live-Spielstände zwischen unseren beiden Mannschaften einsehen. Option C (automatische Live-Kopplung). Ein Dashboard 'Unser Spieltag E1 & E2', auf dem alle Eltern zuschauen können, neben den lokalen Tortickern. Wir legen fest, welche Handys ihre Spielstände in das Dashboard syncen: Lead-Handy 1 und Lead-Handy 2, ggf. mehr (E3). Lead-Handy ist das Handy am Spielfeldrand, das den Torticker bedient, nicht zwingend das des Trainers. Der Sync Richtung Dashboard erfolgt automatisch."

## Clarifications

### Session 2026-11-04

- Q: Live-Stände nur per Tap (Zwischenstand teilen), per Link mit laufender Minute oder automatisch? → A: Automatisch (Option C), und zwar als gemeinsames Dashboard für alle Eltern statt nur zwischen zwei Trainerhandys.
- Q: Constitution Prinzip II ("kein Server") lockern? → A: Ja, für eine vom Nutzer aktivierte, Ende-zu-Ende verschlüsselte Live-Kopplung über einen kostenlosen Vermittlungsdienst ohne Konto (Constitution 2.0.0).
- Q: Wie viele Mannschaften? → A: Mindestens zwei (E1, E2), weitere möglich (E3).

### Session 2026-11-04 (Review A)

- Annahmen (Organisator, Ersatzhandy, übertragene Daten, Testspiel abschaltbar, Verhalten im Funkloch) → bestätigt.
- Q: Wie lange gilt der Zuschauer-Link? → A: Die ganze Saison. Je Mannschaft zählt das neueste Spiel; legt das Lead-Handy ein neues Spiel an, verschwindet das alte vom Dashboard. Ergänzung: Frühere Spiele desselben Tages (Turnier, Spieltag) bleiben als kurze Zeile unter der Karte stehen (FR-L14). Für Zuschauer, die das Dashboard erst später öffnen, ist ein Endstand nur rund 12 Stunden abrufbar (Grenze des kostenlosen Dienstes); wer es schon geöffnet hatte, sieht ihn bis zum nächsten Spiel (FR-L16).
- Q: Torschützen auf dem Dashboard? → A: Ja, Vornamen bzw. Kürzel wie im Teilen-Text (FR-L10).
- Q: Andere Spiele im Spielbildschirm des Lead-Handys? → A: Eltern sehen auf dem Dashboard ohnehin alle Spiele. Für Lead-Handys gilt die Empfehlung: eine kleine Zeile je anderem Spiel, sofern der Spielbildschirm auf dem iPhone SE ohne Scrollen bleibt; Prüfung im Mockup (US4).
- Q: Mengengerüst? → A: Bis zu 40 Zuschauer je Mannschaft (20 Kinder, je zwei Elternteile), bei drei Mannschaften also bis zu 120 gleichzeitig (SC-L08).
- Q: Benachrichtigung bei Toren (Push)? → A: Kommt in Frage, wenn der Dienst kostenlos ist (SaaS). Entscheidung in Review B (siehe unten).

### Session 2026-11-04 (Review B, Entwurf 1)

- Q: Benachrichtigung bei Toren: A ntfy-App, B eigener Gratis-Dienst mit Web-Push, C keine? → A: Vorerst C. Danach folgt B als eigene Spec 007 (Backlog), die auch den Endstand bis zum nächsten Spiel für alle Zuschauer sichtbar hält.
- Q: Karten im Dashboard? → A: Aufklappbar. Zugeklappt nur Mannschaftsnamen, Ergebnis und Minute bzw. Phase; Details (Anpfiff, Halbzeitstand, Torverlauf mit Torschützen, "Heute außerdem", Hinweis auf alte Meldung) erst nach Tipp (FR-L12).
- Q: Wo ist die Zeile mit den anderen Spielen? → A: Im Mockup unter "Lead-Handy" schlecht auffindbar; Entwurf 2 markiert sie und bietet direkte Links je Ansicht.
- Review B freigegeben (04.11.2026).

### Session 2026-11-04 (Planung)

- Befund: Auf dem iPhone öffnet ein Link aus WhatsApp immer Safari, nie die auf dem Home-Bildschirm installierte App; beide haben getrennte Daten. Ein angetippter Lead-Link würde also Safari koppeln statt des Torticker am Spielfeldrand. → Entscheidung: Der Lead-Link wird im Torticker unter "Mehr" → "Live-Spieltag" → "Lead-Link einfügen" eingefügt (wie "Liste einfügen" beim Kader). Öffnet jemand den Lead-Link im Browser, erklärt die Seite diesen Weg und bietet "Link kopieren" an; wer den Torticker nur im Browser nutzt, kann dort direkt koppeln (FR-L03).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live-Spieltag anlegen und Lead-Handys festlegen (Priority: P1)

Atti legt auf seinem Handy einen Live-Spieltag "Unser Spieltag" mit den Mannschaften E1 und E2 an. Er bekommt einen Zuschauer-Link für die Elterngruppe und je Mannschaft einen Lead-Link. Den Lead-Link für E2 schickt er an das Handy, das beim E2-Spiel den Torticker bedient. Dort öffnet man den Link einmal, und das Handy ist ab dann Lead-Handy für E2.

**Why this priority**: Ohne festgelegte Lead-Handys gibt es keine Daten für das Dashboard; die Kopplung ist der bewusste Schritt, mit dem Daten das Gerät verlassen dürfen (Constitution II).

**Independent Test**: Auf Gerät A Live-Spieltag mit E1 und E2 anlegen, Lead-Link E2 auf Gerät B öffnen und bestätigen; Gerät B zeigt "Lead für Feuerbach E2".

**Acceptance Scenarios**:

1. **Given** "Meine Mannschaften" enthält E1, E2 und E3, **When** der Nutzer unter "Mehr" → "Live-Spieltag" mit Titel "Unser Spieltag" die Mannschaften E1 und E2 wählt und anlegt, **Then** zeigt die App "Zuschauer-Link teilen" sowie je Mannschaft "Lead-Link teilen" (E1, E2) und die Frage, ob dieses Handy selbst Lead für eine der Mannschaften ist.
2. **Given** ein Lead-Link für E2, **When** er auf einem anderen Handy im Torticker unter "Mehr" → "Live-Spieltag" → "Lead-Link einfügen" eingefügt wird, **Then** fragt die App "Dieses Handy sendet ab jetzt live für Feuerbach E2 an 'Unser Spieltag'?"; nach "Ja" zeigt "Mehr" → "Live-Spieltag" den Eintrag "Lead für Feuerbach E2".
3. **Given** das Handy hat die Mannschaft E2 noch nicht in "Meine Mannschaften", **When** der Lead-Link bestätigt wird, **Then** wird E2 mit Name, Heim- und Auswärtstrikot aus dem Link übernommen.
4. **Given** ein Handy ohne Kopplung, **Then** sendet es nichts und verbindet sich mit keinem Vermittlungsdienst.
5. **Given** der Zuschauer-Link wird im Torticker geöffnet oder eingefügt, **Then** wird das Handy nicht zum Lead-Handy, sondern zeigt nur das Dashboard.
6. **Given** ein Lead-Link wird im Browser angetippt (z. B. aus WhatsApp), **Then** erklärt die Seite: "Kopiere den Link und füge ihn im Torticker unter Mehr → Live-Spieltag ein", bietet "Link kopieren" und zusätzlich "Hier im Browser koppeln" für alle, die den Torticker nicht installiert haben.

---

### User Story 2 - Lead-Handy sendet automatisch (Priority: P1)

Am Spielfeldrand wird wie gewohnt erfasst: Anpfiff, Tore, Pausenpfiff, Schlusspfiff. Ohne weiteren Tap erscheint alles auf dem Dashboard. Fehlt das Netz, läuft die Erfassung ungestört weiter und der Stand wird nachgereicht.

**Why this priority**: Kern des Wunsches: Live ohne Zutun der Person am Spielfeldrand.

**Independent Test**: Gerät B (Lead für E2) legt ein E2-Spiel an, pfeift an, erfasst ein Tor; Gerät C mit Zuschauer-Link zeigt Anpfiff und Tor ohne Neuladen.

**Acceptance Scenarios**:

1. **Given** Gerät B ist Lead für E2 und hat Netz, **When** ein Spiel von E2 angepfiffen wird, **Then** erscheint es innerhalb von 10 Sekunden auf dem Dashboard mit Gegner, Trikotfarben, 0:0 und laufender Minute.
2. **Given** ein laufendes E2-Spiel, **When** ein Tor erfasst, rückgängig gemacht, entfernt oder wiederhergestellt wird, **Then** zeigt das Dashboard innerhalb von 10 Sekunden den korrigierten Stand.
3. **Given** Pausenpfiff, Uhr angehalten, Fortsetzen, Schlusspfiff, Verlängerung oder Elfmeterschießen (Spec 003), **Then** zeigt das Dashboard die passende Phase (siehe FR-L12).
4. **Given** kein Netz, **When** ein Tor erfasst wird, **Then** wird es so schnell wie ohne Kopplung gezählt; die Kopfzeile zeigt "Live: wartet auf Netz"; sobald wieder Netz da ist, kommt der aktuelle Stand auf dem Dashboard an.
5. **Given** Gerät B ist nur Lead für E2, **When** dort ein Spiel einer anderen Mannschaft (z. B. E3) erfasst wird, **Then** wird dieses Spiel nicht gesendet.
6. **Given** ein E2-Spiel, **When** der Nutzer im "…"-Menü "Nicht live senden" wählt (z. B. Testspiel), **Then** verschwindet das Spiel vom Dashboard und wird nicht mehr gesendet, bis "Live senden" wieder gewählt wird.
7. **Given** ein Spiel wird auf dem Lead-Handy gelöscht, **Then** verschwindet es vom Dashboard.

---

### User Story 3 - Eltern schauen zu (Priority: P1)

Eltern öffnen den Zuschauer-Link aus der WhatsApp-Gruppe im Browser, ohne Installation und ohne Konto, und sehen alle Spiele des Spieltags mit Stand und laufender Minute.

**Why this priority**: Das ist der sichtbare Nutzen für alle, die nicht am Platz sind oder beim anderen Spiel stehen.

**Independent Test**: E1 läuft 2:1 in Minute 37, E2 ist in der Halbzeitpause 0:0; Zuschauer-Link auf einem dritten Gerät öffnen.

**Acceptance Scenarios**:

1. **Given** E1 führt 2:1 in Minute 37 und E2 ist in der Halbzeitpause 0:0, **When** ein Elternteil den Zuschauer-Link öffnet, **Then** sieht es innerhalb von 5 Sekunden "Unser Spieltag" mit zwei Karten: "Feuerbach E1 2:1 TSV Musterstadt · 37'" und "Feuerbach E2 0:0 SV Beispielhausen · Halbzeit".
2. **Given** ein laufendes Spiel, **Then** zählt die Minute auf dem Dashboard ohne neue Meldung weiter, einschließlich Nachspielzeit ("25+2'").
3. **Given** ein neues Tor, **Then** hebt sich die Karte für einige Sekunden hervor (ohne Ton), auch zugeklappt; aufgeklappt steht das Tor oben im Torverlauf mit Minute, Stand und Torschütze.
4. **Given** das Dashboard wird geöffnet, **Then** sind alle Karten zugeklappt und zeigen nur Mannschaftsnamen, Ergebnis und Minute bzw. Phase; **When** der Nutzer auf eine Karte tippt, **Then** klappt sie auf (Anpfiff, Halbzeitstand, alle Tore neuestes zuerst); ein weiterer Tipp klappt sie wieder zu. Mehrere Karten dürfen gleichzeitig offen sein.
5. **Given** heute läuft noch kein Spiel, **Then** zeigt das Dashboard "Heute noch kein Spiel live" und die Mannschaften des Spieltags.
6. **Given** das Gerät des Zuschauers verliert die Verbindung, **Then** zeigt das Dashboard "Keine Verbindung · Stand von 10:42 Uhr" und aktualisiert sich selbst, sobald die Verbindung zurück ist.
7. **Given** ein laufendes Spiel, von dessen Lead-Handy seit mehr als 5 Minuten keine Meldung kam, **Then** zeigt die Karte "Letzte Meldung vor 7 Min" (die Minute läuft weiter).
8. **Given** ein Spiel ist beendet, **Then** steht es mit "Ende" und (aufgeklappt) Datum und Schlusspfiff unter den laufenden Spielen, bis seine Mannschaft an einem anderen Tag ein neues Spiel anlegt (FR-L16).
9. **Given** E2 hat heute schon 2:1 gegen TSV Musterstadt gespielt und das nächste Spiel läuft, **Then** zeigt die E2-Karte das laufende Spiel und darunter die Zeile "Heute außerdem: 2:1 gegen TSV Musterstadt".
10. **Given** der Zuschauer-Link, **Then** gibt es auf dem Dashboard keine Bedienelemente zum Ändern; Meldungen, die nicht von einem festgelegten Lead-Handy stammen, werden ignoriert.

---

### User Story 4 - Blick auf das andere Spiel (Priority: P2)

Wer am Spielfeldrand von E1 steht, will kurz sehen, wie es bei E2 steht, ohne die Erfassung zu verlassen.

**Why this priority**: Ursprünglicher Auslöser des Wunsches; das Dashboard allein deckt es schon mit einem Tap ab, die Anzeige im Spielbildschirm ist Komfort.

**Independent Test**: Gerät A (Lead E1) im laufenden Spiel; Gerät B (Lead E2) erfasst ein Tor; Gerät A zeigt den neuen E2-Stand.

**Acceptance Scenarios**:

1. **Given** ein laufendes Spiel auf einem Lead-Handy, **When** der Nutzer auf das Kennzeichen "Live" in der Kopfzeile tippt, **Then** öffnet sich das Dashboard; "Spiel" in der Navigationsleiste führt zurück, die Uhr läuft unverändert weiter.
2. **Given** ein laufendes Spiel auf dem Lead-Handy von E1 und ein laufendes Spiel von E2, **Then** zeigt der Spielbildschirm unter der Kopfzeile eine kleine Zeile "E2 2:1 · 31'" mit laufender Minute; ein Tipp darauf öffnet das Dashboard.
3. **Given** ein neues Tor bei E2, **Then** hebt sich die Zeile auf dem Lead-Handy von E1 kurz hervor, ohne Ton und ohne Pfiff (das Signal bleibt dem eigenen Spiel vorbehalten).

---

### User Story 5 - Live-Spieltag verwalten (Priority: P3)

Atti ergänzt im Laufe der Saison E3, gibt ein Ersatzhandy frei oder stellt alle Links neu aus, falls ein Lead-Link in falsche Hände geraten ist.

**Why this priority**: Wird selten gebraucht, ist aber nötig, damit der Live-Spieltag über längere Zeit benutzbar bleibt.

**Independent Test**: E3 hinzufügen, Lead-Link E3 auf Gerät D öffnen; der bestehende Zuschauer-Link zeigt E3-Spiele ohne neuen Link.

**Acceptance Scenarios**:

1. **Given** ein Live-Spieltag mit E1 und E2, **When** der Organisator E3 hinzufügt, **Then** gibt es einen neuen Lead-Link für E3 und der bisherige Zuschauer-Link zeigt künftig auch E3.
2. **Given** ein Lead-Handy, **When** dort "Kopplung beenden" bestätigt wird, **Then** sendet es nichts mehr; seine Spiele bleiben lokal erhalten.
3. **Given** der Organisator wählt "Alle Links neu ausstellen" und bestätigt, **Then** erzeugt die App einen neuen Zuschauer-Link und neue Lead-Links; Meldungen über die alten Links erscheinen nicht mehr auf dem neuen Dashboard.
4. **Given** der Organisator ändert den Titel in "Unser Spieltag E1 & E2", **Then** zeigt das Dashboard den neuen Titel.
5. **Given** ein zweites Handy öffnet den Lead-Link für E2 (z. B. Ersatzhandy, weil der Akku leer ist), **Then** sind beide Lead für E2; erfassen beide ein Spiel, zeigt das Dashboard beide Spiele als eigene Karten.

### Edge Cases

- **Uhr falsch gestellt**: Weicht die Uhrzeit des Lead-Handys oder des Zuschauers ab, muss die Minute auf dem Dashboard trotzdem stimmen (berechnet aus dem Spielverlauf, nicht aus der Uhrzeit des Geräts).
- **Lead-Handy im Hintergrund oder gesperrt**: iOS sendet aus Web-Apps im Hintergrund nichts. Im Spiel bleibt der Bildschirm ohnehin an (FR-013). Kehrt die App zurück, sendet sie sofort den aktuellen Stand. Das Dashboard zeigt bis dahin die weiterlaufende Minute und "Letzte Meldung vor X Min".
- **Mehrere Spiele einer Mannschaft am Tag** (Turnier, Spieltage im Kinderfußball, Spec 002 FR-T05): Die Karte zeigt das neueste Spiel, frühere Spiele desselben Tages stehen als kurze Zeilen darunter (US3 Szenario 9).
- **Angepfiffenes Spiel vom Vortag** ohne Schlusspfiff: erscheint am neuen Tag wie ein beendetes Spiel mit dem letzten gemeldeten Stand und Datum, ohne laufende Minute (FR-L16).
- **Vermittlungsdienst nicht erreichbar**: Verhalten wie ohne Netz; die Erfassung ist nie betroffen.
- **Lead-Link weitergeleitet**: Nur wer den Lead-Link hat, kann für diese Mannschaft senden. Gerät er in falsche Hände, hilft "Alle Links neu ausstellen" (US5).
- **Organisator-Handy verloren**: Die Sicherung (FR-024) enthält den Live-Spieltag; ohne Sicherung legt man einen neuen Live-Spieltag an und verschickt neue Links.
- **Viele Zuschauer am selben Internetanschluss** (z. B. mehr als 30 im Vereins-WLAN): Der Kandidat ntfy.sh erlaubt 30 offene Verbindungen je Anschluss. Weitere Zuschauer MÜSSEN trotzdem Stände sehen, notfalls mit längerer Verzögerung (Lösung in research.md).
- **Pokalspiel**: Verlängerung und Elfmeterschießen erscheinen als eigene Phase; der Endstand zeigt "n. V." bzw. "i. E." wie im Teilen-Text (Spec 005).
- **Heim/Gast getauscht oder Gegner umbenannt**: Das Dashboard übernimmt die Änderung mit der nächsten Meldung.
- **Turnierspiele ohne Feuerbach** (Spec 002): nicht Teil dieser Spec.

## Requirements *(mandatory)*

### Functional Requirements

**Live-Spieltag und Kopplung**

- **FR-L01**: Unter "Mehr" MUSS es den Eintrag "Live-Spieltag" geben. Dort kann ein Live-Spieltag angelegt werden: Titel (1 bis 40 Zeichen, Vorgabe "Unser Spieltag") und 1 bis 6 Mannschaften aus "Meine Mannschaften" (Spec 004). Das anlegende Handy ist der Organisator.
- **FR-L02**: Zu jedem Live-Spieltag MUSS es genau einen Zuschauer-Link und je Mannschaft einen Lead-Link geben, beide über das System-Teilen-Menü versendbar (Fallback: Zwischenablage). Der Organisator kann sein eigenes Handy direkt als Lead für eine Mannschaft festlegen.
- **FR-L03**: Ein Lead-Link MUSS sich im Torticker unter "Mehr" → "Live-Spieltag" einfügen lassen; im Browser angetippt, erklärt er das Einfügen und bietet "Link kopieren" sowie "Hier im Browser koppeln" (US1 Szenario 6). Vor der Kopplung fragt die App nach (Mannschaft und Titel nennen). Nach Bestätigung ist das Handy Lead für diese Mannschaft; fehlt die Mannschaft in "Meine Mannschaften", wird sie mit Name und Trikots übernommen.
- **FR-L04**: Ein Handy KANN für mehrere Mannschaften Lead sein (z. B. wenn E1 und E2 nacheinander spielen). Ein Handy ist höchstens mit einem Live-Spieltag gekoppelt; ein neuer Lead-Link eines anderen Live-Spieltags ersetzt die alte Kopplung nach Rückfrage.
- **FR-L05**: Ohne Kopplung DARF die App keine Verbindung zu einem Vermittlungsdienst aufbauen. Mit Kopplung DARF sie ausschließlich mit dem einen Vermittlungsdienst kommunizieren (Netzwerk-Wächter, Constitution II und III).

**Senden (Lead-Handy)**

- **FR-L06**: Ein Lead-Handy MUSS jedes Spiel seiner Mannschaft(en) ab dem Anlegen automatisch senden, bei jeder Änderung: Anpfiff, Tor (auch Rückgängig, Entfernen, Wiederherstellen, Bearbeiten), Uhr angehalten/fortgesetzt, Pausenpfiff, Schlusspfiff, Verlängerung, Elfmeterschießen (jeder Schuss), Gegnername, Trikotfarben, Heim/Gast, Löschen des Spiels.
- **FR-L07**: Senden DARF die Erfassung nie verzögern oder blockieren (SC-001 aus Spec 001 gilt unverändert, auch ohne Netz). Ohne Netz wird nur der jeweils aktuelle Stand nachgereicht, sobald wieder Netz da ist; es entsteht kein Rückstau einzelner Meldungen.
- **FR-L08**: Der Spielbildschirm eines Lead-Handys MUSS in der Kopfzeile ein Kennzeichen zeigen: "Live" (Stand übertragen), "Live: wartet auf Netz" (letzte Änderung noch nicht übertragen, länger als 30 Sekunden) oder "Nicht live" (Spiel per FR-L09 ausgenommen). Ein Tipp öffnet das Dashboard (US4); bis das Dashboard da ist (US3), öffnet er "Mehr" → "Live-Spieltag". FR-033 (iPhone SE ohne Scrollen) gilt weiter.
- **FR-L09**: Das "…"-Menü im Spiel MUSS auf einem Lead-Handy "Nicht live senden" bzw. "Live senden" anbieten (nur für dieses Spiel). "Nicht live senden" entfernt das Spiel vom Dashboard.
- **FR-L10**: Übertragen werden ausschließlich: Kurzform der eigenen Mannschaft, Gegnername, Trikotfarben, Heim/Gast, Spielzeit-Schema, Spielverlauf (Anpfiff, Pausen, Abschnitte, Schlusspfiff, Verlängerung, Elfmeterschießen), Tore mit Minute und Mannschaft sowie Elfmeter- und Eigentor-Kennzeichen, Torschützen (eigene: Anzeigename aus dem Kader, also Vorname oder Kürzel, FR-020; Gegner: Freitext). Nicht übertragen werden Kader, Aufgebot, Karten, Wechsel und Lesezeichen.

**Sicherheit und Datenschutz**

- **FR-L11**: Alle Meldungen MÜSSEN Ende-zu-Ende verschlüsselt sein: Der Vermittlungsdienst und jeder ohne Zuschauer-Link sehen weder Namen noch Spielstände. Nur Inhaber eines Lead-Links können Meldungen erzeugen, die das Dashboard anzeigt; der Zuschauer-Link erlaubt nur Lesen. Gefälschte oder veränderte Meldungen werden verworfen.

**Dashboard (Zuschauer)**

- **FR-L12**: Das Dashboard MUSS im Browser ohne Installation und ohne Konto funktionieren und zeigt den Titel sowie je Spiel eine aufklappbare Karte. Zugeklappt (Standard): Kurzform der eigenen Mannschaft, Gegner, Trikotfarben, Stand Heim:Gast (Heim zuerst wie im Spielbildschirm) und Phase ("noch nicht angepfiffen", Minute wie "37'" bzw. "25+2'", "Uhr angehalten", "Halbzeit" bzw. "Pause", "Verlängerung", "Elfmeterschießen", "Ende" mit "n. V."/"i. E."). Aufgeklappt zusätzlich: Mannschaftskürzel, Anpfiff- und Schlusspfiff-Uhrzeit, Halbzeitstand (bei mehr als einem Abschnitt), Torverlauf neuestes zuerst (Minute, Stand, Torschütze, ggf. "Elfmeter"/"Eigentor"), "Heute außerdem" (FR-L14) und der Hinweis auf eine alte Meldung (FR-L15). Die ganze Karte ist die Tippfläche (mindestens 64 pt hoch).
- **FR-L13**: Die Minute auf dem Dashboard MUSS aus dem übertragenen Spielverlauf berechnet werden und ohne neue Meldung weiterlaufen (Constitution V); die Abweichung zur Anzeige auf dem Lead-Handy beträgt höchstens 1 Minute.
- **FR-L14**: Das Dashboard MUSS je Mannschaft höchstens eine Karte zeigen, mit deren neuestem Spiel; frühere Spiele desselben Tages stehen als kurze Zeilen darunter ("Heute außerdem: 2:1 gegen TSV Musterstadt"). Reihenfolge: Karten mit laufendem Spiel in der Reihenfolge der Mannschaften des Live-Spieltags, darunter angelegte, darunter beendete. Ohne Spiele: "Heute noch kein Spiel live" mit den Mannschaften. Spielen zwei Lead-Handys derselben Mannschaft gleichzeitig (US5 Szenario 5), zeigt die Karte beide Spiele.
- **FR-L15**: Das Dashboard MUSS sich ohne Neuladen aktualisieren, neue Tore für einige Sekunden hervorheben (ohne Ton) und den Verbindungsstatus zeigen: bei eigener fehlender Verbindung "Keine Verbindung · Stand von <Uhrzeit>", bei laufendem Spiel ohne Meldung seit mehr als 5 Minuten "Letzte Meldung vor <n> Min" auf der Karte.
- **FR-L16**: Der Zuschauer-Link MUSS die ganze Saison gelten (bis "Alle Links neu ausstellen"). Ein Spiel bleibt sichtbar, bis seine Mannschaft ein neues Spiel an einem anderen Tag anlegt: für Zuschauer, die das Dashboard bereits geöffnet hatten, ohne Zeitgrenze (das Gerät merkt sich den letzten Stand); für Zuschauer, die es erst später öffnen, so lange der Vermittlungsdienst die letzte Meldung vorhält (rund 12 Stunden). Das Dashboard kann als Lesezeichen bzw. auf dem Home-Bildschirm gespeichert werden.
- **FR-L17**: Im Torticker MUSS das Dashboard eines gekoppelten Live-Spieltags unter "Mehr" → "Live-Spieltag" erreichbar sein, auf Lead-Handys zusätzlich per Tipp auf das Kennzeichen "Live" (FR-L08).
- **FR-L18**: Das Dashboard MUSS dem Vereinsdesign folgen (Constitution VII, `design/`), hell und dunkel nach Systemeinstellung, im Hochformat ab 375 pt Breite ohne waagrechtes Scrollen, Kontrast wie SC-006 aus Spec 001; Trikotfarben als kleine Farbmarken wie im Spielbildschirm (keine Emojis in der Oberfläche, `design/README.md`).

**Verwalten (Organisator)**

- **FR-L19**: Der Organisator MUSS den Titel ändern, Mannschaften hinzufügen und entfernen sowie alle Links neu ausstellen können (mit Bestätigung). Hinzufügen und Entfernen ändern den Zuschauer-Link nicht; Neuausstellen macht alle bisherigen Links wirkungslos.
- **FR-L20**: Ein Lead-Handy MUSS die Kopplung beenden können (mit Bestätigung); lokal gespeicherte Spiele bleiben unverändert.
- **FR-L21**: Die Sicherung (FR-024) MUSS Live-Spieltag und Kopplungen enthalten, damit ein Handywechsel ohne neue Links möglich ist.

### Key Entities

- **Live-Spieltag**: Titel, Liste der Mannschaften (Kurzform, Trikots), Zuschauer-Berechtigung (nur lesen), Organisator-Berechtigung (verwalten), je Mannschaft eine Sende-Berechtigung.
- **Kopplung**: auf einem Lead-Handy; Live-Spieltag, Mannschaft(en), Sende-Berechtigung, aktiv/beendet.
- **Live-Stand**: die jeweils letzte Meldung je Spiel; Spiel-Kennung, Mannschaft, Gegner, Trikotfarben, Heim/Gast, Spielzeit-Schema, Spielverlauf, Tore, Zeitpunkt der Meldung, Kennzeichen "gelöscht" bzw. "nicht live".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-L01**: Bei Netz auf beiden Seiten erscheint ein erfasstes Tor in 95 % der Fälle innerhalb von 10 Sekunden auf dem Dashboard.
- **SC-L02**: Ein Elternteil sieht nach dem Öffnen des Zuschauer-Links innerhalb von 5 Sekunden (Mobilfunk) die aktuellen Stände.
- **SC-L03**: Die Erfassung auf dem Lead-Handy bleibt mit und ohne Netz so schnell wie ohne Kopplung (Tor bis Anzeige unter 100 ms, SC-001).
- **SC-L04**: Die Minute auf dem Dashboard weicht höchstens 1 Minute von der Anzeige auf dem Lead-Handy ab, auch bei falsch gestellter Geräteuhr.
- **SC-L05**: Der Organisator legt einen Live-Spieltag mit zwei Mannschaften an und verschickt alle Links in unter 2 Minuten; ein Lead-Handy ist in unter 30 Sekunden gekoppelt.
- **SC-L06**: Keine Meldung enthält Namen oder Spielstände im Klartext (automatisch geprüft); ohne Kopplung verlässt keine Anfrage das Gerät außer der Update-Prüfung.
- **SC-L07**: Betrieb und Nutzung kosten nichts und brauchen kein Konto (Constitution VIII).
- **SC-L08**: Bis zu 40 Zuschauer je Mannschaft, bei drei Mannschaften also 120, verfolgen den Spieltag gleichzeitig, ohne dass SC-L01 und SC-L02 schlechter werden.

## Assumptions

- Am Platz gibt es meistens mobiles Netz; Funklöcher verzögern die Anzeige, verhindern aber nie die Erfassung.
- Vermittlungsdienst: kostenlos, ohne Konto, aus dem Browser nutzbar; Kandidat ntfy.sh (erreichbar, Browser-Zugriff erlaubt; laut Dokumentation Meldungen bis 4 KB, rund 12 Stunden vorgehalten, je Anschluss 250 gesendete Meldungen am Tag und 30 offene Verbindungen). Auswahl, Grenzen und Ausfallverhalten klärt `research.md`. Fällt der Dienst aus, fehlt nur die Live-Anzeige.
- Zuschauer sehen Stände im Dashboard nur bei geöffneter Seite. Benachrichtigungen auf dem Sperrbildschirm sind nicht Teil dieser Spec (Review B: Variante C); sie folgen mit Spec 007.
- Lead-Handys sind während des Spiels im Vordergrund (Bildschirm bleibt an, FR-013).
- Die Constitution wird auf Version 2.0.0 angehoben (Prinzip II erlaubt die Live-Kopplung); das Qualitätstor "Netzwerk-Wächter" lässt genau den Vermittlungsdienst und nur bei aktiver Kopplung zu.
- Spiele werden nicht zwischen Geräten übernommen: Das Dashboard ist eine Anzeige, die Historie bleibt auf dem Lead-Handy.

## Offene Fragen

Keine. Benachrichtigungen bei Toren und ein Endstand, der für alle bis zum nächsten Spiel sichtbar bleibt, folgen als Spec 007 (`specs/007-push-benachrichtigung`, Backlog).
