# Research: Live einfacher für Trainer und Eltern (Spec 020)

Nummern R-E1 bis R-E10. Grundlagen des Live-Spieltags stehen in `specs/006-live-spieltag/research.md` (R-L1 bis R-L21), der eigene Dienst in `specs/007-push-benachrichtigung/research.md`. Keine neue Laufzeit-Abhängigkeit.

## R-E1 Teilen-Menü direkt nach "Neu starten" und mit einem Tipp

- **Decision**: Das Teilen-Menü (`navigator.share`) verlangt eine frische Berührung (transiente Aktivierung). Darum:
  1. Mit Live-Spieltag (FR-E04) ruft der Tipp `shareViewerLink` sofort auf, ohne vorher auf etwas zu warten; Live-Schalter des Spiels und gegebenenfalls die neue Mannschaft (FR-E05) werden erst danach gesetzt bzw. gesendet. Das Modul mit dem Ablauf (`live-start.tsx`, nachgeladen, R-E10) wird geladen, sobald der Knopf bzw. das Spielmenü erscheint, nicht erst beim Tipp.
  2. Ohne Live-Spieltag erzeugt das Blatt beim Öffnen schon die Schlüssel (Organisator-Schlüsselpaar, Topic, Zuschauer-Schlüssel: die `LiveDeps` aus `createSpieltag`), damit "Neu starten" nur noch signiert und speichert (wenige Millisekunden) und dann `navigator.share` aufruft.
  3. Lehnt der Browser trotzdem ab (`NotAllowedError`, `shareText` liefert dann den Ausweichweg Zwischenablage, der in Safari ebenfalls eine Berührung braucht und `failed` liefern kann), zeigt das Blatt "Fertig. Jetzt den Link teilen." mit "Link für Eltern teilen" (FR-E08, US1-S10). Der Live-Spieltag ist dann schon angelegt; ein weiterer Tipp teilt nur.
- **Rationale**: Chrome hält die Aktivierung 5 Sekunden, Safari deutlich kürzer und nicht über jede Promise-Kette hinweg. Schlüssel vorab zu erzeugen hält die Zeit zwischen Tipp und Teilen klein; der Ausweichknopf macht den Ablauf auch im schlechtesten Fall vollständig (SC-E01 gilt für den Normalfall).
- **Alternatives considered**: Erst anlegen, dann immer einen zweiten Knopf "Teilen" (immer 3 Tipps, verfehlt das Ziel); Teilen vor dem Anlegen mit vorab berechnetem Link (der Link hängt nur von Topic, Zuschauer-Schlüssel und Organisator-Schlüssel ab und ließe sich vorab bauen, aber ein geteilter Link ohne gespeicherten Live-Spieltag bei einem Absturz wäre ein toter Link; verworfen).
- **Test**: In den E2E-Profilen ist `navigator.share` nachgebildet (Fixture `recorded`); US1-S10 erzwingt die Ablehnung über die Fixture (einmal `NotAllowedError`).

## R-E2 Mannschaften für "Neu starten" und automatisches Hinzufügen

- **Decision**: Reine Funktionen in `src/domain/live-quick.ts`:
  - `quickTeams(teams, currentOwnTeam)`: Regel aus FR-E07 (Mannschaft des aktuellen Spiels, sonst die einzige, sonst alle, höchstens `MAX_LIVE_TEAMS` = 6) auf Basis von `liveTeamOptions` (Kurzformen wie auf den Chips).
  - `quickAction(settings, game)`: liefert `hidden` (FR-E03), `start` (kein Live-Spieltag) oder `share` mit `makeLive` (Spiel auf "Nicht live senden", nicht beendet) und `team` (`add` bei fehlender Mannschaft und weniger als sechs auf einem Trainer-Handy, `missing` sonst, `null` wenn sie dazugehört).
  - `quickHint(...)`: Texte "Neu mit E1 und E2.", "E3 ist jetzt dabei.", "E3 gehört nicht zum Live-Spieltag. Eltern sehen dieses Spiel nicht."
- Umsetzung über die bestehenden Wege: `createLive` (Spec 006, `live-setup.ts`) mit vorab erzeugten Schlüsseln (R-E1), `addTeamToLive` (Spec 006 US5) und `setLive` (Spec 006 FR-L09).
- **Rationale**: Domäne mit 100 % Branch-Coverage (Qualitätstor); Startbildschirm und Spielmenü teilen dieselbe Logik.
- **Alternatives considered**: Logik je Bildschirm (doppelt, nicht unit-testbar); fehlende Mannschaft immer nur melden (verfehlt "ein Tipp", der häufige Fall E3 neu in der Saison bliebe ohne Eltern).

## R-E3 Laufendes Spiel geht live, wenn der Live-Spieltag mitten im Spiel entsteht

- **Decision**: Nach `createLive` bzw. `coupleLink` startet `startLiveSender` (bestehend). Der Sender meldet ein Spiel bisher bei jeder Änderung und als Lebenszeichen alle 3 Minuten (`resendActive`, R-L3); ein Spiel, das schon läuft, würde also spätestens nach 3 Minuten erscheinen. FR-E09 verlangt "sofort": Der Ablauf ruft nach dem Anlegen bzw. Koppeln für das aktuelle, nicht beendete Spiel einmal den bestehenden Sendeweg auf (wie nach einer Änderung). Beendete Spiele werden nicht nachgesendet; `resendActive` sendet ohnehin nur aktive bzw. vorbereitete Spiele.
- **Prüfung**: E2E US1-S6 erwartet die Karte auf dem Zuschauer-Gerät innerhalb von 10 Sekunden (SC-L01 aus Spec 006), ohne die Uhr vorzustellen.

## R-E4 Ton und Vibration in der Eltern-Ansicht

- **Decision**: Wiederverwendung von `src/platform/signal.ts` (Audio-Element, Medien-Kanal, Spec 001 R-17/R-18, Spec 008):
  - neu `playGoalSignal()`: spielt den gewählten Ton einmal, ohne das Vibrationsmuster von `playSignal()` (`[300, 150, 300]` ist für das Abschnittsende gedacht);
  - neu `vibrateShort()`: `navigator.vibrate(200)`, falls vorhanden; Fehler werden geschluckt;
  - `unlockAudio()` und `audioReady()` unverändert: Der Tipp auf den Schalter schaltet frei (Probe, FR-E25), jede Berührung der Eltern-Ansicht schaltet bei gesperrtem Ton frei (FR-E26). Die bestehende Regel "nach Rückkehr aus dem Hintergrund gilt der Ton als gesperrt" (R-20) gilt auch hier und zeigt "Ton aus · tippen".
  - Der gewählte Ton kommt aus den Einstellungen des Geräts (`getSettings().signalSound`, Vorgabe Pfiff).
- **Gemerkt**: `localStorage` unter `torticker-goal-sound` (`"1"` = an), Lesen und Schreiben in `try/catch` wie der Filter "Letzte Spiele" (Spec 007 FR-N13). Kein IndexedDB-Feld, damit die Einstellung nicht in die Sicherung gerät und Eltern ohne Torticker-Daten nichts anlegen.
- **Vibration**: Chrome auf Android vibriert nur nach einer ersten Berührung der Seite (Sticky Activation), Safari auf dem iPhone gar nicht (Constitution, Technische Rahmenbedingungen). Hingenommen; die Hilfe nennt "nicht auf dem iPhone".
- **Alternatives considered**: Web Audio (läuft auf dem iPhone über den Klingelton-Kanal, R-17, verworfen); eigener Torton (neue Datei, Spec 008 hat drei Töne, verworfen); Web Push (Spec 007 US4, Entscheidung Atti: diese Saison nicht).

## R-E5 Tab-Titel

- **Decision**: Ein Hook `useGoalAlert` (in `src/ui/hooks.ts`, neben `useGoalFlash`) setzt `document.title` auf den Text aus der Domäne (`goalTitle`, R-E6) und merkt sich den vorigen Titel. Zurück, wenn (a) `visibilitychange` von verborgen zu sichtbar wechselt, (b) das Fenster `focus` bekommt, nachdem es den Fokus nicht hatte, oder (c) 30 Sekunden nach dem letzten Tor vergangen sind (`setTimeout`, beim nächsten Tor neu). Beim Verlassen des Dashboards wird der Titel sofort zurückgesetzt.
- **Rationale**: Am Rechner ist der Tab-Titel der einzige Hinweis, der neben anderer Arbeit sichtbar ist (Persona Elternteil im Büro); dort hält der Browser die WebSocket-Verbindung im Hintergrund offen (Spec 007). Der 30-Sekunden-Timer ist eine Anzeigedauer, keine Uhr (Constitution V betrifft die Spielminute nicht).
- **Alternatives considered**: Blinkender Titel im Wechsel (unruhig, für Screenreader störend); Favicon mit Punkt (mehr Aufwand, kaum sichtbar auf dem Handy).

## R-E6 Neues Tor erkennen und ansagen

- **Decision**: Reine Funktionen in `src/domain/goal-alert.ts`:
  - `newGoals(prev, cards, serverNow)`: vergleicht die Toranzahl je Spiel mit dem vorigen Stand (wie `useGoalFlash`) und liefert je Spiel mit gestiegener Anzahl und frischer Meldung (`serverNow - updatedAt < 60 s`) das neueste Tor; `prev = null` (erstes Laden) liefert nichts.
  - `goalTitle(goal)`: "Tor! Feuerbach E1 3:1".
  - `goalSpeech(goal)`: "Tor für Feuerbach E1, 3 zu 1, Tom" (Torschütze nur, wenn übertragen; "Eigentor" bei `ownGoal`; ohne Elfmeter und Vorlage).
- Dafür bekommt `GoalLine` in `src/domain/live-board.ts` die Felder `team` (Name der Mannschaft, die getroffen hat, wie auf der Karte) und `scorer` (übertragener Name oder `null`, bei Eigentor `"Eigentor"`); `who` bleibt für den Torverlauf unverändert.
- **Ansagebereich**: ein unsichtbarer Bereich mit `aria-live="polite"` und `aria-atomic="true"` (`data-testid="dash-goal-announce"`), der bei jedem neuen Tor den Text setzt (mehrere Tore durch ". " getrennt in einer Ansage); nach 5 Sekunden wird er geleert, damit dieselbe Ansage beim nächsten Tor erneut gelesen wird.
- **Rationale**: Testbar mit 100 % Branch-Coverage; dieselbe Regel wie die Hervorhebung vermeidet Hinweise beim Laden und Nachholen (FR-E21). Korrektur (gleiche Anzahl) und Entfernen (kleinere Anzahl) lösen nichts aus. Ein wiederhergestelltes Tor zählt wie ein neues (Randfall, spec.md).
- **Alternatives considered**: Tor-Kennungen im Live-Stand (Protokolländerung für alle Handys, unnötig); `role="alert"` (unterbricht VoiceOver, zu laut für jedes Tor).

## R-E7 Aktualität einer Karte

- **Decision**: `BoardCard.staleMinutes` wird ersetzt durch `freshness: { kind: 'fresh' } | { kind: 'age'; minutes: number } | { kind: 'silent'; minutes: number } | null`, berechnet in `cardOf` aus `serverNow - entry.at` und dem Uhrzustand: `null` außerhalb laufender Spiele und in Pausen (Uhrstatus `break`, also "Halbzeit", "Pause", "Verlängerung" vor deren Anpfiff), sonst `fresh` unter 60 s, `age` von 1 bis 4 Minuten (abgerundet), `silent` ab 5 Minuten (`STALE_MS`, jetzt "ab" statt "mehr als"). Texte über `freshnessText` in derselben Datei ("gerade aktualisiert", "vor 3 Min aktualisiert", "Seit 7 Min keine Meldung vom Spielfeld").
- **Statuszeile**: `statusDetail` in `live-dashboard.tsx` entfällt für den Zustand `live`; `STATE_TEXT.live` wird "Aktualisiert sich automatisch", ohne `live-pill__dot`. Offline unverändert (Tests 006 US3-S6, 007 dienst-us1 bleiben grün).
- **Rationale**: Ein Feld statt zweier Bedingungen in der Oberfläche; Pausen erkennt die Domäne schon (`runningPhase`).
- **Alternatives considered**: Alter auch in Pausen zeigen (falscher Alarm in der Halbzeit, Entscheidung Atti); Alter in eigener Zeile (zusätzliche Höhe je Karte; die Phasenzeile bricht bei Platzmangel um, FR-L18).

## R-E8 Aufklappbarer Bereich "Für Trainer"

- **Decision**: Knopf mit `aria-expanded` und `aria-controls` (wie "LETZTE SPIELE" im Dashboard, Spec 007), kein `<details>`, damit Gestaltung und Tests einheitlich bleiben. Zustand in einer Modulvariable von `live.tsx` (eingeklappt nach App-Start, bleibt bis zum Zuklappen, FR-E14). Testkennungen: `live-trainer-toggle`, `live-trainer`; alle bisherigen Kennungen (`btn-share-trainer`, `btn-plan`, `btn-team-add`, `btn-live-title`, `btn-live-reissue`, `btn-live-end`, `btn-paste-link`, `btn-live-create`, `btn-share-viewer`) bleiben.
- **Tests**: Neuer Helfer `openTrainerSection(page)` in `tests/e2e/live-helpers.ts` klappt auf, wenn der Knopf da und zu ist, sonst nichts. `createLive` und `pasteLink` rufen ihn vor den eingeklappten Knöpfen auf (Ergänzung, kein Umbau). Damit laufen alle Tests, die diese Helfer nutzen, auf beiden Paket-Zweigen.

## R-E9 Visuelle Referenzbilder

- **Decision**: Die Bilder `dashboard-hell-*` und `dashboard-dunkel-*` (alle Profile) ändern sich (Statuszeile, Schalter "Ton bei Toren", Fußzeile, Aktualität auf der Karte). Sie werden nach dem ersten CI-Lauf des Pakets C aus dem Artefakt `playwright-report-<profil>-<n>` (`*-actual.png`) übernommen, wie Spec 019 R-A4 und Spec 001 R-22, und im selben PR eingecheckt. Die Bilder des Spielbildschirms ändern sich nicht (Spielmenü und Blätter sind darin geschlossen).
- **Rationale**: Nur das Playwright-Image der CI liefert vergleichbare Schriftdarstellung.

## R-E10 Bundle-Budget und Parallelarbeit

- **Decision**: Hauptbundle unter 60 KB gzip. Im Hauptbundle nur der Knopf auf dem Startbildschirm und der Menüeintrag; Blatt "Eltern live zuschauen lassen", Ablauf und Blatt "Teilen" liegen in nachgeladenen Modulen (`src/ui/components/live-start.tsx`, `src/ui/components/share-sheet.tsx`), wie `start-couple.tsx` (R-L7). Schalter, Titel und Ansage gehören zum Dashboard, das schon nachgeladen wird.
- **Parallelarbeit**: Paket A und Paket C ändern getrennte Dateien; gemeinsam sind nur `src/domain/help-entries.ts`, `src/styles/app.css`, `tests/e2e/live-helpers.ts`, `tests/e2e/live-us3.spec.ts` (verschiedene Tests), `tests/e2e/a11y.spec.ts` (je ein neuer Test) und `specs/020-live-einfach/` (tasks.md, Abschnitt "Gemeinsam berührte Dateien"). Jedes Paket legt nur Tests seiner eigenen User Stories an, damit die Hilfe-Abdeckung (Spec 010 FR-H21) in jedem PR für sich aufgeht. Konfliktarme Regeln: Paket A fügt Hilfe-Einträge am Anfang des Themas "Live-Spieltag" ein, Paket C nach `keine-verbindung`; CSS je Paket in einem eigenen, mit Kommentar markierten Block; Helfer von Paket A stehen bei `createLive`, die von Paket C am Dateiende.

## Gerätetest (T043)

Gerätetest 18.11.2026 durch Atti am iPhone: Live starten, Link teilen (Safari, direkt nach Neu starten), Eltern-Ansicht, Tor: bestanden.
