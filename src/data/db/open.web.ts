/**
 * Web (the "PC" version): SQLite compiled to WebAssembly (sql.js), kept in memory and saved
 * to IndexedDB whenever it changes. Unlike expo-sqlite's web build, this needs no special
 * cross-origin headers from the hosting server.
 */
import { drizzle } from 'drizzle-orm/sql-js';
import { Asset } from 'expo-asset';
import initSqlJs, { type Database } from 'sql.js';

import { migrate, type Db } from './client';
import { schema } from './schema';

const IDB_NAME = 'n5turbo';
const STORE = 'files';
const KEY = 'n5turbo.db';
const SAVE_EVERY_MS = 2000;

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function load(): Promise<Uint8Array | null> {
  const store = (await idb()).transaction(STORE, 'readonly').objectStore(STORE);
  return new Promise((resolve, reject) => {
    const req = store.get(KEY);
    req.onsuccess = () => resolve((req.result as Uint8Array | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function save(bytes: Uint8Array): Promise<void> {
  const tx = (await idb()).transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(bytes, KEY);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function totalChanges(sqlite: Database): number {
  return Number(sqlite.exec('SELECT total_changes()')[0]?.values[0]?.[0] ?? 0);
}

export async function openDb(): Promise<Db> {
  // Metro resolves the .wasm file to a bundled asset URL (see metro.config.js).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const wasm = Asset.fromModule(require('sql.js/dist/sql-wasm.wasm'));
  const SQL = await initSqlJs({ locateFile: () => wasm.uri });
  let stored: Uint8Array | null = null;
  try {
    stored = await load();
  } catch {
    // Private window or blocked storage: run in memory only.
  }
  const sqlite = new SQL.Database(stored ?? undefined);
  const db = drizzle(sqlite, { schema }) as unknown as Db;
  migrate(db);

  let saved = -1;
  const persist = () => {
    const changes = totalChanges(sqlite);
    if (changes === saved) return;
    saved = changes;
    save(sqlite.export()).catch(() => {
      saved = -1; // retry next tick
    });
  };
  setInterval(persist, SAVE_EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist();
  });
  window.addEventListener('pagehide', persist);
  return db;
}
