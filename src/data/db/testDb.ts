/**
 * In-memory SQLite for unit tests (sql.js runs in Node, no native build needed).
 * Not imported by app code.
 */
import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';

import { migrate, type Db } from './client';
import { schema } from './schema';

export async function createTestDb(): Promise<Db> {
  const SQL = await initSqlJs();
  const db = drizzle(new SQL.Database(), { schema }) as unknown as Db;
  migrate(db);
  return db;
}
