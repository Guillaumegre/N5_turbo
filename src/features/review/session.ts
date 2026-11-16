/**
 * Review session engine (pure, no React): which card to show next, learning repeats within
 * the session, undo, progress and end-of-session stats.
 */
import type { StudyCard, StudyQueue } from '@/domain/srs/queue';
import { MINUTE, type Rating } from '@/domain/srs/types';

export const LEARN_AHEAD_MS = 20 * MINUTE;
/** Answers slower than this count as this long (someone left the phone on the table). */
export const MAX_ANSWER_MS = 60_000;

export type AnswerRecord = {
  card: StudyCard; // state before the answer (what undo restores)
  rating: Rating;
  durationMs: number;
  at: number;
};

export type Session = {
  /** Cards not shown yet, in order. */
  pending: StudyCard[];
  /** Cards in (re)learning that come back during this session, sorted by due time. */
  learning: StudyCard[];
  answers: AnswerRecord[];
};

/** Spreads new cards evenly among reviews (Anki's "mix new cards and reviews"). */
export function interleave(reviews: StudyCard[], fresh: StudyCard[]): StudyCard[] {
  if (!reviews.length) return [...fresh];
  if (!fresh.length) return [...reviews];
  const out: StudyCard[] = [];
  const every = (reviews.length + fresh.length) / fresh.length;
  let r = 0;
  let f = 0;
  for (let i = 0; i < reviews.length + fresh.length; i++) {
    const wantNew = f < fresh.length && (r >= reviews.length || i + 1 >= Math.round((f + 1) * every));
    out.push(wantNew ? fresh[f++] : reviews[r++]);
  }
  return out;
}

export function createSession(queue: StudyQueue): Session {
  return {
    pending: interleave(queue.review, queue.fresh),
    learning: [...queue.learning].sort((a, b) => a.due - b.due),
    answers: [],
  };
}

/** The card to show now, or null when the session is over. */
export function nextCard(s: Session, now: number): StudyCard | null {
  const firstLearning = s.learning[0];
  if (firstLearning && firstLearning.due <= now) return firstLearning;
  if (s.pending.length) return s.pending[0];
  // Nothing else to do: show a learning card a little early, as Anki does.
  if (firstLearning && firstLearning.due <= now + LEARN_AHEAD_MS) return firstLearning;
  return null;
}

/** Records an answer. `updated` is the card's new state from the scheduler. */
export function applyAnswer(
  s: Session,
  shown: StudyCard,
  updated: StudyCard,
  rating: Rating,
  now: number,
  durationMs: number,
): Session {
  const pending = s.pending.filter((c) => c.id !== shown.id);
  let learning = s.learning.filter((c) => c.id !== shown.id);
  // Learning cards come back in this session (10 minutes, 1 minute…); graduated cards are done.
  if (updated.status === 'learning' || updated.status === 'relearning') {
    learning = [...learning, updated].sort((a, b) => a.due - b.due);
  }
  return {
    pending,
    learning,
    answers: [...s.answers, { card: shown, rating, durationMs: Math.min(durationMs, MAX_ANSWER_MS), at: now }],
  };
}

/** Undoes the last answer: that card is shown again, in its previous state. */
export function applyUndo(s: Session): Session {
  const last = s.answers[s.answers.length - 1];
  if (!last) return s;
  return {
    pending: [last.card, ...s.pending.filter((c) => c.id !== last.card.id)],
    learning: s.learning.filter((c) => c.id !== last.card.id),
    answers: s.answers.slice(0, -1),
  };
}

/** Anki's three counters for what is left: new / learning / due. */
export function remainingCounts(s: Session) {
  const fromPending = (status: StudyCard['status'][]) => s.pending.filter((c) => status.includes(c.status)).length;
  return {
    new: fromPending(['new']),
    learning: s.learning.length + fromPending(['learning', 'relearning']),
    due: fromPending(['review']),
  };
}

/** "18 / 77": answers given, out of answers given plus cards still to see. */
export function progress(s: Session) {
  const done = s.answers.length;
  return { done, total: done + s.pending.length + s.learning.length };
}

export type SessionStats = {
  cards: number;
  answers: number;
  /** Share of answers that weren't "Again", 0–100. */
  correctPercent: number;
  timeMs: number;
  byRating: Record<Rating, number>;
  /** Word ids answered "Again" at least once. */
  toRevisit: string[];
};

export function sessionStats(s: Session): SessionStats {
  const byRating: Record<Rating, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const a of s.answers) byRating[a.rating]++;
  const answers = s.answers.length;
  return {
    cards: new Set(s.answers.map((a) => a.card.id)).size,
    answers,
    correctPercent: answers ? Math.round(((answers - byRating[1]) / answers) * 100) : 0,
    timeMs: s.answers.reduce((t, a) => t + a.durationMs, 0),
    byRating,
    toRevisit: [...new Set(s.answers.filter((a) => a.rating === 1).map((a) => a.card.wordId))],
  };
}
