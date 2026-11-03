# Quickstart: Spiel erfassen prüfen

## Voraussetzungen

- Node.js 22 LTS, npm
- Für E2E einmalig: `npx playwright install --with-deps webkit chromium`

## Lokal starten

```bash
npm ci
npm run dev          # http://localhost:5173, im WLAN auch vom iPhone erreichbar (--host)
```

## Automatisierte Prüfung (identisch zur CI)

```bash
npm run lint         # ESLint, Stylelint (keine Farbwerte außerhalb tokens.css), Prettier
npm run typecheck
npm run test         # Vitest: domain/*, Komponenten, Kontrast (SC-006)
npm run build        # erzeugt dist/ inkl. Service Worker, Icons, tokens.css
npm run e2e          # Playwright: Projekte iphone (WebKit) und android (Chromium)
npm run lhci         # Lighthouse CI gegen dist/ (SC-005)
```

Erwartung: alles grün. Jeder E2E-Test trägt die FR-/Szenario-ID im Namen, z. B. `US2-S4 FR-005 Tor in Nachspielzeit wird als 25+1' gespeichert`.

## Kern-Szenarien und wo sie geprüft werden

| Szenario | Automatisiert | Datei |
|---|---|---|
| Tor mit einem Tap, Minute korrekt | ja | `tests/e2e/us1-tor-erfassen.spec.ts` |
| Tor-Knöpfe vor Anpfiff gesperrt | ja | `tests/e2e/us1-tor-erfassen.spec.ts` |
| 2 × 25 mit Zeitsprung, Nachspielzeit 25+1' / 50+2' | ja (`page.clock`) | `tests/e2e/us2-uhr.spec.ts`, `tests/unit/minute.test.ts` |
| Signal jede Nachspielminute, kein Doppelsignal nach Neuladen | ja (Signal-Overlay, Audio gemockt) | `tests/e2e/us2-uhr.spec.ts` |
| Sicherheitsabfrage bei Uhr anhalten/Pausenpfiff/Schlusspfiff, Tor bei angehaltener Uhr | ja | `tests/e2e/us2-uhr.spec.ts` |
| Neuladen mitten im Spiel stellt Zustand exakt her | ja | `tests/e2e/us2-uhr.spec.ts` |
| Torschütze aus Kader, Gegner per Freitext | ja | `tests/e2e/us3-torschuetze.spec.ts` |
| Teilen-Text | ja (Unit + E2E mit gemocktem `navigator.share`) | `tests/unit/share-text.test.ts` |
| Historie mit Uhrzeiten, Export/Import | ja | `tests/e2e/us6-historie.spec.ts` |
| Keine externen Requests | ja (Netzwerk-Wächter) | `tests/e2e/fixtures.ts` |
| Offline nach erstem Laden | ja (`context.setOffline(true)`) | `tests/e2e/offline.spec.ts` |
| Screenshot-Vergleich Spielbildschirm (hell/dunkel, Nachspielzeit, Halbzeit) | ja | `tests/e2e/visual.spec.ts` |

## Manuelle Geräteprüfung (vor jedem Release, ca. 10 Minuten)

Auf einem echten iPhone und einem Android-Gerät, App vom Home-Bildschirm gestartet:

1. Spiel 1 × 2 Minuten anlegen, Anpfiff. Bildschirm darf nicht ausgehen (Wake Lock).
2. Bei 00:00: Ton hörbar, Anzeige blinkt; Android vibriert zusätzlich. Nach einer weiteren Minute erneut.
3. Handy 1 Minute sperren, entsperren: Uhr stimmt mit Stoppuhr überein (± 1 s).
4. Flugmodus an, App schließen und neu öffnen: läuft, Spiel ist da.
5. Spiel beenden, teilen in WhatsApp: Text wie in `contracts/share-text.md`.
6. Sicherung exportieren nach iCloud Drive bzw. Dateien, App-Daten löschen, Sicherung importieren: Historie vollständig.
