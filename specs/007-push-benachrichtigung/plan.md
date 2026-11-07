# Implementation Plan: Eigener Dienst für den Live-Spieltag (Teil 1)

**Branch**: `007-push-benachrichtigung` (Arbeitsbranch `claude/hopeful-noether-puzkgc`) | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/GjfjzQUmiJYW8wBZByjxRx

## Summary

Ein eigener Vermittlungsdienst im Gratis-Plan von Cloudflare ersetzt ntfy.sh: ein Worker mit einem Durable Object je Live-Spieltag, SQLite-Speicher und WebSocket-Verbindungen mit Hibernation (R-N2). Er speichert verschlüsselte Meldungen und ordnet sie nur über undurchsichtige Kennungen (R-N3): je Spiel den jüngsten Stand, je Mannschaft die letzten 10 Spiele, die jüngste Konfiguration, die letzten 50 Plan-Meldungen (R-N5). Schreiben ist nur mit einer Signatur des Organisator- bzw. Lead-Schlüssels möglich; das Objekt ist an `topic` und `orgPub` aus dem Zuschauer-Link gebunden (R-N4). Die App tauscht nur den Transport in `relay.ts`; Empfang, Prüfung und Dashboard-Logik bleiben. Neu im Dashboard: der Block "Letzte Spiele" (R-N10). Umstieg hart, in zwei PRs: erst der Dienst, dann die App (R-N8).

## Technical Context

**Language/Version**: TypeScript (strict) für App und Worker

**Primary Dependencies**: App unverändert (Preact, `idb`, Web Crypto). Dienst: Cloudflare Workers mit Durable Objects (SQLite); Entwicklungs-Abhängigkeiten `wrangler`, `@cloudflare/vitest-plugin`, `@cloudflare/workers-types` in `relay/package.json` (R-N7)

**Storage**: App wie bisher (IndexedDB, `localStorage` für den Dashboard-Stand und den Filter); Dienst: SQLite je Durable Object (R-N5)

**Testing**: Vitest (Domäne 100 % Branch-Coverage, darunter `src/domain/relay-protocol.ts`), `@cloudflare/vitest-plugin` für `relay/`, Playwright mit Nachbau des Dienstes (`routeWebSocket`)

**Target Platform**: PWA (iPhone ab iOS 17, Android); Dienst auf Cloudflare (`workers.dev`)

**Project Type**: Single-Page-App plus ein kleiner Dienst (Constitution 3.0.0)

**Performance Goals**: SC-L01 (Tor in 10 s), SC-N01 (erstes Öffnen in 5 s), SC-N04 (120 Zuschauer unter 5 % der Tagesgrenzen)

**Constraints**: Gratis-Plan (100.000 Anfragen, 100.000 geschriebene Zeilen am Tag, 10 ms CPU je Anfrage), Meldung ≤ 4.000 Zeichen, Hauptbundle < 60 KB gzip (heute 58,2 KB), offline nutzbar, kein Klartext beim Dienst

**Scale/Scope**: 1 Live-Spieltag, 3 bis 6 Mannschaften, 5 Trainer-Handys, bis 120 Zuschauer

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Erfassung unverändert, Senden blockiert nie (FR-L07); Block "Letzte Spiele" nur bei Eltern, unten und zugeklappt | erfüllt |
| II. Offline-first, Live-Kopplung (3.0.0) | genau ein eigener Dienst im Gratis-Plan; nur verschlüsselt, Kennungen undurchsichtig (R-N3); nur bei Kopplung bzw. geöffnetem Zuschauer-Link; Nutzer ohne Konto | erfüllt |
| III. Datensparsamkeit | Dienst hält nur letzte 10 Spiele je Mannschaft, löscht nach einem Jahr und beim Neuausstellen (R-N5) | erfüllt |
| IV. Test-first | Domäne 100 %, Worker-Tests in `workerd`, E2E je Szenario "007 US1-Sx" bis "007 US3-Sx" | erfüllt |
| V. Zeit ist Berechnung | Uhrenabgleich weiter über die Serverzeit (`hello.time`, R-N6) | erfüllt |
| VI. Einfachheit | ein Worker, eine Klasse, eine Tabelle; keine Laufzeit-Abhängigkeit in der App; Entwicklungs-Abhängigkeiten begründet (R-N7) | erfüllt |
| VII. Vereinsdesign | Block nach freigegebenem Mockup, nur Tokens | erfüllt |
| VIII. Kostenfrei | Gratis-Plan ohne Bezahl-Plan, Grenzen lehnen ab statt abzurechnen (R-N1) | erfüllt |
| IX. Hilfe | Einträge laut Spec-Abschnitt "Hilfe" im jeweiligen PR | erfüllt |

## Project Structure

### Documentation (this feature)

```text
specs/007-push-benachrichtigung/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/relay-api.md
└── tasks.md
```

### Source Code

| Datei | Änderung |
|---|---|
| `relay/` (neu) | `package.json`, `wrangler.toml`, `tsconfig.json`, `src/index.ts` (Worker: Routen, CORS, Weiterleitung), `src/spieltag.ts` (Durable Object: prüfen, speichern, auswählen, senden, Alarm), `test/*.test.ts` (`@cloudflare/vitest-plugin`) |
| `src/domain/relay-protocol.ts` (neu) | Anfrage prüfen, zu signierender Text, "neuer als", Auswahl 10 je Mannschaft, Grabstein-Ablauf, Antwort `hello`/`msg` prüfen; von App und Worker genutzt |
| `src/platform/relay.ts` | `publish` → `POST` mit Ordnungsangaben und Signatur; `subscribe` → WebSocket mit `hello`, `msg`, `ping`, `since`, Neuverbindung; ohne 429-Rückfall |
| `src/platform/live-crypto.ts` | `slotKey` (HKDF aus dem Zuschauer-Schlüssel), `slot`/`group` (HMAC), Signatur des Schreibnachweises |
| `src/platform/live-sender.ts`, `live-setup.ts`, `plan-sync.ts` | Ordnungsangaben (`kind`, `slot`, `group`, `h`, `at`, `iat`, `gone`) an `publish`; Neuausstellen sendet `retire` aufs alte Objekt |
| `src/domain/live-board.ts` | frühere Spiele je Mannschaft behalten (höchstens 10), `recent` in `boardView` |
| `src/ui/screens/live-dashboard.tsx`, `src/styles/app.css` | Block "Letzte Spiele" (aufklappbar, Filter Alle/E1/E2/E3) |
| `src/ui/components/update-prompt.tsx` | auf der Seite des Zuschauer-Links sofort aktualisieren (R-N9) |
| `src/domain/help-entries.ts` | laut Spec-Abschnitt "Hilfe" |
| `vite.config.ts`, `.env` | `VITE_RELAY_ORIGIN` |
| `.github/workflows/ci.yml`, `deploy.yml` | Worker testen; Worker vor Pages ausliefern (R-N8) |
| `tests/e2e/relay.ts`, `fixtures.ts`, `live-helpers.ts` | Nachbau des Dienstes, Netzwerk-Wächter, Schreibnachweis im Testhelfer |
| `CLAUDE.md` | Qualitätstor "Netzwerk-Wächter" nennt den eigenen Dienst (Spec 007) |

## Design

- **Zwei Schritte, zwei PRs** (R-N8): PR A liefert Dienst, gemeinsame Domäne und Tests sowie die Auslieferung; die App spricht noch mit ntfy.sh. Nach dem ersten erfolgreichen Ausliefern (Secrets von Atti) stellt PR B die App um (US1, US2), mit Hilfe-Einträgen; an einem Werktag mergen. PR C bringt den Block "Letzte Spiele" (US3).
- **Sender**: `publish(topic, text)` wird `publish(link, parts)` mit den Ordnungsangaben, die der Sender ohnehin kennt (Spiel-ID, Mannschaft, `h`, `sentAt`; bei Konfiguration `iat`; bei Plan nichts). `slot` und `group` berechnet `live-crypto` aus dem Zuschauer-Schlüssel. Bündelung, Wiederholung und Lebenszeichen bleiben (R-L3); `204` gilt als gesendet.
- **Empfänger**: `subscribe` liefert wie bisher `RelayMessage {id, time, message}` (`id` = `seq`) und `onServerTime` aus `hello.time`. `LiveReceiver` startet mit `since` = zuletzt gemerktes `seq` statt "12h" und merkt es sich mit dem Board.
- **Dashboard**: siehe R-N10; Karten unverändert.
- **Sicherheit**: alles Eingehende im Worker durch `relay-protocol.ts` (Typen, Längen, Obergrenzen) vor jeder Krypto-Prüfung; keine Klartext-Logs; CORS nur für die App.

## Risiken

- **Gratis-Plan ändert sich**: R-N1 regelmäßig prüfen; ohne Dienst fehlt nur die Live-Anzeige (Edge Case "Dienst ganz weg").
- **CPU-Budget eines Durable Objects im Gratis-Plan** (10 ms oder 30 s, R-N1 offen): ECDSA-Prüfung dauert in `workerd` unter 1 ms; geprüfte Zertifikate werden gemerkt. In den Worker-Tests messen.
- **Harter Wechsel**: Geräte mit alter Version sehen nichts, bis sie aktualisieren (Edge Case); Werktag, Hinweis in den Gruppen, Dashboard aktualisiert sich künftig selbst (R-N9).
- **Bundle-Budget**: `relay.ts` und Signatur im Hauptbundle; Ausgleich durch Wegfall von Stream-Parser und 429-Rückfall. Im PR messen.
