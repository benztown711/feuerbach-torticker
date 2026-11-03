# Flyer für Testerinnen und Tester

![Flyer](flyer.png)

Ein Bild im Handyformat (1080 px breit) für die Trainergruppe in WhatsApp, zum Weiterleiten an interessierte Eltern. Inhalt: Slogan, Problem, Zweck, drei echte Bildschirme der App (fiktive Namen), Aufruf zum Mittesten.

## So in WhatsApp verschicken

In einem Bild ist nichts anklickbar. Den Link deshalb immer als Text senden:

1. **Nachricht 1: Text mit Link** (unten). WhatsApp zeigt darüber eine Vorschau-Karte mit dem Bild `public/link-vorschau.png`; Antippen öffnet direkt die App (FR-043).
2. **Nachricht 2: Flyer-Bild** (optional, für Details), mit "HD" senden.

Beim Weiterleiten beide Nachrichten markieren. Wer nur eine Nachricht will: Flyer-Bild senden und den Text als Bildunterschrift dazuschreiben; der Link ist dann ebenfalls anklickbar, aber ohne Vorschau-Karte.

```text
Hallo zusammen,
für den Spielfeldrand gibt es jetzt den *Torticker*: ein Tap pro Tor, die Uhr läuft mit und pfeift zur Halbzeit. Nach dem Abpfiff ist der Spielbericht für die Elterngruppe fertig.

Wer Lust hat, testet am Wochenende (7./8.11.) beim Spiel mit:
https://benztown711.github.io/feuerbach-torticker/

iPhone: Link in Safari öffnen → Teilen → „Zum Home-Bildschirm“
Android: Link in Chrome öffnen → Menü → „App installieren“
Tipp: App während des Spiels offen lassen, dann kommt der Pfiff.

Kostenlos, ohne Anmeldung, ohne Werbung. Alle Daten bleiben auf eurem Handy.
Gerne an interessierte Eltern weiterleiten. Rückmeldung an mich: Was hat gefehlt, was hat gestört?
```

WhatsApp merkt sich eine Vorschau pro Link. Wurde der Link vor dem Deploy des Vorschaubilds schon einmal gesendet, kann auf diesem Handy noch die alte Vorschau ohne Bild erscheinen.

## Neu erzeugen

Nach Änderungen an der App, am Flyer (`flyer.html`) oder an der Link-Vorschau (`link-vorschau.html`):

```bash
npm run build && npm run flyer && npm run build
```

Das Skript `scripts/flyer.ts` startet die gebaute App, spielt ein Beispielspiel mit fiktiven Namen durch, speichert die Bildschirme nach `screens/`, rendert `flyer.html` als `flyer.png` und `link-vorschau.html` als `public/link-vorschau.png`. Der zweite Build übernimmt das Vorschaubild nach `dist/`. Mit `--nur-flyer` werden nur die beiden Bilder neu gerendert. Im Cloud-Container vorher `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` setzen.

Farben, Schriften und Logos kommen aus `design/` (über `src/styles/tokens.css`).
