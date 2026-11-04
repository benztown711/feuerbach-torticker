import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkHelp, repoInput } from '../../scripts/check-help';

/**
 * Qualitätstor "Hilfe-Abdeckung" (Spec 010 FR-H21, Constitution IX) am echten Repository.
 * Rot heißt: Eine fertige Funktion hat keinen Hilfe-Eintrag oder ein Eintrag verweist ins Leere.
 * Abhilfe: Eintrag in src/domain/help-entries.ts ergänzen bzw. Quelle korrigieren.
 */
describe('010 FR-H21 Hilfe-Abdeckung', () => {
  it('jede umgesetzte User Story hat einen Hilfe-Eintrag, jede Quelle existiert', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
    expect(checkHelp(repoInput(root))).toEqual([]);
  });
});
