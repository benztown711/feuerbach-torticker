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
