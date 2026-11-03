# Vertrag: Geteilter Ergebnistext

Erzeugt von `src/domain/share-text.ts`, geteilt per Web Share API (`navigator.share({ text })`), Fallback Zwischenablage. Format seit Spec 005 ("Anzeigetafel in Farbe"); Zielgruppe WhatsApp (`*fett*`, ``` für Festbreitenschrift).

## Format

````text
*{Heim} {ToreHeim}:{ToreGast} {Gast}*
[*{Sieger} gewinnt {x}:{y} im Elfmeterschießen*]
[{Info} · {Info} …]
[{Wochentag}, {TT.MM.JJJJ}, {HH:MM} Uhr]
[```
{Symbol} {Minute}  {Stand}  {Text}
··· {Trennzeile} ···
…
```]
[Schützen: {Name}, …]
[*Torschützen*
{Name} ⚽⚽ · {Name} ⚽ · …]
````

Regeln (Spec 005 FR-S01 bis FR-S08):
- Kopfzeile fett, ohne Emoji, Heim zuerst.
- Siegerzeile nur nach beendetem Elfmeterschießen; Feuerbach mit Kurzname ("Feuerbach E1"), Stand aus Sicht des Siegers. Ohne Unterschied: "\*Elfmeterschießen 3:3\*" (Heim zuerst).
- Infozeile aus: Zwischenstand-Zusatz ("Zwischenstand 37'", "Halbzeit", "Pause", "vor der Verlängerung"), "nach Verlängerung", "Halbzeit 3:2" (mehr als ein Abschnitt, nicht in der Halbzeitpause), "Elfmeterschießen läuft". Entfällt, wenn leer.
- Datumszeile außer beim Zwischenstand; ohne Anpfiff nur "Sa, 07.11.2026".
- Tabelle: Tore, Karten, Wechsel chronologisch. Genau ein Symbol je Zeile, Minute rechtsbündig, Stand Heim:Gast linksbündig (nur bei Toren; ohne Tore keine Stand-Spalte), Spalten durch zwei Leerzeichen getrennt, Breiten nach dem längsten Eintrag des Spiels.
- Symbole: Feuerbach 🔴; Gegner nach Trikotfarbe (Rot ⭕, Schwarz ⚫, Weiß/Grau ⚪, Gelb 🟡, Orange 🟠, Grün 🟢, Hellblau/Blau/Dunkelblau 🔵, Lila 🟣, Bordeaux 🟤, unbekannt ⚪); Gelb 🟨, Gelb-Rot 🟥 "(Gelb-Rot)", Rot 🟥, Zeitstrafe ⏱️ "(Zeitstrafe)", Wechsel 🔄.
- Text: Torschütze (Vorname aus dem Kader, "Eigentor", Freitext wie "Nr. 9"), " (Elfmeter)" bei Elfmeter; Karten mit Spieler, beim Gegner mit "(Gegner)", ohne Spieler "Gegner" bzw. Kurzname; Wechsel "{rein} für {raus}".
- Trennzeilen: "··· Halbzeit ···" (zwei Abschnitte), sonst "··· 2. Drittel ···" / "··· 2. Viertel ···"; "··· Verlängerung ···" vor der Verlängerung; zwischen deren Hälften keine. Ohne echte Zeile keine Tabelle.
- Elfmeterschießen (ab einem Schuss): "··· Elfmeterschießen ···", dann je Mannschaft (Heim zuerst) Symbol, ✅/❌ je Schuss, zwei Leerzeichen, Treffer. "Schützen:" mit eigenen Schützen in Schussreihenfolge ("?" ohne Namen), nur wenn mindestens einer benannt ist.
- Torschützen: eigene Tore mit Spieler oder Freitext, meiste Tore zuerst, bei Gleichstand das frühere erste Tor. Steht ein "Schützen:" davor, trennt eine Leerzeile.
- Gelöschte Tore fehlen, Lesezeichen nie, keine Nachnamen.

## Beispiel (Heimspiel, 2 × 25)

````text
*Sportvg Feuerbach E1 7:4 TSV Musterstadt*
Halbzeit 3:2
Sa, 07.11.2026, 10:30 Uhr
```
🔴    4'  1:0  Max
⚫    9'  1:1
🔴   14'  2:1  Ben
🔴   21'  3:1  Max
⚫   24'  3:2  Nr. 9
··· Halbzeit ···
🔴   28'  4:2  Tom
⚫   33'  4:3
🔴   38'  5:3  Max
🔴   41'  6:3  Leo
⚫   46'  6:4
🔴 50+1'  7:4  Ben
```
*Torschützen*
Max ⚽⚽⚽ · Ben ⚽⚽ · Tom ⚽ · Leo ⚽
````

## Beispiel (Pokal, Gegner in Rot)

````text
*Sportvg Feuerbach C1 3:3 TSV Musterstadt*
*Feuerbach C1 gewinnt 4:3 im Elfmeterschießen*
nach Verlängerung · Halbzeit 1:1
Sa, 07.11.2026, 10:30 Uhr
```
🔴 12'  1:0  Ben
⭕ 30'  1:1
··· Halbzeit ···
🔄 41'       Leo für Paul
🔴 48'  2:1  Max
🟨 52'       Tom
⭕ 66'  2:2
··· Verlängerung ···
🔴 76'  3:2  Leo
🟥 84'       Nr. 4 (Gegner)
⭕ 88'  3:3
··· Elfmeterschießen ···
🔴 ✅ ✅ ❌ ✅ ✅  4
⭕ ✅ ❌ ✅ ✅ ❌  3
```
Schützen: Max, Ben, Tom, Leo, Maxi

*Torschützen*
Ben ⚽ · Max ⚽ · Leo ⚽
````

## Zwischenstand (FR-042)

Während des Spiels aus dem "…"-Menü. Wie oben, aber die Infozeile beginnt mit dem Zusatz und es gibt keine Datumszeile:

````text
*Sportvg Feuerbach E1 4:3 TSV Musterstadt*
Zwischenstand 37' · Halbzeit 3:2
```
…
```
````
