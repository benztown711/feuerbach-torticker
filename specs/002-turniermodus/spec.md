# Feature Specification: Turniermodus (Spiele fremder Mannschaften erfassen)

**Feature Branch**: `002-turniermodus`

**Created**: 2026-11-02

**Status**: Backlog (Priorität 2, nach Spec 001)

**Input**: User description: "Turniermodus wäre auch praktisch. Dann gibt man beide Gegnernamen ein und hat danach dieselben Funktionen. Lediglich der Kader würde ausgeblendet werden. Beim Gegner könnte man generell ins Textfeld auch die Rückennummer des Spielers eintragen."

## Idee

Bei Turnieren (z. B. Hallenturnier der Sportvg Feuerbach) sollen auch Spiele erfasst werden, an denen die Sportvg Feuerbach nicht beteiligt ist. Statt "Gegner + Heim/Auswärts" werden zwei Mannschaftsnamen eingegeben. Alles andere funktioniert wie in Spec 001: Uhr, Tor-Knöpfe, Minute, Nachspielzeit, Teilen, Historie.

## Erste Anforderungen (Entwurf)

- **FR-T01**: Beim Anlegen eines Spiels MUSS zwischen "Spiel der Sportvg Feuerbach" und "Turnierspiel (zwei Mannschaften)" gewählt werden können.
- **FR-T02**: Im Turnierspiel MÜSSEN beide Mannschaftsnamen frei eingegeben werden; links Mannschaft A, rechts Mannschaft B.
- **FR-T03**: Der Kader MUSS im Turnierspiel ausgeblendet sein; Torschützen beider Seiten werden als Freitext (Name oder Rückennummer) erfasst.
- **FR-T04**: Turnierspiele MÜSSEN in der Historie als solche erkennbar sein.
- **FR-T05** (ergänzt 03.11.2026): Spieltage im Kinderfußball (U6 bis U11, WFV 3 gegen 3 bis 5 gegen 5, viele Kurzspiele mit Feuerbach-Beteiligung): "Nächstes Spiel" mit einem Tap (gleiche Mannschaft, Spielzeit und Trikots, nur neuer Gegner) und ein gemeinsamer Teilen-Text für den Spieltag.

## Offene Fragen (vor `/speckit-clarify` für 002)

1. Gestaltung: Keine der beiden Mannschaften ist Feuerbach. Welche Farben bekommen die Tor-Knöpfe? (Vorschlag: beide neutral, links `ink`, rechts `surface-alt` mit Rahmen; Rot bleibt Feuerbach vorbehalten.)
2. Sollen Turnierspiele zu einem Turnier gruppiert werden (Tabelle, Punkte, ein gemeinsamer Teilen-Text), oder bleibt jedes Spiel einzeln?
3. Mannschaftsnamen für den Turniertag vorab als Liste anlegen, damit sie per Tap statt Tippen auswählbar sind?
