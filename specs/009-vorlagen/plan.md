# Implementation Plan: Vorlagen (Spec 009)

**Branch**: `009-vorlagen` (Arbeitszweig `claude/cool-cannon-xzckot`) | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/D7nnJDsmPzC2rGDxsyp9NK

## Summary

Ein Tor bekommt optional einen Vorlagengeber (Kaderspieler). Mit dem Schalter "Vorlagen" fragt die Torschützen-Auswahl nach dem Schützen im selben Fenster "Vorlage von?" (5 s); nachträglich über "Vorlage ändern" im Tor-Fenster. Eine gemeinsame Beschriftung `goalWho` liefert für Torliste, Tor-Fenster und Spieldetails "Max (Vorlage: Ben)" ohne Mannschaftsnamen (FR-V11); Teilen-Text und Dashboard zeigen dasselbe. Ein PR (#31) mit Spec, Plan, Tasks und Umsetzung, weil das Feature klein ist und dieser Arbeitszweig der einzige ist.

## Technical Context

Wie Spec 001 (Preact, TypeScript, Vite, IndexedDB); keine neue Abhängigkeit. Datenänderung: zwei optionale Felder (`Goal.assist`, `EventFeatures.assists`), keine Migration nötig. Live-Nachricht bleibt `v: 1`, das neue Feld ist optional.

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Tor bleibt ein Tap; Vorlage optional, schließt nach 5 s von selbst, Rückgängig bleibt erreichbar; Knöpfe wie FR-030 (≥ 64 pt) | erfüllt |
| II. Offline-first und lokal | Nur lokale Daten; die Live-Kopplung überträgt zusätzlich den Anzeigenamen des Vorlagengebers (Spec 006 FR-L10 ergänzt), Ende-zu-Ende verschlüsselt wie bisher | erfüllt |
| III. Datensparsamkeit | Nur Anzeigename (Vorname bzw. Kürzel), nie Rückennummer in der Anzeige (FR-V09) | erfüllt |
| IV. Spec-first und Test-first | Unit-Tests "009 FR-V0x", E2E "009 USx-Sy" vor dem Code; 100 % Branch-Coverage in `src/domain` | erfüllt |
| VI. Einfachheit | Eine Vorlage je Tor, keine Statistik, Wiederverwendung der Torschützen-Auswahl | erfüllt |
| VII. Vereinsdesign | Keine neuen Farben oder Stile; vorhandene Klassen der Auswahl und des Tor-Fensters | erfüllt |

## Research

### R-V1 Ablage der Vorlage

- **Decision**: `Goal.assist?: string | null` mit der Kaderspieler-ID (wie `Scorer.playerId`). Fehlt bei älteren Spielen und bedeutet "keine".
- **Rationale**: Gelöschte Spieler bleiben über die ID lesbar (FR-029); Umbenennungen wirken wie beim Torschützen.
- **Alternatives considered**: Freitext (unnötig, nur eigene Spieler); eigenes Ereignis in `events` (würde Torliste, Teilen-Text und Löschen doppelt pflegen).

### R-V2 Gültigkeit an einer Stelle

- **Decision**: `canHaveAssist(goal)` (eigenes Tor, Spieler als Torschütze, kein Elfmeter). `setAssist` lehnt Ungültiges ab; `setScorer` und `setPenalty` entfernen eine Vorlage, die danach nicht mehr gültig wäre (FR-V05). So kann kein Weg eine ungültige Kombination speichern.

### R-V3 Beschriftung ohne Mannschaftsnamen (FR-V11)

- **Befund**: Die Spieldetails nutzen die Regel schon (`game-details.tsx`: Torschütze, beim Gegner mit "(Gegner)", sonst Mannschaft). Torliste und Tor-Fenster setzen bisher immer die Mannschaft davor.
- **Decision**: Neue reine Funktion `goalWho(game, goal, players)` in `goals.ts` für Torliste, Tor-Fenster und Spieldetails. Teilen-Text und Dashboard behalten ihre eigene Zusammensetzung (Spalten bzw. "(Gegner)"), hängen aber dieselbe `assistSuffix` an.
- **Messung im Mockup**: iPhone SE, Spalte 231 px: "Moritz (Vorlage: Anton)" passt (SC-V05); mit "Feuerbach E1, " davor nicht.

### R-V4 Auswahlfenster

- **Decision**: `ScorerPicker` bekommt `kind: 'scorer' | 'assist'`. Bei `assist`: Titel "Vorlage von?", kein "Eigentor Gegner", Fußknopf "Ohne Vorlage". Testkennungen mit Präfix `assist-` (bestehende `scorer-*` bleiben). Der Torschütze wird vom Aufrufer aus Aufgebot und "Andere …" herausgefiltert.
- **Ablauf**: Im Spielbildschirm wird der Zustand `picker` um `kind` erweitert. Wählt der Nutzer in der Schnellauswahl (Countdown läuft) einen Spieler und ist der Schalter an, folgt `picker = { kind: 'assist', until: jetzt + 5 s }`; sonst schließt das Fenster wie bisher. Nachträglich (`until: null`) gibt es keinen Folgeschritt.

### R-V5 Live-Nachricht abwärtsverträglich

- **Befund**: `parseGoal` (live-snapshot.ts) übernimmt nur bekannte Felder; ein zusätzliches Feld stört ältere Dashboards nicht. Ein neues Dashboard muss Stände ohne das Feld annehmen.
- **Decision**: `LiveGoal.assist: string | null`; gesendet als Anzeigename (höchstens 40 Zeichen, leer → `null`); beim Einlesen fehlt → `null`, sonst Name wie `who`. Keine neue Version `v`.

## Design

- `src/domain/types.ts`: `Goal.assist?: string | null`; `EventFeatures.assists: boolean`.
- `src/domain/settings.ts`: Vorgabe `assists: false`; `anyEventFeature` bleibt bei Karten, Wechseln, Lesezeichen (Edge Case "Ereignis"-Knopf).
- `src/domain/goals.ts`: `canHaveAssist`, `setAssist`, Anpassung `setScorer` und `setPenalty`, `assistLabel`, `assistSuffix` (" (Vorlage: Ben)"), `goalWho`.
- `src/domain/share-text.ts`: Zeile des Tores `scorerLabel + assistSuffix + goalSuffix` (FR-V07).
- `src/domain/live-snapshot.ts`: Senden und Prüfen von `assist` (FR-V08); `src/domain/live-board.ts`: `whoOf` mit " (Vorlage: Ben)".
- `src/domain/export.ts` und `specs/001-spiel-erfassen/contracts/export.schema.json`: optionales `assist` (FR-V10).
- `specs/006-live-spieltag/contracts/live-message.md`: Feld `assist`.
- `src/ui/components/scorer-picker.tsx`: `kind` (R-V4).
- `src/ui/components/goal-list.tsx`, `src/ui/screens/game-details.tsx`: `goalWho`.
- `src/ui/screens/game.tsx`: Folgeschritt "Vorlage von?" (`ASSIST_MS = 5000`), Knopf `goal-edit-assist` "Vorlage ändern", Titel des Tor-Fensters mit `goalWho`.
- `src/ui/screens/settings.tsx`: Schalter `feature-assists` "Vorlagen".
- `src/ui/screens/help.tsx`: keine Änderung (beschreibt die Schalter aus Spec 003 nicht).

## Prüfen (Quickstart)

1. `npm test` und `npm run test:cov`: neue Unit-Tests grün, `src/domain` 100 % Branch-Coverage.
2. `npx playwright test tests/e2e/vorlagen.spec.ts` in allen drei Profilen; bestehende Tests mit geänderter Torliste (`us3-torschuetze.spec.ts`) angepasst an FR-V11.
3. Von Hand im Mockup-Ablauf: Schalter an, Tor, "7 Max", "9 Ben" → Torliste "12' 1:0 Max (Vorlage: Ben)"; Teilen-Text und Dashboard zeigen dasselbe.

## Bundle

Wenige hundert Byte; Budget 60 KB bleibt eingehalten (`npm run budget`).
