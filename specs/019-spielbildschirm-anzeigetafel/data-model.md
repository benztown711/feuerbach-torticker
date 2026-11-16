# Data Model: Spielbildschirm mit Anzeigetafel und sicherem Rückgängig

Keine Änderung an gespeicherten Daten (`Game`, Einstellungen, Sicherung, Live-Meldung).

## Meldeplatz (nur zur Laufzeit, R-A1)

`messageSlot(input) → { message, hint }`

| Eingabe | Bedeutung |
|---|---|
| `goalUndo` | Tor, das noch rückgängig gemacht werden kann (10 s), oder keines |
| `pickerOpen` | Torschützen-Auswahl offen; Tor-Rückgängig ruht so lange |
| `markUndo` | eben gesetztes Lesezeichen (10 s) |
| `eventUndo` | eben erfasste Karte oder Wechsel (10 s) |
| `reshare` | Leiste "Korrigiert. Ergebnis neu teilen?" aktiv (Spec 017) |
| `handedOver`, `shareResult`, `doubleTap` | aktive Hinweise |

| Ausgabe | Werte |
|---|---|
| `message` | `goal` \| `mark` \| `event` \| `reshare` \| `null` (Rangfolge in dieser Reihenfolge) |
| `hint` | `handedOver` \| `shareResult` \| `doubleTap` \| `null` (der wichtigste aktive Hinweis) |

Die Komponente zeigt: Meldung mit Hinweis als zweite Zeile; nur Hinweis allein im Band; beides `null` kein Band.
