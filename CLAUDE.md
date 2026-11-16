# Arbeitsweise im Projekt Feuerbach Torticker

Dieses Projekt wird spec-getrieben (GitHub Spec Kit) und weitgehend automatisiert entwickelt. Der Product Owner (Atti) liefert **nur Anforderungen und Reviews**. Alles andere erledigt der Agent selbstständig nach diesem Ablauf.

Verbindlich sind außerdem `.specify/memory/constitution.md` (Grundsätze) und `design/README.md` (Vereinsdesign). Eigene Spec-Kit-Vorlagen liegen in `.specify/templates/overrides/` (überleben Spec-Kit-Updates).

## Ablauf pro Anforderung

| Schritt | Wer | Was | Ergebnis |
|---|---|---|---|
| 1 Anforderung | Atti | Wunsch im Chat oder als GitHub-Issue (Vorlage "Anforderung") | Text |
| 2 Spezifizieren | Agent | `/speckit-specify` bzw. bestehende Spec ergänzen; Unklarheiten mit `/speckit-clarify`, **max. 5 Fragen**, jeweils mit Empfehlung; Abschnitt "Hilfe" nennt neue/geänderte Hilfe-Einträge | `specs/<nr>/spec.md` |
| 3 **Review A: Spec** | Atti | Kurzfassung (User Stories, Entscheidungen, offene Fragen) im Chat bestätigen | Freigabe |
| 4 Mockup | Agent | Klickbares Mockup im Vereinsdesign, iPhone-Format, hell + dunkel, als Artifact-Link | Link |
| 5 **Review B: Mockup** | Atti | Feedback oder Freigabe | Freigabe |
| 6 Planen | Agent | `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze` (keine kritischen Befunde offen) | plan.md, tasks.md |
| 7 Umsetzen | Agent | Test-first je Aufgabe, kleine Commits (Conventional Commits), ein PR pro User Story bzw. Phase; **Hilfe-Einträge im selben PR** (Constitution IX) | Draft-PR |
| 8 Selbstprüfung | Agent | Lokal schnell prüfen (siehe "Lokal testen"), volle Suite in der CI grün, `/code-review`, `/security-review`, Design-Check bei sichtbaren Änderungen (siehe "Design-Check"), Screenshots iPhone hell/dunkel an Atti senden | grüner PR |
| 9 **Review C: Ergebnis** | Atti | Screenshots/Live-Test prüfen, PR mit "Squash and merge" übernehmen | Merge |
| 10 Ausliefern | Automatisch | Deploy auf GitHub Pages, release-please erzeugt Version + Changelog | Live |

Atti wird nur in den Schritten 3, 5 und 9 gebraucht. Kleine Änderungen (Fehlerbehebung, Text, Abhängigkeits-Update) überspringen Schritt 4/5, pflegen aber die Hilfe, sobald sich Bedienung oder Wortlaut in der App ändern.

## Qualitätstore (automatisch, blockieren den Merge)

- Lint (ESLint, Stylelint ohne Farbwerte außerhalb `tokens.css`), Prettier, `tsc --noEmit`
- Vitest: `src/domain/**` mit 100 % Branch-Coverage
- Playwright E2E in drei Profilen: `iphone`, `iphone-se` (WebKit) und `android` (Chromium); jedes Akzeptanzszenario der Spec ist ein Test mit ID im Namen; Offline-Test. Die Profile laufen parallel auf eigenen Rechnern im offiziellen Playwright-Image (die WebKit-Profile auf je zwei). Bei PRs, die nur Texte ändern (`specs/`, `docs/`, `.specify/`, `.claude/`, Markdown außerhalb von `src/`, `public/`, `tests/`), entfallen E2E und Lighthouse; auf `main` läuft immer alles
- axe-core ohne Verstöße, Kontrastmatrix beider Themes (SC-006)
- Visueller Vergleich der Kernbildschirme (hell/dunkel)
- Lighthouse CI (Accessibility, Best Practices ≥ 0,9); PWA-Installierbarkeit prüft der Smoke-Test (Lighthouse 12 hat keine PWA-Kategorie mehr, R-14)
- Bundle-Budget (Hauptbundle < 60 KB gzip)
- Hilfe-Abdeckung (Constitution IX, Spec 010 FR-H21): jede umgesetzte User Story hat einen Hilfe-Eintrag, jede Quelle eines Eintrags existiert
- Netzwerk-Wächter: keine Requests an Drittanbieter (auch keine WebSockets); einzige Ausnahme ist der eigene Vermittlungsdienst bei aktiver Live-Kopplung bzw. geöffnetem Zuschauer-Link (Spec 007, Constitution II)
- CodeQL und Dependency Review
- PR-Titel nach Conventional Commits

Ein Test wird nie übersprungen oder abgeschwächt, um grün zu werden.

## Lokal testen (Agent)

Lokal nur prüfen, was die Änderung betrifft; die volle E2E-Suite in allen Profilen läuft in der CI.

1. `npm run check`: Lint, Typen, Unit-Tests mit Coverage, Build, Kontrast, Bundle-Budget (ca. 25 s)
2. `npm run e2e:changed`: E2E-Specs, die selbst oder über importierte Helfer seit `origin/main` geändert wurden
3. Bei Änderungen in `src/` zusätzlich gezielt die Specs der betroffenen User Story bzw. Funktion: `npx playwright test tests/e2e/<datei>.spec.ts`
4. Die volle Suite lokal (`npm run e2e`, ca. 4 min) nur bei übergreifenden Änderungen (Navigation, Speicher, Service Worker, gemeinsame Komponenten)

Im Cloud-Container `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` setzen; dann läuft automatisch nur das Profil `android`. Der visuelle Vergleich (`visual.spec.ts`) ist nur im Playwright-Image der CI aussagekräftig, lokal weicht die Schriftdarstellung ab.

## Design-Check (Selbstprüfung, Schritt 8)

Pflicht bei jeder Änderung mit sichtbarer Wirkung in der App; entfällt bei reiner Logik, Tests, Texten ohne sichtbare Wirkung und Abhängigkeits-Updates.

1. Skill `design-check` aufrufen (Attis globaler Skill, verpackt Impeccable; in Cloud-Sitzungen `anthropic-skills:design-check`). Er prüft im Hintergrund per Subagent und liefert Befunde P0 bis P3 mit Begründung und einer Empfehlung.
2. Ziel sind die geänderten Bildschirme, Grundlage die Screenshots iPhone hell/dunkel (dieselben wie für Atti) bzw. die CI-Referenzbilder in `tests/e2e/visual.spec.ts-snapshots/`.
3. Modus "Frei": Empfehlungen dürfen über das Vereinsdesign hinausgehen, der Bericht markiert sie mit ⚠. Umgesetzt wird nur, was `design/README.md` und die Regeln unten einhält. Schreibt Atti "halte dich an das Vereinsdesign" o. Ä., gilt `design/README.md` auch für die Empfehlungen.
4. P0/P1-Befunde, die innerhalb von Spec und Vereinsdesign behebbar sind, behebt der Agent vor "ready for review" selbst. Ändert eine Behebung Verhalten oder Wortlaut, läuft sie wie jede Verhaltensänderung über `spec.md` und Hilfe.
5. Den Rest (P2/P3, ⚠-Empfehlungen, Richtungswechsel) bekommt Atti als Kurzfassung mit "Meine Empfehlung" zusammen mit den Screenshots, außerdem steht er im PR-Abschnitt "Design-Check". Atti entscheidet in Review C, ob etwas davon umgesetzt wird.
6. Ist der Skill nicht verfügbar, im PR "Design-Check: nicht gelaufen" mit Grund vermerken.

## Regeln für den Agenten

- Niemals direkt auf `main` pushen (Ruleset). Branch je Arbeitspaket, Draft-PR, erst nach grüner CI "ready for review".
- Keine echten Kindernamen in Repo, Issues, Tests, Screenshots oder Mockups. Fiktive Namen: Max, Ben, Tom, Leo, Maxi, Paul.
- Keine Farbwerte, Schriften oder Logos außerhalb von `design/` erfinden.
- Neue Laufzeit-Abhängigkeiten nur mit Begründung in `research.md`.
- Spec, Plan, Tasks, Code und Hilfe bleiben konsistent: Jede Verhaltensänderung beginnt in `spec.md` und endet mit dem passenden Hilfe-Eintrag (Bezeichnungen wörtlich wie in der App).
- Schreibt Atti im Chat "Merge #x", übernimmt der Agent den PR per Squash-Merge, aber nur bei grüner CI auf dem aktuellen Stand.
- Antworten an Atti auf Deutsch, Kurzfassung zuerst, kurz, Anrede "Atti", keine langen Gedankenstriche.
