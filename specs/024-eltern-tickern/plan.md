# Implementation Plan: Eltern tickern über den Zuschauer-Link (Spec 024)

**Branch**: `024-eltern-tickern` (Arbeitsbranch `claude/friendly-clarke-7h75g2`) | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/15FC1cxThNZLfUwgZt8r42

## Summary

Der Zuschauer-Link bekommt über die Konfigurations-Meldung ein vom Organisator signiertes Eltern-Paket (Schlüssel und Zertifikat, R-E1). Damit sendet ein Eltern-Handy mit dem bestehenden Sender (R-E3), der Dienst bleibt unverändert. Live-Stände tragen den Namen des Tickers (R-E4). Trainer schalten das Tickern je Mannschaft in der Konfiguration ab (R-E2) und veröffentlichen für erlaubte Mannschaften eine Zuschauer-Kopie des geteilten Kaders (R-E5). Beendete Eltern-Spiele bieten Trainer-Handys die Übernahme in die Historie an (R-E7).

## Technical Context

Unverändert gegenüber `specs/001-spiel-erfassen/plan.md` (TypeScript, Preact, Vitest, Playwright, Cloudflare Worker). Keine neue Abhängigkeit. Dienst (`relay/`) ohne Änderung. Zwei PRs: Paket A (US1 bis US3, Constitution 3.2.0) in #100, Paket B (US4, US5) danach.

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Vom Link zum Spielbildschirm in 3 Tipps (SC-E01); Ticker-Knopf 64 pt; Spielbildschirm wie bei Trainern | erfüllt |
| II. Offline-first und lokal | Erfassung lokal; Eltern senden nur nach bewusster Aktion ("Los geht's"); Dienst unverändert; Kader für Zuschauer nur bei erlaubtem Tickern (3.2.0, in diesem PR) | erfüllt nach Änderung 3.2.0 |
| III. Datensparsamkeit | Ticker-Name nur Vorname (2 bis 20 Zeichen), verschlüsselt; Kader-Kopie nur Vorname/Kürzel und Nummer; nichts auf dem Eltern-Handy gespeichert außer dem eigenen Spiel | erfüllt |
| IV. Test-first | Unit-Tests für Eltern-Paket, Zertifikat, Board-Filter, Kader-Kopie, Namen (100 % Branch-Coverage in `src/domain`); E2E je Akzeptanzszenario "024 USx-Sy" mit zwei Browser-Kontexten und Dienst-Attrappe | erfüllt |
| V. Zeit ist Berechnung | unverändert | erfüllt |
| VI. Einfachheit | Wiederverwendung von Sender, Übernahme (006 US6), "Spiel läuft schon" (023), Spielbildschirm und "Neues Spiel" | erfüllt |
| VII. Vereinsdesign | Namensmarkierung `rot-hell`/`ink` (Hinweis-Token), sonst bestehende Komponenten | erfüllt |
| VIII. Kostenfrei | keine neuen Zeilenarten; je erlaubtem geteilten Kader eine Kopie (Grenze 6 Kader je Live-Spieltag beachtet, R-E5) | erfüllt |
| IX. Hilfe | 4 neue, 4 geänderte Einträge in den PRs der jeweiligen User Story | erfüllt |

## Design

### Domain

| Datei | Änderung |
|---|---|
| `src/domain/types.ts` | `LiveConfig.x?`, `LiveSpieltag.kit?` (Eltern-Paket, nur Trainer-Handys), `Settings.liveTicker?`, `Settings.tickerName?`, `Settings.parentGamesDone?`, `Game.tickedBy?` |
| `src/domain/live-parent.ts` (neu) | Eltern-Zertifikat und -Paket bauen/prüfen (`parentCert`, `parseParentKit`, `isParentCert`), `parentAllowed(config, team)`, `tickerSpieltag(ticker, config)`, `checkTickerName`, Ticker-Zeile (`tickerLine`) |
| `src/domain/live-spieltag.ts` | `parseConfig` mit `x`; `parseLiveSpieltag` mit `kit` |
| `src/domain/live-snapshot.ts` | `by`, `tr` bauen und prüfen |
| `src/domain/live-board.ts` | `BoardEntry.parent`; `applySnapshot` verwirft Eltern-Stände nicht erlaubter Mannschaften; Karte mit `ticker` (Name, Trainer, eigenes Handy) |
| `src/domain/squad-sync.ts` | Zuschauer-Kopie (`viewerRecord`, `viewerSquads`) |
| `src/domain/live-takeover.ts` | Torschützen als Freitext für Eltern; `tickedBy` bei der Übernahme in die Historie |
| `src/domain/help-entries.ts` | Einträge laut Spec-Abschnitt "Hilfe" |

### Plattform

| Datei | Änderung |
|---|---|
| `src/platform/live-crypto.ts` | `sealMessage`/`openMessage` mit Feld `k` (Eltern-Paket); Eltern-Zertifikat für alle Mannschaften |
| `src/platform/live-setup.ts` | `publishConfig` mit Paket; `ensureKit` (fehlendes Paket erzeugen); Schalter setzen |
| `src/platform/live-receiver.ts` | Paket und Zuschauer-Kader an die Ansicht weiterreichen |
| `src/platform/live-sender.ts` | Sender auch aus `Settings.liveTicker`; `by`/`tr` |
| `src/platform/squad-sync.ts` | Zuschauer-Kopien schreiben bzw. Grabstein |

### Oberfläche

| Datei | Änderung |
|---|---|
| `src/ui/router.ts`, `src/ui/app.tsx` | Routen `liveGame`, `liveNew` (ohne Navigationsleiste) |
| `src/ui/screens/live-dashboard.tsx` | Ticker-Zeile, "Ich tickere dieses Spiel", "Weiter tickern", "Spiel übernehmen", "Spiel fehlt? Selbst tickern", Namensblatt, Rückfragen |
| `src/ui/screens/game.tsx` | Eltern-Fassung: Kopfzeile "Zurück zu Live", Zeile "Du tickerst als …", Kader aus der Kopie, keine Vorlage, kein "Nicht live senden"; Hinweise bei Übernahme und Abschalten |
| `src/ui/screens/new-game.tsx` | Eltern-Fassung (Mannschaft aus erlaubten, ohne Spielplan und "Live aufs Dashboard") |
| `src/ui/screens/live.tsx` | Schalter "Eltern dürfen tickern" je Mannschaft; Karten mit Ticker-Zeile (Paket B) |
| `src/ui/screens/start.tsx` | Karte "… hat … getickert. In deine Spiele übernehmen?" (Paket B) |
| `src/styles/app.css` | `.ticker-tag` (Markierung) aus Tokens |

## Risiken

- **Speicher im WhatsApp-Browser**: Wird der eingebettete Browser geschlossen, kann das lokale Spiel weg sein. "Weiter tickern" übernimmt den letzten Stand vom Dienst (FR-E14); Gerätetest auf dem iPhone im Quickstart.
- **Gleichzeitige Pakete**: Zwei Trainer-Handys erzeugen beim ersten Start nach dem Update gleichzeitig ein Paket. Beide Zertifikate sind gültig; die jüngere Konfiguration gilt (R-E1).
- **Kader-Grenze**: Kopien belegen Kader-Plätze (6 je Live-Spieltag). Bei üblichen 2 Kadern unkritisch; ist kein Platz, fehlt die Kopie und Eltern wählen ohne Kader (Edge Case "Kader nicht geteilt").
- **Ältere App-Versionen** auf Zuschauer-Handys zeigen Eltern-Stände nicht an, bis sie sich aktualisieren (Update-Hinweis, Spec 012).
