# Research: Live-Spieltag (Spec 006)

Nummern R-L1 bis R-L9. Grundlagen (PWA, IndexedDB, Minutenformel) stehen in `specs/001-spiel-erfassen/research.md`.

## R-L1 Vermittlungsdienst: ntfy.sh

- **Decision**: Öffentliche Instanz ntfy.sh ohne Konto. Ein Live-Spieltag entspricht einem Topic mit zufälligem Namen (128 Bit, base64url, 22 Zeichen).
- **Rationale**: kostenlos ohne Konto (Constitution VIII), quelloffen, aus dem Browser nutzbar (`access-control-allow-origin: *`, am 04.11.2026 geprüft), hält Meldungen rund 12 Stunden vor (Nachzügler sehen den Stand), liefert neue Meldungen sofort per Stream.
- **Grenzen laut Dokumentation** (docs.ntfy.sh/publish, Abschnitt Limitations, Stand 04.11.2026): Meldung bis 4.096 Byte (größere werden zum Anhang, darum hartes Limit im Code), 250 Meldungen je Tag und Anschluss, 60 Anfragen auf einmal mit Nachschub 1 je 5 s, 30 offene Verbindungen je Anschluss, 200 MB Datenverkehr je Tag und Anschluss. Wiederholter Missbrauch kann zur Sperre der IP führen.
- **Folgen**: Senden höchstens alle 5 s (Bündelung, R-L3); Gesamtgröße je Meldung ≤ 3.800 Byte (Puffer); Zuschauer über 30 je Anschluss weichen auf Abfragen im Abstand von 30 s aus (R-L2).
- **Alternatives**: Cloudflare Workers mit Durable Objects (kostenloses Konto nötig, eigene Betriebsaufgabe; vorgemerkt für Spec 007); Firebase/Supabase (Konto, Google bzw. Pausieren nach Inaktivität, Tracking-Risiko); WebRTC direkt zwischen Handys (braucht Signalisierung, im Mobilfunk unzuverlässig, Zuschauer nicht erreichbar).

## R-L2 Empfang: JSON-Stream per `fetch`, Abfrage als Rückfall

- **Decision**: `GET https://ntfy.sh/<topic>/json?since=<letzte ID | 12h>` mit `fetch` und zeilenweisem Lesen des Streams. Endet der Stream oder bricht er ab, neuer Versuch nach 1, 2, 4 … höchstens 30 s mit `since=<letzte ID>`. Antwortet der Dienst mit 429 (zu viele Verbindungen), wechselt der Empfänger auf `poll=1` alle 30 s.
- **Rationale**: Ein Codepfad für Stream und Abfrage; `fetch` lässt sich in Playwright per `page.route` vollständig nachbilden (die Testantwort endet, der Client verbindet neu), `EventSource` nicht. Die Ereignisse `open` und `keepalive` liefern die Serverzeit für den Uhrenabgleich (R-L4). Bei verborgener Seite (`visibilitychange`) wird der Stream geschlossen und beim Zurückkehren mit `since=<letzte ID>` neu geöffnet.
- **Alternatives**: `EventSource` (nicht per Route testbar, kein Zugriff auf Statuscodes); WebSocket-Endpunkt von ntfy (gleiches Testproblem).

## R-L3 Senden: letzter Stand statt Einzelereignisse

- **Decision**: Jede Meldung enthält den vollständigen Stand eines Spiels (Live-Stand, `contracts/live-message.md`). Ein Sender je Gerät bündelt Änderungen: sofort senden, wenn die letzte Meldung mindestens 5 s zurückliegt, sonst nach Ablauf; ohne Netz oder bei Fehler neuer Versuch mit wachsendem Abstand (5, 10, 20, 30 s), dann alle 30 s. Während ein Spiel läuft, angehalten oder in der Pause ist, wiederholt der Sender den Stand alle 3 Minuten (Lebenszeichen für FR-L15) und sofort, wenn die App in den Vordergrund zurückkehrt.
- **Rationale**: Ein verlorener oder doppelter Stand richtet keinen Schaden an (idempotent, FR-L07 "kein Rückstau"); Nachzügler brauchen nur die letzte Meldung je Spiel. Mengengerüst: 2 × 25 Minuten mit 10 Toren ≈ 20 Änderungen + 17 Lebenszeichen ≈ 40 Meldungen; drei Spiele am Tag ≈ 120 von 250.
- **Auslöser**: `db.ts` meldet jedes `putGame`/`deleteGame` an registrierte Beobachter; der Sender reagiert nur auf Spiele gekoppelter Mannschaften (Vergleich `game.ownTeam` mit dem Namen der gekoppelten Mannschaft) mit `game.live !== false`. So erfasst er auch Änderungen aus Spieldetails und Historie, ohne die Bildschirme anzufassen.
- **Alternatives**: Einzelereignisse (Reihenfolge und Lücken müssten repariert werden); Senden aus `GameScreen.update` (verpasst Spieldetails und Löschen).

## R-L4 Minute beim Zuschauer trotz falsch gehender Uhren (SC-L04)

- **Decision**: Der Live-Stand überträgt die Uhr-Ereignisse mit den Zeitstempeln des Lead-Handys und dessen Sendezeit `sentAt`. Der Empfänger rechnet: `leadNow = jetzt + (Serverzeit − lokale Zeit) + (sentAt − Serverzeit der Meldung)`. Die Differenz Serverzeit − lokale Zeit stammt aus dem letzten `open`- oder `keepalive`-Ereignis des Streams (Sekundengenauigkeit genügt). Die Minute berechnet `deriveClock` aus der Domäne, genau wie auf dem Lead-Handy (Constitution V).
- **Rationale**: Unabhängig davon, wie falsch Lead- oder Zuschauer-Uhr gehen; Fehler ≤ Laufzeit der Meldung + 1 s.
- **Alternatives**: Nur `sentAt` gegen lokale Zeit (falsch bei falscher Uhr); Spielminute statt Ereignisse senden (Minute stünde zwischen den Meldungen still).

## R-L5 Ende-zu-Ende-Verschlüsselung und Sende-Berechtigung (FR-L11)

- **Decision**: Web Crypto, keine Bibliothek.
  - **Zuschauer-Schlüssel**: AES-GCM 256 Bit. Jede Meldung: zufälliger 12-Byte-IV, Text `t1.<base64url(IV ‖ Chiffrat)>`.
  - **Organisator-Schlüssel**: ECDSA P-256. Der öffentliche Teil steht im Zuschauer-Link.
  - **Lead-Schlüssel**: ein ECDSA-P-256-Paar je Mannschaft. Der Organisator signiert ein **Lead-Zertifikat** (Mannschaft, Kurzlabel, Trikots, öffentlicher Lead-Schlüssel, Ausstellungszeit). Der Lead-Link enthält Zertifikat und privaten Lead-Schlüssel.
  - **Meldung** = verschlüsselt( { Inhalt, Zertifikat, Signatur des Inhalts mit dem Lead-Schlüssel } ). Der Empfänger entschlüsselt, prüft das Zertifikat mit dem Organisator-Schlüssel und die Signatur mit dem Lead-Schlüssel; sonst wird die Meldung verworfen. Pro Spiel gilt nur der Stand mit dem jüngsten `sentAt` (alte, wiederholte Meldungen ändern nichts).
  - **Titel und Mannschaftsliste** (FR-L19) reisen als vom Organisator signierte Konfiguration mit (`cfg`); jedes Lead-Handy hängt die jüngste ihm bekannte an seine Meldungen an, der Organisator sendet sie bei jeder Änderung.
- **Rationale**: Der Dienst sieht nur Zeichensalat; wer nur den Zuschauer-Link hat, kann lesen, aber nichts gültig signieren. Neue Mannschaften brauchen nur ein neues Zertifikat, der Zuschauer-Link bleibt (FR-L19). Neu ausstellen = neues Topic und neue Schlüssel.
- **Grenzen**: Wer einen Lead-Link hat, kann für diese Mannschaft senden, bis neu ausgestellt wird (bewusst so: Ersatzhandy, US5 Szenario 5). Ein Entfernen einer Mannschaft wirkt bei Zuschauern, sobald sie die neue Konfiguration erhalten haben.
- **Alternatives**: Nur AES (jeder Zuschauer könnte fälschen); HMAC (Prüfen erfordert den geheimen Schlüssel); öffentliche Lead-Schlüssel direkt im Zuschauer-Link (neue Mannschaft = neuer Link).

## R-L6 Links und Einfügen statt Antippen (iPhone)

- **Decision**: Links zeigen auf die App mit allen Schlüsseln im Fragment (`#/live/<Daten>` bzw. `#/lead/<Daten>`); das Fragment geht nie an GitHub Pages oder ntfy. Inhalt: versioniertes JSON, base64url (`contracts/live-link.md`). Der Lead-Link wird im Torticker eingefügt (Spec-Entscheidung vom 04.11.2026), weil iOS Links nie in der Home-Bildschirm-App öffnet. Im Browser angetippt zeigt die Seite die Anleitung, "Link kopieren" und "Hier im Browser koppeln".
- **Zuschauer auf dem Home-Bildschirm** (FR-L16): Welche Adresse iOS beim "Zum Home-Bildschirm" für eine Seite mit Manifest übernimmt (aktuelle Adresse oder `start_url`), ist im Gerätetest zu prüfen (quickstart.md, Gerätetest G-3). Vorkehrung ohne Mehraufwand: Die Dashboard-Ansicht merkt sich den zuletzt geöffneten Zuschauer-Link; startet der Torticker ohne eigene Spiele und Mannschaften, öffnet er dieses Dashboard. Fällt der Test negativ aus, empfiehlt das Dashboard "Lesezeichen" statt "Home-Bildschirm" (Textänderung).
- **Ergebnis G-3 (05.11.2026, iPhone eines Elternteils)**: negativ. iOS legt das Symbol mit der `start_url` des Manifests an (`/feuerbach-torticker/`), und die Home-Bildschirm-App sieht den in Safari gemerkten Zuschauer-Link nicht (getrennte Daten). Ergebnis: Startbildschirm mit "Neues Spiel".
- **Decision (Nachtrag, 2. Fassung)**: Die Seite des Zuschauer-Links verweist auf ein eigenes Manifest: gleiche Angaben wie die App, `start_url` ist der Zuschauer-Link (ohne Eltern-Hilfe), `id` und `scope` bleiben die der App, alle Adressen absolut (`src/domain/web-manifest.ts`, `src/platform/web-manifest.ts`, `src/platform/manifest-link.ts`). Die erste Fassung (PR #45) setzte den Verweis erst nachträglich und als `data:`-Adresse; laut WebKit-Quellcode wirkt beides in Safari nicht:
  - `HTMLLinkElement::process()` ruft `DocumentLoader::loadApplicationManifest` auf, sobald ein Manifest-Verweis eingelesen oder eingefügt wird; danach bleibt es für die Seite bei diesem ersten Manifest. Darum steht im HTML kein Verweis mehr (Vite-Plugin in `vite.config.ts`); `src/main.tsx` setzt beim Start das App-Manifest, auf der Seite des Zuschauer-Links setzt ihn das Dashboard, gleich mit dem Zuschauer-Link. Fehlt beim Einlesen ein Verweis, merkt sich WebKit nichts.
  - `ApplicationManifestLoader` lädt im CORS-Modus; eine `data:`-Adresse hat eine undurchsichtige Herkunft und gilt als fremd, ohne CORS-Freigabe scheitert das Laden. Darum eine `blob:`-Adresse (Herkunft der Seite). Sie entsteht im Browser, die Schlüssel verlassen das Gerät nicht (Constitution II).
  - `ApplicationManifestParser::parseStartURL` übernimmt eine `start_url` derselben Herkunft samt Fragment (`#/live/…`).
  - Code für das Zuschauer-Manifest liegt im nachgeladenen Dashboard; das Hauptbundle wächst nur um das Setzen des Verweises (R-L7).
- **Grenzen**: Vorher angelegte Symbole behalten die alte Startadresse und müssen neu angelegt werden (Hilfe `eltern-home`). Öffnet jemand die Startseite und fügt den Zuschauer-Link erst dort ein, gilt in Safari weiter das App-Manifest (selten; Eltern öffnen den Link).
- **Ergebnis G-3, Wiederholung (06.11.2026, Attis iPhone, nach Auslieferung von #50)**: bestanden. Zuschauer-Link aus iMessage in Safari geöffnet, "Zum Home-Bildschirm", das neue Symbol öffnet das Dashboard.
- **Alternatives**: Universal Links/App Clips (nur mit Apple-Developer-Konto, Constitution VIII); QR-Code (zusätzliche Bibliothek, Kamera-Zugriff, kein Gewinn gegenüber Einfügen).

## R-L7 Bundle-Budget

- **Decision**: Im Hauptbundle liegen nur Sender, Verschlüsselung und das Kennzeichen im Spielbildschirm (geschätzt 3 bis 4 KB gzip). Bildschirme "Live-Spieltag" und Dashboard werden per `import()` nachgeladen (eigene Datei, vom Service Worker vorab gespeichert). Stand vor 006: 39,8 KB von 60 KB.
- **Rationale**: Budget zählt nur, was `index.html` direkt lädt; die Spielerfassung bleibt schnell.

## R-L8 Tests ohne echten Dienst

- **Decision**: E2E-Fixture `relay`: ein Nachbau von ntfy im Testprozess (`page.context().route('https://ntfy.sh/**')`), der Meldungen speichert, `POST` annimmt und `GET …/json` mit `open`-Ereignis plus allen Meldungen seit `since` beantwortet. Nur Tests mit dieser Fixture dürfen `ntfy.sh` erreichen; der Netzwerk-Wächter bleibt sonst unverändert streng, und ein eigener Test prüft, dass ohne Kopplung kein Request an `ntfy.sh` geht (SC-L06). Mehrere Handys = mehrere Seiten im selben Browser-Kontext oder getrennte Kontexte mit gemeinsamem Speicher der Fixture.
- **Unit-Tests**: Domänenlogik (Live-Stand, Ansicht, Board, Links, Prüfung eingehender Daten) mit 100 % Branch-Coverage; Verschlüsselung mit Web Crypto von Node (`globalThis.crypto.subtle`).

## R-L9 Sicherheit eingehender Daten

- **Decision**: Alles, was entschlüsselt ankommt, läuft durch eine strenge Prüfung in der Domäne (Typen, Längen: Namen ≤ 40 Zeichen, Torschützen ≤ 40, höchstens 200 Tore, 100 Schüsse, 50 Uhr-Ereignisse; unbekannte Felder werden verworfen). Anzeige nur als Text (Preact, kein `innerHTML`). Links werden genauso geprüft. Der private Organisator-Schlüssel verlässt das Gerät nur in der Sicherung (FR-L21), Lead-Schlüssel nur im Lead-Link.

## R-L10 Sicherheitsreview US1 (04.11.2026)

- Ergebnis: keine Schwachstelle mit Konfidenz ≥ 7 (Fälschen als Zuschauer, Lead-Link-Prüfung, Schlüssel im Fragment, Relay-Aufrufe, AES-GCM/ECDSA, XSS geprüft).
- Umgesetzte Härtung: Kopplung an "denselben" Live-Spieltag nur bei gleichem Topic und gleichen Schlüsseln (sonst Rückfrage); Live-Stand nur gültig, wenn `m.team` zum geprüften Zertifikat passt.

## R-L11 Sicherheitsreview US2 (04.11.2026)

- Ergebnis: ein Befund mittlerer Schwere (Konfidenz 7): Nach dem Wechsel zu einem anderen Live-Spieltag konnte der Sender Stände des alten Spieltags (mit Vornamen) an das neue Topic schicken. Behoben: Bei anderem Topic oder anderen Schlüsseln startet ein neuer Sender; offene Sendungen nicht mehr gekoppelter Mannschaften werden verworfen.
- Härtungen: Ein gestoppter Sender sendet nichts mehr (auch keine Wiederholung). Alte, beendete Spiele aus der Zeit vor der Kopplung (z. B. aus einer Sicherung) werden nicht veröffentlicht.
- Bewusst offen: Länge und Zeitpunkt der Meldungen lassen für ntfy.sh grob erkennen, wann sich ein Stand ändert (keine Namen, keine Seite). Auffüllen auf feste Größen kostet Kontingent; entschieden: nicht nötig.

## R-L12 Sicherheitsreview US3 (04.11.2026)

- Ergebnis: ein Befund mittlerer Schwere (Konfidenz 8): Der gemerkte Dashboard-Stand hing nur am Topic. Wer das Topic kennt, hätte einen Link mit eigenem Organisator-Schlüssel bauen können; einmal geöffnet, hätte er gefälschte Stände (mit sehr großem `iat`/`sentAt`) unter dem Topic des echten Dashboards hinterlegt. Behoben: Der Speicher-Schlüssel enthält Topic und Organisator-Schlüssel (`torticker-live:<Topic>:<orgPub>`); ohne den echten Organisator-Schlüssel lässt sich weder Konfiguration noch Zertifikat gültig signieren.
- Geprüft ohne Befund: XSS (nur JSX-Text, Farben aus der Palette), Mannschaft A ändert Mannschaft B (Zertifikat und `team/gameId`), Fälschen nur mit Zuschauer-Link, Umleitungen (nur interne Routen), Wächter für hängende Streams.
- Bewusst offen: Inhaber eines echten Lead-Links könnten mit sehr großem `sentAt` ein Spiel ihrer Mannschaft festhalten; sie gelten nach R-L5 als vertrauenswürdig, Abhilfe ist "Alle Links neu ausstellen" (US5).

## R-L13 Trainergruppe: ein Trainer-Link statt Lead-Links je Mannschaft (Änderung 04.11.2026)

- **Decision**: Der Trainer-Link enthält den Zuschauerteil, den privaten Organisator-Schlüssel (`q`), die signierte Konfiguration (`g`) und die Mannschaften mit Name und Trikots (`m`), contracts/live-link.md. Wer ihn einfügt, wird Trainer-Handy: Das Handy erzeugt einen eigenen Lead-Schlüssel und je Mannschaft ein Zertifikat, signiert mit dem Organisator-Schlüssel. Meldungen sehen für Zuschauer genau so aus wie bisher (R-L5), das Dashboard bleibt unverändert.
- **Senden je Spiel (FR-L04)**: Ein Trainer-Handy sendet jedes Spiel, dessen eigene Mannschaft zum Live-Spieltag gehört; "Live aufs Dashboard" beim Anlegen bzw. "Nicht live senden" im Spiel nimmt einzelne Spiele aus. Bestehende Organisator-Handys gelten ohne Datenumbau als Trainer-Handys (Merkmal: Organisator-Schlüssel vorhanden). Lead-Handys der ersten Version senden weiter nur für ihre eingefügten Mannschaften.
- **Rationale**: Keine festen Trainerteams, 4 bis 5 Trainer wechseln je Wochenende; ein Link pro Saison, nichts umzustellen, kein Konto, keine Rollen. Die Kryptografie und der Empfang bleiben unverändert.
- **Sicherheit**: Der Trainer-Link ist so mächtig wie der Organisator: senden für alle Mannschaften, Konfiguration und Zertifikate signieren. Er gehört nur in die Trainergruppe (Text beim Teilen). Gelangt er nach außen oder verlässt jemand die Gruppe, hilft "Alle Links neu ausstellen" (US5). Wer nur den Zuschauer-Link hat, kann weiterhin nichts gültig signieren.
- **Länge**: rund 1.000 Zeichen bei zwei Mannschaften, höchstens rund 1.400 bei sechs.
- **Alternatives**: Lead-Links je Mannschaft weiter verteilen und alle einfügen (funktioniert, aber mehrere Links und nur ein Organisator); Auswahl "Dieses Wochenende bin ich Lead für" (muss jede Woche umgestellt werden); zusätzliche Helfer-Links je Mannschaft (von Atti nicht gewünscht).

## R-L14 Sicherheitsreview Trainer-Link (04.11.2026)

- Ergebnis: keine Schwachstelle mit Konfidenz ≥ 8. Geprüft: Organisator-Schlüssel `q` gehört zu `o` (Probesignatur), Konfiguration `g` von `o` signiert, nur Mannschaften der signierten Konfiguration werden gekoppelt und angezeigt, Rückfrage nennt Titel, alle Mannschaften und das Ersetzen einer Kopplung, Topic-Prüfung, kein Organisator-Schlüssel in Sicherung, Protokoll oder Meldungen, `livePrivate` (nie gesendet, Sicherung kann vorhandene Spiele nicht umstellen), XSS.
- Bewusst so (R-L13): Bestehende Organisator-Handys senden nach dem Update automatisch für alle Mannschaften ihres Live-Spieltags.

## R-L15 Spiel übernehmen (US6, 04.11.2026)

- **Decision**: Live-Stand und Grabstein tragen einen Übergabezähler `h` (contracts/live-message.md). Das Dashboard ordnet je Spiel nach `h`, dann nach `sentAt`. "Spiel übernehmen" legt das Spiel mit derselben Spiel-ID aus dem letzten Live-Stand an (Uhr über Serverzeit und eigenen Uhrenabgleich auf die eigene Uhr umgerechnet, R-L4) und sendet mit `h + 1`. Das alte Handy hört während eines Live-Spiels mit (nachgeladener Empfänger, wie das Dashboard) und hört auf zu senden, sobald es ein größeres `h` sieht; auch ohne das (kein Netz, gesperrt) ändern seine Meldungen das Dashboard nicht mehr.
- **Erkennen beim Anlegen**: "Neues Spiel" hört auf einem Trainer-Handy mit. Ein fremdes Spiel derselben Mannschaft gilt als laufend, wenn es heute ist, nicht beendet und die letzte Meldung höchstens 30 Minuten alt ist.
- **Grenzen**: Übernommen wird nur, was übertragen wird (FR-L10): keine Karten, Wechsel, Lesezeichen, kein Aufgebot. Torschützen werden über den Namen dem eigenen Kader zugeordnet. Die Uhrzeit der Tore wird aus Minute und Anpfiff geschätzt, höchstens der Zeitpunkt der Meldung (sonst gälte ein späteres Tor als Doppeltipp).
- **Alternatives**: Explizite Übergabe-Meldung an das alte Handy (braucht Empfang auf beiden Seiten, ohne Mehrwert gegenüber `h`); Sperre "nur ein Handy je Mannschaft" (verhindert die gewünschte Übergabe).

## R-L16 Sicherheitsreview US6 (04.11.2026)

- Ergebnis: keine Schwachstelle mit Konfidenz ≥ 8. Geprüft: `h` steht im signierten Inhalt (ohne Trainer- oder Lead-Schlüssel kein größeres `h`), wiederholte Meldungen ändern nichts (`h` und `sentAt` gleich), Mithören nutzt dieselbe Prüfung wie das Dashboard, Obergrenzen der übernommenen Daten, keine neuen Empfänger von Daten, Sicherung (`liveTakeover` 0 bis 100, vorhandene Spiele werden nicht überschrieben).
- Bewusst offen: Eine fremde Sicherung mit `liveTakeover` könnte, von einem Trainer eingespielt, ein laufendes Spiel übernehmen. Das setzt voraus, dass ein Schlüsselinhaber eine fremde Datei importiert (wie schon vorher bei offenen Spielen); beim Handywechsel (FR-L21) muss der Zähler erhalten bleiben.

## R-L17 Live-Spieltag verwalten (US5, 05.11.2026)

- **Decision**: Jedes Trainer-Handy (mit Organisator-Schlüssel) signiert Änderungen selbst: Titel, Mannschaft hinzufügen oder entfernen erzeugen eine neue Konfiguration mit `iat` = max(jetzt, bekanntes `iat` + 1) und gehen sofort als Meldung nur mit `g` hinaus. Die Konfiguration trägt seit US5 die Mannschaften mit Name und Trikots (`m`, contracts/live-message.md).
- **Übernahme auf anderen Trainer-Handys**: Jeder Empfänger eines gekoppelten Handys (Neues Spiel, Spielbildschirm, Dashboard in der App, Übersicht "Live-Spieltag") meldet eine jüngere, mit dem Organisator-Schlüssel geprüfte Konfiguration. Das Handy übernimmt sie nacheinander (nie zwei Übernahmen gleichzeitig): neue Mannschaften bekommen ein eigenes Zertifikat und einen Eintrag in "Meine Mannschaften", entfernte fallen weg, der Sender wird aktualisiert. Hat das Handy inzwischen einen anderen Live-Spieltag (Topic oder Organisator-Schlüssel anders), bleibt alles, wie es ist.
- **Neu ausstellen (Variante C, Atti 05.11.2026)**: neues Topic, neuer Zuschauer- und Organisator-Schlüssel, neue Zertifikate, gleicher Titel und gleiche Mannschaften. Auf dem alten Topic geht genau eine Konfiguration mit `retired: true` hinaus (alter Organisator-Schlüssel), ohne die neuen Links: Wer den alten Trainer-Link unrechtmäßig hat, erfährt nur, dass neu ausgestellt wurde. Alte Trainer-Handys übernehmen sie wie jede jüngere Konfiguration, senden danach nichts mehr und bitten um den neuen Trainer-Link; alte Dashboards bitten um den neuen Zuschauer-Link. Ein Inhaber des alten Trainer-Links könnte einen solchen Hinweis auch fälschen und so alle Handys anhalten; mit diesem Schlüssel kann er ohnehin falsche Stände und Konfigurationen senden, Abhilfe ist dasselbe Neuausstellen. Verworfen: still weitersenden (unbemerkt ins Leere) und automatisch umziehen (verrät die neuen Links).
- **Kopplung beenden**: Der Live-Spieltag wird auf dem Handy gelöscht, der Sender hält an; Spiele bleiben unverändert, es geht kein "off" hinaus.
- **Sicherung (FR-L21, Atti 05.11.2026: immer mitsichern)**: Die Sicherung enthält den Live-Spieltag mit allen Schlüsseln; anders als bisher (R-L14) steht damit der Organisator-Schlüssel in der Datei. Sie enthält ohnehin Kader und Torschützen mit Vornamen, gehört also nicht in Gruppen; Hinweis in den Einstellungen: nur für sich aufbewahren. Gerät sie in falsche Hände: "Alle Links neu ausstellen". Wiederherstellen übernimmt den Live-Spieltag nur ohne eigenen und prüft Signatur der Konfiguration und Organisator-Schlüssel. Verworfen: Nachfrage bei jedem Sichern (wird weggeklickt) und nie mitsichern (nach Datenverlust bräuchte ein einzelner Trainer neue Links für alle).
- **Alternatives**: Änderungen nur vom anlegenden Handy (widerspricht der gleichberechtigten Trainergruppe, R-L13); neue Mannschaften nur über einen neuen Trainer-Link (mehr Links in der Gruppe, Atti wollte einen Link je Saison); Sicherung ohne Schlüssel (Handywechsel bräuchte neue Links).

## R-L18 Sicherheitsreview US5 (05.11.2026)

- Ergebnis: keine Schwachstelle mit Konfidenz ≥ 8. Geprüft: Übernahme nur mit der eigenen Organisator-Prüfung (Topic und Schlüssel), Hinweis "neu ausgestellt" ohne neue Links, keine privaten Schlüssel in Meldungen, Wiederherstellen überschreibt keinen vorhandenen Live-Spieltag, strenge Prüfung der Sicherung, XSS.
- Gehärtet (Konfidenz 7): Eine fremde, präparierte Sicherung hätte ein Handy ohne Live-Spieltag ohne Rückfrage an einen fremden Live-Spieltag koppeln können (Signaturen in der Datei beweisen nur, dass sie zueinander passen). Jetzt fragt die App wie beim Koppeln per Link nach (Titel, Mannschaften, "nur übernehmen, wenn die Sicherung von dir stammt"); die Anlegezeit ist mindestens der Zeitpunkt des Wiederherstellens (R-L11).
- Gehärtet (Konfidenz 6): "Neu ausgestellt" ist endgültig. Ein so markiertes Handy übernimmt keine weitere Konfiguration mehr (auch nicht vom alten Trainer-Link), und der Hinweis gilt auch, wenn die Uhr des Handys vorging.

## R-L19 Gerätetest Live-Spieltag (06.11.2026)

- **Aufbau**: A iPhone 17 Pro (legt den Spieltag „Test“ an, überträgt E1), B iPhone 16e (zweiter Trainer, Trainer-Link per Nachricht), C und D je ein Rechner im Browser (Zuschauer). Kein Android-Gerät.
- **Ergebnis**: G-1, G-2, G-4, G-5, G-7, G-8 und G-9 bestanden; G-3 bereits am 06.11.2026 bestanden (R-L6). Damit sind SC-L05 und SC-L07 auf dem iPhone bestätigt: Tor auf dem Dashboard nach höchstens 10 s, Funkloch ohne Verzögerung der Erfassung, Spiel übernehmen mit Stand, Uhr und Torschützen.
- **G-2, Befund (Atti)**: Den Trainer-Link aus der Nachricht herauszukopieren war mühsam. Das Einfügen selbst klappt. Weiter in Roadmap B1 und B2 (ein Link für alles, „Link einfügen“ auf dem Startbildschirm); hier keine Änderung.
- **Offen (L063)**: G-6 (Handy-Uhr 5 Minuten verstellt) ausgelassen. Restrisiko gering: Das Dashboard rechnet mit der Serverzeit des Dienstes (`skew`, R-L4), und `tests/unit/live-board.test.ts` prüft ein Lead-Handy, dessen Uhr 63 Minuten vorgeht. G-10 (Links neu ausstellen) optional und offen; durch E2E 006 US5-S3 abgedeckt.

## R-L20 Kurzer Trainer-Link und Home-Bildschirm (06.11.2026)

- **Befund**: WhatsApp auf dem iPhone macht vom Trainer-Link (rund 1.450 Zeichen) nur den Anfang bis `#/trainer/` antippbar. Der Torticker öffnet sich ohne Link-Daten; Kopieren geht nur mit dem ganzen Nachrichtentext. Eine feste Längengrenze von WhatsApp ist nicht dokumentiert; Berichte nennen lange und umbrechende Adressen als Ursache. Der Zuschauer-Link (rund 260 Zeichen) ist im Gerätetest per iMessage angekommen.
- **Decision**: Kurzes Byte-Format (contracts/live-link.md): Schlüssel roh statt base64url in JSON, vom privaten Organisator-Schlüssel nur `d` (x und y stecken im öffentlichen Schlüssel), Konfiguration ohne Signatur und ohne doppelte Kodierung. Rund 380 statt 1.450 Zeichen. Teilen-Text kurz, Link in eigener Zeile.
- **Sicherheit**: Gleichwertig. Die Signatur der Konfiguration im Link schützte nie mehr als der private Organisator-Schlüssel, der mitreist; das Handy signiert die Konfiguration beim Prüfen selbst. Geprüft wird weiter, dass der Schlüssel zu `orgPub` gehört (`keyMatches`). Die Schlüssel bleiben im Fragment (Constitution II).
- **Home-Bildschirm**: Wie beim Zuschauer-Link (R-L6) nennt das Manifest auf der Seite des Trainer-Links den Trainer-Link als Startadresse (`pointManifestTo`, nur im Browser und solange gekoppelt werden kann). `main.tsx` setzt auf dieser Seite nicht vorab das App-Manifest, weil Safari nur den ersten Verweis liest. Das Symbol startet mit dem Trainer-Link, hat eigene leere Daten und koppelt mit "Koppeln und loslegen"; danach leitet der Link wie ein Startknopf zum Startbildschirm (Spec 012 FR-S06). Der private Schlüssel steht damit auch in der Startadresse des Symbols auf dem eigenen Handy; das ist nicht mehr als in der Datenbank der App.
- **Grenzen**: Trainer mit bereits installiertem Torticker kopieren den Link weiter und fügen ihn ein, oder sie löschen das alte Symbol (eigene Spiele gehen dabei verloren) und legen es über den Trainer-Link neu an. Ob WhatsApp 380 Zeichen ganz antippbar macht, prüft Atti am Gerät (tasks.md L065).
- **Alternatives**: URL-Kürzer (sähe die Schlüssel, Constitution II); Link-Daten beim Vermittlungsdienst ablegen (ntfy.sh hält Meldungen nur rund 12 Stunden); Kompression (zufällige Schlüssel lassen sich nicht komprimieren).

