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
| 8 Selbstprüfung | Agent | Alle CI-Checks lokal grün, `/code-review`, `/security-review`, Screenshots iPhone hell/dunkel an Atti senden | grüner PR |
| 9 **Review C: Ergebnis** | Atti | Screenshots/Live-Test prüfen, PR mit "Squash and merge" übernehmen | Merge |
| 10 Ausliefern | Automatisch | Deploy auf GitHub Pages, release-please erzeugt Version + Changelog | Live |

Atti wird nur in den Schritten 3, 5 und 9 gebraucht. Kleine Änderungen (Fehlerbehebung, Text, Abhängigkeits-Update) überspringen Schritt 4/5, pflegen aber die Hilfe, sobald sich Bedienung oder Wortlaut in der App ändern.

## Qualitätstore (automatisch, blockieren den Merge)

- Lint (ESLint, Stylelint ohne Farbwerte außerhalb `tokens.css`), Prettier, `tsc --noEmit`
- Vitest: `src/domain/**` mit 100 % Branch-Coverage
- Playwright E2E in drei Profilen: `iphone`, `iphone-se` (WebKit) und `android` (Chromium); jedes Akzeptanzszenario der Spec ist ein Test mit ID im Namen; Offline-Test
- axe-core ohne Verstöße, Kontrastmatrix beider Themes (SC-006)
- Visueller Vergleich der Kernbildschirme (hell/dunkel)
- Lighthouse CI (Accessibility, Best Practices ≥ 0,9); PWA-Installierbarkeit prüft der Smoke-Test (Lighthouse 12 hat keine PWA-Kategorie mehr, R-14)
- Bundle-Budget (Hauptbundle < 60 KB gzip)
- Hilfe-Abdeckung (Constitution IX, Spec 009 FR-H21): jede umgesetzte User Story hat einen Hilfe-Eintrag, jede Quelle eines Eintrags existiert
- Netzwerk-Wächter: keine Requests an Drittanbieter; einzige Ausnahme ist der Vermittlungsdienst bei aktiver Live-Kopplung (Spec 006, Constitution II)
- CodeQL und Dependency Review
- PR-Titel nach Conventional Commits

Ein Test wird nie übersprungen oder abgeschwächt, um grün zu werden.

## Regeln für den Agenten

- Niemals direkt auf `main` pushen (Ruleset). Branch je Arbeitspaket, Draft-PR, erst nach grüner CI "ready for review".
- Keine echten Kindernamen in Repo, Issues, Tests, Screenshots oder Mockups. Fiktive Namen: Max, Ben, Tom, Leo, Maxi, Paul.
- Keine Farbwerte, Schriften oder Logos außerhalb von `design/` erfinden.
- Neue Laufzeit-Abhängigkeiten nur mit Begründung in `research.md`.
- Spec, Plan, Tasks, Code und Hilfe bleiben konsistent: Jede Verhaltensänderung beginnt in `spec.md` und endet mit dem passenden Hilfe-Eintrag (Bezeichnungen wörtlich wie in der App).
- Schreibt Atti im Chat "Merge #x", übernimmt der Agent den PR per Squash-Merge, aber nur bei grüner CI auf dem aktuellen Stand.
- Antworten an Atti auf Deutsch, Kurzfassung zuerst, kurz, Anrede "Atti", keine langen Gedankenstriche.
