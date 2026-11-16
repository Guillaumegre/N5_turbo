import { addStudyDays } from './time';
import { MINUTE, type CardState, type Direction, type SchedulerConfig } from './types';

export type StudyCard = CardState & { id: string; wordId: string; direction: Direction; rank: number };

export type DailyLimits = {
  /** New words per day (recognition cards), from the goal or settings. */
  newRecognition: number;
  /** New production cards per day (EN → JP), unlocked once the word's JP → EN card graduated. */
  newProduction: number;
  /** Maximum reviews per day. */
  reviews: number;
};

export type DoneToday = { newRecognition: number; newProduction: number; reviews: number };

export type QueueOptions = {
  now: number;
  config: SchedulerConfig;
  limits: DailyLimits;
  doneToday: DoneToday;
  /** Free tier: only words up to this frequency rank. */
  maxRank?: number;
  /** Extra filter (theme, part of speech… from milestone 5). */
  include?: (card: StudyCard) => boolean;
  /** Learning cards due within this window are shown now (Anki default 20 min). */
  learnAheadMs?: number;
};

export type StudyQueue = { learning: StudyCard[]; review: StudyCard[]; fresh: StudyCard[] };

export function buildQueue(cards: StudyCard[], o: QueueOptions): StudyQueue {
  const learnAhead = o.learnAheadMs ?? 20 * MINUTE;
  const endOfToday = addStudyDays(o.now, 1, o.config.dayStartHour);
  const eligible = cards.filter((c) => (o.maxRank === undefined || c.rank <= o.maxRank) && (!o.include || o.include(c)));

  const learning = eligible
    .filter((c) => (c.status === 'learning' || c.status === 'relearning') && c.due <= o.now + learnAhead)
    .sort((a, b) => a.due - b.due);

  const review = eligible
    .filter((c) => c.status === 'review' && c.due < endOfToday)
    .sort((a, b) => a.due - b.due || a.rank - b.rank)
    .slice(0, Math.max(0, o.limits.reviews - o.doneToday.reviews));

  // A production card (EN → JP) only appears once its recognition card (JP → EN) graduated.
  const graduated = new Set(cards.filter((c) => c.direction === 'recognition' && c.status === 'review').map((c) => c.wordId));
  const byRank = (a: StudyCard, b: StudyCard) => a.rank - b.rank;
  const newRecognition = eligible
    .filter((c) => c.status === 'new' && c.direction === 'recognition')
    .sort(byRank)
    .slice(0, Math.max(0, o.limits.newRecognition - o.doneToday.newRecognition));
  const newProduction = eligible
    .filter((c) => c.status === 'new' && c.direction === 'production' && graduated.has(c.wordId))
    .sort(byRank)
    .slice(0, Math.max(0, o.limits.newProduction - o.doneToday.newProduction));

  return { learning, review, fresh: [...newRecognition, ...newProduction] };
}

/** The three Anki counters: new / learning / due. */
export function queueCounts(q: StudyQueue) {
  return { new: q.fresh.length, learning: q.learning.length, due: q.review.length };
}
