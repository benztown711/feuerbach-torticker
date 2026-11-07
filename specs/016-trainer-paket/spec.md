# Feature Specification: Trainer-Paket (ein Link mit Kadern, "Link einfügen")

**Feature Branch**: `016-trainer-paket` (Arbeitsbranch `claude/sharp-brahmagupta-kxgyie`)

**Created**: 2026-11-07

**Status**: Draft, Review A offen

**Input**: Atti (07.11.2026): "Spec 007 PR C „Letzte Spiele“ würde ich gerne machen und danach das Trainer paket B1/b2". Roadmap B1: "Trainer-Paket: ein Link mit Kopplung, Mannschaften, Trikots und Kadern; im Torticker genügt „Link einfügen“". Roadmap B2: "Knopf „Link einfügen“ auf dem Startbildschirm, der jeden Torticker-Link erkennt (Paket, Trainer, Zuschauer, Kader) und die Zwischenablage anbietet".

## Ausgangslage

- Ein neuer Trainer braucht heute drei Einfüge-Schritte: den Trainer-Link (Kopplung, Mannschaften, Trikots; Spec 006, Spec 012 US1) und je Kader die Liste aus "Kader teilen" unter "Mehr" → "Kader" → "Liste einfügen" (Spec 001 FR-028, Spec 015 FR-P23). Bei Atti sind das die Kader "E1/E2" und "E3".
- Nach dem Koppeln gehören die Mannschaften keinem Kader: jede Mannschaft zeigt den ersten Kader, bis der Trainer unter "Meine Mannschaften" den richtigen wählt (Spec 015 FR-P21).
- Der Trainer-Link ist kurz (rund 400 Zeichen, Spec 006 R-L20), damit WhatsApp auf dem iPhone ihn ganz antippbar macht. Antippen öffnet Safari; das Symbol auf dem Home-Bildschirm startet mit dem Trainer-Link (eigener Speicher auf dem iPhone).
- Der Startbildschirm zeigt ohne Kopplung die Karte "Trainer? Füge den Trainer-Link aus der Trainergruppe ein." mit "Trainer-Link einfügen" (Spec 012 FR-S01, FR-S02). Er erkennt Trainer-, Lead- und Zuschauer-Links, keine Kader-Liste.
- Kindernamen gehen nie über den Vermittlungsdienst (Spec 006 FR-L10, Constitution II). Der Link steht nur im Fragment der Adresse; GitHub Pages und der Dienst sehen ihn nicht.

## Clarifications

_Offen bis Review A (Fragen im Chat an Atti)._

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trainer-Link mit Kadern teilen (Priority: P1)

Atti teilt unter "Mehr" → "Live-Spieltag" den Trainer-Link. Vor dem Teilen fragt die App "Kader mitschicken?" und zeigt seine Kader zum Ankreuzen. Der geteilte Link enthält dann Kopplung, Mannschaften, Trikots, die angekreuzten Kader (Vornamen bzw. Kürzel und Rückennummern) und welche Mannschaft mit welchem Kader spielt.

**Why this priority**: Ohne geteilte Kader gibt es nichts einzufügen; Grundlage für US2.

**Independent Test**: Auf einem Handy mit Live-Spieltag (E1, E2, E3) und den Kadern "E1/E2" (16 Kinder) und "E3" (11 Kinder) "Trainer-Link teilen" tippen, beide Kader angekreuzt lassen, teilen; der geteilte Text enthält einen Trainer-Link, der beim Einfügen beide Kader liefert.

**Acceptance Scenarios**:

1. **Given** ein Handy mit Organisator-Schlüssel und zwei Kadern mit Kindern, **When** Atti "Trainer-Link teilen" tippt, **Then** erscheint "Kader mitschicken?" mit je einer Zeile pro Kader (Name und Anzahl Kinder, angekreuzt), dazu "Teilen" und "Ohne Kader teilen".
2. **Given** "Kader mitschicken?" mit "E3" abgewählt, **When** Atti "Teilen" tippt, **Then** enthält der Link nur den Kader "E1/E2" und die Zuordnung der Mannschaften, deren Kader mitreist.
3. **Given** ein Handy ohne Kinder im Kader, **When** Atti "Trainer-Link teilen" tippt, **Then** wird wie bisher ohne Rückfrage geteilt.
4. **Given** gelöschte Kinder (Spec 001) im Kader, **When** der Link entsteht, **Then** fehlen sie darin.
5. **Given** der Link mit beiden Kadern (27 Kinder), **When** er in WhatsApp auf dem iPhone ankommt, **Then** ist er ganz antippbar (Gerätetest).

---

### User Story 2 - Ein Einfügen genügt (Priority: P1)

Tom, Trainer der E3, fügt den Trainer-Link aus der Trainergruppe ein. Die Kopplungsfrage nennt, was mitkommt: Mannschaften und Kader mit Anzahl Kinder. Nach "Koppeln" hat sein Handy den Live-Spieltag, die Mannschaften mit Trikots, die Kader und die Zuordnung Mannschaft → Kader. Er kann sofort ein E3-Spiel anlegen und sieht im Aufgebot die E3-Kinder.

**Why this priority**: Der eigentliche Nutzen: aus drei Einfüge-Schritten wird einer.

**Independent Test**: Neues Gerät ohne Daten, Trainer-Link mit beiden Kadern einfügen, koppeln, "Neues Spiel" mit E3: das Aufgebot zeigt die 11 E3-Kinder, unter "Weitere Kinder" die 16 aus "E1/E2".

**Acceptance Scenarios**:

1. **Given** ein Handy ohne Kopplung und ohne Kader, **When** Tom den Trainer-Link mit Kadern einfügt, **Then** nennt die Kopplungsfrage zusätzlich "Kader: E1/E2 (16 Kinder), E3 (11 Kinder)".
2. **Given** die Kopplungsfrage aus Szenario 1, **When** Tom "Koppeln" tippt, **Then** gibt es die Kader "E1/E2" und "E3" mit ihren Kindern und Rückennummern, und die Mannschaften E1, E2 spielen mit "E1/E2", E3 mit "E3".
3. **Given** auf Toms Handy gibt es schon den Kader "E3" mit 9 Kindern, 2 davon mit anderer Rückennummer, **When** er koppelt, **Then** wird zusammengeführt wie bei "Liste einfügen" (Spec 001 FR-027): 2 neue Kinder dazu, Rückennummern aktualisiert, kein Kind gelöscht; die Kopplungsfrage nennt "E3 (2 neu, 2 geändert)".
4. **Given** Toms Handy ist schon mit demselben Live-Spieltag gekoppelt, **When** er einen neueren Trainer-Link mit Kadern einfügt, **Then** fragt die App "Kader übernehmen?" mit der Zusammenfassung aus Szenario 3 statt erneut zu koppeln.
5. **Given** ein Trainer-Link ohne Kader (bisheriger Link), **When** Tom ihn einfügt, **Then** verhält sich die App wie bisher.
6. **Given** Tom tippt den Link in WhatsApp an und legt den Torticker über "Zum Home-Bildschirm" ab (iPhone), **When** er im Symbol "Koppeln und loslegen" tippt, **Then** kommen auch die Kader mit.
7. **Given** auf Toms Handy gibt es schon 6 Kader, keiner heißt "E3", **When** er koppelt, **Then** gehen die E3-Kinder in den ersten Kader und die Kopplungsfrage sagt das vorher ("E3 passt nicht mehr, Kinder kommen in „Kader“").

---

### User Story 3 - "Link einfügen" erkennt alles (Priority: P2)

Auf dem Startbildschirm heißt der Knopf "Link einfügen". Er liest die Zwischenablage und erkennt: Trainer-Link mit oder ohne Kader (Kopplungsfrage aus US2), Zuschauer-Link (Dashboard) und eine Kader-Liste aus "Kader teilen" (Vorschau wie unter "Liste einfügen", Ziel ist der Kader aus der ersten Zeile).

**Why this priority**: Ein Knopf für alles, was in der Trainergruppe ankommt; die Kader-Liste bleibt der Weg für Nachzügler und Änderungen.

**Independent Test**: Auf einem Handy ohne Kopplung den Text aus "Kader teilen" ("Kader E3:" und 11 Zeilen) kopieren, "Link einfügen" tippen: die Vorschau zeigt 11 Kinder für den Kader "E3"; "Übernehmen" legt ihn an.

**Acceptance Scenarios**:

1. **Given** der Startbildschirm ohne Kopplung, **When** er erscheint, **Then** zeigt die Karte "Trainer? Füge den Link aus der Trainergruppe ein." und den Knopf "Link einfügen".
2. **Given** ein Trainer-Link (mit oder ohne Kader) in der Zwischenablage, **When** "Link einfügen" getippt wird, **Then** folgt die Kopplungsfrage (US2).
3. **Given** ein Zuschauer-Link in der Zwischenablage, **When** "Link einfügen" getippt wird, **Then** öffnet das Dashboard (wie bisher).
4. **Given** der Text aus "Kader teilen" in der Zwischenablage, **When** "Link einfügen" getippt wird, **Then** erscheint die Vorschau aus "Liste einfügen" für den Kader aus der ersten Zeile; "Übernehmen" führt zusammen (FR-027) und zeigt danach "Mehr" → "Kader".
5. **Given** weder Link noch Kader-Liste in der Zwischenablage (oder nicht lesbar), **When** "Link einfügen" getippt wird, **Then** öffnet das Einfügefeld mit dem Hinweis "Link oder Kader-Liste aus der Trainergruppe einfügen."

---

### Edge Cases

- **Älterer App-Stand bekommt den neuen Link**: Er erkennt ihn nicht ("nicht gültig"). Der Update-Hinweis (Spec 007) holt den neuen Stand; der Teilen-Text bleibt kurz.
- **Kind steht in zwei mitgeschickten Kadern**: kann nicht vorkommen (jedes Kind gehört zu genau einem Kader, Spec 015 FR-P20).
- **Kind auf dem Empfänger in einem anderen Kader**: Es wird erkannt (Vorname, Kürzel, Nummer) und wechselt in den Kader aus dem Link, wie bei "Liste einfügen" mit Kadernamen (Spec 015, `movedFrom`); die Kopplungsfrage nennt es.
- **Nur ein Kader namens "Kader" auf dem Absender**: Er reist mit seinem Namen; auf dem Empfänger landet er im gleichnamigen bzw. ersten Kader.
- **Sehr großer Kader**: höchstens 6 Kader (Spec 015 FR-P20); je Kader zählt, was "Liste einfügen" erlaubt.
- **Link in die Elterngruppe geraten**: Wie bisher "Links neu ausstellen" (Spec 006); die Kinder-Vornamen standen dann in der Elterngruppe. Die Rückfrage aus US1 nennt deshalb "Nur in die Trainergruppe".
- **Neu ausgestellter Live-Spieltag, alter Link mit Kadern**: wie bisher abgewiesen (Spec 012 FR-S02), auch die Kader werden nicht übernommen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-B01**: "Trainer-Link teilen" MUSS bei mindestens einem Kind im Kader vorher "Kader mitschicken?" zeigen: je Kader eine angekreuzte Zeile mit Name und Anzahl Kinder, den Hinweis "Die Vornamen stehen dann im Link. Nur in die Trainergruppe teilen.", die Knöpfe "Teilen" und "Ohne Kader teilen".
- **FR-B02**: Der Trainer-Link MUSS die gewählten Kader enthalten: Kadername, je Kind Vorname bzw. Kürzel und Rückennummer (ohne gelöschte Kinder), dazu je Mannschaft des Live-Spieltags den Namen ihres Kaders, sofern dieser mitreist. Sonst nichts Neues (keine Aufgebote, keine Sortierung, keine Spiele).
- **FR-B03**: Ein Trainer-Link mit zwei Kadern und zusammen 30 Kindern MUSS kurz genug bleiben, dass WhatsApp auf dem iPhone ihn ganz antippbar macht (Ziel: höchstens rund 800 Zeichen; Gerätetest).
- **FR-B04**: Die Kopplungsfrage MUSS bei einem Link mit Kadern je Kader eine Zeile zeigen: neu "E3 (11 Kinder)", sonst "E3 (2 neu, 2 geändert)" bzw. "E3 (unverändert)"; Kinder, die den Kader wechseln, und ein voller Kaderbestand (6 Kader) werden genannt.
- **FR-B05**: "Koppeln" MUSS die Kader wie "Liste einfügen" mit Kadernamen zusammenführen (Spec 001 FR-025 bis FR-027, Spec 015 FR-P23): gleichnamiger Kader, sonst neu angelegt; Kinder ergänzen, aktualisieren, nie löschen.
- **FR-B06**: Nach dem Koppeln MUSS jede Mannschaft aus dem Link, für die der Link einen Kader nennt, diesen Kader haben (Spec 015 FR-P21), auch wenn die Mannschaft auf dem Handy schon existierte.
- **FR-B07**: Ein Handy, das schon mit demselben Live-Spieltag gekoppelt ist, MUSS beim Einfügen eines Trainer-Links mit Kadern "Kader übernehmen?" mit der Zusammenfassung aus FR-B04 zeigen ("Übernehmen", "Abbrechen") statt "schon gekoppelt".
- **FR-B08**: Das Home-Bildschirm-Symbol auf dem iPhone (Spec 006 R-L20) MUSS die Kader mitbringen. Auf Android darf die Startadresse keine Kindernamen enthalten (das Installieren kann das Manifest an einen Google-Dienst schicken); dort teilen Browser und App den Speicher, Einfügen im Browser genügt.
- **FR-B09**: Der Knopf auf dem Startbildschirm MUSS "Link einfügen" heißen und die Karte "Trainer? Füge den Link aus der Trainergruppe ein." zeigen (ersetzt den Wortlaut aus Spec 012 FR-S01); bei neu ausgestelltem Live-Spieltag bleibt der Satz zum Neu-Ausstellen.
- **FR-B10**: "Link einfügen" MUSS in der Zwischenablage erkennen: Trainer- und Lead-Link (mit oder ohne Kader), Zuschauer-Link, Kader-Liste aus "Kader teilen" (erste Zeile "Kader <Name>:"). Reihenfolge: zuerst ein Link, sonst eine Kader-Liste, sonst das Einfügefeld.
- **FR-B11**: Eine erkannte Kader-Liste MUSS die Vorschau aus "Liste einfügen" (Spec 001 FR-026) für den Kader aus der ersten Zeile zeigen; "Übernehmen" führt zusammen und öffnet "Mehr" → "Kader" mit diesem Kader.
- **FR-B12**: Das Einfügefeld von "Link einfügen" MUSS auch eine eingefügte Kader-Liste annehmen (wie FR-B11) und bei unbrauchbarem Inhalt "Link oder Kader-Liste aus der Trainergruppe einfügen." zeigen.
- **FR-B13**: Kindernamen DÜRFEN weiterhin nie über den Vermittlungsdienst gehen; der Trainer-Link mit Kadern verlässt das Handy nur über "Teilen" bzw. die Zwischenablage (Constitution II, III).
- **FR-B14**: "Mehr" → "Live-Spieltag" MUSS denselben Ablauf für eingefügte Links nutzen (Kopplungsfrage mit Kadern, "Kader übernehmen?").

### Key Entities

- **Trainer-Link mit Kadern**: bisheriger kurzer Trainer-Link (Kopplung, Mannschaften, Trikots) plus optional Kader (Name, Kinder mit Vorname bzw. Kürzel und Rückennummer) und Zuordnung Mannschaft → Kadername.
- **Kader-Zusammenfassung**: je Kader neu, geändert, unverändert, wechselnde Kinder; Grundlage der Kopplungsfrage und von "Kader übernehmen?".

## Hilfe *(mandatory)*

- **Neu**: "Wie bekommen Trainerkollegen die Kader?" (Thema: Live, Quelle: 016 US1, 016 US2)
- **Geändert**: "Wie kopple ich das Handy eines Trainers?" (`trainer-link`: Knopf heißt "Link einfügen", Kader kommen mit, Quelle: 016 US2, 016 US3)
- **Geändert**: "Wie übernehme ich eine Spielerliste aus WhatsApp?" (`kader-liste`: auch über "Link einfügen" auf dem Startbildschirm, Quelle: 016 US3)
- **Geändert**: "Wie richte ich einen Live-Spieltag ein?" (`live-anlegen`: "Kader mitschicken?" beim Teilen, Quelle: 016 US1)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-B01**: Ein neuer Trainer ist mit einem einzigen Einfügen startklar (gekoppelt, Mannschaften, Trikots, Kader, Zuordnung) und legt in unter 1 Minute ab dem Öffnen der Trainergruppe ein Spiel mit dem richtigen Aufgebot an.
- **SC-B02**: Der Trainer-Link mit zwei Kadern und 30 Kindern ist in WhatsApp auf dem iPhone ganz antippbar (Gerätetest).
- **SC-B03**: Kein Kindername erreicht den Vermittlungsdienst oder GitHub Pages (Netzwerk-Wächter und Prüfung der gesendeten Meldungen).
- **SC-B04**: Erneutes Einfügen desselben Links ändert nichts und meldet "unverändert".

## Assumptions

- Zusammenführen wie "Liste einfügen" (FR-027) ist gewollt; ersetzt wird nie, gelöscht wird nie.
- Kader-Änderungen später verteilt der Trainer wie heute per "Kader teilen" oder mit einem neuen Trainer-Link (US2-S4); keine automatische Verteilung über den Dienst (FR-B13).
- Die Trainergruppe ist geschlossen; der Trainer-Link enthält ohnehin den Organisator-Schlüssel und ist das sensibelste Teilbare.
- Lead-Links (erste Version, nicht mehr geteilt) bekommen keine Kader.
- Nach dem Koppeln bleibt der Startbildschirm wie heute (Live-Zeile statt Karte); "Link einfügen" gibt es dann unter "Mehr" → "Live-Spieltag" (FR-B14).
- Das kurze Linkformat wird erweitert; das Format der Kader im Link legt der Plan fest (research.md).
