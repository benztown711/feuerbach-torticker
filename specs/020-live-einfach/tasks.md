# Tasks: Live einfacher für Trainer und Eltern (Spec 020)

**Input**: `spec.md`, `plan.md`, `research.md` (R-E1 bis R-E10)

Tests zuerst, sie müssen fehlschlagen (Constitution IV). [P] = parallel möglich innerhalb des Pakets. **[A]** = Paket A (Trainer, US1 und US2), **[C]** = Paket C (Zuschauer, US3 bis US5). Ein PR je Paket, Commits je User Story; beide Pakete laufen parallel in getrennten Worktrees.

## Pakete und Dateien

| Paket | User Stories | Dateien (nur dieses Paket) | E2E |
|---|---|---|---|
| A | US1 (P1), US2 (P2) | `src/domain/live-quick.ts` (neu), `src/platform/live-setup.ts`, `src/ui/components/live-start.tsx` (neu), `src/ui/components/share-sheet.tsx` (neu), `src/ui/screens/start.tsx`, `src/ui/screens/game.tsx`, `src/ui/screens/live.tsx`, `src/ui/screens/more.tsx`, `tests/unit/live-quick.test.ts` (neu), `tests/e2e/helpers.ts` (nur `shareAsText` ergänzen), die unter T014 und T016 genannten bestehenden E2E-Dateien | `tests/e2e/live-einfach-us1.spec.ts`, `tests/e2e/live-einfach-us2.spec.ts` |
| C | US3 (P1), US4 (P1), US5 (P2) | `src/domain/goal-alert.ts` (neu), `src/domain/live-board.ts`, `src/platform/signal.ts`, `src/ui/hooks.ts`, `src/ui/screens/live-dashboard.tsx`, `src/ui/screens/help.tsx`, `tests/unit/goal-alert.test.ts` (neu), `tests/unit/live-board.test.ts`, `tests/unit/help-entries.test.ts`, `tests/e2e/hilfe-eltern.spec.ts`, `tests/e2e/visual.spec.ts-snapshots/dashboard-*` | `tests/e2e/live-einfach-us3.spec.ts`, `tests/e2e/live-einfach-us4.spec.ts`, `tests/e2e/live-einfach-us5.spec.ts` |

`src/ui/components/share-preview.tsx` bleibt unverändert.

### Gemeinsam berührte Dateien

| Datei | Paket A | Paket C | Regel |
|---|---|---|---|
| `src/domain/help-entries.ts` | T009, T017 | T024, T030, T036 | A fügt `eltern-zuschauen` vor `live-anlegen` ein, C fügt seine Einträge nach `keine-verbindung` ein; `kopplung-beenden` (A) und `eltern-dashboard` (C) sind Nachbarn, der zweite PR löst beim Rebase |
| `src/styles/app.css` | Block `/* Spec 020 Paket A */` | Block `/* Spec 020 Paket C */` | nur im eigenen Block; gemeinsame Regeln nicht ändern |
| `tests/e2e/live-helpers.ts` | T012: `openTrainerSection` bei `createLive`, Aufruf in `createLive` und `pasteLink` | neue Helfer nur am Dateiende | nur ergänzen, nicht umbauen |
| `tests/e2e/live-us3.spec.ts` | T014: nur Test "006 US1-S5" | T029, T035: "006 US3-S7", "006 R-L6", "006 US3-S11" | getrennte Tests |
| `tests/e2e/a11y.spec.ts` | T039: neuer `test` | T040: neuer `test` | je Paket ein neuer `test` am Dateiende |
| `specs/020-live-einfach/spec.md`, `tasks.md` | Status US1, US2, Haken A | Status US3 bis US5, Haken C | nur eigene Zeilen |

Die Hinweise "geändert durch Spec 020" in den Specs 001, 005, 006, 007, 008, 010, 012, 017, 018 und 019 sind mit dieser Spec schon eingetragen; die Pakete ändern dort nichts mehr.

---

## Paket A: Trainer

### Phase A1: US1 Eltern live zuschauen lassen mit einem Tipp (P1), MVP Paket A

**Goal**: Link für Eltern mit 1 bis 2 Tipps vom Startbildschirm und aus dem Spielmenü, mit oder ohne Live-Spieltag.

**Independent Test**: siehe spec.md US1.

- [x] T001 [P] [US1] [A] Unit `tests/unit/live-quick.test.ts`: `quickAction` (`hidden` ohne Mannschaften und ohne Live-Spieltag sowie bei neu ausgestelltem Live-Spieltag; `start` ohne Live-Spieltag; `share` mit `makeLive` nur bei nicht beendetem Spiel auf "Nicht live senden"; `team` `null`, `add` auf Trainer-Handy mit weniger als sechs, `missing` bei sechs bzw. Lead-Handy ohne Trainer-Link; ohne Spiel), `quickTeams` (Mannschaft des Spiels; Spielmannschaft fehlt in "Meine Mannschaften" → Regel 2 bzw. 3; genau eine; alle; mehr als sechs → die ersten sechs), `quickHint` (Wortlaute aus FR-E05, FR-E06); zuerst rot
- [x] T002 [US1] [A] `src/domain/live-quick.ts` (macht T001 grün, 100 % Branch-Coverage, R-E2)
- [x] T003 [P] [US1] [A] E2E `tests/e2e/live-einfach-us1.spec.ts`: 020 US1-S1 (Knopf nach "Neues Spiel" bzw. "Spiele verfolgen", ≥ 64 pt, kein `btn--primary`), S2 (fehlt ohne Mannschaften und bei neu ausgestelltem Live-Spieltag, Startbildschirm und Spielmenü), S3 (gekoppelt: ein Tipp, geteilter Text "Unser Spieltag live verfolgen: …#/live/…"; Zwischenablage-Fall mit "Link kopiert. Füge ihn in WhatsApp ein."), S4 (Spiel auf "Nicht live senden" → "…" → Eintrag: geteilt, Kennzeichen "Live", Spiel im `FakeRelay`), S5 (Blatt: Reihenfolge Text, "Ein anderer Trainer hat schon einen Link?" mit "Link einfügen", "Neu mit E1 und E2.", "Neu starten", Datensatz), S6 (aus laufendem E2-Spiel "Neu starten": Live-Spieltag nur E2, geteilt, Zuschauer-Gerät zeigt die Karte mit Stand und Minute in ≤ 10 s ohne `forward`), S7 (Startbildschirm ohne Spiel: alle Mannschaften; eine Mannschaft; sieben Mannschaften → sechs), S8 ("Link einfügen" mit Trainer-Link in der Zwischenablage → Kopplungsfrage → "Gekoppelt mit „Unser Spieltag“." und "Link für Eltern teilen"), S9 (E3 kommt dazu mit "E3 ist jetzt dabei."; bei sechs Mannschaften Hinweis "… gehört nicht zum Live-Spieltag …"), S10 (Teilen einmal mit `NotAllowedError` abgelehnt → "Fertig. Jetzt den Link teilen." und "Link für Eltern teilen" teilt); Randfall Doppeltipp "Neu starten" ergibt einen Live-Spieltag; zuerst rot
- [x] T004 [US1] [A] `src/platform/live-setup.ts`: `prepareLive()` (Schlüssel vorab) und `createLive(input, prepared?)` (R-E1); nach Anlegen bzw. Koppeln das aktuelle, nicht beendete Spiel einmal melden (FR-E09, R-E3); Unit-Tests in `tests/unit/live-setup.test.ts` ergänzen, zuerst rot
- [x] T005 [US1] [A] `src/ui/components/live-start.tsx` (nachgeladen, R-E10): `runQuick` (Teilen sofort, danach `setLive` bzw. `addTeamToLive`), Blatt "Eltern live zuschauen lassen" mit den Zuständen Auswahl, "Fertig. Jetzt den Link teilen." und "Gekoppelt mit „<Titel>“."; "Link einfügen" über den Weg von `start-couple.tsx`; Hinweis auf den Trainer-Link (FR-E08); Statuszeile (FR-E11); Knöpfe ≥ 64 pt
- [x] T006 [US1] [A] `src/ui/screens/start.tsx`: Knopf "Eltern live zuschauen lassen" mit Unterzeile nach "Spiele verfolgen" (FR-E01, FR-E03), Modul beim Erscheinen vorladen (R-E1); `src/styles/app.css` Block Paket A. Umsetzung: Das Hauptbundle hatte nur noch rund 130 Byte Luft; darum zieht der ganze Live-Teil des Startbildschirms ("Spiele verfolgen", Karte "Trainer? …", Knopf) als `StartLive` nach `live-start.tsx` um, `start.tsx` lädt ihn nach (Hauptbundle danach 59,5 KB). Der Spielbildschirm lädt `share-sheet.tsx` vorab, das `MenuQuick` und `LiveStartSheet` aus `live-start.tsx` mitbringt
- [x] T007 [US1] [A] `src/ui/screens/game.tsx`: Spielmenü mit "Eltern live zuschauen lassen" als erstem Eintrag (FR-E02), Modul beim Öffnen des Menüs vorladen, Teilen-Ergebnis im Meldeband (FR-E11) (macht T003 grün; `startbildschirm`, `live-us2`, `spielbildschirm-us1` bleiben grün)
- [x] T008 [US1] [A] Prüfen: `npx playwright test tests/e2e/live-einfach-us1.spec.ts tests/e2e/startbildschirm.spec.ts tests/e2e/live-us2.spec.ts`
- [x] T009 [US1] [A] Hilfe `src/domain/help-entries.ts`: neu `eltern-zuschauen` "Wie lasse ich Eltern live zuschauen?" vor `live-anlegen` (Quelle "020 US1", `open` "Live für Eltern"); `live-anlegen` und `live-senden` laut spec.md (Quelle zusätzlich "020 US1"); Hilfe-Abdeckung grün (Constitution IX)

**Checkpoint**: US1 für sich nutzbar (die Live-Seite ist noch die alte).

### Phase A2: US2 Live-Seite aufgeräumt, ein gemeinsames Teilen (P2)

**Goal**: "Live für Eltern" mit einem Hauptknopf und "Für Trainer"; "Teilen" im Spiel mit zwei Wegen.

**Independent Test**: siehe spec.md US2.

- [x] T010 [P] [US2] [A] E2E `tests/e2e/live-einfach-us2.spec.ts`: 020 US2-S1 (Eintrag "Live für Eltern" mit Unterzeile, Titel), S2 (Übersicht oben: Titel, Satz, genau ein `.btn--primary` "Link für Eltern teilen", "Dashboard ansehen", "Für Trainer" zu mit `aria-expanded="false"`), S3 (aufgeklappt: Reihenfolge der Karten und Knöpfe; zuklappen), S4 (bleibt offen nach "Spielplan" und zurück; nach `page.reload()` zu), S5 (sichtbarer Text ohne "Kopplung" und "Zuschauer-Link"; auch mit Hinweis "Neue Links ausgestellt"), S6 ("Live beenden …" → "Live beenden?" → "Live beendet. Dieses Handy sendet nichts mehr."), S7 (ohne Live-Spieltag: ein Hauptknopf öffnet das Blatt aus US1-S5, Karte "WAS DAS HANDY VERLÄSST", unter "Für Trainer" "Trainer-Link einfügen" vor "Live-Spieltag anlegen" mit Hinweis), S8 (Spielmenü: "Eltern live zuschauen lassen", dann "Teilen", kein "Zwischenstand teilen"; Blatt "Teilen" mit Unterzeilen), S9 ("Stand als Text" teilt den Zwischenstand wie FR-042; "Live-Link für Eltern" wie US1-S3), S10 (beendet: "Ergebnis teilen" teilt direkt ohne Blatt und merkt sich das Teilen; im Menü kein "Teilen"; Präzisierung 2026-11-17), S11 (Band "Teilen" und Spieldetails teilen direkt, ohne Blatt); Randfall Lead-Handy der ersten Version (FR-E16); zuerst rot
- [x] T011 [US2] [A] `tests/e2e/helpers.ts`: `shareAsText(page)` ergänzen ("…" → "Teilen", dann "Stand als Text"; "Ergebnis teilen" bleibt direkt, Präzisierung 2026-11-17)
- [x] T012 [US2] [A] `tests/e2e/live-helpers.ts`: `openTrainerSection(page)` ergänzen (klappt auf, wenn der Knopf da und zu ist, sonst nichts, R-E8) und in `createLive` vor "Live-Spieltag anlegen" und vor "Trainer-Link teilen" sowie in `pasteLink` vor "Link einfügen" aufrufen
- [x] T013 [US2] [A] `src/ui/screens/more.tsx` und `src/ui/screens/live.tsx`: Titel "Live für Eltern" (FR-E12); Übersicht, Leerzustand und Lead-Handy mit einem Hauptknopf (FR-E13, FR-E15, FR-E16); "Für Trainer" mit Modulvariable und `aria-expanded` (FR-E14, R-E8), "Trainer-Link teilen" als Zweitknopf; "Live beenden …" mit Rückfrage und Meldung (FR-E17); Hinweis "Neue Links ausgestellt" mit "Link für Eltern"; "Link für Eltern teilen" ohne Live-Spieltag öffnet das Blatt aus T005; `src/styles/app.css` Block Paket A (`.live__trainer`) (macht T010 S1 bis S7 grün)
- [x] T014 [US2] [A] Bestehende E2E an "Für Trainer" anpassen (`openTrainerSection` vor eingeklappten Knöpfen, gleiche Prüftiefe): `live-us1`, `live-us3` (nur "006 US1-S5"), `live-us5`, `dienst-us2`, `spieltag-sicher-us1`, `trainer-paket-us1`, `trainer-paket-us2`, `trainer-paket-us4`, `spielplan-us1`, `paket-helpers.ts`, `plan-helpers.ts`, `startbildschirm.spec.ts`; "012 US1-S6" folgt FR-E15 (Einfügen vor Anlegen unter "Für Trainer", Hauptknopf "Link für Eltern teilen"), "006 US5-S2" folgt FR-E17 ("Live beenden"); Testnamen behalten ihre IDs
- [x] T015 [US2] [A] `src/ui/components/share-sheet.tsx` (nachgeladen) und `src/ui/screens/game.tsx`: "Teilen" statt "Zwischenstand teilen" vom Anpfiff bis zum Schlusspfiff (FR-E18), Blatt mit "Live-Link für Eltern" oben und "Stand als Text" (`doShareInterim`), "Live-Link für Eltern" über `runQuick` aus T005; "Ergebnis teilen" und Band "neu teilen" unverändert direkt (FR-E19, Präzisierung 2026-11-17) (macht T010 S8 bis S11 grün)
- [x] T016 [US2] [A] Bestehende E2E auf `shareAsText` umstellen, wo sie "Zwischenstand teilen" (`menu-share-interim`) tippen: `us4-teilen`, `spielbildschirm-us1`, `spiel-korrigieren`; Erwartungen an den Text unverändert. Tests mit "Ergebnis teilen" (`btn-share`) bleiben unverändert (Präzisierung 2026-11-17)
- [x] T017 [US2] [A] Hilfe `src/domain/help-entries.ts`: `zwischenstand`, `ergebnis-teilen`, `kopplung-beenden`, `navigation` laut spec.md (Quelle zusätzlich "020 US2"); Wege "„Mehr“ und „Live-Spieltag“" → "„Mehr“, „Live für Eltern“ und „Für Trainer“" in `trainer-kader`, `spiele-verfolgen`, `live-verwalten`, `spielplan`, `spiel-vormerken`, `spielplan-liste`, `spielplan-fehlt`, `links-neu`, `trainer-link` (auch Schritte); `open.label` "Live-Spieltag" → "Live für Eltern"; Hilfe-Abdeckung grün

**Checkpoint**: Paket A fertig; `npm run e2e` lokal (übergreifend: Spielbildschirm, viele Tests umgestellt).

---

## Paket C: Zuschauer

### Phase C1: US3 Tor merken bei offener Seite (P1), MVP Paket C

**Goal**: Tab-Titel, Ansage, Vibration und "Ton bei Toren" bei neuen Toren.

**Independent Test**: siehe spec.md US3.

- [x] T018 [P] [US3] [C] Unit `tests/unit/goal-alert.test.ts`: `newGoals` (erstes Laden `prev = null` → nichts; Anzahl steigt mit frischer Meldung → Tor; Meldung älter als 60 s → nichts; gleiche Anzahl (Korrektur) → nichts; kleinere Anzahl (Entfernen) → nichts; neu erscheinendes Spiel → nichts; zwei Spiele → zwei Tore in Kartenreihenfolge), `goalTitle` ("Tor! Feuerbach E1 3:1", Gegner), `goalSpeech` (mit Torschütze, ohne, Eigentor, Gegner mit Namen); in `tests/unit/live-board.test.ts` `GoalLine.team` und `GoalLine.scorer`; zuerst rot
- [x] T019 [US3] [C] `src/domain/live-board.ts` (`GoalLine.team`, `GoalLine.scorer`) und `src/domain/goal-alert.ts` (macht T018 grün, 100 % Branch-Coverage, R-E6)
- [x] T020 [P] [US3] [C] E2E `tests/e2e/live-einfach-us3.spec.ts`: 020 US3-S1 (`page.title()` "Tor! Feuerbach E1 3:1" nach Tor per `sendAs`), S2 (Titel zurück nach `visibilitychange` bzw. `focus`; im Vordergrund nach 30 s per `forward`; zweites Tor startet neu), S3 (Ansagebereich `dash-goal-announce` mit `aria-live="polite"`: "Tor für Feuerbach E1, 3 zu 1, Tom"; ohne Torschütze; "Eigentor"), S4 (`navigator.vibrate` per Init-Skript aufgezeichnet: einmal 200; ohne `vibrate` kein Fehler), S5 (Schalter "Ton bei Toren" `role="switch"` aus; Einschalten spielt einmal, jedes Tor einmal; Wiedergabe über aufgezeichnetes `HTMLMediaElement.play`), S6 (nach `reload` weiter an, "Ton aus · tippen" bis zur ersten Berührung), S7 (erstes Laden mit Toren und nachgeholte alte Meldungen: kein Titel, keine Ansage, kein `vibrate`, kein `play`), S8 (Korrektur und Entfernen: nichts), S9 (Dashboard in der App: Titel und Ansage ja, kein Schalter, kein `vibrate`, kein `play`); zuerst rot
- [x] T021 [US3] [C] `src/platform/signal.ts`: `playGoalSignal()` ohne Vibrationsmuster, `vibrateShort()` (R-E4); Unit-Test, falls die Funktionen ohne Browser prüfbar sind, sonst über T020
- [x] T022 [US3] [C] `src/ui/hooks.ts`: `useGoalAlert` (Titel mit Rücksetzen nach Sichtbarkeit, Fokus oder 30 s, Ansage, in der Eltern-Ansicht Vibration und Ton, R-E5); `useGoalFlash` unverändert
- [x] T023 [US3] [C] `src/ui/screens/live-dashboard.tsx`: Ansagebereich, Schalter "Ton bei Toren" unter der Statuszeile nur in der Eltern-Ansicht (gemerkt unter `torticker-goal-sound`), Probe beim Einschalten, "Ton aus · tippen" und Freischalten bei Berührung (FR-E25, FR-E26); `src/styles/app.css` Block Paket C (macht T020 grün)
- [x] T024 [US3] [C] Hilfe `src/domain/help-entries.ts`: neu `tor-hinweis` "Merke ich, wenn ein Tor fällt?" nach `keine-verbindung` (für Eltern, Quelle "020 US3", verwandt nur mit Eltern-Einträgen); Hilfe-Abdeckung grün

**Checkpoint**: US3 für sich nutzbar.

### Phase C2: US4 Ehrlicher Live-Status je Spiel (P1)

**Goal**: Aktualität in Klartext je laufender Karte, Warnung ab 5 Minuten, ruhige Kopfzeile.

**Independent Test**: siehe spec.md US4.

- [x] T025 [P] [US4] [C] Unit `tests/unit/live-board.test.ts`: `freshness` je Zustand (laufend < 60 s `fresh`; 1 bis 4 Min `age`; genau 5:00 und 7 Min `silent`; Uhr angehalten und Elfmeterschießen wie laufend; Halbzeit, Pause, vor der Verlängerung, noch nicht angepfiffen, beendet, Planspiel, Vortag → `null`) und `freshnessText`; den bisherigen Test "US3-S7 FR-L15" auf `freshness` umstellen (gleiche Prüftiefe, FR-E31); zuerst rot
- [x] T026 [US4] [C] `src/domain/live-board.ts`: `freshness` statt `staleMinutes`, `freshnessText`, `STALE_MS` "ab" (macht T025 grün, R-E7; nach T019, gleiche Datei)
- [x] T027 [P] [US4] [C] E2E `tests/e2e/live-einfach-us4.spec.ts`: 020 US4-S1 ("37' · gerade aktualisiert"), S2 ("vor 3 Min aktualisiert" nach `forward`, ohne Neuladen), S3 (7 Min ohne Meldung: "Seit 7 Min keine Meldung vom Spielfeld" zugeklappt sichtbar, Symbol `aria-hidden`, Minute läuft; kein "Letzte Meldung vor"), S4 (Halbzeit seit 12 Min: nur "Halbzeit"), S5 (beendet, angelegt, Planspiel: kein Alter), S6 ("Aktualisiert sich automatisch" ohne Punkt; "Verbinde …"), S7 (offline wie bisher, danach wieder "Aktualisiert sich automatisch"); zuerst rot
- [x] T028 [US4] [C] `src/ui/screens/live-dashboard.tsx`: Phasenzeile mit Alter bzw. Warnung (`dash-fresh-<key>`, Warnung behält `dash-stale-<key>`), aufgeklappter Hinweis entfällt, Statuszeile (FR-E30 bis FR-E34); `src/styles/app.css` Block Paket C (macht T027 grün)
- [x] T029 [US4] [C] `tests/e2e/live-us3.spec.ts` "006 US3-S7": neuer Wortlaut (Spec 006 US3-S7, geändert durch FR-E31), gleiche Prüftiefe
- [x] T030 [US4] [C] Hilfe: neu `keine-meldung` "Was bedeutet „keine Meldung vom Spielfeld“?" (für Eltern, Quelle "020 US4"); `keine-verbindung` und `eltern-dashboard` laut spec.md (Quelle zusätzlich "020 US4"); Hilfe-Abdeckung grün

### Phase C3: US5 Eltern-Ansicht ohne Ausgang in die Trainer-App (P2)

**Goal**: Fußzeile ein Satz, kein "Zum Torticker", Weg für Eltern, die selbst trainieren, über die Hilfe; Dashboard-Texte "Live für Eltern".

**Independent Test**: siehe spec.md US5.

- [x] T031 [P] [US5] [C] E2E `tests/e2e/live-einfach-us5.spec.ts`: 020 US5-S1 (Fußzeile mit Karten), S2 (ohne Spiel), S3 (Eltern-Hilfe mit neuem Eintrag, nur dort `help-open` "Torticker öffnen"), S4 (Tipp → Startbildschirm mit "Neues Spiel", keine Umleitung, Manifest der App), S5 (App-Dashboard-Fußzeile unverändert), S6 (Hinweis bei neu ausgestelltem Live-Spieltag in der App und `dashboard-none` mit "Zu „Live für Eltern“"); zuerst rot
- [x] T032 [US5] [C] `src/ui/screens/live-dashboard.tsx`: Fußzeile (FR-E40), Texte FR-E42 (macht T031 S1, S2, S5, S6 grün)
- [x] T033 [US5] [C] `src/ui/screens/help.tsx`: "{label} öffnen" in der Eltern-Hilfe für Eltern-Einträge mit Ziel (FR-E41)
- [x] T034 [US5] [C] `tests/unit/help-entries.test.ts`: Liste der Eltern-Einträge (neun), Ausnahme "Öffnen" nur `selbst-trainieren`, Ziel `/` zulässig; `tests/e2e/hilfe-eltern.spec.ts` "010 US2-S6" (kein "Zum Torticker") und "010 US2-S7" (neun Einträge, `eltern-home` weiter ohne Knopf); zuerst rot, dann mit T036 grün
- [x] T035 [US5] [C] `tests/e2e/live-us3.spec.ts` "006 R-L6" und "006 US3-S11": statt "Zum Torticker" `page.goto('./#/')` bzw. Hilfe-Knopf "Torticker öffnen"; Prüfung des Manifests unverändert
- [x] T036 [US5] [C] Hilfe: neu `selbst-trainieren` "Ich trainiere selbst. Wo finde ich den Torticker?" nach `keine-meldung` (für Eltern, `open: { label: 'Torticker', path: '/' }`, verwandt `eltern-home`, Quelle "020 US5"); Hilfe-Abdeckung grün (macht T031 S3, S4 und T034 grün)
- [x] T037 [US5] [C] Visuelle Referenzbilder `dashboard-hell-*` und `dashboard-dunkel-*` aller Profile aus dem CI-Artefakt übernehmen (R-E9)

**Checkpoint**: Paket C fertig.

---

## Abschluss (je Paket)

- [x] T038 [A] [C] `npm run check` (auch Bundle-Budget); Netzwerk-Wächter grün (FR-E28, keine neuen Verbindungen); `npm run e2e:changed`; gezielt die E2E der eigenen User Stories; Paket A zusätzlich `npm run e2e` (viele Tests umgestellt, Spielbildschirm). Im Cloud-Container `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`
- [x] T039 [A] `tests/e2e/a11y.spec.ts`: neuer `test` für Startbildschirm mit Knopf, Blätter "Eltern live zuschauen lassen" und "Teilen", "Live für Eltern" eingeklappt und aufgeklappt (axe ohne Verstöße)
- [x] T040 [C] `tests/e2e/a11y.spec.ts`: neuer `test` für die Eltern-Ansicht mit Schalter, Aktualität und Warnung (axe ohne Verstöße)
- [x] T041 [A] [C] Hilfe gegenprüfen: alle Einträge des Pakets aus spec.md "Hilfe" vorhanden, Bezeichnungen wörtlich wie in der App, keine Verweise auf "Zwischenstand teilen", "Kopplung beenden" oder "Zum Torticker" mehr (Constitution IX, Pflicht)
- [x] T042 [A] [C] `/code-review`, `/security-review`; Design-Check (Skill `anthropic-skills:attila-design-check`, Ziel: Paket A Startbildschirm, Spielmenü, Blätter, "Live für Eltern"; Paket C Dashboard hell/dunkel), P0/P1 beheben; Screenshots iPhone hell/dunkel an Atti; Status in spec.md
- [ ] T043 [A] [C] Gerätetest iPhone und Android: Teilen direkt nach "Neu starten" (R-E1), "Ton bei Toren" nach Rückkehr aus dem Hintergrund, Vibration auf Android, Tab-Titel am Rechner; Ergebnis in research.md

## Nachbesserung Design-Check (2026-11-18)

Vier P2-Befunde (FR-E60 bis FR-E66), Atti hat freigegeben. Test zuerst (rot), kleine Commits `fix(020)`/`test(020)`/`docs(020)`. Hauptbundle hat kaum Luft (59,6 KB von 60 KB): Code in `live-start.tsx`, `share-sheet.tsx`, `live-dashboard.tsx` (nachgeladen).

- [ ] T050 [P] [US1] [US2] Spielmenü (FR-E60, FR-E61): E2E "020 US2-S13" (kein `menu-live-quick`; "Teilen" → "Live-Link für Eltern" mit vollem Verhalten, Blatt ohne Live-Spieltag), "020 US2-S14" (`menu-live-toggle` letzter Eintrag, Gefahr-Farbe `rot-text`, "Live senden" neutral), "020 US2-S15" (375 × 667: "Schließen" im Blatt sichtbar ohne Scrollen); `live-einfach-us1` (S2, S4, S9, Reihenfolge) und `live-einfach-us2` (S8) auf den Weg über "Teilen" umstellen; `src/ui/screens/game.tsx`, `src/ui/components/live-start.tsx` (`MenuQuick` entfällt), `src/ui/components/share-sheet.tsx`
- [ ] T051 [P] [US1] Startbildschirm (FR-E62, FR-E63): E2E "020 US1-S11" (Karte weg mit Knopf, "Link einfügen" im Blatt; Karte bleibt ohne Mannschaft und bei neu ausgestellt), "020 US1-S12" (Blatt erkennt Trainer-Link, Zuschauer-Link, Kader-Liste, Einfügefeld wie die Karte); `startbildschirm.spec.ts` (018 US2) und `live-einfach-us1` S1 anpassen; `src/ui/components/live-start.tsx` (`StartLive`)
- [ ] T052 [P] [US4] Offline (FR-E64): Unit `tests/unit/live-board.test.ts` (`shownFreshness`), E2E "020 US4-S8"; `src/domain/live-board.ts`, `src/ui/screens/live-dashboard.tsx`
- [ ] T053 [P] [US5] Fußzeile (FR-E65): E2E "020 US5-S7"; `live-einfach-us5` S1, S2, S5 und `hilfe-eltern` anpassen; `src/ui/screens/live-dashboard.tsx`
- [ ] T054 Hilfe (FR-E66): `eltern-zuschauen`, `live-senden`, `trainer-link`, `kader-liste`, `selbst-trainieren`, `keine-verbindung`, `keine-meldung` (`src/domain/help-entries.ts`); Hilfe-Abdeckung grün
- [ ] T055 Specs 006, 012, 016, 018, 019 mit Nachtrag (erledigt mit der Spec)
- [ ] T056 `npm run check`; gezielte E2E; `npm run e2e:changed`; volle Suite; Referenzbilder `dashboard-*` später aus der CI

## Dependencies

- Paket A und Paket C sind voneinander unabhängig; jeder PR für sich mergebar (Hilfe-Abdeckung je Paket vollständig, weil jedes Paket nur Tests seiner eigenen User Stories anlegt).
- Paket A: T002 vor T005; T004 vor T005; T005 vor T006, T007 und T015 (gemeinsamer Ablauf); T011 und T012 vor T014 und T016; US1 vor US2 empfohlen (US2 nutzt den Ablauf aus US1).
- Paket C: T019 vor T026 (beide `live-board.ts`); T023 vor T028 vor T032 (alle `live-dashboard.tsx`, nacheinander); US5 hängt fachlich nicht von US3 und US4 ab.
- Hilfe-Aufgaben am Ende ihrer Story (T009, T017, T024, T030, T036).

## Parallel

- Paket A und Paket C komplett parallel (getrennte Worktrees, Regeln unter "Gemeinsam berührte Dateien").
- In Paket A: T001, T003 und T010 gleichzeitig schreibbar.
- In Paket C: T018, T020, T025, T027 und T031 gleichzeitig schreibbar.

## Strategie

MVP sind US1 (Paket A) und US3 mit US4 (Paket C). Je Paket ein PR, Commits je User Story; der zweite PR rebased auf `main` und lässt die Hilfe-Abdeckung und `npm run e2e:changed` erneut laufen.
