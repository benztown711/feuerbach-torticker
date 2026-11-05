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
| `goals` | nur nicht entfernte Tore, höchstens 200; `who` = Anzeigename des Kaderspielers bzw. Freitext beim Gegner, sonst `null`, höchstens 40 Zeichen; `ownGoal` für "Eigentor Gegner"; `assist` (Spec 009, optional) = Anzeigename des Vorlagengebers, 1 bis 40 Zeichen, fehlt ohne Vorlage (`null` wird beim Einlesen wie "fehlt" behandelt). Ältere Dashboards übergehen das Feld. |
| `shootout` | `null` oder `{ first, done, shots: [[Seite, Treffer, Name\|null]] }`, höchstens 100 Schüsse |

Nie enthalten: Kader, Aufgebot, Karten, Wechsel, Lesezeichen, Nachnamen.

### Übergabezähler `h` (US6, FR-L23)

Live-Stand und Grabstein dürfen `"h": <0 bis 100>` enthalten (fehlt = 0). Je Spiel gilt der Stand mit dem größten `h`, bei gleichem `h` der mit dem größten `sentAt`. Übernimmt ein anderes Trainer-Handy ein Spiel, sendet es mit `h + 1`; spätere Meldungen des alten Handys (kleineres `h`) ändern das Dashboard nicht.

## Konfiguration (`g.d`, FR-L19)

```json
{
  "title": "Unser Spieltag", "teams": ["E1", "E2"], "iat": 1794038000000,
  "m": [["E1", "Sportvg Feuerbach E1", "rot", "schwarz"], ["E2", "Sportvg Feuerbach E2", "rot", "weiss"]]
}
```

Ein Trainer-Handy sendet bei jeder Änderung (US5) eine Meldung nur mit `g`; Trainer- und Lead-Handys hängen die jüngste ihnen bekannte an jeden Live-Stand. Es gilt die gültige Konfiguration mit dem größten `iat`; eine Änderung setzt `iat` immer über das der bekannten Konfiguration, auch wenn die Uhr des Handys nachgeht. Live-Stände von Mannschaften, die nicht in `teams` stehen, zeigt das Dashboard nicht an. Titel 1 bis 40 Zeichen, 1 bis 6 Mannschaften.

`m` (US5, optional): je Mannschaft Kurzlabel, Name (höchstens 40 Zeichen) und Heim- und Auswärtstrikot (Palette), wie `m` im Trainer-Link. Damit übernimmt ein anderes Trainer-Handy eine neu hinzugefügte Mannschaft beim nächsten Empfang (eigenes Zertifikat, Eintrag in "Meine Mannschaften"). Fehlt `m` (ältere Versionen), bleibt eine unbekannte Mannschaft außen vor, bis der Trainer-Link erneut eingefügt wird. Ist `m` vorhanden, aber ungültig, gilt die ganze Konfiguration als ungültig. Ältere Dashboards übergehen das Feld.

## Zertifikat (`c.d`)

```json
{ "key": "E2", "name": "Sportvg Feuerbach E2", "homeColor": "rot", "awayColor": "schwarz", "pub": "<87 Zeichen>", "iat": 1794038000000 }
```
