# Quickstart: Eigener Dienst prüfen (Spec 007)

## Lokal (ohne Cloudflare-Konto)

1. `cd relay && npm ci && npm test`: Worker und Durable Object in `workerd` (Annehmen, Ablehnen, Ordnung, Broadcast, `since`, Alarm, `retire`).
2. `npm run check` im Hauptprojekt: Domäne `relay-protocol.ts` mit 100 % Branch-Coverage.
3. `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test tests/e2e/dienst-*.spec.ts`: Szenarien 007 US1 bis US3 gegen den Nachbau.
4. Optional: `cd relay && npx wrangler dev`, App mit `VITE_RELAY_ORIGIN=http://localhost:8787 npm run dev`, zwei Browserfenster (Trainer, Zuschauer).

## Nach dem Ausliefern (Atti, Gerätetest)

| Nr | Schritt | Erwartung |
|---|---|---|
| D-1 | Zuschauer-Link auf einem Handy öffnen, das ihn noch nie hatte | Spiele des Tages und letzte Ergebnisse innerhalb von 5 s (US1-S1, US1-S2) |
| D-2 | Spiel am Vorabend anlegen, Torticker bis zum nächsten Morgen nicht öffnen, dann auf einem neuen Gerät den Zuschauer-Link | Karte "noch nicht angepfiffen" (US1-S1) |
| D-3 | Dashboard im Browser und als Home-Bildschirm-Symbol | gleiche Spiele (US1-S3) |
| D-4 | Tor erfassen, mehrere Zuschauer im selben WLAN | Tor überall in 10 s (US1-S4) |
| D-5 | Flugmodus am Trainer-Handy, Tor, Flugmodus aus | Tor kommt nach; Erfassung nie verzögert (US1-S5) |
| D-6 | Spielplan auf Handy A ändern, Handy B erst Tage später öffnen | Änderung da (US2-S1) |
| D-7 | Block "Letzte Spiele" aufklappen, Filter wechseln | wie Mockup (US3) |
| D-8 | Cloudflare-Dashboard: Anfragen und Zeilen des Tages | weit unter den Grenzen (SC-N04) |
