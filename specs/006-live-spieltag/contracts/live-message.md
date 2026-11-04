# Vertrag: Meldungen über ntfy.sh (Spec 006)

## Transport (research.md R-L1, R-L2)

- Senden: `POST https://ntfy.sh/<topic>`, Rumpf = Meldungstext (keine weiteren Header).
- Empfangen: `GET https://ntfy.sh/<topic>/json?since=<ID|12h>` (Stream, eine JSON-Zeile je Ereignis: `open`, `keepalive`, `message`); Rückfall `…&poll=1` alle 30 s nach Antwort 429.
- Meldungstext: `t1.` + base64url( IV (12 Byte) ‖ AES-GCM( deflate-raw( UTF-8 JSON Umschlag ) ) ), höchstens 3.800 Zeichen.

## Umschlag

```json
{ "m": "<JSON-Text des Inhalts>", "s": "<ECDSA-Signatur über m>", "c": { "d": "…", "s": "…" }, "g": { "d": "…", "s": "…" } }
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `m` | bei Live-Stand | Inhalt als JSON-Text (signiert wird genau dieser Text) |
| `s` | bei Live-Stand | Signatur über `m` mit dem Lead-Schlüssel aus `c` |
| `c` | bei Live-Stand | Lead-Zertifikat, signiert vom Organisator |
| `g` | nein | jüngste bekannte Konfiguration, signiert vom Organisator; eine Konfigurationsmeldung besteht nur aus `g` |

Signaturen: ECDSA P-256 mit SHA-256, IEEE-P1363-Format (64 Byte), base64url.

Prüfreihenfolge beim Empfänger: entschlüsseln → entpacken → JSON → `g` prüfen (falls vorhanden; ungültig = nur `g` verwerfen) → falls `m`: `c` mit Organisator-Schlüssel prüfen → `s` mit `c.pub` prüfen → `m` mit `parseSnapshot` prüfen → `m.team` = `c.key`. Jeder Fehler: Live-Stand verwerfen, nichts anzeigen.

## Inhalt "Live-Stand" (`kind: "game"`, FR-L06, FR-L10)

```json
{
  "v": 1, "kind": "game", "state": "live",
  "gameId": "9b2…", "team": "E1", "sentAt": 1794040880000, "createdAt": 1794038400000,
  "own": "Feuerbach E1", "opp": "TSV Musterstadt", "venue": "home",
  "ownColor": "rot", "oppColor": "schwarz",
  "schema": { "sections": 2, "sectionMinutes": 25 },
  "clock": [["kickoff", 1794038400000, 1], ["sectionEnd", 1794039900000, 1], ["kickoff", 1794040200000, 2]],
  "goals": [{ "side": "own", "minute": 6, "stoppage": null, "section": 1, "who": "Max", "penalty": false, "ownGoal": false }],
  "shootout": null, "drawSettled": false
}
```

| Feld | Regel |
|---|---|
| `state` | `live`; `off` = "Nicht live senden" (FR-L09); `deleted` = Spiel gelöscht (US2-S7). Bei `off`/`deleted` reichen `gameId`, `team`, `sentAt`. |
| `own`, `opp` | Kurzform der eigenen Mannschaft (`shortTeamName`), Gegner; je 1 bis 40 Zeichen |
| `venue` | `home` \| `away` |
| `ownColor`, `oppColor` | Paletten-ID aus `design/trikot-farben.json`, sonst verworfen |
| `schema` | wie `Schema` (1 bis 4 Abschnitte, 1 bis 60 Minuten, Verlängerung optional) |
| `clock` | höchstens 50 Uhr-Ereignisse `[Typ, Zeit, Abschnitt]` |
| `goals` | nur nicht entfernte Tore, höchstens 200; `who` = Anzeigename des Kaderspielers bzw. Freitext beim Gegner, sonst `null`, höchstens 40 Zeichen; `ownGoal` für "Eigentor Gegner" |
| `shootout` | `null` oder `{ first, done, shots: [[Seite, Treffer, Name\|null]] }`, höchstens 100 Schüsse |

Nie enthalten: Kader, Aufgebot, Karten, Wechsel, Lesezeichen, Nachnamen.

## Konfiguration (`g.d`, FR-L19)

```json
{ "title": "Unser Spieltag", "teams": ["E1", "E2"], "iat": 1794038000000 }
```

Der Organisator sendet bei jeder Änderung eine Meldung nur mit `g`; Lead-Handys hängen die jüngste ihnen bekannte an jeden Live-Stand. Es gilt die gültige Konfiguration mit dem größten `iat`. Live-Stände von Mannschaften, die nicht in `teams` stehen, zeigt das Dashboard nicht an. Titel 1 bis 40 Zeichen, 1 bis 6 Mannschaften.

## Zertifikat (`c.d`)

```json
{ "key": "E2", "name": "Sportvg Feuerbach E2", "homeColor": "rot", "awayColor": "schwarz", "pub": "<87 Zeichen>", "iat": 1794038000000 }
```
