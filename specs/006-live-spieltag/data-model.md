# Datenmodell: Live-Spieltag (Spec 006)

Ergänzt `specs/001-spiel-erfassen/data-model.md`. Alle Zeitstempel in Epoch-Millisekunden der jeweiligen Geräteuhr. Schlüssel als base64url ohne Auffüllzeichen.

## Gespeichert auf dem Gerät

### `Game.live?: boolean` (FR-L09)

`false` = "Nicht live senden" für dieses Spiel. Fehlt das Feld oder ist es `true`, sendet ein Lead-Handy das Spiel, wenn seine Mannschaft gekoppelt ist.

### `Settings.live: LiveSpieltag | null` (FR-L01 bis FR-L04)

Höchstens ein Live-Spieltag je Gerät.

| Feld | Typ | Bedeutung |
|---|---|---|
| `v` | `1` | Formatversion |
| `topic` | string, 22 Zeichen | Topic bei ntfy.sh (128 Bit Zufall) |
| `viewKey` | string | AES-GCM-256, roh |
| `orgPub` | string | ECDSA P-256 öffentlich, roh (65 Byte) |
| `orgPriv` | `JsonWebKey` oder fehlt | nur auf dem Organisator-Handy |
| `config` | `SignedConfig` | jüngste bekannte Konfiguration (Titel, Mannschaften) |
| `teams` | `LiveTeamCred[]` | Organisator: alle Mannschaften; Lead-Handy: nur gekoppelte |
| `createdAt` | number | Anlegen bzw. Koppeln |

Rolle: Organisator ⇔ `orgPriv` vorhanden. Lead für eine Mannschaft ⇔ deren Eintrag hat `sends: true`.

### `LiveTeamCred`

| Feld | Typ | Bedeutung |
|---|---|---|
| `key` | string | Kurzlabel, z. B. "E1" (wie Historie-Filter, `teamShortLabel`) |
| `name` | string, 1 bis 40 | voller Name aus "Meine Mannschaften", z. B. "Sportvg Feuerbach E1" |
| `homeColor`, `awayColor` | Paletten-ID | Trikots (für Übernahme beim Koppeln) |
| `leadPriv` | `JsonWebKey` | privater Lead-Schlüssel (d, x, y) |
| `cert` | `SignedCert` | vom Organisator signiertes Zertifikat |
| `sends` | boolean | dieses Gerät sendet für die Mannschaft |

### Sicherung (FR-L21)

`Backup.live?: LiveSpieltag` (contracts/export.schema.json in Spec 001): der Live-Spieltag dieses Handys mit allen Schlüsseln. Wiederherstellen übernimmt ihn nur, wenn das Handy noch keinen Live-Spieltag hat, prüft dabei die Signatur der Konfiguration und trägt die Mannschaften in "Meine Mannschaften" ein.

### `Settings.liveView: ViewerLink | null` (R-L6)

Zuletzt geöffneter Zuschauer-Link (`topic`, `viewKey`, `orgPub`, `title`), damit der Torticker ohne eigene Daten direkt das Dashboard zeigt.

### Zwischenspeicher des Dashboards (FR-L16)

`localStorage["torticker-live:<topic>"]`: zuletzt angezeigte Live-Stände je Mannschaft (höchstens ein Tag je Mannschaft), Fehler beim Lesen oder Schreiben werden ignoriert.

## Übertragen (siehe `contracts/live-message.md`)

- **SignedConfig** = `{ d: string (JSON von LiveConfig), s: Signatur des Organisators }`; `LiveConfig` = `{ title, teams: key[], iat, m?: [key, name, homeColor, awayColor][], retired?: true }` (`m` und `retired` ab US5).
- **SignedCert** = `{ d: string (JSON von LeadCert), s: Signatur des Organisators }`; `LeadCert` = `{ key, name, homeColor, awayColor, pub, iat }`.
- **Live-Stand** (`LiveSnapshot`): siehe Vertrag; abgeleitet aus `Game` ohne Kader, Aufgebot, Karten, Wechsel, Lesezeichen (FR-L10).

## Nur im Speicher des Dashboards

### Board

| Feld | Bedeutung |
|---|---|
| `config` | jüngste gültige Konfiguration (Titel, Reihenfolge) |
| `games` | `Map<gameId, { snap: LiveSnapshot, team: key, serverTime, receivedAt }>`; je Spiel gewinnt das größte `sentAt` |
| `skew` | Serverzeit − lokale Zeit aus `open`/`keepalive` (R-L4) |
| `connection` | `live` · `offline` (seit Zeitpunkt) · `polling` |

### Karte (Ansicht, FR-L12 bis FR-L15)

`{ key, gameId, home: {name, color}, away: {name, color}, score: "2:1", phase: "37'" | "Halbzeit" | …, live: boolean, ended: boolean, kickoff, fullTime, halfTime, goals: [{minute, score, who}], earlier: ["2:1 gegen TSV Musterstadt"], staleMinutes: number | null }`

## Zustände eines Spiels auf dem Dashboard

```text
(keine Meldung) ──Anlegen──▶ angelegt ──Anpfiff──▶ läuft ⇄ Uhr angehalten
                                         │ Pausenpfiff ▲ Anpfiff
                                         ▼             │
                                       Pause/Halbzeit ─┘
läuft ──Schlusspfiff──▶ Ende (ggf. Verlängerung, Elfmeterschießen) 
jeder Zustand ──"Nicht live senden" oder Löschen──▶ entfernt
```

Phase und Minute leiten sich aus Uhr-Ereignissen und Elfmeterschießen ab (`deriveClock`, `shootoutState`), nie aus einer gesendeten Minute.
