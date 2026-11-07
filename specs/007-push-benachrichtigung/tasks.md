# Tasks: Eigener Dienst für den Live-Spieltag (Spec 007, Teil 1)

**Input**: `spec.md`, `plan.md`, `research.md` (R-N1 bis R-N10), `data-model.md`, `contracts/relay-api.md`, `quickstart.md`; Mockup https://claude.ai/artifact/GjfjzQUmiJYW8wBZByjxRx

Tests zuerst, sie müssen fehlschlagen (Constitution IV). [P] = parallel möglich (andere Dateien, keine offene Abhängigkeit). Drei PRs (plan.md "Design"): **PR A** = Phase 1 und 2 (Dienst, noch ohne App-Umstellung), **PR B** = Phase 3 und 4 (harter Wechsel, US1 und US2), **PR C** = Phase 5 (US3). Zwischen PR A und PR B liegt das erste Ausliefern mit Attis Secrets (T016).

## Phase 1: Setup (PR A)

- [x] T001 `relay/` anlegen: `relay/package.json` (Skripte `test`, `dev`, `deploy`; Entwicklungs-Abhängigkeiten `wrangler`, `@cloudflare/vitest-plugin` (Nachfolger von `@cloudflare/vitest-pool-workers`, R-N11), `@cloudflare/workers-types`, `vitest`, R-N7), `relay/tsconfig.json`, `relay/wrangler.toml` (Name `torticker-relay`, Durable Object `Spieltag` mit SQLite-Migration `new_sqlite_classes`, keine Bindings außer dem Objekt), `relay/vitest.config.ts` (Pool `workers`)
- [x] T002 [P] Lint, Prettier und `tsc` des Hauptprojekts für `relay/` einrichten bzw. gezielt ausnehmen (`eslint.config.js`, `.prettierignore`, `tsconfig.json`), sodass `npm run check` weiter grün ist
- [x] T003 [P] CI: Job "Dienst" in `.github/workflows/ci.yml` (`cd relay && npm ci && npm test`), Teil des Sammel-Checks `ci`; Pfadfilter wie die übrigen Jobs

## Phase 2: Grundlagen Dienst (PR A, blockiert alle User Stories)

- [x] T004 [P] `tests/unit/relay-protocol.test.ts`: Anfrage prüfen laut `contracts/relay-api.md` (Pflichtfelder je `kind`, `slot`/`group` "22 Zeichen base64url", `h` "0–100", `at`/`iat` ganze Zahl > 0, `body` "höchstens 4.000 Zeichen" und Präfix `t1.`, `sig` 86 Zeichen base64url, `cert` `{d, s}`, unbekannte Felder verworfen); zu signierender Text exakt nach Vertrag inkl. leerer Felder; "neuer als" (größeres `h`, sonst `at` ≥; `cfg` mit `iat` ≥); Auswahl "10 jüngste nicht gelöschte je `group` nach `first`", Grabsteine nach 30 Tagen weg, Obergrenzen "6 `grp`, 200 Zeilen"; `hello`/`msg` prüfen (Client-Seite)
- [x] T005 `src/domain/relay-protocol.ts` (macht T004 grün, 100 % Branch-Coverage, ohne Abhängigkeit auf Browser- oder Worker-APIs)
- [x] T006 [P] `relay/test/spieltag.test.ts` (`@cloudflare/vitest-plugin`): `POST` annehmen (`200 {seq}`), älter (`204`), ungültig (`400`), falsche Signatur bzw. Zertifikat eines fremden Organisators (`403`), zu groß bzw. Obergrenze (`413`), nach `retire` (`409`); Ersetzen je `slot`, "10 je `group`", `cfg` nur mit `iat` ≥, `plan` nur die 50 jüngsten; WebSocket: `hello` mit allem bzw. nur `seq` > `since`, `msg` an alle offenen Verbindungen, `ping` → `pong`; Alarm löscht alles; CORS nur für die App; Laufzeit einer Prüfung messen (Risiko CPU-Budget)
- [x] T007 `relay/src/index.ts` (Routen `/v1/<topic>/<orgPub>` und `/ws`, CORS, Weiterleitung an `idFromName("<topic>.<orgPub>")`) und `relay/src/spieltag.ts` (Durable Object: `relay-protocol` prüfen, Signatur mit Web Crypto gegen `orgPub` bzw. Zertifikat, Tabelle `msg` und `cert` laut `data-model.md`, Hibernation-API, `setWebSocketAutoResponse`, Alarm 365 Tage) (macht T006 grün)
- [x] T008 [P] `tests/unit/live-crypto.test.ts`: `slotKey` (HKDF, Kontext "torticker-relay-slot-v1"), `slot` und `group` (HMAC, 22 Zeichen, gleich für gleiche Mannschaft und Spiel-ID auf zwei Handys, verschieden für andere), Schreibnachweis signieren und mit `relay-protocol` prüfbar
- [x] T009 `src/platform/live-crypto.ts`: `slotKey`, `slotOf`, `groupOf`, `signWrite` (macht T008 grün; noch nicht von der App benutzt)
- [x] T010 Auslieferung: Job `relay` in `.github/workflows/deploy.yml` vor dem Pages-Job (`cloudflare/wrangler-action`, Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`), Pages-Job `needs: relay`; ohne Secrets überspringt der Job mit Hinweis statt rot zu werden
- [x] T011 Anleitung für Atti in `docs/cloudflare-einrichten.md`: API-Token mit genau "Workers Scripts: Edit" anlegen, Konto-ID finden, beide als Secrets im Repo hinterlegen, `workers.dev`-Subdomain nennen; kein Zahlungsmittel, kein Bezahl-Plan
- [ ] T012 `/code-review` und `/security-review` für PR A (Eingabeprüfung vor Krypto, keine Klartext-Logs, CORS, Obergrenzen); Draft-PR, CI grün

## Phase 3: US1 Eltern sehen den Stand jederzeit (P1, PR B) MVP

**Ziel**: Die App spricht nur noch mit dem eigenen Dienst; neue Dashboards sehen alles Gespeicherte. **Unabhängiger Test**: Trainer legt am Abend ein Spiel an und bleibt aus, ein neues Gerät öffnet am nächsten Vormittag den Zuschauer-Link und sieht die Karte.

- [x] T013 [P] [US1] `tests/e2e/relay.ts` als Nachbau des Dienstes (`context.route` für `POST` mit Prüfung über `relay-protocol`, `context.routeWebSocket` für `/ws` mit `hello`, `msg`, `since`, `ping`); Schnittstelle für Tests (`inject`, `all`, `messages`, `fail`, `offsetMs`, `delayMs`) bleibt; `tests/e2e/live-helpers.ts` (`sendAs` mit Schreibnachweis); `tests/e2e/fixtures.ts` Netzwerk-Wächter: statt `ntfy.sh` nur `VITE_RELAY_ORIGIN` und nur mit Fixture
- [x] T014 [P] [US1] `tests/unit/relay.test.ts` neu für den WebSocket-Client: `hello` liefert Meldungen und Serverzeit, `msg` einzeln, `since` beim Neuverbinden, `ping` alle 30 s, Stille über 90 s baut neu auf, Hintergrund schließt und Vordergrund verbindet neu, Abstände 1, 2, 4 … 30 s; `publish` sendet `POST` mit Ordnungsangaben, `200`/`204` gelten als gesendet, sonst Fehler
- [x] T015 [P] [US1] E2E `tests/e2e/dienst-us1.spec.ts`: 007 US1-S1 (am Vorabend angelegt, Trainer seitdem aus, neues Gerät sieht die Karte in 5 s), US1-S2 (Endstand vom Samstag am Montag bei Erstöffnung, "Ende · 07.11."), US1-S3 (Browser und Home-Bildschirm-Symbol gleich), US1-S4 (Tor in 10 s auf zwei Dashboards, kein Rückfall auf 30-Sekunden-Abfrage), US1-S5 (Dienst nicht erreichbar: Erfassung unberührt, "Keine Verbindung · Stand von …", danach von selbst aktuell), US1-S6 (Schreiben nur mit Zuschauer-Link wird abgelehnt, Dashboard unverändert); 007 SC-N05 (keine Namen im Klartext beim Nachbau)
- [x] T016 [US1] Erstes Ausliefern des Dienstes nach Merge von PR A: Atti hinterlegt die Secrets (T011), Job `relay` grün; Adresse fest in `vite.config.ts` (`VITE_RELAY_ORIGIN`); `curl` auf `/v1/…/ws` ohne `Origin` der App wird abgelehnt
- [x] T017 [US1] `src/platform/relay.ts`: `publish(link, parts)` per `POST` laut Vertrag, `subscribe` per WebSocket (macht T014 grün); 429-Rückfall und Stream-Parser entfallen; `VITE_RELAY_ORIGIN` in `vite.config.ts`
- [x] T018 [US1] `src/platform/live-sender.ts`, `live-setup.ts` (`publishConfig`, Neuausstellen sendet `retire` aufs alte Objekt), `src/platform/plan-sync.ts`: Ordnungsangaben und Schreibnachweis an `publish`; `src/platform/live-receiver.ts`: `since` aus dem gemerkten `seq`, `seq` mit dem Board speichern; `src/platform/live-watch.ts` unverändert bis auf die neue Signatur von `subscribe`
- [x] T019 [US1] Bestehende Unit-Tests anpassen, die ntfy.sh voraussetzen (`tests/unit/live-sender.test.ts`, `live-receiver.test.ts`, `live-setup.test.ts`, `live-watch.test.ts`), ohne Prüfungen abzuschwächen; Kommentare und Texte "ntfy" in `src/domain/live-validate.ts`, `src/domain/types.ts`, `src/platform/live-crypto.ts` nachziehen
- [x] T020 [US1] Bestehende E2E (`tests/e2e/live-us1` bis `live-us6`, `spielplan-us1`, `spielplan-us2`, `vorlagen`) gegen den neuen Nachbau grün; 006 SC-L08 (429-Rückfall) durch 007 US1-S4 ersetzt und in Spec 006 vermerkt
- [x] T021 [US1] `src/ui/components/update-prompt.tsx`: auf der Seite des Zuschauer-Links sofort aktualisieren (FR-N09, R-N9); Unit- oder E2E-Test "007 FR-N09"
- [x] T022 [US1] Hilfe in `src/domain/help-entries.ts`: `spiel-vorabend` (Torticker muss am Spieltag nicht mehr geöffnet werden), `datenschutz` (eigener Dienst bei Cloudflare, nur verschlüsselt, letzte 10 Spiele, Löschung nach einem Jahr); Quellen 007 US1, FR-N05, FR-N12
- [x] T023 [US1] `CLAUDE.md` (Qualitätstor "Netzwerk-Wächter": eigener Dienst, Spec 007), Spec 006 FR-L05/FR-L16 und Spec 015 FR-P07 mit Verweis auf Spec 007 nachziehen

## Phase 4: US2 Trainer-Handys bekommen Spielplan und Änderungen auch nach Tagen (P1, PR B)

**Ziel**: Konfiguration, Spielplan und "neu ausgestellt" kommen ohne Zeitgrenze an. **Unabhängiger Test**: Handy A trägt ein Planspiel ein und bleibt aus, Handy B öffnet drei Tage später und sieht es unter "Aus dem Spielplan".

- [x] T024 [P] [US2] E2E `tests/e2e/dienst-us2.spec.ts`: 007 US2-S1 (Planänderung am Montag, anderes Handy öffnet am Freitag, ohne erneutes Senden von A), US2-S2 (E3 am Dienstag hinzugefügt, anderes Handy sendet am Samstag E3), US2-S3 (Neuausstellen: alte Trainer-Handys und Dashboards erfahren es Tage später; Stände des alten Objekts gelöscht)
- [x] T025 [US2] Lücken aus T024 schließen (erwartet klein: `since` für Trainer-Empfänger, `retire` in `reissueLive`) in `src/platform/live-setup.ts`, `plan-sync.ts`, `live-watch.ts` (macht T024 grün)
- [x] T026 [US2] Hilfe: `spielplan-fehlt` wird mit Spec 015 T021 ohne den 12-Stunden-Hinweis angelegt; bis dahin Vermerk in `specs/015-spielplan/tasks.md` T021
- [ ] T027 [US2] `/code-review`, `/security-review` für PR B; `npm run check`, betroffene E2E lokal, volle Suite in der CI; Screenshots iPhone hell/dunkel an Atti; Hinweistext für die Gruppen ("Torticker einmal öffnen und aktualisieren") an Atti; Merge an einem Werktag

## Phase 5: US3 Letzte Spiele (P2, PR C)

**Ziel**: Block "Letzte Spiele" unten, aufklappbar, Filter Alle/E1/E2/E3. **Unabhängiger Test**: E1 hat 12 Spiele gesendet; ein neues Gerät zeigt mit Filter "E1" die 10 jüngsten.

- [x] T028 [P] [US3] `tests/unit/live-board.test.ts`: frühere Spiele je Mannschaft bleiben (höchstens 10), Karten und "Heute außerdem" unverändert, `recent` ohne Spiele der Karten, neuestes zuerst, "Alle" gemischt mit Mannschaftskürzel, Wortlaut "31.10. · 2:1 gegen TSV Musterstadt" bzw. "bei", gelöschte und "Nicht live senden" fehlen, Mannschaft ohne frühere Spiele
- [x] T029 [US3] `src/domain/live-board.ts`: `prune` behält frühere Tage bis 10 je Mannschaft, `boardView().recent` (macht T028 grün, 100 % Branch-Coverage)
- [x] T030 [P] [US3] E2E `tests/e2e/dienst-us3.spec.ts`: 007 US3-S1 (zugeklappt, Aufklappen zeigt Filter "Alle" gewählt, "E1" zeigt 10 jüngste ohne Kürzel), US3-S2 (Filter "E2", Karten unverändert, beim nächsten Aufklappen wieder "E2"), US3-S3 (heutiges Spiel der Karte nicht doppelt), US3-S4 (gelöscht bzw. "Nicht live senden" verschwindet), US3-S5 (ohne frühere Spiele kein Block; Mannschaft ohne Spiele: "Noch keine früheren Spiele"); 006 FR-L18 bei 320 pt mit Block
- [x] T031 [US3] `src/ui/screens/live-dashboard.tsx`, `src/styles/app.css`: Block nach Mockup (Überschrift als Knopf mit `aria-expanded`, Filter als Knöpfe mit `aria-pressed`, Liste ruhig in `ink-muted`, Ergebnis in `ink`), Filter in `localStorage` `torticker-recent-filter` (Fehler ignoriert) (macht T030 grün); visueller Vergleich `dashboard-*` neu aus der CI. Umgesetzt: das Musterdashboard der Kernbildschirme hat keine früheren Spiele, die Bilder bleiben gleich; axe hell/dunkel zu, auf und gefiltert in `dienst-us3.spec.ts`
- [x] T032 [US3] Hilfe: `eltern-dashboard` geändert, `letzte-spiele` neu (Eltern-Hilfe, "Wo sehe ich frühere Ergebnisse?"); Quellen 007 US3
- [x] T033 [US3] `/code-review`, `/security-review` für PR C; Screenshots iPhone hell/dunkel an Atti

## Phase 6: Abschluss

- [ ] T034 Gerätetest D-1 bis D-8 aus `quickstart.md` mit Atti; Ergebnis in `research.md` nachtragen
- [ ] T035 Roadmap `docs/roadmap.md`: C3, D1 erledigt; Spec-Status in `spec.md`
- [ ] T036 `/speckit-analyze` nach jeder Phase ohne kritische Befunde

## Zuordnung Anforderungen → Aufgaben

| Anforderung | Aufgaben |
|---|---|
| FR-N01 | T013, T017, T023 |
| FR-N02 | T004 bis T007 |
| FR-N03 | T006, T015, T018, T024 |
| FR-N04 | T006, T014, T015 |
| FR-N05 | T004, T008, T009, T015 (SC-N05) |
| FR-N06 | T004, T006, T007, T015 (US1-S6) |
| FR-N07 | T015 (Links unverändert in allen Szenarien), T020 |
| FR-N08 | T016, T017, T027 |
| FR-N09 | T021 |
| FR-N10 | T006, T015 (US1-S5), T011 |
| FR-N11 | T003, T010, T016 |
| FR-N12 | T006, T007, T024 (US2-S3) |
| FR-N13 | T028 bis T031 |
| SC-N01 bis SC-N06 | T015, T030, T034 |

## Abhängigkeiten

```text
Phase 1 → Phase 2 (PR A) → T016 erstes Ausliefern → Phase 3 (US1) → Phase 4 (US2) (PR B) → Phase 5 (US3, PR C) → Abschluss
```

- US2 braucht den Transport aus US1 (T017, T018); US3 braucht nur das Board und kann nach PR B unabhängig folgen.
- PR B darf erst gemergt werden, wenn der Dienst ausgeliefert ist (T016), sonst sieht niemand Stände.

## Parallel möglich

- Phase 1: T002, T003 neben T001.
- Phase 2: T004, T006, T008 gleichzeitig (Tests); danach T005, T007, T009.
- US1: T013, T014, T015 gleichzeitig; US3: T028 und T030.

## Umsetzungsstrategie

MVP ist US1 (PR B): Danach sehen alle Eltern jederzeit alle Spiele, unabhängig vom Gerät. PR A ist für Nutzer unsichtbar und kann jederzeit gemergt werden. US3 ist Komfort und folgt danach.
