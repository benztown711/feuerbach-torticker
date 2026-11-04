# Tasks: Live-Spieltag (Spec 006)

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/` in diesem Ordner; Mockup https://claude.ai/artifact/FFj3NdrNzW4UqR9munviqo

**Tests**: Pflicht (Constitution IV). Jeder Test entsteht vor dem Code und schlägt zuerst fehl. E2E-Namen beginnen mit "006 USx-Sy", Unit-Tests nennen die FR-L- bzw. SC-L-Nummer im `describe` (jede FR-L hat mindestens einen Test, siehe Zuordnung unten). [P] = parallel möglich (andere Datei, keine offene Abhängigkeit). Ein PR je User Story (plan.md, "Phasen und Pull Requests"); Phase 1 und 2 gehören zum PR von US1.

## Phase 1: Setup (PR 1)

- [x] L001 (FR-L01, FR-L09) Typen in `src/domain/types.ts` nach `data-model.md`: `LiveSpieltag`, `LiveTeamCred` (`key`, `name` "1 bis 40", `homeColor`, `awayColor`, `leadPriv`, `cert`, `sends`), `SignedConfig`, `SignedCert`, `LiveConfig` (`title` "1 bis 40 Zeichen", `teams` "1 bis 6", `iat`), `LeadCert`, `ViewerLink`, `LiveSnapshot`; `Settings.live` und `Settings.liveView` mit Vorgabe `null` in `src/domain/settings.ts`; `Game.live?: boolean`
- [x] L002 [P] `tests/unit/export.test.ts`: Sicherung mit `Game.live` (true, false, fehlt) wird angenommen, `live: "ja"` abgelehnt; danach `isGame` in `src/domain/export.ts` und `specs/001-spiel-erfassen/contracts/export.schema.json` ergänzen
- [x] L003 [P] (FR-L06) `tests/unit/db.test.ts`: `onGameWrite` meldet nach `putGame` (Spiel) und `deleteGame` (ID, gelöscht), Abmelden wirkt; danach `onGameWrite` in `src/platform/db.ts`
- [x] L004 [P] (FR-L05, SC-L06) E2E-Fixture `tests/e2e/relay.ts` (research.md R-L8): Nachbau von ntfy über `context.route('https://ntfy.sh/**')` mit Speicher je Topic, `POST /<topic>` (Antwort mit `id`, `time`), `GET /<topic>/json?since=…&poll=…` (Zeile `open` mit Serverzeit, dann Meldungen seit `since`, dann Ende), Schalter `fail` (Netz weg) und `tooMany` (429); `tests/e2e/fixtures.ts`: Netzwerk-Wächter lässt `https://ntfy.sh` nur zu, wenn ein Test die Fixture `relay` nutzt
- [x] L005 [P] Testhelfer `tests/e2e/live-helpers.ts`: `createLive()` legt per Oberfläche einen Live-Spieltag an und liefert Zuschauer- und Lead-Links aus der Teilen-Aufzeichnung, `pasteLeadLink()`, `recordedOf()`; Fixture `newDevice` für weitere Handys (eigener Kontext). Der Vertragstest-Entschlüsseler folgt mit L024

## Phase 2: Grundlagen (PR 1)

- [x] L006 [P] (FR-L11) `tests/unit/live-crypto.test.ts`: base64url hin und zurück; Schlüssel erzeugen, als roh/JWK aus- und einlesen; signieren/prüfen (verändertes `m` scheitert); `seal`/`open` mit AES-GCM und deflate-raw, Präfix `t1.`, falscher Schlüssel scheitert; Umschlag bauen und in der Prüfreihenfolge aus `contracts/live-message.md` öffnen (ungültiges `g` verworfen, Live-Stand bleibt; ungültiges `c` oder `s` verwirft den Live-Stand; `m.team` ≠ `c.key` verworfen)
- [x] L007 `src/platform/live-crypto.ts` (macht L006 grün)
- [x] L008 [P] (FR-L02, FR-L03) `tests/unit/live-link.test.ts`: Zuschauer- und Lead-Link kodieren/dekodieren nach `contracts/live-link.md`; Topic "22 Zeichen [A-Za-z0-9_-]", fehlende Felder, falsche Version, kaputtes base64url → Fehler; Erkennen in eingefügtem Text mit Leerzeichen, Zeilenumbrüchen und Begleittext; Unterscheidung Zuschauer/Lead
- [x] L009 `src/domain/live-link.ts` (macht L008 grün, 100 % Branch-Coverage)
- [x] L010 [P] (FR-L07, FR-L15, SC-L08) `tests/unit/relay.test.ts` (Fake-`fetch`, Fake-Timer): `publish` sendet `POST`; `subscribe` liest Zeilen auch über Chunk-Grenzen, `open`/`keepalive` liefern die Serverzeit, `message` ruft `onMessage`, Neuverbindung mit `since=<letzte ID>` nach 1, 2, 4 … 30 s, 429 schaltet auf `poll=1` alle 30 s, `stop()` bricht ab, verborgene Seite schließt den Stream und öffnet ihn beim Zurückkehren (R-L2)
- [x] L011 `src/platform/relay.ts` (macht L010 grün)

## Phase 3: US1 Live-Spieltag anlegen und Lead-Handys festlegen (P1, PR 1)

**Ziel**: Organisator legt an und teilt Links; ein zweites Handy koppelt per Einfügen. **Unabhängiger Test**: Gerät A legt an, Gerät B fügt Lead-Link E2 ein und zeigt "Lead für Feuerbach E2".

- [x] L012 [P] [US1] (FR-L01 bis FR-L04) `tests/unit/live-spieltag.test.ts`: Anlegen aus erzeugtem Schlüsselmaterial (Titel "1 bis 40 Zeichen", "1 bis 6" Mannschaften, Kurzlabel wie `teamShortLabel`, `sends` für "Dieses Handy sendet für"); Konfiguration und Zertifikate je Mannschaft; Kopplung aus Lead-Link übernehmen (fehlende Mannschaft mit Name und Trikots in "Meine Mannschaften", vorhandene unverändert; zweite Mannschaft desselben Live-Spieltags ergänzt, FR-L04; anderer Live-Spieltag nur nach Bestätigung ersetzt); `sendingTeamFor(game, live)` über normalisierten Namen, nur `sends`, nicht bei `game.live === false`; jüngste Konfiguration gewinnt (`iat`)
- [x] L013 [US1] `src/domain/live-spieltag.ts` (macht L012 grün, 100 % Branch-Coverage)
- [x] L014 [P] [US1] E2E `tests/e2e/live-us1.spec.ts`: 006 US1-S1 anlegen mit E1, E2 und Teilen von Zuschauer- und Lead-Link (`navigator.share`-Aufzeichnung), 006 US1-S2 Lead-Link auf zweiter Seite einfügen → Kopplungsfrage → `live-lead-info`, 006 US1-S3 fehlende Mannschaft übernommen, 006 US1-S4 ohne Kopplung kein Request an `ntfy.sh` (FR-L05, SC-L06), 006 US1-S6 Lead-Link im Browser (Anleitung, `btn-copy-lead-link`, `btn-couple-here`); ungültiger Link zeigt `paste-link-error`
- [x] L015 [US1] `src/platform/live-setup.ts`: Schlüssel erzeugen, Live-Spieltag anlegen und speichern, Kopplung speichern, Konfiguration nach dem Anlegen senden; Links über `src/platform/share.ts` teilen
- [x] L016 [US1] Routen `#/live-spieltag`, `#/live-spieltag/dashboard`, `#/live/<Daten>`, `#/lead/<Daten>` in `src/ui/router.ts`; Bildschirme per `import()` in `src/ui/app.tsx`; Leiste ausgeblendet auf Zuschauer- und Lead-Link-Seite (`src/ui/components/nav-bar.tsx`); Eintrag `more-live` in `src/ui/screens/more.tsx`
- [x] L017 [US1] `src/ui/screens/live.tsx` nach Mockup "Einrichten" und "Lead-Link öffnen" mit Test-IDs aus `contracts/ui-contract.md`; Stile in `src/styles/app.css` nur mit Tokens (macht L014 grün)
- [x] L018 [US1] `src/ui/screens/lead-link.tsx` (macht 006 US1-S6 grün)
- [x] L019 [US1] Verweis auf `specs/006-live-spieltag/contracts/ui-contract.md` in `specs/001-spiel-erfassen/contracts/ui-contract.md`; Lint, Typen, Unit mit Coverage, Budget, E2E lokal; Screenshots iPhone SE hell/dunkel (Leerzustand, Formular, Übersicht, Kopplungsfrage) an Atti

## Phase 4: US2 Lead-Handy sendet automatisch (P1, PR 2)

**Ziel**: Jede Änderung eines Spiels der gekoppelten Mannschaft kommt verschlüsselt beim Dienst an. **Unabhängiger Test**: Lead-Handy pfeift an und erfasst ein Tor; der Vertragstest-Helfer entschlüsselt im Relay den richtigen Stand.

- [x] L020 [P] [US2] (FR-L06, FR-L09, FR-L10) `tests/unit/live-snapshot.test.ts`: `buildSnapshot` nach `contracts/live-message.md` (Kurzform, Trikots, Schema, Uhr-Ereignisse, nur nicht entfernte Tore, `who` aus Kader-Anzeigename, Freitext oder `null`, `ownGoal`, `penalty`, Elfmeterschießen; nie Kader, Aufgebot, Karten, Wechsel, Lesezeichen); Zustand `off` bei `game.live === false`, `deleted` als Grabstein; `parseSnapshot` lehnt ab: falsche Typen, Namen über 40 Zeichen, unbekannte Farbe, mehr als 200 Tore, 50 Uhr-Ereignisse, 100 Schüsse, unbekannter `state`; `setLive(game, on)`
- [x] L021 [US2] `src/domain/live-snapshot.ts` (macht L020 grün, 100 % Branch-Coverage)
- [x] L022 [P] [US2] (FR-L06 bis FR-L08, SC-L01, SC-L03) `tests/unit/live-sender.test.ts` (Fake-Timer, Fake-Relay): sendet bei Änderung eines Spiels der gekoppelten Mannschaft ab dem Anlegen, ignoriert andere Mannschaften; höchstens eine Meldung je 5 s mit dem jeweils letzten Stand; Wiederholung nach 5, 10, 20, 30 s; Lebenszeichen alle 3 min nur bei laufend, angehalten oder Pause; Vordergrund sendet sofort; Status `on`, `wait` (Änderung seit über 30 s nicht übertragen), `off`; Meldung mit 60 Toren und 20 Schüssen bleibt unter 3.800 Zeichen
- [x] L023 [US2] `src/platform/live-sender.ts`, Start in `src/main.tsx`, wenn eine Kopplung mit `sends` besteht (macht L022 grün)
- [x] L024 [P] [US2] Vertragstest-Helfer in `tests/e2e/live-helpers.ts` (unabhängige Umsetzung von `contracts/live-message.md` mit `node:crypto` und `node:zlib`) und E2E `tests/e2e/live-us2.spec.ts` mit Fixture `relay`: 006 US2-S1 Anpfiff kommt an, 006 US2-S2 Tor, Rückgängig, Entfernen, Wiederherstellen, 006 US2-S3 Pausenpfiff und Schlusspfiff, 006 US2-S4 ohne Netz zählt das Tor sofort, Kennzeichen "Live: wartet auf Netz", danach kommt der Stand an, 006 US2-S5 Spiel einer anderen Mannschaft wird nicht gesendet, 006 US2-S6 "Nicht live senden" sendet `off`, 006 US2-S7 Löschen sendet `deleted`; in allen Tests enthalten die rohen Meldungen im Relay weder Mannschafts- noch Spielernamen im Klartext (SC-L06)
- [x] L025 [US2] `src/ui/components/live-pill.tsx` im Kopf von `src/ui/screens/game.tsx`, Menüeintrag `menu-live-toggle` (macht L024 grün)
- [x] L026 [US2] `tests/e2e/us2-layout-se.spec.ts` um das Kennzeichen erweitern (FR-033); Qualitätstore lokal; Screenshots iPhone SE hell/dunkel (Spiel mit Kennzeichen, "wartet auf Netz", Menü) an Atti

## Phase 5: US3 Eltern schauen zu (P1, PR 3)

**Ziel**: Zuschauer-Link zeigt alle Spiele aufklappbar mit laufender Minute. **Unabhängiger Test**: Relay mit Ständen von E1 (37') und E2 (Halbzeit) befüllen, Zuschauer-Link auf drittem Gerät öffnen.

- [x] L027 [P] [US3] (FR-L12 bis FR-L16, FR-L19, SC-L04) `tests/unit/live-board.test.ts`: je Spiel gewinnt größtes `sentAt`; `off`/`deleted` entfernen; jüngste Konfiguration (`iat`) und nur Mannschaften aus `teams`; eine Karte je Mannschaft mit jüngstem Spiel, "Heute außerdem" für frühere Spiele desselben Tages; Reihenfolge laufend (Konfigurationsreihenfolge), angelegt, beendet; Phasen "noch nicht angepfiffen", Minute inkl. "25+2'", "Uhr angehalten", "Halbzeit"/"Pause", "Verlängerung", "Elfmeterschießen", "Ende" mit "n. V."/"i. E."; Stand Heim:Gast; Halbzeitstand nur bei mehr als einem Abschnitt; Tore neuestes zuerst mit Torschütze, "(Elfmeter)", Eigentor; `leadNow` aus Serverzeit-Abgleich (R-L4, falsch gehende Uhren); "Letzte Meldung vor n Min" ab 5 min bei laufendem Spiel; Tageslogik FR-L16 inkl. angepfiffenem Spiel vom Vortag (wie beendet, mit Datum, ohne Minute); Leerzustand
- [x] L028 [US3] `src/domain/live-board.ts` (macht L027 grün, 100 % Branch-Coverage)
- [x] L029 [P] [US3] (FR-L11, FR-L15, FR-L16) `tests/unit/live-receiver.test.ts`: entschlüsselt und prüft über `live-crypto`, füttert das Board, merkt Stände in `localStorage` (Fehler beim Zugriff ignoriert), Verbindungsstatus `live`/`offline`/`polling`
- [x] L030 [US3] `src/platform/live-receiver.ts` (macht L029 grün)
- [x] L031 [P] [US3] E2E `tests/e2e/live-us3.spec.ts`: 006 US1-S5 Zuschauer-Link im Torticker zeigt nur das Dashboard, 006 US3-S1 bis S10 (zwei Karten in 5 s; Minute läuft per `page.clock`; Hervorhebung bei Tor; aufklappen/zuklappen; Leerzustand; Verbindung weg; "Letzte Meldung vor 7 Min"; beendetes Spiel bleibt; "Heute außerdem"; keine Bedienelemente, gefälschte Meldung mit falscher Signatur wird ignoriert); 429 → Abfrage; Start ohne Daten öffnet gemerktes Dashboard; Organisator öffnet über `btn-live-dashboard` das Dashboard in der App mit Navigationsleiste (FR-L17); Karte ab 375 pt ohne waagrechtes Scrollen (FR-L18)
- [x] L032 [US3] `src/ui/screens/live-dashboard.tsx` nach Mockup "Eltern" (Entwurf 2) mit Test-IDs aus `contracts/ui-contract.md`, Stile mit Tokens; `src/ui/screens/start.tsx` öffnet gemerktes Dashboard ohne eigene Daten (R-L6) (macht L031 grün)
- [x] L033 [US3] `tests/e2e/a11y.spec.ts` und `tests/e2e/visual.spec.ts` um das Dashboard (hell/dunkel, auf- und zugeklappt) erweitern; Qualitätstore lokal; Screenshots an Atti

## Phase 5b: Änderung Trainergruppe (P1, PR 4, Clarifications 04.11.2026, research.md R-L13)

- [x] L043 [P] (FR-L02 bis FR-L04) `tests/unit/live-link.test.ts`, `tests/unit/live-spieltag.test.ts`: Trainer-Link kodieren, dekodieren, finden, ungültige Felder; Anlegen ohne "Dieses Handy sendet für" (Trainer-Handy sendet für alle); `trainerLinkFor`; `applyTrainerLink` (eigener Lead-Schlüssel, Zertifikate je Mannschaft, Mannschaften übernehmen, gleicher Live-Spieltag behält Anlegezeit und jüngere Konfiguration, anderer ersetzt); `sendsFor`, `liveTeamFor`
- [x] L044 Domäne in `src/domain/live-link.ts`, `src/domain/live-spieltag.ts` (macht L043 grün, 100 % Branch-Coverage)
- [x] L045 [P] `tests/unit/live-setup.test.ts` (`verifyTrainerLink`), `tests/unit/live-sender.test.ts` (Trainer-Handy sendet je Spiel; beim Anlegen "Live" aus sendet nichts); `src/platform/live-setup.ts` (`verifyTrainerLink`, `coupleTrainer`, `shareTrainerLink`), `src/platform/live-sender.ts`
- [x] L046 Oberfläche: `src/ui/screens/live.tsx` (Formular ohne Auswahl, Übersicht mit Trainer-Link und Mannschaften, "Link einfügen"), `src/ui/components/couple-dialog.tsx` (mehrere Mannschaften), `src/ui/screens/lead-link.tsx` und Route `#/trainer/<Daten>`, `src/ui/screens/new-game.tsx` (Schalter "Live aufs Dashboard")
- [x] L047 E2E: `live-us1.spec.ts` auf Trainer-Link umgestellt (US1-S1 bis S7), `live-us2.spec.ts` um US2-S8 und US2-S9 ergänzt, `live-us3.spec.ts` sendet wie Trainer-Handys
- [x] L048 Verträge, research.md R-L13, Gerätetest G-1/G-2; `/code-review`, `/security-review`; Screenshots iPhone SE hell/dunkel an Atti

## Phase 5c: US6 Spiel übernehmen (P2, PR 5, research.md R-L15)

- [x] L049 [P] [US6] (FR-L22 bis FR-L24) Unit: Übergabezähler in `live-snapshot` (bauen, prüfen, fehlt = 0), `live-board` (größeres `h` gilt, Grabsteine mit `h`, gemerkte Stände ohne `h`, `runningElsewhere`), `tests/unit/live-takeover.test.ts` (Übernehmen mit Uhr, Toren, Torschützen, Elfmeterschießen, Schwellen; `takenOver`, `handOver`), Sender (übernommene Spiele senden nichts, Zähler in Meldungen), Sicherung
- [x] L050 [US6] Domäne `src/domain/live-takeover.ts`, `live-board.ts`, `live-snapshot.ts`, `export.ts` (macht L049 grün, 100 % Branch-Coverage)
- [x] L051 [US6] `src/platform/live-watch.ts` (nachgeladen), "Neues Spiel" mit Rückfrage, Spielbildschirm merkt die Übernahme (`live-handed-over`, Kennzeichen "Übergeben")
- [x] L052 [US6] E2E `tests/e2e/live-us6.spec.ts`: 006 US6-S1 bis S5 mit zwei Trainer-Handys und Zuschauer
- [x] L053 [US6] `/code-review`, `/security-review`, Screenshots iPhone SE hell/dunkel an Atti

## Phase 6: US4 Blick auf das andere Spiel (P2, PR 4)

**Ziel**: Lead-Handy sieht die anderen Spiele im Spielbildschirm. **Unabhängiger Test**: Gerät A (Lead E1) im Spiel, Gerät B (Lead E2) erfasst ein Tor, A zeigt den neuen Stand.

- [x] L034 [P] [US4] E2E `tests/e2e/live-us4.spec.ts`: 006 US4-S1 Tipp auf `live-pill` öffnet Dashboard, "Spiel" führt zurück, Uhr läuft weiter; 006 US4-S2 Zeile `live-others` mit "E2 2:1 · 31'"; 006 US4-S3 Hervorhebung ohne Ton (`recorded().sounds` unverändert); iPhone SE ohne Scrollen
- [x] L035 [US4] `src/ui/components/live-others.tsx` im Spielbildschirm, nutzt `live-receiver` nur solange der Spielbildschirm offen und das Handy gekoppelt ist (macht L034 grün); eine Verbindung für US4 und FR-L24 (`watchGame` in `src/platform/live-watch.ts`, Auswahl `otherGames` in `src/domain/live-board.ts`); Screenshots an Atti

## Phase 7: US5 Live-Spieltag verwalten (P3, PR 5)

**Ziel**: Titel, Mannschaften, Neuausstellen, Kopplung beenden, Sicherung. **Unabhängiger Test**: E3 hinzufügen; bestehender Zuschauer-Link zeigt E3-Spiele.

- [ ] L036 [P] [US5] (FR-L19 bis FR-L21) `tests/unit/live-spieltag.test.ts` erweitern: Titel ändern (neue Konfiguration, höheres `iat`), Mannschaft hinzufügen (neues Zertifikat, Zuschauer-Link gleich) und entfernen, neu ausstellen (neues Topic, neue Schlüssel), Kopplung beenden (Spiele bleiben); `tests/unit/export.test.ts`: Sicherung mit `live`, Prüfung, Wiederherstellen nur ohne lokalen Live-Spieltag
- [ ] L037 [US5] Domäne in `src/domain/live-spieltag.ts`, Sicherung in `src/domain/export.ts` und `specs/001-spiel-erfassen/contracts/export.schema.json` (macht L036 grün)
- [ ] L038 [P] [US5] E2E `tests/e2e/live-us5.spec.ts`: 006 US5-S1 E3 hinzufügen, 006 US5-S2 Kopplung beenden, 006 US5-S3 neu ausstellen (alte Meldungen erscheinen nicht), 006 US5-S4 Titel ändern, 006 US5-S5 Ersatzhandy (zwei Lead-Handys E2, beide Spiele sichtbar); Lead-Zeile zeigt "zuletzt gesendet <Uhrzeit>"; Sicherung auf neuem Gerät wiederherstellen, danach Übersicht mit denselben Links (FR-L21)
- [ ] L039 [US5] Verwalten in `src/ui/screens/live.tsx` (Titel, Mannschaft hinzufügen, `btn-live-reissue`, `btn-live-end`, "zuletzt gesendet" über `live-receiver`), Wiederherstellen in `src/ui/screens/settings.tsx` (macht L038 grün); Screenshots an Atti

## Phase 8: Abschluss

- [ ] L040 [P] Hilfe-Text "Live-Spieltag" in `src/ui/screens/help.tsx` und Abschnitt in `README.md`
- [ ] L041 `/code-review` und `/security-review` je PR (Eingaben aus Links und Meldungen, keine HTML-Einschleusung, Schlüssel nur im Fragment); `/speckit-analyze` nach jeder Phase ohne kritische Befunde
- [ ] L042 Gerätetest G-1 bis G-7 aus `quickstart.md` mit Atti (Review C); Ergebnis von G-3 in research.md R-L6 nachtragen

## Zuordnung Anforderungen → Aufgaben

| Anforderung | Aufgaben |
|---|---|
| FR-L01, FR-L02 | L001, L008, L012, L014, L017 |
| FR-L03, FR-L04 | L008, L012, L014, L018 |
| FR-L05 | L004, L014 |
| FR-L06, FR-L07 | L003, L020, L022, L024 |
| FR-L08, FR-L09 | L022, L024, L025, L026 |
| FR-L10 | L020, L024 |
| FR-L11 | L006, L029, L031 |
| FR-L12 bis FR-L16 | L027, L029, L031, L032 |
| FR-L17 | L031, L034 |
| FR-L18 | L031, L033 |
| FR-L19 bis FR-L21 | L036, L037, L038, L039 |
| SC-L01, SC-L03 | L022, L024 |
| SC-L02, SC-L04 | L027, L031 |
| SC-L05, SC-L07 | L042 (Gerätetest), Constitution VIII |
| SC-L06 | L004, L014, L024 |
| SC-L08 | L010, L031 (Rückfall bei 429); Last selbst nur im Gerätetest |

## Abhängigkeiten

```text
Phase 1 → Phase 2 → US1 → US2 → US3 → US4 → US5 → Abschluss
                         └────────────┘ (US3 braucht Meldungen aus US2 nur für E2E; Board und Empfänger sind unabhängig)
```

- US4 nutzt `live-receiver` aus US3; US5 nutzt ihn für "zuletzt gesendet".
- Innerhalb jeder Phase: Tests ([P]) zuerst, dann Domäne, dann Plattform, dann Oberfläche.

## Parallel möglich

- Phase 1: L002, L003, L004, L005 gleichzeitig.
- Phase 2: L006, L008, L010 gleichzeitig; danach L007, L009, L011.
- US1: L012 und L014 gleichzeitig; US2: L020, L022, L024; US3: L027, L029, L031.

## Umsetzungsstrategie

MVP für Atti ist erst mit US1 + US2 + US3 sichtbar (Eltern sehen Stände). Darum folgen die PRs direkt aufeinander; jeder ist für sich grün und mergebar, die Funktion bleibt bis PR 3 unter "Mehr" erreichbar, aber ohne Dashboard. US4 und US5 sind Komfort und Verwaltung.
