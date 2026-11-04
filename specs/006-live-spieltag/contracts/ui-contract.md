# UI-Vertrag: Live-Spieltag (Spec 006)

Ergänzt `specs/001-spiel-erfassen/contracts/ui-contract.md`. Test-IDs sind Vertrag.

## Routen

| Hash | Bildschirm | Navigationsleiste |
|---|---|---|
| `#/live-spieltag` | "Mehr" → "Live-Spieltag": leer, anlegen, Übersicht (Organisator), Lead-Ansicht | ja, "Mehr" aktiv |
| `#/live-spieltag/dashboard` | Dashboard in der App | ja, "Mehr" aktiv |
| `#/live/<Daten>` | Dashboard für Zuschauer (Zuschauer-Link) | nein |
| `#/lead/<Daten>` | Lead-Link im Browser: Anleitung, kopieren, hier koppeln | nein |

## Mehr

`more-live` ("Live-Spieltag", Untertitel "Dashboard für Eltern, Lead-Handys").

## Live-Spieltag (`#/live-spieltag`)

| Element | Test-ID | Verhalten |
|---|---|---|
| Leerzustand | `live-empty` | Erklärung, Kasten "Was das Handy verlässt" |
| Anlegen | `btn-live-create` | öffnet das Formular |
| Lead-Link einfügen | `btn-paste-link`, `paste-link-input`, `paste-link-apply` | nimmt Lead- oder Zuschauer-Link an (`contracts/live-link.md`); Fehlermeldung `paste-link-error` |
| Titel | `input-live-title` | 1 bis 40 Zeichen, Vorgabe "Unser Spieltag" |
| Mannschaften | `live-team-chip-<key>` | Mehrfachauswahl aus "Meine Mannschaften", 1 bis 6 |
| Dieses Handy sendet für | `live-self-chip-<key>`, `live-self-chip-none` | Einfachauswahl |
| Anlegen bestätigen | `btn-live-save` | legt an, zeigt Übersicht |
| Zuschauer-Link teilen | `btn-share-viewer` | System-Teilen-Menü, Rückfall Zwischenablage |
| Lead-Zeile | `live-lead-row-<key>` | Name, "dieses Handy" oder "zuletzt gesendet <Uhrzeit>" bzw. "noch nicht gekoppelt" |
| Lead-Link teilen | `btn-share-lead-<key>` | System-Teilen-Menü |
| Dashboard ansehen | `btn-live-dashboard` | `#/live-spieltag/dashboard`; im Leerzustand, wenn ein Zuschauer-Link gemerkt ist ("Dashboard „<Titel>“ ansehen") |
| Titel ändern | `btn-live-title` | US5 |
| Mannschaft hinzufügen | `btn-live-add-team` | US5 |
| Alle Links neu ausstellen | `btn-live-reissue` | US5, mit Bestätigung |
| Lead-Ansicht | `live-lead-info` | "Dieses Handy sendet live für <Mannschaft>" und Titel |
| Kopplung beenden | `btn-live-end` | US5, mit Bestätigung |

Kopplungsfrage (Sheet `couple-dialog`): `couple-yes` ("Ja, live senden"), `couple-no` ("Abbrechen"). Bei bestehender anderer Kopplung zusätzlich der Hinweis `couple-replace`.

## Lead-Link im Browser (`#/lead/<Daten>`)

`lead-link-page`, `btn-copy-lead-link`, `btn-couple-here` (öffnet die Kopplungsfrage), Fehlerzustand `lead-link-invalid`.

## Dashboard

| Element | Test-ID | Verhalten |
|---|---|---|
| Seite | `dashboard` | roter Kopf mit Titel `dash-title` und Datum |
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
| Kennzeichen | `live-pill` | `data-state="on"` ("Live"), `"wait"` ("Live: wartet auf Netz"), `"off"` ("Nicht live"); Tipp öffnet das Dashboard |
| Andere Spiele | `live-others` | eine Zeile, je Spiel `live-other-<key>`; Tipp öffnet das Dashboard; Hervorhebung bei neuem Tor |
| Menü | `menu-live-toggle` | "Nicht live senden" bzw. "Live senden" |
