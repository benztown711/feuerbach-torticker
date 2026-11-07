# Quickstart: Spielplan prüfen

## Automatisch

```bash
npm run check
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test tests/e2e/spielplan-us1.spec.ts
```

Die E2E-Tests nutzen den `FakeRelay` und ein zweites Gerät (`newDevice`), siehe `tests/e2e/fixtures.ts`.

## Gerätetest (zwei Handys mit Trainer-Link)

| Nr | Schritt | Erwartet |
|---|---|---|
| P-1 | Handy A: "Mehr" → "Live-Spieltag" → "Spielplan" → "Spiel hinzufügen", E1, Samstag, 12:00, Gegner, Heim, "Kreisstaffel", Speichern | Spiel steht unter dem Datum |
| P-2 | Handy B: "Spielplan" öffnen | dasselbe Spiel innerhalb von 10 s |
| P-3 | A ändert den Anstoß, B gleichzeitig ein anderes Spiel | beide Änderungen auf beiden Handys |
| P-4 | A: Flugmodus, Spiel hinzufügen; Flugmodus aus, App neu öffnen | B bekommt das Spiel |
| P-5 | A: Spiel "Abgesagt", dann "Wieder ansetzen" | B zeigt "abgesagt" bzw. wieder "frei" |
| P-6 | Handy ohne Kopplung | kein "Spielplan" unter "Live-Spieltag" |
