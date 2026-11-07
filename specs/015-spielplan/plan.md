# Implementation Plan: Spielplan im Live-Spieltag

**Branch**: `015-spielplan` (Arbeitsbranch `claude/sharp-brahmagupta-kxgyie`) | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/QjwveR3KsTdwFGGp3NpBX4

## Summary

Ein Spielplan aus Planspielen (Mannschaft, Datum, Anstoß, Heim/Auswärts, Gegner, Wettbewerb, Spielzeit, abgesagt), den jedes Trainer-Handy des Live-Spieltags pflegt. Der Plan liegt je Handy in IndexedDB (eigener Eintrag neben den Einstellungen) und reist über den bestehenden Vermittlungsdienst als neues, mit dem Organisator-Schlüssel signiertes Feld `p` der verschlüsselten Meldung. Änderungen gehen als kleine Meldung mit nur den geänderten Planspielen hinaus; Empfänger führen je Planspiel zusammen (jüngste Änderung gewinnt, Löschungen als Grabstein). Beim Öffnen der App sendet ein Handy den ganzen Plan erneut, wenn die letzte Meldung älter als 6 Stunden ist (Grenze des Dienstes rund 12 Stunden). Danach folgen in eigenen Schritten: Spiel aus dem Plan (US2), Dashboard (US3, US7), Liste einfügen (US4), Kader (US5), Vormerken (US6).

## Technical Context

**Language/Version**: TypeScript 5 (strict), wie `specs/001-spiel-erfassen/plan.md`

**Primary Dependencies**: Preact, `idb`; keine neue Abhängigkeit (Web Crypto, `CompressionStream`, `fetch` wie Spec 006)

**Storage**: IndexedDB `torticker`, Store `settings`, neuer Schlüssel `plan` (keine Schema-Migration, R-P3)

**Testing**: Vitest (Domain 100 % Branch-Coverage), Playwright mit `FakeRelay` und zweitem Gerät (`newDevice`)

**Target Platform**: PWA, iPhone ab iOS 17 (Safari/WebKit), aktuelles Android (Chromium)

**Project Type**: Single-Page-App ohne eigenen Server

**Performance Goals**: Änderung am Plan in höchstens 10 s auf anderen geöffneten Trainer-Handys (SC-P03)

**Constraints**: Meldung ≤ 3.800 Zeichen (`MAX_MESSAGE`), Hauptbundle < 60 KB gzip, offline nutzbar, keine Kindernamen im Plan

**Scale/Scope**: bis 100 Planspiele, 3 bis 6 Mannschaften, 5 Trainer-Handys

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Pflege des Plans abseits des Spiels; am Spieltag weniger Eingaben (US2, US6) | erfüllt |
| II. Offline-first, Live-Kopplung | Plan nur bei aktiver Kopplung; Ende-zu-Ende verschlüsselt über denselben Dienst; nur Anzeige-Daten, keine Kindernamen; Pflege offline, Senden nachgeholt | erfüllt |
| III. Datensparsamkeit | Plan ohne Kinder; Vorname des Trainers erst mit US6, optional | erfüllt |
| IV. Test-first | `src/domain/plan.ts` mit 100 % Branch-Coverage; E2E je Szenario "015 US1-Sx" | erfüllt |
| V. Zeit ist Berechnung | Planspiele tragen Datum und Anstoß als Text, "vergangen" wird aus dem heutigen Datum berechnet | erfüllt |
| VI. Einfachheit | keine Abhängigkeit, keine DB-Migration, Meldungsformat abwärtskompatibel (alte Clients ignorieren `p`) | erfüllt |
| VII. Vereinsdesign | nur Tokens aus `design/`, Mockup freigegeben | erfüllt |
| VIII. Kostenfrei | derselbe Gratis-Dienst | erfüllt |
| IX. Hilfe | `spielplan` neu, `live-verwalten` geändert im selben PR (Spec-Abschnitt "Hilfe") | erfüllt |

## Project Structure

### Documentation (this feature)

```text
specs/015-spielplan/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/plan-message.md
└── tasks.md
```

### Source Code (US1)

| Datei | Änderung |
|---|---|
| `src/domain/plan.ts` (neu) | Planspiel prüfen, anlegen, ändern, absagen, löschen (Grabstein), zusammenführen, gruppieren (kommend nach Datum, vergangen), kürzen, "erneut senden?", Meldungen stückeln, Nutzlast prüfen |
| `src/domain/types.ts` | `PlanEntry`, `PlanStore` |
| `src/domain/live-validate.ts` | `isSignedData` mit wählbarer Grenze, `MAX_PLAN_SIGNED` |
| `src/platform/live-crypto.ts` | `MessageParts.plan`, Feld `p` signiert mit dem Organisator-Schlüssel, `openMessage` prüft und liefert `plan` |
| `src/platform/db.ts` | `getPlan`, `putPlan` (Schlüssel `plan` im Store `settings`) |
| `src/platform/plan-sync.ts` (neu, nachgeladen) | Plan laden und speichern, ändern und senden, empfangene Planspiele übernehmen, beim Öffnen erneut senden, Nachholen ohne Netz |
| `src/platform/live-events.ts` | `onPlanChanged` / `planChanged` |
| `src/platform/live-receiver.ts`, `live-watch.ts` | `onPlan` an jeden Empfänger eines Trainer-Handys; `watchPlan` für die Spielplan-Seite |
| `src/main.tsx` | beim Start und bei Rückkehr in den Vordergrund `refreshPlan` nachladen (nur gekoppelt) |
| `src/ui/router.ts`, `app.tsx` | Route `#/live-spieltag/spielplan`, nachgeladen |
| `src/ui/screens/spielplan.tsx` (neu) | Liste mit Datumsköpfen, Blatt "Planspiel", Bestätigung Löschen |
| `src/ui/screens/live.tsx` | Karte "Spielplan" mit nächstem Spiel und Knopf |
| `src/domain/help-entries.ts` | `spielplan` neu, `live-verwalten` geändert |
| `tests/unit/plan.test.ts`, `live-crypto.test.ts`, `live-receiver.test.ts` | Unit-Tests |
| `tests/e2e/spielplan-us1.spec.ts`, `live-helpers.ts` | E2E, Decoder kennt `p` |

## Design (US1)

- **Datenhaltung** (R-P3): `PlanStore` unter eigenem Schlüssel, nicht in `Settings`, damit Bildschirme mit altem `Settings`-Stand den Plan nie überschreiben. Der Plan gilt nur für Topic und Organisator-Schlüssel, unter denen er gespeichert wurde; passt die Kopplung nicht (beendet, anderer Live-Spieltag), zeigt die App keinen Plan und verwirft ihn beim nächsten Speichern. Neu ausstellen übernimmt den Plan auf das neue Topic.
- **Senden** (R-P1, R-P2): Ändern sendet nur die geänderten Planspiele; "erneut senden" stückelt den ganzen Plan in Meldungen bis `MAX_PLAN_SIGNED`. Scheitert das Senden, merkt sich der Plan `pending` und versucht es bei der nächsten Gelegenheit (Öffnen, Vordergrund, alle 30 s während die Spielplan-Seite offen ist).
- **Empfangen**: Jeder Empfänger eines Trainer-Handys (Neues Spiel, Spiel, Dashboard in der App, Live-Spieltag, Spielplan) meldet geprüfte Planspiele an `adoptPlan`; das führt sie zusammen, speichert und meldet `planChanged`. Eltern-Dashboards ignorieren `p` bis US3.
- **Nur Trainer mit Organisator-Schlüssel**: Ältere Lead-Handys (Lead-Link aus der ersten Version) haben keinen Spielplan; die Seite bittet um den Trainer-Link.
- **Anzeige**: kommende Planspiele nach Datum gruppiert (heute bzw. das nächste Datum aufgeklappt), darin nach Anstoß (ohne Anstoß zuletzt); darunter eingeklappt "Vergangene Spiele", neueste zuerst. Zeile: Anstoß, "E1 – Gegner" (Heim) bzw. "E1 bei Gegner" (Auswärts), darunter "Heim · Wettbewerb · 2×25", rechts "frei" bzw. "abgesagt".

## Risiken

- **Verlorene Änderung ohne Netz**: Wer offline ändert und die App dann nie wieder öffnet, sendet nicht. Abhilfe: `pending` wird bei jedem Öffnen und jeder Rückkehr nachgeholt.
- **Wiederauferstehung gelöschter Planspiele**: Ein lange offline gewesenes Handy könnte ein gelöschtes Planspiel erneut senden, wenn dessen Grabstein schon entfernt ist. Grabsteine bleiben deshalb, bis ihr Datum 30 Tage vorbei ist.
- **Größe**: 100 Planspiele brauchen mehrere Meldungen; Stückelung nach Länge der signierten Daten, Prüfung im Unit-Test (SC-P05).
