# Vertrag: Geteilter Ergebnistext

Erzeugt von `src/domain/share-text.ts`, geteilt per Web Share API (`navigator.share({ text })`), Fallback Zwischenablage.

## Format

```text
⚽ {Heim} - {Gast} {toreHeim}:{toreGast} ({hzHeim}:{hzGast})
{Datum}, Anpfiff {HH:MM}
{Minute} {StandHeim}:{StandGast} {Torschütze}
...
```

Regeln:
- Erste Zeile: Heim zuerst, wie auf dem Spielbildschirm. Halbzeitstand nur bei mehr als einem Abschnitt.
- Datum `TT.MM.JJJJ`.
- Eine Zeile pro Tor in zeitlicher Reihenfolge, gelöschte Tore ausgenommen.
- Torschütze: eigene Tore Vorname aus dem Kader, Eigentor als "Eigentor", Gegentore Freitext (z. B. "Nr. 9"). Kein Torschütze: Zeile endet nach dem Stand.
- Keine Nachnamen (Kader erlaubt nur Vornamen/Kürzel).
- Kein Spiel ohne Tore: dann nur die ersten zwei Zeilen.

## Beispiel (Auswärtsspiel, 2 × 25)

```text
⚽ TSV Musterstadt - Sportvg Feuerbach 1:3 (1:1)
07.11.2026, Anpfiff 10:30
7' 0:1 Max
18' 1:1 Nr. 9
31' 1:2 Ben
50+2' 1:3 Eigentor
```

## Zwischenstand (FR-042)

Während des Spiels aus dem "…"-Menü. Wie oben, die erste Zeile bekommt einen Zusatz:

```text
⚽ Sportvg Feuerbach U11 - TSV Musterstadt 2:1 (1:1) · Zwischenstand 37'
07.11.2026, Anpfiff 10:30
7' 1:0 Max
18' 1:1
31' 2:1 Ben
```

- Uhr läuft oder angehalten: " · Zwischenstand {Minute}" mit Minute wie FR-005 (z. B. "25+2'").
- Pause zwischen Abschnitten: " · Halbzeit" bei zwei Abschnitten, sonst " · Pause"; der Halbzeitstand in Klammern entfällt, weil er dem Spielstand entspricht.
