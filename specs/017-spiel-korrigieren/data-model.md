# Data Model: Spiel korrigieren (Spec 017)

## Spiel (`Game`, `src/domain/types.ts`)

| Feld | Typ | Änderung |
|---|---|---|
| `ownColor`, `oppColor` | Palettenfarbe (`design/trikot-farben.json`) | bisher nur beim Anlegen gesetzt, jetzt über "Trikots ändern" änderbar (FR-C12) |
| `sharedAt` | Epoch-ms, optional | neu: Zeitpunkt, zu dem "Ergebnis teilen" auf diesem Handy zuletzt erfolgreich war (geteilt oder kopiert). Fehlt = nie geteilt (FR-C20) |

- `sharedAt` geht nicht an den Dienst (`buildSnapshot` liest es nicht) und wird bei "Spiel übernehmen" nicht übernommen.
- Sicherung (`export.ts`): `sharedAt` fehlt oder ist ein Zeitpunkt; ältere Sicherungen ohne das Feld bleiben gültig.
- Alle übrigen Korrekturen ändern bestehende Felder wie in Spec 012 (`goals`, `halfTimeScore`, `finalScore`).

## Einstellungen (`Settings`)

| Feld | Änderung |
|---|---|
| `opponentColors` | wird auch durch "Trikots ändern" gesetzt, wenn sich die Gegnerfarbe ändert (FR-C13, FR-031) |

## Regeln

- **Erinnerung** (`needsReshare(before, after, players)`): `after.status === 'finished'`, `after.sharedAt` gesetzt und `buildShareText(before) !== buildShareText(after)`.
- **Sendegrenze** (`isRecentGame(games, game, live)`): Spiele derselben Live-Mannschaft (über `liveTeamFor`) ohne `livePrivate`, die nach `game` angelegt wurden (`createdAt` größer), sind weniger als 10. Ein Spiel ohne Live-Mannschaft ist nie "jüngst".
