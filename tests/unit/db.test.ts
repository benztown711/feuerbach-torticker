import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { createGame, endSection, kickoff } from '../../src/domain/game';
import type { NewGameInput } from '../../src/domain/types';
import { closeDb, findOpenGame, getGame, getSettings, listGames, putGame, putSettings } from '../../src/platform/db';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const input: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach E1',
  opponent: 'TSV Musterstadt',
  venue: 'home',
  schema: { sections: 1, sectionMinutes: 12 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};

beforeEach(async () => {
  await closeDb();
  globalThis.indexedDB = new IDBFactory();
});

describe('T022 FR-010 IndexedDB', () => {
  it('liefert Vorgabe-Einstellungen bei leerer Datenbank', async () => {
    expect(await getSettings()).toMatchObject({ recentOwnTeams: [], theme: 'system', lastOwnColor: null });
  });

  it('speichert und liest Einstellungen', async () => {
    await putSettings({ ...(await getSettings()), recentOwnTeams: ['Sportvg Feuerbach D3'] });
    expect((await getSettings()).recentOwnTeams).toEqual(['Sportvg Feuerbach D3']);
  });

  it('speichert, liest und aktualisiert Spiele', async () => {
    const g = createGame(input, { id: 'a', now: T0 });
    await putGame(g);
    expect(await getGame('a')).toEqual(g);
    await putGame(kickoff(g, T0 + 1000));
    expect((await getGame('a'))?.status).toBe('running');
    expect(await getGame('fehlt')).toBeUndefined();
  });

  it('listGames neueste zuerst, findOpenGame findet das jüngste nicht beendete Spiel', async () => {
    const a = createGame(input, { id: 'a', now: T0 });
    const b = createGame(input, { id: 'b', now: T0 + 1000 });
    const c = endSection(kickoff(createGame(input, { id: 'c', now: T0 + 2000 }), T0 + 2000), T0 + 3000);
    await putGame(a);
    await putGame(b);
    await putGame(c);
    expect((await listGames()).map((g) => g.id)).toEqual(['c', 'b', 'a']);
    expect((await findOpenGame())?.id).toBe('b');
  });

  it('findOpenGame liefert undefined ohne offene Spiele', async () => {
    expect(await findOpenGame()).toBeUndefined();
  });
});
