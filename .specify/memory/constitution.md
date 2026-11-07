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

- Die App funktioniert vollständig ohne Netzverbindung, sobald sie einmal geladen ist. Die Erfassung hängt nie vom Netz ab.
- Spieldaten bleiben auf dem Gerät. Außer dem Vermittlungsdienst der Live-Kopplung gibt es keinen eigenen Server, und Nutzer brauchen kein Benutzerkonto.
- Daten verlassen das Gerät nur durch eine bewusste Aktion des Nutzers: einmalig (z. B. "Ergebnis teilen", Export) oder dauerhaft über eine vom Nutzer aktivierte Live-Kopplung (Spec 006).
- Eine Live-Kopplung überträgt nur die für die Anzeige nötigen Daten, Ende-zu-Ende verschlüsselt, über genau einen eigenen Vermittlungsdienst im Gratis-Plan eines Anbieters (Cloudflare, Spec 007). Das Konto beim Anbieter hat der Betreiber; Eltern und Trainer brauchen keins. Der Dienst sieht nur verschlüsselte Inhalte und hält nur vor, was für die Anzeige nötig ist (je Mannschaft die letzten Spiele). Ohne Kopplung bzw. geöffneten Zuschauer-Link baut die App keine Verbindung zu ihm auf.

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

### VII. Vereinsdesign

- Gestaltung folgt dem Design System der Sportvg Feuerbach; Farben, Schriften, Abstände und Logos kommen ausschließlich aus `design/` (Quelle: `design/tokens.json`).
- Bedienbarkeit am Spielfeldrand (Prinzip I) und Kontrast gehen vor Markenwirkung: Weicht beides voneinander ab, wird die Abweichung in `design/README.md` begründet.
- Schriften und Logos werden mit der App ausgeliefert (offline), nicht von fremden Servern geladen.

### VIII. Kostenfrei

- Entwicklung, Betrieb und Nutzung bleiben dauerhaft kostenlos: öffentliches Repository, GitHub Actions und Pages im Gratis-Kontingent, der Vermittlungsdienst im Gratis-Plan von Cloudflare (ohne Bezahl-Plan; bei Überschreiten der Grenzen lehnt er ab statt abzurechnen), freie Schriften, keine Bezahl-Accounts (z. B. Apple Developer), keine kostenpflichtigen Dienste oder APIs.
- Eine Lösung, die Kosten verursacht, ist ausgeschlossen, auch wenn sie technisch besser wäre.

### IX. Hilfe ist Teil jeder Funktion

- Die App enthält eine durchsuchbare Hilfe, die jede umgesetzte Funktion in kurzen Fragen und Antworten erklärt (Spec 010).
- Jede für Nutzer sichtbare Funktion oder Verhaltensänderung aktualisiert die Hilfe **im selben Pull Request**. Das gilt auch für kleine Änderungen (Fehlerbehebung, Text), sobald sich Bedienung oder Wortlaut in der App ändern.
- Jede Spec nennt im Abschnitt "Hilfe", welche Einträge neu dazukommen, sich ändern oder entfallen; `tasks.md` enthält dafür je User Story eine Aufgabe.
- Jeder Hilfe-Eintrag nennt seine Quellen (Spec und User Story bzw. Anforderung). Eine automatische Prüfung blockiert den Merge, wenn eine umgesetzte User Story keinen Eintrag hat oder ein Eintrag auf etwas verweist, das es nicht mehr gibt.
- Die Hilfe verwendet die Bezeichnungen der App wörtlich, nur fiktive Namen und funktioniert offline.

## Technische Rahmenbedingungen

- Auslieferung als Progressive Web App (PWA), installierbar über "Zum Home-Bildschirm" auf iOS (Safari) und Android (Chrome).
- Hosting als statische Seite (GitHub Pages); einzige Server-Komponente ist der Vermittlungsdienst der Live-Kopplung (Cloudflare Worker, im Repository versioniert und automatisch ausgeliefert).
- Zielgeräte: iPhone ab iOS 17, aktuelle Android-Geräte. Maßstab für das Layout ist das kleinste unterstützte iPhone (iPhone SE, 375 × 667 pt). Hochformat ist Pflicht, Querformat optional.
- Bekannte iOS-PWA-Grenzen müssen im Plan explizit adressiert werden (keine Vibration-API, eingeschränkte Hintergrundausführung, Wake Lock erst ab iOS 16.4/18.4 zuverlässig).

## Entwicklungsablauf und Qualitätstore

- Arbeit erfolgt auf Feature-Branches (`###-feature-name`) mit Pull Request gegen `main`.
- CI läuft bei jedem Pull Request: Lint, Typprüfung, Unit-Tests (einschließlich Hilfe-Abdeckung, Prinzip IX), E2E-Tests, Lighthouse-PWA-Prüfung.
- Merge nach `main` löst automatisch das Deployment auf GitHub Pages aus.
- Releases werden über Conventional Commits versioniert (automatisiertes Changelog).

## Governance

- Diese Constitution hat Vorrang vor allen anderen Konventionen im Repository.
- Änderungen erfolgen per Pull Request mit Begründung und Versionssprung (SemVer: MAJOR = Prinzip entfernt/umgedeutet, MINOR = Prinzip ergänzt, PATCH = Klarstellung).
- `/speckit-analyze` prüft vor jeder Implementierung die Konsistenz zwischen Spec, Plan, Tasks und dieser Constitution.

**Version**: 3.0.0 | **Ratified**: 2026-11-02 | **Last Amended**: 2026-11-07

Änderungshistorie: 3.0.0 (07.11.2026) Prinzip II: eigener Vermittlungsdienst im Gratis-Plan von Cloudflare statt öffentlichem Dienst ohne Konto (Spec 007, Atti nach dem ersten Spieltag); Prinzip VIII und Technische Rahmenbedingungen entsprechend. 2.1.0 (04.11.2026) Prinzip IX "Hilfe ist Teil jeder Funktion" ergänzt (Spec 010). 2.0.0 (04.11.2026) Prinzip II erlaubt eine vom Nutzer aktivierte, verschlüsselte Live-Kopplung über einen kostenlosen Vermittlungsdienst (Spec 006); "kein Server" heißt seitdem "kein eigener Server".
