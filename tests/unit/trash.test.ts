import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGame } from '../../src/domain/game';
import type { NewGameInput } from '../../src/domain/types';
import { closeDb, listGames, onGameWrite, putGames } from '../../src/platform/db';
import {
  UNDO_MS,
  currentTrash,
  finalizeTrash,
  onTrashChange,
  trashGames,
  trashedIds,
  undoTrash,
} from '../../src/platform/trash';

const T0 = Date.UTC(2026, 10, 7, 9, 30, 0);
const input: NewGameInput = {
  ownTeam: 'Sportvg Feuerbach E1',
  opponent: 'TSV Musterstadt',
  venue: 'home',
  schema: { sections: 1, sectionMinutes: 20 },
  ownColor: 'rot',
  oppColor: 'schwarz',
};

/** Seitenlebenszyklus wie im Browser: document (visibilitychange) und window (pagehide). */
class FakeDocument extends EventTarget {
  visibilityState: 'visible' | 'hidden' = 'visible';
}
let doc: FakeDocument;
let win: EventTarget;

const ids = async (): Promise<string[]> => (await listGames()).map((g) => g.id).sort();
/** Wartet, bis ein angestoßenes endgültiges Löschen in der Datenbank angekommen ist. */
const flush = (): Promise<void> => new Promise((r) => setImmediate(r));

beforeEach(async () => {
  await closeDb();
  globalThis.indexedDB = new IDBFactory();
  doc = new FakeDocument();
  win = new EventTarget();
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  await putGames(['a', 'b', 'c'].map((id) => createGame(input, { id, now: T0 })));
});

afterEach(async () => {
  undoTrash();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('013 FR-D07 Löschvorgang vormerken und rückgängig machen', () => {
  it('vorgemerkte Spiele sind als gelöscht markiert, bleiben aber in der Datenbank', async () => {
    await trashGames(['a', 'b'], T0);
    expect([...trashedIds()].sort()).toEqual(['a', 'b']);
    expect(currentTrash()).toEqual({ ids: ['a', 'b'], until: T0 + UNDO_MS });
    expect(await ids()).toEqual(['a', 'b', 'c']);
  });

  it('"Rückgängig" verwirft den Vorgang ohne Datenbankzugriff; nichts wird gemeldet', async () => {
    const seen: string[] = [];
    const off = onGameWrite((c) => seen.push(c.kind));
    await trashGames(['a'], T0);
    undoTrash();
    expect(trashedIds().size).toBe(0);
    expect(currentTrash()).toBeNull();
    vi.advanceTimersByTime(UNDO_MS);
    await flush();
    off();
    expect(await ids()).toEqual(['a', 'b', 'c']);
    expect(seen).toEqual([]);
  });

  it('ohne Vorgang ändern "Rückgängig" und "endgültig" nichts; leere Liste merkt nichts vor', async () => {
    undoTrash();
    await finalizeTrash();
    await trashGames([], T0);
    expect(currentTrash()).toBeNull();
    expect(await ids()).toEqual(['a', 'b', 'c']);
  });
});

describe('013 FR-D08 endgültig löschen', () => {
  it('nach 10 Sekunden: aus der Datenbank gelöscht und je Spiel gemeldet', async () => {
    const seen: string[] = [];
    const off = onGameWrite((c) => c.kind === 'delete' && seen.push(c.id));
    await trashGames(['a', 'c'], T0);
    vi.advanceTimersByTime(UNDO_MS - 1);
    await flush();
    expect(await ids()).toEqual(['a', 'b', 'c']);
    vi.advanceTimersByTime(1);
    await flush();
    expect(await ids()).toEqual(['b']);
    off();
    expect(seen).toEqual(['a', 'c']);
    expect(currentTrash()).toBeNull();
  });

  it('App in den Hintergrund: sofort endgültig; wieder sichtbar ändert nichts', async () => {
    await trashGames(['a'], T0);
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(currentTrash()).not.toBeNull();
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(await ids()).toEqual(['b', 'c']);
    expect(currentTrash()).toBeNull();
  });

  it('Seite wird verlassen (pagehide): sofort endgültig', async () => {
    await trashGames(['b'], T0);
    win.dispatchEvent(new Event('pagehide'));
    await flush();
    expect(await ids()).toEqual(['a', 'c']);
  });

  it('nach dem Ende hört der Vorgang nicht mehr auf den Seitenlebenszyklus', async () => {
    await trashGames(['a'], T0);
    undoTrash();
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    win.dispatchEvent(new Event('pagehide'));
    await flush();
    expect(await ids()).toEqual(['a', 'b', 'c']);
  });

  it('ein neuer Vorgang macht den vorigen sofort endgültig', async () => {
    await trashGames(['a'], T0);
    await trashGames(['b'], T0 + 1000);
    expect(await ids()).toEqual(['b', 'c']);
    expect(currentTrash()).toEqual({ ids: ['b'], until: T0 + 1000 + UNDO_MS });
    // Der Zeitgeber des ersten Vorgangs löscht "b" nicht vorzeitig.
    vi.advanceTimersByTime(UNDO_MS - 1000);
    await flush();
    expect(await ids()).toEqual(['b', 'c']);
  });

  it('während des Schreibens bleibt das Spiel ausgeblendet, die Leiste "Rückgängig" ist schon weg', async () => {
    await trashGames(['a'], T0);
    const done = finalizeTrash();
    expect(currentTrash()).toBeNull();
    expect([...trashedIds()]).toEqual(['a']);
    await done;
    expect(trashedIds().size).toBe(0);
    expect(await ids()).toEqual(['b', 'c']);
  });

  it('Beobachter erfahren Vormerken, Rückgängig, Beginn und Ende des Schreibens; Abmelden wirkt', async () => {
    let calls = 0;
    const off = onTrashChange(() => calls++);
    await trashGames(['a'], T0);
    undoTrash();
    await trashGames(['b'], T0);
    await finalizeTrash();
    off();
    await trashGames(['c'], T0);
    expect(calls).toBe(5);
  });
});
