# Implementation Plan: Startbildschirm mit "E2 übernehmen" und "Spiele verfolgen"

**Branch**: `claude/admiring-heisenberg-k8cbod` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

## Summary

Der Startbildschirm ersetzt die Zeile "Live: …" durch den Knopf "Spiele verfolgen" (öffnet das Dashboard in der App) und zeigt je laufendem Spiel eines anderen Handys "E2 übernehmen" mit Rückfrage. Die Übernahme selbst ist unverändert aus Spec 006 (FR-L23).

## Technical Context

Preact, TypeScript, Vite; keine neue Abhängigkeit. Empfang über den bestehenden `live-receiver` (eigener Dienst, Spec 007). Hauptbundle-Budget 60 KB gzip: die Übernehmen-Knöpfe liegen in einem nachgeladenen Baustein (`start-offers`), nur auf gekoppelten Handys.

## Constitution Check

- I: Knöpfe mindestens 64 pt hoch, Übernehmen mit Rückfrage (kein versehentliches Übernehmen).
- II: Verbindung nur bei aktiver Kopplung und nur solange der Startbildschirm sichtbar ist (FR-006); Zuschauer-Handys bauen auf dem Startbildschirm keine Verbindung auf.
- V: Minute in der Unterzeile aus dem Spielverlauf (`boardView`).
- VII: Farben nur über Tokens. IX: Hilfe-Einträge im selben PR.

## Design

- `src/domain/live-board.ts`: `takeoverOffers(board, teams, localIds, serverNow)`: Karten mit `group === 'running'` der sendbaren Mannschaften, ohne eigene Spiele, Reihenfolge des Dashboards; ohne Altersgrenze (anders als `runningElsewhere`, FR-L22).
- `src/platform/live-watch.ts`: `watchStart(live)` mit `offers`, `takeover`, `onChange`, `stop`; Angebote nur bei Verbindung (`relay === 'live'`), ein gemerkter Stand reicht nicht.
- `src/ui/components/start-offers.tsx`: Knöpfe "E2 übernehmen", Rückfrage, Übernahme; Empfang endet bei `visibilitychange` hidden. Eigene Spiele sind die lokalen, nicht abgegebenen; ein abgegebenes Spiel kann zurückgenommen werden (gleiche Kennung, ersetzt das lokale Spiel).
- `src/ui/screens/start.tsx`: "Spiele verfolgen" (gekoppelt nicht neu ausgestellt, oder nur Zuschauer-Link) → `/live-spieltag/dashboard`; Trainer-Karte wie bisher, wenn nicht gekoppelt oder neu ausgestellt.

## Tests

- Unit: `tests/unit/live-board.test.ts` (018 US2-S1, S4, S5, S6, S7).
- E2E: `tests/e2e/startbildschirm.spec.ts` (US1-S1 bis S5, S7; US2-S1 bis S10; axe hell und dunkel). Angepasst: Tests mit der Zeile "Live: …" (012, 006 US1, 016 US4); US1-S6 deckt `spieltag-sicher-us1.spec.ts` (neu ausgestellt) ab.
