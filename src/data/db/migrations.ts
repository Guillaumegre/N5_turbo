/**
 * Ordered schema migrations. Never edit a shipped migration: append a new one.
 * The applied count is stored in SQLite's `PRAGMA user_version`.
 */
export const MIGRATIONS: string[][] = [
  // 1: initial schema
  [
    `CREATE TABLE cards (
      id TEXT PRIMARY KEY NOT NULL,
      word_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      rank INTEGER NOT NULL,
      status TEXT NOT NULL,
      due INTEGER NOT NULL,
      interval INTEGER NOT NULL,
      ease INTEGER NOT NULL,
      step INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      lapses INTEGER NOT NULL,
      again_count INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX cards_status_due ON cards (status, due)`,
    `CREATE INDEX cards_word ON cards (word_id)`,
    `CREATE TABLE revlog (
      id TEXT PRIMARY KEY NOT NULL,
      card_id TEXT NOT NULL,
      reviewed_at INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      kind TEXT NOT NULL,
      status_before TEXT NOT NULL,
      interval_after INTEGER NOT NULL,
      ease_after INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      prev TEXT NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX revlog_reviewed_at ON revlog (reviewed_at)`,
    `CREATE INDEX revlog_card ON revlog (card_id)`,
    `CREATE TABLE settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE presets (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      filter TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )`,
  ],
];
