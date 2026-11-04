# Implementation Plan: Signalton wählbar (Spec 008)

**Branch**: `008-signalton` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/6XxXPXXSyYYcCDkRDMW1GV

## Summary

Drei im Browser erzeugte Signaltöne (Pfiff, Glocke, Gong) statt der drei harten Pieptöne. Auswahl in den Einstellungen, gespeichert in `Settings.signalSound`, Vorgabe Pfiff. Das Audio-Element aus Spec 001 R-19 bleibt; nur seine WAV-Quelle wechselt. Ein PR.

## Technical Context

Wie Spec 001; keine neue Abhängigkeit. Datenänderung nur in den Einstellungen (neues Feld mit Vorgabe, keine Migration nötig).

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Pfiff als Standard so laut wie bisher; Auswahl außerhalb des Spielbildschirms | erfüllt |
| II. Offline-first und lokal | Töne werden auf dem Gerät erzeugt, keine Dateien, kein Netz | erfüllt |
| IV. Spec-first und Test-first | Unit-Tests "008 FR-K0x", E2E "008 US1-Sx" vor dem Code, 100 % Branch-Coverage in `src/domain` | erfüllt |
| VI. Einfachheit | Drei feste Töne, keine Lautstärke- oder Längen-Optionen | erfüllt |
| VII. Vereinsdesign | Auswahlliste mit Tokens, eckig, keine Emojis | erfüllt |

## Research

### R-K1 Klangerzeugung (Hörprobe vom 04.11.2026)

- **Befund**: Der bisherige Ton ist ein 2,9-kHz-Sinus, dreifach übersteuert, bei 22,05 kHz Abtastrate. Das ergibt ein Rechteck mit zurückgefalteten, unharmonischen Obertönen (Spektrogramm: Linien bei 1,2, 2,2, 7,5 und 8,6 kHz) und harte Ein- und Ausschaltkanten. Das klingt nach Warnsirene.
- **Decision**: 44,1 kHz Abtastrate, je Ton eine reine Funktion in `src/domain/signal-sound.ts`:
  - Pfiff: Sinus 3150 Hz mit Kugel-Triller (≈ 36 Hz, Frequenz ±2,8 %, Amplitude −32 %), Anblas-Glissando, Atemrauschen über einen Resonator um 3150 Hz, weiche Sättigung (tanh) vor dem Zumischen der 2. Harmonischen, damit nichts unterhalb des Grundtons zurückfaltet. Muster 0,16 s, 0,16 s, 0,72 s.
  - Glocke: modale Synthese, sieben Teiltöne einer kleinen Glocke (1; 2,02; 2,76; 3,92; 5,4; 6,83; 8,9 × 1180 Hz) mit je eigener Abklingzeit, jeder Teilton doppelt und leicht verstimmt (Schwebung), heller Anschlag-Klick. Drei Schläge im Abstand von 0,3 s.
  - Gong: G5, C6, E6 im Abstand von 0,38 s, je Grundton mit Oktave, Duodezime und einem leicht unharmonischen Teilton, lange Abklingzeit.
  - Schwingungen per Rekursion (`s[n] = 2·cos(w)·s[n−1] − s[n−2]`) und multiplikativem Abklingen statt `Math.sin` je Abtastwert: die Erzeugung bleibt im Tap-Handler unter wenigen Millisekunden.
  - Rauschen über einen festen Zufallsgenerator: gleiche Eingabe, gleiche Datei (testbar).
- **Messung** (EBU R128, maximale Momentary-Lautheit nach zweifachem Hochpass 700 Hz als Nachbildung eines Handy-Lautsprechers): bisher −0,7 LUFS, Pfiff −0,2, Glocke −3,3, Gong −5,8. Daraus SC-K02.
- **Alternatives considered**: Tröte (Stadionhorn) in der Hörprobe, von Atti nicht gewählt; Audiodateien im Repo (größer, Lizenzfrage, kein Vorteil).

### R-K2 Wechsel des Tons am freigeschalteten Element

- iOS erlaubt späteres Abspielen ohne Berührung für ein Element, das einmal innerhalb einer Berührung gestartet wurde (R-19). Ein Wechsel der Quelle (`src`) hebt das nicht auf. Der Tonwechsel tauscht daher nur `src` desselben Elements; die Hörprobe in den Einstellungen startet ohnehin innerhalb der Berührung.
- Blob-URLs werden je Ton einmal erzeugt und behalten (höchstens drei, zusammen rund 0,5 MB).

## Design

- `src/domain/types.ts`: `SignalSound = 'pfiff' | 'glocke' | 'gong'`, `Settings.signalSound`.
- `src/domain/signal-sound.ts` (neu, rein): `SIGNAL_SOUNDS` (Reihenfolge, Name, Beschreibung), `DEFAULT_SIGNAL_SOUND`, `isSignalSound`, `signalSoundName`, `renderSignal(sound)` → `Float32Array`, `encodeWav(samples, rate)` → `ArrayBuffer`, `SIGNAL_SAMPLE_RATE`.
- `src/domain/settings.ts`: Vorgabe `'pfiff'`; `withSettingsDefaults` ersetzt fehlende oder unbekannte Werte.
- `src/platform/signal.ts`: `buildSignalWav` entfällt; `setSignalSound(sound)` tauscht die Quelle des Signal-Elements und setzt `data-sound`; `previewSignal(sound)` = setzen + sofort spielen; stille Tonspur über `encodeWav`.
- `src/main.tsx`: beim Start `setSignalSound(settings.signalSound)`.
- `src/ui/screens/settings.tsx`: Abschnitt "SIGNALTON" zwischen "IM SPIEL ERFASSEN" und "DARSTELLUNG", `role="radiogroup"` mit Zeilen `role="radio"`, `aria-checked`; Testkennungen `signal-sound-<id>`.
- `src/ui/screens/new-game.tsx`: `setSignalSound` beim Laden der Einstellungen; Hinweis mit Tonnamen (FR-K05).
- `src/ui/screens/help.tsx`: "Der Signalton (Pfiff, Glocke oder Gong, wählbar in den Einstellungen) …".
- `tests/e2e/fixtures.ts`: `recorded().lastSound` aus `data-sound` des zuletzt hörbar gestarteten Elements.
- Spec 001: Verweise in FR-036 und FR-039 auf Spec 008.

## Bundle

Erzeugungscode rund 1,5 KB gzip; Budget 60 KB bleibt eingehalten (Prüfung `npm run budget`).
