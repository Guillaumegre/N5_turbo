/** Native (iOS / Android): expo-sqlite, a file in the app's private storage. */
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { migrate, type Db } from './client';
import { schema } from './schema';

export async function openDb(): Promise<Db> {
  const sqlite = openDatabaseSync('n5turbo.db');
  sqlite.execSync('PRAGMA journal_mode = WAL;');
  const db = drizzle(sqlite, { schema }) as unknown as Db;
  migrate(db);
  return db;
}
