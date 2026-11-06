import { describe, expect, it } from 'vitest';
import { startShootout } from '../../src/domain/cup';
import { createGame, endSection, kickoff } from '../../src/domain/game';
import {
  allSelected,
  countLabel,
  isSelectable,
  pruneSelection,
  toggleAll,
  toggleSelected,
} from '../../src/domain/history-select';
import type { Game, NewGameInput } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const input: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach E1',
  opponent: 'TSV Musterstadt',
  venue: 'home',
  schema: { sections: 1, sectionMinutes: 20 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};

const created = (id: string): Game => createGame(input, { id, now: T0 });
const running = (id: string): Game => kickoff(created(id), T0);
const finished = (id: string): Game => endSection(running(id), T0 + 20 * 60_000);

describe('014 FR-D02 FR-D03 auswählbar sind nur beendete Spiele', () => {
  it('beendet: auswählbar', () => {
    expect(isSelectable(finished('a'))).toBe(true);
  });

  it('laufend und nicht angepfiffen: nicht auswählbar', () => {
    expect(isSelectable(running('b'))).toBe(false);
    expect(isSelectable(created('c'))).toBe(false);
  });

  it('Elfmeterschießen läuft noch: nicht auswählbar; beendet: auswählbar', () => {
    const open = startShootout(finished('d'), 'own');
    expect(isSelectable(open)).toBe(false);
    expect(isSelectable({ ...open, shootout: { ...open.shootout!, done: true } })).toBe(true);
  });
});

describe('014 FR-D02 anhaken und abhaken', () => {
  it('hakt ein beendetes Spiel an und wieder ab, andere bleiben', () => {
    const a = finished('a');
    const one = toggleSelected(new Set(['x']), a);
    expect([...one].sort()).toEqual(['a', 'x']);
    expect([...toggleSelected(one, a)]).toEqual(['x']);
  });

  it('ignoriert laufende Spiele', () => {
    const before = new Set(['x']);
    expect(toggleSelected(before, running('b'))).toBe(before);
  });
});

describe('014 FR-D04 FR-D05 alle auswählen, alle abwählen', () => {
  const games = [running('r'), finished('a'), created('c'), finished('b')];

  it('"Alle auswählen" hakt nur die beendeten der übergebenen Spiele an', () => {
    expect([...toggleAll(games, new Set())].sort()).toEqual(['a', 'b']);
  });

  it('teilweise angehakt: "Alle auswählen" ergänzt', () => {
    const sel = new Set(['a']);
    expect(allSelected(games, sel)).toBe(false);
    expect([...toggleAll(games, sel)].sort()).toEqual(['a', 'b']);
  });

  it('alle angehakt: "Alle abwählen" leert', () => {
    const sel = new Set(['a', 'b']);
    expect(allSelected(games, sel)).toBe(true);
    expect(toggleAll(games, sel).size).toBe(0);
  });

  it('ohne beendete Spiele ist nichts "alle angehakt" und "Alle auswählen" wählt nichts', () => {
    expect(allSelected([running('r')], new Set())).toBe(false);
    expect(allSelected([], new Set())).toBe(false);
    expect(toggleAll([running('r')], new Set()).size).toBe(0);
  });
});

describe('014 FR-D05 Filterwechsel kürzt die Auswahl', () => {
  it('behält nur angehakte, die unter dem neuen Filter sichtbar und auswählbar sind', () => {
    const visible = [finished('a'), running('r')];
    expect([...pruneSelection(visible, new Set(['a', 'b', 'r']))]).toEqual(['a']);
  });
});

describe('014 FR-D06 FR-D07 Anzahl im Text', () => {
  it('"1 Spiel", sonst "n Spiele"', () => {
    expect(countLabel(1)).toBe('1 Spiel');
    expect(countLabel(0)).toBe('0 Spiele');
    expect(countLabel(14)).toBe('14 Spiele');
  });
});
