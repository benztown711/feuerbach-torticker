# Implementation Plan: Trainer-Paket (Spec 016)

**Branch**: `claude/sharp-brahmagupta-kxgyie` | **Spec**: `spec.md` | **Mockup**: https://claude.ai/artifact/2R4hbBgR2vTAYSu95RP4qX (Review B "passt", 07.11.2026)

## Summary

Geteilte Kader gehen als neue Meldungsart `squad` über den eigenen Dienst, verschlüsselt mit einem Schlüssel, den nur Trainer-Handys aus dem Organisator-Schlüssel ableiten (R-B1, R-B2). Je Kader eine ersetzbare Zeile; Empfänger führen je Kind, Kadername und Mannschaft die jüngere Angabe zusammen und senden nach, wenn sie Neueres haben (R-B3). Dazu: Schalter "Mit Trainern geteilt", Frage beim Teilen des Trainer-Links, Zeile in der Kopplungsfrage, Hinweis "Kader übernommen", "Link einfügen" mit Erkennung von Kader-Listen.

## Technical Context

- Preact, TypeScript, Vite; IndexedDB über `src/platform/db.ts`; Web Crypto (HKDF, AES-GCM, ECDSA P-256).
- Dienst: Cloudflare Worker mit Durable Object (`relay/`), Prüfregeln in `src/domain/relay-protocol.ts`.
- Bundle-Budget 60 KB gzip (Stand 58,8 KB): Kader-Abgleich wird nachgeladen (`squad-sync.ts`), im Hauptbündel nur Wortlaut und Aufrufe.
- Tests: Vitest (Domain 100 % Branch-Coverage), Worker-Tests, Playwright mit Nachbau des Dienstes (`tests/e2e/relay.ts`).

## Constitution Check

- II: 3.1.0 erlaubt geteilte Kader für Trainer-Handys über den eigenen Dienst, nur für Trainer lesbar (R-B2). Kein neuer Anbieter, kein Konto. ✔
- III: nur Vornamen bzw. Kürzel und Rückennummern (wie der Kader). ✔
- IV: Tests zuerst je Aufgabe. ✔
- VI: eine Meldungsart, keine neue Abhängigkeit. ✔
- IX: Hilfe-Einträge im selben PR (spec.md "Hilfe"). ✔

## Project Structure

```
src/domain/squad-sync.ts        neu: Meldung bauen/prüfen, stempeln, zusammenführen (rein, 100 % Coverage)
src/domain/relay-protocol.ts    + kind "squad"
src/domain/paste-detect.ts      neu: Link oder Kader-Liste erkennen (FR-B14)
src/domain/types.ts             + Squad.sid/shared/at, Player.sid/at, Team.squadAt, Settings.squadSync
src/platform/live-crypto.ts     + squadKey (HKDF), sealWith/unsealWith, squadSlot
src/platform/squad-sync.ts      neu, nachgeladen: speichern mit Stempel, senden, empfangen, Hinweis
src/platform/live-receiver.ts   + onSealed für Meldungen, die der Zuschauer-Schlüssel nicht öffnet
src/main.tsx                    Trainer-Handys: Verbindung halten, solange sichtbar
relay/src/spieltag.ts           + kind "squad"
src/ui/screens/roster.tsx       Schalter, Rückfrage, Hinweis "kein Platz", speichern über squad-sync
src/ui/screens/live.tsx         "Kader mit den Trainern teilen?" vor "Trainer-Link teilen"; "Link einfügen"
src/ui/components/couple-dialog.tsx   Zeile "Geteilte Kader kommen automatisch mit."
src/ui/screens/start.tsx, start-couple.tsx   "Link einfügen", Kader-Liste
src/domain/help-entries.ts      Hilfe
tests/unit/squad-sync.test.ts, paste-detect.test.ts, relay-protocol.test.ts, live-crypto.test.ts
relay/test/spieltag.test.ts
tests/e2e/trainer-paket-us1.spec.ts … us4.spec.ts, tests/e2e/relay.ts (Nachbau + squad)
```

## Design

Ein PR für alle vier User Stories (Roadmap: B1 und B2 in einem PR). Reihenfolge: Protokoll und Dienst, Domain-Abgleich, Plattform (Schlüssel, Senden, Empfangen), UI US1 bis US4, Hilfe, E2E. Der Dienst wird mit der App ausgeliefert (Deploy-Workflow: erst Worker, dann Pages); ältere App-Stände überspringen Kader-Meldungen.

## Risiken

- Gleichzeitige Änderungen offline: durch Nachsenden der Vereinigung abgedeckt (US3-S3, Unit- und E2E-Test).
- Bundle-Budget: Abgleich nachgeladen; Budget nach jeder UI-Aufgabe prüfen.
- Ein Kind in einen nicht geteilten Kader verschieben: auf den anderen Handys bleibt es im geteilten Kader (bewusst einfach, Hilfe nennt es nicht).
