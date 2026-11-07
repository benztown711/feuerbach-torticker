# Data Model: Trainer-Paket (Spec 016)

## Auf dem Handy (IndexedDB, Erweiterung bestehender Typen)

### Squad (Spec 015, erweitert)

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | string | lokale Kennung (unverändert) |
| `name` | string | Kadername |
| `sid?` | string | gemeinsame Kennung, sobald der Kader einmal geteilt oder empfangen wurde (R-B4) |
| `shared?` | boolean | Schalter "Mit Trainern geteilt" (FR-B01) |
| `at?` | number | letzte Änderung von Name oder Schalter (ms) |

### Player (Spec 001, erweitert)

| Feld | Typ | Bedeutung |
|---|---|---|
| `sid?` | string | gemeinsame Kennung; neu empfangene Kinder: `id` = `sid` |
| `at?` | number | letzte Änderung von Name, Nummer, gelöscht oder Kader (ms), nur in geteilten Kadern gesetzt |

### Team (Spec 004, erweitert)

| Feld | Typ | Bedeutung |
|---|---|---|
| `squadAt?` | number | letzte Änderung der Zuordnung `squadId` (ms) |

### Settings (erweitert)

| Feld | Typ | Bedeutung |
|---|---|---|
| `squadSync?` | `{ topic, orgPub, full: string[], welcomed: boolean }` | Abgleich für den gekoppelten Live-Spieltag: geteilte Kader ohne Platz (Namen, US2-S4), Hinweis "Kader übernommen" schon gezeigt (FR-B09). Was noch hinaus muss, ergibt sich nach jedem Verbinden aus dem Vergleich mit dem Stand beim Dienst (R-B6) |

## Kader-Meldung (verschlüsselt, contracts/squad-message.md)

```
{ v: 1, s: sid, n: name, na: at des Namens, sh: 1 | 0, t: [[teamKey, at], …], k: [[sid, name, nummer | null, gelöscht 0 | 1, at], …] }
```

Regeln beim Zusammenführen (FR-B07, R-B3):

- Kind: je `sid` gilt der Eintrag mit größerem `at` (gleich: lokal bleibt); der Kader des Kindes ist der Kader der Meldung mit dem gültigen Eintrag.
- Kadername und Schalter: größeres `na` gewinnt.
- Mannschaft: je `teamKey` gewinnt die Zuordnung mit größerem `at`; lokal `Team.squadAt`.
- Fehlt ein Kind in einer Meldung, heißt das nichts (kein Löschen durch Weglassen).
- Gelöschte Kinder älter als 30 Tage fallen aus der Meldung.

## Beim Dienst (Tabelle `msg`, Spec 007 data-model.md, erweitert)

| `kind` | Felder | Regel |
|---|---|---|
| `squad` | `slot`, `at`, `gone`, `first`, `time`, `body` | eine Zeile je `slot`; ersetzt, wenn `at` ≥ gespeichert; höchstens 6 Zeilen mit `gone` = 0; Zeilen mit `gone` = 1 fallen nach 30 Tagen weg; `retire` löscht alle |
