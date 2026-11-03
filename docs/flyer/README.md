# Flyer für Testerinnen und Tester

![Flyer](flyer.png)

Ein Bild im Handyformat (1080 px breit) für die Trainergruppe in WhatsApp, zum Weiterleiten an interessierte Eltern. Inhalt: Slogan, Problem, Zweck, drei echte Bildschirme der App (fiktive Namen), Aufruf zum Mittesten.

## So in WhatsApp verschicken

In einem Bild ist nichts anklickbar. Den Link deshalb immer als Text senden:

1. **Nachricht 1: Text mit Link** (unten). WhatsApp zeigt darüber eine Vorschau-Karte mit dem Bild `public/link-vorschau.png`; Antippen öffnet direkt die App (FR-043).
2. **Nachricht 2: Flyer-Bild** (optional, für Details), mit "HD" senden.

Beim Weiterleiten beide Nachrichten markieren. Wer nur eine Nachricht will: Flyer-Bild senden und den Text als Bildunterschrift dazuschreiben; der Link ist dann ebenfalls anklickbar, aber ohne Vorschau-Karte.

Der Text wiederholt nichts aus Flyer und Link-Karte (Funktionen, Installation, Datenschutz, Fragen fürs Feedback); er ergänzt nur Absender, Termin, Link, einen Tipp und den Weg für Rückmeldungen.

```text
Hallo zusammen,
für den Spielfeldrand habe ich eine kleine App gebaut, den *Torticker*. Wer Lust hat, testet sie am Wochenende (7./8.11.) beim Spiel:
https://benztown711.github.io/feuerbach-torticker/

Was sie kann und wie man sie installiert, steht im Flyer. Ein Tipp vorab: App während des Spiels offen lassen, nur dann kommt der Pfiff zur Halbzeit.

Rückmeldung gern direkt an mich, auch als Sprachnachricht. Und gern an interessierte Eltern weiterleiten.
```

WhatsApp merkt sich eine Vorschau pro Link. Wurde der Link vor dem Deploy des Vorschaubilds schon einmal gesendet, kann auf diesem Handy noch die alte Vorschau ohne Bild erscheinen.

## Neu erzeugen

Nach Änderungen an der App, am Flyer (`flyer.html`) oder an der Link-Vorschau (`link-vorschau.html`):

```bash
npm run build && npm run flyer && npm run build
```

Das Skript `scripts/flyer.ts` startet die gebaute App, spielt ein Beispielspiel mit fiktiven Namen durch, speichert die Bildschirme nach `screens/`, rendert `flyer.html` als `flyer.png` und `link-vorschau.html` als `public/link-vorschau.png`. Der zweite Build übernimmt das Vorschaubild nach `dist/`. Mit `--nur-flyer` werden nur die beiden Bilder neu gerendert. Im Cloud-Container vorher `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` setzen.

Farben, Schriften und Logos kommen aus `design/` (über `src/styles/tokens.css`).
