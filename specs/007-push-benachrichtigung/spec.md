# Feature Specification: Eigener Dienst für den Live-Spieltag (dauerhafter Stand, später Push)

**Feature Branch**: `007-push-benachrichtigung` (Arbeitsbranch `claude/hopeful-noether-puzkgc`)

**Created**: 2026-11-04 (Backlog), überarbeitet 2026-11-07

**Status**: Review A und Review B erledigt (07.11.2026, "passt"). PR A (Dienst, #69) übernommen, Dienst ausgeliefert (07.11.2026). PR B (App auf den eigenen Dienst, US1, US2) umgesetzt und übernommen (PR #73, Merge 07.11.2026 auf Attis Wunsch vor dem Leistungsligaspiel am 08.11.2026, dort erster Praxistest). Offen: PR C (US3 "Letzte Spiele"). Mockup "Letzte Spiele": https://claude.ai/artifact/GjfjzQUmiJYW8wBZByjxRx Teil 1 (US1 bis US3) ist der eigene Dienst, Teil 2 (US4 Push) folgt danach mit eigener Review. Umfang entspricht Roadmap C3 und D1, später C4. Voraussetzung: Constitution 3.0.0 (Prinzip II, eigener Vermittlungsdienst).

**Input**: Review B zu Spec 006 (04.11.2026): "Ich würde für den Moment C wählen und danach B angehen." Atti nach dem ersten Spieltag (07.11.2026): "Diese Daten werden doch eigentlich zentral gehostet oder?", "würde ein kostenloser zentraler Server helfen?", "cloudflare habe ich schon. solange alles kostenlos bleibt bin ich entspannt!"

## Ausgangslage

- Trainer-Handys senden Live-Stände, Konfiguration (Titel, Mannschaften) und Spielplan verschlüsselt an ntfy.sh, eine öffentliche Instanz ohne Konto (Spec 006 R-L1, Spec 015 FR-P06). Zuschauer und andere Trainer-Handys holen sie dort ab.
- ntfy.sh hält Meldungen nur rund 12 Stunden vor. Am ersten Spieltag (07.11.2026) fehlten deshalb am Vorabend angelegte Spiele auf neu geöffneten Dashboards und Home-Bildschirm-Symbolen (Spec 006 R-L21). Die Fehlerbehebung (#65) mildert das, solange ein Trainer den Torticker am Spieltag öffnet; ein Endstand ist für Zuschauer, die später zum ersten Mal schauen, weiter nach 12 Stunden weg. Ebenso erreicht ein geänderter Spielplan ein Trainer-Handy nur innerhalb von 12 Stunden (Spec 015 FR-P07).
- ntfy.sh begrenzt je Internetanschluss (30 offene Verbindungen, 250 Meldungen am Tag). Im Mobilfunk teilen sich viele Geräte eine Adresse; dann fällt das Dashboard auf Abfragen alle 30 Sekunden zurück (Spec 006 SC-L08).
- Atti hat ein Cloudflare-Konto. Cloudflare bietet einen Gratis-Plan, der bei Überschreiten seiner Grenzen Anfragen ablehnt statt abzurechnen (research.md R-N1).

## Clarifications

### Session 2026-11-07 (Chat nach dem ersten Spieltag)

- Q: Liegen die Daten zentral oder nur auf den Trainer-Handys? → A (Erklärung): Auf dem Trainer-Handy; jede Änderung geht einmal verschlüsselt an ntfy.sh, das sie rund 12 Stunden vorhält. Eltern holen sie dort ab, nicht vom Trainer-Handy.
- Q: Eigener kostenloser Dienst bei Cloudflare? → A: Ja ("solange alles kostenlos bleibt"). Constitution Prinzip II darf dafür angepasst werden (eigener Dienst im Gratis-Plan, Nutzer ohne Konto).
- Q: Echte Apple-App (Dynamic Island, Live-Aktivitäten, Push)? → A: Erstmal nein, damit warten wir noch etwas. Push kommt über Web-Push (US4).
- Q1 Umfang: zuerst nur der eigene Dienst, Push als zweiter Schritt in derselben Spec? → A: Ja.
- Q2 Verschlüsselung: Der Dienst sieht nur verschlüsselte Daten, auch später bei Push (die Meldung kündigt nur Neues an, das Handy holt und entschlüsselt selbst)? → A: Ja.
- Q3 Umstieg: zwei Wochen an beide Dienste senden oder harter Wechsel an einem Tag? → A: Harter Wechsel (B).
- Q4 Wie lange speichert der Dienst? → A: Die letzten 10 Spiele einer Mannschaft.
- Q5 Ändern sich die Links für Eltern und Trainer? → A (Erklärung): Nein. Die Links zeigen auf die App, die Adresse des Dienstes steckt nur in der App. Zuschauer-Link, Trainer-Link und Home-Bildschirm-Symbole bleiben gültig. Adresse des Dienstes: kostenlose Subdomain `…workers.dev`; Auslieferung automatisch über GitHub Actions mit einem Cloudflare-API-Token, das Atti einmal als Secret im Repo hinterlegt.

### Session 2026-11-07 (Review B, Fassung 1)

- Atti zum Mockup: "Letzte Spiele" nicht in der Karte, sondern als eigener Block getrennt von den laufenden Partien, filterbar nach E1/E2/E3; ganz unten, nicht so sehr im Fokus. → Fassung 2: Block "Letzte Spiele" unter den Karten, Filter je Mannschaft (eine auf einmal, Vorgabe die erste Mannschaft des Live-Spieltags), ruhige Darstellung (US3, FR-N13).
- Review B (Atti): "Review B passt, Alle/E1/E2/E3". → Filter "Alle", "E1", "E2", "E3", Vorgabe "Alle"; unter "Alle" nennt jede Zeile die Mannschaft (US3, FR-N13).
- Atti: Die Sektion soll zusammenklappbar sein, Vorgabe zusammengeklappt. → Überschrift "Letzte Spiele" ist ein Knopf; zugeklappt nur die Überschrift, aufgeklappt Filter und Liste (US3-S1, FR-N13).

### Session 2026-11-07 (Review A)

- Kurzfassung mit US1 bis US3, den Antworten Q1 bis Q5 und drei neuen Punkten (Folge des harten Wechsels mit automatischem Update der Dashboard-Seite FR-N09, Löschen nach einem Jahr bzw. beim Neuausstellen FR-N12, Constitution 3.0.0) → A: "Review A passt".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Eltern sehen den Stand jederzeit (Priority: P1)

Wer den Zuschauer-Link öffnet, sieht sofort alle Spiele des Tages und die letzten Ergebnisse, egal wann ein Trainer sie angelegt oder zuletzt gesendet hat und egal, ob die Seite im Browser oder über das Symbol auf dem Home-Bildschirm läuft.

**Why this priority**: Behebt die Ursache des Durcheinanders vom ersten Spieltag (Spec 006 R-L21) und die 12-Stunden-Grenze (FR-L16) für alle Zuschauer.

**Independent Test**: Trainer-Handy legt am Abend ein E1-Spiel an und bleibt danach aus. Am nächsten Vormittag öffnet ein neues Gerät den Zuschauer-Link und zeigt die E1-Karte "noch nicht angepfiffen".

**Acceptance Scenarios**:

1. **Given** ein Trainer hat das E1-Spiel am Vorabend angelegt und den Torticker seitdem nicht geöffnet, **When** ein Elternteil am Spieltag den Zuschauer-Link zum ersten Mal öffnet, **Then** zeigt das Dashboard innerhalb von 5 Sekunden die E1-Karte "noch nicht angepfiffen".
2. **Given** E2 hat am Samstag 2:1 gewonnen, **When** die Oma den Zuschauer-Link am Montag zum ersten Mal öffnet, **Then** sieht sie die E2-Karte mit "Ende · 07.11." und 2:1.
3. **Given** ein Elternteil hat das Dashboard im Browser offen und legt es auf den Home-Bildschirm, **When** es das neue Symbol öffnet, **Then** zeigt es dieselben Spiele wie im Browser.
4. **Given** ein laufendes Spiel, **When** ein Tor erfasst wird, **Then** erscheint es auf allen offenen Dashboards innerhalb von 10 Sekunden (SC-L01), auch wenn mehr als 30 Zuschauer dasselbe Netz nutzen (Vereins-WLAN, Mobilfunk).
5. **Given** der Dienst ist nicht erreichbar oder seine Gratis-Grenze für heute ist erreicht, **Then** zählt das Trainer-Handy Tore wie ohne Kopplung, das Dashboard zeigt "Keine Verbindung · Stand von …", und beides holt den aktuellen Stand nach, sobald der Dienst wieder antwortet.
6. **Given** jemand hat nur den Zuschauer-Link, **Then** kann er beim Dienst keinen Stand speichern, ändern oder löschen; ein Versuch ändert kein Dashboard.

---

### User Story 2 - Trainer-Handys bekommen Spielplan und Änderungen auch nach Tagen (Priority: P1)

Ein Trainer, der den Torticker eine Woche nicht geöffnet hat, bekommt beim nächsten Öffnen den aktuellen Spielplan, Titel und Mannschaften des Live-Spieltags, ohne dass ein anderes Handy erneut senden muss.

**Why this priority**: Der Spielplan (Spec 015) und Änderungen am Live-Spieltag (Spec 006 US5) hängen heute ebenfalls an den 12 Stunden.

**Independent Test**: Trainer-Handy A trägt ein Planspiel ein und bleibt aus. Trainer-Handy B öffnet den Torticker drei Tage später und zeigt das Planspiel unter "Aus dem Spielplan".

**Acceptance Scenarios**:

1. **Given** Atti hat am Montag den Spielplan geändert, **When** ein Trainer am Freitag den Torticker öffnet, **Then** zeigt "Aus dem Spielplan" die Änderung, ohne dass Attis Handy erneut gesendet hat.
2. **Given** ein Trainer hat am Dienstag E3 zum Live-Spieltag hinzugefügt, **When** ein anderes Trainer-Handy am Samstag "Neues Spiel" öffnet, **Then** kann es E3-Spiele senden (wie Spec 006 US5-S1, ohne Zeitgrenze).
3. **Given** ein Trainer stellt alle Links neu aus (Spec 006 US5-S3), **Then** erfahren alte Trainer-Handys und alte Dashboards davon auch Tage später beim nächsten Öffnen.

---

### User Story 3 - Letzte Spiele je Mannschaft (Priority: P2)

Eltern sehen ganz unten auf dem Dashboard, getrennt von den laufenden Partien, die letzten Ergebnisse einer Mannschaft, bis zu 10 Spiele, auch wenn sie den Link erst später bekommen haben. Über E1, E2 und E3 wählen sie die Mannschaft.

**Why this priority**: Atti wünscht die letzten 10 Spiele je Mannschaft (Q4). Nützlich, aber der Spieltag selbst funktioniert ohne.

**Independent Test**: E1 hat 12 Spiele gesendet. Ein neues Gerät öffnet den Zuschauer-Link und zeigt unten im Block "Letzte Spiele" mit dem Filter "E1" die 10 jüngsten.

**Acceptance Scenarios**:

1. **Given** E1 hat in den letzten Wochen 12 Spiele übertragen, **When** ein Elternteil das Dashboard öffnet, **Then** steht unter den Karten die zugeklappte Überschrift "Letzte Spiele"; **When** es darauf tippt, **Then** klappt der Block auf mit den Filtern "Alle", "E1", "E2", "E3", "Alle" ist gewählt, und darunter stehen die früheren Spiele aller Mannschaften, je Mannschaft höchstens 10, neuestes zuerst, je Zeile Datum, Mannschaft, Ergebnis und Gegner aus Sicht der Mannschaft (z. B. "31.10. · E1 · 2:1 gegen TSV Musterstadt", auswärts "bei"); mit dem Filter "E1" die 10 jüngsten E1-Spiele ohne Mannschaftsangabe.
2. **Given** der Block "Letzte Spiele", **When** das Elternteil auf "E2" tippt, **Then** zeigt er nur die Spiele von E2; die Karten darüber ändern sich nicht, und beim nächsten Aufklappen ist wieder der zuletzt gewählte Filter gewählt.
3. **Given** E3 hat heute schon gespielt und die Karte zeigt dieses Spiel, **Then** steht es nicht noch einmal unter "Letzte Spiele".
4. **Given** ein Spiel wird auf dem Lead-Handy gelöscht oder auf "Nicht live senden" gestellt, **Then** verschwindet es auch aus "Letzte Spiele".
5. **Given** keine Mannschaft hat ein früheres Spiel übertragen, **Then** fehlt der Block; hat nur eine Mannschaft keins, zeigt ihr Filter "Noch keine früheren Spiele", und unter "Alle" fehlt sie.

---

### User Story 4 - Benachrichtigung bei Toren (Priority: P3, Teil 2, nicht in diesem Schritt)

Eltern, die das Dashboard auf dem Home-Bildschirm haben, bekommen bei Anpfiff, Tor, Halbzeit und Endstand eine Meldung auf dem Sperrbildschirm, ohne zusätzliche App (Web-Push). Der Dienst bleibt dabei blind: Er weckt das Handy nur, Text und Stand entschlüsselt das Handy selbst (Q2).

**Why this priority**: Komfort; setzt US1 voraus. Wird nach der Umsetzung von Teil 1 mit eigenem Review A und Mockup ausgearbeitet.

**Acceptance Scenarios**: folgen in Teil 2 (Entwurf: FR-N20 bis FR-N22).

---

### Edge Cases

- **Harter Wechsel (Q3 B)**: Ab der neuen Version spricht die App nur noch mit dem eigenen Dienst. Geräte mit der alten Version (Update-Hinweis noch nicht bestätigt) senden bzw. lesen weiter bei ntfy.sh und sehen die anderen nicht, bis sie aktualisieren. Darum wird an einem Werktag ausgeliefert, nicht vor einem Spieltag, und der Hinweis an Trainer und Eltern lautet "Torticker einmal öffnen und aktualisieren". Nach dem Update senden Trainer-Handys Konfiguration, Spielplan und offene Spiele beim Start (Spec 006 US2-S10, Spec 015 FR-P07), sodass der Dienst sofort gefüllt ist. Ältere Endstände, die nur bei ntfy.sh lagen, kommen nicht mit.
- **Gratis-Grenze erreicht**: Der Dienst lehnt weitere Anfragen bis Mitternacht UTC ab (1 Uhr, im Sommer 2 Uhr); die App verhält sich wie ohne Netz (US1-S5). Das Mengengerüst liegt weit darunter (research.md R-N1).
- **Dienst ganz weg** (Konto gelöscht, Anbieter stellt den Gratis-Plan ein): Nur die Live-Anzeige fehlt; "Zwischenstand teilen" und "Ergebnis teilen" funktionieren weiter. Ein Wechsel des Anbieters ist eine neue Version der App, kein neuer Link.
- **Alle Links neu ausstellen** (Spec 006 US5-S3): Für das alte Topic behält der Dienst nur den Hinweis "neu ausgestellt"; die gespeicherten Stände des alten Topics werden gelöscht.
- **Kopplung beenden**: ändert beim Dienst nichts; die Stände bleiben für die anderen Trainer und die Zuschauer.
- **Spiel gelöscht oder "Nicht live senden"**: Der Dienst entfernt das Spiel (auch aus "Letzte Spiele"), wie das Dashboard heute (Spec 006 US2-S6, US2-S7).
- **Zwei Handys erfassen dasselbe Spiel** und **Spiel übernehmen** (Spec 006 US5-S5, US6): Der Dienst speichert je Spiel den Stand mit dem größten Übergabezähler bzw. jüngsten Zeitpunkt, wie das Dashboard ordnet; alles andere bleibt Aufgabe des Dashboards.
- **Ungenutzter Live-Spieltag**: Kommt ein Jahr lang keine Meldung, löscht der Dienst alle Daten dieses Live-Spieltags (Datensparsamkeit).
- **Viele Zuschauer**: bis 120 gleichzeitig (Spec 006 SC-L08) ohne Rückfall auf 30-Sekunden-Abfragen.

## Requirements *(mandatory)*

### Functional Requirements

**Dienst (Teil 1)**

- **FR-N01**: Live-Stände, Konfiguration und Spielplan MÜSSEN über genau einen eigenen Vermittlungsdienst laufen, der im Gratis-Plan von Cloudflare betrieben wird. ntfy.sh wird nicht mehr verwendet; der Netzwerk-Wächter lässt nur noch den eigenen Dienst zu, und auch ihn nur bei aktiver Kopplung bzw. geöffnetem Zuschauer-Link (Spec 006 FR-L05).
- **FR-N02**: Der Dienst MUSS je Live-Spieltag speichern: die jüngste Konfiguration, die jüngsten Plan-Meldungen (Änderungen einzelner Planspiele, mindestens 50; Empfänger führen wie bisher zusammen) und je Spiel den jüngsten Live-Stand, je Mannschaft höchstens die 10 jüngsten Spiele (ältere fallen weg). Gelöschte und auf "Nicht live senden" gestellte Spiele MUSS er entfernen.
- **FR-N03**: Wer den Zuschauer-Link öffnet oder ein Trainer-Handy startet, MUSS alles Gespeicherte erhalten. Die Zeitgrenze von rund 12 Stunden aus Spec 006 FR-L16 und Spec 015 FR-P07 entfällt.
- **FR-N04**: Neue Stände MÜSSEN offene Dashboards und Trainer-Handys ohne Neuladen erreichen (SC-L01: 95 % innerhalb von 10 Sekunden), auch bei vielen Zuschauern am selben Anschluss; der Rückfall auf Abfragen alle 30 Sekunden entfällt.
- **FR-N05**: Der Dienst DARF nur verschlüsselte Inhalte sehen (Spec 006 FR-L11 bleibt Ende-zu-Ende). Was er zum Ordnen braucht (welches Spiel, welche Mannschaft, Reihenfolge), darf er nur als Kennungen erhalten, aus denen sich ohne Zuschauer-Link weder Mannschaft noch Gegner noch Namen ableiten lassen.
- **FR-N06**: Speichern, Überschreiben und Löschen beim Dienst MÜSSEN Trainer-Handys (Trainer-Link) und gekoppelten Lead-Handys vorbehalten sein; mit dem Zuschauer-Link ist nur Lesen möglich (US1-S6).
- **FR-N07**: Zuschauer-Link, Trainer-Link und angelegte Home-Bildschirm-Symbole MÜSSEN unverändert gültig bleiben; niemand muss Links neu teilen (Q5).
- **FR-N08**: Der Umstieg MUSS hart erfolgen (Q3 B): Ab der Version mit dem eigenen Dienst sendet und liest die App nur dort. Trainer-Handys senden nach dem Update Konfiguration, Spielplan sowie offene und angelegte Spiele beim Start (vorhandenes Verhalten).
- **FR-N09**: Das Dashboard auf der Seite des Zuschauer-Links MUSS neue Versionen künftig ohne Rückfrage übernehmen (es gibt dort keine Eingaben, die verloren gehen könnten); im Torticker bleibt der Update-Hinweis.
- **FR-N10**: Betrieb und Nutzung MÜSSEN kostenlos bleiben (Constitution VIII): Gratis-Plan ohne Bezahl-Plan; Eltern und Trainer brauchen kein Konto. Überschreitet der Dienst eine Grenze des Gratis-Plans, verhält sich die App wie ohne Netz (US1-S5); die Erfassung ist nie betroffen.
- **FR-N11**: Der Dienst MUSS mit dem Repository versioniert, in der CI getestet und bei jedem Merge auf `main` automatisch ausgeliefert werden (GitHub Actions, Cloudflare-API-Token als Secret).
- **FR-N12**: Der Dienst MUSS Daten eines Live-Spieltags löschen, für den ein Jahr lang keine Meldung kam, und beim Neuausstellen die Stände des alten Topics bis auf den Hinweis "neu ausgestellt".

**Dashboard (Teil 1)**

- **FR-N13**: Das Dashboard MUSS unter den Karten (und den Zeilen "heute noch kein Spiel") einen eigenen, ruhig gestalteten Block "Letzte Spiele" zeigen, zusammenklappbar über seine Überschrift und beim Öffnen des Dashboards immer zugeklappt; aufgeklappt: Filter "Alle" und je Mannschaft des Live-Spieltags (einer auf einmal; Vorgabe "Alle", danach der zuletzt gewählte, gemerkt auf dem Gerät), darunter je Mannschaft bis zu 10 Spiele, neuestes zuerst, unter "Alle" alle Mannschaften gemischt mit Mannschaftskürzel je Zeile, je Zeile Datum, Ergebnis und Gegner aus Sicht der Mannschaft wie "31.10. · 2:1 gegen TSV Musterstadt" bzw. "bei" für Auswärtsspiele (Wortlaut wie "Heute außerdem", Spec 006 FR-L14). Spiele, die heute als Karte oder unter "Heute außerdem" stehen, erscheinen dort nicht. Die Karten bleiben unverändert.

**Push (Teil 2, Entwurf, nicht in diesem Schritt)**

- **FR-N20**: Im Dashboard "Bei Toren benachrichtigen"; auf dem iPhone mit Hinweis, dass Meldungen nur funktionieren, wenn das Dashboard auf dem Home-Bildschirm liegt.
- **FR-N21**: Meldungen je Mannschaft abbestellbar.
- **FR-N22**: Der Dienst weckt nur; Text und Stand entschlüsselt das Gerät (Q2).

### Key Entities

- **Vermittlungsdienst**: ein kleiner Dienst je Konto bei Cloudflare; je Live-Spieltag (Topic) ein abgeschlossener Speicher.
- **Gespeicherter Stand**: verschlüsselte Meldung mit undurchsichtiger Spiel- und Mannschaftskennung, Serverzeit, Übergabezähler bzw. Reihenfolge.
- **Schreibberechtigung**: Nachweis, dass eine Meldung von einem Trainer- oder Lead-Handy stammt (Signatur mit Organisator- bzw. Lead-Schlüssel, research.md R-N4).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-N01**: Ein Gerät, das den Zuschauer-Link zum ersten Mal öffnet, zeigt in 95 % der Fälle innerhalb von 5 Sekunden alle Spiele des Tages, unabhängig davon, wann sie angelegt oder zuletzt gesendet wurden.
- **SC-N02**: Die letzten 10 Spiele jeder Mannschaft sind für jedes neu geöffnete Dashboard sichtbar, auch Wochen später.
- **SC-N03**: Betrieb und Nutzung kosten 0 €; Eltern und Trainer brauchen kein Konto.
- **SC-N04**: 120 gleichzeitige Zuschauer an einem Spieltag bleiben mit großem Abstand unter den Tagesgrenzen des Gratis-Plans (Rechnung in research.md R-N1).
- **SC-N05**: Kein beim Dienst gespeicherter oder übertragener Inhalt enthält Mannschafts-, Gegner- oder Spielernamen im Klartext (automatisch geprüft).
- **SC-N06**: Nach dem Umstieg muss niemand einen Link neu teilen oder ein Symbol neu anlegen.

## Hilfe

| Eintrag | Änderung | Quelle |
|---|---|---|
| `spiel-vorabend` "Kann ich das Spiel schon am Vorabend anlegen?" | geändert: "Ja", der Torticker muss am Spieltag nicht mehr geöffnet werden | 007 US1 |
| `spielplan-fehlt` "Warum fehlt ein Spiel im Spielplan?" (noch offen, Spec 015 T021) | wird ohne den Hinweis auf 12 Stunden angelegt | 007 US2 |
| `eltern-dashboard` "Wie verfolge ich die Spiele als Elternteil?" | geändert: Block "Letzte Spiele" ganz unten, aufklappbar, Filter Alle/E1/E2/E3 | 007 US3 |
| `letzte-spiele` "Wo sehe ich frühere Ergebnisse?" | neu (Eltern-Hilfe) | 007 US3 |
| `datenschutz` | geändert: eigener Dienst bei Cloudflare, nur verschlüsselt, letzte 10 Spiele, Löschung nach einem Jahr | 007 FR-N05, FR-N12 |

## Constitution

Änderung auf Version 3.0.0 (Prinzip II umgedeutet, MAJOR): Statt "genau einen kostenlosen Vermittlungsdienst ohne Konto" ein eigener Vermittlungsdienst im Gratis-Plan eines Anbieters; das Konto beim Anbieter hat der Betreiber, Eltern und Trainer brauchen keins. Der Dienst sieht nur verschlüsselte Daten und hält nur, was für die Anzeige nötig ist. Technische Rahmenbedingungen: statische Seite plus dieser Dienst. Wortlaut in `.specify/memory/constitution.md` (selber PR wie diese Spec).

## Assumptions

- Der Gratis-Plan von Cloudflare (Workers mit Durable Objects, SQLite-Speicher) reicht für das Mengengerüst und rechnet nichts ab; Grenzen und Rechnung in research.md R-N1. Das Konto gehört Atti.
- Eine `…workers.dev`-Adresse genügt; eine eigene Domain ist nicht nötig.
- Die Dashboards rechnen weiter selbst (Tageslogik, Karten, Minute); der Dienst ordnet nur und hält vor.
- Push (US4) wird erst nach Teil 1 spezifiziert.

## Offene Fragen

Keine für Teil 1. Für Teil 2 (Push): Welche Ereignisse lösen eine Meldung aus (nur Tore oder auch Anpfiff, Halbzeit, Endstand)?
