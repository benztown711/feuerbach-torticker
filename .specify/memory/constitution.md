# Feuerbach Torticker Constitution

Grundsätze für den Ergebnis-Tracker der Sportvereinigung Feuerbach. Jede Spec, jeder Plan und jeder Pull Request muss diese Regeln einhalten.

## Core Principles

### I. Spielfeldrand zuerst (Einhand-Bedienung)

Die App wird stehend, im Freien, oft mit einer Hand und unter Zeitdruck bedient.

- Ein Tor erfassen braucht genau **einen** Tap. Alles Weitere (Torschütze) ist optional und nachträglich möglich.
- Primäre Schaltflächen sind mindestens 64 × 64 pt groß, Hauptaktionen (Tor Heim/Gast) deutlich größer.
- Hoher Kontrast, lesbar in direktem Sonnenlicht, funktioniert mit nassen Fingern und Handschuhen (keine Gesten als einziger Weg).
- Jede Erfassung ist rückgängig zu machen (Undo), ohne Bestätigungsdialog-Kaskaden.

### II. Offline-first und lokal

- Die App funktioniert vollständig ohne Netzverbindung, sobald sie einmal geladen ist.
- Spieldaten bleiben auf dem Gerät. Es gibt keinen Server und kein Benutzerkonto.
- Daten verlassen das Gerät nur durch eine bewusste Aktion des Nutzers (z. B. "Ergebnis teilen").

### III. Datensparsamkeit (Kinder- und Jugendfußball)

- Spielernamen sind personenbezogene Daten von Minderjährigen. Es werden nur Vornamen, Kürzel oder Rückennummern gespeichert.
- Keine Analyse-, Tracking- oder Werbe-Skripte von Drittanbietern.

### IV. Spec-first und Test-first (NICHT VERHANDELBAR)

- Ablauf: `constitution` → `specify` → `clarify` → `plan` → `tasks` → `implement`.
- Jede funktionale Anforderung (FR-xxx) hat mindestens einen automatisierten Test, der auf sie verweist.
- Tests werden vor der Implementierung geschrieben und müssen zunächst fehlschlagen (Red-Green-Refactor).
- Akzeptanzszenarien aus der Spec werden als End-to-End-Tests in einem mobilen Browser-Profil (iPhone-Viewport) ausgeführt.

### V. Zeit ist eine Berechnung, kein Zähler

- Spielminuten werden aus gespeicherten Zeitstempeln (Start, Pausen) berechnet, niemals durch Hochzählen eines Intervalls.
- Dadurch bleibt die Uhr korrekt, wenn das Handy gesperrt, die App im Hintergrund oder neu geladen wurde.

### VI. Einfachheit (YAGNI)

- Nur bauen, was eine priorisierte User Story verlangt. Neue Abhängigkeiten müssen im Plan begründet werden.
- Bevorzugt Web-Standards vor Frameworks, wo der Unterschied gering ist.

## Technische Rahmenbedingungen

- Auslieferung als Progressive Web App (PWA), installierbar über "Zum Home-Bildschirm" auf iOS (Safari) und Android (Chrome).
- Hosting als statische Seite (GitHub Pages), keine Server-Komponente.
- Zielgeräte: iPhone ab iOS 17, aktuelle Android-Geräte. Hochformat ist Pflicht, Querformat optional.
- Bekannte iOS-PWA-Grenzen müssen im Plan explizit adressiert werden (keine Vibration-API, eingeschränkte Hintergrundausführung, Wake Lock erst ab iOS 16.4/18.4 zuverlässig).

## Entwicklungsablauf und Qualitätstore

- Arbeit erfolgt auf Feature-Branches (`###-feature-name`) mit Pull Request gegen `main`.
- CI läuft bei jedem Pull Request: Lint, Typprüfung, Unit-Tests, E2E-Tests, Lighthouse-PWA-Prüfung.
- Merge nach `main` löst automatisch das Deployment auf GitHub Pages aus.
- Releases werden über Conventional Commits versioniert (automatisiertes Changelog).

## Governance

- Diese Constitution hat Vorrang vor allen anderen Konventionen im Repository.
- Änderungen erfolgen per Pull Request mit Begründung und Versionssprung (SemVer: MAJOR = Prinzip entfernt/umgedeutet, MINOR = Prinzip ergänzt, PATCH = Klarstellung).
- `/speckit-analyze` prüft vor jeder Implementierung die Konsistenz zwischen Spec, Plan, Tasks und dieser Constitution.

**Version**: 1.0.0 | **Ratified**: 2026-11-02 | **Last Amended**: 2026-11-02
