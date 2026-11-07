# Contract: Kader-Meldung (Spec 016)

## Schreibanfrage an den Dienst (Erweiterung von Spec 007 contracts/relay-api.md)

```json
{ "kind": "squad", "slot": "<22 Zeichen base64url>", "at": 1762500000000, "gone": false, "body": "t1.<…>", "sig": "<86 Zeichen>" }
```

- `slot` = HMAC-SHA-256 mit dem `slot`-Schlüssel (R-N3) über `["squad", sid]`, 128 Bit, base64url.
- `at` = größter Zeitstempel im Inhalt (ms), ganze Zahl > 0.
- `gone` = true: Kader wird nicht mehr geteilt (FR-B11).
- Zu signierender Text: `torticker-relay-v1|<name>|squad|<slot>|||<at>||<gone 1/0>|<sha256(body)>` (Felder wie bei `game`, ohne `group`, `h` und `iat`), signiert mit dem Organisator-Schlüssel.
- Antworten wie bei `game`: `200 {seq}`, `204` älter, `400`, `403`, `409` nach `retire`, `413` mehr als 6 geteilte Kader.

## Inhalt (`body`)

`t1.` + base64url(IV 12 Byte ‖ AES-GCM-256(deflate-raw(JSON))) mit dem Kader-Schlüssel (R-B2):

```json
{ "v": 1, "s": "a1b2c3d4", "n": "E3", "na": 1762500000000, "sh": 1,
  "t": [["E3", 1762500000000]],
  "k": [["k7f3a9c1", "Paul", 4, 0, 1762500000000], ["k2d8e0f4", "Maxi", 8, 0, 1762490000000]] }
```

- `s`, Kinder-`sid`: 1 bis 64 Zeichen `[A-Za-z0-9_-]` (lokale Kennungen sind UUIDs).
- `n`: 1 bis 20 Zeichen (Spec 015 `MAX_SQUAD_NAME`); Kindername wie im Kader (Spec 001 `MAX_NAME`); Nummer 0 bis 99 oder null.
- `t`: Mannschaften des Live-Spieltags mit diesem Kader (Kurzlabel wie in der Konfiguration), höchstens 6.
- `k`: höchstens 100 Kinder.
- Unbekannte Felder werden ignoriert; ungültige Meldungen verworfen.
