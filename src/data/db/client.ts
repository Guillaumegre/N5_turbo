import { sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import { MIGRATIONS } from './migrations';
import type { schema } from './schema';

/**
 * The app talks to SQLite through drizzle's synchronous API. Native uses expo-sqlite,
 * web and tests use sql.js (WebAssembly): both are synchronous SQLite drivers.
 */
export type Db = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

export function migrate(db: Db): void {
  const row = db.get<{ user_version: number }>(sql`PRAGMA user_version`);
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.transaction((tx) => {
      for (const statement of MIGRATIONS[v]) tx.run(sql.raw(statement));
    });
    db.run(sql.raw(`PRAGMA user_version = ${v + 1}`));
  }
}
