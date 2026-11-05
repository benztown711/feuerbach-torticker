import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { createGame, endSection, kickoff } from '../../src/domain/game';
import type { NewGameInput, Settings } from '../../src/domain/types';
import {
  closeDb,
  deleteGames,
  findOpenGame,
  putGames,
  getGame,
  getPlayers,
  getSettings,
  listGames,
  putGame,
  putPlayers,
  onGameWrite,
  putSettings,
} from '../../src/platform/db';

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
    expect(await getSettings()).toMatchObject({ teams: [], theme: 'system' });
  });

  it('speichert und liest Einstellungen', async () => {
    await putSettings({ ...(await getSettings()), theme: 'dark' });
    expect((await getSettings()).theme).toBe('dark');
  });

  it('004 alte Einstellungen ohne Mannschaften werden beim Lesen migriert', async () => {
    const old: Partial<Settings> = { ...(await getSettings()), recentOwnTeams: ['Sportvg Feuerbach D3'] };
    delete old.teams;
    await putSettings(old as Settings);
    expect((await getSettings()).teams.map((t) => t.name)).toEqual(['Sportvg Feuerbach D3']);
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

  it('T056 speichert und liest den Kader, ersetzt geänderte Spieler', async () => {
    expect(await getPlayers()).toEqual([]);
    await putPlayers([
      { id: 'a', name: 'Max', number: 1, deletedAt: null },
      { id: 'b', name: 'Ben', number: 3, deletedAt: null },
    ]);
    await putPlayers([{ id: 'a', name: 'Maxi', number: 1, deletedAt: null }]);
    const all = await getPlayers();
    expect(all.map((x) => x.name).sort()).toEqual(['Ben', 'Maxi']);
  });
});

describe('013 FR-D08 mehrere Spiele endgültig löschen', () => {
  it('löscht mehrere Spiele, meldet je Spiel "delete" mit dem Spiel; unbekannte Kennung ohne Fehler', async () => {
    await putGames(['a', 'b', 'c'].map((id) => createGame(input, { id, now: T0 })));
    const seen: string[] = [];
    const off = onGameWrite((c) => seen.push(c.kind === 'delete' ? `${c.id}:${c.game?.id}` : 'put'));
    await deleteGames(['a', 'c', 'fehlt']);
    off();
    expect((await listGames()).map((g) => g.id)).toEqual(['b']);
    expect(seen).toEqual(['a:a', 'c:c', 'fehlt:undefined']);
  });

  it('leere Liste ändert nichts', async () => {
    await putGame(createGame(input, { id: 'a', now: T0 }));
    await deleteGames([]);
    expect((await listGames()).map((g) => g.id)).toEqual(['a']);
  });
});

describe('006 FR-L06 Beobachter für Spieländerungen', () => {
  it('meldet nach putGame das Spiel und nach deleteGames die ID; Abmelden wirkt', async () => {
    const seen: string[] = [];
    const off = onGameWrite((change) => {
      seen.push(
        change.kind === 'put'
          ? `put:${change.game.id}:${change.game.status}`
          : `delete:${change.id}:${change.game?.id}`,
      );
    });
    const g = createGame(input, { id: 'a', now: T0 });
    await putGame(g);
    await putGame(kickoff(g, T0 + 1000));
    await deleteGames(['a']);
    await putGames([createGame(input, { id: 'r', now: T0 })]);
    off();
    await putGame(g);
    expect(seen).toEqual(['put:a:created', 'put:a:running', 'delete:a:a', 'put:r:created']);
  });

  it('ein fehlerhafter Beobachter stört weder das Speichern noch andere Beobachter', async () => {
    const seen: string[] = [];
    const off1 = onGameWrite(() => {
      throw new Error('kaputt');
    });
    const off2 = onGameWrite((c) => seen.push(c.kind));
    await putGame(createGame(input, { id: 'b', now: T0 }));
    off1();
    off2();
    expect(seen).toEqual(['put']);
    expect(await getGame('b')).toBeDefined();
  });
});
