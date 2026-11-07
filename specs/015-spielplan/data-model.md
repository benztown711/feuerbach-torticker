# Data Model: Spielplan im Live-Spieltag

## PlanEntry (Planspiel)

| Feld | Typ | Regeln | Story |
|---|---|---|---|
| `id` | string | 8 Zeichen base64url, zufällig | US1 |
| `team` | string | Kurzlabel einer Mannschaft des Live-Spieltags ("E1"), höchstens 20 Zeichen | US1 |
| `date` | string | `JJJJ-MM-TT`, gültiges Datum | US1 |
| `time` | string \| null | `HH:MM` (00:00 bis 23:59) oder leer | US1 |
| `venue` | `'home'` \| `'away'` | Pflicht | US1 |
| `opponent` | string | 0 bis 40 Zeichen, leer = "Gegner offen" | US1 |
| `competition` | string | 0 bis 40 Zeichen | US1 |
| `schema` | `{ sections, sectionMinutes }` \| null | 1 bis 4 Abschnitte, 1 bis 60 Minuten; leer = Spielzeit der Mannschaft | US1 |
| `cancelled` | boolean | "abgesagt" | US1 (FR-P29) |
| `deleted` | boolean | Grabstein (FR-P04) | US1 |
| `updatedAt` | number | ms, je Planspiel streng steigend | US1 |
| `gameId` | string \| undefined | angelegtes Spiel | US2 |
| `score` | `{ home, away }` \| undefined | Endstand | US3 (FR-P30) |
| `claim` | `{ by, name }` \| undefined | Vormerkung | US6 |

Zustände: frei → (abgesagt ⇄ frei) → gelöscht (Grabstein). Vergangen ist ein Planspiel, wenn `date` vor heute liegt (Ortszeit des Handys).

## PlanStore (je Handy)

| Feld | Typ | Regeln |
|---|---|---|
| `v` | 1 | |
| `topic`, `orgPub` | string | Live-Spieltag, zu dem der Plan gehört |
| `entries` | PlanEntry[] | höchstens 100 ohne Grabsteine; Grabsteine bis 30 Tage nach ihrem Datum |
| `seen` | Record<id, number> | je Planspiel: wann es zuletzt über den Dienst ging (gesendet oder im gleichen Stand empfangen); Grundlage für FR-P07 |
| `pending` | string[] | Kennungen geänderter Planspiele, die noch nicht gesendet wurden |

## Abgeleitete Ansicht

- `upcoming`: Gruppen `{ date, entries }` ab heute, aufsteigend; innerhalb nach Anstoß (ohne Anstoß zuletzt), dann Mannschaft.
- `past`: Planspiele vor heute, ohne Grabsteine, neueste zuerst.
