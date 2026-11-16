/**
 * Custom sessions ("Themes & filters"): which cards match a filter, and how they are studied.
 *
 * - Due cards and new cards are real reviews: answering them changes their schedule.
 * - Cards that aren't due yet (state "All") are practice: logged for stats, schedule untouched.
 * - A production card (EN → JP) whose word hasn't graduated JP → EN yet is locked: never
 *   introduced by a custom session, only practised in "All".
 * - Daily limits don't apply: the user picked these words on purpose; the length caps the session.
 */
import { firstKana, kanaRow, KANA_ROWS, lastKana, type KanaRow } from './kana';
import type { StudyCard } from './srs/queue';
import { addStudyDays } from './srs/time';
import { MINUTE, type SchedulerConfig } from './srs/types';
import { isWeak } from './srs/weak';

export type PosGroup = 'noun' | 'verb' | 'i-adj' | 'na-adj' | 'adverb' | 'other';
export const POS_GROUPS: PosGroup[] = ['noun', 'verb', 'i-adj', 'na-adj', 'adverb', 'other'];

export type FilterDirection = 'recognition' | 'production' | 'random';
export type FilterCards = 'due' | 'new' | 'learning' | 'all';
export type SessionLength = 'all' | 10 | 20 | 50 | 'sprint';

export type Filter = {
  direction: FilterDirection;
  /** Theme ids; empty = every theme. */
  themes: string[];
  /** Empty = any part of speech. */
  pos: PosGroup[];
  /** Kana rows ('ka') or single hiragana ('か'); empty = anything. */
  startsWith: string[];
  /** Single hiragana (or ー); empty = anything. */
  endsWith: string[];
  cards: FilterCards;
  weakOnly: boolean;
  length: SessionLength;
};

export const DEFAULT_FILTER: Filter = {
  direction: 'recognition',
  themes: [],
  pos: [],
  startsWith: [],
  endsWith: [],
  cards: 'due',
  weakOnly: false,
  // Without filters "due + new" is every unseen word: a capped session is the sane default.
  length: 20,
};

export const SPRINT_MINUTES = 5;

/** The word fields filters look at (a subset of `Word`, so tests don't need full entries). */
export type FilterWord = { id: string; reading: string; pos: string; themes: string[] };

export function posGroup(pos: string): PosGroup {
  return (POS_GROUPS as string[]).includes(pos) ? (pos as PosGroup) : 'other';
}

function isRow(value: string): value is KanaRow {
  return value in KANA_ROWS;
}

/** Word-level part of the filter: theme, part of speech, first and last kana. */
export function wordMatches(w: FilterWord, f: Filter): boolean {
  if (f.themes.length && !w.themes.some((t) => f.themes.includes(t))) return false;
  if (f.pos.length && !f.pos.includes(posGroup(w.pos))) return false;
  if (f.startsWith.length) {
    const first = firstKana(w.reading);
    const row = kanaRow(first);
    if (!f.startsWith.some((v) => (isRow(v) ? v === row : v === first))) return false;
  }
  if (f.endsWith.length && !f.endsWith.includes(lastKana(w.reading))) return false;
  return true;
}

export type CustomQueue = {
  /** (Re)learning cards due now or soon: real reviews, handled by the session's learning list. */
  learning: StudyCard[];
  /** Due reviews: real. */
  review: StudyCard[];
  /** New cards: real (introduced now). */
  fresh: StudyCard[];
  /** Not due yet, or locked: practice only. */
  practice: StudyCard[];
};

export type CustomQueueOptions = {
  now: number;
  config: SchedulerConfig;
  maxRank?: number;
  learnAheadMs?: number;
  /** Random source (tests pass a seeded one). */
  random?: () => number;
};

export function customQueueSize(q: CustomQueue): number {
  return q.learning.length + q.review.length + q.fresh.length + q.practice.length;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildCustomQueue(
  cards: StudyCard[],
  wordsById: Map<string, FilterWord>,
  f: Filter,
  o: CustomQueueOptions,
): CustomQueue {
  const random = o.random ?? Math.random;
  const learnAhead = o.learnAheadMs ?? 20 * MINUTE;
  const endOfToday = addStudyDays(o.now, 1, o.config.dayStartHour);
  const graduated = new Set(cards.filter((c) => c.direction === 'recognition' && c.status === 'review').map((c) => c.wordId));

  const isDue = (c: StudyCard) =>
    c.status === 'review' ? c.due < endOfToday : c.status !== 'new' && c.due <= o.now + learnAhead;
  const locked = (c: StudyCard) => c.status === 'new' && c.direction === 'production' && !graduated.has(c.wordId);

  let pool = cards.filter((c) => {
    if (o.maxRank !== undefined && c.rank > o.maxRank) return false;
    if (f.direction !== 'random' && c.direction !== f.direction) return false;
    const w = wordsById.get(c.wordId);
    if (!w || !wordMatches(w, f)) return false;
    if (f.weakOnly && !isWeak(c)) return false;
    switch (f.cards) {
      case 'due':
        return c.status === 'new' ? !locked(c) : isDue(c);
      case 'new':
        return c.status === 'new' && !locked(c);
      case 'learning':
        return c.status === 'learning' || c.status === 'relearning';
      case 'all':
        return true;
    }
  });

  // Random direction: one card per word, picked at random among the word's matching cards.
  if (f.direction === 'random') {
    const byWord = new Map<string, StudyCard[]>();
    for (const c of pool) byWord.set(c.wordId, [...(byWord.get(c.wordId) ?? []), c]);
    pool = [...byWord.values()].map((list) => list[Math.floor(random() * list.length)]);
  }

  const out: CustomQueue = { learning: [], review: [], fresh: [], practice: [] };
  for (const c of pool) {
    if (c.status === 'new') (locked(c) ? out.practice : out.fresh).push(c);
    else if (!isDue(c)) out.practice.push(c);
    else if (c.status === 'review') out.review.push(c);
    else out.learning.push(c);
  }
  out.learning.sort((a, b) => a.due - b.due);
  out.review.sort((a, b) => a.due - b.due || a.rank - b.rank);
  out.fresh.sort((a, b) => a.rank - b.rank);
  out.practice = shuffle(out.practice, random);
  return out;
}

/** Caps a queue to `n` cards, keeping the most urgent: learning, then due, then new, then practice. */
export function capQueue(q: CustomQueue, n: number): CustomQueue {
  let left = n;
  const take = (list: StudyCard[]) => {
    const kept = list.slice(0, Math.max(0, left));
    left -= kept.length;
    return kept;
  };
  return { learning: take(q.learning), review: take(q.review), fresh: take(q.fresh), practice: take(q.practice) };
}

export function filtersEqual(a: Filter, b: Filter): boolean {
  const norm = (f: Filter) =>
    JSON.stringify({
      ...f,
      themes: [...f.themes].sort(),
      pos: [...f.pos].sort(),
      startsWith: [...f.startsWith].sort(),
      endsWith: [...f.endsWith].sort(),
    });
  return norm(a) === norm(b);
}

/** Fills in fields missing from an older saved filter (presets outlive app versions). */
export function normalizeFilter(raw: unknown): Filter {
  const f = (raw && typeof raw === 'object' ? raw : {}) as Partial<Filter>;
  return { ...DEFAULT_FILTER, ...f };
}

/** Hiragana in gojūon order, for the single-kana pickers. */
export const GOJUON = 'あいうえおかがきぎくぐけげこごさざしじすずせぜそぞただちぢつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもやゆよらりるれろわをんー';

/** The kana that actually start (or end) some word, in gojūon order. */
export function usedKana(words: FilterWord[], position: 'first' | 'last'): string[] {
  const used = new Set(words.map((w) => (position === 'first' ? firstKana(w.reading) : lastKana(w.reading))));
  return [...GOJUON].filter((k) => used.has(k));
}

