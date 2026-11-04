# Quickstart: Live-Spieltag prüfen (Spec 006)

## Automatisch (wie in der CI)

```bash
npm ci
npm run lint && npm run typecheck && npm run test:cov
npm run build && npm run budget && npm run contrast
npm run e2e -- --grep "006 "
```

Erwartung: alle Tests grün; `src/domain/live-*.ts` mit 100 % Branch-Coverage; Hauptbundle < 60 KB gzip; E2E ohne echten Dienst (Fixture `relay`, research.md R-L8); der Netzwerk-Wächter meldet nichts außer `ntfy.sh` in Kopplungstests.

## Gerätetest (Atti, Review C)

Voraussetzung: zwei Handys mit installiertem Torticker (A = Organisator, B = Lead), ein drittes Gerät im Browser (C = Zuschauer).

| Nr. | Schritt | Erwartung |
|---|---|---|
| G-1 | A: Mehr → Live-Spieltag → anlegen mit E1, E2; "Dieses Handy sendet für E1"; Lead-Link E2 per WhatsApp an B | Übersicht mit Zuschauer-Link und Lead-Link E2 |
| G-2 | B: Link in WhatsApp antippen | Safari zeigt die Anleitung; "Link kopieren"; im Torticker unter Mehr → Live-Spieltag einfügen, "Ja, live senden" |
| G-3 | C: Zuschauer-Link öffnen, "Zum Home-Bildschirm", danach über das Symbol starten | Dashboard erscheint (sonst R-L6: Hinweis auf Lesezeichen) |
| G-4 | A und B je ein Spiel anlegen und anpfeifen, Tore erfassen | C zeigt beide Spiele, Tor nach höchstens 10 s, Minute läuft |
| G-5 | B: Flugmodus, Tor erfassen, Flugmodus aus | Erfassung sofort; B zeigt "Live: wartet auf Netz"; C bekommt das Tor nach dem Einschalten |
| G-6 | A: Uhr am Handy 5 Minuten verstellen | Minute auf C weicht höchstens 1 Minute ab |
| G-7 | B im Spiel: Zeile mit E1 sichtbar, Tipp öffnet Dashboard, "Spiel" führt zurück | Uhr läuft weiter, iPhone SE ohne Scrollen |
