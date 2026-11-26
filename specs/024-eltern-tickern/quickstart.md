# Quickstart: Eltern tickern (Spec 024)

## Lokal prüfen

```bash
npm run check
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test tests/e2e/eltern-tickern.spec.ts
```

Die E2E-Tests nutzen zwei Browser-Kontexte (Eltern P und A bzw. Trainer T) und die Dienst-Attrappe der bestehenden Live-Tests.

## Szenarien (Akzeptanz)

| ID | Ablauf | Erwartung |
|---|---|---|
| 024 US1 | Trainer legt Live-Spieltag mit E2 und Planspiel heute an; P öffnet Zuschauer-Link, "Ich tickere dieses Spiel", Name "Paul", "Los geht's", Anpfiff, Tor | A sieht "Paul tickert bereits" und 1:0 |
| 024 US2 | A klappt Karte auf, "Spiel übernehmen", Name "Anna", "Übernehmen", Tor | P zeigt "Anna tickert jetzt E2.", Dashboard 2:0 "Anna tickert bereits" |
| 024 US3 | Ohne Planspiel: "Spiel fehlt? Selbst tickern", E2, Gegner, "Spiel läuft schon" | Karte E2 mit eingestelltem Stand |
| 024 US4 | Trainer schaltet E2 "Eltern dürfen tickern" aus | P zeigt Hinweis, Dashboard ändert sich nicht mehr, kein Ticker-Knopf |
| 024 US5 | P pfeift ab | Trainer-Startbildschirm fragt "In deine Spiele übernehmen?"; "Übernehmen" legt das Spiel in die Historie |

## Gerätetest (iPhone)

1. Zuschauer-Link aus WhatsApp öffnen, tickern, WhatsApp-Browser schließen, Link erneut öffnen: Karte "Du tickerst", "Weiter tickern" setzt mit dem letzten Stand fort (FR-E14).
2. Zwei Handys gleichzeitig "Los geht's": genau eine Karte (SC-E03).
