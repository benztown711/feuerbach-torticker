# SVF Torticker

Ergebnis-Tracker für Fußballspiele der Sportvereinigung Feuerbach: große Tor-Knöpfe, automatische Spielminute, Countdown, optional Torschütze, Ergebnis per WhatsApp teilen.

Läuft als Web-App (PWA) auf iPhone und Android, offline, ohne Server und ohne Konto.

## Vorgehen: Spec-Driven Development mit GitHub Spec Kit

| Phase | Befehl (Claude Code) | Ergebnis | Status |
|---|---|---|---|
| 0. Grundsätze | `/speckit-constitution` | `.specify/memory/constitution.md` | erledigt |
| 1. Spezifikation | `/speckit-specify` | `specs/001-spiel-erfassen/spec.md` | Entwurf |
| 2. Klärung | `/speckit-clarify` | offene Fragen in der Spec beantwortet | offen |
| 3. Architektur | `/speckit-plan` | `plan.md`, `data-model.md`, `research.md` | offen |
| 4. Aufgaben + Testfälle | `/speckit-tasks`, `/speckit-checklist` | `tasks.md` | offen |
| 5. Konsistenzprüfung | `/speckit-analyze` | Report | offen |
| 6. Umsetzung | `/speckit-implement` | Code + Tests | offen |

## Geplante Automatisierung

- **CI bei jedem Pull Request**: Lint, Typprüfung, Unit-Tests, E2E-Tests (Playwright, iPhone-Profil), Lighthouse-PWA-Check.
- **CD**: Merge nach `main` deployt automatisch auf GitHub Pages.
- **Releases**: Conventional Commits, automatisches Changelog.
- **Abhängigkeiten**: Dependabot.

## Spec Kit lokal nutzen

```bash
uvx --from git+https://github.com/github/spec-kit.git specify check
```
