import { AnkiV2Scheduler } from '@/domain/srs/scheduler';
import { studyDayStart } from '@/domain/srs/time';
import { DEFAULT_CONFIG, MINUTE } from '@/domain/srs/types';

import type { Db } from '../db/client';
import { createTestDb } from '../db/testDb';
import { words } from '../vocab';
import { allCards, answerCard, cardId, countCards, doneToday, getCard, seedCards, startedWords, undoLast } from './cards';
import { getAllSettings, getSetting, setSetting } from './settings';

const NOW = new Date(2026, 10, 16, 10, 0).getTime();
const scheduler = new AnkiV2Scheduler(DEFAULT_CONFIG, () => 0.5);
let n = 0;
const newId = () => `rev-${++n}`;

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  seedCards(db, words, scheduler, NOW);
});

const red = words.find((w) => w.kanji === '赤い')!;
const redR = cardId(red.id, 'recognition');

function answer(id: string, rating: 1 | 2 | 3 | 4, at = NOW, kind: 'review' | 'practice' = 'review') {
  return answerCard(db, { cardId: id, rating, now: at, durationMs: 4200, kind, scheduler, newId });
}

describe('seeding', () => {
  it('creates two new cards per word', () => {
    expect(countCards(db)).toBe(words.length * 2);
    expect(getCard(db, redR)).toMatchObject({ status: 'new', direction: 'recognition', rank: red.rank, ease: 2500 });
  });

  it('is idempotent and keeps progress when the app updates', () => {
    answer(redR, 4);
    const added = seedCards(db, words.map((w) => ({ ...w, rank: w.rank + 1 })), scheduler, NOW + 1000);
    expect(added).toBe(0);
    expect(getCard(db, redR)).toMatchObject({ status: 'review', rank: red.rank + 1 });
  });
});

describe('answering', () => {
  it('reschedules and logs atomically', () => {
    const { card } = answer(redR, 3);
    expect(card).toMatchObject({ status: 'learning', step: 1, due: NOW + 10 * MINUTE });
    expect(getCard(db, redR)).toMatchObject({ status: 'learning', step: 1 });
    expect(doneToday(db, studyDayStart(NOW, 4))).toEqual({ newRecognition: 1, newProduction: 0, reviews: 0 });
    expect(startedWords(db)).toBe(1);
  });

  it('practice answers are logged but leave the schedule alone', () => {
    answer(redR, 4);
    const before = getCard(db, redR);
    answer(redR, 1, NOW + MINUTE, 'practice');
    expect(getCard(db, redR)).toEqual(before);
    expect(doneToday(db, studyDayStart(NOW, 4)).newRecognition).toBe(1);
  });

  it('counts reviews of graduated cards separately', () => {
    answer(redR, 4); // graduates for 4 days
    const later = NOW + 4 * 24 * 60 * MINUTE;
    answer(redR, 3, later);
    expect(doneToday(db, studyDayStart(later, 4))).toEqual({ newRecognition: 0, newProduction: 0, reviews: 1 });
  });

  it('rejects unknown cards', () => {
    expect(() => answer('nope|r', 3)).toThrow('Unknown card');
  });
});

describe('undo', () => {
  it('restores the previous state and leaves a tombstone', () => {
    answer(redR, 3);
    answer(redR, 3, NOW + 10 * MINUTE);
    expect(getCard(db, redR)?.status).toBe('review');
    expect(undoLast(db, NOW + 11 * MINUTE)).toBe(redR);
    expect(getCard(db, redR)).toMatchObject({ status: 'learning', step: 1 });
    expect(undoLast(db, NOW + 12 * MINUTE)).toBe(redR);
    expect(getCard(db, redR)).toMatchObject({ status: 'new', reps: 0 });
    expect(undoLast(db, NOW + 13 * MINUTE)).toBeNull();
    expect(doneToday(db, studyDayStart(NOW, 4)).newRecognition).toBe(0);
  });
});

describe('settings', () => {
  it('returns defaults, then stored values', () => {
    expect(getSetting(db, 'furigana')).toBe(true);
    setSetting(db, 'furigana', false, NOW);
    setSetting(db, 'goalDeadline', NOW + 1000, NOW);
    expect(getAllSettings(db)).toMatchObject({ furigana: false, goalDeadline: NOW + 1000, reviewsPerDay: 200 });
  });
});

describe('full card list', () => {
  it('loads every card with its rank', () => {
    const cards = allCards(db);
    expect(cards).toHaveLength(words.length * 2);
    expect(cards.every((c) => c.rank >= 1)).toBe(true);
  });
});
