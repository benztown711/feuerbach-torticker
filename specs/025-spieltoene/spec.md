# Feature Specification: Spieltöne für Anpfiff, Abpfiff und Tore

**Feature Branch**: `025-spieltoene` (Arbeitszweig `claude/clever-mayer-m34eyn`)

**Created**: 2026-11-26

**Status**: Klärung erledigt, Review B erledigt (27.11.2026, Atti: "Passt"; bestätigt auch die Empfehlungen a bis d und die Auswahl der Aufnahmen). US1 bis US3 umgesetzt in PR #103, Review C offen. Hörprobe: https://claude.ai/artifact/8LoXBkMhhzSEJJYhLsWcE7 · Mockup: https://claude.ai/artifact/92PXE3iS6DDDhWTuELTidN

**Input**: Atti (26.11.2026): "Können wir bitte unterschiedliche Töne für An- und Abpfiff und für Tore festlegen lassen? Sowas wie vielleicht auch ein Jubel bei Toren oder ähnliches."

## Ausgangslage

Gesichtet am 26.11.2026 in Specs und Code:

- **Trainer-Handy**: Ton nur bei Spielzeitende (00:00) und zu jeder vollen Nachspielminute (Spec 001 FR-007), Klang wählbar unter "Signalton": Pfiff, Glocke, Gong (Spec 008). Anpfiff, Pausenpfiff, Schlusspfiff und Tore sind stumm.
- **Eltern-Ansicht**: Schalter "Ton bei Toren" (Spec 020 FR-E25), spielt bei jedem neuen Tor den gewählten Signalton, egal für wen das Tor fällt. Anpfiff und Abpfiff sind stumm.
- **Technik**: Alle Töne werden heute im Browser erzeugt, ohne Audiodatei (Spec 008 FR-K01). Ein echter Jubel lässt sich so nicht überzeugend erzeugen.

## Clarifications

### Session 2026-11-26 (Klärung im Chat)

- Q: Wo erklingen die neuen Töne? → A: **Eltern-Ansicht und Trainer-Handy** (auf dem tickernden Handy beim Antippen, in der Eltern-Ansicht beim Eintreffen der Meldung).
- Q: Welche Ereignisse bekommen einen eigenen Ton? → A: **Anpfiff** (auch Wiederanpfiff), **Pausenpfiff**, **Schlusspfiff**, **Tor für uns**, **Gegentor**.
- Q: Wie festlegen? → A: **Je Ereignis wählbar**, die Vorbelegung gibt Atti vor.
- Q: Jubel? → A: **Freie Aufnahme** (CC0), mit der App ausgeliefert, offline.
- Q: Vorbelegung? → A: Anpfiff **Langer Pfiff**, Pausenpfiff **Doppelpfiff**, Schlusspfiff **Pfiff** (kurz-kurz-lang), Gegentor **Raunen** (enttäuschtes "Ohh", Freesound 619007), Tor für uns **Torhupe** (nach der Hörprobe, Atti 26.11.2026: "Tor: Torhupe · Gegentor: Raunen").

### Folgerungen mit Empfehlung (bestätigt in Review B, 27.11.2026)

- **Auswahl der Aufnahmen**: In die App kommen von den Hörproben-Varianten Torhupe, Jubel, Torhupe mit Jubel, Kinderjubel und Raunen (zusammen etwa 160 KB). Großer Jubel, Jubel kurz und die übrigen Raunen-Aufnahmen entfallen, damit die Liste kurz bleibt.

- **a) Ein Abschnitt "TÖNE" ersetzt "SIGNALTON"** in den Einstellungen: sechs Zeilen (Spielzeitende, Anpfiff, Pausenpfiff, Schlusspfiff, Tor für uns, Gegentor), je mit Auswahl aus derselben Liste plus "Aus". Spielzeitende behält den heutigen Signalton (Vorgabe Pfiff), damit sich für Trainer ohne Änderung nichts verschiebt.
- **b) Eltern-Ansicht**: "Ton bei Toren" wird zu "Töne" (Standard aus, wie heute) und einem Link "Töne wählen", der dieselben fünf Ereignis-Zeilen zeigt (ohne Spielzeitende). Wer "Ton bei Toren" schon an hatte, hat "Töne" an.
- **c) Trainer-Handy Vorgabe an**: Die Ereignistöne spielen ab dem Update beim Antippen. Wer das nicht will, stellt einzelne Ereignisse auf "Aus".
- **d) Andere Spiele bleiben stumm**: In der Zeile "Andere Spiele" auf dem Trainer-Handy (Spec 006 US4-S3) gibt es weiterhin keinen Ton.

### Festlegungen bei der Planung (27.11.2026)

- **Mehrere Ereignisse in einer Meldung** (FR-T07): Ist der letzte neue Pfiff ein Pausen- oder Schlusspfiff, spielt dessen Ton; sonst bei neuen Toren der Ton des neuesten Tors; sonst beim neuen Anpfiff der Anpfiff-Ton (plan.md R-T3).
- **Neues Spiel in der Eltern-Ansicht**: Erscheint nach dem ersten Laden ein neues Spiel (z. B. angelegt und sofort angepfiffen, beide Schritte in einer Meldung), zählt es ab null; sein Anpfiff spielt also (Code-Review 27.11.2026).
- **Eltern-Ansicht ohne Ton** bei Elfmeterschießen, "Uhr anhalten" und alten Meldungen nach einer Funklücke (wie FR-E21).
- **Tickerndes Eltern-Handy** (Spec 024): Ereignis-Töne aus "Töne wählen" auf diesem Handy; das Spielzeitende-Signal bleibt dort der Pfiff.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Töne je Ereignis wählen (Priority: P1)

Der Trainer öffnet Mehr → Einstellungen. Unter "TÖNE" sieht er sechs Zeilen mit dem jeweils gewählten Ton. Er tippt "Tor für uns", hört sich die Liste an und wählt "Jubel". Beim Gegentor stellt er "Aus" ein.

**Why this priority**: Grundlage für alle anderen Stories; ohne Auswahl gibt es nur feste Töne.

**Independent Test**: Einstellungen öffnen, "Tor für uns" → "Jubel", "Gegentor" → "Aus", neu laden, Werte stehen noch da.

**Acceptance Scenarios**:

1. **Given** ein Handy ohne gespeicherte Töne (neu oder vor diesem Update), **When** die Einstellungen geöffnet werden, **Then** zeigt der Abschnitt "TÖNE" die Zeilen "Spielzeitende", "Anpfiff", "Pausenpfiff", "Schlusspfiff", "Tor für uns", "Gegentor" mit den Vorbelegungen Pfiff, Langer Pfiff, Doppelpfiff, Pfiff, Torhupe, Raunen.
2. **Given** vor dem Update war als Signalton "Gong" gewählt, **Then** zeigt "Spielzeitende" "Gong"; die übrigen Zeilen haben die Vorbelegung.
3. **Given** die Zeile "Tor für uns", **When** sie getippt wird, **Then** öffnet ein Blatt mit allen Tönen (Name und eine Zeile Beschreibung) und "Aus"; der gewählte ist markiert. **When** ein Ton getippt wird, **Then** ist er gewählt, gespeichert und spielt sofort zur Probe.
4. **Given** "Aus" ist für "Gegentor" gewählt, **Then** zeigt die Zeile "Aus", und beim Gegentor spielt kein Ton.
5. **Given** die Zeile "Spielzeitende", **Then** bietet sie "Aus" nicht an (das Signal bei 00:00 ist Pflicht, Spec 001 FR-007).

---

### User Story 2 - Töne beim Tickern (Priority: P1)

Max' Vater tickert mit dem Trainer-Handy. Beim Anpfiff ertönt ein langer Pfiff, beim Tor für Feuerbach die Torhupe, beim Gegentor ein Raunen, zur Pause ein Doppelpfiff, am Ende der Schlusspfiff.

**Why this priority**: Kern des Wunsches; macht das Tickern lebendiger und bestätigt jede Eingabe hörbar.

**Independent Test**: Spiel anlegen, "Anpfiff", Tor Feuerbach, Tor Gegner, "Pausenpfiff", "Anpfiff 2. HZ", "Schlusspfiff"; jeweils spielt der gewählte Ton (im Test über die Abspielprotokollierung).

**Acceptance Scenarios**:

1. **Given** ein angelegtes Spiel, **When** "Anpfiff" getippt wird, **Then** spielt der Ton für "Anpfiff"; ebenso bei "Anpfiff 2. HZ" (jeder Wiederanpfiff) und bei "Spiel läuft schon" nicht (kein echter Anpfiff).
2. **Given** ein laufendes Spiel, **When** ein Tor für die eigene Mannschaft eingetragen wird, **Then** spielt der Ton für "Tor für uns" sofort beim Tippen auf den Tor-Knopf, bevor die Torschützen-Auswahl kommt.
3. **Given** ein laufendes Spiel, **When** ein Tor für den Gegner eingetragen wird, **Then** spielt der Ton für "Gegentor".
4. **Given** die Rückfrage "Pausenpfiff?" bzw. "Schlusspfiff?", **When** sie bestätigt wird, **Then** spielt der Ton für "Pausenpfiff" bzw. "Schlusspfiff"; beim Abbrechen nichts.
5. **Given** ein Tor wird mit "Rückgängig" zurückgenommen oder in "Spiel korrigieren" nachgetragen, **Then** spielt kein Ton.
6. **Given** ein Elfmeterschießen (Spec 017/021), **When** ein Treffer eingetragen wird, **Then** spielt der Ton für "Tor für uns" bzw. "Gegentor".
7. **Given** Eltern tickern über den Zuschauer-Link (Spec 024), **Then** gelten dieselben Töne nach der Wahl auf diesem Handy (Eltern-Ansicht, US3-S5).

---

### User Story 3 - Töne in der Eltern-Ansicht (Priority: P1)

Max' Oma hat den Link für Eltern offen und "Töne" eingeschaltet. Sie hört den Anpfiff, die Torhupe bei jedem Feuerbach-Tor, das Raunen beim Gegentor und den Schlusspfiff, ohne auf den Bildschirm zu schauen.

**Why this priority**: Zuschauer, die nicht am Platz sind, profitieren am meisten.

**Independent Test**: Eltern-Ansicht öffnen, "Töne" an, auf Handy T anpfeifen, Tor Feuerbach, Gegentor, Schlusspfiff; die Eltern-Ansicht spielt jeweils den passenden Ton.

**Acceptance Scenarios**:

1. **Given** die Eltern-Ansicht, **Then** steht unter der Statuszeile der Schalter "Töne" (ersetzt "Ton bei Toren", beim ersten Öffnen aus) und daneben "Töne wählen". **When** "Töne" eingeschaltet wird, **Then** spielt der Ton für "Tor für uns" einmal zur Probe.
2. **Given** "Ton bei Toren" war vor dem Update an, **Then** ist "Töne" an.
3. **Given** "Töne" ist an, **When** auf einer Karte ein Anpfiff, Pausenpfiff, Schlusspfiff, ein Tor für Feuerbach oder ein Gegentor eintrifft, **Then** spielt der jeweils gewählte Ton einmal (höchstens einmal je Meldung, wie FR-E25).
4. **Given** mehrere Ereignisse kommen mit einer Meldung (z. B. Tor und Schlusspfiff nach einer Funklücke), **Then** spielt nur der Ton des neuesten Ereignisses.
5. **Given** "Töne wählen", **Then** öffnet ein Blatt mit den Zeilen "Anpfiff", "Pausenpfiff", "Schlusspfiff", "Tor für uns", "Gegentor" wie in US1-S3; die Wahl gilt auf diesem Gerät (auch beim Tickern über den Zuschauer-Link).
6. **Given** das Dashboard in der App eines Trainer-Handys, **Then** gibt es weiter keine Töne und keinen Schalter (Spec 020 US3-S9).
7. **Given** "Töne" ist an und der Browser sperrt den Ton, **Then** gelten "Ton aus · tippen" und die Freischaltung wie bisher (Spec 020 FR-E26).

---

### Edge Cases

- **Aufnahme noch nicht geladen** (erster Start ohne Netz direkt nach dem Update): Der Ton fehlt einmal, die App stürzt nicht ab und zeigt keinen Fehler; ab dem nächsten Start ist er offline da.
- **Zwei Töne kurz nacheinander** (Tor in der letzten Sekunde, dann 00:00): Der neue Ton unterbricht den alten.
- **Spielzeitende und Schlusspfiff**: Bei 00:00 kommt das Spielzeitende-Signal, beim Tippen auf "Schlusspfiff" der Schlusspfiff-Ton. Beide sind gewollt.
- **Lautlos-Schalter, Lautstärketasten, Sperre nach dem Hintergrund, stille Tonspur**: gelten für alle Töne unverändert (Spec 001 FR-036, FR-039).
- **Unbekannter oder beschädigter gespeicherter Wert**: es gilt die Vorbelegung des Ereignisses.
- **Privates Surfen in der Eltern-Ansicht**: Auswahl und Schalter lassen sich bedienen, gelten bis zum Neuladen (wie Spec 020).
- **Sicherung** (Spec 001 FR-024): Töne sind Geräteeinstellungen und nicht Teil der Sicherung.

## Requirements *(mandatory)*

### Functional Requirements

Diese Anforderungen erweitern Spec 008 (FR-K01 bis FR-K05) und Spec 020 (FR-E25). Kanal, Freischaltung, Hinweis "Ton aus · tippen" und stille Tonspur bleiben unverändert.

- **FR-T01**: Die App MUSS diese Töne anbieten, in dieser Reihenfolge: Pfiff, Langer Pfiff, Doppelpfiff, Glocke, Gong, Torhupe, Jubel, Torhupe mit Jubel, Kinderjubel, Raunen. Pfiffe, Glocke und Gong werden im Browser erzeugt (wie Spec 008), Jubel, Torhupe und Raunen sind mitgelieferte Aufnahmen unter CC0, höchstens etwa 4 s lang.
- **FR-T02**: Die Aufnahmen MÜSSEN mit der App ausgeliefert und vom Service Worker für offline zwischengespeichert werden; sie DÜRFEN das Hauptbundle nicht vergrößern (erst bei Bedarf laden) und nicht von fremden Servern kommen (Constitution II).
- **FR-T03**: Die Einstellungen MÜSSEN den Abschnitt "TÖNE" mit sechs Zeilen zeigen: Spielzeitende, Anpfiff, Pausenpfiff, Schlusspfiff, Tor für uns, Gegentor. Jede Zeile nennt den gewählten Ton; Antippen öffnet die Auswahl (US1-S3). Alle Ereignisse außer Spielzeitende bieten zusätzlich "Aus".
- **FR-T04**: Vorbelegung: Spielzeitende Pfiff (bzw. der bisher gewählte Signalton), Anpfiff Langer Pfiff, Pausenpfiff Doppelpfiff, Schlusspfiff Pfiff, Tor für uns Torhupe, Gegentor Raunen. Fehlt ein Wert oder ist er unbekannt, MUSS die Vorbelegung gelten.
- **FR-T05**: Auf dem tickernden Handy MUSS beim Anpfiff (jedem Abschnitt), beim bestätigten Pausen- und Schlusspfiff und beim Eintragen eines Tors (auch im Elfmeterschießen) sofort der gewählte Ton spielen. Rückgängig, Korrekturen, "Spiel läuft schon" und Nachträge spielen keinen Ton.
- **FR-T06**: Die Eltern-Ansicht MUSS den Schalter "Ton bei Toren" durch "Töne" ersetzen (gleiche Vorgabe, gleiches Merken, gleiche Freischaltung) und "Töne wählen" mit den fünf Ereigniszeilen anbieten. Ein gespeichertes "Ton bei Toren: an" MUSS als "Töne: an" gelten.
- **FR-T07**: Bei eingeschalteten "Tönen" MUSS die Eltern-Ansicht je neuer Meldung höchstens einen Ton spielen, und zwar den des neuesten neuen Ereignisses (Anpfiff, Pausenpfiff, Schlusspfiff, Tor für uns, Gegentor) einer Karte. "Tor für uns" ist ein Tor der Feuerbach-Mannschaft der Karte.
- **FR-T08**: Ersetzt Spec 008 FR-K02 (Abschnitt "SIGNALTON") und FR-K04 Nachtrag (Eltern-Ansicht spielt bei Toren den Ton für "Tor für uns" bzw. "Gegentor"). "Ton testen" (FR-K05) spielt weiter den Ton für Spielzeitende; der Hinweis heißt "Spielzeitende: Pfiff, änderbar unter „Mehr“ → „Einstellungen“ → „Töne“."
- **FR-T09**: Die Quellen der Aufnahmen (Freesound-Nummer, Urheber, CC0) MÜSSEN in `public/sounds/QUELLEN.md` stehen.

### Key Entities

- **Settings.sounds**: `{ timeUp, kickoff, halftime, fulltime, goalOwn, goalOpp }`, je eine Ton-Kennung, alle außer `timeUp` auch `'aus'`. Ersetzt `Settings.signalSound` (übernommen als `timeUp`). Gerätelokal, nicht Teil der Sicherung.
- **Zuschauer-Einstellung "Töne"**: Schalter plus dieselben fünf Ereignis-Kennungen, gerätelokal.

## Hilfe *(mandatory)*

- **Geändert**: "Wie wähle ich den Signalton?" → "Wie wähle ich die Töne?" (sechs Ereignisse, "Aus", Vorbelegung, Quelle: 025 US1)
- **Geändert**: Eintrag zu Ton und Lautstärke im Spiel ("Ich höre den Pfiff nicht", Verweis auf "Töne", Quelle: 025 US2)
- **Geändert**: Eintrag zu Hinweisen bei Toren in der Eltern-Ansicht ("Töne" statt "Ton bei Toren", "Töne wählen", Anpfiff und Abpfiff, Quelle: 025 US3)
- **Geändert**: "Nachspielzeit" (Ton heißt dort "Spielzeitende-Ton", Quelle: 025 FR-T08)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-T01**: Am Spielfeldrand sind alle sechs Töne vom iPhone-Lautsprecher klar unterscheidbar (Prüfung durch Atti in Review C).
- **SC-T02**: Der Ton beim Tippen kommt ohne spürbare Verzögerung (unter 0,2 s nach dem Tippen, auch bei Aufnahmen nach dem ersten Laden).
- **SC-T03**: Das Hauptbundle bleibt unter 60 KB gzip; alle Aufnahmen zusammen höchstens 200 KB.
- **SC-T04**: Offline (Flugmodus nach einmaligem Laden) spielen alle Töne.

## Assumptions

- Die Aufnahmen stammen von Freesound unter CC0 (keine Namensnennung nötig, Nennung trotzdem in `QUELLEN.md`).
- Keine eigenen Töne für Karten, Wechsel oder Elfmeter-Fehlschuss (YAGNI); später leicht ergänzbar.
- Keine eigene Lautstärke je Ton; die Aufnahmen werden auf etwa gleiche Lautheit gebracht.
- Die Torschützen-Auswahl verzögert den Tor-Ton nicht; der Ton kommt beim Tippen auf den Tor-Knopf.
