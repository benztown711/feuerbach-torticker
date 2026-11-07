# Feature Specification: Live-Spieltag (Dashboard für Eltern, Lead-Handys senden automatisch)

**Feature Branch**: `006-live-spieltag`

**Created**: 2026-11-04

**Status**: Review A und Review B erledigt (04.11.2026, US5 am 05.11.2026), Plan erstellt. US1 bis US6, die Änderung "Trainergruppe" (04.11.2026) und der kurze Trainer-Link (06.11.2026, siehe Clarifications) umgesetzt; Gerätetest am 06.11.2026 auf dem iPhone bestanden (quickstart.md, research.md R-L19); offen sind nur G-6 und G-10 (tasks.md L063). Mockup: https://claude.ai/artifact/FFj3NdrNzW4UqR9munviqo Voraussetzung: Constitution 2.0.0 (Prinzip II, Live-Kopplung).

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

### Session 2026-11-04 (Umsetzung US3)

Präzisierungen beim Bau des Dashboards, ohne Änderung des Verhaltens aus Review A/B:

- Spieltag eines Spiels ist der Tag des ersten Anpfiffs, vor dem Anpfiff der Tag des Anlegens, jeweils in Serverzeit umgerechnet (R-L4). Ein am Vorabend angelegtes Spiel zählt so ab dem Anpfiff zum neuen Tag.
- Läuft heute noch kein Spiel, aber das Gerät kennt Spiele früherer Tage (FR-L16), steht "Heute noch kein Spiel live" oben und die alten Karten darunter unter "Zuletzt" (Mockup "Zuletzt auf diesem Handy gesehen"); ihre Phase trägt das Datum ("Ende · 31.10.").
- Gehören frühere Spiele zu einem anderen Tag als heute, heißt die Zeile "Außerdem am 31.10." statt "Heute außerdem".
- Statuszeile: "Live · Stand 10:41 Uhr", bei zu vielen Verbindungen "Live, alle 30 Sekunden · Stand …", beim Verbinden "Verbinde …", ohne Netz "Keine Verbindung · Stand von 10:42 Uhr. Aktualisiert sich von selbst." (FR-L15).
- Ein im Torticker eingefügter Zuschauer-Link öffnet das Dashboard (US1-S5); das Dashboard eines Zuschauers hat unten "Zum Torticker", damit ein Elternteil, das den Torticker später selbst nutzt, nicht festhängt (R-L6).

### Session 2026-11-04 (Änderung: Trainergruppe statt fester Lead-Handys)

Ausgangslage (Atti nach US3): Es gibt keine festen Trainerteams. 4 bis 5 Trainer wechseln sich ab, wer an welchem Wochenende welche Mannschaft betreut. Feste Lead-Links je Mannschaft passen dazu nicht: Wer letzte Woche Lead für E1 war, betreut diese Woche vielleicht E2. Ohne Anmeldedaten und ohne Rollen.

- Q: Wie wird festgelegt, welches Handy für welche Mannschaft sendet? → A: Automatisch je Spiel. Das Handy, das ein Spiel für E2 anlegt, sendet E2. Beim Anlegen steht "Live aufs Dashboard" (Vorgabe an), je Spiel abschaltbar. Nichts muss wöchentlich umgestellt oder zurückgesetzt werden.
- Q: Ein gemeinsamer Trainer-Link statt je Mannschaft ein Lead-Link? → A: Ja, ein Trainer-Link für die Trainergruppe (5 Personen), einmal pro Saison teilen und einfügen. Wer ihn hat, sendet für alle Mannschaften des Live-Spieltags. Keine zusätzlichen Helfer-Links je Mannschaft.
- Q: Wer darf den Live-Spieltag verwalten (Titel, Mannschaften, neu ausstellen)? → A: Alle mit Trainer-Link, gleichberechtigt; bei Änderungen gilt die jüngste.
- Vertrauen: Die Trainergruppe ist klein und steht meist nebeneinander. Erfassen zwei Handys dasselbe Spiel, zeigt die Karte beide (FR-L14); einer schaltet "Live" für sein Spiel ab.
- Q (Atti): Was passiert, wenn zwei Handys dasselbe Spiel übertragen wollen, und wenn der Trainer, der überträgt, früher gehen muss? → A: Das zweite Handy bekommt beim Anlegen die Meldung, dass E2 schon von einem anderen Handy übertragen wird, und kann das Spiel übernehmen: Es holt sich den Stand vom Dashboard (Gegner, Trikots, Spielzeit, Tore mit Torschützen) und überträgt allein weiter; das alte Handy hört auf zu senden. Nicht übernommen werden Karten, Wechsel und Lesezeichen (werden nie übertragen). Neue User Story US6, Review A am 04.11.2026 freigegeben ("Spiel übernehmen passt so"), Mockup übersprungen.

### Session 2026-11-05 (US5 Verwalten, Review B)

Mockup: https://claude.ai/artifact/SDGYEMUyn2u5uarWLYeGFo

- Q: Wo steht "Entfernen" für eine Mannschaft? → A: Direkt in der Mannschaftszeile der Übersicht, mit Rückfrage; die letzte Mannschaft lässt sich nicht entfernen (Atti: "passt so").
- Q: Was erfahren die anderen Handys, wenn ein Trainer alle Links neu ausstellt? → A: Variante C: Auf dem alten Live-Spieltag geht einmal der Hinweis "neu ausgestellt" hinaus, ohne die neuen Links. Trainer-Handys mit dem alten Trainer-Link hören auf zu senden und bitten darum, den neuen Trainer-Link aus der Trainergruppe einzufügen; Eltern mit dem alten Zuschauer-Link sehen, dass sie den neuen Link aus der Elterngruppe öffnen sollen. Verworfen: still weitersenden lassen (sendet unbemerkt ins Leere) und automatisch umziehen (wer den alten Link unrechtmäßig hat, bekäme die neuen).
- Q: Nimmt die Sicherung den Trainer-Schlüssel mit? → A: Ja, immer, mit dem Hinweis "nur für dich aufbewahren" (die Sicherung enthält ohnehin Vornamen der Kinder). Abhilfe, falls die Datei in falsche Hände gerät: "Alle Links neu ausstellen".
- Andere Trainer-Handys übernehmen Titel- und Mannschaftsänderungen beim nächsten Empfang (Neues Spiel, Spielbildschirm, Dashboard in der App, Übersicht "Live-Spieltag"); dafür nennt die Konfiguration die Mannschaften mit Namen und Trikots.

### Session 2026-11-05 (Fehler: Zuschauer-Link auf dem Home-Bildschirm)

- Befund (Atti, Gerätetest G-3 im Alltag): Ein Elternteil öffnet den Zuschauer-Link aus WhatsApp in Safari, das Dashboard erscheint. Nach "Zum Home-Bildschirm" öffnet das Symbol aber den Startbildschirm mit "Neues Spiel" statt des Dashboards. Ursache: iOS übernimmt die Startadresse aus dem Manifest der App (`/feuerbach-torticker/`), nicht die aktuelle Adresse; die Vorkehrung aus R-L6 (gemerkter Zuschauer-Link) greift nicht, weil die Home-Bildschirm-App getrennte Daten hat und den in Safari gemerkten Link nicht kennt.
- Entscheidung (Fehlerbehebung, ohne Mockup): Auf der Seite des Zuschauer-Links nennt das Manifest den Zuschauer-Link als Startadresse (FR-L16, US3-S11). Symbole, die vorher angelegt wurden, behalten die alte Startadresse; sie müssen einmal gelöscht und neu angelegt werden (Hilfe-Eintrag `eltern-home`).
- Nachtest (Atti, Geschäfts-iPhone, 05.11.2026 nach PR #45): weiterhin "Neues Spiel". Gründe: Die Auslieferung war blockiert (CI auf `main` rot wegen doppelter Spec-Nummer 013), und laut WebKit-Quellcode hätte die erste Fassung in Safari ohnehin nicht gewirkt (Manifest wird beim ersten Verweis geladen und behalten; `data:`-Adresse scheitert im CORS-Modus). Zweite Fassung siehe research.md R-L6.

### Session 2026-11-06 (Fehler: Spiel übernehmen bei langsamem Empfang)

- Befund (CI, E2E 006 US6-S1 auf dem iPhone-Profil): Tippt ein Trainer auf "Weiter zum Anpfiff", bevor sein Handy den Live-Spieltag geladen hat (gerade "Neues Spiel" geöffnet, langsamer Empfang am Platz), fragt die App nicht nach und schickt ein zweites E2-Spiel aufs Dashboard. Nachgestellt mit 1,5 s verzögerten Antworten des Vermittlungsdienstes.
- Entscheidung (Atti, Fehlerbehebung ohne Mockup): "Weiter zum Anpfiff" wartet höchstens 3 Sekunden auf den Live-Stand und fragt dann wie in US6 Szenario 1; ohne Verbindung geht es sofort weiter (FR-L22, US6 Szenario 6).

### Session 2026-11-06 (Fehler: Trainer-Link in WhatsApp nicht antippbar)

- Befund (Atti, Trainer mit iPhone und WhatsApp): Vom Trainer-Link ist in WhatsApp nur der Anfang bis `#/trainer/` unterstrichen und antippbar; der Rest steht als lange Zeichenfolge da. Antippen öffnet den Torticker ohne Link-Daten, das Kopieren gelingt nur mit dem ganzen Nachrichtentext. Ursache: Der Trainer-Link ist rund 1.450 Zeichen lang (research.md R-L20).
- Entscheidung (Atti, Fehlerbehebung ohne Mockup, noch vor dem ersten Spieltag): (1) kurzer Trainer-Link (rund 380 Zeichen, FR-L02, contracts/live-link.md), bereits verteilte lange Links bleiben gültig; (2) die Seite des Trainer-Links nennt im Manifest den Trainer-Link als Startadresse, damit "Zum Home-Bildschirm" ein Symbol ablegt, das beim ersten Start koppelt (wie FR-L16 beim Zuschauer-Link); (3) kommt nur der Anfang des Links an, erklärt die Seite das (US1-S8). Kürzerer Teilen-Text ohne Einfüge-Anleitung.

### Session 2026-11-07 (Fehler: Mannschaftsnamen auf dem Dashboard unlesbar)

- Befund (Screenshot eines Elternteils, Samsung mit mittelgroßem Display): Die Namen auf den Karten brechen nach zwei, drei Buchstaben um ("Fe/ue/rb/ac/h"). Ursache: Heim, Stand und Gast stehen nebeneinander, und die Phase darunter ("noch nicht angepfiffen · 06.11.") bricht nicht um; die Mitte nimmt dadurch fast die ganze Breite. Große Schrift oder Bildschirmzoom auf Android ergeben effektiv rund 320 pt; selbst bei 375 pt brach "Beispielhau-sen" schon mitten im Wort.
- Entscheidung (Atti, Fehlerbehebung ohne Mockup, Auswahl aus drei Varianten): Tabellenzeilen. Heim oben, Gast darunter, je Zeile Farbmarke, Name und Tore rechts; Minute bzw. Phase in einer eigenen Zeile darunter (FR-L12, FR-L18).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live-Spieltag anlegen und Trainergruppe koppeln (Priority: P1)

Ein Trainer, z. B. Atti, legt einmal pro Saison den Live-Spieltag "Unser Spieltag" mit E1, E2 und E3 an. Er teilt zwei Links: den Zuschauer-Link in die Elterngruppen und den Trainer-Link in die Trainergruppe. Jeder Trainer fügt den Trainer-Link einmal in seinem Torticker ein. Wer am Wochenende welche Mannschaft betreut, muss danach nichts umstellen: Das Handy, das ein Spiel erfasst, sendet es (US2).

**Why this priority**: Ohne gekoppelte Handys gibt es keine Daten für das Dashboard; die Kopplung ist der bewusste Schritt, mit dem Daten das Gerät verlassen dürfen (Constitution II).

**Independent Test**: Auf Gerät A Live-Spieltag mit E1 und E2 anlegen, Trainer-Link auf Gerät B einfügen und bestätigen; Gerät B zeigt "Trainer-Handy für Unser Spieltag (E1, E2)".

**Acceptance Scenarios**:

1. **Given** "Meine Mannschaften" enthält E1, E2 und E3, **When** der Nutzer unter "Mehr" → "Live-Spieltag" mit Titel "Unser Spieltag" die Mannschaften E1 und E2 wählt und anlegt, **Then** zeigt die App "Zuschauer-Link teilen" (für die Eltern) und "Trainer-Link teilen" (für die Trainergruppe); das anlegende Handy ist Trainer-Handy.
2. **Given** ein Trainer-Link, **When** er auf einem anderen Handy im Torticker unter "Mehr" → "Live-Spieltag" → "Trainer-Link einfügen" eingefügt wird, **Then** fragt die App "Dieses Handy sendet ab jetzt Spiele von E1 und E2 live an 'Unser Spieltag'?"; nach "Ja" zeigt "Mehr" → "Live-Spieltag" "Trainer-Handy" mit Titel und Mannschaften.
3. **Given** das Handy hat E2 noch nicht in "Meine Mannschaften", **When** der Trainer-Link bestätigt wird, **Then** wird E2 mit Name, Heim- und Auswärtstrikot übernommen.
4. **Given** ein Handy ohne Kopplung, **Then** sendet es nichts und verbindet sich mit keinem Vermittlungsdienst.
5. **Given** der Zuschauer-Link wird im Torticker geöffnet oder eingefügt, **Then** wird das Handy nicht zum Trainer-Handy, sondern zeigt nur das Dashboard.
6. **Given** ein Trainer-Link wird im Browser angetippt (z. B. aus WhatsApp), **Then** erklärt die Seite: "Kopiere den Link und füge ihn im Torticker unter Mehr → Live-Spieltag ein", bietet "Link kopieren" und zusätzlich "Hier im Browser koppeln" für alle, die den Torticker nicht installiert haben.
7. **Given** ein Trainer-Handy, **Then** kann es den Zuschauer-Link und den Trainer-Link ebenfalls teilen (z. B. für einen neuen Trainer).
8. **Given** der Trainer-Link wird geteilt, **Then** ist er höchstens rund 400 Zeichen lang, damit WhatsApp ihn ganz antippbar macht; der Teilen-Text lautet "Trainer-Link für "Unser Spieltag", nur für die Trainergruppe. Antippen und loslegen:" mit dem Link in der nächsten Zeile. Kommt nur der Anfang des Links an (`#/trainer/` ohne Daten), zeigt die Seite "Dieser Trainer-Link ist nicht gültig oder kam unvollständig an." statt des Startbildschirms.
9. **Given** die Seite eines Trainer-Links ist im Browser offen (Torticker nicht als App gestartet), **Then** zeigt sie "Für den Spielfeldrand: unten auf „Teilen“ und „Zum Home-Bildschirm“ tippen. Das neue Symbol öffnet diesen Trainer-Link, dort „Koppeln und loslegen“." und das Manifest nennt den Trainer-Link als Startadresse; das so angelegte Symbol öffnet beim ersten Start die Seite mit "Koppeln und loslegen", nach dem Koppeln jedes Mal den Startbildschirm.

---

### User Story 2 - Das erfassende Handy sendet automatisch (Priority: P1)

Am Spielfeldrand wird wie gewohnt erfasst. Das Trainer-Handy, das ein Spiel für eine Mannschaft des Live-Spieltags anlegt, ist für dieses Spiel das Lead-Handy: Anpfiff, Tore, Pausenpfiff, Schlusspfiff. Ohne weiteren Tap erscheint alles auf dem Dashboard. Fehlt das Netz, läuft die Erfassung ungestört weiter und der Stand wird nachgereicht.

**Why this priority**: Kern des Wunsches: Live ohne Zutun der Person am Spielfeldrand.

**Independent Test**: Trainer-Handy B legt ein E2-Spiel an, pfeift an, erfasst ein Tor; Gerät C mit Zuschauer-Link zeigt Anpfiff und Tor ohne Neuladen. Am nächsten Wochenende legt B ein E1-Spiel an; es erscheint ohne jede Umstellung als E1.

**Acceptance Scenarios**:

1. **Given** Trainer-Handy B hat Netz, **When** dort ein Spiel von E2 angelegt und angepfiffen wird, **Then** erscheint es innerhalb von 10 Sekunden auf dem Dashboard mit Gegner, Trikotfarben, 0:0 und laufender Minute.
2. **Given** ein laufendes E2-Spiel, **When** ein Tor erfasst, rückgängig gemacht, entfernt oder wiederhergestellt wird, **Then** zeigt das Dashboard innerhalb von 10 Sekunden den korrigierten Stand.
3. **Given** Pausenpfiff, Uhr angehalten, Fortsetzen, Schlusspfiff, Verlängerung oder Elfmeterschießen (Spec 003), **Then** zeigt das Dashboard die passende Phase (siehe FR-L12).
4. **Given** kein Netz, **When** ein Tor erfasst wird, **Then** wird es so schnell wie ohne Kopplung gezählt; die Kopfzeile zeigt "Live: wartet auf Netz"; sobald wieder Netz da ist, kommt der aktuelle Stand auf dem Dashboard an.
5. **Given** Trainer-Handy B, **When** dort ein Spiel einer Mannschaft erfasst wird, die nicht zum Live-Spieltag gehört (z. B. D1), **Then** wird dieses Spiel nicht gesendet.
6. **Given** ein E2-Spiel, **When** der Nutzer im "…"-Menü "Nicht live senden" wählt (z. B. Testspiel), **Then** verschwindet das Spiel vom Dashboard und wird nicht mehr gesendet, bis "Live senden" wieder gewählt wird.
7. **Given** ein Spiel wird auf dem Lead-Handy gelöscht, **Then** verschwindet es vom Dashboard.
8. **Given** ein Trainer-Handy, **When** "Neues Spiel" für eine Mannschaft des Live-Spieltags geöffnet wird, **Then** zeigt der Bildschirm den Schalter "Live aufs Dashboard" (Vorgabe an); ist er aus, wird das Spiel nicht gesendet (wie "Nicht live senden", im Spiel wieder einschaltbar).
9. **Given** Trainer-Handy A erfasst am Samstag E1 und Trainer-Handy B am Sonntag E1, **Then** sendet jeweils das erfassende Handy, ohne dass jemand etwas zurücksetzt.

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
11. **Given** ein Elternteil hat den Zuschauer-Link in Safari geöffnet, **When** es "Zum Home-Bildschirm" wählt und den Torticker über das neue Symbol startet, **Then** erscheint das Dashboard "Unser Spieltag" und nicht der Startbildschirm mit "Neues Spiel", auch wenn das Symbol aus der Eltern-Hilfe heraus angelegt wurde.

---

### User Story 4 - Blick auf das andere Spiel (Priority: P2)

Wer am Spielfeldrand von E1 steht, will kurz sehen, wie es bei E2 steht, ohne die Erfassung zu verlassen.

**Why this priority**: Ursprünglicher Auslöser des Wunsches; das Dashboard allein deckt es schon mit einem Tap ab, die Anzeige im Spielbildschirm ist Komfort.

**Independent Test**: Gerät A (Lead E1) im laufenden Spiel; Gerät B (Lead E2) erfasst ein Tor; Gerät A zeigt den neuen E2-Stand.

**Acceptance Scenarios**:

1. **Given** ein laufendes Spiel auf einem Lead-Handy, **When** der Nutzer auf das Kennzeichen "Live" in der Kopfzeile tippt, **Then** öffnet sich das Dashboard; "Spiel" in der Navigationsleiste führt zurück, die Uhr läuft unverändert weiter.
2. **Given** ein laufendes Spiel auf dem Lead-Handy von E1 und ein laufendes Spiel von E2, **Then** zeigt der Spielbildschirm unter der Kopfzeile eine kleine Zeile "E2 2:1 · 31'" mit laufender Minute; ein Tipp darauf öffnet das Dashboard. Die Zeile nennt die heutigen Spiele der anderen Mannschaften des Live-Spieltags (laufende zuerst, Reihenfolge wie auf dem Dashboard), auf jedem gekoppelten Trainer-Handy bis zum Schlusspfiff des eigenen Spiels, auch wenn das eigene Spiel nicht live gesendet wird; ohne andere Spiele fehlt sie (FR-033).
3. **Given** ein neues Tor bei E2, **Then** hebt sich die Zeile auf dem Lead-Handy von E1 kurz hervor, ohne Ton und ohne Pfiff (das Signal bleibt dem eigenen Spiel vorbehalten).

---

### User Story 5 - Live-Spieltag verwalten (Priority: P3)

Ein Trainer ergänzt im Laufe der Saison E3, ändert den Titel oder stellt alle Links neu aus, falls der Trainer-Link in falsche Hände geraten ist oder ein Trainer die Gruppe verlässt. Alle Trainer-Handys sind dabei gleichberechtigt.

**Why this priority**: Wird selten gebraucht, ist aber nötig, damit der Live-Spieltag über längere Zeit benutzbar bleibt.

**Independent Test**: Auf Trainer-Handy B E3 hinzufügen, auf Trainer-Handy A ein E3-Spiel erfassen; der bestehende Zuschauer-Link zeigt das E3-Spiel ohne neuen Link.

**Acceptance Scenarios**:

1. **Given** ein Live-Spieltag mit E1 und E2, **When** ein Trainer E3 hinzufügt, **Then** zeigt der bisherige Zuschauer-Link künftig auch E3, und die anderen Trainer-Handys senden E3-Spiele, sobald sie die neue Mannschaftsliste kennen (automatisch beim nächsten Empfang, sonst durch erneutes Einfügen des Trainer-Links).
2. **Given** ein Trainer-Handy, **When** dort "Kopplung beenden" bestätigt wird, **Then** sendet es nichts mehr; seine Spiele bleiben lokal erhalten.
3. **Given** ein Trainer wählt "Alle Links neu ausstellen" und bestätigt, **Then** erzeugt die App einen neuen Zuschauer-Link und einen neuen Trainer-Link; Meldungen über die alten Links erscheinen nicht mehr auf dem neuen Dashboard. Trainer-Handys mit dem alten Trainer-Link senden nichts mehr und zeigen "Neu ausgestellt: neuen Trainer-Link einfügen"; das Dashboard über den alten Zuschauer-Link zeigt "Bitte den neuen Link aus der Elterngruppe öffnen".
4. **Given** ein Trainer ändert den Titel in "Unser Spieltag E1 & E2", **Then** zeigt das Dashboard den neuen Titel.
5. **Given** zwei Trainer-Handys erfassen versehentlich dasselbe E2-Spiel, **Then** zeigt die E2-Karte beide Spiele (das laufende oben, das andere als Zeile darunter, FR-L14); schaltet einer "Live" für sein Spiel ab, verschwindet es.

### User Story 6 - Spiel übernehmen (Priority: P2)

Zwei Trainer stehen beim E2-Spiel, einer überträgt schon. Legt der zweite ebenfalls ein E2-Spiel an, weist die App darauf hin, statt ein doppeltes Spiel aufs Dashboard zu schicken. Muss der erste Trainer früher gehen, übernimmt der zweite das laufende Spiel mit Stand, Spielzeit und Toren.

**Why this priority**: Verhindert zwei verschiedene Stände für dieselbe Mannschaft und macht die Übergabe am Spielfeldrand möglich; ohne sie bleibt nur, dass einer "Nicht live senden" wählt.

**Independent Test**: Trainer-Handy A erfasst E2 gegen TSV Musterstadt (1:0, 12'). Trainer-Handy B legt ein E2-Spiel an, wählt "Spiel übernehmen" und erfasst ein Tor; das Dashboard zeigt eine Karte mit 2:0, A zeigt "E2 überträgt jetzt ein anderes Handy".

**Acceptance Scenarios**:

1. **Given** Trainer-Handy A überträgt ein laufendes E2-Spiel, **When** auf Trainer-Handy B "Neues Spiel" für E2 mit "Live aufs Dashboard" bestätigt wird, **Then** fragt B: "Das Spiel der E2 überträgt bereits ein anderes Handy: TSV Musterstadt 1:0, 12'." mit "Spiel übernehmen", "Nur hier erfassen (nicht live)" und "Abbrechen".
2. **Given** die Frage aus Szenario 1, **When** "Spiel übernehmen" gewählt wird, **Then** öffnet B das Spiel mit Gegner, Heim/Gast, Trikots, Spielzeit-Schema, laufender Uhr (gleiche Minute wie auf dem Dashboard, höchstens 1 Minute Abweichung), allen Toren mit Minute und Torschützen (eigene dem Kader zugeordnet, wenn der Name passt) und Elfmeterschießen; ab dann sendet nur noch B, das Dashboard zeigt weiter eine Karte ohne Sprung.
3. **Given** B hat übernommen, **When** A wieder Netz hat und das Spiel offen ist, **Then** zeigt A "E2 überträgt jetzt ein anderes Handy. Hier wird nur noch lokal erfasst." und sendet nichts mehr; Meldungen von A, die später noch ankommen, ändern das Dashboard nicht.
4. **Given** die Frage aus Szenario 1, **When** "Nur hier erfassen (nicht live)" gewählt wird, **Then** wird das Spiel wie mit ausgeschaltetem "Live aufs Dashboard" angelegt (FR-L09).
5. **Given** B hat kein Netz oder empfängt nichts, **Then** legt B das Spiel ohne Frage an (die App kann die Übertragung von A nicht sehen); ein späteres doppeltes Spiel zeigt die Karte wie bisher als Zeile (FR-L14).
6. **Given** A überträgt ein laufendes E2-Spiel und B hat den Live-Spieltag beim Öffnen von "Neues Spiel" noch nicht geladen (langsamer Empfang), **When** B sofort "Weiter zum Anpfiff" tippt, **Then** wartet B höchstens 3 Sekunden auf den Live-Stand und fragt dann wie in Szenario 1.

### Edge Cases

- **Uhr falsch gestellt**: Weicht die Uhrzeit des Lead-Handys oder des Zuschauers ab, muss die Minute auf dem Dashboard trotzdem stimmen (berechnet aus dem Spielverlauf, nicht aus der Uhrzeit des Geräts).
- **Lead-Handy im Hintergrund oder gesperrt**: iOS sendet aus Web-Apps im Hintergrund nichts. Im Spiel bleibt der Bildschirm ohnehin an (FR-013). Kehrt die App zurück, sendet sie sofort den aktuellen Stand. Das Dashboard zeigt bis dahin die weiterlaufende Minute und "Letzte Meldung vor X Min".
- **Mehrere Spiele einer Mannschaft am Tag** (Turnier, Spieltage im Kinderfußball, Spec 002 FR-T05): Die Karte zeigt das neueste Spiel, frühere Spiele desselben Tages stehen als kurze Zeilen darunter (US3 Szenario 9).
- **Angepfiffenes Spiel vom Vortag** ohne Schlusspfiff: erscheint am neuen Tag wie ein beendetes Spiel mit dem letzten gemeldeten Stand und Datum, ohne laufende Minute (FR-L16).
- **Vermittlungsdienst nicht erreichbar**: Verhalten wie ohne Netz; die Erfassung ist nie betroffen.
- **Trainer-Link weitergeleitet**: Wer den Trainer-Link hat, kann für alle Mannschaften senden und den Live-Spieltag verwalten. Gerät er in falsche Hände oder verlässt ein Trainer die Gruppe, hilft "Alle Links neu ausstellen" (US5).
- **Bestehende Lead-Links** (aus der ersten Version): Bereits gekoppelte Lead-Handys senden weiter für ihre Mannschaft, bis sie den Trainer-Link einfügen oder neu ausgestellt wird; neue Lead-Links je Mannschaft gibt es nicht mehr.
- **Trainer-Handy verloren**: Die anderen Trainer-Handys können alles weiter; zum Aussperren des verlorenen Handys "Alle Links neu ausstellen".
- **Viele Zuschauer am selben Internetanschluss** (z. B. mehr als 30 im Vereins-WLAN): Der Kandidat ntfy.sh erlaubt 30 offene Verbindungen je Anschluss. Weitere Zuschauer MÜSSEN trotzdem Stände sehen, notfalls mit längerer Verzögerung (Lösung in research.md).
- **Pokalspiel**: Verlängerung und Elfmeterschießen erscheinen als eigene Phase; der Endstand zeigt "n. V." bzw. "i. E." wie im Teilen-Text (Spec 005).
- **Heim/Gast getauscht oder Gegner umbenannt**: Das Dashboard übernimmt die Änderung mit der nächsten Meldung.
- **Turnierspiele ohne Feuerbach** (Spec 002): nicht Teil dieser Spec.

## Requirements *(mandatory)*

### Functional Requirements

**Live-Spieltag und Kopplung**

- **FR-L01**: Unter "Mehr" MUSS es den Eintrag "Live-Spieltag" geben. Dort kann ein Live-Spieltag angelegt werden: Titel (1 bis 40 Zeichen, Vorgabe "Unser Spieltag") und 1 bis 6 Mannschaften aus "Meine Mannschaften" (Spec 004). Das anlegende Handy ist Trainer-Handy.
- **FR-L02**: Zu jedem Live-Spieltag MUSS es genau einen Zuschauer-Link (nur lesen) und genau einen Trainer-Link (senden und verwalten) geben. Jedes Trainer-Handy kann beide über das System-Teilen-Menü versenden (Fallback: Zwischenablage). Der Trainer-Link MUSS so kurz sein, dass WhatsApp ihn ganz antippbar macht (kurzes Format, contracts/live-link.md, US1-S8); lange Trainer-Links früherer Versionen bleiben gültig. Auf seiner Seite im Browser MUSS das Manifest den Trainer-Link als Startadresse nennen (US1-S9).
- **FR-L03**: Ein Trainer-Link MUSS sich im Torticker unter "Mehr" → "Live-Spieltag" einfügen lassen; im Browser angetippt, erklärt er das Einfügen und bietet "Link kopieren" sowie "Hier im Browser koppeln" (US1 Szenario 6). Vor der Kopplung fragt die App nach (Titel und Mannschaften nennen). Nach Bestätigung ist das Handy Trainer-Handy; fehlen Mannschaften in "Meine Mannschaften", werden sie mit Name und Trikots übernommen. Bereits eingefügte Lead-Links aus der ersten Version bleiben gültig.
- **FR-L04**: Für welche Mannschaft ein Trainer-Handy sendet, MUSS sich je Spiel aus der eigenen Mannschaft des Spiels ergeben; es gibt keine feste Zuordnung von Handy zu Mannschaft und nichts zurückzusetzen. Ein Handy ist höchstens mit einem Live-Spieltag gekoppelt; ein Trainer-Link eines anderen Live-Spieltags ersetzt die alte Kopplung nach Rückfrage.
- **FR-L05**: Ohne Kopplung DARF die App keine Verbindung zu einem Vermittlungsdienst aufbauen. Mit Kopplung DARF sie ausschließlich mit dem einen Vermittlungsdienst kommunizieren (Netzwerk-Wächter, Constitution II und III).

**Senden (Lead-Handy = das Trainer-Handy, das ein Spiel erfasst)**

- **FR-L06**: Ein Trainer-Handy MUSS jedes Spiel einer Mannschaft des Live-Spieltags ab dem Anlegen automatisch senden, sofern es nicht ausgenommen ist (FR-L09), bei jeder Änderung: Anpfiff, Tor (auch Rückgängig, Entfernen, Wiederherstellen, Bearbeiten), Uhr angehalten/fortgesetzt, Pausenpfiff, Schlusspfiff, Verlängerung, Elfmeterschießen (jeder Schuss), Gegnername, Trikotfarben, Heim/Gast, Löschen des Spiels.
- **FR-L07**: Senden DARF die Erfassung nie verzögern oder blockieren (SC-001 aus Spec 001 gilt unverändert, auch ohne Netz). Ohne Netz wird nur der jeweils aktuelle Stand nachgereicht, sobald wieder Netz da ist; es entsteht kein Rückstau einzelner Meldungen.
- **FR-L08**: Der Spielbildschirm eines Lead-Handys MUSS in der Kopfzeile ein Kennzeichen zeigen: "Live" (Stand übertragen), "Live: wartet auf Netz" (letzte Änderung noch nicht übertragen, länger als 30 Sekunden) oder "Nicht live" (Spiel per FR-L09 ausgenommen). Ein Tipp öffnet das Dashboard (FR-L17). FR-033 (iPhone SE ohne Scrollen) gilt weiter.
- **FR-L09**: "Neues Spiel" MUSS auf einem Trainer-Handy für Mannschaften des Live-Spieltags den Schalter "Live aufs Dashboard" zeigen (Vorgabe an). Das "…"-Menü im Spiel MUSS "Nicht live senden" bzw. "Live senden" anbieten (nur für dieses Spiel). "Nicht live senden" entfernt das Spiel vom Dashboard.
- **FR-L10**: Übertragen werden ausschließlich: Kurzform der eigenen Mannschaft, Gegnername, Trikotfarben, Heim/Gast, Spielzeit-Schema, Spielverlauf (Anpfiff, Pausen, Abschnitte, Schlusspfiff, Verlängerung, Elfmeterschießen), Tore mit Minute und Mannschaft sowie Elfmeter- und Eigentor-Kennzeichen, Torschützen (eigene: Anzeigename aus dem Kader, also Vorname oder Kürzel, FR-020; Gegner: Freitext), seit Spec 009 auch der Vorlagengeber (Anzeigename, FR-V08). Nicht übertragen werden Kader, Aufgebot, Karten, Wechsel und Lesezeichen.

**Sicherheit und Datenschutz**

- **FR-L11**: Alle Meldungen MÜSSEN Ende-zu-Ende verschlüsselt sein: Der Vermittlungsdienst und jeder ohne Zuschauer-Link sehen weder Namen noch Spielstände. Nur Inhaber des Trainer-Links (und bereits gekoppelte Lead-Handys der ersten Version) können Meldungen erzeugen, die das Dashboard anzeigt; der Zuschauer-Link erlaubt nur Lesen. Gefälschte oder veränderte Meldungen werden verworfen.

**Dashboard (Zuschauer)**

- **FR-L12**: Das Dashboard MUSS im Browser ohne Installation und ohne Konto funktionieren und zeigt den Titel sowie je Spiel eine aufklappbare Karte. Zugeklappt (Standard) als Tabellenzeilen (Nachtrag 07.11.2026): oben Heim, darunter Gast, je Zeile Trikotfarbe, Name (Kurzform der eigenen Mannschaft bzw. Gegner) und Tore rechts; darunter die Phase ("noch nicht angepfiffen", Minute wie "37'" bzw. "25+2'", "Uhr angehalten", "Halbzeit" bzw. "Pause", "Verlängerung", "Elfmeterschießen", "Ende" mit "n. V."/"i. E."). Aufgeklappt zusätzlich: Mannschaftskürzel, Anpfiff- und Schlusspfiff-Uhrzeit, Halbzeitstand (bei mehr als einem Abschnitt), Torverlauf neuestes zuerst (Minute, Stand, Torschütze, ggf. "Elfmeter"/"Eigentor", seit Spec 009 "(Vorlage: …)"), "Heute außerdem" (FR-L14) und der Hinweis auf eine alte Meldung (FR-L15). Die ganze Karte ist die Tippfläche (mindestens 64 pt hoch).
- **FR-L13**: Die Minute auf dem Dashboard MUSS aus dem übertragenen Spielverlauf berechnet werden und ohne neue Meldung weiterlaufen (Constitution V); die Abweichung zur Anzeige auf dem Lead-Handy beträgt höchstens 1 Minute.
- **FR-L14**: Das Dashboard MUSS je Mannschaft höchstens eine Karte zeigen, mit deren neuestem Spiel; frühere Spiele desselben Tages stehen als kurze Zeilen darunter ("Heute außerdem: 2:1 gegen TSV Musterstadt"). Reihenfolge: Karten mit laufendem Spiel in der Reihenfolge der Mannschaften des Live-Spieltags, darunter angelegte, darunter beendete. Ohne Spiele: "Heute noch kein Spiel live" mit den Mannschaften. Spielen zwei Lead-Handys derselben Mannschaft gleichzeitig (US5 Szenario 5), zeigt die Karte beide Spiele.
- **FR-L15**: Das Dashboard MUSS sich ohne Neuladen aktualisieren, neue Tore für einige Sekunden hervorheben (ohne Ton) und den Verbindungsstatus zeigen: bei eigener fehlender Verbindung "Keine Verbindung · Stand von <Uhrzeit>", bei laufendem Spiel ohne Meldung seit mehr als 5 Minuten "Letzte Meldung vor <n> Min" auf der Karte.
- **FR-L16**: Der Zuschauer-Link MUSS die ganze Saison gelten (bis "Alle Links neu ausstellen"). Ein Spiel bleibt sichtbar, bis seine Mannschaft ein neues Spiel an einem anderen Tag anlegt: für Zuschauer, die das Dashboard bereits geöffnet hatten, ohne Zeitgrenze (das Gerät merkt sich den letzten Stand); für Zuschauer, die es erst später öffnen, so lange der Vermittlungsdienst die letzte Meldung vorhält (rund 12 Stunden). Das Dashboard kann als Lesezeichen bzw. auf dem Home-Bildschirm gespeichert werden. Auf der Seite des Zuschauer-Links MUSS das Web-App-Manifest den Zuschauer-Link als Startadresse nennen (bei unveränderter App-Kennung), damit ein so angelegtes Symbol das Dashboard öffnet; auf allen anderen Seiten gilt die Startadresse der App.
- **FR-L17**: Im Torticker MUSS das Dashboard eines gekoppelten Live-Spieltags unter "Mehr" → "Live-Spieltag" erreichbar sein, auf Lead-Handys zusätzlich per Tipp auf das Kennzeichen "Live" (FR-L08).
- **FR-L18**: Das Dashboard MUSS dem Vereinsdesign folgen (Constitution VII, `design/`), hell und dunkel nach Systemeinstellung, im Hochformat ab 375 pt Breite ohne waagrechtes Scrollen und ab 320 pt (große Schrift, Bildschirmzoom) mit Namen, die nur an Leerzeichen und Bindestrichen umbrechen, solange kein einzelnes Wort breiter als die Zeile ist, Kontrast wie SC-006 aus Spec 001; Trikotfarben als kleine Farbmarken wie im Spielbildschirm (keine Emojis in der Oberfläche, `design/README.md`).

**Verwalten (jedes Trainer-Handy)**

- **FR-L19**: Jedes Trainer-Handy MUSS den Titel ändern, Mannschaften hinzufügen und entfernen sowie alle Links neu ausstellen können (mit Bestätigung). Bei Änderungen von mehreren Handys gilt die jüngste. Hinzufügen und Entfernen ändern den Zuschauer-Link nicht, und der bisherige Trainer-Link bleibt gültig (gleiches Topic, gleiche Schlüssel; ein neu geteilter Trainer-Link nennt zusätzlich die aktuelle Mannschaftsliste); Neuausstellen macht alle bisherigen Links wirkungslos.
- **FR-L20**: Ein Trainer- oder Lead-Handy MUSS die Kopplung beenden können (mit Bestätigung); lokal gespeicherte Spiele bleiben unverändert.
- **FR-L21**: Die Sicherung (FR-024) MUSS Live-Spieltag und Kopplungen enthalten (mit Schlüsseln, Hinweis "nur für dich aufbewahren"), damit ein Handywechsel ohne neue Links möglich ist. Wiederherstellen übernimmt den Live-Spieltag nur, wenn das Handy noch keinen hat, und erst nach einer Rückfrage mit Titel und Mannschaften (wie beim Koppeln per Link).

**Übernehmen (US6)**

- **FR-L22**: Ein Trainer-Handy MUSS beim Anlegen eines Spiels mit "Live aufs Dashboard" erkennen, ob ein anderes Handy gerade ein Spiel derselben Mannschaft überträgt (heute, nicht beendet, letzte Meldung höchstens 30 Minuten alt), und dann wie in US6 Szenario 1 nachfragen. Hat das Handy den Live-Spieltag noch nicht geladen, wartet "Weiter zum Anpfiff" höchstens 3 Sekunden darauf; ohne Verbindung geht es sofort weiter (US6 Szenario 5 und 6).
- **FR-L23**: "Spiel übernehmen" MUSS das Spiel aus dem letzten Live-Stand anlegen (alles aus FR-L10, Uhr auf die eigene Uhrzeit umgerechnet, bereits erreichte Signalschwellen als erledigt) und es mit einem um eins erhöhten Übergabezähler weitersenden. Das Dashboard MUSS Meldungen mit kleinerem Übergabezähler für dieses Spiel ignorieren.
- **FR-L24**: Erfährt ein Handy, dass sein Spiel übernommen wurde, MUSS es das Senden dafür beenden (auch kein "off" und beim Löschen kein "deleted") und den Hinweis aus US6 Szenario 3 zeigen; lokal bleibt das Spiel vollständig erhalten und erfassbar.

### Key Entities

- **Live-Spieltag**: Titel, Liste der Mannschaften (Kurzform, Trikots), Zuschauer-Berechtigung (nur lesen), Trainer-Berechtigung (senden für alle Mannschaften und verwalten).
- **Kopplung**: auf einem Trainer-Handy; Live-Spieltag, Trainer-Berechtigung, aktiv/beendet. Je Spiel: "Live aufs Dashboard" an/aus.
- **Live-Stand**: die jeweils letzte Meldung je Spiel; Spiel-Kennung, Mannschaft, Gegner, Trikotfarben, Heim/Gast, Spielzeit-Schema, Spielverlauf, Tore, Zeitpunkt der Meldung, Kennzeichen "gelöscht" bzw. "nicht live".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-L01**: Bei Netz auf beiden Seiten erscheint ein erfasstes Tor in 95 % der Fälle innerhalb von 10 Sekunden auf dem Dashboard.
- **SC-L02**: Ein Elternteil sieht nach dem Öffnen des Zuschauer-Links innerhalb von 5 Sekunden (Mobilfunk) die aktuellen Stände.
- **SC-L03**: Die Erfassung auf dem Lead-Handy bleibt mit und ohne Netz so schnell wie ohne Kopplung (Tor bis Anzeige unter 100 ms, SC-001).
- **SC-L04**: Die Minute auf dem Dashboard weicht höchstens 1 Minute von der Anzeige auf dem Lead-Handy ab, auch bei falsch gestellter Geräteuhr.
- **SC-L05**: Ein Trainer legt einen Live-Spieltag mit zwei Mannschaften an und verschickt beide Links in unter 2 Minuten; ein weiteres Trainer-Handy ist in unter 30 Sekunden gekoppelt. Wechselt ein Trainer von E1 zu E2, braucht es dafür keinen einzigen Tipp.
- **SC-L06**: Keine Meldung enthält Namen oder Spielstände im Klartext (automatisch geprüft); ohne Kopplung verlässt keine Anfrage das Gerät außer der Update-Prüfung.
- **SC-L07**: Betrieb und Nutzung kosten nichts und brauchen kein Konto (Constitution VIII).
- **SC-L08**: Bis zu 40 Zuschauer je Mannschaft, bei drei Mannschaften also 120, verfolgen den Spieltag gleichzeitig, ohne dass SC-L01 und SC-L02 schlechter werden.

## Hilfe

Die Einträge zu US1 bis US3 und US6 kamen mit Spec 010 (Grundbestand). Neu mit US4: "Wie sehe ich während des Spiels, wie es bei den anderen steht?" (`andere-spiele`, Thema Live-Spieltag, Quelle 006 US4). Mit US5 folgen Einträge zum Verwalten (Titel, Mannschaft hinzufügen, Links neu ausstellen, Kopplung beenden). Geändert mit der Fehlerbehebung vom 05.11.2026 (US3-S11): "Wie lege ich den Spieltag auf den Home-Bildschirm?" (`eltern-home`) nennt, dass ein älteres Symbol, das "Neues Spiel" zeigt, gelöscht und neu angelegt wird. Geändert mit der Fehlerbehebung vom 06.11.2026 (US1-S9): "Wie kopple ich das Handy eines Trainers?" (`trainer-link`) erklärt "Zum Home-Bildschirm" von der Seite des Trainer-Links.

## Assumptions

- Am Platz gibt es meistens mobiles Netz; Funklöcher verzögern die Anzeige, verhindern aber nie die Erfassung.
- Vermittlungsdienst: kostenlos, ohne Konto, aus dem Browser nutzbar; Kandidat ntfy.sh (erreichbar, Browser-Zugriff erlaubt; laut Dokumentation Meldungen bis 4 KB, rund 12 Stunden vorgehalten, je Anschluss 250 gesendete Meldungen am Tag und 30 offene Verbindungen). Auswahl, Grenzen und Ausfallverhalten klärt `research.md`. Fällt der Dienst aus, fehlt nur die Live-Anzeige.
- Zuschauer sehen Stände im Dashboard nur bei geöffneter Seite. Benachrichtigungen auf dem Sperrbildschirm sind nicht Teil dieser Spec (Review B: Variante C); sie folgen mit Spec 007.
- Lead-Handys sind während des Spiels im Vordergrund (Bildschirm bleibt an, FR-013).
- Die Trainergruppe ist klein (4 bis 5 Personen) und vertrauenswürdig; der Trainer-Link wird nur dort geteilt.
- Die Constitution wird auf Version 2.0.0 angehoben (Prinzip II erlaubt die Live-Kopplung); das Qualitätstor "Netzwerk-Wächter" lässt genau den Vermittlungsdienst und nur bei aktiver Kopplung zu.
- Spiele werden nicht zwischen Geräten abgeglichen: Das Dashboard ist eine Anzeige, die Historie bleibt auf dem Handy, das das Spiel erfasst hat. Einzige Ausnahme ist "Spiel übernehmen" (US6): Dabei legt ein zweites Handy das laufende Spiel aus dem letzten Live-Stand an (ohne Karten, Wechsel, Lesezeichen und Aufgebot).

## Offene Fragen

Keine. Benachrichtigungen bei Toren und ein Endstand, der für alle bis zum nächsten Spiel sichtbar bleibt, folgen als Spec 007 (`specs/007-push-benachrichtigung`, Backlog).
