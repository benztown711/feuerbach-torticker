import { describe, expect, it } from 'vitest';
import { createGame, kickoff } from '../../src/domain/game';
import {
  addGoal,
  assistLabel,
  assistSuffix,
  canHaveAssist,
  goalWho,
  removeGoal,
  restoreGoal,
  setAssist,
  setPenalty,
  setScorer,
} from '../../src/domain/goals';
import { anyEventFeature, defaultSettings, withSettingsDefaults } from '../../src/domain/settings';
import type { Game, NewGameInput, Player, Settings } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const input: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach E1',
  opponent: 'TSV Musterstadt',
  venue: 'home',
  schema: { sections: 2, sectionMinutes: 25 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};
const players: Player[] = [
  { id: 'max', name: 'Max', number: 7, deletedAt: null },
  { id: 'ben', name: 'Ben', number: 9, deletedAt: null },
  { id: 'tom', name: 'Tom', number: null, deletedAt: Date.UTC(2026, 10, 8) },
];

let n = 0;
const ids = (): string => `goal-${++n}`;

/** Eigenes Tor (Index 0) und Gegentor (Index 1). */
function game(): Game {
  let g = kickoff(createGame(input, { id: 'g', now: T0 }), T0);
  g = addGoal(g, 'own', T0 + 11 * 60_000 + 5_000, ids).game;
  g = addGoal(g, 'opp', T0 + 13 * 60_000, ids).game;
  return g;
}
const own = (g: Game) => g.goals[0]!;
const opp = (g: Game) => g.goals[1]!;
/** Eigenes Tor von Max. */
const byMax = (): Game => {
  const g = game();
  return setScorer(g, own(g).id, { kind: 'player', playerId: 'max' });
};
/** Eigenes Tor von Max mit Vorlage Ben. */
const maxBen = (): Game => {
  const g = byMax();
  return setAssist(g, own(g).id, 'ben');
};

describe('009 FR-V05 Vorlage nur, wo sie passt', () => {
  it('canHaveAssist: eigenes Tor mit Spieler als Torschützen und ohne Elfmeter', () => {
    const g = game();
    expect(canHaveAssist(own(g))).toBe(false); // ohne Torschützen
    expect(canHaveAssist(own(byMax()))).toBe(true);
    const ownGoal = setScorer(g, own(g).id, { kind: 'ownGoal' });
    expect(canHaveAssist(own(ownGoal))).toBe(false);
    const m = byMax();
    const pen = setPenalty(m, own(m).id, true);
    expect(canHaveAssist(own(pen))).toBe(false);
    const oppText = setScorer(g, opp(g).id, { kind: 'text', text: 'Nr. 9' });
    expect(canHaveAssist(opp(oppText))).toBe(false);
  });

  it('setAssist speichert die Vorlage und entfernt sie mit null', () => {
    const g = maxBen();
    expect(own(g).assist).toBe('ben');
    expect(own(setAssist(g, own(g).id, null)).assist).toBeNull();
  });

  it('setAssist lehnt Ungültiges ab', () => {
    const g = game();
    expect(setAssist(g, own(g).id, 'ben')).toBe(g); // ohne Torschützen
    expect(setAssist(g, opp(g).id, 'ben')).toBe(g); // Gegentor
    expect(setAssist(g, 'gibt-es-nicht', 'ben')).toBe(g);
    const m = byMax();
    expect(setAssist(m, own(m).id, 'max')).toBe(m); // Vorlagengeber = Torschütze
    const og = setScorer(g, own(g).id, { kind: 'ownGoal' });
    expect(setAssist(og, own(og).id, 'ben')).toBe(og);
    const pen = setPenalty(m, own(m).id, true);
    expect(setAssist(pen, own(pen).id, 'ben')).toBe(pen);
  });

  it('neuer Torschütze gleich Vorlagengeber entfernt die Vorlage, ein anderer behält sie', () => {
    const g = maxBen();
    expect(own(setScorer(g, own(g).id, { kind: 'player', playerId: 'ben' })).assist).toBeNull();
    expect(own(setScorer(g, own(g).id, { kind: 'player', playerId: 'tom' })).assist).toBe('ben');
  });

  it('"Ohne Torschütze" und "Eigentor Gegner" entfernen die Vorlage', () => {
    const g = maxBen();
    expect(own(setScorer(g, own(g).id, null)).assist).toBeNull();
    expect(own(setScorer(g, own(g).id, { kind: 'ownGoal' })).assist).toBeNull();
  });

  it('Elfmeter entfernt die Vorlage; Abwählen bringt sie nicht zurück', () => {
    const g = maxBen();
    const pen = setPenalty(g, own(g).id, true);
    expect(own(pen).assist).toBeNull();
    expect(own(setPenalty(pen, own(pen).id, false)).assist).toBeNull();
  });

  it('ein entferntes Tor behält seine Vorlage, auch wiederhergestellt', () => {
    const g = maxBen();
    const removed = removeGoal(g, own(g).id, T0 + 20 * 60_000);
    expect(own(removed).assist).toBe('ben');
    expect(own(restoreGoal(removed, own(g).id)).assist).toBe('ben');
  });
});

describe('009 FR-V06 FR-V09 Anzeige der Vorlage', () => {
  it('assistLabel und assistSuffix nur mit Namen, nie mit Rückennummer', () => {
    const g = maxBen();
    expect(assistLabel(own(g), players)).toBe('Ben');
    expect(assistSuffix(own(g), players)).toBe(' (Vorlage: Ben)');
    expect(assistSuffix(own(g), players)).not.toMatch(/\d/);
    expect(assistLabel(own(byMax()), players)).toBe('');
    expect(assistSuffix(own(byMax()), players)).toBe('');
  });

  it('gelöschter Spieler bleibt als Vorlagengeber lesbar (FR-029)', () => {
    const m = byMax();
    const g = setAssist(m, own(m).id, 'tom');
    expect(assistSuffix(own(g), players)).toBe(' (Vorlage: Tom)');
    expect(assistLabel(own(g), [])).toBe('?');
  });

  it('ältere Tore ohne Feld haben keine Vorlage', () => {
    const g = byMax();
    const old = { ...own(g) };
    delete old.assist;
    expect(assistLabel(old, players)).toBe('');
  });
});

describe('009 FR-V11 Torliste ohne Mannschaftsnamen', () => {
  it('US4-S3 eigenes Tor mit Torschütze: nur der Name', () => {
    expect(goalWho(byMax(), own(byMax()), players)).toBe('Max');
  });

  it('US1-S3 mit Vorlage: "Max (Vorlage: Ben)"', () => {
    expect(goalWho(maxBen(), own(maxBen()), players)).toBe('Max (Vorlage: Ben)');
  });

  it('US4-S4 ohne Torschützen: Kurzform bzw. Gegner', () => {
    const g = game();
    expect(goalWho(g, own(g), players)).toBe('Feuerbach E1');
    expect(goalWho(g, opp(g), players)).toBe('TSV Musterstadt');
  });

  it('US4-S5 Gegentor mit Freitext und Eigentor', () => {
    const g = game();
    const t = setScorer(g, opp(g).id, { kind: 'text', text: 'Nr. 9' });
    expect(goalWho(t, opp(t), players)).toBe('Nr. 9 (TSV Musterstadt)');
    const og = setScorer(g, own(g).id, { kind: 'ownGoal' });
    expect(goalWho(og, own(og), players)).toBe('Eigentor');
  });

  it('Elfmeter-Zusatz bleibt, mit und ohne Torschützen', () => {
    const m = byMax();
    const pen = setPenalty(m, own(m).id, true);
    expect(goalWho(pen, own(pen), players)).toBe('Max (Elfmeter)');
    const g = game();
    const oppPen = setPenalty(g, opp(g).id, true);
    expect(goalWho(oppPen, opp(oppPen), players)).toBe('TSV Musterstadt (Elfmeter)');
  });

  it('US4-S1 nie Rückennummern', () => {
    expect(goalWho(maxBen(), own(maxBen()), players)).not.toMatch(/[79]/);
  });
});

describe('009 FR-V01 Schalter "Vorlagen"', () => {
  it('Vorgabe aus, auch bei älteren Einstellungen ohne Feld', () => {
    expect(defaultSettings().features.assists).toBe(false);
    const old = { features: { cards: true, subs: false, marks: false } } as unknown as Partial<Settings>;
    expect(withSettingsDefaults(old).features).toEqual({ cards: true, subs: false, marks: false, assists: false });
  });

  it('der Schalter allein blendet den Knopf "Ereignis" nicht ein', () => {
    const s = defaultSettings();
    expect(anyEventFeature({ ...s, features: { ...s.features, assists: true } })).toBe(false);
  });
});
