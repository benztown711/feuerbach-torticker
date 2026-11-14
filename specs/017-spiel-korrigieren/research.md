# Research: Spiel korrigieren (Spec 017)

## R-C1 Blätter herauslösen statt nachbauen

- **Decision**: Tor-Blatt, Rückfrage zum Entfernen, Torschützen- und Vorlagen-Auswahl ohne Countdown, "Torschütze Gegner", "Minute ändern" und "Tor nachtragen" wandern aus `game.tsx` in die Komponente `GoalEditor`. Ihr Zustand ist ein einziger Schritt (`goal`, `remove`, `scorer`, `assist`, `text`, `minute`, `add`); die Seite hält ihn und reicht `update` und `cur` herein. Die Schnellauswahl direkt nach dem Tor (Countdown, Rückgängig, Folgeschritt "Vorlage von?") bleibt im Spielbildschirm.
- **Rationale**: Spec-Annahme "wiederverwendet, nicht nachgebaut" und SC-C03 (gleiche Blätter, gleiche Wörter). Ein Zustand statt fünf getrennter `useState` verhindert, dass zwei Blätter zugleich offen sind.
- **Alternatives**: Spieldetails springen in den Spielbildschirm (verworfen: Mockup und Review B zeigen die Korrektur in den Spieldetails); Blätter kopieren (verworfen: doppelter Code, Abweichungen wären nur eine Frage der Zeit).

## R-C2 Korrekturen alter Spiele bleiben lokal

- **Decision**: Der Sender prüft ein beendetes Spiel, das er in dieser Sitzung noch nicht gesendet hat, gegen die eigenen Spiele: Gehört es nicht zu den 10 zuletzt angelegten Spielen derselben Live-Mannschaft (`KEEP_PER_GROUP` aus `relay-protocol.ts`), sendet er nichts. Nie gesendete Spiele (`livePrivate`) zählen nicht mit.
- **Rationale**: Der Dienst behält je Mannschaft die 10 Spiele mit der jüngsten ersten Meldung (`gameRowsToDrop`). Ein dort schon gelöschtes Spiel käme durch eine Korrektur als jüngstes zurück und verdrängte ein jüngeres aus "Letzte Spiele" (Spec, Ausgangslage). Die Prüfung im Sender braucht keine Änderung am Dienst.
- **Alternatives**: Dienst lehnt alte Spiele ab (verworfen: der Dienst sieht nur verschlüsselte Inhalte, kein Datum des Spiels; Änderung am Dienst); Frist in Tagen (verworfen: passt nicht zu "10 Spiele je Mannschaft", Atti wollte keine Frist, 2A).

## R-C3 Erinnerung nur, wenn sich der geteilte Text ändert

- **Decision**: `sharedAt` am Spiel merkt, dass "Ergebnis teilen" erfolgreich war (geteilt oder kopiert). Nach jeder Änderung vergleicht die Seite den Teilen-Text vorher und nachher (`needsReshare`); nur bei beendetem, schon geteiltem Spiel und anderem Text erscheint die Leiste.
- **Rationale**: Klärung 4A mit Folgerung aus Review A: vor dem ersten Teilen wäre "neu teilen" irreführend; das eigene Trikot oder ein Lesezeichen ändern den Text nicht (US3-S5). Der Vergleich deckt jede Korrektur ab, auch spätere neue Arten, ohne Liste der Aktionen.
- **Alternatives**: Leiste nach jeder Korrektur (verworfen, s. o.); Prüfsumme des zuletzt geteilten Texts speichern und dauerhaft "geändert" anzeigen (verworfen: mehr Zustand, im Mockup nicht vorgesehen).

## R-C4 Leiste mit eigener Zeitschaltung

- **Decision**: `ReshareBar` schließt sich nach 10 Sekunden über `setTimeout`; jeder neue Auslöser startet die Zeit neu. Gestaltung wie die Leiste "Rückgängig"; in den Spieldetails über der Navigation wie die Leiste der Historie.
- **Rationale**: Die Spieldetails haben keinen 250-ms-Takt wie der Spielbildschirm; ein eigener Takt nur für die Leiste wäre unnötig. Die E2E-Tests steuern die Zeit über die Fake-Uhr.

## R-C5 Trikots: gleiche Bausteine wie "Neues Spiel"

- **Decision**: Das Blatt "Trikots" nutzt `KitRow` (Spec 004) für beide Mannschaften; "Übernehmen" setzt beide Farben über `setKits`. Eine geänderte Gegnerfarbe speichert `rememberColors` (FR-031) in den Einstellungen; die eigene Farbe bleibt nur am Spiel.
- **Rationale**: Gleiche Bedienung wie beim Anlegen (Mockup); Palette und Kontrast sind schon geprüft (`design/trikot-farben.json`). Tor-Knöpfe, Farbmarken, Teilen-Text (Symbol der Gegnerfarbe) und Live-Meldung lesen die Farben schon aus dem Spiel.

## R-C6 Bundle-Budget: Einstellungen nachladen

- **Decision**: Der Bildschirm "Einstellungen" (mit Sicherung und Mannschaften) wird wie Hilfe, Kader und Spielplan nachgeladen (`Lazy` in `src/ui/app.tsx`, Spec 006 R-L7). Korrektur-Blätter, "Trikots" und Leiste bleiben im Hauptbundle; die Schnellauswahl nach dem Tor und die Korrektur nutzen dieselbe Auswahl in `GoalEditor` (kein doppelter Code).
- **Rationale**: Mit allen drei User Stories lag das Hauptbundle bei 60,8 KB gzip (Budget 60 KB; `main` 59,3 KB: US1 +0,6, US2 +0,6, US3 +0,3). Die Einstellungen öffnet man selten und nie am Spielfeldrand; nachgeladen sind es 59,1 KB. Der Service Worker hält den nachgeladenen Teil offline vor.
- **Gemessen und verworfen**: Spieldetails nachladen 61,3 KB, Korrektur-Blätter nachladen 61,1 KB, nur `GoalEditor` nachladen 61,0 KB: Vite 8 (Rolldown) lagert dabei gemeinsame Module in eigene, vorab geladene Teile aus (wie Spec 015 R-P6), die Summe steigt. Budget anheben: verworfen (Qualitätstor wird nicht abgeschwächt).
