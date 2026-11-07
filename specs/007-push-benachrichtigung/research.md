# Research: Eigener Dienst für den Live-Spieltag (Spec 007)

Nummern R-N1 ff. Grundlagen des Live-Spieltags (Verschlüsselung, Meldungsformat, Tageslogik) stehen in `specs/006-live-spieltag/research.md`. Weitere Entscheidungen (Schreibberechtigung, Kennungen, Protokoll) folgen mit `/speckit-plan` nach Review A.

## R-N1 Cloudflare Gratis-Plan (geprüft am 07.11.2026)

- **Quellen**: developers.cloudflare.com, Seiten "Durable Objects Pricing" (Stand 18.10.2026), "Durable Objects Limits" (07.11.2026), "Workers Limits" (29.10.2026), "Workers Pricing" (02.10.2026).
- **Grenzen im Gratis-Plan**: Workers 100.000 Anfragen am Tag, 10 ms CPU je Anfrage; Durable Objects 100.000 Anfragen am Tag (eine WebSocket-Verbindung kostet eine Anfrage, ausgehende Nachrichten sind frei, eingehende zählen 20:1), 13.000 GB-s Laufzeit am Tag (ruhende Objekte mit WebSocket-Hibernation kosten keine Laufzeit), SQLite: 5 Mio. gelesene und 100.000 geschriebene Zeilen am Tag, 5 GB Speicher je Konto. Tagesgrenzen gelten bis Mitternacht UTC.
- **Überschreiten**: "further operations of that type will fail with an error"; Workers antworten mit Fehler 1027. Eine Abrechnung gibt es nur im Bezahl-Plan (ab 5 USD im Monat); er wird nicht gebucht.
- **Offen für den Plan**: CPU-Budget eines Durable Objects im Gratis-Plan je Nachricht (10 ms oder 30 s; in einem Test messen), Grenze je Objekt (1 GB laut FAQ, 10 GB laut Tabelle; für uns ohne Belang), ob für den Gratis-Plan ein Zahlungsmittel hinterlegt sein muss (in den Seiten nicht genannt; Atti hat bereits ein Konto).
- **Mengengerüst** (Spieltag mit drei Mannschaften, 120 Zuschauer): Meldungen der Trainer-Handys rund 150 am Tag (Spec 006 R-L3) plus Spielplan und Konfiguration; Verbindungen der Zuschauer: 120 × rund 20 Neuverbindungen (iOS trennt im Hintergrund) = 2.400 Anfragen; zusammen unter 5.000 Anfragen und unter 1.000 geschriebenen Zeilen am Tag, also unter 5 % der Grenzen. Speicher: 3 Mannschaften × 10 Spiele × 4 KB plus Plan und Konfiguration, unter 1 MB je Live-Spieltag.
- **Folgerung**: Ein Durable Object je Live-Spieltag (Topic) mit SQLite-Speicher und WebSocket-Hibernation; Abfragen im Sekundentakt wären zu teuer (120 Zuschauer alle 5 s = über 2 Mio. Anfragen am Tag) und scheiden aus.
