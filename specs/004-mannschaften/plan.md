# Implementation Plan: Meine Mannschaften und schlankes "Neues Spiel"

**Branch**: `004-mannschaften` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md) | **Mockup**: https://claude.ai/artifact/Fdog1LwXwmUBuA7DDWschA (Bildschirme 1 und 2)

## Summary

Eigene Mannschaften werden einmal in den Einstellungen angelegt (Name, Heim- und Auswärtstrikot). "Neues Spiel" übernimmt Mannschaft, Trikot, Spielzeit und Aufgebot daraus; der Nutzer trägt im Normalfall nur den Gegner ein. Beide Trikots erscheinen als Farbfeld mit "Ändern", die Begegnung zeigt die Namen wie die Kopfzeile im Spiel (FR-040). Freitext für den eigenen Namen, die Schnellauswahl "Zuletzt genutzt" und die große Farbvorschau entfallen.

## Technical Context

Unverändert gegenüber `specs/001-spiel-erfassen/plan.md` (TypeScript, Preact, IndexedDB, Vitest, Playwright). Keine neue Abhängigkeit.

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Spielfeldrand zuerst | Spiel anlegen = Gegner tippen + "Weiter zum Anpfiff" (SC-M01); Palette nur bei Bedarf | erfüllt |
| II. Offline-first und lokal | Mannschaften liegen in den Einstellungen (IndexedDB) | erfüllt |
| III. Datensparsamkeit | Mannschaftsnamen sind keine personenbezogenen Daten | erfüllt |
| IV. Spec-first und Test-first | Domäne `teams.ts` mit 100 % Branch-Coverage, E2E je Akzeptanzszenario ("004 USx-Sy") | erfüllt |
| VI. Einfachheit | Ein Kader bleibt; keine Spielzeit-Vorlagen (Clarification) | erfüllt |
| VII. Vereinsdesign | Farben nur aus `design/trikot-farben.json` und Tokens | erfüllt |

## Design

### Datenmodell (Erweiterung von `Settings`)

```ts
interface Team {
  id: string;
  name: string;          // 1 bis 40 Zeichen
  homeColor: string;     // Palette-ID
  awayColor: string;     // Palette-ID
  lastSchema: Schema | null;
  lastSquad: string[];   // Spieler-IDs
  lastUsedAt: number;    // 0 = noch nie genutzt
}
Settings.teams: Team[]
```

- **Ohne angelegte Mannschaft** gilt eine implizite Vorgabe "Sportvg Feuerbach", Heim und Auswärts Rot (nicht gespeichert); "Neues Spiel" zeigt den Hinweis "Mannschaft und Trikots in den Einstellungen anpassen".
- **Migration** (in `withSettingsDefaults`, nur wenn `teams` fehlt): bisherige `recentOwnTeams` (bis 5) werden Mannschaften; Heim = Auswärts = `lastOwnColor` (sonst Rot); die zuletzt genutzte bekommt `lastSchema`/`lastSquad` und den höchsten `lastUsedAt`. `recentOwnTeams` und `lastOwnColor` bleiben nur als Altlast im Typ, die App schreibt sie nicht mehr.
- **Vorbelegung "Neues Spiel"**: Mannschaft = zuletzt genutzte; eigenes Trikot = Heim- bzw. Auswärtstrikot je Begegnung, bis von Hand geändert; Gegnertrikot unverändert nach FR-031 (`opponentColors`); Spielzeit und Aufgebot aus der Mannschaft, sonst global (`lastSchema`, `lastSquad`).
- **Beim Anlegen** wird die Mannschaft mit Spielzeit, Aufgebot und Zeitpunkt aktualisiert (FR-M06); globale `lastSchema`/`lastSquad` bleiben als Rückfall gepflegt.
- **Sicherung** (FR-024) enthält weiterhin Spiele und Kader; Mannschaften gehören zu den Einstellungen und werden nicht exportiert (Folgearbeit, falls gewünscht).

### Module

| Datei | Inhalt |
|---|---|
| `src/domain/teams.ts` (neu) | `Team`, `implicitTeam`, `migrateTeams`, `currentTeam`, `ownColorFor`, `schemaFor`, `squadFor`, `upsertTeam`, `removeTeam`, `recordTeamUse`, `validateTeam` |
| `src/domain/settings.ts` | `teams: []` als Vorgabe, Migration in `withSettingsDefaults` |
| `src/domain/jersey-colors.ts` | `defaultOwnColor` entfällt; `rememberColors` merkt nur noch die Gegnerfarbe |
| `src/domain/team-name.ts` | `defaultOwnTeam`, `pushRecent`, `removeRecent` entfallen; `shortTeamName` bleibt |
| `src/ui/components/kit-row.tsx` (neu) | Zeile "Name ■ Farbe · Ändern" mit aufklappbarer Palette (Einstellungen und Neues Spiel) |
| `src/ui/screens/settings.tsx` | Abschnitt "Meine Mannschaften" (Liste, Sheet zum Anlegen/Ändern, Löschen mit Abfrage) statt "Eigene Mannschaften" |
| `src/ui/screens/new-game.tsx` | Mannschafts-Chips (nur bei > 1), Begegnung als Kopfzeilen-Vorschau mit Tausch-Knopf, Trikots mit "Ändern", ohne Namensfeld, ohne Farbvorschau |

### Auswirkungen auf Spec 001

FR-001 (Name "vorbelegt mit dem zuletzt genutzten"), FR-014 Satz 2 (Schnellauswahl) und FR-031 Satz 2 (Vorgabe Feuerbach-Farbe) werden durch 004 FR-M02/FR-M03 ersetzt; Verweise in `specs/001-spiel-erfassen/spec.md` werden ergänzt. FR-M07 (Schalter "Im Spiel erfassen") wird mit Spec 003 umgesetzt, weil die Schalter erst dort eine Wirkung haben.

### Tests

- Unit: `tests/unit/teams.test.ts` (alle Zweige), angepasst: `jersey-colors.test.ts`, `team-name.test.ts`, `db.test.ts` (Migration beim Lesen alter Einstellungen).
- E2E: `tests/e2e/mannschaften.spec.ts` mit "004 US1-S1" bis "004 US3-S1"; Helfer `addTeam()` in `tests/e2e/helpers.ts`, `newGame({ ownTeam })` legt die Mannschaft bei Bedarf über die Einstellungen an.
- Angepasst an die neue Oberfläche: `us2-farben-namen.spec.ts` (FR-014, FR-031, FR-035), `install-hint.spec.ts` (Abschnitt Mannschaften), `a11y.spec.ts`, `us6-historie.spec.ts` (über den Helfer).
- Screenshots "Neues Spiel" und Einstellungen auf dem iPhone SE, hell und dunkel, für Review C.
