# Data Model: Eltern tickern (Spec 024)

Ergänzt `specs/006-live-spieltag/data-model.md`, `specs/016-trainer-paket/data-model.md`.

## Neue und geänderte Felder

| Ort | Feld | Typ | Bedeutung |
|---|---|---|---|
| `LiveConfig` | `x?` | `string[]` | Kurzlabels ohne Eltern-Tickern ("Eltern dürfen tickern" aus); fehlt = alle erlaubt (R-E2) |
| `LiveSpieltag` | `kit?` | `SignedData` | Eltern-Paket des Live-Spieltags (nur Trainer-Handys; reist mit jeder `cfg`-Meldung) |
| `Settings` | `liveTicker?` | `{ topic, viewKey, orgPub, kit: SignedData }` | Eltern-Handy: zum Senden nötige Daten des zuletzt getickerten Live-Spieltags (R-E3) |
| `Settings` | `tickerName?` | `string` | Ticker-Name der Eltern, 2 bis 20 Zeichen (FR-E09) |
| `Settings` | `parentGamesDone?` | `string[]` | Trainer-Handy: beantwortete Übernahme-Fragen (`<team>/<gameId>`), höchstens 50 (US5) |
| `Game` | `tickedBy?` | `string` | "Getickert von …" bei aus Eltern-Spielen übernommenen Spielen (FR-E21) |
| `LiveGameSnapshot` | `by?`, `tr?` | `string`, `1` | Name des Tickers, Trainer-Handy (R-E4) |
| `BoardEntry` | `parent?` | `true` | Stand kam mit Eltern-Zertifikat |

## Eltern-Paket (`k` im Umschlag der `cfg`-Meldung)

Signiert vom Organisator: `{ "k": { d, x, y }, "c": { d, s }, "iat": 1764150000000 }`.

`c.d` ist das Eltern-Zertifikat `{ key: "*", name: "Eltern", homeColor, awayColor, pub, iat, p: 1 }`, signiert vom Organisator.

## Zuschauer-Kopie eines Kaders

`squad`-Zeile mit `slot = squadSlot(viewKey, "v." + sid)`, Inhalt mit dem Zuschauer-Schlüssel versiegelt: `{ v: 1, s: sid, t: ["E1", "E2"], k: [[name, number|null], …] }` (nur nicht gelöschte Kinder, nur erlaubte Mannschaften). Grabstein: `gone: true`, Inhalt `{ v: 1, s: sid, t: [], k: [] }`.

## Zustände eines Eltern-Spiels

`angelegt` (sofort gesendet, Karte "Paul tickert bereits") → `läuft` → `beendet` ("Getickert von Paul"; Übernahme-Frage bei Trainern). Übernimmt ein anderes Handy (größeres `h`), gilt auf dem alten `liveHandedOver` (Spec 006). Schaltet ein Trainer "Eltern dürfen tickern" aus, ignoriert das Dashboard weitere Stände (R-E2).
