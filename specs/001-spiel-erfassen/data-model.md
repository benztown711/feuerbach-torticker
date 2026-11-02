# Data Model: Spiel erfassen

Alle Zeitstempel sind Epoch-Millisekunden (`Date.now()`), Anzeige in lokaler Zeit (Europe/Berlin). IDs sind `crypto.randomUUID()`.

## Game (Object Store `games`, keyPath `id`)

| Feld | Typ | Regeln |
|---|---|---|
| `id` | string | UUID |
| `schemaVersion` | number | aktuell `1` |
| `ownTeam` | string | 1 bis 40 Zeichen, Vorgabe aus Settings |
| `opponent` | string | Pflicht, 1 bis 40 Zeichen, getrimmt |
| `venue` | `"home"` \| `"away"` | bestimmt links/rechts (Heim links) |
| `schema` | `{ sections: 1..4, sectionMinutes: 1..60 }` | Vorgabe 2 × 25 |
| `createdAt` | number | Anlegen |
| `clockEvents` | ClockEvent[] | nur anhängen, chronologisch |
| `goals` | Goal[] | siehe unten |
| `signalledThresholds` | string[] | z. B. `"1:0"` (Abschnitt 1, 00:00), `"1:+1"`; verhindert Doppelsignal |
| `status` | GameStatus | abgeleitet und mitgespeichert für die Historien-Liste |
| `finalScore` | `{ own, opp }` | gesetzt bei `fullTime` |
| `halfTimeScore` | `{ own, opp }` \| null | Stand am Ende von Abschnitt 1 |

Indizes: `by-createdAt` (Historie, neueste zuerst), `by-status` (laufendes Spiel finden).

## ClockEvent

| Feld | Typ |
|---|---|
| `type` | `"kickoff"` \| `"pause"` \| `"resume"` \| `"sectionEnd"` \| `"fullTime"` \| `"reset"` |
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
| `deletedAt` | number \| null | Soft-Delete für Undo; Spielstand zählt nur `deletedAt = null` |

## Player (Object Store `players`, keyPath `id`)

| Feld | Typ | Regeln |
|---|---|---|
| `id` | string | UUID |
| `name` | string | 1 bis 20 Zeichen, nur ein Wort empfohlen (Vorname/Kürzel); Hinweis bei Leerzeichen "Bitte nur Vornamen" (FR-020) |
| `number` | number \| null | 1 bis 99 |
| `active` | boolean | inaktive erscheinen nicht in der Schnellauswahl, bleiben in alten Spielen lesbar |

## Settings (Object Store `settings`, Schlüssel `"app"`)

| Feld | Typ | Vorgabe |
|---|---|---|
| `ownTeam` | string | "Sportvg Feuerbach" |
| `lastSchema` | Schema | 2 × 25 |
| `theme` | `"system"` \| `"light"` | `"system"` |
| `installHintDismissedAt` | number \| null | null |

## Zustandsautomat (GameStatus)

```text
created ──kickoff──▶ running ──pause*──▶ paused ──resume──▶ running
                       │                    │
                       │◀───────────────────┘
                       ├──(Zeit ≥ Abschnittsdauer)──▶ running/overtime   (abgeleitet, kein Ereignis)
                       ├──sectionEnd* (Abschnitt < n)──▶ break ──kickoff──▶ running (Abschnitt+1)
                       └──fullTime*  (oder sectionEnd im letzten Abschnitt)──▶ finished
running|paused ──reset*──▶ vor Anpfiff des aktuellen Abschnitts (Uhr auf Anfang; bereits erfasste Tore bleiben und sind über die Torliste korrigierbar)
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
