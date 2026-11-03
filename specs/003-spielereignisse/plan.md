# Implementation Plan: Spielereignisse und Pokal (Spec 003)

**Branch**: `003-ereignisse-*` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/Fdog1LwXwmUBuA7DDWschA (Bildschirme 3 bis 12)

## Summary

Umsetzung in drei PRs, jeder einzeln auslieferbar:

1. **Teil 1**: Schalter "Im Spiel erfassen" (zunächst "Lesezeichen"), Knopf "Ereignis" (Variante A), Lesezeichen mit Kommentar, Rückgängig, Liste, Spieldetails mit "Lesezeichen kopieren"; Elfmeter-Kennzeichen am Tor (FR-E01, FR-E02 teilweise, FR-E05, FR-E06 ohne Griff, FR-E07 Elfmeter, FR-E08, FR-E09).
2. **Teil 2**: Schalter "Karten" und "Wechsel", Karten (Gelb, Gelb-Rot, Rot, Zeitstrafe) und Wechsel, beide im Teilen-Text, Griff zum Aufklappen der Liste (FR-E02 Rest, FR-E03, FR-E04, FR-E06 Griff, FR-E07 Rest).
3. **Teil 3**: Abfrage bei Unentschieden, Verlängerung, Elfmeterschießen mit Schützenwahl und TV-Übersicht (FR-P01 bis FR-P03).

## Technical Context

Wie Spec 001; keine neue Abhängigkeit.

## Design (Teil 1)

- `Goal.penalty?: boolean`, `Game.events?: GameEvent[]` (optional, ältere Spiele bleiben gültig), `Settings.features` mit Vorgabe aus.
- `src/domain/events.ts`: `addMark` (ab Anpfiff bis Schlusspfiff, Minute = letzter Uhrstand), `setMarkComment` (≤ 60 Zeichen), `removeEvent`, `marksText` (Kurzform, Heim zuerst, Uhrzeit mit Sekunden).
- `goals.ts`: `setPenalty`, `goalSuffix`; Elfmeter und Eigentor schließen sich aus (beide Richtungen).
- Teilen-Text: Elfmeter-Zusatz; Lesezeichen sind keine Tore und erscheinen daher nie.
- Sicherung: `contracts/export.schema.json` und `parseBackup` kennen `penalty` und `events` (optional).
- UI: `game.tsx` (Knopf, Sheets, Hinweis mit "Kommentar"/"Rückgängig"), `goal-list.tsx` (gemischte Liste), `game-details.tsx` (Zeitleiste, Kopieren), `settings.tsx` (Schalter).

## Constitution Check

I (Lesezeichen 2 Taps, große Kacheln), II/III (Lesezeichen bleiben auf dem Gerät und im geteilten Text außen vor), IV (Tests mit IDs "003 …"), VII (Farben nur aus Tokens): erfüllt.
