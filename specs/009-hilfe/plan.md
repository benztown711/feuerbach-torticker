# Implementation Plan: Hilfe mit Suche

**Branch**: `009-hilfe` (umgesetzt auf `claude/dreamy-brown-r90cgx`) | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/TfSS1AHKmfGeD3otJ66P6j (Runde 2, freigegeben)

## Summary

Die Hilfe-Seite aus T086 wird durch eine durchsuchbare Hilfe mit rund 40 Einträgen in 11 Themen ersetzt. Inhalte und Suche liegen als reine Funktionen in der Domäne (100 % Branch-Coverage), die Oberfläche wird nachgeladen (Bundle-Budget). Die Eltern-Ansicht bekommt eine eigene Leiste "Spieltag · Teilen · Hilfe". Eine Prüfung "Hilfe-Abdeckung" läuft als Unit-Test in `npm run test:cov` und blockiert damit den Merge (Constitution IX).

## Technical Context

Unverändert gegenüber `specs/001-spiel-erfassen/plan.md` (TypeScript, Preact, IndexedDB, Vitest, Playwright). Keine neue Abhängigkeit: Die Suche über rund 40 Einträge ist eine eigene, kleine Funktion (Constitution VI); eine Volltext-Bibliothek würde das Budget belasten und nichts verbessern.

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Suchfeld oben, Treffer beim Tippen, Zeilen mindestens 52 pt hoch, Knöpfe 48 pt; Hilfe auch während eines Spiels erreichbar (FR-037) | erfüllt |
| II. Offline-first und lokal | Inhalte werden mit der App ausgeliefert und vom Service Worker vorgehalten; Suche ohne Netzanfrage (FR-H14, Offline-Test) | erfüllt |
| III. Datensparsamkeit | Suchbegriff wird weder gespeichert noch übertragen; Inhalte nur mit fiktiven Namen; Teilen gibt nur den vorhandenen Zuschauer-Link weiter (FR-H17) | erfüllt |
| IV. Spec-first und Test-first | Domäne `help-search.ts`, `help-entries.ts` mit 100 % Branch-Coverage, E2E je Akzeptanzszenario ("009 USx-Sy"), Prüfung `check-help.ts` mit eigenen Tests | erfüllt |
| V. Zeit ist eine Berechnung | nicht berührt | – |
| VI. Einfachheit | Keine Bibliothek, keine Screenshots in der Hilfe, keine Kontext-Hilfe (Backlog) | erfüllt |
| VII. Vereinsdesign | Nur Tokens; Hervorhebung hell `rot-hell`/`ink`, dunkel `rot-tief`/`on-rot` (Kontrastmatrix ergänzt) | erfüllt |
| VIII. Kostenfrei | keine Dienste | erfüllt |
| IX. Hilfe ist Teil jeder Funktion | Diese Spec liefert die Hilfe und die Prüfung selbst; 009 US1 bis US3 haben eigene Einträge | erfüllt |

## Design

### Inhalte (`src/domain/help-entries.ts`)

```ts
type HelpTopic = 'start' | 'spiel' | 'ereignisse' | 'pokal' | 'teilen' | 'kader' | 'historie' | 'live' | 'einstellungen' | 'probleme' | 'datenschutz';
interface HelpEntry {
  id: string;            // Adresse #/hilfe/<id>, Kleinbuchstaben und Bindestriche
  topic: HelpTopic;
  title: string;         // Frage
  answer: string;        // höchstens 600 Zeichen
  steps?: string[];      // nummerierte Schritte
  keywords: string;      // Alltagswörter, nicht angezeigt (FR-H04)
  sources: string[];     // "006 US3" oder "001 FR-036" (FR-H20), nicht angezeigt
  parents?: boolean;     // auch in der Eltern-Hilfe (FR-H16)
  open?: { label: string; path: string }; // "Einstellungen" → Knopf "Einstellungen öffnen" (FR-H10)
  related?: string[];    // bis zu drei IDs (FR-H11)
}
HELP_TOPICS: { id: HelpTopic; name: string }[]   // Reihenfolge laut FR-H08
HELP_ENTRIES: HelpEntry[]                        // Grundbestand aus dem Mockup, gegen die App geprüft
```

Die Texte aus dem Mockup werden bei der Übernahme gegen die Bezeichnungen der App geprüft (FR-H09). Zusätzlich je ein Eintrag für 009 US1 ("Wie finde ich etwas in der Hilfe?") und 009 US3 ("Ist die Hilfe auf dem neuesten Stand?"), damit die Prüfung auch diese Spec abdeckt.

### Suche (`src/domain/help-search.ts`)

- `normalize(text)`: Kleinschreibung, ä→ae, ö→oe, ü→ue, ß→ss, mit Zuordnung zu den Originalzeichen (für die Hervorhebung).
- `queryTokens(query)`: höchstens 60 Zeichen, Satzzeichen und Emojis weg, unter zwei Zeichen insgesamt keine Suche, Füllwörter raus (bleibt nichts übrig, zählen sie doch).
- Fundstelle: Wortanfang; ab vier Zeichen auch im Wort (FR-H02).
- `searchHelp(query, entries)`: alle Wörter müssen vorkommen (FR-H03). Punkte je Wort: Titel 6, Suchbegriffe 4, Antwort/Schritte 2, plus 1 bei ganzem Wort ("tor" passt besser zu "Tor" als zu "Torticker"). Sortierung nach Punkten, dann Reihenfolge der Übersicht (FR-H05).
- `highlight(text, tokens)` und `snippet(entry, tokens)`: liefern Abschnitte `{ text, hit }`; die Oberfläche setzt `<mark>` (FR-H06). Auszug rund 110 Zeichen um die erste Fundstelle in der Antwort.

### Teilen-Text Eltern (`src/domain/live-link.ts`)

`viewerShareText(title, teams, url)` → "Unser Spieltag live (Sportvg Feuerbach E1 und E2). Der Link gilt die ganze Saison: {url}"; ohne Mannschaften ohne Klammer. Geteilt wird `{origin}{base}#/live/<Daten>` (ohne `/hilfe`).

### Oberfläche

| Datei | Inhalt |
|---|---|
| `src/ui/router.ts` | `#/hilfe/<id>` → `{ name: 'help', entry }`; `#/live/<Daten>/hilfe[/<id>]` → `liveView` mit `help: true`, `entry` |
| `src/ui/app.tsx` | Hilfe wird nachgeladen (`Lazy`), Navigationsleiste wie bisher |
| `src/ui/screens/help.tsx` | `HelpScreen` (Trainer) und `HelpView` (gemeinsam): Suchfeld (sticky), Übersicht nach Themen, Trefferliste, "Nichts gefunden", Eintragsseite mit Schritten, "{Bereich} öffnen", "Siehe auch", "Stand: Version"; Suchbegriff und Scroll-Position bleiben im Modul erhalten (FR-H12) |
| `src/ui/components/viewer-nav.tsx` (neu) | Eltern-Leiste "Spieltag", "Teilen", "Hilfe" mit den Klassen der App-Leiste (FR-H16) |
| `src/ui/screens/live-dashboard.tsx` | `ViewerScreen` mit Reiter: Dashboard bleibt eingehängt (nur ausgeblendet), damit die Verbindung beim Wechsel zur Hilfe bestehen bleibt; Teilen über `shareText` (FR-H17) |
| `src/ui/screens/more.tsx` | Untertitel "Suchen, Anleitungen, Tipps" (FR-H15) |
| `src/styles/app.css` | Hilfe-Stile; `mark` hell `rot-hell`/`ink`, dunkel `rot-tief`/`on-rot` über `[data-theme]` und `prefers-color-scheme` |
| `scripts/check-contrast.ts` | Paar `on-rot` auf `rot-tief` "Hilfe: Fundstelle (dunkel)" (falls noch nicht vorhanden) |

Test-IDs: `help-search`, `help-clear`, `help-count`, `help-none`, `help-show-all`, `help-topic-<topic>`, `help-row-<id>`, `help-entry`, `help-open`, `help-related`, `help-version`, `viewer-nav`, `viewer-nav-dash`, `viewer-nav-share`, `viewer-nav-help`.

### Prüfung "Hilfe-Abdeckung" (`scripts/check-help.ts`)

Reine Funktionen, getestet in `tests/unit/check-help.test.ts` mit kleinen Beispieldaten:

- `specStories(specText)`: Nummern aus "### User Story N"; `specRequirements(specText)`: IDs aus "**FR-…**".
- `implementedStories(testTexts)`: alle IDs `[NNN ]USn-Sm` in Testdateien; ohne Spec-Nummer gilt 001 (FR-H21 a).
- `checkHelp({ specs, tests, entries, topics })` → Liste von Meldungen: fehlende Abdeckung, unbekannte Quelle (Spec, User Story oder FR), doppelte ID, fehlende Pflichtfelder, unbekanntes Thema, unbekannter "Siehe auch"-Verweis (FR-H21, FR-H22).

`tests/unit/help-coverage.test.ts` liest `specs/*/spec.md` und `tests/**/*.{ts,tsx}` und erwartet keine Meldung. Damit ist die Prüfung Teil von `npm run test:cov` (CI-Job "Lint, Typen, Unit-Tests") und blockiert den Merge.

### Auswirkungen auf andere Specs

- Spec 001 T086 (Hilfe-Seite) ist ersetzt; Spec 006 L040 erledigt sich (Hinweis in beiden `tasks.md`).
- Spec 006 Eltern-Ansicht: neue Leiste; der Screenshot-Vergleich `dashboard-hell/dunkel` wird neu aufgenommen (bewusste Änderung).
- PR #30 (Signalton, Spec 008) ändert die alte `help.tsx`. Wer später gemergt wird, übernimmt den Signalton-Hinweis als Eintrag mit Quelle "008 US…" (Prinzip IX).

## Testplan

- Unit: `help-search.test.ts` (FR-H02 bis FR-H06, Edge Cases, SC-H01 Fragenkatalog mit mindestens 15 Alltagsformulierungen, SC-H02 Laufzeit), `help-entries.test.ts` (FR-H08 Reihenfolge, FR-H09 Länge und Frageform, eindeutige IDs, Eltern-Einträge vorhanden), `live-link.test.ts` (Teilen-Text), `check-help.test.ts` (009 US3-S1 bis S4), `help-coverage.test.ts` (FR-H21 am echten Repository).
- E2E `tests/e2e/hilfe.spec.ts`: 009 US1-S1 bis S9, 009 US2-S1 bis S5, FR-H15.
- E2E `tests/e2e/hilfe-eltern.spec.ts`: 009 US2-S6 bis S8 mit Relay-Fixture aus Spec 006.
- Bestehend: `a11y.spec.ts` prüft die Hilfe (Trefferliste und Eintrag zusätzlich), `nav.spec.ts` unverändert; Screenshot-Vergleich Dashboard neu.
