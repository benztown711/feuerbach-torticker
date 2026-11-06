# Contract: Plan-Meldung

Erweitert `specs/006-live-spieltag/contracts/live-message.md`. Transport, Verschlüsselung und Kompression sind unverändert (`"t1." + base64url(IV ‖ AES-GCM(deflate-raw(JSON)))`, höchstens 3.800 Zeichen).

## Umschlag

```json
{ "p": { "d": "<JSON-Text der Nutzlast>", "s": "<ECDSA-P256-Signatur über d mit dem Organisator-Schlüssel>" } }
```

- `p` steht allein in der Meldung (keine `m`, `c`, `g`).
- `d` höchstens 3.000 Zeichen; Empfänger verwerfen längere.
- Prüfung: Signatur mit `orgPub` des Zuschauer-Links; ungültig → Meldung ohne Wirkung. Alte Clients ignorieren `p`.

## Nutzlast

```json
{ "v": 1, "e": [ { "i": "k3F9a2Qx", "k": "E1", "d": "2026-11-14", "t": "12:00", "h": 1, "o": "TSV Musterstadt", "w": "Kreisstaffel", "z": [2, 25], "u": 1794652800000 } ] }
```

| Schlüssel | Feld | Pflicht | Regeln |
|---|---|---|---|
| `i` | id | ja | 1 bis 12 Zeichen base64url |
| `k` | team | ja | 1 bis 20 Zeichen |
| `d` | date | ja | `JJJJ-MM-TT` |
| `t` | time | nein | `HH:MM` |
| `h` | venue | ja | 1 = Heim, 0 = Auswärts |
| `o` | opponent | nein | bis 40 Zeichen |
| `w` | competition | nein | bis 40 Zeichen |
| `z` | schema | nein | `[Abschnitte 1..4, Minuten 1..60]` |
| `c` | cancelled | nein | 1 = abgesagt |
| `x` | deleted | nein | 1 = gelöscht; dann zählen nur `i`, `k`, `d`, `u` |
| `u` | updatedAt | ja | ganze Zahl > 0 |

- `e` enthält 1 bis 100 Einträge; ein ungültiger Eintrag verwirft die ganze Meldung.
- Spätere Stories ergänzen `g` (gameId, US2), `s` (Endstand, US3) und `b` (Vormerkung, US6); bis dahin werden unbekannte Schlüssel ignoriert.

## Senden

- Änderung: eine Meldung mit den geänderten Einträgen.
- Erneut senden (FR-P07): alle Einträge inklusive Grabsteinen, gestückelt, sodass jedes `d` ≤ 3.000 Zeichen bleibt.
