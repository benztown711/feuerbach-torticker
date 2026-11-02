# Feuerbach Torticker

Ergebnis-Tracker für Fußballspiele der Sportvereinigung Feuerbach: große Tor-Knöpfe, automatische Spielminute, Countdown, optional Torschütze, Ergebnis per WhatsApp teilen.

Läuft als Web-App (PWA) auf iPhone und Android, offline, ohne Server und ohne Konto. Gestaltung nach dem Design System der Sportvg Feuerbach, siehe [`design/`](design/README.md).

## Vorgehen: Spec-Driven Development mit GitHub Spec Kit

| Phase | Befehl (Claude Code) | Ergebnis | Status |
|---|---|---|---|
| 0. Grundsätze | `/speckit-constitution` | `.specify/memory/constitution.md` | erledigt |
| 1. Spezifikation | `/speckit-specify` | `specs/001-spiel-erfassen/spec.md` | erledigt |
| 2. Klärung | `/speckit-clarify` | offene Fragen in der Spec beantwortet | erledigt |
| 3. Architektur | `/speckit-plan` | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` | erledigt (offen: Hosting D-1) |
| 4. Aufgaben + Testfälle | `/speckit-tasks`, `/speckit-checklist` | `tasks.md` (88 Aufgaben) | erledigt |
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

## App installieren

Die aktuelle Version läuft unter **https://benztown711.github.io/feuerbach-torticker/**.

- **iPhone:** Link in Safari öffnen → Teilen → "Zum Home-Bildschirm". Nur so bleiben die Daten dauerhaft gespeichert.
- **Android:** Link in Chrome öffnen → Menü → "App installieren".

Neue Versionen kommen automatisch nach jedem Merge auf `main`; die App zeigt dann einen Update-Hinweis.

## Entwicklung

Voraussetzung: Node.js 22.

```bash
npm ci
npm run dev
```

Alle Prüfungen wie in der CI und die manuelle Geräteprüfung: siehe [`specs/001-spiel-erfassen/quickstart.md`](specs/001-spiel-erfassen/quickstart.md). Arbeitsweise und Qualitätstore: [`CLAUDE.md`](CLAUDE.md).
