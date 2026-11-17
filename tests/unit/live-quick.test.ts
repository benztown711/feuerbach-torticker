import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/domain/game';
import { addLiveTeam, retireConfig } from '../../src/domain/live-manage';
import { quickAction, quickTeams, startHint, teamHint } from '../../src/domain/live-quick';
import { createSpieltag, liveTeamOptions, type LiveDeps } from '../../src/domain/live-spieltag';
import { defaultSettings } from '../../src/domain/settings';
import type { Game, LiveSpieltag, PrivateKeyParts, Settings, SignedData, Team } from '../../src/domain/types';

/** Spec 020 US1 (FR-E03 bis FR-E07, R-E2): "Eltern live zuschauen lassen". */

const T0 = Date.UTC(2026, 10, 17, 9, 0, 0);
const B43 = 'A'.repeat(42) + 'Q';
let n = 0;
const deps = (): LiveDeps => ({
  now: T0,
  newTopic: () => `topic${String(++n).padStart(17, '0')}`,
  newViewKey: () => B43,
  newSigningKey: async () => {
    n++;
    return { pub: `${'C'.repeat(84)}${String(n % 100).padStart(2, '0')}A`, priv: { d: `d${n}`, x: `x${n}`, y: `y${n}` } };
  },
  signData: async (priv: PrivateKeyParts, value: unknown): Promise<SignedData> => ({
    d: JSON.stringify(value),
    s: `sig-${priv.d}`,
  }),
  newId: () => `neu-${++n}`,
});

const team = (id: string, short: string): Team => ({
  id,
  name: `Sportvg Feuerbach ${short}`,
  homeColor: 'rot',
  awayColor: 'schwarz',
  lastSchema: null,
  lastSquad: [],
  lastUsedAt: 0,
});
const [E1, E2, E3, D1, D2, D3, F1] = [
  team('t1', 'E1'),
  team('t2', 'E2'),
  team('t3', 'E3'),
  team('t4', 'D1'),
  team('t5', 'D2'),
  team('t6', 'D3'),
  team('t7', 'F1'),
];

const game = (ownTeam: Team | string, o: Partial<Game> = {}): Game => ({
  ...createGame(
    {
      ownTeam: typeof ownTeam === 'string' ? ownTeam : ownTeam.name,
      opponent: 'TSV Musterstadt',
      venue: 'home',
      schema: { sections: 2, sectionMinutes: 25 },
      ownColor: 'rot',
      oppColor: 'schwarz',
    },
    { id: 'g1', now: T0 },
  ),
  status: 'running',
  ...o,
});

const settings = (teams: Team[], live: LiveSpieltag | null = null): Settings => ({
  ...defaultSettings(),
  teams,
  live,
});

const spieltag = (teams: Team[], all: Team[] = teams): Promise<LiveSpieltag> =>
  createSpieltag({ title: 'Unser Spieltag', teamIds: teams.map((t) => t.id) }, all, deps());

/** Lead-Handy der ersten Version: ohne Organisator-Schlüssel. */
const lead = async (teams: Team[]): Promise<LiveSpieltag> => {
  const { orgKey: _drop, ...rest } = await spieltag(teams);
  return rest;
};

describe('020 FR-E03 Sichtbarkeit', () => {
  it('020 US1-S2 ohne Mannschaften und ohne Live-Spieltag: verborgen', () => {
    expect(quickAction(settings([]), null)).toEqual({ kind: 'hidden' });
    expect(quickAction(settings([]), game('Sportvg Feuerbach E1'))).toEqual({ kind: 'hidden' });
  });

  it('020 US1-S2 neu ausgestellter Live-Spieltag: verborgen, auch mit Mannschaften', async () => {
    const live = await spieltag([E1]);
    const retired = { ...live, config: await retireConfig(live, deps()) };
    expect(quickAction(settings([E1], retired), null)).toEqual({ kind: 'hidden' });
  });

  it('020 US1-S5 mit Mannschaften ohne Live-Spieltag: Blatt "Neu starten"', () => {
    expect(quickAction(settings([E1, E2]), null)).toEqual({ kind: 'start' });
    expect(quickAction(settings([E1, E2]), game(E2))).toEqual({ kind: 'start' });
  });

  it('gekoppelt ohne eigene Mannschaften (z. B. Lead-Link übernommen): teilen', async () => {
    const live = await spieltag([E1]);
    expect(quickAction(settings([], live), null)).toEqual({ kind: 'share', makeLive: false, team: null });
  });
});

describe('020 FR-E04 FR-E05 Teilen mit Live-Spieltag', () => {
  it('020 US1-S3 ohne Spiel: nur teilen', async () => {
    const live = await spieltag([E1, E2]);
    expect(quickAction(settings([E1, E2], live), null)).toEqual({ kind: 'share', makeLive: false, team: null });
  });

  it('020 US1-S4 Spiel auf "Nicht live senden" geht wieder live, nur wenn nicht beendet und nicht übergeben', async () => {
    const live = await spieltag([E1, E2]);
    const s = settings([E1, E2], live);
    expect(quickAction(s, game(E2, { live: false }))).toEqual({ kind: 'share', makeLive: true, team: null });
    expect(quickAction(s, game(E2, { live: false, status: 'created', livePrivate: true }))).toMatchObject({
      makeLive: true,
    });
    expect(quickAction(s, game(E2))).toMatchObject({ makeLive: false });
    expect(quickAction(s, game(E2, { live: true }))).toMatchObject({ makeLive: false });
    // Randfall "Beendetes Spiel": bleibt, wie es ist.
    expect(quickAction(s, game(E2, { live: false, status: 'finished' }))).toMatchObject({ makeLive: false });
    // Ein anderes Handy hat das Spiel übernommen (Spec 006 FR-L24).
    expect(quickAction(s, game(E2, { live: false, liveHandedOver: true }))).toMatchObject({ makeLive: false });
  });

  it('020 US1-S9 fehlende Mannschaft kommt auf einem Trainer-Handy dazu', async () => {
    const live = await spieltag([E1, E2], [E1, E2, E3]);
    const a = quickAction(settings([E1, E2, E3], live), game(E3));
    expect(a).toMatchObject({ kind: 'share', makeLive: false, team: { kind: 'add', label: 'E3' } });
    expect(a.kind === 'share' && a.team?.kind === 'add' && a.team.option).toEqual({ key: 'E3', team: E3 });
    expect(teamHint(a.kind === 'share' ? a.team : null)).toBe('E3 ist jetzt dabei.');
  });

  it('020 US1-S9 bei sechs Mannschaften: trotzdem teilen, mit Hinweis', async () => {
    const all = [E1, E2, E3, D1, D2, D3, F1];
    let live = await spieltag([E1, E2, E3, D1, D2], all);
    live = await addLiveTeam(live, { key: 'D3', team: D3 }, deps());
    const a = quickAction(settings(all, live), game(F1));
    expect(a).toEqual({ kind: 'share', makeLive: false, team: { kind: 'missing', label: 'F1' } });
    expect(teamHint(a.kind === 'share' ? a.team : null)).toBe(
      'F1 gehört nicht zum Live-Spieltag. Eltern sehen dieses Spiel nicht.',
    );
  });

  it('Randfall Lead-Handy der ersten Version: kann nicht hinzufügen, nur Hinweis', async () => {
    const live = await lead([E1]);
    expect(quickAction(settings([E1, E2], live), game(E2))).toEqual({
      kind: 'share',
      makeLive: false,
      team: { kind: 'missing', label: 'E2' },
    });
  });

  it('Mannschaft des Spiels steht nicht unter "Meine Mannschaften": nur Hinweis', async () => {
    const live = await spieltag([E1]);
    const a = quickAction(settings([E1], live), game('Sportvg Feuerbach C1'));
    expect(a).toMatchObject({ team: { kind: 'missing', label: 'C1' } });
  });

  it('beendetes Spiel einer fehlenden Mannschaft: nur teilen, ohne Hinzufügen und Hinweis', async () => {
    const live = await spieltag([E1], [E1, E2]);
    expect(quickAction(settings([E1, E2], live), game(E2, { status: 'finished' }))).toEqual({
      kind: 'share',
      makeLive: false,
      team: null,
    });
  });

  it('ohne Mannschaft kein Hinweis', () => {
    expect(teamHint(null)).toBeNull();
  });
});

describe('020 FR-E07 Mannschaften für "Neu starten"', () => {
  const ids = (teams: Team[]): string[] => teams.map((t) => t.id);

  it('020 US1-S6 Mannschaft des laufenden Spiels', () => {
    expect(quickTeams([E1, E2], game(E2))).toEqual(['t2']);
    // Schreibweise wie in "Meine Mannschaften" egal
    expect(quickTeams([E1, E2], game('  sportvg feuerbach  e2 '))).toEqual(['t2']);
  });

  it('020 US1-S7 ohne Spiel: alle eigenen, bei genau einer nur diese, höchstens sechs', () => {
    expect(quickTeams([E1, E2], null)).toEqual(['t1', 't2']);
    expect(quickTeams([E3], null)).toEqual(['t3']);
    expect(quickTeams([E1, E2, E3, D1, D2, D3, F1], null)).toEqual(ids([E1, E2, E3, D1, D2, D3]));
  });

  it('beendetes Spiel oder Spiel einer fremden Mannschaft: Regel 2 bzw. 3', () => {
    expect(quickTeams([E1, E2], game(E2, { status: 'finished' }))).toEqual(['t1', 't2']);
    expect(quickTeams([E1, E2], game('Sportvg Feuerbach C1'))).toEqual(['t1', 't2']);
    expect(quickTeams([E3], game('Sportvg Feuerbach C1'))).toEqual(['t3']);
  });

  it('020 US1-S5 Hinweis nennt die Mannschaften wie auf den Chips', () => {
    expect(startHint([E1, E2], ['t1', 't2'])).toBe('Neu mit E1 und E2.');
    expect(startHint([E1, E2, E3], ['t2'])).toBe('Neu mit E2.');
    expect(startHint([E1, E2, E3], ['t1', 't2', 't3'])).toBe('Neu mit E1, E2 und E3.');
    const twice = [E1, { ...E1, id: 't9' }];
    expect(liveTeamOptions(twice).map((o) => o.key)).toEqual(['E1', 'E1 (2)']);
    expect(startHint(twice, ['t1', 't9'])).toBe('Neu mit E1 und E1 (2).');
  });
});
