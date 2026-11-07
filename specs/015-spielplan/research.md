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

## R-P7 Spielplan auf dem Eltern-Dashboard (US3, US7)

- **Decision**: Der Empfänger des Dashboards führt die geprüften Planspiele aus `p` im gemerkten Stand (`Board.plan`, `localStorage` wie die Spiele) mit derselben Regel wie die Trainer-Handys zusammen (jüngste Änderung je Planspiel, Grabsteine, höchstens 100, Grabsteine 30 Tage).
- **Rationale**: Eltern brauchen den Plan ohne Trainer-Link; `p` ist mit dem Zuschauer-Schlüssel lesbar und mit `orgPub` geprüft (R-P5). Wer das Dashboard schon einmal geöffnet hatte, sieht den Plan ohne Zeitgrenze.
- **Alternatives**: eigener Speicher je Plan (zweiter Schlüssel, doppelte Pflege).

## R-P8 Endstand im Planspiel (FR-P30)

- **Decision**: Das Trainer-Handy mit dem verknüpften Spiel trägt bei jeder Änderung von `finalScore` (Schlusspfiff, Tor-Korrektur, zurückgenommener Schlusspfiff) den Endstand als `s` ins Planspiel ein und sendet den Plan. Erkannt wird das über `onGameWrite`; geprüft wird bei jeder Änderung des Endstands und beim ersten Speichern eines Spiels nach dem Start (ein vorher zurückgenommener Schlusspfiff); Trainer-Handys haben `live-setup` dann ohnehin geladen. Das Dashboard nimmt `s`, sonst den Endstand des verknüpften Spiels, solange es bekannt ist.
- **Rationale**: Das Dashboard hält Spiele nur vom letzten Spieltag je Mannschaft (Spec 006 FR-L16); der Plan wird alle 6 Stunden erneut gesendet (FR-P07) und trägt die Ergebnisse der Saison.
- **Alternatives**: Endstand nur aus den Spielmeldungen (verschwindet nach 12 Stunden für neue Zuschauer).

## R-P9 Karten mit Planspielen (US3)

- **Decision**: `boardView` bekommt je Mannschaft die Planspiele dazu. Hauptinhalt: laufendes Spiel; sonst heute angelegte, dann geplante (nach Anstoß, abgesagte zuletzt); sonst das zuletzt beendete Spiel; sonst das nächste Planspiel. Ein Planspiel mit `gameId`, dessen Spiel bekannt ist, erscheint nur als dieses Spiel. "Danach" und "Nächstes Spiel" stehen sichtbar unter der Karte, "Heute außerdem" bleibt wie bisher in den Details.
- **Rationale**: Eine Karte je Mannschaft (Spec 006 FR-L14), kein doppeltes Spiel (FR-P15); "wie bisher" für "Heute außerdem" laut FR-P14.

## R-P10 Vormerkung "Ich tickere" (US6)

- **Decision**: Die Vormerkung ist Teil des Planspiels (`claim`, Feld `b`) mit eigenem Zeitpunkt; beim Zusammenführen gilt je Planspiel die jüngere Vormerkung, auch wenn das Planspiel selbst älter ist. Freigeben ist eine Vormerkung ohne Handy. Die Kennung des Handys (`deviceId`) und der Vorname (`trainerName`) stehen in den Einstellungen; die Kennung entsteht beim ersten Vormerken.
- **Rationale**: Vormerken und Ändern passieren auf verschiedenen Handys; eine Änderung des Anstoßes darf eine gleichzeitige Vormerkung nicht verwerfen und umgekehrt. Eine eigene Meldungsart wäre mehr Code ohne Nutzen.
- **Alternatives**: Vormerkung nur nach `u` (geht bei gleichzeitigem Ändern verloren); eigene Meldung je Vormerkung.
- **Datenschutz**: Der Vorname des Trainers (Erwachsener, freiwillig) reist mit dem Plan und ist für Inhaber des Zuschauer-Links lesbar, auch wenn das Dashboard ihn nicht zeigt (US6-S7); Kindernamen bleiben außen vor (Constitution II).

