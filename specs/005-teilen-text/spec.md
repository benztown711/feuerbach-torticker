# Feature Specification: Teilen-Text als Anzeigetafel in Farbe

**Feature Branch**: `005-teilen-text`

**Created**: 2026-11-03

**Status**: Review A und Review B erledigt (03.11.2026). Mockup: https://claude.ai/artifact/6gYd7quazK3dMhrPgKU5yd

**Input**: User description: "Ich würde gern noch am Output-Format für den WhatsApp-Text arbeiten. Ich finde den noch nicht besonders ansprechend."

## Clarifications

### Session 2026-11-03

- Q: Welcher von drei Vorschlägen (A Kompakt, B Spielbericht mit Farbpunkten, C Anzeigetafel in Festbreitenschrift)? → A: Eine Mischung aus B und C: das Tabellen-Layout von C, Farben und Symbole von B.
- Q: Wofür stehen die Farbpunkte? → A: Für die Trikotfarben. Feuerbach ist immer 🔴, auch in Leibchen oder im Auswärtstrikot, weil wir meistens in Rot spielen. Der Gegner bekommt das Emoji seiner Trikotfarbe, sofern es eines gibt. Spielt der Gegner in Rot, bekommt er ⭕.
- Q: Erste Zeile? → A: Ohne Fußball-Emoji, direkt Heim, Ergebnis, Gast. Halbzeitstand, Datum und Uhrzeit bleiben.
- Q: Reihenfolge bei Auswärtsspielen? → A: Heim zuerst wie bisher (wie im Fußball üblich und wie auf dem Spielbildschirm).
- Q: Torschützen gesammelt unter der Tabelle? → A: Behalten.
- Q: Karten, Wechsel, Elfmeterschießen? → A: Bestätigt wie im Mockup: Karten und Wechsel an ihrer Stelle im Verlauf, Elfmeterschießen als Reihen mit ✅/❌.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ergebnis als Anzeigetafel teilen (Priority: P1)

Nach dem Schlusspfiff teilt der Trainer das Ergebnis in die Elterngruppe. Ergebnis, Verlauf und Torschützen sind auf einen Blick lesbar.

**Independent Test**: Heimspiel 2 × 25 mit 7:4 (3:2) erfassen, teilen, Text prüfen.

**Acceptance Scenarios**:

1. **Given** ein Heimspiel von "Sportvg Feuerbach E1" gegen "TSV Musterstadt", 7:4 (3:2), Anpfiff Samstag 07.11.2026 10:30, **When** der Nutzer teilt, **Then** lauten die ersten Zeilen "\*Sportvg Feuerbach E1 7:4 TSV Musterstadt\*", "Halbzeit 3:2" und "Sa, 07.11.2026, 10:30 Uhr".
2. **Given** dasselbe Spiel, **Then** folgt ein Block in Festbreitenschrift (zwischen ``` und ```) mit einer Zeile je Tor in zeitlicher Reihenfolge: Symbol, Minute (rechtsbündig), Stand Heim:Gast, Torschütze; Feuerbach-Tore mit 🔴, Gegentore mit dem Emoji der Gegnerfarbe (Schwarz ⚫); zwischen den Halbzeiten die Zeile "··· Halbzeit ···".
3. **Given** ein Auswärtsspiel 3:1 für Feuerbach, **Then** lautet die erste Zeile "\*TSV Musterstadt 1:3 Sportvg Feuerbach\*" und die Stände in der Tabelle sind Heim:Gast.
4. **Given** Feuerbach-Tore von Max (3), Ben (2), Tom und Leo, **Then** enden der Text mit "\*Torschützen\*" und "Max ⚽⚽⚽ · Ben ⚽⚽ · Tom ⚽ · Leo ⚽" (meiste Tore zuerst, bei Gleichstand wer zuerst getroffen hat); Eigentore des Gegners und Gegentore zählen nicht.
5. **Given** ein Spiel ohne Tore, **Then** besteht der Text nur aus den Kopfzeilen (keine Tabelle, keine Torschützen).
6. **Given** ein als Elfmeter markiertes Tor von Ben, **Then** steht in seiner Zeile "Ben (Elfmeter)".
7. **Given** der Gegner spielt in Rot, **Then** tragen Gegentore ⭕; Feuerbach bleibt 🔴.

---

### User Story 2 - Karten und Wechsel im Verlauf (Priority: P2)

**Independent Test**: Schalter "Karten" und "Wechsel" an, Gelb für Tom und einen Wechsel erfassen, teilen.

**Acceptance Scenarios**:

1. **Given** Gelb für Tom in Minute 52, **Then** steht an dieser Stelle im Verlauf "🟨" mit Minute und "Tom" (Spalte "Stand" leer); Rot 🟥; Gelb-Rot 🟥 mit "(Gelb-Rot)"; Zeitstrafe ⏱️ mit "(Zeitstrafe)".
2. **Given** Rot für den Gegner mit Freitext "Nr. 4", **Then** steht dort "Nr. 4 (Gegner)"; ohne Spieler beim Gegner "Gegner", ohne Spieler bei Feuerbach der Kurzname (z. B. "Feuerbach E1").
3. **Given** der Wechsel "Leo für Paul" in Minute 41, **Then** steht an dieser Stelle "🔄" mit Minute und "Leo für Paul".
4. **Given** ein Spiel mit Lesezeichen, **Then** enthält der Text kein Lesezeichen.

---

### User Story 3 - Pokal (Priority: P2)

**Independent Test**: Pokalspiel mit Verlängerung und Elfmeterschießen 4:3 erfassen, teilen.

**Acceptance Scenarios**:

1. **Given** ein Spiel nach Verlängerung, **Then** enthält die Zeile unter der Kopfzeile "nach Verlängerung" und die Tabelle die Trennzeile "··· Verlängerung ···" vor der ersten Hälfte der Verlängerung.
2. **Given** ein beendetes Elfmeterschießen 4:3 für Feuerbach, **Then** folgt der Kopfzeile fett "\*Feuerbach E1 gewinnt 4:3 im Elfmeterschießen\*" (gewinnt der Gegner: "\*TSV Musterstadt gewinnt 4:3 im Elfmeterschießen\*"); die Tabelle endet mit "··· Elfmeterschießen ···" und je einer Zeile pro Mannschaft (Heim zuerst): Symbol, ✅ oder ❌ je Schuss, Anzahl Treffer.
3. **Given** eigene Schützen Max, Ben, Tom, Leo, Maxi, **Then** steht unter der Tabelle "Schützen: Max, Ben, Tom, Leo, Maxi" (Schussreihenfolge, ohne Namen "?"); ohne jeden Namen entfällt die Zeile.

---

### User Story 4 - Zwischenstand (Priority: P2)

**Independent Test**: Spiel in der 37. Minute, "Zwischenstand teilen".

**Acceptance Scenarios**:

1. **Given** die Uhr läuft in Minute 37 nach einer 3:2-Halbzeit, **Then** lautet die zweite Zeile "Zwischenstand 37' · Halbzeit 3:2" und es gibt keine Datumszeile.
2. **Given** die Halbzeitpause, **Then** lautet die zweite Zeile "Halbzeit" (ohne Stand, er steht schon in der Kopfzeile); bei mehr als zwei Abschnitten "Pause"; vor der Verlängerung "vor der Verlängerung · Halbzeit 1:1".
3. **Given** ein laufendes Elfmeterschießen, **Then** enthält die zweite Zeile "Elfmeterschießen läuft".

---

### User Story 5 - Vorschau wie im Chat (Priority: P3)

**Acceptance Scenarios**:

1. **Given** die Spieldetails, **Then** zeigt die Vorschau des Teilen-Texts die fetten Zeilen fett und die Tabelle in Festbreitenschrift, ohne Sternchen und ```.

---

### Edge Cases

- Spaltenbreiten richten sich nach dem Spiel (z. B. "12:10", "50+12'"), damit Spalten bündig bleiben. Jede Tabellenzeile beginnt mit genau einem Symbol, weil Emojis breiter sind als Buchstaben.
- Bei mehr als zwei Abschnitten heißen die Trennzeilen wie die Abschnitte ("··· 2. Drittel ···"); zwischen den Hälften der Verlängerung gibt es keine Trennzeile.
- Gibt es nur Karten oder Wechsel, aber keine Tore, entfällt die Spalte "Stand".
- Unbekannte Gegnerfarbe (ältere Spiele): ⚪.
- WhatsApp kennt kein Maskieren: Sternchen oder Unterstriche in Mannschaftsnamen können die Formatierung stören (hingenommen).
- In anderen Apps (z. B. iMessage) erscheinen Sternchen und ``` sichtbar und die Spalten verrutschen (hingenommen, Zielgruppe ist WhatsApp, FR-011).
- Elfmeterschießen manuell ohne Entscheidung beendet: Siegerzeile nur bei Unterschied, sonst "\*Elfmeterschießen 3:3\*" (Heim zuerst).

## Requirements *(mandatory)*

### Functional Requirements

Diese Anforderungen ersetzen das Format aus `specs/001-spiel-erfassen/contracts/share-text.md` (FR-011, FR-042) und die Textformen aus Spec 003 (FR-E01, FR-E07, FR-P02, FR-P03). Was geteilt wird, bleibt gleich; nur die Darstellung ändert sich.

- **FR-S01**: Die erste Zeile MUSS fett "\*{Heim} {ToreHeim}:{ToreGast} {Gast}\*" lauten, ohne Emoji, Heim zuerst. Nach einem beendeten Elfmeterschießen MUSS fett "\*{Sieger} gewinnt {x}:{y} im Elfmeterschießen\*" folgen (Feuerbach mit Kurzname, Stand aus Sicht des Siegers).
- **FR-S02**: Danach MUSS eine Infozeile aus den vorhandenen Teilen, getrennt durch " · ", folgen: Zwischenstand-Zusatz (FR-042: "Zwischenstand 37'", "Halbzeit", "Pause", "vor der Verlängerung"), "nach Verlängerung", "Halbzeit {h}:{a}" (nur bei mehr als einem Abschnitt, nicht in der Halbzeitpause), "Elfmeterschießen läuft". Außer beim Zwischenstand MUSS eine Datumszeile "Sa, 07.11.2026, 10:30 Uhr" folgen (ohne Anpfiff nur "Sa, 07.11.2026").
- **FR-S03**: Tore, Karten und Wechsel MÜSSEN in einem Block in Festbreitenschrift (``` am Anfang und Ende) chronologisch stehen, je Zeile: genau ein Symbol, Minute rechtsbündig, Stand Heim:Gast (nur bei Toren), Text. Trennzeilen "··· Halbzeit ···" (zwei Abschnitte), "··· 2. Drittel ···" usw., "··· Verlängerung ···". Ohne Tore, Karten, Wechsel und Elfmeterschießen entfällt der Block. Seit Spec 009 steht eine Vorlage in der Zeile des Tores: "{Torschütze} (Vorlage {Vorlagengeber})" (FR-V07).
- **FR-S04**: Symbole: Feuerbach immer 🔴. Gegner nach Trikotfarbe: Rot ⭕, Schwarz ⚫, Weiß ⚪, Grau ⚪, Gelb 🟡, Orange 🟠, Grün 🟢, Hellblau/Blau/Dunkelblau 🔵, Lila 🟣, Bordeaux 🟤, unbekannt ⚪. Karten: Gelb 🟨, Gelb-Rot 🟥 "(Gelb-Rot)", Rot 🟥, Zeitstrafe ⏱️ "(Zeitstrafe)". Wechsel 🔄 "{rein} für {raus}". Gegner-Karten mit "(Gegner)".
- **FR-S05**: Ein Elfmeterschießen mit mindestens einem Schuss MUSS den Block mit "··· Elfmeterschießen ···" und je einer Zeile pro Mannschaft (Heim zuerst) abschließen: Symbol, ✅/❌ je Schuss, Treffer. Darunter "Schützen: …" mit den eigenen Schützen in Schussreihenfolge (ohne Namen "?"), sofern mindestens einer benannt ist.
- **FR-S06**: Haben eigene Spieler getroffen, MUSS der Text mit "\*Torschützen\*" und einer Zeile "{Name} ⚽… · …" enden (meiste Tore zuerst, bei Gleichstand das frühere erste Tor). Gegentore und Eigentore des Gegners zählen nicht.
- **FR-S07**: Die Vorschau in den Spieldetails MUSS den Text wie WhatsApp darstellen (fett, Tabelle in Festbreitenschrift, ohne Formatierungszeichen).
- **FR-S08**: Lesezeichen erscheinen NIE im Teilen-Text (wie FR-E07).

### Key Entities

Keine neuen Daten. Der Text entsteht aus Spiel, Kader und Trikotfarbe des Gegners.

## Success Criteria *(mandatory)*

- **SC-S01**: Ergebnis und Gegner stehen in der ersten Zeile und sind damit in der WhatsApp-Mitteilung lesbar.
- **SC-S02**: In WhatsApp auf dem iPhone stehen Minute, Stand und Name aller Tabellenzeilen bündig untereinander (Prüfung durch Atti in Review C).

## Assumptions

- Zielgruppe ist WhatsApp (FR-011); andere Messenger zeigen die Formatierungszeichen.
- Keine Einstellung für alternative Formate (YAGNI).
