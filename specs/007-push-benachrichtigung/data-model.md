# Data Model: Eigener Dienst (Spec 007, Teil 1)

## Durable Object `Spieltag` (je Live-Spieltag)

Name: `<topic>.<orgPub>` (R-N4). SQLite-Tabelle `msg`:

| Spalte | Typ | Bedeutung |
|---|---|---|
| `seq` | INTEGER, eindeutig, steigend | Reihenfolge der angenommenen Schreibvorgänge; Abruf "seit" |
| `kind` | TEXT | `game` \| `cfg` \| `plan` \| `retire` |
| `slot` | TEXT, nur `game` | 22 Zeichen base64url (HMAC über `team\|gameId`), eindeutig je Objekt |
| `grp` | TEXT, nur `game` | 22 Zeichen base64url (HMAC über `team`) |
| `h` | INTEGER, nur `game` | Übergabezähler 0 bis 100 |
| `at` | INTEGER, nur `game` | `sentAt` des Senders (ms) |
| `iat` | INTEGER, nur `cfg` | `iat` der Konfiguration (ms) |
| `gone` | INTEGER 0/1, nur `game` | "Nicht live senden" oder gelöscht |
| `first` | INTEGER | Serverzeit (ms), zu der der `slot` zum ersten Mal kam bzw. die Zeile entstand |
| `time` | INTEGER | Serverzeit (ms) des letzten Schreibens dieser Zeile |
| `body` | TEXT | verschlüsselte Meldung `t1.…`, höchstens 4.000 Zeichen |

Weitere Tabelle `cert(hash PRIMARY KEY)`: SHA-256 geprüfter Lead-Zertifikate.

### Regeln (R-N5)

- `game`: Schreiben ersetzt die Zeile des `slot`, wenn (`h`, `at`) neuer oder gleich ist (`h` größer, oder `h` gleich und `at` ≥); sonst `204`. Danach je `grp` nur die 10 jüngsten Zeilen mit `gone = 0` nach `first`; `gone = 1` älter als 30 Tage wird gelöscht.
- `cfg`: eine Zeile; ersetzt bei `iat` ≥ gespeichert.
- `plan`: neue Zeile; nur die 50 jüngsten bleiben.
- `retire`: löscht alles, speichert sich selbst; danach `409` auf jedes Schreiben.
- Obergrenzen: 6 `grp`, 200 Zeilen, `body` ≤ 4.000 Zeichen (`413`).
- Alarm: bei jedem angenommenen Schreiben jetzt + 365 Tage; beim Auslösen alles löschen.
- Neue `seq` bei jedem Ersetzen; gelöschte Zeilen verschwinden ohne Meldung (Dashboards behalten ihren Stand; Grabsteine siehe `gone`).

## App

| Ort | Neu bzw. geändert |
|---|---|
| `LiveSpieltag` (IndexedDB) | unverändert; `slotKey` wird bei Bedarf aus `viewKey` abgeleitet, nicht gespeichert |
| `localStorage` `torticker-live:<topic>:<orgPub>` | zusätzlich `seq` (zuletzt empfangen) für `since`; `games` behält je Mannschaft frühere Spiele (höchstens 10) |
| `localStorage` `torticker-recent-filter` | zuletzt gewählter Filter "Letzte Spiele": `all` oder Mannschaftskürzel |
| `BoardView` | `recent: { key, label, rows: { date, score, text, team }[] }[]` |
