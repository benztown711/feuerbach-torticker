import { describe, expect, it } from 'vitest';
import {
  checkHelp,
  implementedStories,
  parseSource,
  specRequirements,
  specStories,
  type HelpCheckInput,
} from '../../scripts/check-help';
import type { HelpEntry } from '../../src/domain/help-entries';

const SPEC_003 = `# Spec 003
### User Story 1 - Elfmeter (Priority: P1)
### User Story 2 - Lesezeichen (Priority: P1)
- **FR-E01**: Ein Tor MUSS als Elfmeter markiert werden können.
`;
const SPEC_006 = `### User Story 3 - Eltern schauen zu (Priority: P1)
- **FR-L12**: Zuschauer-Link.
`;
const SPEC_001 = `### User Story 1 - Tor (Priority: P1)
- **FR-036**: Ton.
`;

const entry = (id: string, sources: string[], extra: Partial<HelpEntry> = {}): HelpEntry => ({
  id,
  topic: 'spiel',
  title: `${id}?`,
  answer: 'Antwort.',
  keywords: 'x',
  sources,
  ...extra,
});

const input = (entries: HelpEntry[], tests: string[] = []): HelpCheckInput => ({
  specs: new Map([
    ['001', SPEC_001],
    ['003', SPEC_003],
    ['006', SPEC_006],
  ]),
  tests,
  entries,
  topics: [{ id: 'spiel' }],
});

describe('009 FR-H21 Bausteine', () => {
  it('liest User Stories und Anforderungen aus der Spec', () => {
    expect([...specStories(SPEC_003)]).toEqual([1, 2]);
    expect([...specRequirements(SPEC_003)]).toEqual(['FR-E01']);
    expect([...specRequirements(SPEC_001)]).toEqual(['FR-036']);
  });

  it('umgesetzt ist, was Akzeptanztests mit ID hat; ohne Spec-Nummer zählt 001', () => {
    const tests = [
      "test('006 US3-S1 zwei Karten', …); test('006 US3-S10 …')",
      "test('US1-S4 FR-008 Rückgängig', …)",
      "it('003 US2-S1 Lesezeichen'); // kein Szenario: 003 US1 und FR-E01 allein zählen nicht",
    ];
    expect([...implementedStories(tests)].sort()).toEqual(['001 US1', '003 US2', '006 US3']);
  });

  it('erkennt Quellen der Form "006 US3" und "001 FR-036"', () => {
    expect(parseSource('006 US3')).toEqual({ spec: '006', kind: 'US', id: '3' });
    expect(parseSource('001 FR-036')).toEqual({ spec: '001', kind: 'FR', id: 'FR-036' });
    expect(parseSource('003 FR-E01')).toEqual({ spec: '003', kind: 'FR', id: 'FR-E01' });
    expect(parseSource('Spec 6 US3')).toBeNull();
    expect(parseSource('006 US')).toBeNull();
  });
});

describe('009 US3 Die Hilfe bleibt automatisch aktuell', () => {
  it('009 US3-S1 umgesetzte User Story ohne Eintrag: Prüfung nennt "006 US3 ohne Hilfe-Eintrag"', () => {
    const errors = checkHelp(input([entry('tor', ['001 US1'])], ["test('006 US3-S1 …')", "test('US1-S1 …')"]));
    expect(errors).toEqual(['006 US3 ohne Hilfe-Eintrag']);
  });

  it('009 US3-S2 Quelle zu einer User Story, Anforderung oder Spec, die es nicht gibt', () => {
    const errors = checkHelp(
      input([entry('karten', ['003 US9']), entry('ton', ['001 FR-999']), entry('push', ['007 US1'])]),
    );
    expect(errors).toEqual([
      'Eintrag „karten“: Quelle 003 US9 existiert nicht',
      'Eintrag „ton“: Quelle 001 FR-999 existiert nicht',
      'Eintrag „push“: Quelle 007 US1 existiert nicht (keine Spec 007)',
    ]);
  });

  it('009 US3-S3 doppelte ID, fehlende Felder, unbekanntes Thema, falsche Quelle, unbekanntes "Siehe auch"', () => {
    const errors = checkHelp(
      input([
        entry('tor', ['001 US1']),
        entry('tor', ['001 US1']),
        entry('leer', [], { title: ' ', answer: '' }),
        entry('thema', ['001 US1'], { topic: 'gibts-nicht' as HelpEntry['topic'] }),
        entry('form', ['Spec 1']),
        entry('verweis', ['001 US1'], { related: ['nirgends'] }),
      ]),
    );
    expect(errors).toEqual([
      'Eintrag „tor“ ist doppelt',
      'Eintrag „leer“: Titel fehlt',
      'Eintrag „leer“: Antwort fehlt',
      'Eintrag „leer“: Quelle fehlt',
      'Eintrag „thema“: Thema „gibts-nicht“ ist unbekannt',
      'Eintrag „form“: Quelle „Spec 1“ hat nicht die Form „006 US3“ oder „001 FR-036“',
      'Eintrag „verweis“: „Siehe auch“ nirgends gibt es nicht',
    ]);
  });

  it('009 US3-S4 alles abgedeckt und alle Quellen vorhanden: grün', () => {
    const errors = checkHelp(
      input(
        [entry('tor', ['001 US1', '001 FR-036']), entry('eltern', ['006 US3'], { related: ['tor'] })],
        ["test('006 US3-S1 …')", "test('US1-S2 …')"],
      ),
    );
    expect(errors).toEqual([]);
  });
});
