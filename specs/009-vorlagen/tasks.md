# Tasks: Vorlagen (Spec 009)

Tests zuerst, müssen fehlschlagen. [P] = parallel möglich. Testnamen beginnen mit "009 FR-V…" bzw. "009 USx-Sy".

## Grundlagen (blockiert alle Stories)

- [x] V001 [P] `tests/unit/assists.test.ts` neu: FR-V05 (`canHaveAssist`; `setAssist` gültig sowie abgelehnt bei Gegentor, ohne Torschützen, "Eigentor Gegner", Elfmeter, Vorlagengeber = Torschütze, unbekanntem Tor; `null` entfernt; `setScorer` entfernt die Vorlage bei neuem Torschützen = Vorlagengeber, "Ohne Torschütze", "Eigentor Gegner"; `setPenalty(true)` entfernt sie, Abwählen bringt sie nicht zurück), FR-V06/FR-V09/FR-V11 (`assistLabel`, `assistSuffix` " (Vorlage: Ben)", `goalWho`: eigenes Tor mit und ohne Vorlage ohne Mannschaftsnamen, ohne Torschützen Kurzform, Gegentor ohne Torschützen Gegnername, mit Freitext "Nr. 9 (TSV Musterstadt)", "Eigentor", "(Elfmeter)", gelöschter Spieler lesbar, entferntes Tor behält seine Vorlage, nie Rückennummer), FR-V01 (Vorgabe `features.assists = false`, ältere Einstellungen ohne Feld → `false`, `anyEventFeature` bleibt `false`, wenn nur `assists` an ist)
- [x] V002 `src/domain/types.ts` (`Goal.assist?: string | null`, `EventFeatures.assists`), `src/domain/goals.ts`, `src/domain/settings.ts` (macht V001 grün, 100 % Branch-Coverage)
- [x] V003 [P] `tests/unit/export.test.ts`: FR-V10 Sicherung mit `assist` gemäß Schema, Sicherung ohne `assist` weiter gültig, ungültige Werte (leerer Text, Zahl, über 200 Zeichen) abgelehnt
- [x] V004 `src/domain/export.ts`, `specs/001-spiel-erfassen/contracts/export.schema.json` (`assist`: Text 1 bis 200 Zeichen oder `null`, optional) (macht V003 grün)

## US1: Vorlage direkt nach dem Tor (P1)

- [x] V005 [P] [US1] `tests/e2e/vorlagen.spec.ts` neu: 009 US1-S1 bis S8 (Schalter `feature-assists`; `assist-picker` mit Untertitel "Tor in Minute 12' · Max", `assist-option-<id>` ohne den Torschützen, `assist-others`, `assist-skip` "Ohne Vorlage (5 s)" mit `page.clock`, kein Folgeschritt nach `scorer-own-goal`/`scorer-skip`, `btn-undo` im Folgeschritt)
- [x] V006 [US1] `src/ui/components/scorer-picker.tsx` (`kind: 'scorer' | 'assist'`, Testkennungen `assist-*`), `src/ui/screens/game.tsx` (Zustand `picker.kind`, `ASSIST_MS = 5000`, Folgeschritt nur in der Schnellauswahl bei Schalter an und gültigem Tor), `src/ui/screens/settings.tsx` (Schalter "Vorlagen", Erklärung "Nach dem Torschützen fragen, wer vorgelegt hat. Nur eigene Tore.") (macht V005 grün)

## US2: Vorlage nachträglich ändern (P1)

- [x] V007 [P] [US2] in `tests/e2e/vorlagen.spec.ts`: 009 US2-S1 bis S5 (`goal-edit-assist`, Fenster ohne Countdown mit `assist-clear` "Ohne Vorlage" und "Abbrechen", Knopf fehlt bei Gegentor, ohne Torschütze, "Eigentor Gegner", Elfmeter und Schalter aus; gespeicherte Vorlage bleibt sichtbar)
- [x] V008 [US2] `src/ui/screens/game.tsx`: Knopf "Vorlage ändern" im Tor-Fenster (macht V007 grün)

## US4: Schlanke Anzeige, nur Namen (P1)

- [x] V009 [P] [US4] in `tests/e2e/vorlagen.spec.ts`: 009 US4-S1 bis S5 (Torliste, Titel des Tor-Fensters, Spieldetails; Kader mit Nummern, Knöpfe "7 Max"; ohne Aufgebot zeigt "Vorlage von?" den ganzen Kader ohne den Torschützen), SC-V05 (Profil `iphone-se`: Zeile "Moritz (Vorlage: Anton)" ungekürzt); bestehende Erwartungen in `tests/e2e/us3-torschuetze.spec.ts` (001 US3-S1) und `tests/e2e/ereignisse.spec.ts` (003 US1-S1) auf FR-V11 umstellen
- [x] V010 [US4] `src/ui/components/goal-list.tsx`, Titel des Tor-Fensters in `src/ui/screens/game.tsx`, `src/ui/screens/game-details.tsx` mit `goalWho` (macht V009 grün)

## US3: Teilen-Text und Live-Dashboard (P2)

- [x] V011 [P] [US3] `tests/unit/share-text.test.ts`: FR-V07 (Zeile "Max (Vorlage: Ben)", Zeile "\*Torschützen\*" unverändert, Zwischenstand, entfernte Tore ohne Vorlage); `tests/unit/live-snapshot.test.ts`: FR-V08 (Senden als Anzeigename, höchstens 40 Zeichen, leer → `null`, nie Rückennummer; Einlesen mit und ohne `assist`; ungültiges `assist` verwirft den Stand; US3-S4: unbekanntes Zusatzfeld in einem Tor wird angenommen); `tests/unit/live-board.test.ts`: Torverlauf "Max (Vorlage: Ben)"
- [x] V012 [US3] `src/domain/share-text.ts`, `src/domain/live-snapshot.ts`, `src/domain/live-board.ts`, `specs/006-live-spieltag/contracts/live-message.md` (macht V011 grün)
- [x] V013 [P] [US3] in `tests/e2e/vorlagen.spec.ts`: 009 US3-S1/S2 (Teilen-Text über `recorded().shares`), US3-S3 (Dashboard aufgeklappt, Helfer aus `tests/e2e/live-helpers.ts`)

## Abschluss

- [x] V014 Spec-Status (die Hilfe beschreibt die Schalter aus Spec 003 nicht, daher keine Änderung an `help.tsx`); `npm run lint`, `npm run typecheck`, `npm run test:cov`, `npm run budget`, E2E in allen drei Profilen inklusive axe und visuellem Vergleich; Screenshots iPhone hell und dunkel an Atti

## Abhängigkeiten

V002 vor allen Stories (Datenmodell, `goalWho`). US1 und US2 teilen `game.tsx` (nacheinander). US4 braucht nur V002. US3 braucht V002, nicht die UI. Startpunkt (MVP): Grundlagen + US1 + US4.
