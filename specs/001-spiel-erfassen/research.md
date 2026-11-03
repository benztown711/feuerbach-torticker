# Research: Spiel erfassen

Stand 2026-11-02. Jede Entscheidung im Format Decision / Rationale / Alternatives.

## R-1 UI-Bibliothek

- **Decision**: Preact 11 + @preact/signals.
- **Rationale**: ca. 5 KB, JSX mit Typprüfung, Komponenten testbar mit Testing Library, Signals liefern feingranulare Updates ohne Store-Framework (wichtig für < 100 ms bei Tor-Tap und eine Uhr, die 4× pro Sekunde rendert).
- **Alternatives**: Vanilla TS (kleinst, aber eigene Render-Logik für 7 Bildschirme = mehr Code und Fehler); Lit (Web Components, Shadow DOM erschwert globale Token-Styles und Tests); React (dreimal größer ohne Mehrwert hier); Svelte (gut, aber eigener Compiler und weniger verbreitete Testwerkzeuge).

## R-2 Zeitmodell

- **Decision**: Die Uhr ist eine reine Funktion `deriveClock(events, nowMs, schema)`. Ereignisse: `kickoff`, `pause`, `resume`, `sectionEnd`, `fullTime`, `reset`, jeweils mit `at` (Epoch-ms aus `Date.now()`). Gespielte Zeit im Abschnitt = Summe der Laufintervalle. Darstellung wird 4× pro Sekunde neu berechnet, nie hochgezählt.
- **Rationale**: Erfüllt Prinzip V und SC-003; übersteht Sperrbildschirm, Hintergrund, Neuladen. Vollständig unit-testbar mit festen Zeitstempeln.
- **Alternatives**: `performance.now()` (pausiert auf iOS im Hintergrund, nicht persistierbar); `setInterval`-Zähler (driftet, verliert Zeit im Hintergrund).

## R-3 Minutenformel

- **Decision**: Reguläre Minute = `sectionOffset + floor(playedInSection / 60 s) + 1`, gedeckelt auf das Abschnittsende. In der Nachspielzeit: Label `"{Abschnittsende}+{floor(overtime / 60 s) + 1}'"`. `sectionOffset = (Abschnitt − 1) × Abschnittsdauer`. Beispiele: 2 × 25 → 1. HZ 1' bis 25', dann 25+1'; 2. HZ ab 26', Nachspielzeit 50+1'. 3 × 25 → 75+1'.
- **Rationale**: Entspricht der Spec (FR-005) und der üblichen Fußball-Notation.
- **Alternatives**: Fortzählen über das Abschnittsende (26' in der 1. HZ) wurde in der Klärung verworfen.

## R-4 Signal am Abschnittsende

- **Decision**: Web Audio API (Oszillator-Ton, kein Audio-File nötig), beim Anpfiff per Nutzer-Geste freigeschaltet (`AudioContext.resume()`). Zusätzlich blinkt die Uhrfläche 3 s (`rot-tief`/`surface` im Wechsel, ohne Flackern über 3 Hz). `navigator.vibrate([300,150,300])`, wo vorhanden (Android). Auslösung bei 00:00 und jeder vollen Nachspielminute; bereits ausgelöste Schwellen werden im Spiel gespeichert, damit nach Neuladen nicht doppelt signalisiert wird.
- **Rationale**: Klärung vom 02.11.: Ton + Blinken genügen auf dem iPhone.
- **Grenzen (dokumentiert in der App-Hilfe)**: iOS spielt Web-Audio nur bei eingeschaltetem Bildschirm und App im Vordergrund; Lautlos-Schalter dämpft je nach iOS-Version. Daher Wake Lock (R-5) als Pflicht.
- **Alternatives**: Push-Benachrichtigungen (bräuchten Server); native Hülle mit Capacitor (in Klärung verworfen, später nachrüstbar).

## R-5 Bildschirm wach halten

- **Decision**: Screen Wake Lock API (`navigator.wakeLock.request('screen')`) solange die Uhr läuft; bei `visibilitychange` neu anfordern. Fallback ohne API: Hinweis "Automatische Sperre auf 'Nie' stellen".
- **Rationale**: Unterstützt in Safari ab 16.4, in Home-Bildschirm-Apps verlässlich ab iOS 18.4; Chrome Android seit Langem.
- **Alternatives**: Stummes Video in Endlosschleife (NoSleep-Trick, unzuverlässig, Akku).

## R-6 Speicherung und Historie

- **Decision**: IndexedDB über `idb` (ca. 1 KB). Object Stores `games`, `players`, `settings`. Jede Aktion schreibt sofort (write-through). Beim Start `navigator.storage.persist()`. Läuft die App nicht im Standalone-Modus (`display-mode: standalone`), erscheint ein Hinweis zur Installation. Export/Import als JSON nach `contracts/export.schema.json`.
- **Rationale**: Safari löscht Skript-Speicher von Webseiten nach 7 Tagen ohne Nutzung, nicht aber von Home-Bildschirm-Apps. Export schützt bei Handywechsel (FR-022 bis FR-024).
- **Alternatives**: localStorage (synchron, 5 MB, gleiche Löschregel, keine Transaktionen); OPFS (unnötig komplex).

## R-7 PWA und Offline

- **Decision**: vite-plugin-pwa 2 mit `generateSW`, Precache aller Assets inkl. Schriften, `registerType: 'prompt'` (Update-Hinweis, nie während eines laufenden Spiels neu laden). Manifest: `display: standalone`, `orientation: portrait`, `theme_color` = `vereinsrot`, `background_color` = `surface`.
- **Rationale**: Bewährt, Workbox-basiert, mit Vite 8 kompatibel.
- **Alternatives**: Handgeschriebener Service Worker (Fehlerquelle beim Cache-Versionieren).

## R-8 Icons

- **Decision**: @vite-pwa/assets-generator erzeugt aus `design/brand/wappen.svg` Apple-Touch-Icon 180 px, 192/512 px und maskable 512 px (Wappen in 80 %-Zone auf `wappenfeld` Weiß).
- **Rationale**: Wappen bleibt unverzerrt (FR-019), reproduzierbar im Build.

## R-9 Design-Tokens nach CSS

- **Decision**: `scripts/tokens-to-css.ts` erzeugt `src/styles/tokens.css`: `:root` (hell), `@media (prefers-color-scheme: dark)` und `[data-theme]`-Überschreibungen für den Schalter "immer hell". Typo-Stile als Utility-Klassen (`.t-ergebnis`, `.t-label` …). Stylelint-Regel `color-no-hex` + `declaration-strict-value` verbietet Farbwerte außerhalb der generierten Datei. `scripts/check-contrast.ts` prüft definierte Paare (Text/Fläche) für beide Themes gegen 4,5:1 bzw. 3:1 (SC-006).
- **Rationale**: Eine Quelle (Prinzip VII), automatisch prüfbar.

## R-10 Tests

- **Decision**:
  - Vitest: `domain/*` mit 100 % Zweigabdeckung als Ziel (Uhr, Minute, Reducer, Teilen-Text, Export).
  - Playwright: Projekte `iphone` (WebKit, iPhone 15) und `android` (Chromium, Pixel 7). `page.clock.install()` + `fastForward` für 25-Minuten-Szenarien in Sekunden. Ein Spec-File pro User Story, Testnamen mit FR-IDs.
  - @axe-core/playwright auf jedem Bildschirm.
  - Netzwerk-Wächter im E2E: jeder Request außerhalb der eigenen Origin lässt den Test fehlschlagen (Prinzip III).
  - Lighthouse CI auf dem Build: PWA- und Accessibility-Kategorie ≥ 0,9 (SC-005).
- **Rationale**: WebKit-Engine kommt iOS-Safari am nächsten; Zeitsprünge machen Uhr-Tests schnell und deterministisch.
- **Grenzen**: Wake Lock, echte Töne und Home-Bildschirm-Speicher lassen sich nur auf echten Geräten prüfen → manuelle Checkliste in quickstart.md.

## R-11 Hosting und Deployment

- **Ausgangslage**: Repository ist privat. GitHub Pages für private Repos erfordert einen kostenpflichtigen GitHub-Plan; die Seite selbst ist dann trotzdem öffentlich.
- **Optionen**:
  1. **Repository öffentlich machen + GitHub Pages** (kostenlos, einfachste Pipeline mit `actions/deploy-pages`). Code enthält keine personenbezogenen Daten; Beispielnamen in Specs sind fiktiv.
  2. **Privat bleiben + Cloudflare Pages** (kostenlos, Deploy per `cloudflare/wrangler-action` mit API-Token als Repository-Secret, eigene Subdomain `*.pages.dev`, PR-Vorschauen inklusive).
  3. **Privat bleiben + GitHub Pro** (4 USD/Monat), sonst wie Option 1.
- **Decision (02.11.2026)**: Option 1. Repository öffentlich, Deployment mit `actions/upload-pages-artifact` + `actions/deploy-pages`, Vite `base: '/feuerbach-torticker/'`. Später optional eigene Domain (z. B. `torticker.sportvg-feuerbach.de`, DNS-Eintrag beim Verein).
- **Folge**: Keine echten Kindernamen in Repo, Issues oder Testdaten (CI-Check gegen eine lokale, nicht eingecheckte Namensliste ist nicht möglich; daher Review-Regel und fiktive Testnamen).

## R-12 Automatisierung

- **Decision**:
  - `ci.yml` bei jedem PR: `npm ci` → ESLint + Stylelint + Prettier → `tsc --noEmit` → Vitest mit Coverage → Build → Kontrastprüfung → Playwright (beide Profile) → Lighthouse CI. Artefakte: Playwright-Report, Screenshots.
  - `deploy.yml` bei Push auf `main`: Build und Deploy (Ziel nach D-1).
  - `release.yml`: release-please erzeugt Versions-PRs und Changelog aus Conventional Commits; PR-Titel werden per `amannn/action-semantic-pull-request` geprüft.
  - Dependabot wöchentlich für npm und GitHub Actions, gruppiert.
  - Branch-Schutz für `main`: CI grün erforderlich.
- **Rationale**: "Höchst automatisiert" laut Projektauftrag; jeder Merge ist sofort auf den Handys verfügbar (Update-Hinweis in der App).

## R-13 Kader importieren, teilen, Aufgebot (User Stories 5 und 7)

- **Decision**:
  - Listen-Import: eigener, unit-getesteter Parser `src/domain/roster-parse.ts` (Zeilen → `{number?, firstName, lastName?, warnings[]}`), danach `src/domain/roster-names.ts` für Anzeigenamen: pro Vornamen-Gruppe die kürzeste Nachnamen-Abkürzung, die alle unterscheidet ("Max Mü." / "Max Me."). Nachnamen leben nur im Speicher der Vorschau und werden nie persistiert.
  - Zuordnung beim erneuten Import: gleiche Nummer und gleicher Vorname → derselbe Spieler; sonst Vorname + Präfix-Verträglichkeit der Abkürzung; sonst neu. Abkürzungen werden bei Bedarf verlängert.
  - Kader teilen: Textliste "Nummer Name" über das Teilen-Menü; Empfänger nutzen denselben Listen-Import. Kein eigenes Code-Format, kein QR.
  - Aufgebot: Mehrfachauswahl beim Anlegen, Vorauswahl aus `settings.lastSquad`; Schnellauswahl als Raster mit bis zu 16 Knöpfen (4 × 4) ohne Scrollen.
- **Rationale**: Klärung vom 02.11.: Teilen per WhatsApp genügt; kein Server, keine Kindernamen im öffentlichen Repo; minimaler Code (Prinzip VI), ein Import-Weg für alle Quellen.
- **Alternatives**: QR-Code/komprimierter Kader-Code (mehr Abhängigkeiten, nach Klärung nicht nötig); SpielerPlus-CSV (nur mit Premium; kann später auf denselben Parser aufsetzen); zentraler Kader auf Server (Datenschutz Minderjähriger, widerspricht Prinzip II und III).

## R-14 Anpassungen bei der Umsetzung von Phase 1 (02.11.2026)

- **TypeScript 6.0 statt 7.0**: typescript-eslint 8 unterstützt TypeScript bis < 6.1; TypeScript 7 (nativer Compiler) hat noch keine kompatible Lint-Anbindung. Wechsel, sobald typescript-eslint TS 7 unterstützt (Dependabot meldet es).
- **App-Icons per CLI** (`npm run icons`, @vite-pwa/assets-generator) vor dem Vite-Build statt über die pwaAssets-Integration von vite-plugin-pwa; die Integration hat im Build keine Dateien ausgegeben. Icons liegen generiert in `public/brand/` (nicht eingecheckt), Manifest und `<head>` verweisen explizit darauf.
- **Schriften** werden direkt aus `design/fonts/` über `src/styles/tokens.css` eingebunden und von Vite mit Hash ausgeliefert (kein Kopieren nötig). `OFL.txt` wird mit ausgeliefert.
- **Lighthouse CI** läuft per `npx @lhci/cli@0.15.1` nur in der CI und ist keine Projekt-Abhängigkeit, weil die Lighthouse-Kette viele bekannte Schwachstellen in Dev-Abhängigkeiten mitbringt. Die PWA-Kategorie gibt es in Lighthouse 12 nicht mehr; Installierbarkeit (Manifest, Icons, Service Worker) prüft stattdessen der E2E-Smoke-Test.
- **Dependency Review** blockiert nur Laufzeit-Abhängigkeiten ab Schweregrad "high"; Dev-Werkzeuge werden über Dependabot aktuell gehalten.

## R-15 Review B (Mockups, 02.11.2026)

- **Kleinstes Gerät als Maßstab**: Playwright-Projekt `iphone-se` (WebKit, `devices['iPhone SE']`, 375 × 667) ergänzt; E2E-Kernszenarien und Screenshot-Vergleich laufen dort. Layout-Test: Spielbildschirm ohne Seiten-Scroll (`document.scrollingElement.scrollHeight <= innerHeight`).
- **Trikotfarben**: feste Palette `design/trikot-farben.json` (12 Farben) statt freier Farbwahl: garantiert geprüfte Kontraste, schnelle Auswahl am Spielfeldrand, keine Farbwerte im Code. Kontraste werden im Unit-Test geprüft (Schrift auf Knopf; Rahmen bei < 3:1 zum Hintergrund).
- **Kostenfreiheit (Constitution VIII)**: Native Hülle, Apple Developer Account, kostenpflichtige KI-Review-Dienste und bezahlte Hosting-Pläne sind ausgeschlossen. Für release-please-PRs, die CI auslösen sollen, wird ein kostenloses Fine-grained Personal Access Token als Repository-Secret genutzt.

## R-16 Anpassungen bei der Umsetzung des MVP (US1, US2)

- **Rückgängig vs. Entfernen**: "Rückgängig" (10 s nach dem Tap) löscht das Tor vollständig, weil es sich um ein Verklicken handelt; "Tor entfernen" über die Torliste setzt `deletedAt` und lässt das Tor durchgestrichen stehen (FR-008). So bleibt die Liste frei von Fehltaps.
- **Uhr-Ticks**: Die Anzeige rechnet alle 250 ms `deriveClock` neu; Signale werden über die Liste der fälligen Schwellen ausgelöst und sofort als signalisiert gespeichert (nach Neuladen höchstens ein Signal für mehrere verpasste Schwellen).
- **Tor-Knöpfe ohne `aria-label`**: Der sichtbare Text "TOR Feuerbach E1" ist der zugängliche Name (axe-Regel label-content-name-mismatch).
- **Theme "Dunkel"**: `tokens-to-css` erzeugt zusätzlich `:root[data-theme="dark"]`; die Auswahl in den Einstellungen folgt mit US6 (T077).
- **Stylelint**: `currentColor` ist als Schlüsselwort erlaubt (kein Farbwert), damit Linien-Icons die Textfarbe übernehmen.
- **Noch nicht umgesetzt** (gehört zu späteren Stories): Torschütze ändern (`goal-edit-scorer`, US3), Löschen von Toren in den Spieldetails (dort nur Anzeige; Entfernen über den Spielbildschirm), Einstellungen-Bildschirm (US6).

## R-17 Ton auf dem iPhone (Gerätetest 02.11.2026)

- **Befund**: Kein Signalton auf dem iPhone, weder lautlos noch mit Ton. Bildschirm wach und Uhr im Hintergrund funktionieren.
- **Decision**: `navigator.audioSession.type = 'playback'` (Safari 17+) gegen den Lautlos-Schalter; in `unlockAudio()` zusätzlich ein stiller 1-Sample-Puffer innerhalb der Berührung; jede Berührung des Spielbildschirms schaltet einen gesperrten AudioContext (`suspended`/`interrupted`) wieder frei; `playSignal()` versucht bei gesperrtem Context ein `resume()`; sichtbarer Hinweis "Ton aus · tippen" (FR-036).
- **Grenze**: Im Hintergrund oder bei gesperrtem Bildschirm spielt iOS keine Web-Töne. Abhilfe bleibt das Wachhalten des Bildschirms.
- **Prüfung**: Komponententest `tests/component/signal.test.tsx` (Fake-AudioContext), E2E `US2-S11`; echter Ton nur auf dem Gerät (quickstart.md, manueller Check).

## R-18 Anpassungen bei der Umsetzung von Kader, Aufgebot und Torschützen (US5, US3, US7)

- **Schnellauswahl nur mit Kader**: Die Torschützen-Auswahl öffnet sich nach einem eigenen Tor nur, wenn der Kader mindestens einen Spieler hat. Ohne Kader bleibt der MVP-Ablauf unverändert. Statt "Spieler anlegen" mitten im Spiel (Edge Case) bietet "Neues Spiel" bei leerem Kader den Link "Kader anlegen" an; ein Wechsel weg vom laufenden Spiel ist am Spielfeldrand riskant.
- **Rückgängig in der Schnellauswahl**: Solange die Auswahl offen ist, liegt "Rückgängig" (`btn-undo`) in ihrem Kopf statt in der Undo-Leiste, die sonst verdeckt wäre. Nach dem Schließen gilt wieder die Undo-Leiste (10 s ab Tor).
- **Torschütze nachtragen auf dem Spielbildschirm statt in den Spieldetails (T062)**: Das Aktionsmenü eines Tors ("Torschütze ändern") ist auch nach dem Schlusspfiff erreichbar. Die Spieldetails zeigen Torschützen nur an. Eigene Tore: Kader (inkl. "Andere …"), "Eigentor Gegner", "Ohne Torschütze"; Gegentore: Freitext "Name oder Rückennummer" (max. 30 Zeichen).
- **Zuordnung beim Einfügen**: Gleicher Vorname mit unterschiedlicher Nummer gilt als anderes Kind (kein Überschreiben der Nummer). Steht in der Liste keine Nummer, bleibt die gespeicherte erhalten.
- **Vorschau**: Zeilen lassen sich entfernen; jede Zeile zeigt "neu", "aktualisiert" oder "wieder sichtbar". Kopfzeilen mit Doppelpunkt (z. B. "E1:") werden übersprungen. Manuell eingetippte volle Namen bekommen den Hinweis "Bitte nur Vornamen" (FR-020).
- **Kader teilen**: Web Share API, sonst Zwischenablage mit Hinweis (`src/platform/share.ts`, auch für US4 nutzbar).

## R-19 Signal über Audio-Element statt Web Audio (zweiter Gerätetest 02.11.2026)

- **Befund**: Auch mit Audio-Session "playback" blieb Web Audio bei Lautlos-Schalter stumm, war mit Ton sehr leise und verstummte nach einigen Minuten (3. Nachspielminute: Blinken ohne Ton).
- **Ursache**: Web Audio läuft auf dem iPhone über den Klingelton-Kanal; iOS stellt den AudioContext nach Inaktivität still.
- **Decision**: Ein einziges `HTMLAudioElement` mit einer im Browser erzeugten WAV-Datei (Blob-URL, offline, keine Datei im Repo): drei Pfiffe à 0,3 s mit 2,9 kHz, nahezu Rechteck bei voller Aussteuerung. Freischaltung durch stummes Anspielen desselben Elements innerhalb einer Berührung; spätere Wiedergabe ohne Berührung erlaubt. Lehnt iOS ab, meldet `audioReady()` false und der Hinweis "Ton aus · tippen" erscheint.
- **Rationale**: Audio-Elemente nutzen den Medien-Kanal: kein Lautlos-Schalter, Regelung über die Lautstärketasten, keine Stilllegung im Vordergrund.
- **Prüfung**: `tests/component/signal.test.tsx` (WAV-Aufbau, Pegel, Freischaltung, Sperre); E2E `US2-S11` über gemocktes `HTMLMediaElement.play`. Echter Pegel nur auf dem Gerät.

## R-20 Audio-Kanal offen halten (vierter Gerätetest 02.11.2026)

- **Befund**: Nach #10 kam bei Ablauf der regulären Spielzeit kein Ton (mit und ohne Lautlos-Schalter, App im Vordergrund), obwohl dieselbe Technik im Test zuvor funktionierte.
- **Hypothese**: iOS legt die Audio-Sitzung einer Web-App nach einigen Minuten ohne Wiedergabe still; das spätere `play()` ohne Berührung wird dann verweigert oder bleibt stumm.
- **Decision**: Ein zweites Audio-Element spielt ab dem Anpfiff (innerhalb der Berührung gestartet) eine 1-s-Stille in Schleife, solange das Spiel läuft oder angehalten ist; beim Schlusspfiff bzw. Verlassen wird es gestoppt. Zusätzlich "Signal testen" (FR-039) zur Kontrolle vor dem Anpfiff.
- **Nebenwirkung**: iOS kann die App in der Steuerzentrale als "Wiedergabe" anzeigen; der Akkuverbrauch einer stillen Spur ist vernachlässigbar.
- **Ergänzung (fünfter Gerätetest)**: Nach Neuladen kam der Ton bei 00:00 und in der Nachspielzeit zuverlässig; ohne Neuladen nach längerer Nutzung/Hintergrund nicht. Daher gilt der Ton nach jeder Rückkehr aus dem Hintergrund (`visibilitychange`) als gesperrt; der Hinweis "Ton aus · tippen" erscheint, die nächste Berührung schaltet neu frei.

## R-21 Navigation, Historie, Teilen, Einstellungen (Review B Runde 4, 02.11.2026)

- **Navigationsleiste (FR-037)**: feste Leiste (`position: fixed`), Höhe `--nav-h: 56px` plus `env(safe-area-inset-bottom)`; der Body reserviert diesen Platz, der Spielbildschirm zieht ihn von seiner Höhe ab. FR-033 bleibt erfüllt (E2E `nav.spec.ts` auf 375 × 667). Aktiver Eintrag mit 3-px-Linie in `ink` statt Schatten (Design System: keine Schatten).
- **"Spiel"-Ziel**: Läuft ein Spiel (Uhr läuft, angehalten oder Halbzeitpause), führt "Spiel" außerhalb des Spielbildschirms direkt dorthin und zeigt "Läuft <Minute>" bzw. "Pause"; im Spielbildschirm selbst führt es zur Startseite (dort "Spiel fortsetzen" oder "Neues Spiel"). So bleibt die Startseite erreichbar, ohne ein Spiel beenden zu müssen.
- **Menü "…"**: "Uhr zurücksetzen" entfällt (Atti, Runde 4), "Zur Startseite" entfällt (übernimmt die Leiste). "Spieldetails" bleibt im Menü, weil ein laufendes Spiel sonst nur über die Historie erreichbar wäre. `resetClock` ist entfernt; `deriveClock` und das Export-Schema akzeptieren alte `reset`-Ereignisse weiterhin.
- **Historie (FR-038)**: Ergebnis aus Feuerbach-Sicht mit S/U/N, Filter-Chips nur bei mehr als einem eigenen Namen. Löschen erfolgt in den Spieldetails (Mockup 8) statt in der Liste; `history-delete-*` entfällt im UI-Vertrag.
- **Sicherung (FR-024)**: Teilen-Menü mit Datei (`navigator.canShare({ files })`), Fallback Download. Prüfung beim Einlesen ohne Laufzeit-Abhängigkeit (eigene Prüffunktionen in `src/domain/export.ts`); `ajv` nur als Dev-Abhängigkeit, um `buildBackup` gegen `contracts/export.schema.json` zu testen. Das Schema erlaubt jetzt `finalScore: null` (offene Spiele).
- **Gefundener Fehler bei der Selbstprüfung**: "Neues Spiel" überschrieb schnell Getipptes (Mannschaftsname, Spielzeit, Farben), wenn die Einstellungen erst danach geladen waren. Das Formular erscheint jetzt erst nach dem Laden der Einstellungen.

## R-22 Feinschliff (Phase 10) und Konsistenzprüfung

- **Offline (T082)**: E2E lädt die App, wartet auf den Service Worker, lädt neu (Seite wird gesteuert), schaltet den Browser-Kontext offline und legt ein Spiel mit Tor an.
- **Screenshot-Vergleich (T083)**: Vier Zustände des Spielbildschirms (läuft hell/dunkel, Nachspielzeit, Halbzeitpause) in allen drei Profilen. Die Referenzbilder stammen aus dem CI-Lauf (Ubuntu, Playwright-Browser der CI), weil lokal nur Chromium einer anderen Version verfügbar ist; sie liegen unter `tests/e2e/visual.spec.ts-snapshots/`. Toleranz `maxDiffPixelRatio: 0.01` für Kantenglättung; Animationen aus. Bei gewollten Layoutänderungen: CI-Artefakt `playwright-report` (Ordner `test-results`, `*-actual.png`) als neue Referenz übernehmen.
- **SC-001 (T085)**: Median aus 10 Taps (abwechselnd Heim/Gast, Doppeltipp-Schutz per Uhr-Vorlauf umgangen) statt Einzelmessung.
- **Historie**: angelegte, nicht angepfiffene Spiele heißen "nicht angepfiffen" (FR-038), nicht "läuft".
- **Sicherung**: `appVersion` aus `package.json`, beim Build per Vite-`define` eingesetzt (`src/version.ts`).
- **Konsistenz (T088)**: plan.md TypeScript 6 statt 7 (R-14); CLAUDE.md drei E2E-Profile und Lighthouse ohne PWA-Kategorie; quickstart.md ohne "Reset"; `npm run lhci` nutzt `npx @lhci/cli@0.15.1` wie die CI. Anforderungen ohne eigenen Test (FR-003, FR-013, FR-019) bekommen `tests/e2e/feinschliff.spec.ts`. Offen bleibt nur T087 (manueller Gerätetest).
