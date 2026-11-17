# Implementation Plan: Live einfacher für Trainer und Eltern (UX-Welle 1)

**Branch**: `020-live-einfach` (Spec-Branch `claude/inspiring-cerf-74utlc`; Umsetzung in zwei Arbeitszweigen, je einer für Paket A und Paket C) | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

## Summary

Zwei unabhängige Pakete aus dem Nutzertest vom 17.11.2026, ohne Änderung an Daten, Meldungsformat oder Dienst:

- **Paket A (Trainer, US1, US2)**: Der Knopf "Eltern live zuschauen lassen" auf dem Startbildschirm und im Spielmenü teilt den Link für die Eltern mit einem Tipp oder startet einen Live-Spieltag mit Standardwerten (`live-quick.ts` in der Domäne, `live-start.tsx` als nachgeladener Ablauf). Die Seite "Live für Eltern" (bisher "Live-Spieltag") hat einen Hauptknopf; alles Weitere steht eingeklappt unter "Für Trainer". Im Spiel ersetzt "Teilen" mit dem Blatt "Teilen" ("Live-Link für Eltern", "Stand als Text") das bisherige "Zwischenstand teilen"; "Ergebnis teilen" bleibt ein Tipp (Präzisierung 2026-11-17).
- **Paket C (Zuschauer, US3 bis US5)**: Das Dashboard erkennt neue Tore (`goal-alert.ts`) und zeigt sie im Tab-Titel, sagt sie an, vibriert und spielt auf Wunsch den Signalton ("Ton bei Toren"). Jede laufende Karte zeigt in Klartext, wie frisch ihr Stand ist, ab 5 Minuten eine Warnung (`freshness` in `live-board.ts`); die Kopfzeile sagt sonst nur "Aktualisiert sich automatisch". Die Eltern-Ansicht verliert "Zum Torticker"; die Eltern-Hilfe bekommt den Weg für Eltern, die selbst trainieren.

## Technical Context

Unverändert gegenüber `specs/001-spiel-erfassen/plan.md` und `specs/006-live-spieltag/plan.md` (TypeScript, Preact, Vitest, Playwright, eigener Dienst aus Spec 007). Keine neue Laufzeit-Abhängigkeit, keine Änderung an IndexedDB-Schema, Sicherung, Meldungsformat oder Dienst. Neu im Browser-Speicher nur `localStorage["torticker-goal-sound"]` (Eltern-Ansicht, R-E4).

**Performance/Constraints**: Hauptbundle < 60 KB gzip (Abläufe und Blätter nachgeladen, R-E10). iPhone SE 375 × 667 pt ohne Seiten-Scroll für Startbildschirm und Blätter; Dashboard ab 320 pt (Spec 006 FR-L18). Netzwerk-Wächter: keine neuen Verbindungen; "Neu starten" nutzt nur den bestehenden Vermittlungsdienst nach bewusster Aktion.

**PRs**: Ein PR je Paket (Paket A: US1 und US2, Paket C: US3 bis US5), Commits je User Story. Reihenfolge der Merges beliebig; der zweite PR rebased auf `main` (gemeinsame Dateien siehe unten).

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Link für Eltern mit 1 bis 2 Tipps (SC-E01); alle neuen Knöpfe und Schalterzeilen mindestens 64 pt; das Erfassen eines Tores bleibt ein Tipp, das Spielmenü wächst nur um einen Eintrag | erfüllt |
| II. Offline-first und lokal | Daten verlassen das Gerät nur nach "Neu starten", "Link einfügen" (bewusste Aktion, das Blatt nennt, was gesendet wird) bzw. über den bestehenden Live-Spieltag; "Neu starten" funktioniert ohne Netz; Torhinweis ohne Verbindung (FR-E28) | erfüllt |
| III. Datensparsamkeit | keine neuen Daten; "Ton bei Toren" nur lokal; Ansage nennt nur übertragene Vornamen bzw. Kürzel | erfüllt |
| IV. Test-first | Unit-Tests für `live-quick.ts` und `goal-alert.ts` sowie für `freshness` in `live-board.ts` (100 % Branch-Coverage) vor dem Code; E2E je Akzeptanzszenario ("020 USx-Sy") vor dem Umbau, zuerst rot | erfüllt |
| V. Zeit ist Berechnung | Alter der Meldung aus Serverzeit und Zeitpunkt der Meldung berechnet (R-E7); die 30 Sekunden des Tab-Titels sind eine Anzeigedauer, keine Spielzeit | erfüllt |
| VI. Einfachheit | zwei kleine Domänenmodule, zwei nachgeladene Komponenten, keine Abhängigkeit, kein Protokollumbau (Tor-Erkennung über Toranzahl wie die Hervorhebung) | erfüllt |
| VII. Vereinsdesign | nur bestehende Tokens und Bausteine (`start__opt`, `btn--primary`/`--secondary`, `.switch`, Hinweisstil `dash__status--alert`, Karten); keine neue Farbe; Design-Check nach der Umsetzung | erfüllt |
| VIII. Kostenfrei | kein neuer Dienst, kein Web Push | erfüllt |
| IX. Hilfe | 4 neue, 17 geänderte Einträge laut Spec-Abschnitt "Hilfe", je User Story eine Aufgabe, im PR des jeweiligen Pakets | erfüllt |

Bekannte iOS-Grenzen (Technische Rahmenbedingungen): keine Vibration (FR-E24 greift nicht), Safari hält Seiten im Hintergrund an (Tab-Titel wirkt vor allem am Rechner), Ton erst nach Berührung (FR-E26). In Spec und Hilfe benannt.

## Design

### Paket A: Trainer (US1, US2)

**Domäne**

| Datei | Änderung |
|---|---|
| `src/domain/live-quick.ts` (neu) | `quickAction(settings, game)`, `quickTeams(teams, ownTeam)`, `quickHint(...)` nach FR-E03 bis FR-E07 (R-E2) |
| `src/domain/live-spieltag.ts` | nur falls nötig: Hilfsfunktion für "Mannschaft des Spiels gehört dazu" (bestehend `liveTeamFor`/`sendingTeamFor` reichen voraussichtlich) |

**Plattform**

| Datei | Änderung |
|---|---|
| `src/platform/live-setup.ts` | `prepareLive()` erzeugt die Schlüssel vorab, `createLive(input, prepared?)` nutzt sie (R-E1); nach Anlegen bzw. Koppeln einmal das aktuelle Spiel melden (R-E3) |

**Oberfläche**

| Datei | Änderung |
|---|---|
| `src/ui/components/live-start.tsx` (neu, nachgeladen) | Ablauf "Eltern live zuschauen lassen": `runQuick` (Teilen sofort, danach Live-Schalter und Mannschaft), Blatt "Eltern live zuschauen lassen" (Zustände: Auswahl, Fertig mit "Link für Eltern teilen", Gekoppelt), nutzt `StartCouple`-Weg für "Link einfügen" |
| `src/ui/components/share-sheet.tsx` (neu, nachgeladen) | Blatt "Teilen" mit "Live-Link für Eltern" und "Stand als Text" (FR-E18) |
| `src/ui/screens/start.tsx` | Knopf "Eltern live zuschauen lassen" nach "Spiele verfolgen" (FR-E01, FR-E03), Modul beim Erscheinen vorladen, Statuszeile für Teilen-Ergebnis |
| `src/ui/screens/game.tsx` | Spielmenü: "Eltern live zuschauen lassen" als erster Eintrag (FR-E02), "Teilen" statt "Zwischenstand teilen" (FR-E18); "Ergebnis teilen" unverändert direkt (FR-E19); Teilen-Ergebnis im Meldeband (FR-E11, Spec 019 FR-A04); Band "neu teilen" unverändert |
| `src/ui/screens/live.tsx` | Titel "Live für Eltern"; Übersicht, Leerzustand, Lead-Handy mit einem Hauptknopf und eingeklapptem "Für Trainer" (FR-E13 bis FR-E16, R-E8); "Live beenden" (FR-E17); Hinweis "Neue Links ausgestellt" mit "Link für Eltern" |
| `src/ui/screens/more.tsx` | Eintrag "Live für Eltern" mit neuer Unterzeile (FR-E12) |
| `src/ui/components/share-preview.tsx` | unverändert (Vorschau bleibt in den Spieldetails) |

### Paket C: Zuschauer (US3 bis US5)

**Domäne**

| Datei | Änderung |
|---|---|
| `src/domain/goal-alert.ts` (neu) | `newGoals`, `goalTitle`, `goalSpeech` (R-E6) |
| `src/domain/live-board.ts` | `GoalLine.team`, `GoalLine.scorer`; `BoardCard.freshness` statt `staleMinutes`, `freshnessText` (R-E7); `STALE_MS` "ab" 5 Minuten |

**Plattform**

| Datei | Änderung |
|---|---|
| `src/platform/signal.ts` | `playGoalSignal()` (ohne Vibrationsmuster), `vibrateShort()` (R-E4) |

**Oberfläche**

| Datei | Änderung |
|---|---|
| `src/ui/hooks.ts` | `useGoalAlert` (Titel, Ansage, Vibration und Ton je nach Ansicht, R-E5); `useGoalFlash` unverändert (wird auch von `live-others.tsx` im Spiel genutzt) |
| `src/ui/screens/live-dashboard.tsx` | Statuszeile (FR-E33); Aktualität und Warnung auf der Karte, aufgeklappter Hinweis entfällt (FR-E30 bis FR-E32, FR-E34); Ansagebereich; Schalter "Ton bei Toren" mit "Ton aus · tippen" nur in der Eltern-Ansicht (FR-E25, FR-E26); Fußzeile (FR-E40); Texte "Live für Eltern" im Dashboard der App (FR-E42) |
| `src/ui/screens/help.tsx` | Knopf "{label} öffnen" in der Eltern-Hilfe für Einträge, die für Eltern gekennzeichnet sind und ein Ziel haben; einziger solcher Eintrag ist `selbst-trainieren` (FR-E41) |
| `src/domain/help-entries.ts` | Einträge laut Spec-Abschnitt "Hilfe" (US3 bis US5); `selbst-trainieren` mit `open: { label: 'Torticker', path: '/' }` |

### Gemeinsam berührte Dateien

| Datei | Paket A | Paket C | Regel |
|---|---|---|---|
| `src/domain/help-entries.ts` | neu `eltern-zuschauen` (vor `live-anlegen`), Änderungen an `live-anlegen`, `live-senden`, `zwischenstand`, `ergebnis-teilen`, `kopplung-beenden`, `navigation` und den Wegen "Mehr" → "Live für Eltern" | neu `tor-hinweis`, `keine-meldung`, `selbst-trainieren` (nach `keine-verbindung`), Änderungen an `keine-verbindung`, `eltern-dashboard` | `kopplung-beenden` (A) und `eltern-dashboard` (C) stehen nebeneinander: der zweite PR löst den Konflikt beim Rebase |
| `src/styles/app.css` | Block `/* Spec 020 Paket A */`: Startknopf, Blätter, `.live__trainer` | Block `/* Spec 020 Paket C */`: Phasenzeile mit Aktualität, Warnung, Schalterzeile, Fußzeile | je Paket ein eigener Block am Ende des jeweiligen Abschnitts; keine Änderung an gemeinsamen Regeln ohne Absprache |
| `tests/e2e/live-helpers.ts` | `openTrainerSection` (bei `createLive`), Aufrufe in `createLive` und `pasteLink` | neue Helfer nur am Dateiende (z. B. Tor mit Torschütze senden) | nur ergänzen, nicht umbauen |
| `src/ui/screens/live-dashboard.tsx` | nicht berührt | ändert auch die zwei App-Texte mit "Live für Eltern" (FR-E42, US5) | die Angleichung an US2 liegt in US5, damit nur ein Paket die Datei ändert und die Hilfe-Abdeckung je Paket aufgeht |
| `tests/e2e/live-us3.spec.ts` | nur Test "006 US1-S5" (`openTrainerSection` vor "Trainer-Link einfügen") | Tests "006 US3-S7", "006 R-L6", "006 US3-S11" | verschiedene Tests, getrennte Abschnitte der Datei |
| `tests/e2e/a11y.spec.ts` | eigener `test` für Blätter und "Live für Eltern" | eigener `test` für Schalter und Dashboard | je Paket ein neuer `test` am Dateiende, bestehende Tests unverändert |
| `specs/020-live-einfach/` | Status US1, US2 in spec.md, Haken in tasks.md | Status US3 bis US5, Haken in tasks.md | nur eigene Zeilen ändern |
| andere Specs (006, 010, 012, 018, 019, 001, 005, 007, 008, 017) | schon mit dieser Spec ergänzt ("geändert durch Spec 020") | ebenso | keine weiteren Änderungen nötig, außer Status-Hinweisen |

### Tests

- **Unit (zuerst rot)**: `tests/unit/live-quick.test.ts` (Paket A), `tests/unit/goal-alert.test.ts` und Ergänzungen in `tests/unit/live-board.test.ts` (Paket C). Der bestehende Test "US3-S7 FR-L15" in `live-board.test.ts` wird auf `freshness` umgestellt (gleiche Prüftiefe, neue Anforderung FR-E31).
- **E2E je User Story**, Namen mit "020 USx-Sy": Paket A `tests/e2e/live-einfach-us1.spec.ts`, `tests/e2e/live-einfach-us2.spec.ts`; Paket C `tests/e2e/live-einfach-us3.spec.ts`, `tests/e2e/live-einfach-us4.spec.ts`, `tests/e2e/live-einfach-us5.spec.ts`. Zeit per `forward` aus `tests/e2e/helpers.ts`, Teilen per Fixture `recorded`, Dienst per `FakeRelay`.
- **Bestehende Tests, Paket A**: Knöpfe unter "Für Trainer" brauchen vorher `openTrainerSection` (direkt genutzt in `live-us1`, `live-us3` (nur 006 US1-S5), `live-us5`, `dienst-us2`, `spieltag-sicher-us1`, `trainer-paket-us1`, `trainer-paket-us2`, `trainer-paket-us4`, `spielplan-us1`, `paket-helpers.ts`, `plan-helpers.ts`, `startbildschirm.spec.ts`); `012 US1-S6` und `006 US5-S2` folgen den geänderten Anforderungen (FR-E15, FR-E17). "Zwischenstand teilen" (`menu-share-interim`) öffnet jetzt das Blatt: neuer Helfer `shareAsText(page)` in `tests/e2e/helpers.ts` ("…" → "Teilen", dann "Stand als Text"); umgestellt werden die Tipps auf `menu-share-interim` in `us4-teilen`, `spielbildschirm-us1` und `spiel-korrigieren`. "Ergebnis teilen" (`btn-share`) bleibt ein Tipp, die Tests dazu bleiben (Präzisierung 2026-11-17). Prüftiefe unverändert; Erwartungen an den geteilten Text bleiben.
- **Bestehende Tests, Paket C**: `006 US3-S7` (neuer Wortlaut, FR-E31), `006 R-L6` und `006 US3-S11` in `live-us3.spec.ts` (statt "Zum Torticker" der Hilfe-Knopf "Torticker öffnen" bzw. `#/`), `010 US2-S6` und `010 US2-S7` in `hilfe-eltern.spec.ts` (kein "Zum Torticker", neun Eltern-Einträge, nur `selbst-trainieren` mit Knopf) sowie in `tests/unit/help-entries.test.ts` die Liste der Eltern-Einträge, die Ausnahme "Öffnen" für `selbst-trainieren` und das Ziel `/` (FR-H10, FR-H16, geändert durch FR-E41).
- **Visuell**: Referenzbilder `dashboard-*` aus dem CI-Artefakt des Pakets C (R-E9). Paket A ändert keine Referenzbilder.
- **a11y**: `tests/e2e/a11y.spec.ts` um die neuen Blätter (Paket A) und den Schalter (Paket C) ergänzen, jeweils im eigenen `test`.

## Risiken

- **Teilen nach dem Anlegen** (Safari): Mitigation R-E1 (Schlüssel vorab, Ausweichknopf); im Gerätetest prüfen (tasks.md, Abschluss).
- **Tests mit "Zwischenstand teilen"**: mechanische Umstellung über `shareAsText`, keine Abschwächung; Liste oben ("Ergebnis teilen" bleibt, Präzisierung 2026-11-17). Paket A lässt lokal `npm run e2e` laufen (übergreifend: gemeinsame Komponente Spielbildschirm, CLAUDE.md "Lokal testen" Punkt 4).
- **Zwei Live-Spieltage durch schnelles "Neu starten" zweier Trainer**: Das Blatt nennt den Einfügen-Weg zuerst (Spec 012 FR-S05 bleibt gewahrt); Ersetzen per Trainer-Link wie Spec 006 FR-L04.
- **Falscher Alarm bei stiller Halbzeit**: ausgeschlossen durch FR-E32 und Unit-Tests je Phase.
- **Ansagen zu häufig**: höchstens eine Ansage je Meldung; Ansagebereich `polite`.
- **Merge-Konflikte**: Regeln unter "Gemeinsam berührte Dateien"; der zweite PR rebased und lässt die Hilfe-Abdeckung laufen.
