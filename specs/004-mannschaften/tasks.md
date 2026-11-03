# Tasks: Meine Mannschaften und schlankes "Neues Spiel" (Spec 004)

**Input**: `spec.md`, `plan.md` in diesem Ordner; Mockup Bildschirme 1 und 2.

Tests zuerst, müssen fehlschlagen. [P] = parallel möglich.

## Phase 1: Domäne

- [ ] M001 [P] `tests/unit/teams.test.ts`: implizite Vorgabe, Migration aus `recentOwnTeams`/`lastOwnColor` (auch ungültige Farbe, leere Liste, vorhandene `teams` bleiben), `currentTeam` (zuletzt genutzt, erste, Vorgabe), `ownColorFor` heim/auswärts, `schemaFor`/`squadFor` mit Rückfall, `upsertTeam` neu/ändern, `removeTeam`, `recordTeamUse` (gespeicherte und implizite Mannschaft), `validateTeam` (Name leer/zu lang, unbekannte Farbe) (FR-M01 bis FR-M06)
- [ ] M002 `src/domain/teams.ts`, `Team` in `src/domain/types.ts`, `teams` in `src/domain/settings.ts` mit Migration (macht M001 grün)
- [ ] M003 [P] `tests/unit/jersey-colors.test.ts`, `tests/unit/team-name.test.ts`, `tests/unit/db.test.ts` an das neue Modell anpassen (Gegnerfarbe gemerkt, eigene Farbe kommt aus der Mannschaft; alte Einstellungen werden beim Lesen migriert)
- [ ] M004 `src/domain/jersey-colors.ts` und `src/domain/team-name.ts` aufräumen (macht M003 grün)

## Phase 2: Einstellungen "Meine Mannschaften" (US1)

- [ ] M005 [P] E2E `tests/e2e/mannschaften.spec.ts`: 004 US1-S1 anlegen, 004 US1-S5 löschen mit Abfrage (alte Spiele bleiben in der Historie); Helfer `addTeam()` in `tests/e2e/helpers.ts`
- [ ] M006 Komponente `src/ui/components/kit-row.tsx`; Abschnitt "Meine Mannschaften" mit Sheet in `src/ui/screens/settings.tsx` (`settings-teams`, `team-row-<i>`, `btn-add-team`, `input-team-name`, `kit-home-change`, `kit-away-change`, `btn-save-team`, `btn-delete-team`) (macht M005 grün)

## Phase 3: Neues Spiel (US1, US2, US3)

- [ ] M007 [P] E2E: 004 US1-S2 eine Mannschaft ohne Auswahl, 004 US1-S3 Heim/Auswärts-Trikot folgt dem Tausch, 004 US1-S4 Chips bei zwei Mannschaften, 004 US2-S1 bis S4 Trikotzeilen mit "Ändern", nur für dieses Spiel, gemerkte Gegnerfarbe, 004 US3-S1 Begegnung wie Kopfzeile, FR-M06 Spielzeit und Aufgebot je Mannschaft, SC-M01
- [ ] M008 `src/ui/screens/new-game.tsx` nach Mockup 2 (`team-chips`, `team-chip-<i>`, `matchup-home`/`matchup-away`, `kit-own-change`, `kit-opp-change`, `color-own-<id>`, `color-opp-<id>`); Helfer `newGame()` auf Mannschaften umstellen (macht M007 grün)
- [ ] M009 Bestehende E2E an die neue Oberfläche anpassen: `us2-farben-namen.spec.ts`, `install-hint.spec.ts`, `a11y.spec.ts`, `us6-historie.spec.ts`; Spec 001 FR-001/FR-014/FR-031 mit Verweis auf 004 versehen

## Phase 4: Abschluss

- [ ] M010 Lint, Typen, Unit mit Coverage, Kontrast, Budget, E2E lokal; Screenshots iPhone SE hell/dunkel (Einstellungen, Neues Spiel mit offener Palette) an Atti
