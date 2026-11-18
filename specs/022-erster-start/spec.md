# Feature Specification: Erster Start und Feinschliff (UX-Welle 2, Paket E)

**Feature Branch**: `022-erster-start` (Arbeitsbranch `feat/022-erster-start`)

**Created**: 2026-11-18

**Status**: Entwurf. Entscheidungen von Atti vorab gesetzt (18.11.2026, nach dem Nutzertest vom 17.11.2026 und dem Design-Check zu Spec 020), daher keine Clarify-Fragen; die Entscheidungen stehen unter "Clarifications". Mockup und Review B: auf Wunsch von Atti übersprungen, Prüfung in Review C über Screenshots (iPhone 390 × 844 und 375 × 667, hell und dunkel). Paket E der UX-Welle 2; Paket B (Spec 021 "Spielablauf") läuft parallel in einem eigenen Zweig.

**Input**: Nutzertest vom 17.11.2026 (Erstnutzer in Safari, Trainer am Spielfeldrand) und Design-Check zu Spec 020 (P3-Restpunkte); Atti (18.11.2026): Umsetzung freigegeben, nur bei echter Unsicherheit fragen.

## Ausgangslage

Gesichtet am 18.11.2026 im Code und im Nutzertest:

- **Installation bleibt unsichtbar (Erstnutzer)**: "Öffne den Torticker vom Home-Bildschirm. Nur dann bleiben deine Spiele dauerhaft gespeichert." steht nur unter "Mehr" → "Einstellungen" (Spec 001 FR-023, T074). Wer den Torticker zum ersten Mal in Safari öffnet, sieht den Hinweis nie; Safari kann Daten einer Webseite löschen. Datenverlust-Risiko.
- **"Neues Spiel" ist zäh**: "Weiter zum Anpfiff" liegt auf 390 × 844 pt erst bei y ≈ 952, also unter dem Rand, und ist ohne Gegner ausgegraut, ohne zu sagen, warum. Wer den Gegner noch nicht kennt, kommt nicht weiter.
- **Texte unklar**: Die Karte "Trainer? Füge den Link aus der Trainergruppe ein." sagt nicht, woher der Link kommt und wie man ihn einfügt. Die Einstellung heißt "Vorlagen" (Spec 009), was Trainer nicht mit Torvorlagen verbinden.
- **Design-Restpunkte aus Spec 020**: Das Blatt "Eltern live zuschauen lassen" nennt den Hauptknopf "Neu starten" (wer startet was?) und den Zusatz "Neu mit E1 und E2."; nach dem Anlegen steht nur ein Satz mit dem Weg zum Trainer-Link. Der Schalter "Ton bei Toren" ist im Zustand "an" schwarz und fällt auf dem Dashboard nicht auf. In "Live für Eltern" hängt der aufgeklappte Bereich "Für Trainer" als loses Bündel von Kästen unter dem Kopf, "Link einfügen" steht verloren am Ende.

## Clarifications

### Session 2026-11-18 (Entscheidungen von Atti, ohne Rückfragen)

- Q: Was zeigt der Startbildschirm Erstnutzern? → A: Solange die App nicht als installierte App läuft (gleiche Erkennung wie in den Einstellungen), steht unter den Hauptaktionen ein kompakter Hinweis mit kurzer Anleitung (iOS: Teilen → "Zum Home-Bildschirm"; Android: Menü → "App installieren") und dem Knopf "Später". Nicht in der Eltern-Ansicht.
- Q: Gegner Pflicht? → A: Nein. "Gegner (optional)"; leer wird "Gegner" gespeichert, später änderbar wie bisher (Spec 017). Der Knopf "Weiter zum Anpfiff" ist unten angeheftet und ohne Scrollen sichtbar.
- Q: Texte? → A: Karte "Trainer? …" bekommt den Satz "Den Link schickt dir der Trainer, z. B. per WhatsApp: lange drücken, Kopieren, hier einfügen." Die Einstellung "Vorlagen" heißt "Torvorlagen (Assists)".
- Q: Design-Restpunkte? → A: Blatt "Eltern live zuschauen lassen" mit Hauptknopf "Live-Spieltag anlegen" und "Mit E1 und E2." darüber, im Fertig-Zustand zusätzlich "Trainer-Link teilen"; Schalter "Ton bei Toren" an in Vereinsrot; "Für Trainer" auf "Live für Eltern" als eine Fläche mit "Link einfügen" im Abschnitt "TRAINER".

### Session 2026-11-18 (Präzisierungen beim Spezifizieren)

Festlegungen des Agenten, wo die Entscheidungen oben eine Lücke lassen. Sie folgen den Entscheidungen und dem bestehenden Verhalten; Atti kann sie in Review C ändern.

- **"Später" gilt bis zum nächsten Kalendertag.** Ein "Spieltag" lässt sich auf dem Handy nicht zuverlässig erkennen (Vormerkungen, Spielplan und freie Spiele sind optional). Der Kalendertag ist einfach, vorhersehbar und lässt den Hinweis wiederkommen, solange die Gefahr (Datenverlust) besteht. Gemerkt wird der Tag nur auf diesem Gerät im Browserspeicher (`localStorage`), nicht in der Sicherung, nicht im Live-Spieltag, ohne Konto (Constitution II, III). Ohne Browserspeicher (privates Surfen) gilt "Später" bis zum Neuladen.
- **"Verstanden" in den Einstellungen gilt weiter dauerhaft** (Spec 001 FR-023, T074) und blendet auch den Hinweis auf dem Startbildschirm aus; "Später" ändert die Einstellungen nicht. So gibt es einen dauerhaften Ausweg (Einstellungen), der Startbildschirm selbst bleibt dem Hinweis "Später" überlassen.
- **Kein eigener Installieren-Knopf.** Die App nutzt `beforeinstallprompt` bisher nicht, und iOS kennt ihn nicht. Der Hinweis erklärt den Weg im Browser (Constitution VI: nur bauen, was die Story verlangt). Anleitung nach Gerät: iPhone und iPad "Teilen" und "Zum Home-Bildschirm", Android "Menü" (drei Punkte) und "App installieren", sonst allgemein "Menü des Browsers" mit beiden Namen.
- **"Trainer-Link teilen" im Fertig-Zustand ohne Kader-Frage.** Das Blatt teilt den Link sofort (ein Tipp, Teilen-Menü direkt). Die Frage "Kader mit den Trainern teilen?" (Spec 016 FR-B02) bleibt erreichbar: Sie erscheint beim nächsten "Trainer-Link teilen" unter „Mehr“ → „Live für Eltern“ → „Für Trainer“, solange Kader nicht geteilt sind. Es verlassen also keine Kader ohne bewusste Entscheidung das Handy.
- **"Link einfügen" in "Für Trainer"** steht jetzt unter "Trainer-Link teilen" in der Karte "TRAINER" (beides gehört zu den Trainer-Links) und nicht mehr lose am Ende. Bei Lead-Handy der ersten Version (ohne Karte "TRAINER") bleibt er der erste Knopf im Bereich.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hinweis zur Installation auf dem Startbildschirm (Priority: P1)

Toms Mutter öffnet den Torticker zum ersten Mal in Safari, über einen Link aus der WhatsApp-Gruppe. Unter "Neues Spiel" steht ein kompakter Hinweis: "Torticker auf den Home-Bildschirm legen. Nur dann bleiben deine Spiele dauerhaft gespeichert." und darunter die Anleitung "In Safari auf „Teilen“ tippen, dann „Zum Home-Bildschirm“." Sie tippt auf "Später", legt zuerst los, und am nächsten Tag steht der Hinweis wieder da. Läuft die App vom Home-Bildschirm, sieht sie ihn nie.

**Why this priority**: Datenverlust-Risiko für Erstnutzer. Safari behandelt Webseiten ohne Installation mit weniger dauerhaftem Speicher; wer nur zufällig im Browser tickert, kann seine Spiele verlieren, ohne es vorher zu ahnen.

**Independent Test**: Frisches Handy im Browser (nicht installiert): Startbildschirm zeigt den Hinweis unter allen Hauptaktionen; "Später" blendet ihn aus, nach Neuladen bleibt er weg, am nächsten Tag kommt er wieder. Als installierte App erscheint er nie.

**Acceptance Scenarios**:

1. **Given** die App läuft im Browser (nicht als installierte App) und der Hinweis wurde weder in den Einstellungen mit "Verstanden" noch heute mit "Später" weggeklickt, **When** der Startbildschirm erscheint, **Then** zeigt er unter allen Hauptaktionen (nach "Neues Spiel", "Spiele verfolgen", "Eltern live zuschauen lassen" bzw. der Karte "Trainer? …") einen Hinweis mit der Überschrift "Torticker auf den Home-Bildschirm legen", dem Satz "Nur dann bleiben deine Spiele dauerhaft gespeichert.", einer kurzen Anleitung und dem Knopf "Später".
2. **Given** ein iPhone oder iPad, **Then** lautet die Anleitung "In Safari auf „Teilen“ tippen, dann „Zum Home-Bildschirm“."
3. **Given** ein Android-Gerät, **Then** lautet die Anleitung "Im Browser-Menü (drei Punkte) „App installieren“ wählen."
4. **Given** ein anderes Gerät (z. B. Rechner), **Then** lautet die Anleitung "Im Menü des Browsers „App installieren“ oder „Zum Home-Bildschirm“ wählen."
5. **Given** der Hinweis ist sichtbar, **When** "Später" getippt wird, **Then** verschwindet er sofort und bleibt für den Rest des Kalendertags weg, auch nach Neuladen; am nächsten Tag erscheint er wieder.
6. **Given** die App läuft als installierte App (Anzeige als eigenständige App bzw. iOS-Standalone, wie in den Einstellungen erkannt), **Then** erscheint der Hinweis nie.
7. **Given** der Hinweis unter "Mehr" → "Einstellungen" wurde mit "Verstanden" weggeklickt, **Then** erscheint er auch auf dem Startbildschirm nicht mehr; umgekehrt ändert "Später" nichts an den Einstellungen (der Hinweis dort bleibt, T074 unverändert).
8. **Given** der Hinweis ist sichtbar, **Then** stehen "Neues Spiel" und alle übrigen Hauptaktionen unverändert an ihrem Platz davor und bleiben mit einem Tipp erreichbar (der Hinweis verdrängt nichts, er steht nur dahinter).
9. **Given** die Eltern-Ansicht (Zuschauer-Link) oder das Dashboard in der App, **Then** gibt es dort keinen Installationshinweis.

---

### User Story 2 - Neues Spiel schneller (Priority: P2)

Max' Vater steht am Spielfeldrand und weiß den Namen des Gegners nicht. Auf "Neues Spiel" tippt er sofort auf den unten angehefteten Knopf "Weiter zum Anpfiff", ohne etwas einzutragen und ohne zu scrollen. Der Gegner heißt vorerst "Gegner" und lässt sich später korrigieren.

**Why this priority**: Der Knopf lag unter dem Rand und war ohne Gegner gesperrt; am Spielfeldrand kostet das Zeit und Nerven (Constitution I). Der Name ist kein Grund, den Anpfiff aufzuhalten.

**Independent Test**: "Neues Spiel" auf 390 × 844 und 375 × 667: Der Knopf steht sichtbar unten, ohne Scrollen. Ohne Gegner tippen: das Spiel startet, der Gegner heißt "Gegner".

**Acceptance Scenarios**:

1. **Given** "Neues Spiel" auf 390 × 844 pt oder 375 × 667 pt, **Then** ist "Weiter zum Anpfiff" ohne Scrollen vollständig sichtbar, steht unten über der Navigationsleiste und bleibt dort, auch wenn das Formular länger ist (z. B. mit Aufgebot).
2. **Given** das Formular ist länger als der Bildschirm und wird ganz nach unten gescrollt, **Then** verdeckt der angeheftete Knopf keinen Inhalt (der letzte Abschnitt endet über dem Knopf).
3. **Given** das Feld Gegner ist leer, **Then** zeigt es den Platzhalter "Gegner (optional)" und "Weiter zum Anpfiff" ist bedienbar.
4. **Given** das Feld Gegner ist leer, **When** "Weiter zum Anpfiff" getippt wird, **Then** startet das Spiel mit dem Gegner "Gegner" (Kopfzeile, Torliste, Verlauf, Teilen-Text, Dashboard); Leerzeichen allein zählen als leer.
5. **Given** ein Spiel mit dem Gegner "Gegner", **Then** lässt er sich wie bisher über „Spiel korrigieren“ ändern (Spec 017).
6. **Given** ein Eintrag im Feld Gegner, **Then** gilt er wie bisher (Spec 001 FR-001, höchstens 40 Zeichen).
7. **Given** ein anderer Grund sperrt den Knopf (z. B. fehlender Mannschaftsname), **Then** nennt eine Zeile direkt über dem Knopf den Grund im Klartext, statt ihn nur auszugrauen.
8. **Given** das Feld Gegner ist fokussiert (Bildschirmtastatur offen), **Then** bleibt der Knopf erreichbar, soweit der Browser den sichtbaren Bereich verkleinert (Android); "Enter" im Feld startet das Spiel wie "Weiter zum Anpfiff".

---

### User Story 3 - Klarere Texte (Priority: P3)

Ein Co-Trainer öffnet den Torticker auf einem neuen Handy. Die Karte sagt ihm, was er tun soll: "Den Link schickt dir der Trainer, z. B. per WhatsApp: lange drücken, Kopieren, hier einfügen." In den Einstellungen steht "Torvorlagen (Assists)" statt "Vorlagen".

**Why this priority**: Kleine Hürden mit großer Wirkung in Befragung und Nutzertest, ohne Verhalten zu ändern.

**Independent Test**: Frisches Handy ohne Mannschaft: Karte "Trainer? …" mit dem neuen Satz. Einstellungen: Schalter "Torvorlagen (Assists)".

**Acceptance Scenarios**:

1. **Given** ein Handy ohne eigene Mannschaft und ohne Live-Spieltag (Karte "Trainer? …" sichtbar, Spec 020 FR-E62), **Then** steht dort zusätzlich "Den Link schickt dir der Trainer, z. B. per WhatsApp: lange drücken, Kopieren, hier einfügen."; ebenso in der Karte bei neu ausgestelltem Live-Spieltag.
2. **Given** "Mehr" → "Einstellungen" unter „Im Spiel erfassen“, **Then** heißt der Schalter "Torvorlagen (Assists)" (bisher "Vorlagen"); Verhalten, Hilfetext und Testkennung bleiben (Spec 009 FR-V01).
3. **Given** die Hilfe, **Then** nennen alle Einträge den Schalter „Torvorlagen (Assists)“ wörtlich wie die App.

---

### User Story 4 - Design-Restpunkte aus dem Design-Check zu Spec 020 (Priority: P3)

Ein Trainer legt über "Eltern live zuschauen lassen" einen Live-Spieltag an: Das Blatt sagt "Mit E1 und E2." und bietet "Live-Spieltag anlegen" an; nach dem Anlegen teilt er mit einem Tipp den Link für die Eltern und mit einem weiteren den Trainer-Link. Eltern sehen den Schalter "Ton bei Toren" in Vereinsrot, sobald er an ist. Auf "Live für Eltern" steht "Link einfügen" bei den Trainer-Links, und "Für Trainer" ist eine zusammenhängende Fläche.

**Why this priority**: Befunde P3 aus dem Design-Check, von Atti freigegeben; verbessert Verständlichkeit, ohne Abläufe zu ändern.

**Independent Test**: Blatt "Eltern live zuschauen lassen" ohne Live-Spieltag: Wortlaut prüfen, anlegen, "Trainer-Link teilen" teilt den Trainer-Link. Dashboard der Eltern-Ansicht: Schalter an ist rot. "Live für Eltern" mit "Für Trainer" aufgeklappt.

**Acceptance Scenarios**:

1. **Given** das Blatt "Eltern live zuschauen lassen" ohne Live-Spieltag (Spec 020 US1-S5), **Then** heißt der Hauptknopf "Live-Spieltag anlegen" (bisher "Neu starten"), und direkt darüber steht "Mit E1 und E2." (bisher "Neu mit E1 und E2."); bei einer Mannschaft "Mit E2.", bei mehreren "Mit E1, E2 und E3.".
2. **Given** das Blatt aus Szenario 1, **When** "Live-Spieltag anlegen" getippt wird, **Then** verhält es sich wie bisher "Neu starten" (Spec 020 FR-E07 bis FR-E09, Titel "Unser Spieltag").
3. **Given** das Blatt nach dem Anlegen (Fertig-Zustand "Fertig. „<Titel>“ ist live." bzw. "Fertig. Jetzt den Link teilen."), **Then** stehen dort der Hauptknopf "Link für Eltern teilen" und darunter der sekundäre Knopf "Trainer-Link teilen", beide mindestens 64 pt hoch; die Pfadbeschreibung „Den Trainer-Link … findest du unter …“ entfällt.
4. **Given** der Fertig-Zustand, **When** "Trainer-Link teilen" getippt wird, **Then** öffnet sich das Teilen-Menü direkt mit dem Trainer-Link (gleicher Text wie unter „Für Trainer“); ohne Teilen-Menü wird er kopiert ("Link kopiert. Füge ihn in WhatsApp ein."); es erscheint keine Kader-Frage.
5. **Given** das Blatt nach "Link einfügen" (Fertig-Zustand "Gekoppelt mit „<Titel>“."), **Then** bleibt es bei "Link für Eltern teilen"; "Trainer-Link teilen" steht dort nicht (wie die Pfadbeschreibung bisher).
6. **Given** die Eltern-Ansicht, **When** "Ton bei Toren" an ist, **Then** ist die Fläche des Schalters in Vereinsrot (`rot-tief`) gefüllt und der Schieber weiß (`on-rot`), in beiden Themes; aus bleibt er wie bisher (leere Fläche, dunkler Schieber).
7. **Given** der Schalter wird umgelegt und das Gerät meldet "Bewegung reduzieren" (`prefers-reduced-motion`), **Then** gibt es keine Animation; sonst gleitet der Schieber kurz (höchstens 0,15 Sekunden).
8. **Given** "Live für Eltern" mit Live-Spieltag und aufgeklapptem "Für Trainer", **Then** hängt der Inhalt als eine Fläche unmittelbar unter der Kopfzeile "Für Trainer" (gleiche Fläche und Rahmen, die Abschnitte "TRAINER", "MANNSCHAFTEN", "SPIELPLAN", "VERWALTEN" durch Linien getrennt, kein zweiter loser Kasten je Abschnitt).
9. **Given** das aufgeklappte "Für Trainer" eines Trainer-Handys, **Then** steht "Link einfügen" unter "Trainer-Link teilen" am Ende des Abschnitts "TRAINER" (Reihenfolge: "Trainer-Link teilen", "Link einfügen", danach "MANNSCHAFTEN"); nicht mehr als loser Knopf am Ende des Bereichs.
10. **Given** ein Handy ohne Live-Spieltag, **Then** bleiben die Knöpfe unter "Für Trainer" wie in Spec 020 US2-S7.

---

### Edge Cases

- **Hinweis auf kleinen Bildschirmen (375 × 667)**: Er steht unter den Aktionen und darf scrollen; der Startbildschirm hat keinen festen Bereich. "Später" bleibt ohne Scrollen erreichbar, sobald die Aktionen darüber stehen, mindestens 48 pt hoch.
- **iPad im Desktop-Modus** meldet sich wie ein Mac (`MacIntel` mit Touch): Die App erkennt es als iPad (Anleitung für iOS).
- **Browser ohne `localStorage`** (privates Surfen, blockiert): Der Hinweis erscheint bei jedem Start; "Später" gilt bis zum Neuladen.
- **Kalendertag über Mitternacht**: Der Tag wird beim Anzeigen des Startbildschirms verglichen; wer über Mitternacht offen lässt, sieht ihn nach dem nächsten Wechsel zum Startbildschirm wieder.
- **Spiel "Gegner" und Mannschaftsfarbe**: Die Standardfarbe des Gegners richtet sich nach dem Namen (Spec 004); "Gegner" bekommt die Farbe wie ein leerer Name bisher.
- **Mehrere Spiele "Gegner"** am selben Tag: erlaubt, Verlauf und Historie zeigen sie nebeneinander mit Datum.
- **Gegner leer und Spielplan-Eintrag gewählt**: Der Gegner kommt aus dem Plan (Spec 015 US2); nur ohne Eintrag gilt "Gegner".
- **Trainer-Link teilen ohne Teilen-Menü**: wie "Link für Eltern teilen" (kopiert, Meldung).

## Requirements *(mandatory)*

### Functional Requirements

**Installationshinweis (US1)**

- **FR-F01**: Der Startbildschirm MUSS einen Hinweis "Torticker auf den Home-Bildschirm legen" mit dem Satz "Nur dann bleiben deine Spiele dauerhaft gespeichert.", einer Anleitung nach Gerät (FR-F02) und dem Knopf "Später" zeigen, solange die App nicht als installierte App läuft. Die Erkennung MUSS dieselbe sein wie beim Hinweis in den Einstellungen (`isStandalone`).
- **FR-F02**: Die Anleitung MUSS lauten: iPhone und iPad "In Safari auf „Teilen“ tippen, dann „Zum Home-Bildschirm“.", Android "Im Browser-Menü (drei Punkte) „App installieren“ wählen.", sonst "Im Menü des Browsers „App installieren“ oder „Zum Home-Bildschirm“ wählen."
- **FR-F03**: "Später" MUSS den Hinweis sofort ausblenden und für den Rest des Kalendertags (Ortszeit) ausblenden; am nächsten Tag MUSS er wieder erscheinen. Der Tag MUSS nur auf dem Gerät im Browserspeicher stehen (`localStorage`, Schlüssel `torticker-install-later`), nicht in der Sicherung, nicht im Live-Spieltag. Fehlt der Browserspeicher, gilt "Später" bis zum Neuladen.
- **FR-F04**: Der Hinweis MUSS entfallen, wenn der Hinweis in den Einstellungen mit "Verstanden" weggeklickt wurde (`installHintDismissedAt`). "Später" DARF `installHintDismissedAt` nicht ändern.
- **FR-F05**: Der Hinweis MUSS unter allen Hauptaktionen des Startbildschirms stehen (nach der Karte "Trainer? …"), DARF keine Aktion verdrängen oder die Reihenfolge ändern und DARF nicht in der Eltern-Ansicht und im Dashboard erscheinen. Der Knopf "Später" MUSS mindestens 48 pt hoch sein.
- **FR-F06**: Der Hinweis DARF keine Verbindung aufbauen (Netzwerk-Wächter) und wird nachgeladen, nicht im Hauptbundle (Hauptbundle < 60 KB gzip).
- **FR-F07**: Der Hinweis unter "Mehr" → "Einstellungen" (Spec 001 FR-023, T074) MUSS unverändert bleiben.

**Neues Spiel schneller (US2)**

- **FR-F10**: "Weiter zum Anpfiff" MUSS unten am Rand des sichtbaren Bereichs angeheftet sein, über der Navigationsleiste (nicht von ihr verdeckt, `position: sticky`), und auf 390 × 844 und 375 × 667 pt ohne Scrollen vollständig sichtbar sein. Er DARF keinen Inhalt des Formulars verdecken, auch nicht beim Scrollen an das Ende.
- **FR-F11**: Der Gegner MUSS optional sein. Das Feld MUSS den Platzhalter "Gegner (optional)" zeigen. Ist es leer (auch nur Leerzeichen), MUSS das Spiel den Gegnernamen "Gegner" erhalten (statt einer Fehlermeldung "Bitte den Gegner eintragen.", Spec 001 FR-001 geändert).
- **FR-F12**: Die Vorschau "Begegnung" MUSS bei leerem Feld "Gegner" zeigen (wie bisher). Teilen-Text, Spielbildschirm, Historie und Dashboard MÜSSEN "Gegner" wie jeden anderen Namen behandeln.
- **FR-F13**: Der Name MUSS wie bisher über „Spiel korrigieren“ änderbar sein (Spec 017); es ist keine neue Bearbeitung nötig.
- **FR-F14**: Ist der Knopf aus einem anderen Grund gesperrt (z. B. fehlender Mannschaftsname, Zeitschema), MUSS eine Zeile direkt über dem Knopf den Grund in der Meldung der Prüfung nennen (`role="status"`), statt den Knopf stumm auszugrauen.
- **FR-F15**: "Enter" im Feld Gegner MUSS das Spiel anlegen wie der Knopf (Formularabschluss, wie bisher). Der Knopf MUSS mit offener Tastatur erreichbar bleiben, soweit der Browser den sichtbaren Bereich verkleinert (Android: Layout-Viewport; auf iOS legt sich die Tastatur darüber, "Enter" bleibt der Weg).

**Klarere Texte (US3)**

- **FR-F20**: Die Karte "Trainer? Füge den Link aus der Trainergruppe ein." (`start-trainer-card`, Spec 012 FR-S01, Spec 020 FR-E62) MUSS um den Satz "Den Link schickt dir der Trainer, z. B. per WhatsApp: lange drücken, Kopieren, hier einfügen." ergänzt werden, in beiden Varianten (ohne Live-Spieltag und bei neu ausgestelltem Live-Spieltag). Der Knopf "Link einfügen" bleibt.
- **FR-F21**: Der Schalter "Vorlagen" unter „Im Spiel erfassen“ MUSS "Torvorlagen (Assists)" heißen (Spec 009 FR-V01 geändert); Hilfetext, Kennung (`feature-assists`) und Verhalten bleiben. Alle Hilfe-Einträge nennen ihn so.

**Design-Restpunkte (US4)**

- **FR-F30**: Im Blatt "Eltern live zuschauen lassen" MUSS der Hauptknopf "Live-Spieltag anlegen" heißen (Spec 020 FR-E06: "Neu starten") und der Hinweis darüber "Mit E1 und E2." (Spec 020 FR-E06: "Neu mit E1 und E2."). Verhalten unverändert (Spec 020 FR-E07 bis FR-E09).
- **FR-F31**: Im Fertig-Zustand nach "Live-Spieltag anlegen" MUSS unter "Link für Eltern teilen" der sekundäre Knopf "Trainer-Link teilen" stehen (mindestens 64 pt). Er MUSS den Trainer-Link teilen (wie "Trainer-Link teilen" unter „Für Trainer“, aber ohne Kader-Frage, siehe Präzisierung); ohne Teilen-Menü kopiert er den Link. Der Satz „Den Trainer-Link für die anderen Trainer findest du unter …“ (Spec 020 FR-E08) MUSS entfallen. Nach "Link einfügen" (Gekoppelt) gibt es den Knopf nicht.
- **FR-F32**: Der Schalter "Ton bei Toren" (Eltern-Ansicht, Spec 020 FR-E25) MUSS im Zustand "an" mit `rot-tief` gefüllt sein (Schieber `on-rot`), aus unverändert. Die Paare `on-rot` auf `rot-tief` MÜSSEN in der Kontrastmatrix (SC-006) in beiden Themes mindestens 4,5:1 erreichen.
- **FR-F33**: Der Schieber DARF bei `prefers-reduced-motion: reduce` keine Animation zeigen; sonst höchstens 0,15 Sekunden.
- **FR-F34**: Aufgeklappt MUSS "Für Trainer" auf "Live für Eltern" eine zusammenhängende Fläche unter der Kopfzeile bilden (Fläche `card`, Rand 1px `line`, oben ohne Rand an der Kopfzeile, Abschnitte durch Linien getrennt), keinen eigenen Kasten je Abschnitt (Spec 020 FR-E14, Gestaltung).
- **FR-F35**: Auf einem Trainer-Handy MUSS "Link einfügen" in der Karte "TRAINER" unter "Trainer-Link teilen" stehen (Spec 020 FR-E14: "dann Link einfügen"). Beim Lead-Handy der ersten Version bleibt er der erste Knopf im Bereich (Spec 020 FR-E16).
- **FR-F36**: Die Hilfe MUSS die neuen Namen nennen (Abschnitt "Hilfe"); Bezeichnungen wörtlich wie in der App (Constitution IX).

**Unverändert**

- **FR-F40**: Unverändert bleiben: Kopplung, Meldungsformat, Dienst, Spielbildschirm, Historie, Spielplan, Hinweis in den Einstellungen, die Reihenfolge der Aktionen des Startbildschirms (Spec 018 FR-001, Spec 020 FR-E01) und "Live-Spieltag anlegen" mit Titel und Mannschaften unter „Für Trainer“.

### Key Entities

- **Hinweis "Später"**: Einstellung je Gerät und Browser (Kalendertag), nur auf dem Startbildschirm, nicht in der Sicherung, nicht übertragen.
- Keine Änderung an Spiel, Mannschaft, Live-Spieltag oder Meldungsformat. Ein Spiel ohne Gegnernamen speichert den Namen "Gegner".

## Hilfe *(mandatory)*

Einträge in `src/domain/help-entries.ts`; Bezeichnungen wörtlich wie in der App.

| Eintrag | Änderung | Quelle |
|---|---|---|
| `installieren` "Wie lege ich den Torticker auf den Home-Bildschirm?" (Thema Erste Schritte) | geändert: Hinweis auf dem Startbildschirm "Torticker auf den Home-Bildschirm legen", Anleitung nach Gerät, "Später" blendet ihn bis morgen aus, „Verstanden“ unter „Mehr“ → „Einstellungen“ dauerhaft | 001 FR-023, 022 US1 |
| `neues-spiel` "Wie lege ich ein Spiel an?" (Thema Spiel erfassen) | geändert: Gegner ist optional ("Gegner (optional)", leer heißt er "Gegner", später über „Spiel korrigieren“ änderbar); "Weiter zum Anpfiff" steht unten angeheftet | 001 US2, 022 US2 |
| `vorlage` "Wie erfasse ich, wer das Tor vorgelegt hat?" (Thema Torschützen und Ereignisse) | geändert: „Torvorlagen (Assists)“ statt „Vorlagen“ | 009 US1, 009 US4, 022 US3 |
| `trainer-link` "Wie kopple ich das Handy eines Trainers?" (Thema Live-Spieltag) | geändert: "Den Link schickt dir der Trainer, z. B. per WhatsApp: lange drücken, Kopieren, hier einfügen." | 016 US4, 022 US3 |
| `eltern-zuschauen` "Wie lasse ich Eltern live zuschauen?" (Thema Live-Spieltag) | geändert: „Live-Spieltag anlegen“ statt „Neu starten“ ("Mit E1 und E2."); im Blatt danach „Link für Eltern teilen“ und „Trainer-Link teilen“ | 020 US1, 022 US4 |
| `live-anlegen` "Wie richte ich einen Live-Spieltag ein?" (Thema Live-Spieltag) | geändert: schnellster Weg „Eltern live zuschauen lassen“, dann „Live-Spieltag anlegen“; „Trainer-Link teilen“ im Blatt; „Link einfügen“ steht unter „Trainer-Link teilen“ in „Für Trainer“ | 006 US1, 022 US4 |
| `tor-hinweis` "Merke ich, wenn ein Tor fällt?" (für Eltern) | geändert: der Schalter „Ton bei Toren“ ist an rot | 020 US3, 022 US4 |

Kein Eintrag entfällt, kein neuer kommt hinzu. Die Eltern-Hilfe bleibt bei neun Einträgen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-F01**: Ein Erstnutzer im Browser sieht den Installationshinweis auf dem Startbildschirm, ohne zu scrollen oder ein Menü zu öffnen, auf 390 × 844 pt; in der installierten App und in der Eltern-Ansicht nie (automatisch geprüft).
- **SC-F02**: "Weiter zum Anpfiff" ist auf 390 × 844 und 375 × 667 pt ohne Scrollen sichtbar und ohne Gegnername bedienbar; "Neues Spiel" bis zum Anpfiff braucht höchstens 2 Tipps (automatisch geprüft).
- **SC-F03**: Die Texte "Torvorlagen (Assists)" und der Satz zum Link stehen wörtlich in App und Hilfe (automatisch geprüft, Hilfe-Abdeckung).
- **SC-F04**: Der Schalter "Ton bei Toren" an erreicht gegen Rot mindestens 4,5:1 in beiden Themes (Kontrastmatrix, `npm run contrast`); keine Animation bei `prefers-reduced-motion`.
- **SC-F05**: Keine neue Laufzeit-Abhängigkeit, keine neue Verbindung (Netzwerk-Wächter), Hauptbundle weiter unter 60 KB gzip.
- **SC-F06**: axe-core ohne Verstöße auf Startbildschirm mit Hinweis, "Neues Spiel", Blatt "Eltern live zuschauen lassen" (beide Zustände), Dashboard mit Schalter an und "Live für Eltern" mit aufgeklapptem "Für Trainer", Kontrastmatrix beider Themes grün.
- **SC-F07**: Ein Design-Check der geänderten Bildschirme ergibt keinen P0- oder P1-Befund.

## Assumptions

- Grundlage sind der Nutzertest vom 17.11.2026 und der Design-Check zu Spec 020; Atti hat die Entscheidungen vorab gesetzt. Mockup (Schritt 4) und Review B sind übersprungen; geprüft wird in Review C über Screenshots.
- Safari löscht Daten von Webseiten, die nicht installiert sind und länger nicht geöffnet wurden, nach etwa sieben Tagen (Spec 001 FR-023, `requestPersistentStorage`); der Hinweis bleibt deshalb auch nach "Später" bestehen.
- Der Kalendertag in Ortszeit genügt als "Spieltag"; eine eigene Erkennung wäre mehr Aufwand als Nutzen (Constitution VI).
- Die Spezifikation der Seite "Neues Spiel" (Spec 001 US2) und die Vorbelegung des Gegners durch Paket B (Spec 021) greifen nicht ineinander: Paket B belegt das Feld vor, diese Spec macht es optional.
- Die Abschnitte "geändert durch Spec 022" in Spec 001, 009, 012 und 020 sind Nachträge; Verhalten und Wortlaut gelten wie in dieser Spec.
