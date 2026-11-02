import { describe, expect, it } from 'vitest';
import {
  normalizeName,
  validateNewGame,
  validateOpponentScorerText,
  validatePlayerNumber,
  validateSchema,
} from '../../src/domain/validation';
import type { NewGameInput } from '../../src/domain/types';

const valid: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach E1',
  opponent: 'TSV Musterstadt',
  venue: 'home',
  schema: { sections: 2, sectionMinutes: 25 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};

describe('T020 FR-001 FR-002 Validierung', () => {
  it('FR-001 akzeptiert ein vollständiges Spiel und trimmt die Namen', () => {
    const r = validateNewGame({ ...valid, opponent: '  TSV Musterstadt  ', ownTeam: ' Sportvg Feuerbach E1 ' });
    expect(r.ok).toBe(true);
    expect(r.value).toMatchObject({ opponent: 'TSV Musterstadt', ownTeam: 'Sportvg Feuerbach E1' });
    expect(r.errors).toEqual({});
  });

  it('FR-001 Gegner ist Pflicht, 1 bis 40 Zeichen nach dem Trimmen', () => {
    expect(validateNewGame({ ...valid, opponent: '   ' }).errors.opponent).toBe('Bitte den Gegner eintragen.');
    expect(validateNewGame({ ...valid, opponent: 'x'.repeat(41) }).errors.opponent).toBe('Höchstens 40 Zeichen.');
    expect(validateNewGame({ ...valid, opponent: 'x'.repeat(40) }).ok).toBe(true);
  });

  it('FR-014 eigener Name ist Pflicht, 1 bis 40 Zeichen', () => {
    expect(validateNewGame({ ...valid, ownTeam: '' }).errors.ownTeam).toBe('Bitte den eigenen Mannschaftsnamen eintragen.');
    expect(validateNewGame({ ...valid, ownTeam: 'y'.repeat(41) }).errors.ownTeam).toBe('Höchstens 40 Zeichen.');
  });

  it('FR-002 Abschnitte 1 bis 4 und Minuten 1 bis 60, ganzzahlig', () => {
    expect(validateSchema({ sections: 1, sectionMinutes: 1 })).toBeNull();
    expect(validateSchema({ sections: 4, sectionMinutes: 60 })).toBeNull();
    expect(validateSchema({ sections: 0, sectionMinutes: 25 })).toBe('Abschnitte: 1 bis 4.');
    expect(validateSchema({ sections: 5, sectionMinutes: 25 })).toBe('Abschnitte: 1 bis 4.');
    expect(validateSchema({ sections: 2.5, sectionMinutes: 25 })).toBe('Abschnitte: 1 bis 4.');
    expect(validateSchema({ sections: 2, sectionMinutes: 0 })).toBe('Minuten: 1 bis 60.');
    expect(validateSchema({ sections: 2, sectionMinutes: 61 })).toBe('Minuten: 1 bis 60.');
    expect(validateNewGame({ ...valid, schema: { sections: 9, sectionMinutes: 25 } }).errors.schema).toBe(
      'Abschnitte: 1 bis 4.',
    );
  });

  it('FR-031 Trikotfarben müssen aus der Palette stammen', () => {
    expect(validateNewGame({ ...valid, ownColor: 'pink' }).errors.ownColor).toBe('Unbekannte Farbe.');
    expect(validateNewGame({ ...valid, oppColor: 'pink' }).errors.oppColor).toBe('Unbekannte Farbe.');
  });

  it('Gegner-Torschütze als Freitext höchstens 30 Zeichen', () => {
    expect(validateOpponentScorerText('Nr. 9')).toBeNull();
    expect(validateOpponentScorerText(' ')).toBe('Leer.');
    expect(validateOpponentScorerText('z'.repeat(31))).toBe('Höchstens 30 Zeichen.');
  });

  it('Rückennummer 1 bis 99 oder leer', () => {
    expect(validatePlayerNumber(null)).toBeNull();
    expect(validatePlayerNumber(1)).toBeNull();
    expect(validatePlayerNumber(99)).toBeNull();
    expect(validatePlayerNumber(0)).toBe('Nummer 1 bis 99.');
    expect(validatePlayerNumber(100)).toBe('Nummer 1 bis 99.');
    expect(validatePlayerNumber(7.5)).toBe('Nummer 1 bis 99.');
  });

  it('normalisiert Namen für Vergleiche (klein, getrimmt, Leerraum zusammengefasst)', () => {
    expect(normalizeName('  TSV   Musterstadt ')).toBe('tsv musterstadt');
  });
});
