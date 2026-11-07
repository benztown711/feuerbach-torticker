# Vertrag: Eigener Vermittlungsdienst (Spec 007)

Ersetzt den Transport aus `specs/006-live-spieltag/contracts/live-message.md` (Abschnitt "Transport"). Meldungstext (`t1.…`), Umschlag und Inhalte bleiben unverändert, ebenso die Plan-Meldung (`specs/015-spielplan/contracts/plan-message.md`).

Basis: `VITE_RELAY_ORIGIN`, z. B. `https://torticker-relay.<Konto>.workers.dev`. Objektpfad `P` = `/v1/<topic>/<orgPub>` (topic 22 Zeichen base64url, orgPub 87 Zeichen base64url).

## Senden: `POST P`

```json
{ "kind": "game", "slot": "…22…", "group": "…22…", "h": 0, "at": 1794040880000, "gone": false,
  "body": "t1.…", "sig": "…86…", "cert": { "d": "…", "s": "…" } }
```

| Feld | `game` | `cfg` | `plan` | `retire` |
|---|---|---|---|---|
| `slot`, `group` | Pflicht | – | – | – |
| `h` (0–100), `at` (ms) | Pflicht | – | – | – |
| `gone` | Pflicht | – | – | – |
| `iat` (ms) | – | Pflicht | – | – |
| `cert` | Pflicht (Lead-Zertifikat, vom Organisator signiert) | – | – | – |
| `sig` | Lead-Schlüssel aus `cert` | Organisator-Schlüssel | Organisator-Schlüssel | Organisator-Schlüssel |
| `body` | Pflicht, ≤ 4.000 Zeichen | Pflicht | Pflicht | Pflicht |

Signierter Text (UTF-8, ECDSA P-256, SHA-256, P1363, base64url):

```text
torticker-relay-v1|<topic>.<orgPub>|<kind>|<slot>|<group>|<h>|<at>|<iat>|<gone 0/1>|<base64url(SHA-256(body))>
```

Fehlende Felder als leere Zeichenkette. Antworten: `200 {"seq":n}`, `204` (älter, nichts geändert), `400`, `403`, `409` (neu ausgestellt), `413`, sonst wie ohne Netz.

## Empfangen: WebSocket `GET P/ws?since=<seq>`

- Server → Client, sofort: `{"t":"hello","time":<Serverzeit s>,"msgs":[{"seq":n,"time":<s>,"body":"t1.…"}]}`, alle Zeilen mit `seq` > `since` in `seq`-Reihenfolge (ohne `since`: alle).
- Server → Client, je angenommenem Schreiben: `{"t":"msg","seq":n,"time":<s>,"body":"t1.…"}`.
- Zeiten auf der Leitung in Sekunden (wie bisher bei ntfy.sh); der Dienst speichert Millisekunden und rundet ab.
- Client → Server: `ping` alle 30 s; Antwort `pong` (Auto-Antwort). Andere Nachrichten des Clients werden ignoriert.
- Der Client prüft jede Meldung wie bisher (entschlüsseln, Signaturen, `parseSnapshot`); der Dienst garantiert nichts über den Inhalt.

## CORS und Sicherheit

- `Access-Control-Allow-Origin` nur für `https://benztown711.github.io` (lokal mit `wrangler dev` zusätzlich über `.dev.vars`); WebSocket prüft `Origin` ebenso. E2E-Tests nutzen den Nachbau, nicht den Dienst.
- Keine Cookies, keine Konten, keine Klartext-Logs.
