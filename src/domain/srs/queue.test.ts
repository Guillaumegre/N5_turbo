import { buildQueue, queueCounts, type QueueOptions, type StudyCard } from './queue';
import { addStudyDays } from './time';
import { DEFAULT_CONFIG, MINUTE, type CardStatus, type Direction } from './types';

const NOW = new Date(2026, 10, 16, 10, 0).getTime();

function card(wordRank: number, direction: Direction, status: CardStatus, due = NOW): StudyCard {
  return {
    id: `w${wordRank}|${direction[0]}`,
    wordId: `w${wordRank}`,
    direction,
    rank: wordRank,
    status,
    due,
    interval: status === 'review' ? 3 : 0,
    ease: 2500,
    step: 0,
    reps: 0,
    lapses: 0,
    againCount: 0,
  };
}

const opts = (over: Partial<QueueOptions> = {}): QueueOptions => ({
  now: NOW,
  config: DEFAULT_CONFIG,
  limits: { newRecognition: 2, newProduction: 2, reviews: 100 },
  doneToday: { newRecognition: 0, newProduction: 0, reviews: 0 },
  ...over,
});

describe('study queue', () => {
  const cards = [
    card(5, 'recognition', 'new'),
    card(1, 'recognition', 'new'),
    card(3, 'recognition', 'new'),
    card(1, 'production', 'new'),
    card(3, 'production', 'new'),
    card(2, 'recognition', 'review', NOW - MINUTE),
    card(2, 'production', 'new'),
    card(4, 'recognition', 'review', addStudyDays(NOW, 2, 4)),
    card(6, 'recognition', 'learning', NOW + 5 * MINUTE),
    card(7, 'recognition', 'learning', NOW + 60 * MINUTE),
  ];

  it('introduces new words by frequency rank, within the daily limit', () => {
    const q = buildQueue(cards, opts());
    expect(q.fresh.map((c) => c.id)).toEqual(['w1|r', 'w3|r', 'w2|p']);
  });

  it('unlocks a production card only after its recognition card graduated', () => {
    const q = buildQueue(cards, opts());
    expect(q.fresh.filter((c) => c.direction === 'production').map((c) => c.wordId)).toEqual(['w2']);
  });

  it('never unlocks a production card the day its recognition card graduated', () => {
    // Graduated today: interval 1, due tomorrow. Graduated yesterday: interval 1, due today.
    const today = { ...card(8, 'recognition', 'review', addStudyDays(NOW, 1, 4)), interval: 1 };
    const yesterday = { ...card(9, 'recognition', 'review', addStudyDays(NOW, 0, 4)), interval: 1 };
    const q = buildQueue([today, card(8, 'production', 'new'), yesterday, card(9, 'production', 'new')], opts());
    expect(q.fresh.map((c) => c.id)).toEqual(['w9|p']);
  });

  it('shows due reviews today, and learning cards within 20 minutes', () => {
    const q = buildQueue(cards, opts());
    expect(q.review.map((c) => c.id)).toEqual(['w2|r']);
    expect(q.learning.map((c) => c.id)).toEqual(['w6|r']);
    expect(queueCounts(q)).toEqual({ new: 3, learning: 1, due: 1 });
  });

  it('subtracts what was already done today', () => {
    const q = buildQueue(cards, opts({ doneToday: { newRecognition: 2, newProduction: 0, reviews: 100 } }));
    expect(queueCounts(q)).toEqual({ new: 1, learning: 1, due: 0 });
  });

  it('restricts the free tier by rank and applies filters', () => {
    expect(buildQueue(cards, opts({ maxRank: 2 })).fresh.map((c) => c.id)).toEqual(['w1|r', 'w2|p']);
    expect(buildQueue(cards, opts({ include: (c) => c.rank === 3 })).fresh.map((c) => c.id)).toEqual(['w3|r']);
  });
});
