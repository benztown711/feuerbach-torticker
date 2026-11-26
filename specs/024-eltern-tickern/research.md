# Research: Eltern tickern über den Zuschauer-Link (Spec 024)

Gesichtet am 26.11.2026: `relay/src/spieltag.ts`, `src/domain/relay-protocol.ts`, `src/platform/live-crypto.ts`, `src/domain/live-spieltag.ts`, `src/platform/live-sender.ts`, `src/domain/live-takeover.ts`, `src/domain/live-board.ts`, `src/domain/live-snapshot.ts`, `src/domain/squad-sync.ts`.

## R-E1 Ticker-Recht: ein Eltern-Schlüssel je Live-Spieltag

- **Decision**: Ein Trainer-Handy erzeugt einmal einen Signaturschlüssel "Eltern" (ECDSA P-256) und ein vom Organisator signiertes **Eltern-Zertifikat** `{ key: "*", name: "Eltern", homeColor: "rot", awayColor: "weiss", pub, iat, p: 1 }`. Privater Schlüssel und Zertifikat reisen als vom Organisator signiertes **Eltern-Paket** `{ k: PrivateKeyParts, c: SignedData, iat }` im Umschlag der Konfigurations-Meldung (`cfg`, Feld `k`), also mit dem Zuschauer-Schlüssel verschlüsselt. Jeder Zuschauer-Link kennt es damit automatisch, ohne neues Teilen (FR-E01).
- **Rationale**: Der Dienst nimmt Spiel-Meldungen mit einem vom Organisator signierten Zertifikat schon heute an (Lead-Handys der ersten Version, `Spieltag.leadKey` prüft nur `key` und `pub`). Der Dienst bleibt unverändert; Zuschauer-Handys können weiterhin nur Spiele senden, alles andere (Konfiguration, Spielplan, Kader, Neu-Ausstellen) verlangt die Organisator-Signatur (FR-E02).
- **Ein Zertifikat für alle Mannschaften** (`key: "*"`, `p: 1`): `openMessage` nimmt einen Live-Stand mit Eltern-Zertifikat für jede Mannschaft an und meldet ihn als `parent`. Ob Eltern für die Mannschaft tickern dürfen, entscheidet das Dashboard anhand der Konfiguration (R-E2). Ein Zertifikat je Mannschaft hätte die Konfiguration um bis zu 6 × 350 Zeichen vergrößert.
- **Nur in `cfg`**: Spiel-Meldungen tragen die Konfiguration (`g`) weiter, aber nicht das Paket (Grenze 4 KB je Meldung). Der Dienst hält die jüngste `cfg`-Zeile vor; neue Zuschauer bekommen sie mit `hello`.
- **Wer erzeugt es**: Jedes Trainer-Handy, das eine Konfiguration ohne Paket kennt (bestehende Live-Spieltage nach dem Update, neue Live-Spieltage), erzeugt es beim Start der Verbindung bzw. beim Anlegen und sendet die Konfiguration neu (`iat` = jetzt). Erzeugen zwei Handys gleichzeitig, gilt die jüngere Konfiguration; Meldungen mit dem älteren Paket bleiben gültig (beide Zertifikate sind vom Organisator signiert).
- **Alternatives considered**: eigener Ticker-Link (in Review A verworfen); privater Schlüssel in `LiveConfig` (reist mit jeder Spiel-Meldung, zu groß); Schlüssel aus dem Organisator-Schlüssel ableiten (ECDSA-Punkt ohne Bibliothek nicht berechenbar).

## R-E2 Schalter "Eltern dürfen tickern"

- **Decision**: `LiveConfig.x?: string[]`: Kurzlabels der Mannschaften, bei denen Eltern **nicht** tickern dürfen. Fehlt = alle erlaubt (Vorgabe an, FR-E18, auch für bestehende Live-Spieltage). Ein Trainer-Handy ändert den Schalter wie Titel und Mannschaften (neue Konfiguration, jüngste gilt).
- **Wirkung**: Das Dashboard verwirft Live-Stände mit Eltern-Zertifikat für Mannschaften in `x` (FR-E03, US4-S2). Der zuletzt angenommene Stand bleibt sichtbar. Das tickernde Eltern-Handy sieht die neue Konfiguration und zeigt den Hinweis aus US4-S3 (es sendet weiter, der Stand ändert aber nichts mehr; nach Wiedereinschalten setzt "Spiel übernehmen" fort).

## R-E3 Eltern-Handy sendet mit dem bestehenden Sender

- **Decision**: `Settings.liveTicker?: { topic, viewKey, orgPub, kit: SignedData }` (Name separat in `Settings.tickerName`) speichert, was das Eltern-Handy zum Senden braucht; `Settings.live` bleibt den Trainer-Handys vorbehalten (die Eltern-Ansicht wird nicht zur Trainer-App, Spec 020 US5). Für den Sender baut `tickerSpieltag()` daraus einen `LiveSpieltag` ohne Organisator-Schlüssel mit je erlaubter Mannschaft einem Zugang (Eltern-Schlüssel, Eltern-Zertifikat). Damit gelten Sende-Takt, Wiederholung, Grabsteine und Übergabe (`h`) wie bei Trainern.
- Ein Handy mit `Settings.live` (Trainer-Handy) tickert immer als Trainer; die Eltern-Wege erscheinen dort nicht (Edge Case).

## R-E4 Wer tickert: Name im Live-Stand

- **Decision**: Live-Stand bekommt optional `by` (Name, 1 bis 20 Zeichen) und `tr: 1` (Trainer-Handy). Trainer-Handys senden `settings.trainerName` (Spec 015) und `tr: 1`; Eltern ihren Ticker-Namen. Ältere Dashboards übergehen die Felder (`parseSnapshot` lässt Unbekanntes weg).
- **Anzeige**: Karte "<Name> tickert bereits", "Trainer <Name> tickert bereits", ohne Namen "Trainer tickert bereits"; eigenes Handy "Du tickerst" (erkannt an den Spielen in der eigenen Datenbank); beendet "Getickert von …". Stände ohne `by` (ältere Handys) zeigen keine Zeile.

## R-E5 Kader für Eltern: Kopie für den Zuschauer-Link

- **Decision**: Trainer-Handys veröffentlichen zu jedem geteilten Kader, der mindestens einer Mannschaft mit erlaubtem Tickern zugeordnet ist, eine **Zuschauer-Kopie**: eigene `squad`-Zeile (`slot = squadSlot(viewKey, "v." + sid)`), Inhalt mit dem Zuschauer-Schlüssel verschlüsselt, nur nicht gelöschte Kinder (Vorname bzw. Kürzel, Nummer) und die erlaubten Mannschaften. Wird das Tickern für alle seine Mannschaften ausgeschaltet oder der Kader nicht mehr geteilt, folgt ein Grabstein (`gone: true`). Zuschauer-Handys halten Kader nur im Speicher (nie im Gerätespeicher), Konstitution II 3.2.0.
- **Rationale**: Der Kader-Schlüssel (aus dem Organisator-Skalar abgeleitet) bleibt Trainer-Handys vorbehalten; das Ausschalten wirkt je Mannschaft. Trainer-Handys überspringen Kopien (`unsealSquad` ergibt null).
- **Torschützen**: Eltern wählen aus der Kopie; gespeichert wird ein Freitext-Torschütze (`{ kind: 'text' }`), damit nichts in den Kader des Eltern-Handys gelangt. Vorlagen fragt die Eltern-Fassung nicht ab (keine Kader-Kennungen).
- **Alternatives considered**: Kader-Schlüssel in der Konfiguration (für alle Zuschauer und Mannschaften dauerhaft lesbar, Ausschalten wirkungslos).

## R-E6 Wege in der Eltern-Ansicht

- Routen `#/live/<Daten>/spiel/<id>` (Spielbildschirm, Eltern-Fassung) und `#/live/<Daten>/neu` (Neues Spiel, Eltern-Fassung); ohne Navigationsleiste, mit "Zurück zu Live" (FR-E15).
- "Ich tickere dieses Spiel" legt das Spiel aus dem Planspiel an (Gegner, Heim/Gast, Spielzeit aus dem Plan bzw. der letzten Spielzeit der Mannschaft, Trikots aus der Konfiguration bzw. Palette), Spiel-Kennung = Kennung des Planspiels, damit die Karte nicht doppelt erscheint.
- Doppelstart (FR-E11): Vor dem Anlegen prüft die Eltern-Ansicht `runningElsewhere`/die Karte; nach dem Anlegen sendet sie sofort (Spiele vor dem Anpfiff gehen schon heute hinaus). Kommt binnen 3 Sekunden ein fremder Stand derselben Mannschaft mit früherer Serverzeit, zeigt sie die Frage aus US2-S6.

## R-E7 Übernahme in die Trainer-Historie (US5)

- Trainer-Handys sehen auf dem Startbildschirm beendete Eltern-Spiele ihrer Mannschaften (`parent` und `by` im Board), die nicht in ihrer Historie sind und nicht abgelehnt wurden (`Settings.parentGamesDone?: string[]`, höchstens 50). "Übernehmen" nutzt `takeoverGame` (Spec 006 US6) und setzt `Game.tickedBy`; die Spiel-Kennung bleibt gleich (FR-E21).

## R-E8 Bundle-Budget

- Eltern-Fassungen von Spielbildschirm und "Neues Spiel" nutzen die bestehenden Bildschirme mit einem Schalter; die Zusatzlogik der Eltern-Ansicht liegt im nachgeladenen Dashboard-Modul.
