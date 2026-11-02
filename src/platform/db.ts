import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { withSettingsDefaults } from '../domain/settings';
import type { Game, Player, Settings } from '../domain/types';

interface TortickerDB extends DBSchema {
  games: { key: string; value: Game; indexes: { 'by-createdAt': number; 'by-status': string } };
  players: { key: string; value: Player };
  settings: { key: string; value: Settings };
}

const DB_NAME = 'torticker';
const SETTINGS_KEY = 'app';
let dbPromise: Promise<IDBPDatabase<TortickerDB>> | null = null;

function db(): Promise<IDBPDatabase<TortickerDB>> {
  dbPromise ??= openDB<TortickerDB>(DB_NAME, 1, {
    upgrade(database) {
      const games = database.createObjectStore('games', { keyPath: 'id' });
      games.createIndex('by-createdAt', 'createdAt');
      games.createIndex('by-status', 'status');
      database.createObjectStore('players', { keyPath: 'id' });
      database.createObjectStore('settings');
    },
  });
  return dbPromise;
}

/** Für Tests: Verbindung schließen, damit eine neue Datenbank geöffnet werden kann. */
export async function closeDb(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

export async function getGame(id: string): Promise<Game | undefined> {
  return (await db()).get('games', id);
}

/** FR-010: jede Änderung wird sofort geschrieben (write-through). */
export async function putGame(game: Game): Promise<void> {
  await (await db()).put('games', game);
}

/** Neueste zuerst. */
export async function listGames(): Promise<Game[]> {
  return (await (await db()).getAllFromIndex('games', 'by-createdAt')).reverse();
}

/** Jüngstes Spiel, das noch nicht beendet ist (Fortsetzen nach Neustart). */
export async function findOpenGame(): Promise<Game | undefined> {
  return (await listGames()).find((g) => g.status !== 'finished');
}

export async function getPlayers(): Promise<Player[]> {
  return (await db()).getAll('players');
}

/** Schreibt die übergebenen Spieler (neu oder geändert) in einer Transaktion. */
export async function putPlayers(players: Player[]): Promise<void> {
  const tx = (await db()).transaction('players', 'readwrite');
  await Promise.all([...players.map((p) => tx.store.put(p)), tx.done]);
}

export async function getSettings(): Promise<Settings> {
  return withSettingsDefaults(await (await db()).get('settings', SETTINGS_KEY));
}

export async function putSettings(settings: Settings): Promise<void> {
  await (await db()).put('settings', settings, SETTINGS_KEY);
}
