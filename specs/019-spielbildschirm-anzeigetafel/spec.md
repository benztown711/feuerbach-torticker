# Feature Specification: Spielbildschirm mit Anzeigetafel und sicherem Rückgängig

**Feature Branch**: `019-spielbildschirm-anzeigetafel`

**Created**: 2026-11-16

**Status**: Freigegeben. Mockup vorab freigegeben (16.11.2026, "Okay" auf Variante "Empfehlung" einschließlich Wegfall des Griffs). Review A erledigt (16.11.2026, "1A 2A 3A 4A"). US1 bis US3 umgesetzt (PR #86), Review C offen. Mockup: https://claude.ai/artifact/98UF1ac9XQguthKaAr1uPu

**Input**: Design-Check (Impeccable) des Spielbildschirms vom 07.11.2026 mit Urteil "nachbessern" (UX 31/40, Technik 16/20) und Atti (16.11.2026): "Okay" auf die Empfehlung: Anzeigetafel-Zeile, Rückgängig als eigenes Band, Aufklappen der Torliste entfällt, Bedienelemente nach Constitution I.

## Ausgangslage

Gesichtet am 07.11.2026 (Design-Check mit Messung auf iPhone 393 × 659 und iPhone SE 375 × 667, hell und dunkel):

- **Rückgängig (P1)**: Die Leiste "Tor … erfasst" liegt in `surface-alt` über der gleichfarbigen Torliste, getrennt nur durch eine 1-px-Linie. Der Knopf "Rückgängig" misst 93 × 40 pt. In der Sonne liest sich die Leiste wie eine weitere Listenzeile; mit Handschuhen oder nassen Fingern ist der Knopf zu klein. Dasselbe gilt für die Leisten nach Karte, Wechsel und Lesezeichen und für "Korrigiert. Ergebnis neu teilen?" (Spec 017 FR-C21).
- **Doppeltipp**: "Schon gezählt" und die Rückgängig-Leiste stapeln sich in derselben Farbe und verdecken zusammen die Torliste.
- **Spielstand und Uhr**: Spielstand 48 px in Fira Sans, Uhr 44 px in Fira Sans Extra Condensed: zwei fast gleich laute Zahlen in zwei Schriften. Der Stil `ergebnis` (64 px, Display), den `design/README.md` für Spielstand und Uhr vorsieht, wird nicht genutzt. Die Mannschaftsnamen stehen in einer eigenen Zeile an den Außenrändern, rund 100 pt von den Ziffern entfernt.
- **Bedienelemente unter 64 pt**: "Uhr anhalten", "Uhr fortsetzen", "Pausenpfiff"/"Abpfiff" und "Anpfiff" sind 48 pt hoch, Torzeilen 40 pt (Constitution I: primäre Schaltflächen mindestens 64 × 64 pt).
- **Griff der Torliste** (Spec 003, Klärung zu FR-E06): ein 40 × 6 Balken in `line` auf `surface`, Kontrast etwa 1,4:1. Aufgeklappt verschwinden die Uhr-Knöpfe und die Ereignis-Zeile; man gewinnt etwa eine Listenzeile. Die Liste scrollt ohnehin in sich (FR-034).
- **Tor-Knöpfe**: 29 % der Höhe (mindestens 150, höchstens 260 px), 8 px Abstand zwischen Heim und Gast.

## Clarifications

### Session 2026-11-16 (Klärung im Chat)

- Q: Welche Variante aus dem Mockup? → A: "Empfehlung" (nicht die Alternative "nur Rückgängig-Band und 64-pt-Knöpfe").
- Q: Darf das Aufklappen der Torliste (Griff, Spec 003 Klärung zu FR-E06) entfallen? → A: Ja.
- Q: Band dunkel, ein Meldeplatz, Vorrang der Torliste auf dem SE, Doppelpfeil unter dem Spielstand? → A: Alle wie empfohlen ("1A 2A 3A 4A"):
  - Das Rückgängig-Band ist dunkel (`ink`, Schrift `surface`), in beiden Themes die Umkehrung des Grundes wie der Hauptknopf. `design/README.md` wird dafür angepasst und begründet (bisher "Undo-Leiste: `surface-alt`").
  - Alle Leisten an dieser Stelle (Tor, Karte, Wechsel, Lesezeichen, "Korrigiert. Ergebnis neu teilen?") und die kurzen Hinweise ("Schon gezählt", Teilen-Ergebnis, Übergabe an ein anderes Handy) teilen sich einen einzigen Meldeplatz; es steht immer höchstens eine Meldung da.
  - Auf dem iPhone SE hat die Torliste Vorrang vor größeren Tor-Knöpfen: mindestens zwei Torzeilen bleiben sichtbar, auch mit Ereignis-Zeile.
  - Vor dem Anpfiff steht der Doppelpfeil "Heim und Gast tauschen" unter dem Spielstand in der Anzeigetafel.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rückgängig sicher treffen (Priority: P1)

Max' Vater tippt am Spielfeldrand aus Versehen auf "TOR TSV Musterstadt" statt auf "TOR Feuerbach". Direkt über den Tor-Knöpfen erscheint ein dunkles Band "Tor TSV Musterstadt 15' erfasst" mit einem großen Knopf "Rückgängig". Er trifft ihn auch in der Sonne und mit kalten Fingern auf Anhieb; der Spielstand stimmt wieder.

**Why this priority**: Einziger P1-Befund des Design-Checks. "Rückgängig" ist der schnellste Weg, den häufigsten Fehler (falsche Mannschaft) zurückzunehmen, und heute der am schlechtesten erkennbare Knopf.

**Independent Test**: Spiel anpfeifen, "TOR" einer Mannschaft tippen; das Band erscheint dunkel über den Tor-Knöpfen, "Rückgängig" misst mindestens 64 × 64 pt und nimmt das Tor zurück. Schnell zweimal "TOR" tippen: "Schon gezählt" erscheint im selben Band, nicht als zweite Leiste.

**Acceptance Scenarios**:

1. **Given** ein laufendes Spiel, **When** der Nutzer "TOR" einer Mannschaft tippt, **Then** erscheint direkt über den Tor-Knöpfen über die ganze Breite ein Band in `ink` mit Schrift in `surface` ("Tor <Mannschaft> <Minute> erfasst") und dem Knopf "Rückgängig" (mindestens 64 × 64 pt, Fläche `surface`, Schrift `ink`); Tor-Knöpfe und Uhr-Knöpfe bleiben vollständig sichtbar.
2. **Given** das Band nach einem Tor, **When** der Nutzer innerhalb von 10 Sekunden "Rückgängig" tippt, **Then** wird das Tor entfernt, der Spielstand korrigiert und das Band verschwindet (FR-008 unverändert).
3. **Given** ein Tor wurde eben gezählt, **When** der Nutzer innerhalb der Doppeltipp-Sperre erneut auf denselben Tor-Knopf tippt, **Then** zeigt das Band zusätzlich "Schon gezählt"; es erscheint keine zweite Leiste und das Tor zählt nur einmal.
4. **Given** "Karte", "Wechsel" oder "Lesezeichen" ist eingeschaltet, **When** eine Karte, ein Wechsel oder ein Lesezeichen erfasst wird, **Then** erscheint die Meldung im selben Band mit "Rückgängig" (beim Lesezeichen zusätzlich "Kommentar"), beide Knöpfe mindestens 64 pt hoch.
5. **Given** ein beendetes, schon geteiltes Spiel wird korrigiert, **When** "Korrigiert. Ergebnis neu teilen?" erscheint (Spec 017 FR-C21), **Then** steht die Meldung im selben Band, "Teilen" mindestens 64 pt hoch.
6. **Given** helles und dunkles Theme, **Then** hebt sich das Band in beiden deutlich von Torliste und Hintergrund ab (Kontrast der Bandfläche zum Hintergrund mindestens 3:1, Schrift im Band mindestens 4,5:1).

---

### User Story 2 - Spielstand auf einen Blick (Priority: P2)

Eine Mutter kommt zur zweiten Halbzeit dazu und fragt "Wie steht's?". Ein Blick auf das Handy: In einer Zeile stehen "Feuerbach", groß "2 : 1" und "TSV Musterstadt", jeweils mit Farbmarke; darunter etwas kleiner die Uhr in derselben Schrift.

**Why this priority**: Die häufigste Frage am Spielfeldrand. Heute konkurrieren Spielstand und Uhr gleich laut, und welche Ziffer zu welcher Mannschaft gehört, erschließt sich nur über links und rechts.

**Independent Test**: Spiel mit 2:1 öffnen; Spielstand im Stil `ergebnis` (64 px, Display-Schrift) zwischen den Namen, Uhr darunter kleiner in derselben Schrift; keine eigene Namenszeile mehr.

**Acceptance Scenarios**:

1. **Given** ein laufendes Spiel 2:1, **When** der Spielbildschirm offen ist, **Then** steht in einer Zeile links Farbmarke und Name der Heim-Mannschaft, in der Mitte der Spielstand "2 : 1" im Stil `ergebnis` (64 px, Display-Schrift, gleich breite Ziffern), rechts Name und Farbmarke der Gast-Mannschaft.
2. **Given** dieselbe Anzeigetafel, **Then** steht die Uhr darunter in derselben Display-Schrift, deutlich kleiner als der Spielstand, mit der Beschriftung darunter wie bisher ("Restzeit", Nachspielzeit in `rot-text`).
3. **Given** ein langer Gegnername ("Sportfreunde Musterstadt-Nord"), **Then** bricht er neben dem Spielstand auf höchstens zwei Zeilen um, erst danach "…" (FR-040 gilt weiter); der Spielstand wird nie verkleinert oder abgeschnitten.
4. **Given** ein noch nicht angepfiffenes Spiel, **Then** steht der Doppelpfeil "Heim und Gast tauschen" unter dem Spielstand und tauscht wie bisher; nach dem Anpfiff entfällt er.
5. **Given** ein zweistelliger Spielstand (10:9), **Then** passt er auf dem iPhone SE in eine Zeile neben beide Namen.
6. **Given** ein Elfmeterschießen läuft, **Then** bleibt die Anzeigetafel mit dem Spielstand nach der regulären Spielzeit oben stehen; darunter folgt die Ansicht des Elfmeterschießens wie bisher.

---

### User Story 3 - Große Knöpfe, ruhige Torliste (Priority: P2)

Der Trainer hält das Handy in einer Hand. "Uhr anhalten" und "Pausenpfiff" sind so groß wie die Felder einer Tastatur am Bankautomaten; die Torliste zeigt die Tore ohne versteckten Griff und scrollt in sich. Die Tor-Knöpfe sind ein Stück größer und weiter auseinander.

**Why this priority**: Constitution I (64 pt) und weniger Fehltipps; der Griff ist ein versteckter Zustand, der die Uhr-Knöpfe verschwinden lässt.

**Independent Test**: Spiel anpfeifen; "Uhr anhalten", "Pausenpfiff" mindestens 64 pt hoch, Torzeilen mindestens 48 pt, kein Griff; auf dem iPhone SE ohne Seiten-Scroll, mit sichtbaren zwei Torzeilen auch bei eingeschalteter Ereignis-Zeile.

**Acceptance Scenarios**:

1. **Given** ein Spiel vor dem Anpfiff, in der Pause, laufend, angehalten oder beendet, **Then** sind die Knöpfe unter der Uhr ("Anpfiff", "Anpfiff 2. Halbzeit", "Uhr anhalten", "Uhr fortsetzen", "Pausenpfiff", "Abpfiff", "Spieldetails", "Ergebnis teilen") mindestens 64 pt hoch und mindestens 64 pt breit.
2. **Given** Tore in der Torliste, **Then** ist jede Zeile mindestens 48 pt hoch und weiter antippbar (Tor-Blatt, Spec 001, 012, 017).
3. **Given** Tore und Ereignisse in der Torliste, **Then** gibt es keinen Griff zum Aufklappen mehr; Uhr-Knöpfe und Ereignis-Zeile bleiben immer sichtbar; mehr Einträge als Platz scrollen innerhalb der Liste.
4. **Given** iPhone SE (375 × 667 pt), **When** das Spiel läuft und "Karte", "Wechsel" und "Lesezeichen" eingeschaltet sind, **Then** ist der Bildschirm ohne Seiten-Scroll bedienbar und die Torliste zeigt mindestens zwei Zeilen vollständig (FR-033).
5. **Given** ein iPhone mit mehr Höhe als das SE, **Then** wachsen die Tor-Knöpfe bis etwa ein Drittel der Bildschirmhöhe, der Abstand zwischen Heim und Gast beträgt 12 pt; sie sind nie kleiner als 150 pt hoch.

---

### Edge Cases

- Band und Tor-Auswahl: Öffnet sich nach einem Tor die Torschützen-Auswahl, bleibt das Band wie bisher verborgen und erscheint nach dem Schließen, solange die 10 Sekunden laufen.
- Band über der Torliste: Das Band legt sich über den unteren Teil der Torliste; es verdeckt nie Tor-Knöpfe, Uhr-Knöpfe oder die Ereignis-Zeile. Nach 10 Sekunden ist die Liste wieder ganz sichtbar.
- Zwei Meldungen gleichzeitig (z. B. Tor eben gezählt, dann Lesezeichen): Es gilt die bisherige Rangfolge (Tor vor Lesezeichen vor Karte/Wechsel vor "neu teilen"); kurze Hinweise erscheinen als zweite Zeile im aktuellen Band oder, ohne Band, allein im Meldeplatz.
- Lesezeichen mit zwei Knöpfen ("Kommentar", "Rückgängig"): Der Text darf auf zwei Zeilen umbrechen; beide Knöpfe bleiben mindestens 64 pt hoch.
- Langer Hinweis "Feuerbach E1 überträgt jetzt ein anderes Handy. Hier wird nur noch lokal erfasst.": bricht im Meldeplatz um, höchstens drei Zeilen.
- Gleiche Trikotfarbe des Gegners wie das Band (z. B. Schwarz im hellen Theme): Das Band liegt nie direkt auf dem Tor-Knopf, sondern mit Abstand darüber; Rahmenregel der Tor-Knöpfe (FR-032) gilt weiter.
- Spielstand 10:10 und lange Namen auf dem SE: Namen brechen um, dann "…"; der Spielstand bleibt in einer Zeile.
- Nachspielzeit: Uhr und Beschriftung in `rot-text` wie bisher, auch in der neuen Schrift.
- Live-Anzeige anderer Spiele (Spec 006, "LiveOthers") oberhalb der Anzeigetafel bleibt an ihrem Platz; FR-033 gilt mit ihr.

## Requirements *(mandatory)*

### Functional Requirements

**Meldeband (US1)**

- **FR-A01**: Nach dem Erfassen eines Tores MUSS direkt über den Tor-Knöpfen ein Band über die ganze Inhaltsbreite erscheinen: Fläche `ink`, Schrift `surface` (in beiden Themes), Text "Tor <Mannschaft> <Minute> erfasst" fett, rechts der Knopf "Rückgängig" mit Symbol, mindestens 64 × 64 pt, Fläche `surface`, Schrift `ink`. Das Band legt sich über den unteren Teil der Torliste und verdeckt keine Tor-Knöpfe, Uhr-Knöpfe und keine Ereignis-Zeile. Dauer und Wirkung wie FR-008 (10 Sekunden).
- **FR-A02**: Die Leisten nach Karte, Wechsel und Lesezeichen (Spec 003) sowie "Korrigiert. Ergebnis neu teilen?" (Spec 017 FR-C21) MÜSSEN dasselbe Band nutzen; jeder Knopf darin ("Rückgängig", "Kommentar", "Teilen") mindestens 64 pt hoch.
- **FR-A03**: Es MUSS immer höchstens eine Meldung im Band stehen (Meldeplatz). Rangfolge bei gleichzeitigen Meldungen wie bisher: Tor, Lesezeichen, Karte/Wechsel, "neu teilen".
- **FR-A04**: Kurze Hinweise ohne Knopf ("Schon gezählt", Ergebnis der Teilen-Aktion, Übergabe an ein anderes Handy) MÜSSEN im Meldeplatz erscheinen: steht ein Band, als zusätzliche Zeile darin, sonst allein im Band. Hinweise stapeln sich nie als eigene Leisten übereinander.
- **FR-A05**: `design/README.md` MUSS die Zeile "Torliste, Undo-Leiste" aufteilen: Torliste weiter `surface-alt`; Meldeband `ink` mit Schrift `surface`, Knopf darin `surface` mit Schrift `ink`, mit Begründung (Erkennbarkeit in der Sonne, Umkehrung wie der Hauptknopf, Design-Check vom 07.11.2026). Die Kontrastprüfung (SC-006 aus Spec 001) MUSS das Band in beiden Themes abdecken.

**Anzeigetafel (US2)**

- **FR-A10**: Namen und Spielstand MÜSSEN eine gemeinsame Zeile bilden: links Farbmarke und Name der Heim-Mannschaft (linksbündig), Mitte der Spielstand, rechts Name und Farbmarke der Gast-Mannschaft (rechtsbündig). Die bisherige eigene Namenszeile entfällt. Namen folgen FR-040 (Kurzform der eigenen Mannschaft, höchstens zwei Zeilen, dann "…").
- **FR-A11**: Der Spielstand MUSS im Stil `ergebnis` aus `design/tokens.json` stehen (64 px, Display-Schrift, fett, gleich breite Ziffern) und darf nie verkleinert, umbrochen oder abgeschnitten werden; bei Platzmangel weichen die Namen.
- **FR-A12**: Die Uhr MUSS unter der Anzeigetafel in derselben Display-Schrift stehen, sichtbar kleiner als der Spielstand (etwa 40 px), mit gleich breiten Ziffern; Beschriftung und Farben (Restzeit, Nachspielzeit, Aufblinken bei Signal) wie bisher.
- **FR-A13**: Vor dem ersten Anpfiff MUSS der Knopf "Heim und Gast tauschen" (Doppelpfeil, mindestens 44 × 44 pt) unter dem Spielstand stehen; nach dem Anpfiff entfällt er wie bisher.
- **FR-A14**: Während eines Elfmeterschießens MUSS die Anzeigetafel mit dem Spielstand nach regulärer Spielzeit stehen bleiben; Ergebnis "i. E." und Ansicht des Elfmeterschießens folgen darunter wie bisher.

**Knöpfe und Torliste (US3)**

- **FR-A20**: Alle Knöpfe in der Zeile unter der Uhr ("Anpfiff …", "Uhr anhalten", "Uhr fortsetzen", "Pausenpfiff", "Abpfiff", "Spieldetails", "Ergebnis teilen") MÜSSEN mindestens 64 pt hoch und mindestens 64 pt breit sein (Constitution I).
- **FR-A21**: Jede Zeile der Torliste auf dem Spielbildschirm MUSS mindestens 48 pt hoch sein.
- **FR-A22**: Der Griff zum Aufklappen der Torliste MUSS entfallen (ersetzt die Klärung "Griff klappt die Torliste über die Uhr-Knöpfe auf" zu Spec 003 FR-E06). Uhr-Knöpfe und Ereignis-Zeile sind immer sichtbar; die Torliste scrollt in sich (FR-034).
- **FR-A23**: Die Tor-Knöpfe MÜSSEN den übrigen Platz nutzen, bis höchstens etwa ein Drittel der Bildschirmhöhe, mindestens 150 pt hoch; Abstand zwischen Heim und Gast 12 pt. Vorrang hat FR-A24.
- **FR-A24**: Auf 375 × 667 pt (iPhone SE) MUSS der Spielbildschirm in jedem Zustand ohne Seiten-Scroll bedienbar sein (FR-033) und die Torliste mindestens zwei Zeilen vollständig zeigen, auch wenn alle drei Ereignis-Schalter an sind.

**Unverändert**

- **FR-A30**: Verhalten, Texte und Abläufe des Spielbildschirms MÜSSEN ansonsten gleich bleiben: Tor-Knöpfe (FR-016, FR-031, FR-032), Doppeltipp-Sperre, 10 Sekunden Rückgängig (FR-008), Torschützen-Auswahl, Ereignis-Zeile (Spec 003 FR-E09), "…"-Menü, Navigationsleiste (FR-037). Nachtrag 17.11.2026: Das "…"-Menü ändert Spec 020 (FR-E02: "Eltern live zuschauen lassen" als erster Eintrag; FR-E18: "Teilen" statt "Zwischenstand teilen"); "Ergebnis teilen" teilt weiter direkt (FR-E19, Präzisierung 2026-11-17). Größen nach FR-A20 bleiben. Nachtrag 18.11.2026, geändert durch Spec 020 Nachbesserung FR-E60, FR-E61: Das Spielmenü "…" hat keinen Eintrag "Eltern live zuschauen lassen" mehr; "Teilen" ist der erste Eintrag, "Nicht live senden" bzw. "Live senden" der letzte (Gefahr-Gestaltung), und "Schließen" ist auf 375 × 667 pt ohne Scrollen sichtbar.

### Key Entities

Keine neuen Daten. Betroffen sind nur Darstellung und Anordnung des Spielbildschirms sowie `design/README.md`.

## Hilfe *(mandatory)*

| Eintrag | Änderung | Quelle |
|---|---|---|
| neu: "Was zeigt der Spielbildschirm?" | oben die Anzeigetafel mit beiden Mannschaften und dem Spielstand, darunter die Uhr und ihre Knöpfe, dann die Torliste (in sich scrollbar, Tor antippen zum Ändern), unten die Tor-Knöpfe; Meldungen erscheinen im dunklen Band über den Tor-Knöpfen | 019 US2, 019 US3 |
| `tor-entfernen` "Wie entferne ich ein Tor?" | geändert: "Rückgängig" steht im dunklen Band direkt über den Tor-Knöpfen | 001 US1, 017 US1, 019 US1 |
| `tor` "Wie erfasse ich ein Tor?" | geändert: Doppeltipp zählt nur einmal, im Band steht dann "Schon gezählt" | 001 US1, 019 US1 |

Kein Eintrag entfällt; der Griff hatte keinen eigenen Hilfe-Eintrag.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-A01**: "Rückgängig" ist nach jedem Tor mit einem Tipp erreichbar und mindestens 64 × 64 pt groß; das Band hebt sich in beiden Themes mit mindestens 3:1 von Hintergrund und Torliste ab, seine Schrift mit mindestens 4,5:1.
- **SC-A02**: Der Spielstand ist das größte Element oberhalb der Tor-Knöpfe (64 px) und steht in derselben Zeile wie beide Mannschaftsnamen.
- **SC-A03**: Alle Knöpfe unter der Uhr sind mindestens 64 pt hoch, alle Torzeilen mindestens 48 pt; der Spielbildschirm hat keinen Griff mehr.
- **SC-A04**: Auf dem iPhone SE ist der Spielbildschirm in jedem Zustand ohne Seiten-Scroll bedienbar und zeigt mindestens zwei Torzeilen, auch mit Ereignis-Zeile.
- **SC-A05**: Es stehen nie zwei Meldungen übereinander; nach einem Doppeltipp ist genau ein Band sichtbar.
- **SC-A06**: Ein erneuter Design-Check des Spielbildschirms ergibt keinen P0- oder P1-Befund.
- **SC-A07**: axe-core ohne Verstöße, Kontrastmatrix beider Themes grün; die visuellen Referenzbilder des Spielbildschirms sind neu erzeugt und zeigen den neuen Stand.

## Assumptions

- Grundlage ist das freigegebene Mockup (Variante "Empfehlung"); Abweichungen im Detail (Abstände, genaue Uhrgröße) folgen den Tokens aus `design/tokens.json`.
- Die Knöpfe der Ereignis-Zeile ("Karte", "Wechsel", "Lesezeichen") behalten ihre Höhe (Spec 003 FR-E09); sie sind keine primären Aktionen.
- Die Mannschaftsnamen bleiben in der bisherigen Größe (15 px fett) statt `zwischentitel`, damit Spielstand und Namen auf dem iPhone SE in eine Zeile passen.
- Der "…"-Knopf oben rechts (44 × 44 pt) und die Navigationsleiste (FR-037) bleiben unverändert.
- Die visuellen Referenzbilder (`tests/e2e/visual.spec.ts-snapshots/`) werden im Playwright-Image der CI neu erzeugt; lokal weicht die Schrift ab. Der Verdacht aus dem Design-Check (07.11.2026), die Referenzen für "Spiel läuft" seien veraltet, hat sich nicht bestätigt: Der Vergleich lief am 16.11.2026 in allen Profilen grün; zarte Flächen wie `surface-alt` auf `surface` und der Griff liegen unter der Toleranz des Bildvergleichs.
- Spieldetails, Historie und Dashboard sind nicht betroffen; ihre Leisten ("Rückgängig" nach dem Löschen, "Korrigiert. Ergebnis neu teilen?" in den Spieldetails) bleiben wie sie sind. Das Band gilt nur für den Spielbildschirm.
