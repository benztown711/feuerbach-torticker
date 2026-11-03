# Implementation Plan: Teilen-Text als Anzeigetafel in Farbe (Spec 005)

**Branch**: `005-teilen-text` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/6gYd7quazK3dMhrPgKU5yd

## Summary

`buildShareText` erzeugt den Text neu: fette Kopfzeile, Infozeile, Datumszeile, Verlauf als Tabelle in Festbreitenschrift mit Farbsymbolen, Elfmeterschießen-Reihen, Torschützen. Die Vorschau in den Spieldetails stellt den Text formatiert dar. Ein PR.

## Technical Context

Wie Spec 001; keine neue Abhängigkeit, keine Datenänderung (Sicherung unverändert).

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| II. Offline-first und lokal | Text entsteht auf dem Gerät, Teilen über das System-Menü | erfüllt |
| III. Datensparsamkeit | Nur Vornamen/Kürzel wie bisher, Lesezeichen nie | erfüllt |
| IV. Spec-first und Test-first | Unit-Tests "005 USx-Sy" vor dem Code, 100 % Branch-Coverage in `src/domain` | erfüllt |
| VI. Einfachheit | Ein Format, keine Einstellung | erfüllt |
| VII. Vereinsdesign | Emojis nur im geteilten Text, nicht in der Oberfläche (design/README.md); Vorschau nutzt Tokens | erfüllt |

## Design

- `src/domain/share-text.ts`
  - `oppSymbol(color)`: Tabelle aus FR-S04, unbekannt ⚪; `OWN_SYMBOL = '🔴'`.
  - Verlauf: Trennzeilen aus den `kickoff`-Uhrereignissen ab Abschnitt 2 (Abschnitt `sections + 1` = "Verlängerung", spätere ohne Trennzeile), Tore aus `goalRows` (ohne entfernte), Karten und Wechsel aus `gameEvents` (ohne Lesezeichen); Sortierung nach Zeit, bei Gleichstand Uhr, Tor, Ereignis (wie `timeline`).
  - Spalten: Minute `padStart(maxMinute)`, Stand `padEnd(maxScore)`, Trenner zwei Leerzeichen; ohne Tore keine Stand-Spalte. Trennzeilen ohne echte Zeile entfallen.
  - Elfmeterschießen: Reihen Heim zuerst, "Schützen:" nur mit mindestens einem Namen.
  - Torschützen: eigene Tore mit Spieler oder Freitext, gezählt, sortiert nach Anzahl und erstem Tor.
  - Infozeile: `interimInfo` liefert den Zusatz ohne " · ".
- `src/ui/components/share-preview.tsx`: zerlegt den Text zeilenweise; Zeilen zwischen ``` als `<pre>`, ganze Zeilen in `*…*` als `<strong>`; nur Textknoten (kein `innerHTML`).
- `src/ui/screens/game-details.tsx`: nutzt die Vorschau-Komponente.
- `design/tokens.json`: Schriftfamilie `mono` (Systemschrift mit fester Breite) nur für die Tabelle in der Vorschau; Ausnahme mit Begründung in `design/README.md`. Logik der Vorschau als reine Funktion `shareBlocks` in `share-text.ts` (testbar).
- Verträge: `specs/001-spiel-erfassen/contracts/share-text.md` neu; Hinweise in Spec 001 (FR-011, FR-042) und 003 (FR-E01, FR-E07, FR-P02, FR-P03).
