# Research: Spielplan im Live-Spieltag

## R-P1 Übertragungsweg

- **Decision**: Neues Feld `p` der verschlüsselten Meldung (`contracts/plan-message.md`): signierte Daten (`SignedData`) mit einer Liste von Planspielen, signiert mit dem Organisator-Schlüssel, den jedes Trainer-Handy aus dem Trainer-Link hat. Eine Plan-Meldung enthält nur `p`.
- **Rationale**: Die Konfiguration `g` ist auf 2.000 Zeichen begrenzt und reist mit jeder Spielmeldung; ein Plan darin würde Spielmeldungen in den sparsamen Modus drücken. `m` ist an das Zertifikat einer Mannschaft gebunden. Ein eigenes Feld ist abwärtskompatibel, weil `openMessage` unbekannte Felder ignoriert.
- **Alternatives considered**: Plan in der Konfiguration (zu groß, jede Spielmeldung schwerer); eigenes Topic für den Plan (zweite Verbindung je Gerät, doppelte Tageslimits); Plan im Trainer-Link (Link soll kurz bleiben, Spec 006 R-L20).

## R-P2 Zusammenführen und Stückeln

- **Decision**: Jedes Planspiel trägt `u` (Zeitpunkt der letzten Änderung, je Planspiel streng steigend: `max(jetzt, bisher + 1)`). Empfänger übernehmen ein Planspiel, wenn `u` größer ist als das gespeicherte; Löschen ist ein Grabstein (`x: true`). Weil jede Meldung eine Teilmenge sein darf, sendet eine Änderung nur das geänderte Planspiel, "erneut senden" den ganzen Plan in Stücken bis 3.000 Zeichen signierter Daten.
- **Rationale**: Zwei Trainer, die verschiedene Spiele ändern, verlieren nichts (FR-P04); kleine Änderungsmeldungen schonen das Tageslimit des Dienstes (250 Meldungen je Verbindung). Messung von Spec 006: rund 3.380 Zeichen für 100 kompakte Einträge in einer Meldung; Stücke halten den Abstand zu 3.800.
- **Alternatives considered**: ganzer Plan mit einer Versionsnummer (gleichzeitige Änderungen gehen verloren); Änderungsprotokoll (ohne Server nicht verlässlich nachzuholen).

## R-P3 Speicherort

- **Decision**: IndexedDB, Store `settings`, eigener Schlüssel `plan` (Wert `PlanStore` mit Topic und Organisator-Schlüssel).
- **Rationale**: `Settings` wird als Ganzes überschrieben; die Einstellungen-Seite hält eine alte Kopie und würde einen im Hintergrund übernommenen Plan überschreiben. Ein eigener Schlüssel braucht keine Migration der Datenbank (Store ohne `keyPath`).
- **Alternatives considered**: Feld in `Settings.live` (Überschreib-Risiko); neuer Object Store (Migration auf Version 2).

## R-P4 Erneut senden beim Öffnen

- **Decision**: `main.tsx` lädt bei gekoppeltem Handy `live-setup` nach (R-P6) und ruft `refreshPlan()` beim Start und bei `visibilitychange` (sichtbar). Gesendet werden Unversandtes und die Planspiele ab heute, die seit 6 Stunden weder von diesem Handy gesendet noch im gleichen Stand empfangen wurden (je Planspiel gemerkt, Code-Review 06.11.2026: so schickt nicht jedes Trainer-Handy morgens den ganzen Plan, und eine einzelne Änderung verzögert das erneute Senden der übrigen nicht).
- **Rationale**: Der Dienst hält Meldungen rund 12 Stunden; 6 Stunden lassen Puffer. Ein Hintergrund-Empfänger beim Start ist für US1 nicht nötig, weil der Plan dort gebraucht wird, wo ohnehin ein Empfänger läuft (Spielplan, Neues Spiel).
- **Alternatives considered**: Zeitgeber im Hintergrund (iOS hält PWAs im Hintergrund an); Senden bei jeder Spielmeldung (Größe, R-P1).

## R-P5 Sicherheit

- Nur wer den Organisator-Schlüssel hat (Trainer-Link), kann gültige Plan-Meldungen erzeugen; Empfänger prüfen die Signatur mit `orgPub` und verwerfen sonst. Inhalte werden streng geprüft (Längen, Datum, Anstoß, Spielzeit 1 bis 4 Abschnitte à 1 bis 60 Minuten), unbekannte Felder verworfen, höchstens 100 Einträge je Meldung.
- Wer den Zuschauer-Link hat, kann `p` lesen (wie Titel und Mannschaften), aber nicht fälschen. Der Plan enthält keine Kindernamen.

## R-P6 Bündelung

- **Decision**: `plan-sync` wird ausschließlich über `live-setup` erreicht (Re-Export von `adoptPlan`, `changePlan`, `loadPlan`, `refreshPlan`); Bildschirme, `live-watch`, das Dashboard und `main.tsx` importieren nie direkt `plan-sync`.
- **Rationale**: Wird `plan-sync` aus mehreren nachgeladenen Teilen direkt geladen, legt der Bundler (Vite 8) gemeinsame Module des Hauptbundles in eigene Teile aus, die vorab geladen werden; gemessen 59,4 statt 57,0 KB gzip. Über `live-setup` bleibt alles in einem Hauptteil: 57,3 KB.
- **Alternatives considered**: eigene Chunk-Regeln in `vite.config.ts` (zusätzliche Konfiguration, schwer nachzuvollziehen).
