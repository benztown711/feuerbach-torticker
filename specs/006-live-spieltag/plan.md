# Implementation Plan: Live-Spieltag (Spec 006)

**Branch**: `006-live-spieltag` (Arbeitsbranch `claude/dreamy-carson-3fc4be`) | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/FFj3NdrNzW4UqR9munviqo

## Summary

Ein Live-Spieltag besteht aus einem zufälligen Topic beim kostenlosen Vermittlungsdienst ntfy.sh und drei Schlüsselarten: Zuschauer (AES-GCM, lesen), Organisator (ECDSA, Zertifikate und Konfiguration signieren) und je Mannschaft ein Lead-Schlüssel (ECDSA, Stände signieren). Seit der Änderung "Trainergruppe" (research.md R-L13) trägt jedes Trainer-Handy den Organisator-Schlüssel aus dem Trainer-Link, signiert seine Zertifikate selbst und sendet je Spiel für die Mannschaft des Spiels. Ein Trainer-Handy sendet bei jeder Änderung eines Spiels den vollständigen Stand, verschlüsselt und signiert, gebündelt höchstens alle 5 s, dazu alle 3 Minuten ein Lebenszeichen. Das Dashboard läuft im Torticker selbst (eigene Route, ohne Navigationsleiste), liest den JSON-Stream von ntfy, prüft jede Meldung und berechnet die Minute mit derselben Uhrlogik wie das sendende Handy. Trainer-Handys hören im Spiel und beim Anlegen mit: für die anderen Spiele (US4), das Übernehmen eines Spiels (US6) und Änderungen am Live-Spieltag (US5). Kein eigener Server, keine neue Laufzeit-Abhängigkeit (Web Crypto, `fetch`, `CompressionStream`). Umsetzung in sieben PRs (siehe Phasen).

## Technical Context

**Language/Version**: TypeScript 6 (strict), Preact 11, Vite 8 (wie Spec 001)

**Primary Dependencies**: keine neuen. Web Crypto (AES-GCM, ECDSA P-256), `fetch` mit Stream-Lesen, `CompressionStream('deflate-raw')` (iOS 16.4+, Zielplattform iOS 17+)

**Storage**: IndexedDB wie bisher; neue Felder `Settings.live`, `Settings.liveView`, `Game.live` (optional, keine Schema-Migration nötig); Zwischenspeicher des Dashboards je Topic in `localStorage` (nur Komfort, FR-L16)

**Testing**: Vitest (Domäne 100 % Branch-Coverage, Krypto mit Node-Web-Crypto), Playwright in drei Profilen mit nachgebautem ntfy (Fixture `relay`, research.md R-L8)

**Target Platform**: PWA auf iOS 17+ (Safari, Home-Bildschirm) und aktuellem Android; Dashboard zusätzlich in jedem aktuellen Browser

**Project Type**: Web-App (PWA), statisch auf GitHub Pages

**Performance Goals**: Tor auf dem Dashboard ≤ 10 s (SC-L01), Dashboard sichtbar ≤ 5 s (SC-L02), Erfassung unverändert < 100 ms (SC-L03)

**Constraints**: Meldung ≤ 3.800 Byte; ≤ 250 Meldungen je Tag und Anschluss; Hauptbundle < 60 KB gzip (Stand 39,8 KB, research.md R-L7); keine Requests an Dritte ohne Kopplung

**Scale/Scope**: 1 bis 6 Mannschaften, bis 40 Zuschauer je Mannschaft (SC-L08), 4 neue Bildschirme bzw. Ansichten, Ergänzungen im Spielbildschirm

## Constitution Check

*Gate vor Phase 0, erneut nach Phase 1.*

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Senden blockiert nie die Erfassung (FR-L07); Kennzeichen und Zeile im Spielbildschirm ohne Scrollen auf dem iPhone SE (FR-L08, FR-033); Kopplung einmalig | erfüllt |
| II. Offline-first und lokal (2.0.0) | Erfassung ohne Netz unverändert; Daten verlassen das Gerät nur bei aktiver Kopplung, Ende-zu-Ende verschlüsselt, nur an ntfy.sh, nur die Felder aus FR-L10 | erfüllt |
| III. Datensparsamkeit | Nur Vornamen bzw. Kürzel aus dem Kader (FR-020); keine Skripte Dritter (ntfy ist reiner Datenweg, kein Skript); Netzwerk-Wächter mit genau einer Ausnahme bei Kopplung | erfüllt |
| IV. Spec-first und Test-first | Jedes Akzeptanzszenario als E2E-Test "006 USx-Sy"; Domäne `src/domain/live-*.ts` mit 100 % Branch-Coverage; Tests vor Code | erfüllt |
| V. Zeit ist eine Berechnung | Dashboard und Zeile im Spielbildschirm berechnen die Minute aus übertragenen Uhr-Ereignissen mit `deriveClock` (research.md R-L4) | erfüllt |
| VI. Einfachheit | Keine Bibliothek; ein Codepfad für Stream und Abfrage; Stand statt Ereignisstrom | erfüllt |
| VII. Vereinsdesign | Farben und Schriften aus `design/`; Farbmarken statt Emojis (FR-L18) | erfüllt |
| VIII. Kostenfrei | ntfy.sh ohne Konto; kein Apple-Developer-Konto (Einfügen statt Universal Links, R-L6) | erfüllt |

**Nach Phase 1 erneut geprüft**: Datenmodell und Verträge bringen keine Abhängigkeit und keinen eigenen Server. Alle Gates erfüllt.

## Design

### Ablauf

```text
Trainer-Handy A                  Trainer-Handy B                 ntfy.sh               Zuschauer (Browser)
Live-Spieltag anlegen ──Trainer-Link (WhatsApp, einfügen)──▶ koppeln (eigene Zertifikate)
       │──Zuschauer-Link (WhatsApp)──────────────────────────────────────────────────▶ öffnen
       │                         Spiel ändert sich (putGame)
       │                         Live-Stand → signieren → packen → verschlüsseln
       │                                ──POST /<topic>──────────▶ 12 h vorhalten
       │                                                          ──GET /<topic>/json──▶ prüfen → Board → Karten
       │◀── mithören (US4 andere Spiele, US5 Konfiguration, US6 Übernahme) ──────────── GET /<topic>/json
```

Lead-Links der ersten Version (je Mannschaft) bleiben gültig, werden aber nicht mehr erzeugt (contracts/live-link.md).

### Module

| Datei | Inhalt | Bundle |
|---|---|---|
| `src/domain/types.ts` | `LiveSpieltag`, `LiveTeamCred`, `LeadCert`, `LiveConfig`, `ViewerLink`; `Settings.live`, `Settings.liveView`; `Game.live` | Haupt |
| `src/domain/live-snapshot.ts` | `buildSnapshot(game, players, now)` (FR-L10), `parseSnapshot(unknown)` (strenge Prüfung, R-L9) | Haupt |
| `src/domain/live-spieltag.ts` | Anlegen, Mannschaften, Zuordnung Spiel → gekoppelte Mannschaft (`sendingTeamFor`), Konfiguration wählen (jüngste gewinnt), Kopplung übernehmen inkl. Mannschaft in "Meine Mannschaften" (FR-L03) | Haupt |
| `src/domain/live-link.ts` | Zuschauer-, Trainer- und Lead-Link kodieren, dekodieren, prüfen (`contracts/live-link.md`) | Haupt |
| `src/domain/live-manage.ts` | US5: Titel, Mannschaft hinzufügen/entfernen, neu ausstellen, Hinweis "neu ausgestellt", jüngere Konfiguration übernehmen, Wiederherstellen (R-L17) | nachgeladen |
| `src/domain/live-takeover.ts` | US6: Spiel aus dem letzten Live-Stand anlegen, Übernahme erkennen (R-L15) | nachgeladen |
| `src/domain/live-validate.ts` | gemeinsame Prüfungen für Links, Zertifikate, Meldungen und Sicherung (R-L9) | Haupt |
| `src/domain/live-board.ts` | Board aus geprüften Meldungen: jüngster Stand je Spiel, Karte je Mannschaft, "Heute außerdem", Reihenfolge (FR-L14), Phase und Minute (FR-L12, R-L4), "Letzte Meldung vor n Min" (FR-L15), Tagesgrenze und Merken (FR-L16) | Haupt |
| `src/platform/live-crypto.ts` | Schlüssel erzeugen/ein-/auslesen, signieren/prüfen, packen (deflate-raw) und AES-GCM, base64url | Haupt |
| `src/platform/relay.ts` | `publish(topic, text)`, `subscribe(topic, {since, onMessage, onState})` mit Stream, Neuverbindung, 429-Rückfall auf Abfrage, Pause bei verborgener Seite (R-L2) | Haupt |
| `src/platform/live-sender.ts` | Beobachter an `db.ts`, Bündelung 5 s, Wiederholung, Lebenszeichen 3 min, Vordergrund, Status für das Kennzeichen (R-L3) | Haupt |
| `src/platform/db.ts` | `onGameWrite(listener)`: Benachrichtigung nach `putGame`/`deleteGame` | Haupt |
| `src/platform/live-receiver.ts` | Empfänger: prüfen, Board führen, gemerkter Stand, Serverzeit, jüngere Konfiguration melden | nachgeladen |
| `src/platform/live-setup.ts` | anlegen, Links prüfen und koppeln, teilen, verwalten, Übernahme einer Konfiguration, Wiederherstellen (nacheinander, nie gleichzeitig) | nachgeladen |
| `src/platform/live-watch.ts` | Mithören in "Neues Spiel", im Spielbildschirm und in der Übersicht (US4, US5, US6) | nachgeladen |
| `src/platform/live-events.ts` | meldet geänderte Live-Einstellungen an offene Bildschirme (ohne Krypto, fürs Hauptbundle) | Haupt |
| `src/ui/components/live-pill.tsx` | Kennzeichen "Live" / "Live: wartet auf Netz" / "Nicht live" (FR-L08) | Haupt |
| `src/ui/components/live-others.tsx` | Zeile mit den anderen Spielen im Spielbildschirm (US4) | Haupt |
| `src/ui/screens/live.tsx` | "Mehr" → "Live-Spieltag": leer, anlegen, Übersicht mit Verwalten (Trainer-Handy), Lead-Ansicht, "neu ausgestellt", Link einfügen, Kopplungsfrage | nachgeladen |
| `src/ui/screens/live-dashboard.tsx` | Dashboard für Zuschauer (`#/live/…`) und in der App (`#/live-spieltag/dashboard`); aufklappbare Karten | nachgeladen |
| `src/ui/screens/lead-link.tsx` | Trainer- oder Lead-Link im Browser: Anleitung, "Link kopieren", "Hier im Browser koppeln" | nachgeladen |
| `src/ui/router.ts`, `src/ui/app.tsx`, `nav-bar.tsx`, `more.tsx`, `game.tsx` | neue Routen, Leiste auf Zuschauer- und Lead-Link-Seite ausgeblendet, Menüeintrag, Kennzeichen, Zeile, "Nicht live senden" | Haupt |

### Wichtige Entscheidungen

- **Zuordnung Spiel → Mannschaft**: über den Namen (`game.ownTeam` normalisiert = Name der gekoppelten Mannschaft); Spiele haben keine Mannschafts-ID (Spec 004).
- **Sendeschalter je Spiel**: `Game.live === false` bedeutet "Nicht live senden" (FR-L09); fehlt das Feld, wird gesendet. Abschalten sendet einmal den Zustand `off`, Löschen den Zustand `deleted`; beide entfernen das Spiel vom Dashboard.
- **Tageslogik** (FR-L14, FR-L16): "heute" nach Ortszeit des Zuschauers; die Karte zeigt das jüngste Spiel der Mannschaft, frühere Spiele desselben Tages als Zeile; Spiele älterer Tage nur, solange die Mannschaft heute kein Spiel hat.
- **Dashboard-Start ohne Daten** (R-L6): Startet der Torticker ohne Spiele und ohne angelegte Mannschaft, aber mit gemerktem Zuschauer-Link, öffnet er das Dashboard. Hilft nur, wo Browser und App dieselben Daten haben (Android); für das iPhone nennt das Manifest auf der Seite des Zuschauer-Links diesen Link als Startadresse (R-L6, Nachtrag 05.11.2026).
- **Sicherung** (FR-L21, US5): Sicherungsformat Version 1 bekommt das optionale Feld `live` (Live-Spieltag inkl. Schlüssel); `contracts/export.schema.json` und Prüfung werden ergänzt.

### Phasen und Pull Requests

| PR | Inhalt | Akzeptanzszenarien |
|---|---|---|
| #26 | Grundlagen (Typen, Links, Krypto, Relay-Client, Fixture `relay`) und US1: Live-Spieltag anlegen, Links teilen, Lead-Link einfügen bzw. im Browser öffnen, koppeln | 006 US1-S1 bis S4, S6 |
| #27 | US2: Live-Stand, Sender, Kennzeichen, "Nicht live senden", Löschen | 006 US2-S1 bis S7 |
| #28 | US3: Dashboard (Zuschauer-Route, Board, aufklappbare Karten, Status, Abfrage-Rückfall, Start ohne Daten) | 006 US1-S5, US3-S1 bis S10 |
| #29 | Änderung Trainergruppe: ein Trainer-Link, Senden je Spiel, Schalter "Live aufs Dashboard" (R-L13) | 006 US1, US2-S8, S9 |
| #33 | US6: Spiel übernehmen, kein doppeltes Senden (R-L15) | 006 US6-S1 bis S5 |
| #35 | US4: Zeile mit anderen Spielen, Tipp öffnet Dashboard | 006 US4-S1 bis S3 |
| #37 | US5: Verwalten (Titel, Mannschaft hinzufügen/entfernen, neu ausstellen mit Hinweis, Kopplung beenden), Sicherung mit Live-Spieltag (R-L17, R-L18) | 006 US5-S1 bis S5 |

## Project Structure

### Documentation (this feature)

```text
specs/006-live-spieltag/
├── spec.md
├── plan.md              # diese Datei
├── research.md          # R-L1 bis R-L9
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── live-link.md     # Zuschauer-, Trainer- und Lead-Link
│   ├── live-message.md  # Meldung, Live-Stand, Konfiguration, Zertifikat
│   └── ui-contract.md   # Routen und Test-IDs
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── domain/   live-snapshot.ts, live-spieltag.ts, live-link.ts, live-board.ts (+ types.ts, export.ts)
├── platform/ live-crypto.ts, relay.ts, live-sender.ts (+ db.ts)
└── ui/       screens/live.tsx, screens/live-dashboard.tsx, screens/lead-link.tsx,
              components/live-pill.tsx, components/live-others.tsx (+ router, app, nav-bar, more, game)
tests/
├── unit/     live-snapshot, live-spieltag, live-link, live-board, live-crypto, relay, live-sender
└── e2e/      live-us1.spec.ts … live-us5.spec.ts, relay.ts (Fixture)
```

**Structure Decision**: Bestehende Ein-Projekt-Struktur; Domäne flach mit Präfix `live-` wie die übrigen Domänendateien.

## Complexity Tracking

| Abweichung | Warum nötig | Einfachere Alternative verworfen, weil |
|---|---|---|
| Fremder Dienst (ntfy.sh) trotz "kein Server" | Live-Anzeige auf anderen Geräten geht nur über einen Vermittler (Constitution 2.0.0, Prinzip II) | eigener Server widerspricht II und VIII; WebRTC erreicht Zuschauer nicht |
| Zwei Signaturebenen (Organisator → Lead) | neue Mannschaft ohne neuen Zuschauer-Link (FR-L19), Zuschauer können nicht fälschen (FR-L11) | nur AES erlaubt Fälschen; Lead-Schlüssel im Zuschauer-Link erzwingen neue Links |
