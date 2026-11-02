# UI-Vertrag: Bildschirme, Aktionen, Test-IDs

Die Test-IDs (`data-testid`) sind Teil des Vertrags: E2E-Tests verlassen sich darauf. Änderungen nur zusammen mit den Tests.

Navigation per URL-Hash, damit Zurück-Geste und Neuladen funktionieren.

| Hash | Bildschirm |
|---|---|
| `#/` | Start: laufendes Spiel fortsetzen, "Neues Spiel", Historie, Kader, Einstellungen |
| `#/neu` | Neues Spiel |
| `#/spiel/:id` | Spielbildschirm |
| `#/spiel/:id/details` | Torliste und Uhr-Ereignisse mit Uhrzeit (auch für Historie) |
| `#/historie` | Historie |
| `#/kader` | Kader |
| `#/einstellungen` | Einstellungen inkl. Export/Import |

## Neues Spiel (`#/neu`)

| Element | Test-ID | Verhalten |
|---|---|---|
| Gegner | `input-opponent` | Pflicht; "Anpfiff vorbereiten" erst aktiv, wenn gefüllt |
| Heim / Auswärts | `venue-home`, `venue-away` | Segment-Schalter, keine Vorauswahl |
| Abschnitte | `schema-sections` | 1 bis 4, Vorgabe letzte Einstellung |
| Minuten | `schema-minutes` | 1 bis 60 |
| Weiter | `btn-create` | legt Spiel an, öffnet Spielbildschirm im Zustand `created` |

## Spielbildschirm (`#/spiel/:id`)

Aufbau von oben nach unten: Kopf (Wappen 24 px, Abschnitt-Label), Spielstand, Uhr, Steuerleiste, Torliste (letzte 3), Tor-Knöpfe (untere Bildschirmhälfte).

| Element | Test-ID | Verhalten |
|---|---|---|
| Name Heim / Gast | `team-home`, `team-away` | links Heim, rechts Gast |
| Spielstand | `score` | Format `"2 : 1"` (Heim : Gast), Stil `ergebnis` |
| Uhr | `clock` | Restzeit `mm:ss`; in Nachspielzeit `+m:ss` in `rot-text`, `data-overtime="true"` |
| Abschnitt | `section-label` | "1. HZ", "2. HZ", bei 1 Abschnitt "Spielzeit", bei 3/4 "1. Drittel"/"1. Viertel" |
| Anpfiff | `btn-kickoff` | sichtbar in `created` und `break`; ohne Abfrage; schaltet Ton frei |
| Pause / Weiter | `btn-pause`, `btn-resume` | Pause mit Abfrage |
| Halbzeitpfiff / Abpfiff | `btn-section-end` | Beschriftung je nach Abschnitt; mit Abfrage |
| Zurücksetzen | `btn-reset` | im Menü "…", mit Abfrage |
| Sicherheitsabfrage | `confirm-dialog`, `confirm-yes`, `confirm-no` | Tippen außerhalb = Abbrechen |
| Tor Feuerbach | `btn-goal-own` | `vereinsrot`; `disabled` außerhalb `running`/`paused` |
| Tor Gegner | `btn-goal-opp` | `ink`; gleiche Aktivregel |
| Undo-Leiste | `undo-bar`, `btn-undo` | 10 s nach jedem Tor sichtbar |
| Schnellauswahl Torschütze | `scorer-picker`, `scorer-option-<playerId>`, `scorer-own-goal`, `scorer-skip` | nur nach eigenem Tor, schließt nach 8 s |
| Signal-Overlay | `signal-flash` | blinkt 3 s bei jeder Signalschwelle |

Doppeltipp-Schutz: Ein zweiter Tap auf denselben Tor-Knopf innerhalb 1,5 s wird ignoriert und zeigt kurz "Schon gezählt".

## Spieldetails (`#/spiel/:id/details`)

| Element | Test-ID | Verhalten |
|---|---|---|
| Tor-Eintrag | `goal-<goalId>` | zeigt Minute-Label, Uhrzeit `HH:MM:SS`, Mannschaft, Torschütze |
| Torschütze bearbeiten | `goal-edit-<goalId>` | eigene Tore: Kaderauswahl + Eigentor Gegner; Gegentore: Freitext, Platzhalter "Name oder Rückennummer" |
| Tor löschen | `goal-delete-<goalId>` | mit Abfrage |
| Uhr-Ereignisse | `clock-events` | Anpfiff, Pausen, Halbzeit, Abpfiff jeweils mit Uhrzeit |
| Teilen | `btn-share` | nur bei `finished`; Text nach `share-text.md` |

## Historie (`#/historie`)

| Element | Test-ID | Verhalten |
|---|---|---|
| Liste | `history-list` | neueste zuerst |
| Eintrag | `history-item-<gameId>` | Datum, Anpfiff-Uhrzeit, Gegner, Ergebnis, H/A |
| Löschen | `history-delete-<gameId>` | mit Abfrage |

## Einstellungen (`#/einstellungen`)

| Element | Test-ID |
|---|---|
| Name eigene Mannschaft | `input-own-team` |
| Theme | `theme-system`, `theme-light` |
| Historie sichern | `btn-export` |
| Sicherung laden | `input-import` |
| Installationshinweis | `install-hint` (nur außerhalb Standalone) |
