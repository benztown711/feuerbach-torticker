# Research: Trainer-Paket (Spec 016)

## R-B1 Kader über den eigenen Dienst statt im Link

- **Decision**: Geteilte Kader gehen als eigene Meldungsart `squad` über den eigenen Dienst (Spec 007). Der Trainer-Link bleibt unverändert (kurzes Format, Spec 006 R-L20).
- **Rationale**: Atti hat in Review A "2B" gewählt (automatisch verteilen). Damit müssen die Kader ohnehin über den Dienst; im Link wären sie doppelt, machten ihn lang (nicht mehr antippbar) und schrieben Kindernamen in WhatsApp und in die Startadresse des Symbols. Schon gekoppelte Handys bekommen die Kader ohne neuen Link (SC-B04).
- **Alternatives**: Kader im Link (erste Fassung der Spec, verworfen nach "2B"); Kader im Spielplan (Plan-Meldungen sind mit dem Zuschauer-Schlüssel verschlüsselt, Eltern könnten sie lesen).

## R-B2 Schlüssel nur für Trainer-Handys

- **Decision**: AES-GCM-256-Schlüssel per HKDF-SHA-256 aus dem privaten Organisator-Skalar `d` (32 Byte), `info` = `torticker-squad-v1`, leeres Salz. Verpackt wie jede Meldung (`t1.` + IV ‖ Chiffrat, vorher `deflate-raw`).
- **Rationale**: Den privaten Organisator-Schlüssel haben genau die Handys mit Trainer-Link. Zuschauer-Links enthalten nur den öffentlichen Schlüssel und den Zuschauer-Schlüssel; Lead-Links (erste Version) keinen privaten Organisator-Schlüssel. AES-GCM authentifiziert: Wer den Schlüssel nicht hat, kann keine gültige Kader-Meldung bauen. Eine zusätzliche Signatur im Inhalt (wie beim Spielplan) ist darum nicht nötig; der Dienst prüft wie bei `cfg` und `plan` den Schreibnachweis mit dem Organisator-Schlüssel.
- **Neu ausstellen**: Neuer Organisator-Schlüssel, also neuer Kader-Schlüssel; alte Trainer-Links lesen nichts Neues mehr.
- **Alternatives**: Zuschauer-Schlüssel (Eltern könnten lesen, verletzt FR-B05); eigener Zufallsschlüssel im Trainer-Link (Linkformat ändern, ältere Links hätten ihn nicht).

## R-B3 Eine Zeile je Kader, Zusammenführen beim Empfang

- **Decision**: Je geteiltem Kader eine ersetzbare Zeile beim Dienst (`slot` = HMAC über `["squad", sid]` wie bei Spielen, R-N3). Die Meldung enthält den ganzen Kader mit Zeitstempel je Kind, je Name des Kaders und je Zuordnung einer Mannschaft. Der Dienst nimmt eine Meldung an, wenn ihr `at` (größter Zeitstempel darin) mindestens so groß ist wie der gespeicherte. Empfänger führen je Kind, je Kadername und je Mannschaft die jüngere Angabe zusammen. Hat ein Handy nach dem Zusammenführen Neueres als die empfangene Meldung, sendet es seinen Stand erneut.
- **Rationale**: Der Dienst hält so immer den jüngsten ganzen Kader vor; ein neues Handy braucht nur `hello`. Gleichzeitige Änderungen gehen nicht verloren: Wer eine ältere Meldung sieht, schickt die Vereinigung nach (FR-B07). Höchstens 6 Zeilen statt eines Protokolls wie beim Spielplan (kein erneutes Senden nach 6 Stunden nötig).
- **Größe**: 30 Kinder ≈ 1 KB JSON, gepackt rund 0,6 KB; `MAX_BODY` (4.000 Zeichen) reicht für über 100 Kinder je Kader. Gelöschte Kinder bleiben 30 Tage im Kader (Grabstein), dann fallen sie weg.
- **Alternatives**: Meldung je Kind (viele Zeilen, Obergrenze 200 Zeilen); Protokoll wie der Spielplan mit erneutem Senden (mehr Verkehr, Kürzen nach 50).

## R-B4 Kennungen über Handys hinweg

- **Decision**: Kader und Kinder bekommen eine gemeinsame Kennung `sid` (beim ersten Teilen die lokale `id`). Lokale `id`s bleiben unverändert, weil Tore und Aufgebote auf sie zeigen. Ein neu empfangenes Kind bekommt `id` = `sid`. Kommt ein geteilter Kader erstmals an und gibt es einen gleichnamigen eigenen, werden seine Kinder einmal wie bei "Liste einfügen" erkannt (Vorname, Kürzel, Nummer; `roster-merge`) und bekommen die `sid` des Gegenstücks.
- **Alternatives**: `id` umschreiben (bricht Torschützen früherer Spiele).

## R-B5 Zeitstempel durch Vergleich beim Speichern

- **Decision**: Der Kader-Abgleich speichert Kinder und Kader über eine Funktion, die alten und neuen Stand vergleicht und geänderte Kinder geteilter Kader (Name, Nummer, gelöscht, Kader) mit `at` = jetzt stempelt; ebenso Kadername (`at`) und Zuordnung einer Mannschaft (`squadAt`). Die Bildschirme ändern nur, wo sie speichern.
- **Rationale**: Ein Stempel an jeder Stelle, die Kinder ändert (Kader, Liste einfügen, Sicherung), wäre leicht zu vergessen.

## R-B6 Empfangen auf Trainer-Handys

- **Decision**: Ein gekoppeltes Trainer-Handy hält, solange die App sichtbar ist, eine Verbindung zum Dienst (wie das Dashboard) und übernimmt dabei Konfiguration, Spielplan und Kader. Meldungen, die sich mit dem Zuschauer-Schlüssel nicht öffnen lassen, versucht es mit dem Kader-Schlüssel.
- **Rationale**: FR-B06 verlangt 10 Sekunden auf allen Handys, die online sind, unabhängig vom Bildschirm. Ältere App-Stände öffnen Kader-Meldungen nicht und überspringen sie (FR-B12).

## R-B7 "Link einfügen" erkennt Kader-Listen

- **Decision**: Erkannt wird eine Kader-Liste an der ersten Zeile "Kader <Name>:" (Spec 015 FR-P23) und mindestens einer Zeile, die `parseRosterList` als Kind liest. Die Vorschau ist die bestehende von "Liste einfügen" auf "Mehr" → "Kader"; der Text wird beim Öffnen übergeben.
- **Alternatives**: Jede Textliste als Kader-Liste deuten (verwechselt beliebigen Text).
