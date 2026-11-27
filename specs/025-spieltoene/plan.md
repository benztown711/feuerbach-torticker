# Implementation Plan: Spieltöne für Anpfiff, Abpfiff und Tore (Spec 025)

**Branch**: `claude/clever-mayer-m34eyn` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/92PXE3iS6DDDhWTuELTidN

## Summary

Sechs Ereignisse (Spielzeitende, Anpfiff, Pausenpfiff, Schlusspfiff, Tor für uns, Gegentor) mit je wählbarem Ton aus zehn Tönen. Fünf Töne erzeugt der Browser wie in Spec 008 (Pfiff, Langer Pfiff, Doppelpfiff, Glocke, Gong), fünf sind mitgelieferte CC0-Aufnahmen (Torhupe, Jubel, Torhupe mit Jubel, Kinderjubel, Raunen). Das freigeschaltete Audio-Element aus Spec 001 R-19 bleibt das einzige für Signale; es wechselt nur die Quelle. Ein PR (alle drei Stories hängen am selben Ton-Modell).

## Technical Context

Wie Spec 001 und 008; keine neue Laufzeit-Abhängigkeit. Neue statische Dateien `public/sounds/*.mp3` (zusammen etwa 160 KB), vom Service Worker vorab gespeichert. Datenänderung: `Settings.signalSound` wird zu `Settings.sounds` (Übernahme beim Laden, keine Datenbank-Migration). Eltern-Ansicht: neuer `localStorage`-Eintrag neben dem bisherigen Schalter.

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Ton sofort beim Tippen, keine zusätzliche Bedienung im Spiel; Auswahl außerhalb des Spielbildschirms | erfüllt |
| II. Offline-first und lokal | Aufnahmen liegen in der App (eigene Origin), Service Worker speichert sie vorab; kein fremder Server | erfüllt |
| III. Datensparsamkeit | Töne sind Geräteeinstellungen, nichts wird übertragen | erfüllt |
| IV. Spec-first und Test-first | Unit-Tests "025 FR-T0x", E2E "025 USn-Sm" vor dem Code, 100 % Branch-Coverage in `src/domain` | erfüllt |
| VI. Einfachheit | Feste Liste, keine Lautstärke je Ton, keine eigenen Dateien der Nutzer | erfüllt |
| VII. Vereinsdesign | Auswahl wie "SIGNALTON" (Tokens, eckig, keine Emojis) | erfüllt |
| IX. Hilfe | Einträge laut Spec-Abschnitt "Hilfe" im selben PR | erfüllt |

## Research

### R-T1 Aufnahmen (Hörprobe 26.11.2026)

- **Decision**: Freesound, nur CC0: Torhupe 414208, Jubel 189821 (Ausschnitt ab 23,0 s), Kinderjubel 438421, Raunen 619007. "Torhupe mit Jubel" mischt 414208 und 189821 (Jubel 1,1 s versetzt). Zuschnitt mit kurzer Ein- und Ausblendung, Kompressor und Spitzenpegel −0,4 dBFS, Mono, MP3 96 kbit/s. Abweichung von Spec 008 R-K1 ("keine Audiodateien"): ein Jubel lässt sich nicht überzeugend erzeugen (Atti, Klärung 26.11.).
- **Format**: MP3 spielt in Safari, Chrome und Firefox; WAV wäre 10-mal größer.
- **Alternatives considered**: Jubel im Browser erzeugen (klingt nach Rauschen); CC-BY-Sammlung von Gregor Quendel (Namensnennung nötig, 20 MB).

### R-T2 Ein Element für alle Töne

- Spec 001 R-19 und Spec 008 R-K2: iOS spielt später ohne Berührung nur ein Element, das einmal innerhalb einer Berührung gestartet wurde; ein Wechsel von `src` hebt das nicht auf. Darum spielt dasselbe Element alle Töne, `data-sound` nennt den aktuellen (Tests).
- **Konflikt mit der Freischaltung**: `unlockAudio()` startet das Element stumm und hält es nach dem Start wieder an. Kommt `pointerdown` (Freischaltung) vor dem `click` des Tor-Knopfs (Ton), würde das Anhalten den Ton abschneiden. Lösung: Zähler je Abspielauftrag; die Freischaltung hält nur an, wenn seitdem kein Ton gestartet wurde.
- Erzeugte Töne als Blob-URL je Ton einmal (höchstens fünf, zusammen rund 0,9 MB), Aufnahmen über ihre Adresse unter `BASE/sounds/`.

### R-T3 Ereignisse in der Eltern-Ansicht

- Die Meldung trägt die Uhr-Ereignisse (`clock`: `kickoff`, `sectionEnd`, `fullTime`) und die Tore, aber keine Torzeit. `BoardCard` bekommt die Anzahl je Pfiff-Art und die Art des letzten Pfiffs.
- **Decision** (FR-T07, "höchstens ein Ton je Meldung"): je Karte mit frischer Meldung (wie FR-E21, unter 1 Minute alt) zählt nur, was seit dem vorigen Stand neu ist. Ist der letzte neue Pfiff Pausen- oder Schlusspfiff, spielt dessen Ton (er folgt auf Tore). Sonst spielt bei neuen Toren der Ton des neuesten Tors ("Tor für uns" bzw. "Gegentor"), sonst beim neuen Anpfiff der Anpfiff-Ton. Bei mehreren Karten zählt die zuletzt gemeldete.
- Elfmeterschießen, "Uhr anhalten" und Verlängerungs-Vorbereitung lösen in der Eltern-Ansicht keinen Ton aus (YAGNI).

### R-T4 Eltern-Einstellungen

- Bisher `torticker-goal-sound` = `'1'|'0'` (Spec 020). Bleibt als Schalter "Töne" (FR-T06, "an bleibt an"). Neu `torticker-parent-sounds` mit den fünf Ereignis-Tönen als JSON; fehlende oder unbekannte Werte → Vorbelegung.
- Das tickernde Eltern-Handy (Spec 024) liest dieselben fünf Werte; Spielzeitende bleibt dort der Vorgabe-Pfiff (Eltern haben keine Einstellungen).

## Design

- `src/domain/types.ts`: `SignalSound` um sieben Töne erweitert, `SoundChoice = SignalSound | 'aus'`, `SoundEvent`, `SoundSettings`; `Settings.sounds` ersetzt `Settings.signalSound`.
- `src/domain/signal-sound.ts`: `SIGNAL_SOUNDS` (zehn, mit `file` für Aufnahmen), `SOUND_EVENTS` (Name, Hinweis), `DEFAULT_SOUNDS`, `normalizeSounds(stored, legacy)`, `soundChoiceName`, `isSynthSound`; `renderSignal` für die fünf erzeugten Töne (Pfiff-Muster als Parameter).
- `src/domain/settings.ts`: `withSettingsDefaults` übernimmt `signalSound` als `sounds.timeUp` und entfernt das alte Feld.
- `src/domain/sound-alert.ts` (neu): `whistleCounts(clock, sections)`, `newSoundEvent(prev, cards, serverNow)`, `parentSounds(raw)`.
- `src/domain/live-board.ts`: `BoardCard.whistles`.
- `src/platform/signal.ts`: `playSound(choice)` (ohne Vibration, auch Freischaltung), Zähler gegen das Anhalten durch `unlockAudio`, `setSignalSound` nur noch für Spielzeitende, Quellen für Aufnahmen.
- `src/ui/screens/settings.tsx`: Abschnitt "TÖNE" mit sechs Zeilen, Blatt je Ereignis (Liste wie bisher, plus "Aus").
- `src/ui/screens/game.tsx`: Töne bei Anpfiff (auch Verlängerung), bestätigtem Pausen-/Schlusspfiff, gezähltem Tor (auch "Tor + weiter") und Treffer im Elfmeterschießen; Quelle: Einstellungen bzw. Eltern-Töne.
- `src/ui/screens/live-dashboard.tsx`, `src/ui/use-goal-alert.ts`: Schalter "Töne", "Töne wählen", Ton je Ereignis.
- `src/ui/screens/new-game.tsx`: Hinweis "Spielzeitende: …".
- `vite.config.ts`: `mp3` in `globPatterns`.
- `public/sounds/*.mp3`, `public/sounds/QUELLEN.md`.

## Bundle

Neue Logik rund 1,5 KB gzip im Hauptbundle (Ton-Modell, Ereignis-Töne im Spiel); Eltern-Teil im nachgeladenen Dashboard. Budget 60 KB bleibt eingehalten.
