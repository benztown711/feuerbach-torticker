# Feature Specification: Trainer-Paket (Kader für alle Trainer, "Link einfügen")

**Feature Branch**: `016-trainer-paket` (Arbeitsbranch `claude/sharp-brahmagupta-kxgyie`)

**Created**: 2026-11-07

**Status**: Review A erledigt (07.11.2026: "1A, 2B, 3A, 4A", Folgerungen "passt"). Review B offen, Mockup: https://claude.ai/artifact/2R4hbBgR2vTAYSu95RP4qX Voraussetzung: Constitution 3.1.0 (Prinzip II, Kader für Trainer-Handys über den eigenen Dienst).

**Input**: Atti (07.11.2026): "Spec 007 PR C „Letzte Spiele“ würde ich gerne machen und danach das Trainer paket B1/b2". Roadmap B1: "Trainer-Paket: ein Link mit Kopplung, Mannschaften, Trikots und Kadern; im Torticker genügt „Link einfügen“". Roadmap B2: "Knopf „Link einfügen“ auf dem Startbildschirm, der jeden Torticker-Link erkennt (Paket, Trainer, Zuschauer, Kader) und die Zwischenablage anbietet".

## Ausgangslage

- Ein neuer Trainer braucht heute drei Einfüge-Schritte: den Trainer-Link (Kopplung, Mannschaften, Trikots; Spec 006, Spec 012 US1) und je Kader die Liste aus "Kader teilen" unter "Mehr" → "Kader" → "Liste einfügen" (Spec 001 FR-028, Spec 015 FR-P23). Bei Atti sind das die Kader "E1/E2" und "E3".
- Ändert sich ein Kader (neues Kind, neue Rückennummer), muss jeder Trainer die Liste erneut einfügen.
- Nach dem Koppeln gehören die Mannschaften keinem Kader: jede Mannschaft zeigt den ersten Kader, bis der Trainer unter "Meine Mannschaften" den richtigen wählt (Spec 015 FR-P21).
- Der Trainer-Link ist kurz (rund 400 Zeichen, Spec 006 R-L20), damit WhatsApp auf dem iPhone ihn ganz antippbar macht.
- Seit Spec 007 hält der eigene Dienst (Cloudflare) Konfiguration, Spielplan und Spielstände Ende-zu-Ende verschlüsselt vor; Trainer-Handys bekommen Änderungen auch nach Tagen ohne erneutes Senden. Kindernamen außer Torschützen und Vorlagen gehen bisher nicht über ihn (Spec 006 FR-L10, Constitution II).
- Der Startbildschirm zeigt ohne Kopplung die Karte "Trainer? Füge den Trainer-Link aus der Trainergruppe ein." mit "Trainer-Link einfügen" (Spec 012 FR-S01, FR-S02). Er erkennt Trainer-, Lead- und Zuschauer-Links, keine Kader-Liste.

## Clarifications

### Session 2026-11-07 (Review A)

- Q: Welche Kader reisen mit? → A: Beim Teilen ankreuzbar, alle vorausgewählt (1A).
- Q: Spätere Kader-Änderungen? → A: Automatisch über den Dienst verteilen (2B). Folgerung: Constitution II wird ergänzt (Kader für Trainer-Handys, verschlüsselt mit einem Schlüssel, den nur Trainer-Handys haben). Weil der Dienst die Kader ohnehin verteilt, stehen sie nicht im Trainer-Link: der Link bleibt kurz und antippbar, Kindernamen stehen nicht in WhatsApp, und schon gekoppelte Trainer-Handys bekommen die Kader ohne neuen Link.
- Q: "Link einfügen" nach dem Koppeln? → A: Wie heute nur vor dem Koppeln auf dem Startbildschirm, danach unter "Mehr" → "Live-Spieltag" (3A).
- Q: Kader beim Koppeln? → A: Kommen automatisch mit, ohne Abwählen (4A).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Kader mit den Trainern teilen (Priority: P1)

Atti tippt unter "Mehr" → "Live-Spieltag" auf "Trainer-Link teilen". Vorher fragt die App "Kader mit den Trainern teilen?" und zeigt seine Kader, alle angekreuzt. Nach "Teilen" sind die angekreuzten Kader im Live-Spieltag geteilt: Jedes Trainer-Handy des Live-Spieltags bekommt sie, auch die schon gekoppelten. Unter "Mehr" → "Kader" zeigt jeder geteilte Kader "Mit Trainern geteilt"; dort lässt sich das Teilen je Kader auch ein- und ausschalten.

**Why this priority**: Ohne geteilte Kader gibt es nichts zu verteilen; Grundlage für US2 und US3.

**Independent Test**: Auf einem Trainer-Handy mit Live-Spieltag (E1, E2, E3) und den Kadern "E1/E2" (16 Kinder) und "E3" (11 Kinder) "Trainer-Link teilen" tippen, beide angekreuzt lassen, teilen; ein zweites, schon gekoppeltes Trainer-Handy zeigt kurz darauf beide Kader.

**Acceptance Scenarios**:

1. **Given** ein Trainer-Handy mit zwei Kadern mit Kindern, keiner geteilt, **When** Atti "Trainer-Link teilen" tippt, **Then** erscheint "Kader mit den Trainern teilen?" mit je einer angekreuzten Zeile pro Kader (Name, Anzahl Kinder), dem Hinweis "Alle mit dem Trainer-Link sehen diese Vornamen und Rückennummern." und den Knöpfen "Teilen" und "Ohne Kader teilen".
2. **Given** "E3" abgewählt, **When** Atti "Teilen" tippt, **Then** ist nur "E1/E2" geteilt, und der Trainer-Link wird wie bisher geteilt (ohne Kindernamen).
3. **Given** alle Kader sind schon geteilt, **When** Atti "Trainer-Link teilen" tippt, **Then** wird ohne Rückfrage geteilt.
4. **Given** ein geteilter Kader, **When** Atti unter "Mehr" → "Kader" bei diesem Kader "Mit Trainern geteilt" ausschaltet und bestätigt, **Then** verschwindet er vom Dienst; auf den anderen Trainer-Handys bleibt er als eigener, nicht mehr abgeglichener Kader.
5. **Given** ein Handy ohne Kopplung mit Trainer-Link, **When** "Mehr" → "Kader" erscheint, **Then** gibt es keinen Schalter "Mit Trainern geteilt".

---

### User Story 2 - Ein Einfügen genügt (Priority: P1)

Tom, Trainer der E3, fügt den Trainer-Link aus der Trainergruppe ein und koppelt. Die Kopplungsfrage sagt "Geteilte Kader kommen automatisch mit." Kurz nach dem Koppeln hat sein Handy die geteilten Kader mit allen Kindern und Rückennummern, und jede Mannschaft spielt mit ihrem Kader. Er legt sofort ein E3-Spiel an und sieht im Aufgebot die E3-Kinder.

**Why this priority**: Der eigentliche Nutzen: aus drei Einfüge-Schritten wird einer.

**Independent Test**: Neues Gerät ohne Daten, Trainer-Link einfügen, koppeln, "Neues Spiel" mit E3: das Aufgebot zeigt die 11 E3-Kinder, unter "Weitere Kinder" die 16 aus "E1/E2".

**Acceptance Scenarios**:

1. **Given** ein Handy ohne Kopplung, **When** Tom einen Trainer-Link einfügt, **Then** nennt die Kopplungsfrage zusätzlich "Geteilte Kader kommen automatisch mit."
2. **Given** im Live-Spieltag sind "E1/E2" und "E3" geteilt, **When** Tom koppelt und online ist, **Then** hat sein Handy innerhalb von 10 Sekunden beide Kader mit Kindern und Rückennummern; E1 und E2 spielen mit "E1/E2", E3 mit "E3"; ein Hinweis "Kader übernommen: E1/E2 (16 Kinder), E3 (11 Kinder)" erscheint.
3. **Given** auf Toms Handy gibt es schon den Kader "E3" mit 9 Kindern, 2 davon mit anderer Rückennummer, **When** der geteilte Kader "E3" ankommt, **Then** wird einmal zusammengeführt wie bei "Liste einfügen" (Spec 001 FR-027): gleiche Kinder werden erkannt und aktualisiert, neue kommen dazu, keins wird gelöscht; danach ist "E3" ein geteilter Kader und wird abgeglichen.
4. **Given** auf Toms Handy gibt es schon 6 Kader, keiner heißt "E3", **When** "E3" ankommt, **Then** kommt er nicht dazu, und Tom sieht unter "Mehr" → "Kader" den Hinweis "„E3“ ist geteilt, hat aber keinen Platz (höchstens 6 Kader)."
5. **Given** Tom ist offline, **When** er koppelt, **Then** kommen die Kader, sobald er wieder online ist; Koppeln und Erfassen gehen ohne sie.

---

### User Story 3 - Kader-Änderungen kommen überall an (Priority: P1)

Ben, Trainer der E1, nimmt ein neues Kind in "E1/E2" auf und ändert eine Rückennummer. Ohne dass jemand etwas teilt oder einfügt, haben alle Trainer-Handys des Live-Spieltags die Änderung, auch Handys, die erst Tage später wieder öffnen.

**Why this priority**: Attis Entscheidung 2B; erspart das erneute Einfügen bei jeder Änderung.

**Independent Test**: Zwei gekoppelte Trainer-Handys mit geteiltem Kader "E1/E2"; auf A ein Kind hinzufügen, eins umbenennen, eins löschen; B zeigt innerhalb von 10 Sekunden denselben Kader.

**Acceptance Scenarios**:

1. **Given** zwei gekoppelte Trainer-Handys A und B mit geteiltem Kader "E1/E2", beide online, **When** A ein Kind hinzufügt, umbenennt, die Rückennummer ändert oder löscht, **Then** zeigt B dieselbe Änderung innerhalb von 10 Sekunden.
2. **Given** B war vier Tage aus, **When** B den Torticker öffnet, **Then** hat B alle Änderungen dieser Tage, ohne dass A erneut sendet.
3. **Given** A und B ändern offline dasselbe Kind (A die Nummer, B den Namen), **When** beide wieder online sind, **Then** gilt je Kind die jüngere Änderung, auf beiden Handys gleich.
4. **Given** A verschiebt ein Kind von "E3" nach "E1/E2" (beide geteilt), **When** B das empfängt, **Then** steht das Kind auf B in "E1/E2" (Aushilfen bleiben wie bisher über "Weitere Kinder" wählbar).
5. **Given** A benennt den geteilten Kader "E3" in "E3 Hallo" um, **When** B das empfängt, **Then** heißt er auf B ebenfalls so, und die Mannschaften behalten ihn.
6. **Given** A ändert unter "Meine Mannschaften" den Kader der Mannschaft E2 auf "E3", **When** B das empfängt, **Then** spielt E2 auch auf B mit "E3".
7. **Given** eine Torschützen-Auswahl auf B ist gerade offen, **When** eine Änderung ankommt, **Then** schließt sie nicht und verliert keine Eingabe; die Änderung gilt beim nächsten Öffnen.
8. **Given** ein Zuschauer mit dem Zuschauer-Link, **When** er die Meldungen des Dienstes mitliest, **Then** kann er die Kader nicht lesen.

---

### User Story 4 - "Link einfügen" erkennt alles (Priority: P2)

Auf dem Startbildschirm heißt der Knopf "Link einfügen". Er liest die Zwischenablage und erkennt: Trainer-Link (Kopplungsfrage aus US2), Zuschauer-Link (Dashboard) und eine Kader-Liste aus "Kader teilen" (Vorschau wie unter "Liste einfügen", Ziel ist der Kader aus der ersten Zeile).

**Why this priority**: Ein Knopf für alles, was in der Trainergruppe ankommt; die Kader-Liste bleibt der Weg für Handys ohne Kopplung.

**Independent Test**: Auf einem Handy ohne Kopplung den Text aus "Kader teilen" ("Kader E3:" und 11 Zeilen) kopieren, "Link einfügen" tippen: die Vorschau zeigt 11 Kinder für den Kader "E3"; "Übernehmen" legt ihn an.

**Acceptance Scenarios**:

1. **Given** der Startbildschirm ohne Kopplung, **When** er erscheint, **Then** zeigt die Karte "Trainer? Füge den Link aus der Trainergruppe ein." und den Knopf "Link einfügen".
2. **Given** ein Trainer-Link in der Zwischenablage, **When** "Link einfügen" getippt wird, **Then** folgt die Kopplungsfrage (US2).
3. **Given** ein Zuschauer-Link in der Zwischenablage, **When** "Link einfügen" getippt wird, **Then** öffnet das Dashboard (wie bisher).
4. **Given** der Text aus "Kader teilen" in der Zwischenablage, **When** "Link einfügen" getippt wird, **Then** erscheint die Vorschau aus "Liste einfügen" für den Kader aus der ersten Zeile; "Übernehmen" führt zusammen (FR-027) und zeigt danach "Mehr" → "Kader".
5. **Given** weder Link noch Kader-Liste in der Zwischenablage (oder nicht lesbar), **When** "Link einfügen" getippt wird, **Then** öffnet das Einfügefeld mit dem Hinweis "Link oder Kader-Liste aus der Trainergruppe einfügen."
6. **Given** ein gekoppeltes Handy, **When** der Startbildschirm erscheint, **Then** zeigt er wie bisher die Live-Zeile statt der Karte; "Link einfügen" gibt es unter "Mehr" → "Live-Spieltag" mit derselben Erkennung.

---

### Edge Cases

- **Älterer App-Stand**: Er kennt die Kader-Meldungen nicht und überspringt sie; Koppeln und Erfassen gehen wie bisher. Der Update-Hinweis (Spec 007) holt den neuen Stand.
- **Live-Spieltag neu ausgestellt**: Die geteilten Kader verschwinden mit dem alten Live-Spieltag vom Dienst; das Handy, das neu ausstellt, teilt sie im neuen Live-Spieltag wieder. Alte Trainer-Handys behalten ihre Kader als eigene.
- **Entkoppeln**: Die Kader bleiben auf dem Handy als eigene, nicht mehr abgeglichene Kader.
- **Gleichnamige Kinder**: Erkennung wie bei "Liste einfügen" (Vorname, Kürzel, Nummer; Spec 001 FR-025); nach dem ersten Zusammenführen gilt die gemeinsame Kennung des Kindes.
- **Gelöschtes Kind wieder aufgenommen**: wie bisher wieder sichtbar (FR-027), auf allen Handys.
- **Gespielte Spiele**: Tore und Aufgebote früherer Spiele bleiben unverändert, auch wenn ein Kind später umbenannt oder gelöscht wird.
- **Kader nur auf einem Handy (nicht geteilt)**: bleibt lokal wie bisher, auch auf gekoppelten Handys.
- **Zuschauer-Link in falsche Hände**: Er zeigt keine Kader. Trainer-Link in falsche Hände: "Links neu ausstellen" (Spec 006) sperrt auch die Kader auf dem alten Live-Spieltag.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-B01**: "Mehr" → "Kader" MUSS auf einem Handy mit Trainer-Link je Kader den Schalter "Mit Trainern geteilt" haben (Vorgabe: aus). Ausschalten fragt vorher "Kader nicht mehr teilen? Auf den anderen Handys bleibt er als eigener Kader."
- **FR-B02**: "Trainer-Link teilen" MUSS, solange mindestens ein Kader mit Kindern nicht geteilt ist, vorher "Kader mit den Trainern teilen?" zeigen: je Kader eine Zeile mit Name und Anzahl Kinder, beim ersten Mal alle angekreuzt, danach wie die Schalter aus FR-B01; dazu "Alle mit dem Trainer-Link sehen diese Vornamen und Rückennummern.", "Teilen" und "Ohne Kader teilen". "Teilen" setzt die Schalter wie angekreuzt und teilt den Trainer-Link.
- **FR-B03**: Der Trainer-Link MUSS ohne Kindernamen bleiben (Format und Länge wie bisher, Spec 006 R-L20).
- **FR-B04**: Ein geteilter Kader MUSS über den eigenen Dienst an alle Trainer-Handys des Live-Spieltags gehen: Kadername und je Kind Vorname bzw. Kürzel, Rückennummer, gelöscht ja/nein. Dazu je Mannschaft des Live-Spieltags ihr Kader. Aufgebote, Sortierung, Spiele und Kinder nicht geteilter Kader gehen nicht über den Dienst.
- **FR-B05**: Die Kader MÜSSEN Ende-zu-Ende verschlüsselt sein, lesbar nur für Handys mit Trainer-Link; weder der Dienst noch Zuschauer-Links können sie lesen. Schreiben darf nur ein Handy mit Trainer-Link (signiert wie Konfiguration und Spielplan, Spec 007).
- **FR-B06**: Änderungen an geteilten Kadern (Kind hinzufügen, umbenennen, Nummer ändern, löschen, wiederherstellen, verschieben zwischen geteilten Kadern, Kader umbenennen, Kader einer Mannschaft ändern) MÜSSEN online innerhalb von 10 Sekunden auf den anderen Trainer-Handys ankommen und nach Tagen ohne erneutes Senden (wie Spec 007 US2). Offline gemachte Änderungen gehen hinaus, sobald das Handy online ist.
- **FR-B07**: Bei gleichzeitigen Änderungen MUSS je Kind bzw. je Kader die jüngere Änderung gelten, auf allen Handys gleich.
- **FR-B08**: Kommt ein geteilter Kader auf einem Handy erstmals an, MUSS die App ihn mit einem gleichnamigen eigenen Kader einmal zusammenführen wie "Liste einfügen" (Spec 001 FR-025 bis FR-027), sonst neu anlegen; ohne Platz (6 Kader) kommt er nicht dazu und "Mehr" → "Kader" zeigt den Hinweis aus US2-S4.
- **FR-B09**: Nach dem ersten Empfang MUSS die App einmal "Kader übernommen: <Kader> (<n> Kinder), …" zeigen.
- **FR-B10**: Die Kopplungsfrage (Spec 006 FR-L03) MUSS bei einem Trainer-Link "Geteilte Kader kommen automatisch mit." nennen.
- **FR-B11**: Wird ein Kader nicht mehr geteilt, der Live-Spieltag neu ausgestellt oder das Handy entkoppelt, MUSS der Dienst die Kader dieses Live-Spieltags nicht mehr ausliefern; auf den Handys bleiben sie als eigene Kader. Beim Neu-Ausstellen teilt das ausstellende Handy seine geteilten Kader im neuen Live-Spieltag erneut.
- **FR-B12**: Ältere App-Stände MÜSSEN Kader-Meldungen ohne Fehler überspringen.
- **FR-B13**: Der Knopf auf dem Startbildschirm MUSS "Link einfügen" heißen und die Karte "Trainer? Füge den Link aus der Trainergruppe ein." zeigen (ersetzt den Wortlaut aus Spec 012 FR-S01); bei neu ausgestelltem Live-Spieltag bleibt der Satz zum Neu-Ausstellen. Gekoppelte Handys zeigen weiter die Live-Zeile (Spec 012 FR-S04).
- **FR-B14**: "Link einfügen" (Startbildschirm und "Mehr" → "Live-Spieltag") MUSS in der Zwischenablage erkennen: Trainer- und Lead-Link, Zuschauer-Link, Kader-Liste aus "Kader teilen" (erste Zeile "Kader <Name>:"). Reihenfolge: zuerst ein Link, sonst eine Kader-Liste, sonst das Einfügefeld.
- **FR-B15**: Eine erkannte Kader-Liste MUSS die Vorschau aus "Liste einfügen" (Spec 001 FR-026) für den Kader aus der ersten Zeile zeigen; "Übernehmen" führt zusammen und öffnet "Mehr" → "Kader" mit diesem Kader. Ist er geteilt, gehen die Änderungen wie in FR-B06 hinaus.
- **FR-B16**: Das Einfügefeld von "Link einfügen" MUSS auch eine eingefügte Kader-Liste annehmen (wie FR-B15) und bei unbrauchbarem Inhalt "Link oder Kader-Liste aus der Trainergruppe einfügen." zeigen.
- **FR-B17**: Der Dienst MUSS je Live-Spieltag höchstens 6 geteilte Kader vorhalten, je Kader höchstens 100 Kinder (mit gelöschten der letzten 30 Tage); mehr weist er bzw. die App ab.

### Key Entities

- **Geteilter Kader**: Name, gemeinsame Kennung, Liste der Kinder (gemeinsame Kennung, Vorname bzw. Kürzel, Rückennummer, gelöscht), Zeitpunkt der letzten Änderung je Kind und Kader; gehört zu einem Live-Spieltag.
- **Kader der Mannschaft**: je Mannschaft des Live-Spieltags der Name bzw. die Kennung ihres geteilten Kaders.
- **Schalter "Mit Trainern geteilt"**: je Kader auf dem Handy; bestimmt, ob Änderungen hinausgehen und ankommen.

## Hilfe *(mandatory)*

- **Neu**: "Wie bekommen Trainerkollegen die Kader?" (Thema: Live, Quelle: 016 US1, 016 US2, 016 US3)
- **Geändert**: "Wie kopple ich das Handy eines Trainers?" (`trainer-link`: Knopf heißt "Link einfügen", Kader kommen automatisch, Quelle: 016 US2, 016 US4)
- **Geändert**: "Wie übernehme ich eine Spielerliste aus WhatsApp?" (`kader-liste`: auch über "Link einfügen" auf dem Startbildschirm; geteilte Kader brauchen das nicht mehr, Quelle: 016 US4)
- **Geändert**: "Wie richte ich einen Live-Spieltag ein?" (`live-anlegen`: "Kader mit den Trainern teilen?" beim Teilen, Quelle: 016 US1)
- **Geändert**: Datenschutz-Eintrag für Trainer (geteilte Kader gehen verschlüsselt über den eigenen Dienst, nur Trainer-Handys können sie lesen; Quelle: 016 FR-B05)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-B01**: Ein neuer Trainer ist mit einem einzigen Einfügen startklar (gekoppelt, Mannschaften, Trikots, Kader, Zuordnung) und legt in unter 1 Minute ab dem Öffnen der Trainergruppe ein Spiel mit dem richtigen Aufgebot an.
- **SC-B02**: Eine Kader-Änderung ist auf allen anderen Trainer-Handys, die online sind, in unter 10 Sekunden sichtbar; auf Handys, die Tage später öffnen, beim ersten Öffnen.
- **SC-B03**: Kein Kindername erreicht den Dienst unverschlüsselt; mit nur dem Zuschauer-Link lässt sich kein Kader lesen (automatischer Test).
- **SC-B04**: Schon gekoppelte Trainer-Handys bekommen die Kader nach dem Update ohne neuen Link.

## Assumptions

- Constitution II wird auf 3.1.0 ergänzt: Der Dienst hält zusätzlich die geteilten Kader für Trainer-Handys vor, verschlüsselt mit einem Schlüssel, den nur Trainer-Handys haben. Spec 006 FR-L10 bekommt einen Nachtrag (Kader gehen nur als geteilte Kader für Trainer-Handys über den Dienst, nie an Zuschauer).
- Der Schlüssel für die Kader leitet sich aus dem Organisator-Schlüssel des Trainer-Links ab; Lead-Links (erste Version, nicht mehr geteilt) bekommen keine Kader.
- Die Trainergruppe ist geschlossen; der Trainer-Link enthält ohnehin den Organisator-Schlüssel und ist das sensibelste Teilbare.
- Der Kader einer Mannschaft gilt im ganzen Live-Spieltag gleich (wie Trikots); ein Trainer ändert ihn für alle.
- Nur Vornamen bzw. Kürzel und Rückennummern (Constitution III), wie heute im Kader.
- Format, Schlüsselableitung und Abgleich legt der Plan fest (research.md, contracts).
