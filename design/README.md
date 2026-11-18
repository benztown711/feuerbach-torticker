# Gestaltung: Design System der Sportvg Feuerbach

Quelle: Design System "design-Sportvg-Feuerbach" (https://claude.ai/artifact/Ga7oaWzYafoCVbgQhGsKcJ), Stand 01.11.2026. Inoffiziell, aus Vereinsquellen abgeleitet.

Dieser Ordner ist die **einzige Quelle** für Farben, Schriften und Logos der App. Der Code liest die Werte aus `tokens.json` (z. B. per Build-Schritt nach CSS-Variablen) und enthält keine eigenen Farbwerte.

## Inhalt

| Datei | Herkunft | Verwendung in der App |
|---|---|---|
| `tokens.json` | 1:1 aus dem Design System | Farben (hell/dunkel), Schriftstile, Abstände, Radien |
| `brand/wappen.svg` | Asset "wappen.svg" | App-Icon, Kopfbereich |
| `brand/lockup-fussball.svg` | Asset "lockup-fussball.svg" | Startbildschirm, "Über die App" |
| `fonts/*.woff2` | Fira Sans (SIL OFL, `fonts/OFL.txt`) | selbst gehostet, damit die App offline gleich aussieht |

Bei Änderungen am Design System: Dateien hier aktualisieren und per Pull Request einspielen. Die CI prüft danach automatisch Kontraste und Screenshots.

## Übertragung auf die App

### Name und Sprache
- Verein immer "Sportvg Feuerbach", auf engen Knöpfen kurz "Feuerbach". Nicht "SVF", "SportVg" oder "SpVgg".
- Du-Ansprache, kurze Sätze, Fakten zuerst. Höchstens ein Ausrufezeichen.
- Kinder nur mit Vornamen, nie mit Nachnamen oder Alter.

### Farben auf dem Spielbildschirm
| Element | Fläche | Schrift | Begründung |
|---|---|---|---|
| Tor-Knöpfe | Trikotfarbe des Spiels aus `trikot-farben.json` | `text` der Palette, fett, ab 24px | die Knöpfe sind die einzigen großen Farbflächen; Vorgabe Feuerbach Rot (= `vereinsrot`) |
| Rahmen um Tor-Knopf | – | `ink` 2px | nur wenn Trikotfarbe < 3:1 zum Hintergrund (z. B. Weiß hell, Schwarz dunkel) |
| Uhr-Knöpfe, Pausen-/Schlusspfiff | `surface` mit `ink`-Rahmen | `ink` | neutral, damit nichts mit einer Mannschaftsfarbe verwechselt wird |
| Hintergrund | `surface` | `ink` | |
| Torliste | `surface-alt` | `ink`, Meta in `ink-muted` | |
| Meldeband (Rückgängig, Hinweise) über den Tor-Knöpfen | `ink` | `surface`; Knöpfe darin `surface` mit Schrift `ink` | Umkehrung des Grundes wie der Hauptknopf, siehe unten |
| Hinweis "Halbzeit", "Abpfiff" | `rot-tief` | `on-rot` | kleine weiße Schrift nur auf `rot-tief` |
| Restzeit unter 1 Minute | `surface` | `rot-text` | |
| "Nächstes Spiel" nach dem Schlusspfiff (Spec 021) | `rot-tief` | `on-rot`, fett | steht an der Stelle der Tor-Knöpfe, siehe Abweichung unten |
| "Spieldetails" und "Ergebnis teilen" nach dem Schlusspfiff (Spec 021) | `surface` mit `ink`-Rahmen | `ink` | Zweitknöpfe: "Nächstes Spiel" ist die eine Hauptaktion der Seite |
| Torschützen-Auswahl direkt nach dem Tor (Spec 021) | `card`, Rahmen 2px `ink`, `radius-md` | `ink` | ohne Abdunkler über den Tor-Knöpfen angedockt; der Rahmen hebt sie ab wie die Uhr-Knöpfe, keine Schatten |

Der rote Balken mit `kopfzeile` (z. B. "TORTICKER") erscheint nur auf dem Startbildschirm. Auf dem Spielbildschirm gibt es keinen Balken, die Farbe kommt allein von den Trikotfarben.

**Abweichung vom Design System (begründet):** Trikotfarben sind Spieldaten, keine Markenfarben. Sie stehen in `design/trikot-farben.json` mit geprüfter Schriftfarbe und gelten nur für die Tor-Knöpfe und kleine Farbmarken neben den Mannschaftsnamen. Keine Emojis in der Oberfläche; Symbole als einfarbige Linien-Icons.

**Abweichung Meldeband (Spec 019, begründet):** Die Leiste "Tor … erfasst" mit "Rückgängig" stand bisher in `surface-alt` über der gleichfarbigen Torliste und war in der Sonne kaum von einer Listenzeile zu unterscheiden (Design-Check vom 07.11.2026). Bedienbarkeit am Spielfeldrand geht vor (Constitution I und VII): Das Band ist in beiden Themes die Umkehrung des Grundes (`ink`, Schrift `surface`), die Knöpfe darin `surface` mit Schrift `ink`, mindestens 64 × 64 pt. Es ist neutral, damit es nicht mit einer Trikotfarbe verwechselt wird, und liegt mit Abstand über den Tor-Knöpfen. Gilt für alle Meldungen des Spielbildschirms (Tor, Karte, Wechsel, Lesezeichen, "neu teilen", kurze Hinweise).

**Abweichung "Nächstes Spiel" (Spec 021, begründet):** Im Spiel ist der Hauptknopf neutral (`ink`), damit nichts mit dem Tor-Knopf Feuerbach verwechselt wird. Nach dem Schlusspfiff gibt es keine Tor-Knöpfe mehr; "Nächstes Spiel" ersetzt sie und ist dort die eine Hauptaktion. Er ist deshalb wie der Hauptknopf außerhalb des Spiels gestaltet (`rot-tief`, Schrift `on-rot`), über die volle Breite und mindestens 64 pt hoch (Constitution I).

**Ausnahme Teilen-Text (Spec 005):** Die Vorschau in den Spieldetails zeigt den WhatsApp-Text wörtlich, also mit seinen Emojis, und die Verlaufstabelle in der Systemschrift mit fester Breite (`--font-mono`, keine Vereinsschrift), damit die Spalten wie im Chat bündig stehen.

### Schrift
- Fira Sans als Ersatz für die Kaufschrift TheSans. Stile: `ergebnis` für Spielstand und Uhr, `zwischentitel` für Mannschaftsnamen, `text` für die Torliste, `label` für "1. HZ", "E1".
- Uhr und Spielstand mit gleich breiten Ziffern (`font-variant-numeric: tabular-nums lining-nums`). Die Mediävalziffern der Marke sind dekorativ und für eine laufende Uhr ungeeignet.

### Form
- Eckig: Flächen `radius-0`, Knöpfe `radius-sm` (2px). Keine Schatten, keine Verläufe.
- Karten (Abschnitte außerhalb des Spiels, Blätter, Abfragen) `radius-md` (6px), wie im Design System für "Karten auf Webseiten" vorgesehen (Spec 011).
- Abstände nur aus `space-1` bis `space-12`.
- Touch-Ziele mindestens 64 × 64 pt, die beiden Tor-Knöpfe zusammen etwa die untere Bildschirmhälfte.

### Wappen und Icon
- App-Icon: Wappen auf weißem Grund (`wappenfeld`), unverzerrt, mit Schutzraum. Für "maskable" Icons liegt das Wappen in der inneren sicheren Zone (80 %).
- Apple-Touch-Icon (180 px) und Android-Icons (192/512 px) werden im Build aus `brand/wappen.svg` erzeugt.
- Wappen nie umfärben, drehen oder mit Effekten versehen; Mindestgröße 24px.

### Karten und Grundfläche (Spec 011)

Vorbild ist der VeoCam-Kalender des Vereins: Was zusammengehört, steht auf einer Karte.

| Element | Fläche | Schrift | Begründung |
|---|---|---|---|
| Seitengrund außerhalb von Start und Spiel | `canvas` | `ink`, Meta `ink-muted` | getönt, damit Karten sich abheben |
| Karte, Blatt, Abfrage | `card`, Rand 1px `line`, `radius-md` | `ink` | ein Abschnitt = eine Karte |
| Überschrift einer Karte | – | `label` in `rot-text` | wie die roten Kleinüberschriften im VeoCam-Kalender |
| Eingabefeld, Auswahlliste | `field` mit `ink`-Rahmen | `ink` | dunkel vertieft gegenüber der Karte |
| Textvorschau, Begegnungs-Vorschau | `canvas` | `ink` | vertieft in der Karte |
| Ruhige Knöpfe (z. B. Ändern, Löschen in Listen) | `tonal` | `ink` | weniger Rahmen bei wiederholten Aktionen |
| Hauptknopf außerhalb des Spiels | `rot-tief` | `on-rot` | eine Hauptaktion je Seite, unterscheidbar von gewählten Chips (`ink`) |
| Hauptknopf im Spiel (z. B. Anpfiff) | `ink` | `surface` | neutral, nichts darf mit dem Tor-Knopf Feuerbach verwechselt werden |
| Aktiver Reiter unten | Marke oben `vereinsrot`, Fläche hinter dem Symbol `rot-hell` | `ink` | wo bin ich |
| Abdunkler hinter Blättern und Abfragen | `scrim`, Deckkraft 0,6 | – | dunkelt in beiden Themes ab |

**Abweichung vom Design System (begründet):** Die Tokens `canvas`, `card`, `tonal`, `field` und `scrim` sind App-Ergänzungen und stehen mit `usage` "App-Ergänzung (Spec 011)" in `tokens.json`. Im hellen Theme verwenden sie nur bestehende Werte. Im dunklen Theme sind drei Werte neu (#0b0b0b Grund und Feld, #2a2928 ruhige Knöpfe, #000000 Abdunkler), weil sich Karten mit den bestehenden Werten (#141414 auf #1f1f1f) kaum abheben und der Abdunkler mit `ink` (#f5f5f5) den Hintergrund aufhellte. Alle Textpaare liegen bei mindestens 5,8:1 (Kontrastmatrix in der CI).

### Dunkles Theme
- Folgt standardmäßig der Systemeinstellung. Markenflächen (`vereinsrot`, `rot-tief`, Wappen) bleiben gleich, `ink` und `surface` tauschen.
- Ebenen von dunkel nach hell: Grund `canvas`, Spielbildschirm `surface`, Karte `card`, ruhiger Knopf `tonal` (Spec 011).
- In den Einstellungen lässt sich "Hell" oder "Dunkel" festlegen ("Hell" empfohlen für den Einsatz in der Sonne).
