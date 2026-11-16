import {
  buildCustomQueue,
  capQueue,
  customQueueSize,
  DEFAULT_FILTER,
  filtersEqual,
  normalizeFilter,
  usedKana,
  wordMatches,
  type Filter,
  type FilterWord,
} from './filters';
import type { StudyCard } from './srs/queue';
import { addStudyDays } from './srs/time';
import { DAY, DEFAULT_CONFIG, MINUTE, type CardStatus, type Direction } from './srs/types';

const NOW = new Date(2026, 10, 16, 10, 0).getTime();

const WORDS: FilterWord[] = [
  { id: 'aka', reading: 'あか', pos: 'noun', themes: ['colors'] },
  { id: 'akai', reading: 'あかい', pos: 'i-adj', themes: ['colors', 'adjectives'] },
  { id: 'taberu', reading: 'たべる', pos: 'verb', themes: ['actions', 'food'] },
  { id: 'kaku', reading: 'かく', pos: 'verb', themes: ['actions'] },
  { id: 'gakkou', reading: 'がっこう', pos: 'noun', themes: ['school_work'] },
  { id: 'koohii', reading: 'コーヒー', pos: 'noun', themes: ['food'] },
  { id: 'kore', reading: 'これ', pos: 'pronoun', themes: ['questions'] },
];
const BY_ID = new Map(WORDS.map((w) => [w.id, w]));

const f = (over: Partial<Filter> = {}): Filter => ({ ...DEFAULT_FILTER, ...over });

function card(wordId: string, direction: Direction, status: CardStatus, due = NOW, over: Partial<StudyCard> = {}): StudyCard {
  return {
    id: `${wordId}|${direction[0]}`,
    wordId,
    direction,
    rank: WORDS.findIndex((w) => w.id === wordId) + 1,
    status,
    due,
    interval: status === 'review' ? 3 : 0,
    ease: 2500,
    step: 0,
    reps: 0,
    lapses: 0,
    againCount: 0,
    ...over,
  };
}

const ids = (cards: StudyCard[]) => cards.map((c) => c.id);
const opts = { now: NOW, config: DEFAULT_CONFIG, random: () => 0 };

describe('word filters', () => {
  const match = (over: Partial<Filter>) => WORDS.filter((w) => wordMatches(w, f(over))).map((w) => w.id);

  it('matches every word with the default filter', () => {
    expect(match({})).toHaveLength(WORDS.length);
  });

  it('filters by theme (any of the selected)', () => {
    expect(match({ themes: ['colors'] })).toEqual(['aka', 'akai']);
    expect(match({ themes: ['colors', 'food'] })).toEqual(['aka', 'akai', 'taberu', 'koohii']);
  });

  it('groups minor parts of speech under "other"', () => {
    expect(match({ pos: ['verb'] })).toEqual(['taberu', 'kaku']);
    expect(match({ pos: ['other'] })).toEqual(['kore']);
  });

  it('starts with a kana row (voiced kana included) or a single kana', () => {
    expect(match({ startsWith: ['ka'] })).toEqual(['kaku', 'gakkou', 'koohii', 'kore']);
    expect(match({ startsWith: ['か'] })).toEqual(['kaku']);
    expect(match({ startsWith: ['こ', 'a'] })).toEqual(['aka', 'akai', 'koohii', 'kore']);
  });

  it('ends with a kana, katakana readings included', () => {
    expect(match({ endsWith: ['い'] })).toEqual(['akai']);
    expect(match({ endsWith: ['る', 'ー'] })).toEqual(['taberu', 'koohii']);
  });

  it('combines filters', () => {
    expect(match({ pos: ['verb'], endsWith: ['る'] })).toEqual(['taberu']);
  });

  it('lists the kana used at the start and end of words, in gojūon order', () => {
    expect(usedKana(WORDS, 'first')).toEqual(['あ', 'か', 'が', 'こ', 'た']);
    expect(usedKana(WORDS, 'last')).toEqual(['い', 'う', 'か', 'く', 'る', 'れ', 'ー']);
  });
});

describe('custom queue', () => {
  const cards = [
    card('aka', 'recognition', 'review', NOW - DAY), // due
    card('aka', 'production', 'new'), // unlocked: aka|r graduated
    card('akai', 'recognition', 'review', addStudyDays(NOW, 5, 4)), // not due
    card('akai', 'production', 'new'), // unlocked: akai|r graduated (even if not due)
    card('taberu', 'recognition', 'new'),
    card('taberu', 'production', 'new'), // locked
    card('kaku', 'recognition', 'learning', NOW + 5 * MINUTE), // due soon (learn ahead)
    card('gakkou', 'recognition', 'learning', NOW + 3 * 60 * MINUTE), // not due
    card('kore', 'recognition', 'review', NOW - DAY, { againCount: 5 }), // due and weak
  ];

  it('due + new: real reviews only, locked production cards left out', () => {
    const q = buildCustomQueue(cards, BY_ID, f({ direction: 'random' }), { ...opts, random: () => 0.99 });
    // Random keeps one card per word; with random → 0.99 the last matching card of each word.
    expect(ids(q.review)).toEqual(['kore|r']);
    expect(ids(q.learning)).toEqual(['kaku|r']);
    expect(ids(q.fresh)).toEqual(['aka|p', 'akai|p', 'taberu|r']);
    expect(q.practice).toEqual([]);
  });

  it('keeps only the chosen direction', () => {
    const q = buildCustomQueue(cards, BY_ID, f({ direction: 'production' }), opts);
    expect(ids(q.fresh)).toEqual(['aka|p', 'akai|p']);
    expect(customQueueSize(q)).toBe(2);
  });

  it('"all" adds not-due and locked cards as practice', () => {
    const q = buildCustomQueue(cards, BY_ID, f({ cards: 'all', direction: 'production' }), opts);
    expect(ids(q.fresh)).toEqual(['aka|p', 'akai|p']);
    expect(ids(q.practice)).toEqual(['taberu|p']);

    const r = buildCustomQueue(cards, BY_ID, f({ cards: 'all' }), opts);
    expect(ids(r.practice).sort()).toEqual(['akai|r', 'gakkou|r']);
  });

  it('"new" and "learning" pick by state; learning cards not due are practice', () => {
    expect(ids(buildCustomQueue(cards, BY_ID, f({ cards: 'new' }), opts).fresh)).toEqual(['taberu|r']);
    const l = buildCustomQueue(cards, BY_ID, f({ cards: 'learning' }), opts);
    expect(ids(l.learning)).toEqual(['kaku|r']);
    expect(ids(l.practice)).toEqual(['gakkou|r']);
  });

  it('weak words only', () => {
    const q = buildCustomQueue(cards, BY_ID, f({ weakOnly: true }), opts);
    expect(customQueueSize(q)).toBe(1);
    expect(ids(q.review)).toEqual(['kore|r']);
  });

  it('respects the free-tier rank limit', () => {
    const q = buildCustomQueue(cards, BY_ID, f({ cards: 'all' }), { ...opts, maxRank: 2 });
    expect(new Set([...q.review, ...q.fresh, ...q.practice].map((c) => c.wordId))).toEqual(new Set(['aka', 'akai']));
  });

  it('caps a session, most urgent first', () => {
    const q = buildCustomQueue(cards, BY_ID, f({ cards: 'all' }), opts);
    const capped = capQueue(q, 3);
    expect(ids(capped.learning)).toEqual(['kaku|r']);
    expect(ids(capped.review)).toEqual(['aka|r', 'kore|r']);
    expect(capped.fresh).toEqual([]);
    expect(customQueueSize(capped)).toBe(3);
  });
});

describe('filter helpers', () => {
  it('compares filters regardless of selection order', () => {
    expect(filtersEqual(f({ themes: ['a', 'b'] }), f({ themes: ['b', 'a'] }))).toBe(true);
    expect(filtersEqual(f({ themes: ['a'] }), f({ themes: ['a'], weakOnly: true }))).toBe(false);
  });

  it('fills in fields missing from an older saved filter', () => {
    expect(normalizeFilter({ themes: ['colors'] })).toEqual(f({ themes: ['colors'] }));
    expect(normalizeFilter(null)).toEqual(DEFAULT_FILTER);
  });
});
