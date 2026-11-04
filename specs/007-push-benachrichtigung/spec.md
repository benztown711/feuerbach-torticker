# Feature Specification: Benachrichtigung bei Toren (Push) und dauerhafter Endstand

**Feature Branch**: `007-push-benachrichtigung`

**Created**: 2026-11-04

**Status**: Backlog (nach Spec 006)

**Input**: Review B zu Spec 006 (04.11.2026): "Ich würde für den Moment C wählen und danach B angehen." Variante B: Meldung direkt vom Dashboard über einen eigenen kleinen, kostenlosen Dienst (SaaS), ohne zweite App.

## Idee

Eltern, die das Dashboard "Unser Spieltag" (Spec 006) auf dem Home-Bildschirm gespeichert haben, bekommen bei Anpfiff, Tor, Halbzeit und Endstand eine Meldung auf dem Sperrbildschirm, ohne zusätzliche App. Derselbe Dienst hält den letzten Stand jeder Mannschaft vor, sodass ein Endstand für alle bis zum nächsten Spiel sichtbar bleibt (heute nur rund 12 Stunden, Grenze des Vermittlungsdienstes aus Spec 006).

## Erste Anforderungen (Entwurf)

- **FR-N01**: Im Dashboard MUSS es einen Knopf "Bei Toren benachrichtigen" geben; auf dem iPhone mit Hinweis, dass Meldungen nur funktionieren, wenn das Dashboard auf dem Home-Bildschirm liegt.
- **FR-N02**: Meldungen MÜSSEN je Mannschaft abbestellbar sein (z. B. nur E2).
- **FR-N03**: Der letzte Stand jeder Mannschaft MUSS bis zum nächsten Spiel für alle Zuschauer abrufbar sein (ersetzt die 12-Stunden-Grenze aus Spec 006 FR-L16).
- **FR-N04**: Betrieb MUSS kostenlos bleiben (Constitution VIII) und darf nur ein kostenloses Konto beim Anbieter erfordern.

## Offene Fragen (vor `/speckit-clarify` für 007)

1. Anbieter: Cloudflare (Workers, kostenloses Konto) oder ein anderer kostenloser Dienst? Wer verwaltet das Konto?
2. Constitution: "kein eigener Server" (Prinzip II, Version 2.0.0) wäre mit einem eigenen kleinen Dienst erneut zu ändern. Wie weit soll die Ausnahme gehen?
3. Was steht in der Meldung (Torschützen ja/nein), und sieht der Dienst Klartext oder bleibt alles Ende-zu-Ende verschlüsselt?
4. Ersetzt der eigene Dienst auch ntfy.sh als Vermittler für das Dashboard (ein Dienst statt zwei)?
