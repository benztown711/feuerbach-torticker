# Roadmap und Review (Stand 05.11.2026, Status aktualisiert am 06.11.2026 nach dem Gerätetest)

Ergebnis eines Reviews der App hinsichtlich Zweck, UI/UX und fehlender Funktionen, vor dem ersten produktiven Einsatz am Samstag, 07.11.2026 (E1 und E2). Diese Datei ist die Arbeitsliste: Status je Punkt pflegen, erledigte Punkte abhaken, neue Wünsche unten anfügen. Jede Umsetzung folgt dem Ablauf aus `CLAUDE.md` (Spec, Review, Mockup, PR, Hilfe).

Legende: Aufwand 1 bis 10 (1 = unter einer Stunde, 10 = mehrere Tage mit neuer Infrastruktur). Modell: Haiku für Text und Kleinkram, Sonnet für Features im bestehenden Muster, Opus für Spec, Sync und Sicherheit. Status: offen, in Arbeit, erledigt, verworfen.

## Kurzfassung des Reviews

- Zweck und Kern sind stark: ein Tap pro Tor, Uhr als Berechnung, offline, Live-Dashboard für Eltern ohne Installation.
- Für den ersten Einsatz reicht der Stand, wenn der Gerätetest (Spec 006, G-1 bis G-10) gemacht ist und Atti die Einrichtung selbst erledigt. Trainer brauchen zwei Aktionen: App auf den Home-Bildschirm, Trainer-Link einfügen.
- Größte UX-Lücke: Trainerkollegen müssen Trainer-Link und Kader-Liste getrennt einfügen. Lösung: ein Trainer-Paket-Link (B1, B2).
- Größter Nutzen danach: Spielplan im Live-Spieltag (C1). Trainer tippen nur noch „Anpfiff“, Eltern sehen vorab, wer wann spielt.
- Developer-Lizenzen (Apple, Google) jetzt nicht; Push geht ohne. Entscheidung nach der Hinrunde (Abschnitt E).

## Befund UI/UX

- Gut: Spielbildschirm ohne Scrollen, Tor-Knöpfe groß und in Trikotfarbe, Rückgängig-Leiste, Torschützen-Auswahl schließt nach 8 s von selbst, Dashboard nur lesen und aufklappbar, Hilfe mit Suche, hell und dunkel sauber.
- Schwach für neue Trainer: Erststart zeigt nur „Neues Spiel“, Mannschaft und Kader liegen unter „Mehr“. Mit dem Trainer-Link kommen Mannschaften mit, der Kader nicht.
- Kader ist global, nicht je Mannschaft: Bei E1 und E2 auf einem Handy zeigt die Torschützen-Auswahl alle Kinder, sofern kein Aufgebot gewählt ist (gemerktes Aufgebot je Mannschaft mildert das).
- Fehlt im Spiel: Nach „Schlusspfiff“ kein Zurück; ein vergessenes Tor lässt sich nur mit der aktuellen Minute nachtragen. (Erledigt mit Spec 012, siehe A4 und C2.)
- Risiko: ntfy.sh ist eine öffentliche Instanz mit Limits je IP-Adresse (Mobilfunk teilt Adressen). Bei 429 fällt die App auf Abfrage alle 30 s zurück; ohne Dienst bleibt „Zwischenstand teilen“.

## Reihenfolge

1. Vor dem ersten Spieltag: A1, A2, D2, optional A4.
2. Danach (ein bis zwei Wochen): B1 + B2 in einem PR, dann C2.
3. Dann: C1 (Spielplan), B3, C5 bis Mitte Dezember (Hallenturnier 04.01.2027).
4. Später: C3 + D1, dann C4. Lizenzfrage (E) nach der Hinrunde.

## A. Vor dem ersten Spieltag

| Nr | Vorschlag | Aufwand | Modell | Dringlichkeit | Empfehlung | Status |
|---|---|---|---|---|---|---|
| A1 | Gerätetest Live-Spieltag G-1 bis G-10 (`specs/006-live-spieltag/quickstart.md`) mit zwei Handys und einem Browser | 2 | Atti | Pflicht | Vor allem G-4, G-5, G-8 (Tor, Funkloch, Übernehmen) | erledigt am 06.11.2026 auf dem iPhone (G-4, G-5, G-8 bestanden); offen: G-6 verstellte Uhr (geringes Restrisiko), G-10 optional, Sichern und Wiederherstellen, Android am Testwochenende |
| A2 | Einrichtung durch Atti: E1 und E2 anlegen, Kader je Mannschaft, Live-Spieltag, Trainer-Link in die Trainergruppe, Zuschauer-Link in die Elterngruppen, Trainern eine 3-Zeilen-Nachricht | 1 | Atti, Text per Haiku | Pflicht | Zuschauer-Link am Vorabend senden. Trainern, die vor dem 06.11.2026 mit dem Zuschauer-Link getestet haben, diesen Satz mitgeben: „Falls ihr den Spieltag schon auf dem Home-Bildschirm habt und dort ‚Neues Spiel‘ erscheint: Symbol löschen und den Link neu ablegen.“ (Fehlerbehebung #50) | offen |
| A3 | Release 0.4.0 mergen (PR #39) | 1 | keins | niedrig | Nur Versionsnummer in der Hilfe | erledigt (#39, 06.11.2026) |
| A4 | Spiel nach Schlusspfiff wieder öffnen („Spiel fortsetzen“ in den Spieldetails) | 3 | Sonnet | mittel | Rückfrage beim Schlusspfiff fängt das meiste ab | erledigt, anders gelöst: „Schlusspfiff zurücknehmen“ bis 10 Minuten danach und „Tor nachtragen“ auch nach dem Schlusspfiff (Spec 012 US2, US3, #42); kein eigenes „Spiel fortsetzen“ |

## B. Einrichtung ohne Anleitung

| Nr | Vorschlag | Aufwand | Modell | Dringlichkeit | Empfehlung | Status |
|---|---|---|---|---|---|---|
| B1 | Trainer-Paket: ein Link mit Kopplung, Mannschaften, Trikots und Kadern; im Torticker genügt „Link einfügen“ | 5 | Opus (Spec, Link-Format, Sicherheit), Sonnet (Umsetzung) | hoch | Wichtigste Verbesserung: aus drei Einfüge-Schritten wird einer | offen |
| B2 | Knopf „Link einfügen“ auf dem Startbildschirm, der jeden Torticker-Link erkennt (Paket, Trainer, Zuschauer, Kader) und die Zwischenablage anbietet | 3 | Sonnet | hoch | Mit B1 in einem PR | teilweise: „Trainer-Link einfügen“ auf dem Startbildschirm erkennt Trainer- und Zuschauer-Link (Spec 012 US1, #42); Paket und Kader offen |
| B3 | Kader je Mannschaft, Aufgebot aus der Mannschaft vorbelegt | 4 | Sonnet | mittel | Löst das E1/E2-Gemisch in der Torschützen-Auswahl | offen |
| B4 | Erststart-Assistent: Mannschaft wählen oder Link einfügen, zwei Schritte | 3 | Sonnet | mittel | Erst nach B1 und B2 | offen |

## C. Spieltag-Komfort für Trainer und Eltern

| Nr | Vorschlag | Aufwand | Modell | Dringlichkeit | Empfehlung | Status |
|---|---|---|---|---|---|---|
| C1 | Spielplan im Live-Spieltag: Gegner und Anstoßzeit je Mannschaft vorab; „Neues Spiel“ auf allen Trainer-Handys vorbelegt; Dashboard zeigt „Heute 10:30 E1 gegen …“ | 6 | Opus (Spec, Sync), Sonnet | hoch nach dem ersten Spieltag | Die „Magie im Hintergrund“ | offen |
| C2 | Tor nachtragen mit Minute, Minute korrigieren | 3 | Sonnet | mittel | Kleiner Aufwand, häufiger Fall | erledigt (Spec 012 US2, #42) |
| C3 | Endstand und Saison-Ergebnisse dauerhaft auf dem Dashboard (heute rund 12 Stunden) | 7 | Opus | mittel | Eigener Gratis-Dienst (z. B. Cloudflare Worker); Teil 1 von Spec 007 | offen |
| C4 | Push bei Toren auf dem Sperrbildschirm der Eltern (Spec 007) | 8 | Opus | niedrig bis mittel | Web Push ohne Lizenz; setzt C3 voraus, auf iPhone Dashboard auf dem Home-Bildschirm | offen |
| C5 | Turniermodus (Spec 002) für das Hallenturnier am 04.01.2027 | 6 | Opus (Spec), Sonnet | bis Mitte Dezember | Zwei fremde Mannschaften, „Nächstes Spiel“ mit einem Tap | offen |
| C6 | Saison-Torschützenliste in der Historie | 3 | Sonnet | niedrig | Nett, kein Muss | offen |
| C7 | Haptik beim Tor-Tap (Android), optionaler Ton bei Tor auf dem Dashboard | 2 | Haiku | niedrig | iPhone kann im Browser nicht vibrieren | offen |

## D. Risiken und Hygiene

| Nr | Vorschlag | Aufwand | Modell | Dringlichkeit | Empfehlung | Status |
|---|---|---|---|---|---|---|
| D1 | ntfy.sh durch eigenen Worker ersetzen, sobald C3 kommt (ein Dienst, keine fremden IP-Limits) | in C3 | Opus | mittel | Nach dem ersten echten Spieltag entscheiden | offen |
| D2 | Hilfe-Eintrag „Dashboard zeigt nichts“ mit „Zwischenstand teilen“ als Ausweg | 1 | Haiku | mittel | Vor dem ersten Spieltag machbar | offen |

## E. Apple- und Android-Lizenz

Kosten: Apple 99 USD pro Jahr, Google 25 USD einmalig. Beides widerspricht Constitution VIII (kostenfrei) und bräuchte eine Änderung. Entscheidung nach der Hinrunde: Wenn Trainer und Eltern wirklich an „Link einfügen“ und an der Installation scheitern, ist Apple mit Capacitor-Hülle plus Universal Links (zusammen etwa Aufwand 9) die Lösung. Google allein lohnt nicht.

| Feature | Nur mit Lizenz? | Aufwand | Modell | Einschätzung |
|---|---|---|---|---|
| Installation über App Store statt „Teilen, Zum Home-Bildschirm“; keine Safari-Datenlöschung | ja (Apple) | 7 | Opus | Größte Installationshürde fällt; Capacitor, Review, Datenschutzangaben |
| Universal Links: Trainer- und Zuschauer-Link aus WhatsApp öffnet direkt die App | ja (Apple) | 4 zusätzlich | Sonnet | Löst das iOS-Problem aus Spec 006 (R-L6) vollständig |
| Live Activities / Dynamic Island: Spielstand auf dem Sperrbildschirm | ja (Apple) | 9 | Opus | Braucht zusätzlich C3-Dienst und Apple-Push |
| Pfiff und Senden bei gesperrtem Bildschirm | ja | 5 zusätzlich | Sonnet | Geringer Nutzen, Bildschirm bleibt ohnehin an |
| Haptik auf dem iPhone beim Tor | ja | 2 zusätzlich | Haiku | Kleinigkeit |
| Play-Store-Eintrag (Trusted Web Activity) | ja (Google) | 3 | Sonnet | Nur Auffindbarkeit; Android kann alles als PWA |
| Push-Benachrichtigungen | nein | siehe C4 | | Web Push reicht (iOS ab 16.4 installiert, Android) |

## Offene Fragen an Atti

1. D2 noch vor dem ersten Spieltag bauen, oder bleibt der Stand eingefroren? (A4 ist mit Spec 012 erledigt.)
2. Trainer-Paket (B1): alle Kader mitnehmen, oder nur Mannschaften?
3. Spielplan (C1): pflegt nur Atti ihn, oder jeder mit Trainer-Link?

## Neue Wünsche

| Nr | Wunsch | Spec | Status |
|---|---|---|---|
| N1 | Kader nach Vorname oder Rückennummer sortieren (Einstellungen → Kader), Vorgabe Vorname | 013 | erledigt (#44, #47) |
| N2 | Historie: mehrere Spiele auswählen und löschen, 10 Sekunden „Rückgängig“ | 014 | erledigt (#48, #49) |
| N3 | „Kader teilen“ und „Liste einfügen“: abgekürzte Namen wie „Max Mü.“ bleiben erhalten | 001 FR-028 | erledigt (#46) |

| N4 | Trainer-Link leichter übernehmen: Herauskopieren aus der Nachricht war im Gerätetest mühsam (G-2); in WhatsApp war der lange Link nur bis `#/trainer/` antippbar | 006 R-L20 | erledigt (#62): kurzer Trainer-Link und Symbol auf dem Home-Bildschirm, das koppelt; Gerätetest L065 bestanden |

| N5 | Dashboard-Karten: Namen auf Android mit großer Schrift unlesbar umgebrochen | 006 FR-L12, FR-L18 | erledigt: Tabellenzeilen (Heim oben, Gast darunter, Tore rechts) |

(weitere hier anfügen)
