# UI-Vertrag: Bildschirme, Aktionen, Test-IDs

Die Test-IDs (`data-testid`) sind Teil des Vertrags: E2E-Tests verlassen sich darauf. Änderungen nur zusammen mit den Tests.

Navigation per URL-Hash, damit Zurück-Geste und Neuladen funktionieren.

| Hash | Bildschirm |
|---|---|
| `#/` | Start: laufendes Spiel fortsetzen, "Neues Spiel" |
| `#/neu` | Neues Spiel |
| `#/spiel/:id` | Spielbildschirm |
| `#/spiel/:id/details` | Torliste und Uhr-Ereignisse mit Uhrzeit (auch für Historie) |
| `#/historie` | Historie |
| `#/mehr` | Mehr: Kader, Einstellungen, Hilfe |
| `#/kader` | Kader |
| `#/einstellungen` | Einstellungen inkl. Sicherung |
| `#/hilfe` | Hilfe (iPhone-Hinweise) |

Startseite: `btn-continue`, `btn-new-game`.

## Navigationsleiste (alle Bildschirme, FR-037)

| Element | Test-ID | Verhalten |
|---|---|---|
| Leiste | `nav` | unten, 56 pt + Sicherheitsabstand, drei Einträge |
| Spiel | `nav-game` | aktiv auf Start, Neues Spiel, Spiel; zeigt "Läuft <Minute>"/"Pause" (`nav-live`) wenn ein Spiel läuft und eine andere Seite offen ist, führt dann zum Spiel; im Spiel führt es zur Startseite |
| Historie | `nav-history` | aktiv auf Historie und Spieldetails |
| Mehr | `nav-more` | aktiv auf Mehr, Kader, Einstellungen, Hilfe |

## Mehr (`#/mehr`)

`more-roster`, `more-settings`, `more-help`

## Neues Spiel (`#/neu`)

| Element | Test-ID | Verhalten |
|---|---|---|
| Eigene Mannschaft | `input-own-team`, `own-team-recent-<n>` | Pflicht; vorbelegt; Schnellauswahl der letzten 5 Namen |
| Gegner | `input-opponent` | Pflicht; "Anpfiff vorbereiten" erst aktiv, wenn gefüllt |
| Heim / Gast tauschen | `btn-swap-venue` | Doppelpfeil zwischen den Mannschaften; links steht immer Heim |
| Abschnitte | `schema-sections` | 1 bis 4, Vorgabe letzte Einstellung |
| Minuten | `schema-minutes` | 1 bis 60 |
| Trikotfarben | `color-own-<id>`, `color-opp-<id>`, `color-clash-hint` | Farbfelder aus `design/trikot-farben.json`; Hinweis bei gleicher Farbe |
| Aufgebot | `squad-count`, `squad-picker`, `squad-option-<playerId>`, `squad-take-last` | optional; Vorauswahl = letztes Aufgebot; leerer Kader: Link "Kader anlegen" |
| Weiter | `btn-create` | legt Spiel an, öffnet Spielbildschirm im Zustand `created` |

## Spielbildschirm (`#/spiel/:id`)

Aufbau von oben nach unten: Kopf (Wappen 24 px, Abschnitt-Label), Mannschaften mit Farbmarke und Spielstand, Uhr, Steuerleiste, Torliste (alle Tore, in sich scrollbar), Tor-Knöpfe (unteres Drittel). Maßstab: 375 × 667 pt ohne Seiten-Scrollen (FR-033).

| Element | Test-ID | Verhalten |
|---|---|---|
| Name Heim / Gast | `team-home`, `team-away` | links Heim, rechts Gast |
| Heim/Gast tauschen | `btn-swap-venue` | vor Anpfiff sichtbar zwischen den Namen; danach im Menü "…" mit Abfrage (FR-035) |
| Menü "…" | `btn-menu`, `game-menu`, `menu-swap-venue`, `menu-details` | nur "Heim und Gast tauschen" und "Spieldetails"; "Uhr zurücksetzen" entfallen (Runde 4), "Zur Startseite" übernimmt die Navigationsleiste |
| Spielstand | `score` | Format `"2 : 1"` (Heim : Gast), Stil `ergebnis` |
| Uhr | `clock` | Restzeit `mm:ss`; in Nachspielzeit `+m:ss` in `rot-text`, `data-overtime="true"` |
| Abschnitt | `section-label` | "1. HZ", "2. HZ", bei 1 Abschnitt "Spielzeit", bei 3/4 "1. Drittel"/"1. Viertel" |
| Anpfiff | `btn-kickoff` | sichtbar in `created` und `break`; ohne Abfrage; schaltet Ton frei |
| Uhr anhalten / Uhr fortsetzen | `btn-pause`, `btn-resume` | reiner Text, kein Symbol; Anhalten mit Abfrage |
| Pausenpfiff / Schlusspfiff | `btn-section-end` | "Pausenpfiff" vor dem letzten Abschnitt, sonst "Schlusspfiff"; mit Abfrage; in der Nachspielzeit gefüllt `ink` hervorgehoben |
| Sicherheitsabfrage | `confirm-dialog`, `confirm-yes`, `confirm-no` | Tippen außerhalb = Abbrechen |
| Tor Feuerbach | `btn-goal-own` | Trikotfarbe `ownColor`; `disabled` außerhalb `running`/`paused`; bei `paused` Abfrage "Tor eintragen und Uhr fortsetzen?" (FR-021) |
| Tor Gegner | `btn-goal-opp` | Trikotfarbe `oppColor`; gleiche Aktivregel |
| Torliste | `goal-list`, `goal-row-<id>` | alle Tore, neuestes oben, scrollt in sich; Antippen öffnet `goal-actions` |
| Torschütze Gegner | `scorer-text-input`, `scorer-text-save`, `scorer-text-clear` | Freitext, Platzhalter "Name oder Rückennummer", max. 30 Zeichen |
| Tor-Aktionen | `goal-actions`, `goal-remove`, `goal-restore`, `goal-edit-scorer` | "Tor entfernen" (mit Abfrage) bzw. "Tor wiederherstellen"; Torschütze ändern |
| Undo-Leiste | `undo-bar`, `btn-undo` | 10 s nach jedem Tor sichtbar |
| Schnellauswahl Torschütze | `scorer-picker`, `scorer-option-<playerId>`, `scorer-others`, `scorer-own-goal`, `scorer-skip` | nur nach eigenem Tor, Aufgebot als Raster (bis 16 Knöpfe), "Andere …" für restlichen Kader, schließt nach 8 s |
| Signal-Overlay | `signal-flash` | blinkt 3 s bei jeder Signalschwelle |

Doppeltipp-Schutz: Ein zweiter Tap auf denselben Tor-Knopf innerhalb 1,5 s wird ignoriert und zeigt kurz "Schon gezählt".

## Spieldetails (`#/spiel/:id/details`)

| Element | Test-ID | Verhalten |
|---|---|---|
| Kopf | `details-score` | "Heim : Gast", Stand Heim zuerst; Halbzeitstand und Schlusspfiff-Uhrzeit |
| Zeitleiste | `details-timeline` | Uhr-Ereignisse und Tore chronologisch mit Minute-Label und Uhrzeit `HH:MM:SS`; entfernte Tore durchgestrichen mit "entfernt" |
| Teilen-Vorschau | `share-preview` | Text nach `share-text.md` |
| Teilen | `btn-share` | nur bei `finished`; sonst `btn-back-to-game` |
| Spiel löschen | `btn-delete-game` | mit Abfrage, danach zurück zur Historie |

Torschütze ändern und Tor entfernen erfolgen im Spielbildschirm (Tor-Aktionen).

## Historie (`#/historie`)

| Element | Test-ID | Verhalten |
|---|---|---|
| Filter | `history-filter-all`, `history-filter-<n>` | nur bei mehr als einem eigenen Mannschaftsnamen; Kurzform (E1, E2, D3) |
| Liste | `history-list` | neueste zuerst; leer: `history-empty` |
| Eintrag | `history-item-<gameId>` | Datum, Anpfiff-Uhrzeit, Gegner, Kurzname · heim/auswärts, Ergebnis aus Feuerbach-Sicht (`history-score-<gameId>`), S/U/N bzw. "läuft"; öffnet die Spieldetails |

Löschen erfolgt in den Spieldetails (`btn-delete-game`).

## Kader (`#/kader`)

| Element | Test-ID | Verhalten |
|---|---|---|
| Liste | `roster-list` | sortiert nach Nummer, dann Name; gelöschte unsichtbar |
| Spieler hinzufügen | `btn-add-player`, `input-player-name`, `input-player-number`, `btn-save-player`, `hint-first-name-only` | Name + Nummer; Hinweis "Bitte nur Vornamen" (FR-020) |
| Spieler bearbeiten / löschen | `player-edit-<id>`, `player-delete-<id>` | Löschen mit Abfrage (Soft-Delete) |
| Liste einfügen | `btn-paste-list`, `paste-input`, `paste-preview`, `paste-row-<n>`, `paste-name-<n>`, `paste-remove-<n>`, `paste-cancel`, `paste-apply` | Vorschau mit Warnungen, Namen in der Vorschau editierbar |
| Kader teilen | `btn-share-roster` | Teilen-Menü mit "Nummer Name" pro Zeile |

## Einstellungen (`#/einstellungen`)

| Element | Test-ID |
|---|---|
| Gespeicherte Mannschaftsnamen | `recent-own-teams`, `recent-own-team-remove-<n>` |
| Theme | `theme-system` ("Wie iPhone"), `theme-light`, `theme-dark` |
| Historie sichern | `btn-export` |
| Sicherung laden | `input-import`, Ergebnis in `import-result` |
| Installationshinweis | `install-hint` (nur außerhalb Standalone) |
