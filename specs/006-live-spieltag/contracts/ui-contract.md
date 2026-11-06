# UI-Vertrag: Live-Spieltag (Spec 006)

Ergänzt `specs/001-spiel-erfassen/contracts/ui-contract.md`. Test-IDs sind Vertrag.

## Routen

| Hash | Bildschirm | Navigationsleiste |
|---|---|---|
| `#/live-spieltag` | "Mehr" → "Live-Spieltag": leer, anlegen, Übersicht (Organisator), Lead-Ansicht | ja, "Mehr" aktiv |
| `#/live-spieltag/dashboard` | Dashboard in der App | ja, "Mehr" aktiv |
| `#/live-spieltag/spielplan` | Spielplan (Spec 015 US1): Liste, Blatt "Planspiel" (`plan-add`, `plan-row-<id>`, `plan-sheet`, `plan-save`, `plan-cancel`, `plan-delete`) | ja, "Mehr" aktiv |
| `#/live/<Daten>` | Dashboard für Zuschauer (Zuschauer-Link) | nein |
| `#/trainer/<Daten>`, `#/lead/<Daten>` | Trainer- bzw. Lead-Link im Browser: Anleitung, kopieren, hier koppeln | nein |

## Mehr

`more-live` ("Live-Spieltag", Untertitel "Dashboard für Eltern, Trainer-Link").

## Live-Spieltag (`#/live-spieltag`)

| Element | Test-ID | Verhalten |
|---|---|---|
| Leerzustand | `live-empty` | Erklärung, Kasten "Was das Handy verlässt" |
| Anlegen | `btn-live-create` | öffnet das Formular |
| Link einfügen | `btn-paste-link`, `paste-link-input`, `paste-link-apply` | nimmt Trainer-, Zuschauer- oder Lead-Link an (`contracts/live-link.md`); Fehlermeldung `paste-link-error` |
| Titel | `input-live-title` | 1 bis 40 Zeichen, Vorgabe "Unser Spieltag" |
| Mannschaften | `live-team-chip-<key>` | Mehrfachauswahl aus "Meine Mannschaften", 1 bis 6 |
| Anlegen bestätigen | `btn-live-save` | legt an, zeigt Übersicht |
| Zuschauer-Link teilen | `btn-share-viewer` | System-Teilen-Menü, Rückfall Zwischenablage |
| Trainer-Link teilen | `btn-share-trainer` | System-Teilen-Menü; auf jedem Trainer-Handy |
| Mannschaft | `live-team-row-<key>` | Farbmarke und Name; darunter `live-team-sent-<key>` (US5): "zuletzt gesendet heute 10:40 Uhr", "zuletzt gesendet am 31.10." oder "noch nichts gesendet" (alle Trainer-Handys zusammen) |
| Mannschaft entfernen | `btn-team-remove-<key>` | US5, in der Zeile, nur bei mehr als einer Mannschaft; Rückfrage `confirm-dialog` ("<Mannschaft> entfernen?") |
| Mannschaft hinzufügen | `btn-team-add` | US5, nur wenn "Meine Mannschaften" eine fehlende hat und weniger als 6 dabei sind; Sheet `team-add-sheet` mit `team-add-chip-<key>`, `team-add-save` |
| Dashboard ansehen | `btn-live-dashboard` | `#/live-spieltag/dashboard`; im Leerzustand, wenn ein Zuschauer-Link gemerkt ist ("Dashboard „<Titel>“ ansehen") |
| Titel ändern | `btn-live-title` | US5, unter "Verwalten"; Sheet `title-sheet` mit `input-title-edit`, Fehler `title-error`, `title-save` |
| Alle Links neu ausstellen | `btn-live-reissue` | US5, unter "Verwalten", Rückfrage `confirm-dialog`; danach Hinweis `live-reissued` ("Neue Links ausgestellt") |
| Kopplung beenden | `btn-live-end` | US5, unter "Verwalten" (auch Lead-Ansicht und "neu ausgestellt"), Rückfrage `confirm-dialog`; danach Leerzustand |
| Neu ausgestellt | `live-retired` | US5-S3: ein anderes Trainer-Handy hat neu ausgestellt; Hinweis, `btn-paste-link` ("Trainer-Link einfügen"), `btn-live-end`; keine Teilen-Knöpfe |
| Lead-Ansicht (erste Version) | `live-lead-info` | "Dieses Handy sendet live für <Mannschaft>" und Titel |

Kopplungsfrage (Sheet `couple-dialog`): "Live senden für <Mannschaften>?", `couple-yes` ("Ja, live senden"), `couple-no` ("Abbrechen"). Bei bestehender anderer Kopplung zusätzlich der Hinweis `couple-replace`.

## Trainer- oder Lead-Link im Browser (`#/trainer/<Daten>`, `#/lead/<Daten>`)

`lead-link-page`, `btn-copy-lead-link`, `btn-couple-here` (öffnet die Kopplungsfrage), Fehlerzustand `lead-link-invalid`.

## Dashboard

| Element | Test-ID | Verhalten |
|---|---|---|
| Seite | `dashboard` | roter Kopf mit Titel `dash-title` und Datum |
| Neu ausgestellt | `dash-retired` | US5-S3: "<Titel> wurde neu ausgestellt. Bitte den neuen Link aus der Elterngruppe öffnen." (in der App: neuen Trainer-Link einfügen) |
| Status | `dash-status` | `data-state="connecting"`, `"live"`, `"offline"` ("Keine Verbindung · Stand von <Uhrzeit> Uhr") oder `"polling"` |
| Karte | `dash-card-<key>` | eine je Mannschaft; Attribut `data-game` = Spiel-ID |
| Aufklappen | `dash-toggle-<key>` | ganze Karte, `aria-expanded` |
| Stand | `dash-score-<key>` | "Heim:Gast" |
| Phase | `dash-phase-<key>` | Minute oder Phase (FR-L12) |
| Details | `dash-details-<key>` | Anpfiff, Halbzeit, Tore (`dash-goal`), `dash-earlier-<key>`, `dash-stale-<key>` |
| Leer | `dash-empty` | "Heute noch kein Spiel live", Mannschaften; gemerkte Karten früherer Tage darunter unter "Zuletzt" |
| Ungültiger Link | `dashboard-invalid` | Zuschauer-Link nicht lesbar |
| Kein Live-Spieltag | `dashboard-none` | `#/live-spieltag/dashboard` ohne Live-Spieltag und ohne gemerkten Zuschauer-Link |
| Hervorhebung | Klasse `card--flash` | einige Sekunden nach neuem Tor |

## Spielbildschirm (Lead-Handy)

| Element | Test-ID | Verhalten |
|---|---|---|
| Kennzeichen | `live-pill` | `data-state="on"` ("Live"), `"wait"` ("Live: wartet auf Netz"), `"off"` ("Nicht live"), `"handed"` ("Übergeben", US6); Tipp öffnet das Dashboard |
| Übernommen | `live-handed-over` | Hinweis (10 s): "<Kurzlabel> überträgt jetzt ein anderes Handy. Hier wird nur noch lokal erfasst."; `menu-live-toggle` entfällt |
| Andere Spiele | `live-others` | eine Zeile unter der Kopfzeile, je Spiel `live-other-<key>` mit "E2 2:1 · 31'" (heutige Spiele der anderen Mannschaften, laufende zuerst; bis zum eigenen Schlusspfiff; fehlt ohne andere Spiele); Tipp öffnet das Dashboard; `data-flash="true"` für 5 s nach einem neuen Tor, ohne Ton |
| Menü | `menu-live-toggle` | "Nicht live senden" bzw. "Live senden" |

## Neues Spiel (Trainer-Handy)

| Element | Test-ID | Verhalten |
|---|---|---|
| Zeile | `new-live-row` | nur, wenn die gewählte Mannschaft zum Live-Spieltag gehört |
| Schalter "Live aufs Dashboard" | `new-live-switch` | `role="switch"`, Vorgabe an; aus → Spiel mit "Nicht live senden" angelegt |
| Neu ausgestellt | `new-live-retired` | US5-S3: statt des Schalters der Hinweis, den neuen Trainer-Link einzufügen |
| Rückfrage "läuft schon live" | `takeover-dialog`, `takeover-summary` | US6-S1: "Das Spiel der <Kurzlabel> überträgt bereits ein anderes Handy: <Heim> <Stand> <Gast> · <Phase>." |
| Spiel übernehmen | `takeover-yes` | legt das Spiel aus dem letzten Stand an und öffnet es (US6-S2) |
| Nur hier erfassen | `takeover-private` | legt das Spiel wie mit "Live aufs Dashboard" aus an (US6-S4) |
| Abbrechen | `takeover-cancel` | schließt die Rückfrage |

## Einstellungen: Sicherung (FR-L21)

| Element | Test-ID | Verhalten |
|---|---|---|
| Hinweis | `backup-live-hint` | nur mit Live-Spieltag: "Die Datei enthält auch den Trainer-Schlüssel: nur für dich aufbewahren …" |
| Rückfrage | `confirm-dialog` | ohne eigenen Live-Spieltag: "Live-Spieltag „<Titel>“ übernehmen?" mit den Mannschaften, die dieses Handy dann sendet; `confirm-yes` ("Übernehmen") |
| Ergebnis | `import-result` | zusätzlich "Live-Spieltag „<Titel>“ übernommen." bzw. "Live-Spieltag nicht übernommen: …" |

