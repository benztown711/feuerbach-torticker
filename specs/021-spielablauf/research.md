# Research: Spielablauf am Spieltag (Spec 021)

## R-W1: Vorbelegung von "Nächstes Spiel"

**Entscheidung**: Eigene Adresse `#/neu/nach/<Spiel-ID>` (wie `#/neu/plan/<ID>` aus Spec 015 US6-S5). "Neues Spiel" liest das beendete Spiel aus dem Speicher und belegt Mannschaft, Spielzeit, Heim/Gast, Trikots und Live-Schalter vor; die reine Ableitung steht in `src/domain/next-game.ts` (`nextGameDraft`, `nextPlanChoice`, 100 % Branch-Coverage). Das Aufgebot kommt unverändert aus dem gemerkten Aufgebot der Mannschaft (Spec 004 FR-M06), das beim Anlegen des beendeten Spiels gespeichert wurde. Ein passendes Planspiel wählt dieselbe Funktion wie ein Tipp unter "Aus dem Spielplan" (`pickWith`), danach werden die Trikots des beendeten Spiels wieder gesetzt.

**Begründung**: Das beendete Spiel enthält alle nötigen Angaben; es braucht keine neuen Felder in den Einstellungen und keine Migration. In `new-game.tsx` (gehört Paket E, Spec 022) kommen nur eine Eigenschaft, ein Ladeschritt und der Fokus dazu, kein Layout.

**Verworfen**: (a) "Letzte Einstellungen" um Heim/Gast, Trikots und Live erweitern: neue Felder in Einstellungen und Sicherung, und sie wären auch beim normalen "Neues Spiel" vorbelegt, was Spec 004 FR-M03 (Trikot folgt Heim/Auswärts) widerspricht. (b) Neues Spiel direkt anlegen und nur den Gegner abfragen: umgeht Spielplan-Abgleich, Übernahme-Prüfung (Spec 006 FR-L22) und Vormerkungen (Spec 015 US6).

## R-W2: Wo steht die Torschützen-Auswahl? (US2, Layout)

**Frage**: Muss der Spielbildschirm umgebaut werden, damit die Auswahl die Tor-Knöpfe nicht verdeckt, auch auf dem iPhone SE (375 × 667 pt)?

**Maße (SE, ohne Sicherheitsabstände)**: Spielbereich 611 pt (667 minus Leiste 56), Kopfzeile 48 pt, Tor-Knöpfe ein Drittel der Höhe, mindestens 174 pt Bereich (Spec 019 FR-A23). Zwischen Kopfzeile und Tor-Knöpfen bleiben etwa 340 pt; dort stehen Anzeigetafel, Uhr, Uhr-Knöpfe, Ereignis-Zeile und Torliste.

**Optionen**:

1. Blatt unten lassen, nur ohne Abdunkler: verdeckt weiter die Tor-Knöpfe. Verworfen.
2. Tor-Knöpfe für die Dauer der Auswahl verkleinern und die Auswahl in den Fluss einfügen: Die Knöpfe würden unter dem Daumen wandern; ein schneller zweiter Tipp landet daneben. Verworfen (Constitution I).
3. Auswahl als schmale Zeile mit waagrecht scrollenden Namen über den Tor-Knöpfen: Namen klein, Wischen als einziger Weg zu weiteren Kindern. Verworfen (Constitution I, keine Gesten als einziger Weg).
4. **Gewählt**: Die Auswahl dockt von unten an die Tor-Knöpfe an und legt sich nach oben über Anzeigetafel, Uhr, Uhr-Knöpfe und Torliste, höchstens bis unter die Kopfzeile. Kein Umbau des Spielbildschirms: Die Auswahl ist ein absolut positionierter Bereich im Tor-Bereich (`.goal-zone`, `bottom: 100%`), seine Höhe ist auf "Spielbereich minus Kopfzeile minus Tor-Bereich" begrenzt (reines CSS: `max-height: calc(<Spielhöhe> - 48px - 100%)`, 100 % ist die Höhe des Tor-Bereichs). Reicht der Platz nicht, scrollt nur das Raster der Namen; Titel mit "Rückgängig" und "Ohne Torschütze (n s)" bleiben stehen. Auf breiten Handys hat das Raster fünf statt vier Spalten, damit ein Aufgebot von 16 Kindern meist ohne Scrollen passt.

**Nachtrag nach den ersten Screenshots**: Ohne Abdunkler schauen angeschnittene Teile unter der Auswahl hervor (halbe Uhr auf dem SE, obere Hälfte von "Uhr anhalten" und "Schlusspfiff" auf 390 × 844, die sich so sogar antippen ließen). Deshalb ruhen Uhr, Uhr-Knöpfe, Ereignis-Zeile und Torliste für die Dauer der Auswahl unsichtbar (`visibility: hidden`, Platz bleibt, nichts springt); die Anzeigetafel mit dem neuen Stand bleibt sichtbar. Zusätzlich steht "Rückgängig" rechts neben Titel und Untertitel statt in einer eigenen Zeile.

**Begründung**: Die Tor-Knöpfe bleiben exakt an ihrem Platz und in ihrer Größe, die Kopfzeile ("…", "Ton aus · tippen") bleibt frei. Was überdeckt wird (Stand, Uhr, Liste), braucht in den wenigen Sekunden der Auswahl niemand; nach dem Schließen ist alles wieder da. Das Meldeband (Spec 019) liegt im selben Andock-Bereich unter der Auswahl, damit "Schon gezählt" nicht über der Auswahl oder den Knöpfen erscheint.

**Gestaltung**: Ohne Abdunkler hebt sich die Auswahl durch den 2-pt-Rahmen in `ink` ab (wie Uhr-Knöpfe und umrandete Tor-Knöpfe), Fläche `card`, `radius-md`, keine Schatten (design/README.md).

**Barrierefreiheit**: `role="dialog"` ohne `aria-modal`, Name aus dem Titel; keine Sperre der übrigen Seite (`inert` o. Ä. nicht gesetzt). Der Fokus bleibt wie bisher, wo er ist: Ein Fokuswechsel bei jedem Tor würde Tastatur- und Screenreader-Nutzer vom Tor-Knopf wegziehen, mit dem sie gerade weiter erfassen.

**Nur die Schnellauswahl**: Die Auswahl aus Korrekturen bleibt ein Blatt mit Abdunkler (FR-W16); dort gibt es keinen Zeitdruck und keine Tor-Knöpfe im Blick.

## R-W3: Bundle-Budget

Das Hauptbundle lag vor dieser Spec bei 59,6 KB gzip (Budget 60 KB); `game.tsx` und `new-game.tsx` liegen darin. Neuer Code (Knopf, Vorbelegung, Andocken, Symbol) ist klein, Paket E ergänzt parallel ebenfalls Code im Hauptbundle. Maßnahme: Die Korrektur-Blätter und Auswahl für Tore (`goal-editor.tsx` mit `scorer-picker.tsx`) werden nachgeladen und beim Öffnen von Spielbildschirm bzw. Spieldetails sofort vorgeladen (wie `share-sheet.tsx` in Spec 020, R-E10). Der Service Worker hält den Teil offline bereit. Ist er beim ersten Tor noch nicht geladen, zählt das Tor trotzdem sofort, und die Auswahl erscheint, sobald der Teil da ist (der Schritt bleibt gemerkt, der Countdown läuft ab dem Tor). Die Vorbelegung (`next-game.ts`) ist eine kleine Domänenfunktion und bleibt im Hauptbundle.

## R-W4: Fokus auf dem Gegner-Feld

`focus()` nach dem Laden der Vorbelegung. Safari auf dem iPhone öffnet die Tastatur nur bei einer Berührung; der Fokus wirkt dort für Tastatur und VoiceOver, ein Tipp ins Feld öffnet die Tastatur. Chrome auf Android öffnet sie in der Regel. Kein Trick mit verstecktem Eingabefeld (fehleranfällig, Constitution VI).
