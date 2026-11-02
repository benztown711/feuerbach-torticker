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

## R-11 Hosting und Deployment (offene Entscheidung D-1)

- **Ausgangslage**: Repository ist privat. GitHub Pages für private Repos erfordert einen kostenpflichtigen GitHub-Plan; die Seite selbst ist dann trotzdem öffentlich.
- **Optionen**:
  1. **Repository öffentlich machen + GitHub Pages** (kostenlos, einfachste Pipeline mit `actions/deploy-pages`). Code enthält keine personenbezogenen Daten; Beispielnamen in Specs sind fiktiv.
  2. **Privat bleiben + Cloudflare Pages** (kostenlos, Deploy per `cloudflare/wrangler-action` mit API-Token als Repository-Secret, eigene Subdomain `*.pages.dev`, PR-Vorschauen inklusive).
  3. **Privat bleiben + GitHub Pro** (4 USD/Monat), sonst wie Option 1.
- **Empfehlung**: Option 1, solange keine vertraulichen Inhalte im Repo liegen. Option 2, falls der Code privat bleiben soll; bringt als Bonus Vorschau-Links pro Pull Request.

## R-12 Automatisierung

- **Decision**:
  - `ci.yml` bei jedem PR: `npm ci` → ESLint + Stylelint + Prettier → `tsc --noEmit` → Vitest mit Coverage → Build → Kontrastprüfung → Playwright (beide Profile) → Lighthouse CI. Artefakte: Playwright-Report, Screenshots.
  - `deploy.yml` bei Push auf `main`: Build und Deploy (Ziel nach D-1).
  - `release.yml`: release-please erzeugt Versions-PRs und Changelog aus Conventional Commits; PR-Titel werden per `amannn/action-semantic-pull-request` geprüft.
  - Dependabot wöchentlich für npm und GitHub Actions, gruppiert.
  - Branch-Schutz für `main`: CI grün erforderlich.
- **Rationale**: "Höchst automatisiert" laut Projektauftrag; jeder Merge ist sofort auf den Handys verfügbar (Update-Hinweis in der App).

## R-13 Kader importieren und teilen (User Story 7)

- **Decision**:
  - Listen-Import: eigener, unit-getesteter Parser `src/domain/roster-parse.ts` (Zeilen → `{number?, name, warnings[]}`), Vorschau vor Übernahme, Zusammenführen nach ID bzw. Name.
  - Kader-Code: JSON (`{v:1, players:[{id,name,number,team?}]}`) → komprimiert (`CompressionStream('deflate-raw')`, in iOS 16.4+ und Chrome vorhanden) → Base64url mit Präfix `FTK1:`. 21 Spieler ergeben ca. 400 bis 600 Zeichen, passt in einen QR-Code mittlerer Größe.
  - QR erzeugen: `uqr` (klein, ohne Abhängigkeiten, SVG-Ausgabe). QR scannen: `qr-scanner` (WebWorker, nutzt `BarcodeDetector` wo vorhanden, sonst eigene Dekodierung; iOS Safari hat kein `BarcodeDetector`). Beide nur bei Bedarf nachgeladen (dynamischer Import), damit das Spiel-Bundle klein bleibt.
- **Rationale**: Kein Server, keine Kindernamen im öffentlichen Repo oder in der Cloud; funktioniert offline am Platz (QR) und aus der Ferne (WhatsApp-Code). Ein Link wäre auf dem iPhone ungeeignet, weil Safari und Home-Bildschirm-App getrennte Speicher haben.
- **Alternatives**: SpielerPlus-Export (nur mit Premium, CSV-Import kann später ergänzt werden, gleicher Parser-Kern); zentraler Kader auf einem Server oder als Datei im Repo (Datenschutz Minderjähriger, widerspricht Prinzip II und III); Teilen per Link (siehe oben).
