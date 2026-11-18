# Feature Specification: Live einfacher für Trainer und Eltern (UX-Welle 1)

**Feature Branch**: `020-live-einfach` (Arbeitsbranch `claude/inspiring-cerf-74utlc`)

**Created**: 2026-11-17

**Status**: Entwurf. Entscheidungen von Atti vorab gesetzt (17.11.2026, Freigabe der Umsetzung nach dem Nutzertest), daher keine Clarify-Fragen; die Entscheidungen stehen unter "Clarifications". Mockup/Review B: auf Wunsch von Atti übersprungen, Prüfung in Review C über Screenshots. Umsetzung in zwei parallelen Paketen: Paket A (Trainer, US1 und US2) und Paket C (Zuschauer, US3 bis US5), siehe `plan.md` und `tasks.md`.

**Status Paket A (US1, US2)**: umgesetzt am 17.11.2026 (Arbeitszweig Paket A); Prüfung in Review C über Screenshots.

**Nachbesserung (18.11.2026)**: Vier P2-Befunde aus dem Design-Check, von Atti freigegeben: Spielmenü ohne Doppelung, ein Einstieg auf dem Startbildschirm, keine doppelte Warnung ohne Verbindung, Fußzeile ohne Wiederholung. Abschnitt "Nachbesserung Design-Check (2026-11-18)" unten (FR-E60 bis FR-E66).

**Nachbesserung Welle 2 (18.11.2026)**: Design-Restpunkte (Blatt "Eltern live zuschauen lassen", Schalter "Ton bei Toren", "Für Trainer") und Texte sind in Spec 022 (Paket E, FR-F30 bis FR-F35) umgesetzt; Stellen mit "geändert durch Spec 022".

**Selbstprüfung (17.11.2026)**: `/code-review` (8 Befunde behoben, Befund "angehaltene Uhr" entspricht FR-E30/US4-S3 und bleibt), `/security-review` ohne Befund, Design-Check (P1 "Ton aus · tippen" behoben, P2/P3 an Atti in Review C), Referenzbilder `dashboard-*` aus der CI übernommen. Gerätetest T043 am 18.11.2026 durch Atti am iPhone bestanden.

**Input**: Nutzertest vom 17.11.2026 mit fünf Personas (Trainer am Spielfeldrand, Turnier-Trainer, Oma als Zuschauerin, Elternteil im Büro, Nutzer mit VoiceOver) und Atti (17.11.2026): Umsetzung freigegeben, nur bei echter Unsicherheit fragen.

## Ausgangslage

Gesichtet am 17.11.2026 im Code und im Nutzertest:

- **Live ist versteckt (Trainer)**: Der Weg zum Link für die Eltern führt über "Mehr" → "Live-Spieltag" → "Live-Spieltag anlegen" → "Anlegen" → "Zuschauer-Link teilen" (Spec 006 US1). Im Spielmenü "…" erscheint etwas zu Live ("Live senden" bzw. "Nicht live senden") erst, wenn es einen Live-Spieltag gibt (Spec 006 FR-L09). Der Trainer am Spielfeldrand fand den Weg ohne Hilfe nicht.
- **Live-Seite überladen**: Die Übersicht "Live-Spieltag" (`src/ui/screens/live.tsx`) zeigt untereinander zwei Hauptknöpfe ("Zuschauer-Link teilen", "Trainer-Link teilen"), die Mannschaften mit "zuletzt gesendet", den Spielplan, "Dashboard ansehen", "VERWALTEN" mit "Titel ändern", "Alle Links neu ausstellen …", "Kopplung beenden …" und "Link einfügen". Ohne Live-Spieltag ist "Trainer-Link einfügen" der Hauptknopf (Spec 012 FR-S05). Begriffe wie "Kopplung" und "Zuschauer-Link" verstanden die Personas nicht.
- **Teilen im Spiel getrennt**: Im Spielmenü steht "Zwischenstand teilen" (Text, Spec 001 FR-042), nach dem Schlusspfiff unter der Uhr "Ergebnis teilen" (Spec 001 FR-011). Der Live-Link ist von dort nicht erreichbar.
- **Kein Hinweis bei Toren (Zuschauer)**: Ein neues Tor hebt die Karte nur einige Sekunden hervor, ohne Ton (Spec 006 FR-L15, US3-S3). Wer das Dashboard im Hintergrund offen hat (Elternteil im Büro), merkt nichts; VoiceOver sagt nichts an.
- **Status unklar (Zuschauer)**: Die Kopfzeile zeigt dauerhaft "Live · Stand 10:49 Uhr". Ein verstummtes Handy am Spielfeldrand zeigt die Karte nur als Funkloch-Symbol und aufgeklappt "Letzte Meldung vor 7 Min · Minute läuft weiter" (FR-L15, US3-S7). Die Oma las "Live" als Beweis, dass alles stimmt.
- **Eltern-Ansicht offen nach hinten**: Unten steht "Nur lesen. Die Stände kommen verschlüsselt von den Handys am Spielfeldrand. Tipp: Seite als Lesezeichen …" und der Link "Zum Torticker" (Spec 006, R-L6; Spec 010 FR-H16). Eine Persona tippte darauf und landete auf "Neues Spiel".

## Clarifications

### Session 2026-11-17 (Entscheidungen von Atti, ohne Rückfragen)

- Q: Wo startet "Eltern live zuschauen lassen"? → A: Als Knopf auf dem Startbildschirm (Spec 018) und als Eintrag im Spielmenü "…" (Spec 019).
- Q: Was passiert, wenn es schon einen Live-Spieltag gibt? → A: Das aktuelle Spiel wird live (falls es auf "Nicht live senden" stand) und sofort öffnet das Teilen des Links für die Eltern, auf demselben Weg wie heute "Zuschauer-Link teilen".
- Q: Und ohne Live-Spieltag? → A: Ein kompaktes Blatt mit zwei Wegen: Hauptknopf "Neu starten" (legt mit Standardtitel und passenden Mannschaften an und teilt direkt), Nebenweg "Ein anderer Trainer hat schon einen Link? Link einfügen" (bestehender Einfügen-Weg). Spec 012 FR-S05 ("Einfügen zuerst") bleibt gewahrt, indem das Blatt den Einfügen-Weg zuerst erklärt.
- Q: Welche Mannschaften nimmt "Neu starten"? → A: Die Mannschaft des aktuellen Spiels; ohne aktuelles Spiel bei genau einer eigenen Mannschaft diese, sonst alle eigenen Mannschaften, höchstens sechs (Spec 006 FR-L01).
- Q: Wird der Live-Spieltag erst mitten im Spiel angelegt? → A: Dann geht das laufende Spiel automatisch live.
- Ziel: Link für die Eltern in unter 30 Sekunden ohne Vorwissen, höchstens 2 Tipps bis zum Teilen-Menü.
- Q: Live-Seite? → A: Oben als einziger Hauptknopf "Link für Eltern teilen". Trainer-Link, Spielplan, Mannschaften, "Alle Links neu ausstellen", Beenden usw. stehen eingeklappt unter "Für Trainer". Navigationseintrag und Titel heißen "Live für Eltern" statt "Live-Spieltag". "Kopplung" verschwindet aus den sichtbaren Texten der Hauptansicht; in der eingeklappten Verwaltung heißt es "Live beenden" statt "Kopplung beenden".
- Q: Teilen im Spiel? → A: Ein gemeinsames "Teilen" mit zwei Wegen: "Live-Link für Eltern" und "Stand als Text". ~~Nach dem Schlusspfiff bleibt "Ergebnis teilen" als direkter Knopf, öffnet aber dasselbe Blatt mit "Stand als Text" als erster Möglichkeit.~~ (geändert durch die Präzisierung 2026-11-17 unten)
- Q: Hinweis bei Toren für Zuschauer? → A: Bei offener Seite: Tab-Titel "Tor! <Mannschaft> <Stand>", kurzes Vibrieren, wo das Gerät es kann, Ansage für Screenreader und ein Schalter "Ton bei Toren" (Standard aus, auf dem Gerät gemerkt, spielt den Signalton aus Spec 008). Web Push (Spec 007 US4) diese Saison nicht.
- Q: Status? → A: Je Karte in Klartext "gerade aktualisiert" bzw. "vor X Min aktualisiert", ab 5 Minuten ohne Meldung bei laufendem Spiel "Seit X Min keine Meldung vom Spielfeld". In der Halbzeitpause und nach Spielende keine Warnung. Die Kopfzeile nennt nur bei Verbindungsproblemen einen Hinweis, sonst "Aktualisiert sich automatisch". Ersetzt Spec 006 FR-L15 (Teil Status) und US3-S7.
- Q: Eltern-Ansicht? → A: Link "Zum Torticker" entfällt; der Weg für Eltern, die selbst trainieren, steht als Eintrag in der Eltern-Hilfe. Fußzeile nur noch "Aktualisiert sich von selbst."

### Präzisierung 2026-11-17 (Product Owner, vor der Umsetzung von Paket A)

- **"Ergebnis teilen" bleibt ein Tipp**: Nach dem Schlusspfiff teilt "Ergebnis teilen" unter der Uhr den Ergebnis-Text direkt wie bisher (Spec 001 FR-011, Spec 017 FR-C20), ohne Blatt. Das neue Blatt "Teilen" mit "Live-Link für Eltern" und "Stand als Text" ersetzt nur "Zwischenstand teilen" im Spielmenü während des Spiels (vom Anpfiff bis zum Schlusspfiff, auch in Pausen, wie bisher "Zwischenstand teilen"). Nach dem Schlusspfiff gibt es im Spielmenü kein "Teilen"; der Live-Link ist dort über "Eltern live zuschauen lassen" erreichbar. Geändert: US2 (Erzählung, Independent Test, S8 bis S10), FR-E18, FR-E19, Hilfe `ergebnis-teilen` (unverändert).
- **Mockup und Review B**: auf Wunsch von Atti übersprungen; Prüfung in Review C über Screenshots iPhone hell und dunkel.
- **Wegangaben in der App** (Paket A, zu FR-E12): Der Hinweis unter "Neues Spiel" bei neu ausgestelltem Live-Spieltag nennt "„Mehr“ → „Live für Eltern“", der Hinweis "Spielplan" ohne Trainer-Link "„Live für Eltern“ → „Für Trainer“"; Rückfrage "Alle Links neu ausstellen?" und die Hilfetexte unter "Für Trainer" sagen "Link für Eltern" statt "Zuschauer-Link".
- **Blatt nach "Neu starten"**: Hat das Teilen geklappt (oder wurde es abgebrochen), zeigt das Blatt "Fertig. „<Titel>“ ist live." und "Link für Eltern teilen" (zum erneuten Teilen); klappt es nicht, "Fertig. Jetzt den Link teilen." (FR-E08). In beiden Fällen folgt der Hinweis auf den Trainer-Link.

### Session 2026-11-17 (Präzisierungen beim Spezifizieren)

Festlegungen des Agenten, wo die Entscheidungen oben eine Lücke lassen. Sie folgen den Entscheidungen und dem bestehenden Verhalten; Atti kann sie in Review B ändern.

- **"Endstand"**: Die Karte eines beendeten Spiels zeigt wie bisher "Ende" bzw. "Ende n. V." oder "Ende i. E." (Spec 006 FR-L12); ohne Alter der Meldung und ohne Warnung. Die Phase "Halbzeit" bzw. "Pause" bleibt ebenso ohne Zusatz.
- **Begriff "Live-Spieltag"**: Nur Navigationseintrag und Seitentitel heißen "Live für Eltern". Für die Sache selbst bleibt "Live-Spieltag" (Formular "Live-Spieltag anlegen", Meldungen wie "gehört nicht zum Live-Spieltag", Hilfe-Thema "Live-Spieltag" nach Spec 010 FR-H08). Adressen (`#/live-spieltag`) und Testkennungen bleiben.
- **Mannschaft des Spiels fehlt im Live-Spieltag**: Auf einem Trainer-Handy (Trainer-Link) kommt sie bei "Eltern live zuschauen lassen" automatisch dazu, wie mit "Mannschaft hinzufügen" (Links bleiben gleich), solange es weniger als sechs sind. Sonst wird trotzdem geteilt, mit Hinweis.
- **"Eltern live zuschauen lassen" bleibt im Spielmenü**, auch neben dem neuen "Teilen" (US2): Nur so sind es im Spiel höchstens 2 Tipps bis zum Teilen-Menü ("…", dann "Eltern live zuschauen lassen").
- **"Für Trainer"** ist beim Start der App eingeklappt und bleibt aufgeklappt, solange die App läuft (z. B. beim Zurückkommen aus "Spielplan").
- **Ton, Vibration, Tab-Titel, Ansage**: Tab-Titel und Ansage in jedem Dashboard (Eltern-Ansicht und in der App); Vibration und "Ton bei Toren" nur in der Eltern-Ansicht, damit auf dem Trainer-Handy der Signalton dem eigenen Spiel vorbehalten bleibt (Spec 006 US4-S3).
- **Teilen nach "Neu starten"**: Lässt der Browser das Teilen-Menü nach dem Anlegen nicht mehr ohne neue Berührung zu, zeigt das Blatt "Link für Eltern teilen" als nächsten Tipp (research.md R-E1).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Eltern live zuschauen lassen mit einem Tipp (Priority: P1)

Bens Vater betreut heute die E2. Kurz nach dem Anpfiff fragt die Elterngruppe in WhatsApp, wie es steht. Auf dem Startbildschirm tippt er auf "Eltern live zuschauen lassen", im Spiel unter "…" auf "Teilen" und "Live-Link für Eltern" (geändert durch Nachbesserung 2026-11-18, FR-E60). Gibt es schon einen Live-Spieltag, öffnet sich sofort das Teilen-Menü mit dem Link; er wählt die Elterngruppe. Gibt es noch keinen, erklärt ein Blatt zuerst, dass er einen Link eines anderen Trainers einfügen kann, und bietet groß "Neu starten" an. Ein Tipp, und das Teilen-Menü öffnet sich mit dem Link; das laufende Spiel geht live.

**Why this priority**: Wichtigster Befund des Nutzertests: Ohne Vorwissen fand der Trainer am Spielfeldrand Live nicht. Ohne Link sehen die Eltern nichts.

**Independent Test**: Frisches Handy mit Mannschaft E2 und laufendem Spiel; im Spiel "…" → "Teilen" → "Live-Link für Eltern" → "Neu starten" (geändert durch Nachbesserung 2026-11-18); das Teilen-Menü enthält den Link für die Eltern, ein zweites Gerät mit diesem Link sieht das laufende Spiel. Danach erneut "Live-Link für Eltern": das Teilen-Menü öffnet sich direkt.

**Acceptance Scenarios**:

1. **Given** ein Handy mit eigener Mannschaft, **When** der Startbildschirm erscheint, **Then** steht nach "Neues Spiel" (und gegebenenfalls nach "Spiele verfolgen") der Knopf "Eltern live zuschauen lassen" mit der Unterzeile "Link für die Elterngruppe", mindestens 64 pt hoch, nicht als Hauptknopf.
2. **Given** ein Handy ohne eigene Mannschaft und ohne Live-Spieltag (z. B. Eltern, die nur einen Zuschauer-Link geöffnet haben), oder ein Live-Spieltag, der neu ausgestellt wurde (Spec 006 US5-S3), **Then** fehlt "Eltern live zuschauen lassen" auf dem Startbildschirm und "Live-Link für Eltern" im Blatt "Teilen" (geändert durch Nachbesserung 2026-11-18, FR-E60; bisher "im Spielmenü").
3. **Given** ein gekoppeltes Trainer-Handy (Live-Spieltag "Unser Spieltag"), **When** auf dem Startbildschirm "Eltern live zuschauen lassen" getippt wird, **Then** öffnet sich sofort das Teilen-Menü mit dem Text "Unser Spieltag live verfolgen: <Link für Eltern>" (wie "Zuschauer-Link teilen"); ohne Teilen-Menü wird der Link kopiert und "Link kopiert. Füge ihn in WhatsApp ein." angezeigt.
4. **Given** ein gekoppeltes Trainer-Handy und ein laufendes E2-Spiel, das auf "Nicht live senden" steht, **When** im Spiel "…" → "Teilen" → "Live-Link für Eltern" getippt wird (geändert durch Nachbesserung 2026-11-18, FR-E60; bisher "…" → "Eltern live zuschauen lassen"), **Then** öffnet sich das Teilen-Menü wie in Szenario 3, und das Spiel wird wieder gesendet (Kennzeichen "Live", erscheint auf dem Dashboard).
5. **Given** ein Handy mit den Mannschaften E1 und E2 ohne Live-Spieltag, **When** "Eltern live zuschauen lassen" getippt wird, **Then** erscheint das Blatt "Eltern live zuschauen lassen" (im Spiel auch über "Teilen" → "Live-Link für Eltern"): zuerst "Ein anderer Trainer hat schon einen Link?" mit "Link einfügen", darunter der Hinweis, mit welchen Mannschaften neu gestartet wird ("Neu mit E1 und E2."), der Hauptknopf "Neu starten" und ein Satz, welche Daten das Handy dann verlassen. (Geändert durch Spec 022 FR-F30: Hauptknopf "Live-Spieltag anlegen", Hinweis "Mit E1 und E2.".)
6. **Given** das Blatt aus Szenario 5, geöffnet aus einem laufenden E2-Spiel, **When** "Neu starten" getippt wird, **Then** legt die App den Live-Spieltag "Unser Spieltag" nur mit E2 an, das Handy ist Trainer-Handy, das Teilen-Menü öffnet sich mit dem Link für die Eltern, und das laufende Spiel erscheint mit Stand und Minute auf dem Dashboard (ohne weiteren Tipp).
7. **Given** das Blatt aus Szenario 5 auf dem Startbildschirm ohne offenes Spiel, **When** "Neu starten" getippt wird, **Then** enthält der Live-Spieltag alle eigenen Mannschaften (hier E1 und E2), bei genau einer Mannschaft nur diese, bei mehr als sechs die ersten sechs aus "Meine Mannschaften".
8. **Given** das Blatt aus Szenario 5 und ein Trainer-Link in der Zwischenablage, **When** "Link einfügen" getippt wird, **Then** folgt der bestehende Einfügen-Weg (Spec 012 FR-S02, FR-S03: Kopplungsfrage ohne Einfügefeld); nach "Ja, live senden" zeigt das Blatt "Gekoppelt mit „Unser Spieltag“." und den Hauptknopf "Link für Eltern teilen".
9. **Given** ein Trainer-Handy, dessen Live-Spieltag E1 und E2 umfasst, und ein laufendes E3-Spiel, **When** "Eltern live zuschauen lassen" bzw. im Spiel "Teilen" → "Live-Link für Eltern" getippt wird (geändert durch Nachbesserung 2026-11-18), **Then** kommt E3 zum Live-Spieltag dazu (Links bleiben gleich), das Teilen-Menü öffnet sich, das Spiel geht live und der Hinweis "E3 ist jetzt dabei." erscheint. Hat der Live-Spieltag schon sechs Mannschaften, öffnet sich das Teilen-Menü trotzdem, mit dem Hinweis "E3 gehört nicht zum Live-Spieltag. Eltern sehen dieses Spiel nicht."
10. **Given** "Neu starten" wurde getippt, aber der Browser öffnet das Teilen-Menü nicht ohne neue Berührung, **Then** zeigt das Blatt "Fertig. Jetzt den Link teilen." und den Hauptknopf "Link für Eltern teilen", der das Teilen-Menü öffnet.
11. **Given** ein Handy mit eigener Mannschaft ohne Live-Spieltag und ohne Zuschauer-Link (Startbildschirm), **Then** steht dort der Knopf "Eltern live zuschauen lassen" und die Karte "Trainer? Füge den Link aus der Trainergruppe ein." fehlt; "Link einfügen" ist im Blatt "Eltern live zuschauen lassen" erreichbar (Nachbesserung 2026-11-18, FR-E62). Die Karte bleibt auf einem Handy ohne eigene Mannschaft (Knopf verborgen, z. B. Co-Trainer oder Vertretung auf neuem Handy) und bei neu ausgestelltem Live-Spieltag (mit dem Satz zum Neu-Ausstellen).
12. **Given** das Blatt "Eltern live zuschauen lassen" bzw. die Karte "Trainer? …" und ein Zwischenablage-Inhalt, **When** "Link einfügen" getippt wird, **Then** erkennen beide Wege dieselben Arten und behandeln sie gleich (Nachbesserung 2026-11-18, FR-E63): Trainer- und Lead-Link führen zur Kopplungsfrage, ein Zuschauer-Link öffnet das Dashboard ohne zu koppeln, eine Kader-Liste ("Kader teilen", Spec 016) öffnet die Vorschau unter "Kader"; sonst erscheint das Einfügefeld mit Hinweis.

---

### User Story 2 - Live-Seite aufgeräumt, ein gemeinsames Teilen (Priority: P2)

Leos Mutter tickert zum ersten Mal und öffnet "Mehr" → "Live für Eltern". Oben steht nur ein großer Knopf "Link für Eltern teilen"; alles für Trainer ist unter "Für Trainer" eingeklappt. Im Spiel findet sie unter "…" ein "Teilen" (dort auch der Weg zum Link für Eltern, siehe Nachbesserung 2026-11-18) mit zwei Wegen: "Live-Link für Eltern" und "Stand als Text". Nach dem Schlusspfiff tippt sie wie gewohnt auf "Ergebnis teilen", und das Teilen-Menü öffnet sich direkt mit dem Ergebnis (Präzisierung 2026-11-17).

**Why this priority**: Weniger Fehlbedienung und weniger Fachwörter; baut auf US1 auf, ist aber ohne US1 nutzbar (die Seite und das Teilen im Spiel funktionieren für sich).

**Independent Test**: Trainer-Handy mit Live-Spieltag; "Mehr" → "Live für Eltern": genau ein Hauptknopf, "Für Trainer" eingeklappt, kein "Kopplung" sichtbar. Im laufenden Spiel "…" → "Teilen" → "Stand als Text" teilt den Zwischenstand; nach dem Schlusspfiff teilt "Ergebnis teilen" direkt wie bisher.

**Acceptance Scenarios**:

1. **Given** die Seite "Mehr", **Then** heißt der Eintrag "Live für Eltern" mit der Unterzeile "Eltern zuschauen lassen, Trainer-Link, Spielplan"; ein Tipp öffnet die Seite mit dem Titel "Live für Eltern".
2. **Given** ein Trainer-Handy mit Live-Spieltag "Unser Spieltag", **When** "Live für Eltern" öffnet, **Then** stehen oben der Titel "Unser Spieltag", der Satz "Eltern sehen Stand, Minute und Tore live, ohne App. Der Link gilt die ganze Saison.", als einziger Hauptknopf "Link für Eltern teilen" (teilt wie bisher "Zuschauer-Link teilen") und darunter "Dashboard ansehen"; darunter der eingeklappte Bereich "Für Trainer".
3. **Given** die Seite aus Szenario 2, **When** "Für Trainer" getippt wird, **Then** klappt der Bereich auf und zeigt in dieser Reihenfolge: "Trainer-Link teilen" (mit "Kader mit den Trainern teilen?" wie Spec 016 FR-B02), "MANNSCHAFTEN" mit "zuletzt gesendet", "Mannschaft hinzufügen" und "Entfernen", "SPIELPLAN", "VERWALTEN" mit "Titel ändern", "Alle Links neu ausstellen …" und "Live beenden …", zuletzt "Link einfügen". Ein weiterer Tipp klappt ihn zu.
4. **Given** "Für Trainer" ist aufgeklappt, **When** der Nutzer "Spielplan" öffnet und zurückkommt, **Then** ist "Für Trainer" noch aufgeklappt; nach einem Neustart der App ist es wieder eingeklappt.
5. **Given** die Seite aus Szenario 2 eingeklappt, **Then** kommen in den sichtbaren Texten die Wörter "Kopplung" und "Zuschauer-Link" nicht vor, und es gibt genau einen Hauptknopf.
6. **Given** "Für Trainer" ist offen, **When** "Live beenden …" getippt wird, **Then** fragt die App "Live beenden?" mit "Dieses Handy sendet dann nichts mehr an „Unser Spieltag“. Die Spiele bleiben auf dem Handy." und "Beenden"; danach erscheint "Live beendet. Dieses Handy sendet nichts mehr." (Verhalten wie Spec 006 US5-S2).
7. **Given** ein Handy ohne Live-Spieltag, **When** "Live für Eltern" öffnet, **Then** stehen oben ein Satz, was Eltern sehen, der einzige Hauptknopf "Link für Eltern teilen" (öffnet das Blatt aus US1-S5) und die Karte "WAS DAS HANDY VERLÄSST"; eingeklappt unter "Für Trainer" folgen "Trainer-Link einfügen" und darunter "Live-Spieltag anlegen" (Titel und Mannschaften selbst wählen) mit dem Hinweis "Nur einmal für alle Mannschaften. Gibt es schon einen, füge den Trainer-Link ein."
8. **Given** ein laufendes Spiel (auch in der Pause), **When** im Spielmenü "…" getippt wird, **Then** steht oben "Teilen" (geändert durch Nachbesserung 2026-11-18, FR-E60; bisher davor "Eltern live zuschauen lassen" aus US1); "Zwischenstand teilen" gibt es nicht mehr. Vor dem Anpfiff und nach dem Schlusspfiff gibt es kein "Teilen" (Präzisierung 2026-11-17). **When** "Teilen" getippt wird, **Then** erscheint das Blatt "Teilen" mit "Live-Link für Eltern" (Unterzeile "Eltern sehen Stand und Minute live") und darunter "Stand als Text" (Unterzeile "Zwischenstand für WhatsApp").
9. **Given** das Blatt "Teilen" aus Szenario 8, **When** "Stand als Text" getippt wird, **Then** öffnet sich das Teilen-Menü mit dem Zwischenstand-Text wie bisher (Spec 001 FR-042, Spec 005 US4); **When** stattdessen "Live-Link für Eltern" getippt wird, **Then** verhält sich die App wie "Eltern live zuschauen lassen" (US1-S3 bis US1-S10).
10. **Given** ein beendetes Spiel, **When** unter der Uhr "Ergebnis teilen" getippt wird, **Then** öffnet sich das Teilen-Menü direkt mit dem Ergebnis-Text wie bisher, ohne Blatt, und das Spiel merkt sich das Teilen (Spec 001 FR-011, Spec 017 FR-C20; Präzisierung 2026-11-17).
11. **Given** ein beendetes, schon geteiltes Spiel wird korrigiert, **When** im Band "Korrigiert. Ergebnis neu teilen?" "Teilen" getippt wird, **Then** öffnet sich das Teilen-Menü direkt mit dem Ergebnis-Text, ohne das Blatt (Spec 017 FR-C22 unverändert); ebenso "Ergebnis teilen" in den Spieldetails.
12. **Given** ein Handy ohne eigene Mannschaft und ohne Live-Spieltag, **When** "Live für Eltern" öffnet, **Then** steht statt "Link für Eltern teilen" der Satz "Lege zuerst deine Mannschaft in den Einstellungen an. Hast du einen Trainer-Link, füge ihn unter „Für Trainer“ ein." und als einziger Hauptknopf "Zu den Einstellungen", der die Einstellungen öffnet; "Für Trainer" bleibt wie in Szenario 7 (FR-E15, Präzisierung nach Code-Review 2026-11-17).
13. **Given** ein laufendes Spiel auf einem Handy mit eigener Mannschaft, **When** das Spielmenü "…" öffnet, **Then** gibt es den Eintrag "Eltern live zuschauen lassen" nicht mehr; der Weg zum Link für Eltern ist "Teilen" → "Live-Link für Eltern" mit vollem Verhalten von US1-S3 bis US1-S10 (Blatt "Eltern live zuschauen lassen" ohne Live-Spieltag, Live-Schalter, Mannschaft hinzufügen, sofort melden). Vor dem Anpfiff und nach dem Schlusspfiff steht kein "Teilen" im Menü; vor dem Anpfiff bleibt der Weg über den Startbildschirm (Nachbesserung 2026-11-18, FR-E60).
14. **Given** ein laufendes Spiel eines Handys, das für die Mannschaft live sendet, **When** das Spielmenü öffnet, **Then** steht "Nicht live senden" (bzw. "Live senden") als letzter Eintrag des Menüs vor "Schließen"; "Nicht live senden" ist in der Farbe `rot-text` gestaltet wie "Live beenden …" (Klasse `live__action--danger`, Nachbesserung 2026-11-18, FR-E61).
15. **Given** ein laufendes Spiel auf einem iPhone SE (375 × 667 pt) mit Live-Spieltag, **When** das Spielmenü öffnet, **Then** ist "Schließen" ohne Scrollen im Blatt sichtbar (Nachbesserung 2026-11-18, FR-E61).

---

### User Story 3 - Tor merken bei offener Seite (Priority: P1)

**Status**: umgesetzt in Paket C (17.11.2026), Review C offen.

Max' Oma hat den Link für Eltern auf dem Tablet offen, die Tante im Büro in einem Tab neben ihrer Arbeit. Fällt ein Tor, zeigt der Tab "Tor! Feuerbach E1 3:1", das Android-Handy vibriert kurz, und wer "Ton bei Toren" eingeschaltet hat, hört den Signalton. VoiceOver sagt "Tor für Feuerbach E1, 3 zu 1, Tom".

**Why this priority**: Zuschauer verpassen Tore, weil die Seite nur kurz hervorhebt. Push-Benachrichtigungen kommen diese Saison nicht; das hier wirkt sofort und ohne Dienst.

**Independent Test**: Zuschauer-Link auf einem zweiten Gerät öffnen, dann auf dem Trainer-Handy ein Tor erfassen: Tab-Titel, Ansage-Bereich und (mit Schalter an) Ton ändern sich; beim ersten Laden und nach dem Entfernen eines Tores bleibt alles still.

**Acceptance Scenarios**:

1. **Given** die Eltern-Ansicht ist offen und E1 führt 2:1, **When** Feuerbach E1 das 3:1 erzielt, **Then** lautet der Titel des Browser-Tabs "Tor! Feuerbach E1 3:1" (Mannschaft, die getroffen hat, Stand Heim:Gast wie auf der Karte).
2. **Given** der Tab-Titel aus Szenario 1 und die Seite war im Hintergrund, **When** die Seite wieder sichtbar wird oder das Fenster den Fokus bekommt, **Then** steht wieder der vorige Titel; bleibt die Seite im Vordergrund, steht der vorige Titel spätestens 30 Sekunden nach dem Tor wieder da. Ein weiteres Tor ersetzt den Titel und startet die 30 Sekunden neu.
3. **Given** die Eltern-Ansicht, **When** ein Tor fällt, **Then** sagt ein Screenreader höflich (ohne zu unterbrechen) "Tor für Feuerbach E1, 3 zu 1, Tom" an; ist kein Torschütze übertragen, entfällt der Name ("Tor für TSV Musterstadt, 3 zu 2"), bei einem Eigentor heißt es "Eigentor".
4. **Given** die Eltern-Ansicht auf einem Gerät, das Vibration kann (z. B. Android), **When** ein Tor fällt, **Then** vibriert es einmal kurz (etwa 0,2 Sekunden); auf Geräten ohne Vibration (iPhone) passiert dabei nichts.
5. **Given** die Eltern-Ansicht, **Then** steht unter der Statuszeile der Schalter "Ton bei Toren", beim ersten Öffnen aus. **When** er eingeschaltet wird, **Then** spielt der gewählte Signalton einmal zur Probe (Spec 008, Vorgabe Pfiff), und bei jedem weiteren Tor spielt er einmal.
6. **Given** "Ton bei Toren" ist an, **When** die Seite neu geladen oder später wieder geöffnet wird, **Then** ist der Schalter weiter an; solange der Browser den Ton noch sperrt, steht daneben "Ton aus · tippen", und die nächste Berührung der Seite schaltet ihn frei.
7. **Given** die Eltern-Ansicht wird geöffnet und die Spiele haben schon Tore, oder sie holt nach einer Verbindungslücke Meldungen nach, die älter als 1 Minute sind, **Then** gibt es keinen Tab-Titel, keine Ansage, kein Vibrieren und keinen Ton.
8. **Given** ein Tor wird auf dem Trainer-Handy korrigiert (Minute, Torschütze) oder entfernt, **Then** gibt es keinen Hinweis; der Stand auf der Karte ändert sich wie bisher.
9. **Given** das Dashboard in der App eines Trainer-Handys ("Spiele verfolgen", "Dashboard ansehen"), **When** ein Tor fällt, **Then** ändern sich Tab-Titel und Ansage wie in Szenario 1 und 3, es gibt aber weder Vibration noch Ton und keinen Schalter "Ton bei Toren".
10. **Given** die Eltern-Ansicht war schon einmal offen (gemerkter Stand 2:1) und ist zu, **When** E1 das 3:1 erzielt und die Seite kurz danach (innerhalb 1 Minute) wieder geöffnet wird, **Then** zeigt die Karte 3:1, aber es gibt keinen Tab-Titel, keine Ansage, kein Vibrieren und keinen Ton; erst ein Tor, das bei offener Seite fällt, meldet sich wie in Szenario 1 (FR-E21, Präzisierung nach Code-Review 2026-11-17).
11. **Given** die Eltern-Ansicht mit offener Hilfe ("Hilfe" in der Eltern-Leiste), **When** ein Tor fällt, **Then** sagt ein Screenreader es wie in Szenario 3 an, und der Tab-Titel ändert sich wie in Szenario 1 (FR-E23, Präzisierung nach Code-Review 2026-11-17).
12. **Given** "Ton bei Toren" ist an und daneben steht "Ton aus · tippen", **When** die Seite berührt wird, **Then** verschwindet der Hinweis sofort, ohne auf die nächste Aktualisierung der Seite zu warten (FR-E26).
13. **Given** "Ton bei Toren" ist an und daneben steht "Ton aus · tippen", **When** der Schalter getippt wird, **Then** bleibt er an, der Ton ist frei und der Hinweis verschwindet; beim nächsten Tor spielt der Signalton. **When** stattdessen "Ton aus · tippen" getippt wird (ein Knopf, mindestens 44 pt hoch), **Then** ebenso (FR-E26).

---

### User Story 4 - Ehrlicher Live-Status je Spiel (Priority: P1)

**Status**: umgesetzt in Paket C (17.11.2026), Review C offen.

Pauls Opa sieht auf der Karte von E1 "37' · vor 1 Min aktualisiert" und weiß, dass der Stand frisch ist. Als der Akku am Spielfeld leer ist, steht nach fünf Minuten "Seit 5 Min keine Meldung vom Spielfeld"; er wartet, statt den Stand für den Endstand zu halten. Oben steht nur "Aktualisiert sich automatisch", nicht mehr dauernd "Live · Stand 10:49 Uhr".

**Why this priority**: Falsches Vertrauen in einen veralteten Stand war der zweite große Befund bei den Zuschauern. Die Warnung muss ohne Aufklappen und ohne Symbolkenntnis verständlich sein.

**Independent Test**: Dashboard mit laufendem E1-Spiel; Uhr des Testbrowsers vorstellen: erst "gerade aktualisiert", dann "vor 3 Min aktualisiert", ab 5 Minuten "Seit 5 Min keine Meldung vom Spielfeld"; in der Halbzeit nichts davon.

**Acceptance Scenarios**:

1. **Given** ein laufendes Spiel, dessen letzte Meldung (auch Lebenszeichen) weniger als 1 Minute alt ist, **Then** zeigt die zugeklappte Karte in der Phasenzeile nach der Minute "gerade aktualisiert" (z. B. "37' · gerade aktualisiert").
2. **Given** die letzte Meldung ist 1 bis 4 Minuten alt, **Then** steht dort "vor <n> Min aktualisiert" (z. B. "vor 3 Min aktualisiert"); der Text ändert sich ohne Neuladen.
3. **Given** ein laufendes Spiel (Minute läuft, Uhr angehalten oder Elfmeterschießen) ohne Meldung seit 7 Minuten, **Then** zeigt die zugeklappte Karte hervorgehoben mit Funkloch-Symbol "Seit 7 Min keine Meldung vom Spielfeld"; die Minute läuft weiter. "Letzte Meldung vor 7 Min" gibt es nicht mehr, auch nicht aufgeklappt.
4. **Given** ein Spiel in der Halbzeitpause bzw. Pause oder vor der Verlängerung, seit 12 Minuten ohne Meldung, **Then** zeigt die Karte nur die Phase ("Halbzeit", "Pause", "Verlängerung") ohne Alter und ohne Warnung.
5. **Given** ein beendetes Spiel, ein noch nicht angepfiffenes Spiel oder ein Planspiel, **Then** zeigt die Karte ihre Phase wie bisher ("Ende", "noch nicht angepfiffen", Anstoß) ohne Alter und ohne Warnung.
6. **Given** das Dashboard ist verbunden, **Then** steht oben "Aktualisiert sich automatisch" ohne roten Punkt und ohne Uhrzeit; beim Verbinden "Verbinde …".
7. **Given** das Gerät des Zuschauers verliert die Verbindung, **Then** zeigt die Kopfzeile hervorgehoben "Keine Verbindung · Stand von 10:42 Uhr. Aktualisiert sich von selbst." (wie bisher, Spec 006 US3-S6); kommt die Verbindung zurück, steht wieder "Aktualisiert sich automatisch".
8. **Given** das Gerät des Zuschauers hat keine Verbindung (die Kopfzeile zeigt "Keine Verbindung · Stand von …") und ein laufendes Spiel ohne Meldung seit 7 Minuten, **Then** zeigen die Karten weder "Seit 7 Min keine Meldung vom Spielfeld" noch das Funkloch-Symbol noch ein Alter; die Kopfzeile genügt. **When** die Verbindung zurückkommt, **Then** gelten Alter und Warnung wieder wie in S1 bis S3 (Nachbesserung 2026-11-18, FR-E64; ändert S3).

---

### User Story 5 - Eltern-Ansicht ohne Ausgang in die Trainer-App (Priority: P2)

**Status**: umgesetzt in Paket C (17.11.2026), Review C offen.

Toms Mutter scrollt in der Eltern-Ansicht nach unten. Dort steht nur noch "Aktualisiert sich von selbst."; einen Link in den Torticker, der sie auf "Neues Spiel" führt, gibt es nicht mehr. Ihr Mann, der selbst die F-Jugend trainiert, findet in der Hilfe der Eltern-Ansicht "Ich trainiere selbst. Wo finde ich den Torticker?" und kommt mit "Torticker öffnen" zum Startbildschirm.

**Why this priority**: Verirrte Eltern auf "Neues Spiel" erzeugen Fragen und im schlimmsten Fall Spiele auf dem falschen Handy; für die wenigen Eltern, die selbst trainieren, reicht der Weg über die Hilfe.

**Independent Test**: Zuschauer-Link öffnen: unten kein Link "Zum Torticker", Fußzeile "Aktualisiert sich von selbst."; in der Eltern-Hilfe der neue Eintrag mit "Torticker öffnen", der den Startbildschirm öffnet.

**Acceptance Scenarios**:

1. **Given** die Eltern-Ansicht mit Spielen, **Then** stehen in der Fußzeile nur "Tippe auf ein Spiel für Tore und Details." und "Aktualisiert sich von selbst." (geändert durch Nachbesserung 2026-11-18, FR-E65: nur der erste Satz); den Link "Zum Torticker" und den Absatz "Nur lesen. …" gibt es nicht mehr.
2. **Given** die Eltern-Ansicht ohne Spiel heute, **Then** steht in der Fußzeile nur "Aktualisiert sich von selbst."
3. **Given** die Eltern-Hilfe (Leiste "Hilfe"), **Then** enthält sie den Eintrag "Ich trainiere selbst. Wo finde ich den Torticker?"; **When** er geöffnet wird, **Then** zeigt er als einziger Eintrag der Eltern-Hilfe einen Knopf: "Torticker öffnen".
4. **Given** der Eintrag aus Szenario 3, **When** "Torticker öffnen" getippt wird, **Then** erscheint der Startbildschirm mit "Neues Spiel", ohne zurück zum Dashboard umzuleiten, und die Seite nennt wieder das Manifest der App (wie bisher "Zum Torticker", Spec 006 R-L6, FR-L16).
5. **Given** das Dashboard in der App eines Trainer-Handys, **Then** ist die Fußzeile unverändert ("Tippe auf ein Spiel für Tore und Details.", ohne den Eltern-Satz).
6. **Given** ein Trainer-Handy, dessen Live-Spieltag auf einem anderen Handy neu ausgestellt wurde, **When** das Dashboard in der App den Hinweis zeigt, **Then** lautet er "„Unser Spieltag“ wurde neu ausgestellt. Füge den neuen Trainer-Link aus eurer Trainergruppe ein (Mehr → Live für Eltern → Für Trainer)."; ein Handy ohne Live-Spieltag zeigt unter `#/live-spieltag/dashboard` "Noch kein Live-Spieltag auf diesem Handy." und den Knopf "Zu „Live für Eltern“".
7. **Given** das Dashboard mit mindestens einer Karte (Eltern-Ansicht und App), **Then** steht in der Fußzeile nur "Tippe auf ein Spiel für Tore und Details."; "Aktualisiert sich von selbst." steht dort nur, wenn keine Spiele angezeigt werden; die Kopfzeile sagt "Aktualisiert sich automatisch" bzw. den Verbindungshinweis (Nachbesserung 2026-11-18, FR-E65; ändert S1).

---

### Edge Cases

- **Startbildschirm mit offenem Spiel einer Mannschaft außerhalb des Live-Spieltags** (z. B. D1, Live-Spieltag mit sechs Mannschaften): Teilen öffnet trotzdem; der Hinweis aus US1-S9 erklärt, dass Eltern dieses Spiel nicht sehen.
- **Lead-Handy der ersten Version** (ohne Trainer-Link, Spec 006): Es kann den Link für Eltern teilen, aber keine Mannschaft hinzufügen; fehlt die Mannschaft, gilt der Hinweis aus US1-S9.
- **"Neu starten" ohne Netz**: Anlegen und Teilen funktionieren (Schlüssel entstehen auf dem Handy); die Eltern sehen Stand und Konfiguration, sobald das Handy Netz hat (Spec 006 FR-L07).
- **"Neu starten" zweimal schnell getippt**: Es entsteht genau ein Live-Spieltag (Knopf bis zum Ende gesperrt).
- **Zwei Trainer starten unabhängig neu**: Es entstehen zwei Live-Spieltage. Das Blatt nennt deshalb den Einfügen-Weg zuerst; einer der beiden fügt später den Trainer-Link des anderen ein (Rückfrage zum Ersetzen wie Spec 006 FR-L04).
- **Spiel vor dem Anpfiff**: "Eltern live zuschauen lassen" funktioniert; das Spiel erscheint als "noch nicht angepfiffen" (Spec 006 US2-S8).
- **Beendetes Spiel**: "Eltern live zuschauen lassen" teilt nur den Link; ein beendetes Spiel, das auf "Nicht live senden" steht, bleibt so (es wird nicht nachträglich gesendet).
- **Teilen abgebrochen**: keine Meldung; bestehen bleibt, was der Tipp bewusst ausgelöst hat: der Live-Schalter des Spiels, gegebenenfalls die neue Mannschaft bzw. der mit "Neu starten" angelegte Live-Spieltag. Ein erneuter Tipp teilt nur noch.
- **Mehrere Tore in einer Meldung oder in mehreren Spielen gleichzeitig**: ein Tab-Titel (das zuletzt gemeldete Tor), eine Ansage je Tor in der Reihenfolge der Karten, ein Ton und eine Vibration je Meldung.
- **Wiederhergestelltes Tor** (Spec 001, Trainer nimmt das Entfernen zurück): zählt wie ein neues Tor, weil die Toranzahl steigt (gleiche Regel wie die Hervorhebung, Spec 006 US3-S3).
- **Elfmeterschießen**: Einzelne Schüsse sind keine Tore; es gibt keinen Torhinweis. Der Status "vor X Min aktualisiert" gilt dagegen wie bei laufender Minute.
- **Uhr angehalten** (z. B. Verletzung): zählt als laufendes Spiel; nach 5 Minuten ohne Meldung erscheint die Warnung, denn das Trainer-Handy sendet auch dann alle 3 Minuten ein Lebenszeichen (Spec 006 R-L3).
- **Seite im Hintergrund auf dem iPhone**: Safari hält die Seite an; Titel, Ansage und Ton kommen erst beim Zurückkehren nicht mehr (die Meldungen sind dann älter als 1 Minute). Das ist hingenommen; Web Push ist diese Saison nicht geplant.
- **Installierte Eltern-Ansicht** (Home-Bildschirm): Es gibt keinen sichtbaren Tab-Titel; Ansage, Vibration und Ton wirken trotzdem.
- **Ton gesperrt nach Rückkehr** (iOS sperrt nach dem Hintergrund): "Ton aus · tippen" wie im Spielbildschirm (Spec 001 FR-036); eine Berührung schaltet frei.
- **Privates Surfen**: Der Schalter "Ton bei Toren" lässt sich bedienen, wird aber nicht gemerkt (gilt bis zum Neuladen).
- **Sehr lange Mannschaftsnamen im Tab-Titel**: Der Titel wird nicht gekürzt; der Browser schneidet selbst ab.

## Requirements *(mandatory)*

### Functional Requirements

**Eltern live zuschauen lassen (US1, Paket A)**

- **FR-E01**: Der Startbildschirm MUSS den Knopf "Eltern live zuschauen lassen" mit der Unterzeile "Link für die Elterngruppe" zeigen, gestaltet wie "Spiele verfolgen" (kein Hauptknopf, mindestens 64 pt hoch). Reihenfolge (ergänzt Spec 018 FR-001): "Heute tickerst du", "Spiel fortsetzen", "Neues Spiel", "<Mannschaft> übernehmen", "Spiele verfolgen", "Eltern live zuschauen lassen", darunter die Karte "Trainer? …" (Spec 012 FR-S01), diese nur noch nach FR-E62 (geändert durch Nachbesserung 2026-11-18).
- **FR-E02**: ~~Das Spielmenü "…" MUSS in jedem Zustand des Spiels als ersten Eintrag "Eltern live zuschauen lassen" zeigen.~~ Entfällt, geändert durch Nachbesserung 2026-11-18, FR-E60: Der Eintrag steht nicht mehr im Spielmenü.
- **FR-E03**: "Eltern live zuschauen lassen" MUSS sichtbar sein, wenn das Handy mindestens eine eigene Mannschaft hat oder mit einem nicht neu ausgestellten Live-Spieltag gekoppelt ist; es MUSS fehlen, wenn der Live-Spieltag neu ausgestellt wurde (Spec 006 US5-S3) oder das Handy weder Mannschaften noch einen Live-Spieltag hat.
- **FR-E04**: Mit Live-Spieltag MUSS ein Tipp sofort das Teilen-Menü mit dem Link für die Eltern öffnen, mit demselben Text und Ausweichweg wie "Zuschauer-Link teilen" (Spec 006 FR-L02: "<Titel> live verfolgen: <Link>", ohne Teilen-Menü in die Zwischenablage mit "Link kopiert. Füge ihn in WhatsApp ein."). Ist das aktuelle Spiel (im Spiel dieses Spiel, auf dem Startbildschirm das Spiel hinter "Spiel fortsetzen") nicht beendet und auf "Nicht live senden" gestellt, MUSS es zugleich wieder live gesendet werden (wie "Live senden", Spec 006 FR-L09).
- **FR-E05**: Gehört die Mannschaft des aktuellen Spiels nicht zum Live-Spieltag, MUSS ein Trainer-Handy (mit Trainer-Link) sie dabei hinzufügen wie "Mannschaft hinzufügen" (Spec 006 FR-L19, Links bleiben gleich), solange der Live-Spieltag weniger als sechs Mannschaften hat, und "<Kurzform> ist jetzt dabei." melden. Sonst (sechs Mannschaften oder Lead-Handy ohne Trainer-Link) MUSS trotzdem geteilt und "<Kurzform> gehört nicht zum Live-Spieltag. Eltern sehen dieses Spiel nicht." gemeldet werden.
- **FR-E06**: Ohne Live-Spieltag MUSS ein Tipp das Blatt "Eltern live zuschauen lassen" öffnen, in dieser Reihenfolge: ein Satz, was Eltern sehen ("Eltern sehen Stand, Minute und Tore live, ohne App."), "Ein anderer Trainer hat schon einen Link?" mit dem Zweitknopf "Link einfügen", der Hinweis mit den Mannschaften ("Neu mit E1 und E2."), der Hauptknopf "Neu starten" und der Satz "Dann gehen Mannschaften, Spielstand und Tore mit Vornamen verschlüsselt an den Dienst des Vereins. Kader, Karten und Lesezeichen bleiben auf dem Handy." Alle Knöpfe mindestens 64 pt hoch. Das Öffnen des Blatts DARF keine Verbindung aufbauen; Daten verlassen das Handy erst nach "Neu starten" bzw. der Kopplung (Constitution II). (Geändert durch Spec 022 FR-F30: Hauptknopf "Live-Spieltag anlegen" statt "Neu starten", Hinweis "Mit E1 und E2." statt "Neu mit E1 und E2.".)
- **FR-E07**: "Neu starten" MUSS einen Live-Spieltag mit dem Titel "Unser Spieltag" (Spec 006 FR-L01) anlegen, und zwar mit (1) der eigenen Mannschaft des aktuellen, nicht beendeten Spiels, sofern sie unter "Meine Mannschaften" steht, sonst (2) der einzigen eigenen Mannschaft, sonst (3) allen eigenen Mannschaften in der Reihenfolge von "Meine Mannschaften", höchstens sechs. Das Handy ist danach Trainer-Handy wie nach "Anlegen" (Spec 006 US1-S1). Der Knopf MUSS bis zum Ende gesperrt sein.
- **FR-E08**: Nach "Neu starten" MUSS sich ohne weiteren Tipp das Teilen-Menü wie in FR-E04 öffnen. Lässt der Browser das nicht zu, MUSS das Blatt "Fertig. Jetzt den Link teilen." mit dem Hauptknopf "Link für Eltern teilen" zeigen. In beiden Fällen nennt das Blatt danach "Den Trainer-Link für die anderen Trainer findest du unter „Mehr“ → „Live für Eltern“ → „Für Trainer“." (Geändert durch Spec 022 FR-F31: Statt des Satzes mit dem Weg zum Trainer-Link steht im Fertig-Zustand nach dem Anlegen der Zweitknopf "Trainer-Link teilen".)
- **FR-E09**: Wird der Live-Spieltag während eines nicht beendeten Spiels angelegt (FR-E07) oder per Link gekoppelt (FR-E10), MUSS dieses Spiel sofort live gesendet werden, mit allem, was bis dahin erfasst ist (Spec 006 FR-L06, FR-L10). Bereits beendete Spiele werden dadurch nicht nachträglich gesendet.
- **FR-E10**: "Link einfügen" im Blatt MUSS den bestehenden Einfügen-Weg des Startbildschirms nutzen (Spec 012 FR-S02, FR-S03, Spec 016 FR-B15, FR-B16). Nach erfolgreicher Kopplung MUSS das Blatt "Gekoppelt mit „<Titel>“." und den Hauptknopf "Link für Eltern teilen" zeigen; das aktuelle Spiel verhält sich wie in FR-E04 und FR-E09.
- **FR-E11**: Ergebnisse des Teilens MÜSSEN im Spiel im Meldeband erscheinen (Spec 019 FR-A04), auf dem Startbildschirm und im Blatt als kurze Statuszeile ("Link kopiert. Füge ihn in WhatsApp ein.", "Teilen hat nicht geklappt."); Abbrechen zeigt nichts.

**Live für Eltern und gemeinsames Teilen (US2, Paket A)**

- **FR-E12**: Der Eintrag unter "Mehr" MUSS "Live für Eltern" heißen, Unterzeile "Eltern zuschauen lassen, Trainer-Link, Spielplan"; die Seite MUSS den Titel "Live für Eltern" tragen (das Formular weiter "Live-Spieltag anlegen"). Adresse `#/live-spieltag` und Testkennungen bleiben.
- **FR-E13**: Mit Live-Spieltag (Trainer-Handy) MUSS die Seite oben zeigen: Titel des Live-Spieltags, "Eltern sehen Stand, Minute und Tore live, ohne App. Der Link gilt die ganze Saison.", als einzigen Hauptknopf der Seite "Link für Eltern teilen" (teilt wie FR-E04, ohne den Live-Schalter eines Spiels zu ändern) und darunter "Dashboard ansehen". Der Hinweis "Neue Links ausgestellt" (Spec 006 US5) steht, wenn er gilt, darüber, mit dem Satz "Die alten Links zeigen nichts Neues mehr. Schick jetzt beide neuen Links: den Link für Eltern an die Elterngruppe, den Trainer-Link an eure Trainergruppe."
- **FR-E14**: Darunter MUSS der Bereich "Für Trainer" eingeklappt stehen (Kopfzeile als Knopf, mindestens 64 pt hoch, mit Aufklapp-Zustand für Screenreader). Aufgeklappt enthält er in dieser Reihenfolge: Karte "TRAINER" mit "Trainer-Link teilen" (Zweitknopf, Spec 016 FR-B02 unverändert), "MANNSCHAFTEN" (Spec 006 US5), "SPIELPLAN" (Spec 015 US1), "VERWALTEN" mit "Titel ändern", "Alle Links neu ausstellen …" und "Live beenden …", dann "Link einfügen". Der Bereich MUSS nach dem Start der App eingeklappt sein und aufgeklappt bleiben, solange die App läuft, bis er zugeklappt wird. (Geändert durch Spec 022 FR-F34, FR-F35: aufgeklappt eine zusammenhängende Fläche; "Link einfügen" steht in der Karte "TRAINER" unter "Trainer-Link teilen" und nicht mehr am Ende des Bereichs.)
- **FR-E15**: Ohne Live-Spieltag MUSS die Seite zeigen: gegebenenfalls "Dashboard „<Titel>“ ansehen" (gemerkter Zuschauer-Link, wie bisher), "Eltern sehen eure Spiele live: Stand, Minute und Tore, ohne App und ohne Konto.", den einzigen Hauptknopf "Link für Eltern teilen" (öffnet das Blatt aus FR-E06), die Karte "WAS DAS HANDY VERLÄSST" (unverändert) und eingeklappt "Für Trainer" mit "Trainer-Link einfügen", darunter "Live-Spieltag anlegen" und dem Hinweis "Nur einmal für alle Mannschaften. Gibt es schon einen, füge den Trainer-Link ein." (ändert Spec 012 FR-S05, die Reihenfolge Einfügen vor Anlegen bleibt). Hat das Handy weder eigene Mannschaften noch einen Live-Spieltag (wie FR-E03), MUSS statt "Link für Eltern teilen" der Satz "Lege zuerst deine Mannschaft in den Einstellungen an. Hast du einen Trainer-Link, füge ihn unter „Für Trainer“ ein." mit dem einzigen Hauptknopf "Zu den Einstellungen" stehen (Präzisierung nach Code-Review 2026-11-17).
- **FR-E16**: Ein Lead-Handy der ersten Version (ohne Trainer-Link) MUSS oben "Link für Eltern teilen" als Hauptknopf, die Karte "DIESES HANDY SENDET LIVE" und "Dashboard ansehen" zeigen, unter "Für Trainer" "Link einfügen" und "Live beenden …". Ein neu ausgestelltes Handy (Spec 006 US5-S3) bleibt wie bisher, nur mit "Live beenden …".
- **FR-E17**: Außerhalb von "Für Trainer" DÜRFEN die sichtbaren Texte der Seite die Wörter "Kopplung" und "Zuschauer-Link" nicht enthalten. "Kopplung beenden …" MUSS "Live beenden …" heißen; Rückfrage "Live beenden?" mit "Dieses Handy sendet dann nichts mehr an „<Titel>“. Die Spiele bleiben auf dem Handy." und "Beenden"; Meldung danach "Live beendet. Dieses Handy sendet nichts mehr." Das Verhalten bleibt Spec 006 FR-L20.
- **FR-E18**: Im Spielmenü "…" MUSS "Zwischenstand teilen" durch "Teilen" ersetzt werden (seit Nachbesserung 2026-11-18, FR-E60 als erster Eintrag; bisher direkt unter "Eltern live zuschauen lassen"), sichtbar wie bisher "Zwischenstand teilen" vom ersten Anpfiff bis zum Schlusspfiff (Uhr läuft, angehalten oder Pause; Präzisierung 2026-11-17). "Teilen" öffnet das Blatt "Teilen" mit zwei großen Knöpfen (mindestens 64 pt hoch): oben "Live-Link für Eltern" (Unterzeile "Eltern sehen Stand und Minute live", Verhalten wie FR-E04 bis FR-E10), darunter "Stand als Text" (Unterzeile "Zwischenstand für WhatsApp"), der den Zwischenstand teilt (Spec 001 FR-042, Spec 005 US4).
- **FR-E19**: "Ergebnis teilen" unter der Uhr (Spec 019 FR-A20) MUSS bleiben und wie bisher mit einem Tipp den Ergebnis-Text teilen (Spec 001 FR-011) und sich das Teilen merken (Spec 017 FR-C20), ohne Blatt (Präzisierung 2026-11-17). Ebenso direkt teilen weiter: "Teilen" im Band "Korrigiert. Ergebnis neu teilen?" (Spec 017 FR-C22) und "Ergebnis teilen" in den Spieldetails (Spec 001 FR-038).

**Torhinweis bei offener Seite (US3, Paket C)**

- **FR-E21**: Als neues Tor MUSS gelten, wenn die Toranzahl eines Spiels durch eine Meldung steigt, die beim Empfang höchstens 1 Minute alt ist (gleiche Regel wie die Hervorhebung, Spec 006 US3-S3). Kein neues Tor: erstes Laden (alles, was der Dienst beim Öffnen der Seite nachliefert, auch ein Tor, das kurz vor dem Öffnen fiel und im auf dem Gerät gemerkten Stand noch fehlt), nachgeholte ältere Meldungen, Korrektur (Minute, Torschütze), Entfernen, Schüsse im Elfmeterschießen.
- **FR-E22**: Bei einem neuen Tor MUSS das Dashboard den Seitentitel auf "Tor! <Mannschaft> <Stand>" setzen (Mannschaft, die getroffen hat, wie auf der Karte; Stand Heim:Gast, z. B. "Tor! Feuerbach E1 3:1") und den vorigen Titel wiederherstellen, sobald die Seite nach dem Tor wieder sichtbar wird oder das Fenster den Fokus bekommt, spätestens 30 Sekunden nach dem Tor. Ein weiteres Tor ersetzt den Titel und startet die Frist neu.
- **FR-E23**: Bei einem neuen Tor MUSS das Dashboard über einen höflichen Ansagebereich (Screenreader, unterbricht nicht) ansagen: "Tor für <Mannschaft>, <Heim> zu <Gast>" und, wenn übertragen, ", <Torschütze>" bzw. ", Eigentor" (Elfmeter und Vorlage werden nicht angesagt). Mehrere neue Tore werden nacheinander in der Reihenfolge der Karten angesagt. Die Ansage gilt auch, während in der Eltern-Ansicht die Hilfe offen ist (das Dashboard bleibt dabei verbunden, Spec 010).
- **FR-E24**: In der Eltern-Ansicht MUSS ein neues Tor das Gerät einmal kurz vibrieren lassen (etwa 0,2 Sekunden), wo der Browser Vibration anbietet; sonst geschieht nichts. Höchstens eine Vibration je Meldung.
- **FR-E25**: Die Eltern-Ansicht MUSS unter der Statuszeile den Schalter "Ton bei Toren" zeigen (Zeile mindestens 64 pt hoch, als Schalter für Screenreader erkennbar), Vorgabe aus. Sein Zustand MUSS auf dem Gerät gemerkt werden (ohne Konto, ohne Dienst). Einschalten MUSS den gewählten Signalton (Spec 008 FR-K01, FR-K03) einmal zur Probe spielen und damit den Ton freischalten; ist er an, spielt bei jedem neuen Tor der Signalton einmal (höchstens einmal je Meldung). (Geändert durch Spec 022 FR-F32, FR-F33: Der Schalter ist im Zustand "an" in Vereinsrot (`rot-tief`) gefüllt, ohne Animation bei `prefers-reduced-motion`.)
- **FR-E26**: Ist "Ton bei Toren" an, der Ton aber gesperrt (nach dem Neuladen oder nach Rückkehr aus dem Hintergrund), MUSS neben dem Schalter "Ton aus · tippen" stehen; jede Berührung der Eltern-Ansicht MUSS den Ton freischalten (wie Spec 001 FR-036). Sobald der Ton frei ist, MUSS der Hinweis sofort verschwinden (Präzisierung nach Code-Review 2026-11-17). "Ton aus · tippen" MUSS selbst ein Knopf sein (mindestens 44 pt hoch), der den Ton freischaltet. Ein Tipp auf den Schalter "Ton bei Toren" MUSS bei gesperrtem Ton nur freischalten und den Schalter an lassen (keine Probe); erst ein weiterer Tipp schaltet ihn aus (Präzisierung nach Design-Check 2026-11-17; Spec 001 FR-036 bleibt unverändert).
- **FR-E27**: Das Dashboard in der App (Spec 006 FR-L17) MUSS Titel und Ansage zeigen (FR-E22, FR-E23), DARF aber weder vibrieren noch einen Ton spielen und zeigt keinen Schalter "Ton bei Toren".
- **FR-E28**: Der Torhinweis DARF keine zusätzliche Verbindung und keinen Dienst nutzen (Netzwerk-Wächter, Constitution II); Web Push (Spec 007 US4) ist nicht Teil dieser Spec.

**Ehrlicher Live-Status (US4, Paket C)**

- **FR-E30**: Die Karte eines laufenden Spiels (Minute läuft, Uhr angehalten, Elfmeterschießen) MUSS in der Phasenzeile nach der Phase, getrennt durch " · ", das Alter der letzten Meldung vom Spielfeld zeigen (Lebenszeichen zählen mit, Spec 006 R-L3): unter 1 Minute "gerade aktualisiert", 1 bis 4 Minuten "vor <n> Min aktualisiert". Der Text folgt der Zeit ohne Neuladen.
- **FR-E31**: Ab 5 Minuten ohne Meldung (und solange das Gerät des Zuschauers verbunden ist, geändert durch Nachbesserung 2026-11-18, FR-E64) MUSS die Karte eines laufenden Spiels statt des Alters hervorgehoben "Seit <n> Min keine Meldung vom Spielfeld" mit dem Funkloch-Symbol zeigen, zugeklappt sichtbar; die Minute läuft weiter (FR-L13). Ersetzt "Letzte Meldung vor <n> Min" auf der Karte und den Hinweis im aufgeklappten Teil (Spec 006 FR-L15, US3-S7).
- **FR-E32**: In der Halbzeitpause bzw. Pause, vor der Verlängerung, vor dem Anpfiff, nach dem Schlusspfiff und bei Planspielen DARF die Karte weder Alter noch Warnung zeigen; die Phase bleibt wie in Spec 006 FR-L12.
- **FR-E33**: Die Statuszeile oben MUSS bei bestehender Verbindung "Aktualisiert sich automatisch" zeigen (ohne roten Punkt, ohne Uhrzeit), beim Verbinden "Verbinde …" und ohne Verbindung hervorgehoben "Keine Verbindung · Stand von <Uhrzeit>. Aktualisiert sich von selbst." (wie bisher). Gilt in der Eltern-Ansicht und in der App.
- **FR-E34**: Warnung und Alter MÜSSEN als Text lesbar sein; das Funkloch-Symbol ist daneben nur Schmuck (für Screenreader verborgen).

**Eltern-Ansicht abgeschlossen (US5, Paket C)**

- **FR-E40**: Die Fußzeile der Eltern-Ansicht MUSS "Aktualisiert sich von selbst." zeigen, bei Karten davor wie bisher "Tippe auf ein Spiel für Tore und Details."; der Absatz "Nur lesen. Die Stände kommen verschlüsselt … gilt die ganze Saison." und der Link "Zum Torticker" MÜSSEN entfallen (ändert Spec 006 R-L6 und Spec 010 FR-H16). Die Fußzeile in der App bleibt. Geändert durch Nachbesserung 2026-11-18, FR-E65: "Aktualisiert sich von selbst." steht dort nur noch ohne angezeigte Spiele.
- **FR-E41**: Die Eltern-Hilfe MUSS den Eintrag "Ich trainiere selbst. Wo finde ich den Torticker?" enthalten, mit dem Knopf "Torticker öffnen", der den Startbildschirm öffnet; er ist der einzige Eintrag mit Knopf in der Eltern-Hilfe (Ausnahme zu Spec 010 FR-H10). Der Startbildschirm verhält sich dabei wie bisher nach "Zum Torticker": keine Umleitung zum Dashboard, Manifest der App (Spec 006 R-L6, FR-L16).
- **FR-E42**: Die Texte des Dashboards in der App MÜSSEN die neuen Namen nennen: Hinweis bei neu ausgestelltem Live-Spieltag "„<Titel>“ wurde neu ausgestellt. Füge den neuen Trainer-Link aus eurer Trainergruppe ein (Mehr → Live für Eltern → Für Trainer)."; ohne Live-Spieltag "Noch kein Live-Spieltag auf diesem Handy." mit dem Knopf "Zu „Live für Eltern“". Angleichung an US2 (FR-E12); in US5, weil nur Paket C `live-dashboard.tsx` ändert.

**Nachbesserung Design-Check (2026-11-18)**

Anlass: Design-Check zu Spec 020, vier P2-Befunde; Atti hat die Umsetzung mit den unten genannten Entscheidungen freigegeben. Verhalten und Wortlaut nur, soweit hier genannt; alles andere bleibt. Spec 012 FR-S01 (Karte "Trainer? …"), Spec 016 FR-B13 und FR-B15 (Link einfügen, Kader-Liste), Spec 018 FR-001 (Reihenfolge Startbildschirm), Spec 019 (Spielmenü, "Teilen" im Spiel) und Spec 006 FR-L09 (Platz von "Nicht live senden") sind mit Nachträgen versehen.

- **FR-E60** (Spielmenü ohne Doppelung): Das Spielmenü "…" DARF den Eintrag "Eltern live zuschauen lassen" nicht mehr zeigen. Der Weg zum Link für Eltern im Spiel ist "Teilen" (FR-E18) → "Live-Link für Eltern" und übernimmt das Verhalten vollständig: ohne Live-Spieltag öffnet er das Blatt "Eltern live zuschauen lassen" (FR-E06 bis FR-E10), mit Live-Spieltag teilt er sofort (FR-E04) und schaltet ein Spiel auf "Nicht live senden" wieder live, fügt die Mannschaft des Spiels hinzu und meldet das Spiel sofort (FR-E05, FR-E09). "Teilen" bleibt vom Anpfiff bis zum Schlusspfiff im Menü und steht dort als erster Eintrag; vor dem Anpfiff und danach gibt es im Menü keinen Weg zum Link für Eltern, vor dem Anpfiff bleibt der Startbildschirm (FR-E01). "Ergebnis teilen" (FR-E19) bleibt unverändert.
- **FR-E61** ("Nicht live senden" am Ende, SE): "Nicht live senden" bzw. "Live senden" MUSS der letzte Eintrag des Spielmenüs sein (nach "Spieldetails", vor "Schließen"). "Nicht live senden" MUSS wie "Live beenden …" gestaltet sein (Schriftfarbe `rot-text`, Klasse `live__action--danger` bzw. dieselbe Farbregel, nur vorhandene Tokens); "Live senden" bleibt neutral. Auf dem iPhone SE (375 × 667 pt) MUSS "Schließen" im Spielmenü auch im längsten Zustand (laufendes Spiel mit Live-Spieltag, Uhr korrigierbar) ohne Scrollen im Blatt sichtbar sein; die Einträge behalten ihre Höhe (mindestens 48 pt wie bisher).
- **FR-E62** (ein Einstieg): Die Karte "Trainer? Füge den Link aus der Trainergruppe ein." (`start-trainer-card`) MUSS entfallen, solange der Knopf "Eltern live zuschauen lassen" (FR-E03) sichtbar ist; "Link einfügen" ist dann im Blatt aus FR-E06 erreichbar. Die Karte MUSS bleiben, wenn der Knopf verborgen ist (ohne eigene Mannschaft und ohne Live-Spieltag: Co-Trainer oder Vertretung auf neuem Handy) und immer bei neu ausgestelltem Live-Spieltag (mit dem Satz zum Neu-Ausstellen, Spec 012 FR-S01). Gekoppelte Handys zeigen sie wie bisher nicht.
- **FR-E63** (gleiche Link-Arten): Karte und Blatt MÜSSEN dieselbe Auswertung der Zwischenablage nutzen (`StartCouple`, Spec 012 FR-S02, FR-S03, Spec 016 FR-B15): Trainer-Link und Lead-Link führen zur Kopplungsfrage (Spec 006 FR-L03, mit "Geteilte Kader kommen automatisch mit." nach Spec 016), ein Zuschauer-Link öffnet das Dashboard ohne Kopplung, eine Kader-Liste aus "Kader teilen" (Trainer-Paket, Spec 016) öffnet die Vorschau unter "Kader", sonst erscheint das Einfügefeld mit Hinweis (ungültiger bzw. alter Link, nichts Brauchbares). Nach erfolgreicher Kopplung im Blatt gilt FR-E10.
- **FR-E64** (offline eine Warnung): Solange das Gerät des Zuschauers keine Verbindung hat (Kopfzeile "Keine Verbindung · Stand von <Uhrzeit>. Aktualisiert sich von selbst."), DÜRFEN die Karten weder das Alter ("gerade aktualisiert", "vor <n> Min aktualisiert") noch "Seit <n> Min keine Meldung vom Spielfeld" mit Funkloch-Symbol zeigen; die Kopfzeile genügt, denn ohne eigene Verbindung sagt die Karte nichts über das Spielfeld. Beim Verbinden ("Verbinde …") und nach der Wiederverbindung gelten FR-E30 bis FR-E32 wieder. Die Minute des Spiels läuft weiter (FR-L13); "<Mannschaft> übernehmen" (Spec 018) bleibt unberührt.
- **FR-E65** (Kopf- und Fußzeile): Die Kopfzeile bleibt "Aktualisiert sich automatisch" bzw. der Verbindungshinweis (FR-E33). Die Fußzeile MUSS bei mindestens einer angezeigten Karte nur "Tippe auf ein Spiel für Tore und Details." zeigen; "Aktualisiert sich von selbst." MUSS dort nur stehen, wenn keine Spiele angezeigt werden (Eltern-Ansicht, ohne Karten). In der App gilt dasselbe für den ersten Satz; ohne Karten ist die Fußzeile der App wie bisher leer (FR-E40).
- **FR-E66** (Hilfe): Die Hilfe-Einträge MÜSSEN die neuen Wege nennen (siehe Tabelle "Hilfe", Zeilen "Nachbesserung"); Bezeichnungen wörtlich wie in der App (Constitution IX).

**Unverändert**

- **FR-E50**: Unverändert bleiben: Erfassen und Senden (Spec 006 US2), das Dashboard-Protokoll und die gespeicherten Daten, die Hervorhebung neuer Tore, "Spiele verfolgen" und "Spiel übernehmen" (Spec 018, auch die Unterzeile "letzte Meldung vor <n> Min" bei "<Mannschaft> übernehmen", FR-004), die Kopplungsfrage (Spec 006 FR-L03), die Eltern-Leiste "Spieltag", "Teilen", "Hilfe" (Spec 010 FR-H16, FR-H17) und "Live senden"/"Nicht live senden" im Spielmenü (Spec 006 FR-L09, nur der Platz am Ende des Menüs und die Gestaltung ändern sich, FR-E61).

### Key Entities

- **Ton bei Toren**: Einstellung je Gerät und Browser (an/aus), nur in der Eltern-Ansicht, nicht in der Sicherung, nicht übertragen.
- **Torhinweis**: abgeleitet, nicht gespeichert: Mannschaft, Stand Heim:Gast, gegebenenfalls Torschütze bzw. Eigentor eines neuen Tores.
- **Aktualität einer Karte**: abgeleitet aus der Serverzeit der letzten Meldung des Spiels und der Phase.
- Keine Änderung an Live-Spieltag, Live-Stand, Meldungsformat oder Dienst.

## Hilfe *(mandatory)*

Einträge in `src/domain/help-entries.ts`; Bezeichnungen wörtlich wie in der App. Paket A legt die Einträge zu US1 und US2 an bzw. ändert sie, Paket C die zu US3 bis US5 (tasks.md).

| Eintrag | Änderung | Quelle |
|---|---|---|
| neu `eltern-zuschauen` "Wie lasse ich Eltern live zuschauen?" (Thema Live-Spieltag, steht vor `live-anlegen`) | Startbildschirm oder im Spiel "…": "Eltern live zuschauen lassen". Gibt es einen Live-Spieltag, öffnet sich gleich das Teilen-Menü, und das Spiel geht live. Sonst "Neu starten" (mit der Mannschaft des Spiels bzw. deinen Mannschaften) oder, wenn ein anderer Trainer schon einen Link hat, "Link einfügen". Ohne eigene Mannschaft diese zuerst in den Einstellungen anlegen. Knopf "Live für Eltern öffnen" | 020 US1 |
| `eltern-zuschauen` (Nachbesserung 2026-11-18) | geändert: Startbildschirm "Eltern live zuschauen lassen"; im Spiel (vom Anpfiff bis zum Schlusspfiff) „…“ → „Teilen“ → „Live-Link für Eltern“; „Link einfügen“ im Blatt | 020 US1, 020 US2 |
| `live-anlegen` "Wie richte ich einen Live-Spieltag ein?" | geändert: schnellster Weg "Eltern live zuschauen lassen" → "Neu starten"; Titel und Mannschaften selbst wählen unter "Mehr" → "Live für Eltern" → "Für Trainer" → "Live-Spieltag anlegen"; "Link für Eltern teilen" statt "Zuschauer-Link"; Knopf "Live für Eltern öffnen" | 006 US1, 012 US1, 016 US1, 020 US1 |
| `live-senden` "Woran sehe ich, dass mein Spiel live gesendet wird?" | geändert: ergänzt "„Eltern live zuschauen lassen“ schaltet ein Spiel, das auf „Nicht live senden“ steht, wieder ein." Nachbesserung 2026-11-18: im Spiel „Teilen“ → „Live-Link für Eltern“ statt „Eltern live zuschauen lassen“; „Nicht live senden“ steht ganz unten im Menü | 006 US2, 020 US1 |
| `zwischenstand` "Wie teile ich den Zwischenstand während des Spiels?" | geändert: "…" → "Teilen" → "Stand als Text"; "Live-Link für Eltern" im selben Blatt | 005 US4, 020 US2 |
| `ergebnis-teilen` "Wie teile ich das Ergebnis in WhatsApp?" | unverändert ("Ergebnis teilen" bleibt ein Tipp, Präzisierung 2026-11-17) | 001 US4, 005 US1, 005 US5, 017 US3 |
| `trainer-link`, `kader-liste`, `selbst-trainieren` (Nachbesserung 2026-11-18) | geändert: „Link einfügen“ steht mit eigener Mannschaft im Blatt „Eltern live zuschauen lassen“ (Startbildschirm), ohne eigene Mannschaft auf der Karte „Trainer? …“ | 016 US4, 020 US1, 020 US5 |
| `keine-verbindung`, `keine-meldung` (Nachbesserung 2026-11-18) | geändert: ohne eigene Verbindung zeigen die Karten keine Warnung, die Kopfzeile genügt | 020 US4 |
| `kopplung-beenden` "Wie höre ich auf, live zu senden?" | geändert: "„Mehr“ → „Live für Eltern“ → „Für Trainer“ → „Live beenden …“"; Knopf "Live für Eltern öffnen" | 006 US5, 020 US2 |
| `navigation` "Wo finde ich was?" | geändert: "Mehr" für "Kader, Einstellungen, Live für Eltern und diese Hilfe" | 001 FR-037, 011 US3, 018 US1, 020 US2 |
| `trainer-kader`, `spiele-verfolgen`, `live-verwalten`, `spielplan`, `spiel-vormerken`, `spielplan-liste`, `spielplan-fehlt`, `links-neu`, `trainer-link` | geändert: Wege "„Mehr“ und „Live-Spieltag“" werden zu "„Mehr“, „Live für Eltern“ und „Für Trainer“" (auch in den Schritten); Knopf "Live-Spieltag öffnen" wird "Live für Eltern öffnen"; Quellen unverändert | wie bisher |
| neu `tor-hinweis` "Merke ich, wenn ein Tor fällt?" (für Eltern, Thema Live-Spieltag) | Bei offener Seite: Tab-Titel "Tor! …", kurzes Vibrieren (nicht auf dem iPhone), Ansage für VoiceOver; Schalter "Ton bei Toren" (aus, bis du ihn einschaltest; "Ton aus · tippen" heißt: darauf, auf den Schalter oder irgendwo auf die Seite tippen, der Schalter bleibt an). Ist die Seite zu, gibt es keine Benachrichtigung | 020 US3 |
| neu `keine-meldung` "Was bedeutet „keine Meldung vom Spielfeld“?" (für Eltern) | "vor 2 Min aktualisiert" zeigt, wie frisch der Stand ist. "Seit 7 Min keine Meldung vom Spielfeld": Das Handy am Spielfeld hat nichts gesendet (Funkloch, Akku, App zu); die Minute läuft weiter, der Stand kann veraltet sein. In der Halbzeit und nach dem Spiel gibt es keine Warnung | 020 US4 |
| `keine-verbindung` "Was bedeutet „Keine Verbindung“?" | geändert: ergänzt "Sonst steht oben „Aktualisiert sich automatisch“." | 006 US3, 020 US4 |
| `eltern-dashboard` "Wie verfolge ich die Spiele als Elternteil?" | geändert: ergänzt "Unter jedem laufenden Spiel steht, wann es zuletzt aktualisiert wurde." | 006 US3, 012 US5, 015 US3, 015 US7, 007 US3, 020 US4 |
| neu `selbst-trainieren` "Ich trainiere selbst. Wo finde ich den Torticker?" (für Eltern, Thema Live-Spieltag) | "Torticker öffnen" führt zum Startbildschirm; dort "Neues Spiel" oder "Link einfügen" für den Trainer-Link. Für den Spielfeldrand den Torticker von dort auf den Home-Bildschirm legen. Verwandt nur mit Eltern-Einträgen (`eltern-home`), wie Spec 010 verlangt | 020 US5 |

Kein Eintrag entfällt. Die Eltern-Hilfe hat danach neun Einträge (bisher sechs, Spec 010 US2-S7).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-E01**: Ein Trainer ohne Vorwissen hat den Link für Eltern in unter 30 Sekunden im Teilen-Menü: vom Startbildschirm mit höchstens 2 Tipps (1 mit Live-Spieltag, 2 ohne), im Spiel mit Live-Spieltag mit 3 Tipps ("…", "Teilen", "Live-Link für Eltern"), ohne Live-Spieltag mit 4 (geändert durch Nachbesserung 2026-11-18, FR-E60; bisher 2 bzw. 3).
- **SC-E02**: "Live für Eltern" hat in jedem Zustand genau einen Hauptknopf; außerhalb von "Für Trainer" kommen "Kopplung" und "Zuschauer-Link" nicht vor (automatisch geprüft).
- **SC-E03**: Jedes neue Tor bei offener Eltern-Ansicht ändert Tab-Titel und Ansage spätestens 1 Sekunde nach dem Empfang; beim ersten Laden, bei Korrektur und beim Entfernen gibt es keinen Hinweis (automatisch geprüft).
- **SC-E04**: Ab 5 Minuten ohne Meldung zeigt jede Karte eines laufenden Spiels die Warnung in Klartext, zugeklappt; in Pausen und nach dem Spiel nie.
- **SC-E05**: Die Eltern-Ansicht enthält keinen Link in die Trainer-App; ihr einziger Weg dorthin ist der Hilfe-Eintrag aus FR-E41.
- **SC-E06**: Keine neue Laufzeit-Abhängigkeit, keine neue Verbindung (Netzwerk-Wächter), Hauptbundle weiter unter 60 KB gzip.
- **SC-E07**: axe-core ohne Verstöße auf Startbildschirm, Spielmenü, "Live für Eltern", Blättern "Eltern live zuschauen lassen" und "Teilen" sowie Dashboard; Kontrastmatrix beider Themes grün; die Referenzbilder des Dashboards sind aus dem CI-Lauf erneuert.
- **SC-E08**: Ein Design-Check der geänderten Bildschirme ergibt keinen P0- oder P1-Befund.
- **SC-E09** (Nachbesserung 2026-11-18): Im Spielmenü kommt kein Weg doppelt vor, auf dem Startbildschirm führt genau ein Knopf zum Einfügen eines Links (mit eigener Mannschaft), ohne Verbindung steht genau eine Warnung auf dem Dashboard, und die Fußzeile wiederholt die Kopfzeile nicht (automatisch geprüft).

## Assumptions

- Grundlage ist der Nutzertest vom 17.11.2026; Atti hat die Entscheidungen vorab gesetzt. Mockup (Schritt 4) und Review B hat Atti übersprungen (Präzisierung 2026-11-17); geprüft wird in Review C über Screenshots.
- Das Trainer-Handy sendet während eines laufenden oder pausierten Spiels alle 3 Minuten ein Lebenszeichen (Spec 006 R-L3); "vor X Min aktualisiert" liegt damit im Normalfall zwischen 0 und 3 Minuten, die Warnung ab 5 Minuten ist ein echtes Zeichen.
- Vibration gibt es in Safari auf dem iPhone nicht (Constitution, Technische Rahmenbedingungen); Chrome auf Android vibriert erst, nachdem die Seite einmal berührt wurde (research.md R-E4).
- Der Tab-Titel hilft vor allem am Rechner (Elternteil im Büro); auf dem iPhone hält Safari Seiten im Hintergrund an.
- Der Signalton der Eltern-Ansicht ist der auf diesem Gerät gewählte Ton (Spec 008), bei Eltern ohne eigene Einstellungen der Pfiff.
- Die Begriffe "Link für Eltern" (Live-Seite, Startbildschirm) und "Live-Link für Eltern" (Blatt "Teilen") meinen denselben Zuschauer-Link (Spec 006 FR-L02); der technische Begriff "Zuschauer-Link" bleibt in Specs und Code.
- Spieldetails, Historie und die Kopplungsfrage sind nicht betroffen.
