# Research: Spiel läuft schon (Spec 023)

## R-J1 Einstieg als zurückgerechneter Verlauf

**Entscheidung**: "Übernehmen" erzeugt echte Uhr-Ereignisse (`kickoff`, `sectionEnd`) mit Zeitstempeln in der Vergangenheit: Anpfiff des gewählten Abschnitts = jetzt minus gespielte Zeit, davor je Abschnitt volle Länge und 5 Minuten Pause. Bei gewählter Pause endet der vorige Abschnitt jetzt. Die Ereignisse tragen das Kennzeichen `entry: true`.

**Begründung**: Uhr, Signale, Pfiffe, Minutenauswahl, Teilen-Text, Live-Meldung und "Spiel übernehmen" rechnen schon heute nur aus Uhr-Ereignissen (Constitution V). Mit zurückgerechneten Ereignissen funktioniert alles ohne Sonderfall; der Dienst und ältere Eltern-Handys sehen nur gewöhnliche Ereignisse.

**Verworfen**: Ein Feld "Startversatz" am Spiel. Jede Stelle, die die Uhr auswertet (Sender, Dashboard, Takeover, Minutenauswahl), müsste es kennen; ältere Eltern-Handys zeigten die falsche Restzeit.

## R-J2 Tore vor Tickerbeginn

**Entscheidung**: Je Tor ein gewöhnliches `Goal` mit `beforeTicker: true`, Abschnitt 1, Minute 1 (erste Minute des Spiels), Uhrzeit = zurückgerechneter erster Anpfiff, ohne Torschütze. Zuerst Feuerbach, dann der Gegner (stabile Sortierung nach Uhrzeit).

**Begründung**: Die Tore zählen damit überall ohne Sonderfall (Stand, Endstand, Historie, Live-Meldung, ältere Eltern-Handys). Abschnitt 1 hält den Halbzeitstand richtig, wenn man in der 1. Halbzeit oder in der Halbzeitpause einsteigt; bei späterem Einstieg bleibt der Halbzeitstand leer (FR-J14) und der Abschnitt spielt keine Rolle. Die gemeinsame Uhrzeit am Spielbeginn stellt sie vor alle anderen Tore.

**Verworfen**: Abschnitt vor dem gewählten (erste Spec-Fassung): bringt nichts, da der Halbzeitstand dann ohnehin leer ist, und verkompliziert Halbzeit-Trenner im Teilen-Text.

## R-J3 "Minute ändern" bei Toren vor Tickerbeginn

**Entscheidung**: dieselbe Auswahl aller gespielten Minuten wie bei jedem Tor; `setGoalMinute` entfernt das Kennzeichen.

**Begründung**: Der Tickerbeginn ist nicht gespeichert und muss es nicht sein; wer die Minute kennt, wählt sie. Kein neuer Bedienschritt.

## R-J4 Restzeit statt Minutenverschiebung in "Uhr korrigieren"

**Entscheidung**: Neue Funktionen `restRange(game, now)` und `setRest(game, rest, now)` ersetzen `clockShiftRange`/`shiftClock`. Die Restzeit ist eine ganze Minutenzahl (negativ = Nachspielzeit, Anzeige "+N Min"). Beim Öffnen wird die aktuelle Restzeit gerundet; "Übernehmen" legt den Anpfiff so, dass genau diese Restzeit bleibt. Liegt der neue Anpfiff nicht nach dem vorigen Uhr-Ereignis, rücken alle früheren Uhr-Ereignisse, Tore und Ereignisse um denselben Betrag zurück (ihre Minuten bleiben). Zurückstellen bleibt durch die erste Unterbrechung, das erste Tor bzw. Ereignis des Abschnitts (ohne Tore vor Tickerbeginn) und jetzt begrenzt.

**Begründung**: Atti denkt in "noch 7 Minuten" (Anzeigetafel am Platz). Die alte Grenze am vorigen Pfiff war genau der Grund, warum der Eintrag am 22.11. fehlte.

## R-J5 Pfiff zurücknehmen nach dem Einstieg

**Entscheidung**: `canUndoWhistle` lehnt ein Ereignis mit `entry: true` ab. Die Leiste "Rückgängig" nach "Übernehmen" stellt das Spiel vollständig zurück (Spiel vor dem Einstieg im Speicher der Oberfläche), außer den Trikots (FR-J06).

## R-J6 Schalter in "Neues Spiel"

**Entscheidung**: Eingeschaltet führt "Weiter zum Anpfiff" auf `#/spiel/<id>/einstieg`; der Spielbildschirm öffnet dort das Blatt und ersetzt die Adresse durch `#/spiel/<id>`. Der Schalter ist nicht gespeichert (immer aus).

## R-J7 Live-Meldung

**Entscheidung**: `LiveGoal.pre?: true` (optional, abwärtskompatibel); `parseGoal` nimmt es an, "Spiel übernehmen" übernimmt das Kennzeichen. Das Dashboard zeigt "–" und "vor Tickerbeginn". Keine Änderung am Dienst.
