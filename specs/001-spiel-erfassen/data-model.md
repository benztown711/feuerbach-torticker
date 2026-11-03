# Data Model: Spiel erfassen

Alle Zeitstempel sind Epoch-Millisekunden (`Date.now()`), Anzeige in lokaler Zeit (Europe/Berlin). IDs sind `crypto.randomUUID()`.

## Game (Object Store `games`, keyPath `id`)

| Feld | Typ | Regeln |
|---|---|---|
| `id` | string | UUID |
| `schemaVersion` | number | aktuell `1` |
| `ownTeam` | string | 1 bis 40 Zeichen, pro Spiel frei (z. B. "Sportvg Feuerbach E1"), Vorgabe `settings.recentOwnTeams[0]` |
| `opponent` | string | Pflicht, 1 bis 40 Zeichen, getrimmt |
| `venue` | `"home"` \| `"away"` | bestimmt links/rechts (Heim links) |
| `ownColor`, `oppColor` | string | Farb-ID aus `design/trikot-farben.json` (FR-031) |
| `schema` | `{ sections: 1..4, sectionMinutes: 1..60 }` | Vorgabe 2 × 25 |
| `createdAt` | number | Anlegen |
| `clockEvents` | ClockEvent[] | nur anhängen, chronologisch |
| `goals` | Goal[] | siehe unten |
| `signalledThresholds` | string[] | z. B. `"1:0"` (Abschnitt 1, 00:00), `"1:+1"`; verhindert Doppelsignal |
| `status` | GameStatus | abgeleitet und mitgespeichert für die Historien-Liste |
| `finalScore` | `{ own, opp }` | gesetzt bei `fullTime` |
| `halfTimeScore` | `{ own, opp }` \| null | Stand am Ende von Abschnitt 1 |
| `squad` | string[] | Spieler-IDs des Aufgebots; leer = ganzer Kader (FR-030) |

Indizes: `by-createdAt` (Historie, neueste zuerst), `by-status` (laufendes Spiel finden).

## ClockEvent

| Feld | Typ |
|---|---|
| `type` | `"kickoff"` \| `"pause"` \| `"resume"` \| `"sectionEnd"` \| `"fullTime"` \| `"reset"` (nur noch in älteren gespeicherten Spielen, wird weiterhin ausgewertet) |
| `at` | number |
| `section` | number (1-basiert) |

## Goal

| Feld | Typ | Regeln |
|---|---|---|
| `id` | string | UUID |
| `side` | `"own"` \| `"opp"` | |
| `at` | number | Uhrzeit des Taps (FR-022) |
| `section` | number | |
| `minute` | number | reguläre Minute, max. Abschnittsende |
| `stoppage` | number \| null | angefangene Nachspielminute, z. B. `1` für "25+1'" |
| `scorer` | `{ kind: "player", playerId } \| { kind: "text", text } \| { kind: "ownGoal" } \| null` | `player` nur bei `side = own`; `text` nur bei `side = opp` (max. 30 Zeichen, Name oder Rückennummer); `ownGoal` = Eigentor des Gegners, zählt für `own` |
| `deletedAt` | number \| null | Undo bzw. "entfernt" (FR-008); Spielstand zählt nur `deletedAt = null`; "wiederherstellen" setzt `null`; entfernte Tore bleiben durchgestrichen sichtbar |

## Player (Object Store `players`, keyPath `id`)

| Feld | Typ | Regeln |
|---|---|---|
| `id` | string | UUID |
| `name` | string | Anzeigename, 1 bis 24 Zeichen: Vorname, bei gleichen Vornamen plus kürzeste eindeutige Nachnamen-Abkürzung ("Max Mü."); nie ein voller Nachname (FR-020, FR-025) |
| `number` | number \| null | 1 bis 99 |
| `deletedAt` | number \| null | Soft-Delete (FR-029): ausgeblendet in Kader, Aufgebot, Auswahl; in alten Spielen weiter lesbar; Wiederauftauchen beim Import setzt auf `null` |

## Settings (Object Store `settings`, Schlüssel `"app"`)

| Feld | Typ | Vorgabe |
|---|---|---|
| `recentOwnTeams` | string[] | bis 5 zuletzt genutzte eigene Namen; leer = "Sportvg Feuerbach" |
| `lastSchema` | Schema | 2 × 25 |
| `lastSquad` | string[] | Aufgebot des letzten Spiels (Vorauswahl) |
| `lastOwnColor` | string \| null | null = Vorgabe Rot; wird gesetzt, sobald die eigene Farbe einmal geändert wurde |
| `opponentColors` | Record<string, string> | zuletzt genutzte Farbe je Gegnername (normalisiert: klein, getrimmt) |
| `theme` | `"system"` \| `"light"` \| `"dark"` | `"system"` |
| `installHintDismissedAt` | number \| null | null |

## Zustandsautomat (GameStatus)

```text
created ──kickoff──▶ running ──pause*──▶ paused ──resume──▶ running
                       │                    │
                       │◀───────────────────┘
                       ├──(Zeit ≥ Abschnittsdauer)──▶ running/overtime   (abgeleitet, kein Ereignis)
                       ├──sectionEnd* (Abschnitt < n)──▶ break ──kickoff──▶ running (Abschnitt+1)
                       └──fullTime*  (oder sectionEnd im letzten Abschnitt)──▶ finished
(reset: entfallen in Runde 4; vorhandene "reset"-Ereignisse älterer Spiele setzen beim Auswerten weiterhin auf den Zustand vor Anpfiff des aktuellen Abschnitts zurück)
```

`*` = Sicherheitsabfrage (FR-006). Tor-Knöpfe aktiv nur in `running`, `running/overtime` und `paused` (FR-021).

## Abgeleiteter Uhrzustand (`deriveClock`)

Eingabe: `clockEvents`, `nowMs`, `schema`. Ausgabe:

| Feld | Bedeutung |
|---|---|
| `section` | aktueller Abschnitt |
| `playedMs` | gespielte Zeit im Abschnitt (ohne Pausen) |
| `remainingMs` | `max(0, sectionMs − playedMs)` |
| `overtimeMs` | `max(0, playedMs − sectionMs)` |
| `isOvertime` | `overtimeMs > 0` |
| `minute`, `stoppage` | nach Formel R-3 |
| `label` | z. B. `"7'"`, `"25+1'"` |
| `dueThresholds` | Schwellen ≤ jetzt, die noch nicht in `signalledThresholds` stehen |

## Validierung beim Import

Import akzeptiert nur Dateien nach `contracts/export.schema.json`. Spiele mit bereits vorhandener `id` werden übersprungen (keine Duplikate), Kaderspieler per `id` zusammengeführt.
