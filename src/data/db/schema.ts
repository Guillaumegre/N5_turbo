/**
 * Local database schema (SQLite, via drizzle). Designed for later sync (milestone 7):
 * - cards have deterministic ids (`<wordId>|r` / `<wordId>|p`) so every device agrees on them;
 * - the review log is append-only with UUIDs; undo writes a tombstone (`deleted = 1`);
 * - every row carries `updated_at` for last-write-wins conflict resolution.
 * Keep in sync with migrations.ts (tested by repo tests running the migrations).
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const cards = sqliteTable(
  'cards',
  {
    id: text('id').primaryKey(),
    wordId: text('word_id').notNull(),
    direction: text('direction', { enum: ['recognition', 'production'] }).notNull(),
    /** Frequency rank of the word (1 = most common): order of introduction, free tier. */
    rank: integer('rank').notNull(),
    status: text('status', { enum: ['new', 'learning', 'review', 'relearning'] }).notNull(),
    due: integer('due').notNull(),
    interval: integer('interval').notNull(),
    ease: integer('ease').notNull(),
    step: integer('step').notNull(),
    reps: integer('reps').notNull(),
    lapses: integer('lapses').notNull(),
    againCount: integer('again_count').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('cards_status_due').on(t.status, t.due), index('cards_word').on(t.wordId)],
);

export const revlog = sqliteTable(
  'revlog',
  {
    id: text('id').primaryKey(),
    cardId: text('card_id').notNull(),
    reviewedAt: integer('reviewed_at').notNull(),
    rating: integer('rating').notNull(),
    /** 'review' changes scheduling; 'practice' (cards not due yet) is only logged for stats. */
    kind: text('kind', { enum: ['review', 'practice'] }).notNull(),
    statusBefore: text('status_before').notNull(),
    intervalAfter: integer('interval_after').notNull(),
    easeAfter: integer('ease_after').notNull(),
    durationMs: integer('duration_ms').notNull(),
    /** JSON of the card state before the answer: what undo restores. */
    prev: text('prev').notNull(),
    deleted: integer('deleted').notNull().default(0),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('revlog_reviewed_at').on(t.reviewedAt), index('revlog_card').on(t.cardId)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  /** JSON-encoded value. */
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const presets = sqliteTable('presets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** JSON-encoded filter combination (milestone 5). */
  filter: text('filter').notNull(),
  createdAt: integer('created_at').notNull(),
  deleted: integer('deleted').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});

export const schema = { cards, revlog, settings, presets };
export type CardRow = typeof cards.$inferSelect;
export type RevlogRow = typeof revlog.$inferSelect;
