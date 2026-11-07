# Quickstart: Trainer-Paket prüfen (Spec 016)

## Automatisch

- `npm run check` (Domain mit 100 % Branch-Coverage)
- `cd relay && npm test` (Dienst nimmt `squad` an)
- `npx playwright test tests/e2e/trainer-paket-us*.spec.ts`

## Gerätetest mit Atti (nach dem Ausliefern)

- P-1: Atti tippt "Trainer-Link teilen": "Kader mit den Trainern teilen?" mit E1/E2 und E3, beide angekreuzt; "Teilen".
- P-2: Ein schon gekoppeltes Trainer-Handy (nach "Torticker aktualisieren") zeigt unter "Kader" beide Kader mit "Mit Trainern geteilt".
- P-3: Ein neues Handy fügt den Trainer-Link ein: "Geteilte Kader kommen automatisch mit."; nach dem Koppeln "Kader übernommen: …".
- P-4: Auf Handy A ein Kind hinzufügen: Handy B zeigt es in wenigen Sekunden.
- P-5: Zuschauer-Link auf einem dritten Handy: keine Kindernamen außer Torschützen.
