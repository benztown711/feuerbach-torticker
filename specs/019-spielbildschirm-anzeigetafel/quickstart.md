# Quickstart: Spielbildschirm mit Anzeigetafel und sicherem Rückgängig

## Prüfen (lokal, Cloud-Container)

```bash
export PW_CHROMIUM_PATH=/opt/pw-browsers/chromium
npm run check
npx playwright test tests/e2e/spielbildschirm-us1.spec.ts tests/e2e/spielbildschirm-us2.spec.ts tests/e2e/spielbildschirm-us3.spec.ts
npx playwright test tests/e2e/us1-tor-erfassen.spec.ts tests/e2e/us2-layout-se.spec.ts tests/e2e/karten-wechsel.spec.ts tests/e2e/ereignisse.spec.ts tests/e2e/spiel-korrigieren.spec.ts tests/e2e/us4-teilen.spec.ts tests/e2e/live-us6.spec.ts tests/e2e/a11y.spec.ts
```

## Von Hand (iPhone, hell und dunkel)

1. Spiel anlegen, vor dem Anpfiff: Doppelpfeil unter "0 : 0" tauscht Heim und Gast.
2. Anpfiff: "Uhr anhalten" und "Pausenpfiff" sind große Knöpfe, kein Griff über der Torliste.
3. "TOR" tippen: dunkles Band "Tor … erfasst" direkt über den Tor-Knöpfen, "Rückgängig" groß; antippen nimmt das Tor zurück.
4. Zweimal schnell "TOR": im selben Band "Schon gezählt", nur ein Tor.
5. Mit "Karte" und "Lesezeichen" eingeschaltet auf dem iPhone SE: kein Seiten-Scroll, mindestens zwei Torzeilen sichtbar.
6. Spielstand "2 : 1" groß zwischen den Namen, Uhr darunter kleiner in derselben Schrift.

## Erwartung

- Alle Tests mit "019" im Namen grün, bestehende Tests unverändert grün (außer dem ersetzten Griff-Teil in `karten-wechsel.spec.ts`).
- Kontrastmatrix (`npm run contrast`) enthält die Band-Paare und ist grün.
- Neue Referenzbilder des Spielbildschirms aus der CI eingecheckt.
