import { and, desc, eq, gte, sql } from 'drizzle-orm';

import { studyDaysBetween } from '@/domain/srs/time';

import type { DoneToday, StudyCard } from '@/domain/srs/queue';
import type { Scheduler } from '@/domain/srs/scheduler';
import type { CardState, Direction, Rating } from '@/domain/srs/types';

import type { Db } from '../db/client';
import { cards, revlog, type CardRow } from '../db/schema';

export const DIRECTIONS: Direction[] = ['recognition', 'production'];

export function cardId(wordId: string, direction: Direction): string {
  return `${wordId}|${direction === 'recognition' ? 'r' : 'p'}`;
}

function toStudyCard(row: CardRow): StudyCard {
  return {
    id: row.id,
    wordId: row.wordId,
    direction: row.direction,
    rank: row.rank,
    status: row.status,
    due: row.due,
    interval: row.interval,
    ease: row.ease,
    step: row.step,
    reps: row.reps,
    lapses: row.lapses,
    againCount: row.againCount,
  };
}

function stateColumns(s: CardState) {
  return {
    status: s.status,
    due: s.due,
    interval: s.interval,
    ease: s.ease,
    step: s.step,
    reps: s.reps,
    lapses: s.lapses,
    againCount: s.againCount,
  };
}

/**
 * Creates the two cards of every word that has none yet (first launch, or new words in an
 * app update) and refreshes frequency ranks. Existing progress is never touched.
 */
export function seedCards(db: Db, words: { id: string; rank: number }[], scheduler: Scheduler, now: number): number {
  const before = countCards(db);
  const rows = words.flatMap((w) =>
    DIRECTIONS.map((direction) => ({
      id: cardId(w.id, direction),
      wordId: w.id,
      direction,
      rank: w.rank,
      ...stateColumns(scheduler.newCard(now)),
      updatedAt: now,
    })),
  );
  db.transaction((tx) => {
    for (let i = 0; i < rows.length; i += 50) {
      tx.insert(cards)
        .values(rows.slice(i, i + 50))
        .onConflictDoUpdate({ target: cards.id, set: { rank: sql`excluded.rank` } })
        .run();
    }
  });
  return countCards(db) - before;
}

export function countCards(db: Db): number {
  return db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM cards`)?.n ?? 0;
}

export function allCards(db: Db): StudyCard[] {
  return db.select().from(cards).all().map(toStudyCard);
}

export function getCard(db: Db, id: string): StudyCard | undefined {
  const row = db.select().from(cards).where(eq(cards.id, id)).get();
  return row ? toStudyCard(row) : undefined;
}

export type AnswerInput = {
  cardId: string;
  rating: Rating;
  now: number;
  durationMs: number;
  /** 'practice' logs the answer without changing the schedule (cards that aren't due yet). */
  kind: 'review' | 'practice';
  scheduler: Scheduler;
  newId: () => string;
};

/** Grades a card: updates its schedule and appends to the review log, atomically. */
export function answerCard(db: Db, input: AnswerInput): { revlogId: string; card: StudyCard } {
  return db.transaction((tx) => {
    const row = tx.select().from(cards).where(eq(cards.id, input.cardId)).get();
    if (!row) throw new Error(`Unknown card ${input.cardId}`);
    const before = toStudyCard(row);
    const next = input.kind === 'review' ? input.scheduler.answer(before, input.rating, input.now) : before;
    const revlogId = input.newId();
    tx.insert(revlog)
      .values({
        id: revlogId,
        cardId: input.cardId,
        reviewedAt: input.now,
        rating: input.rating,
        kind: input.kind,
        statusBefore: before.status,
        intervalAfter: next.interval,
        easeAfter: next.ease,
        durationMs: Math.round(input.durationMs),
        prev: JSON.stringify(stateColumns(before)),
        updatedAt: input.now,
      })
      .run();
    if (input.kind === 'review') {
      tx.update(cards).set({ ...stateColumns(next), updatedAt: input.now }).where(eq(cards.id, input.cardId)).run();
    }
    return { revlogId, card: { ...before, ...stateColumns(next) } };
  });
}

/** Reverts the most recent answer. The log entry is kept as a tombstone so the undo can sync. */
export function undoLast(db: Db, now: number): string | null {
  return db.transaction((tx) => {
    const last = tx.select().from(revlog).where(eq(revlog.deleted, 0)).orderBy(desc(revlog.reviewedAt)).limit(1).get();
    if (!last) return null;
    if (last.kind === 'review') {
      const prev = JSON.parse(last.prev) as CardState;
      tx.update(cards).set({ ...stateColumns(prev), updatedAt: now }).where(eq(cards.id, last.cardId)).run();
    }
    tx.update(revlog).set({ deleted: 1, updatedAt: now }).where(eq(revlog.id, last.id)).run();
    return last.cardId;
  });
}

/** What was already studied since the start of today's study day (for daily limits). */
export function doneToday(db: Db, dayStart: number): DoneToday {
  const rows = db
    .select({ statusBefore: revlog.statusBefore, direction: cards.direction, n: sql<number>`COUNT(*)` })
    .from(revlog)
    .innerJoin(cards, eq(cards.id, revlog.cardId))
    .where(and(eq(revlog.deleted, 0), eq(revlog.kind, 'review'), gte(revlog.reviewedAt, dayStart)))
    .groupBy(revlog.statusBefore, cards.direction)
    .all();
  const done: DoneToday = { newRecognition: 0, newProduction: 0, reviews: 0 };
  for (const r of rows) {
    if (r.statusBefore === 'new') {
      if (r.direction === 'recognition') done.newRecognition += r.n;
      else done.newProduction += r.n;
    } else if (r.statusBefore === 'review') {
      done.reviews += r.n;
    }
  }
  return done;
}

/** Number of words whose JP → EN card has been started (for goal pacing). */
export function startedWords(db: Db): number {
  return (
    db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM cards WHERE direction = 'recognition' AND status != 'new'`)?.n ?? 0
  );
}

/** Consecutive study days ending today (or yesterday, when today has no review yet). */
export function streak(db: Db, now: number, dayStartHour: number): number {
  const rows = db
    .select({ at: revlog.reviewedAt })
    .from(revlog)
    .where(eq(revlog.deleted, 0))
    .orderBy(desc(revlog.reviewedAt))
    .all();
  const daysAgo = new Set(rows.map((r) => studyDaysBetween(r.at, now, dayStartHour)));
  const start = daysAgo.has(0) ? 0 : 1;
  let n = 0;
  while (daysAgo.has(start + n)) n++;
  return n;
}

/** Back to zero: every card new again; the review log is kept as tombstones so a later sync can follow. */
export function resetProgress(db: Db, scheduler: Scheduler, now: number): void {
  const fresh = stateColumns(scheduler.newCard(now));
  db.transaction((tx) => {
    tx.update(cards).set({ ...fresh, updatedAt: now }).run();
    tx.update(revlog).set({ deleted: 1, updatedAt: now }).where(eq(revlog.deleted, 0)).run();
  });
}

