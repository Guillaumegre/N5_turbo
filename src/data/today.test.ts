import { FREE_WORDS } from '@/domain/premium';
import { AnkiV2Scheduler } from '@/domain/srs/scheduler';
import { DEFAULT_CONFIG } from '@/domain/srs/types';

import { createTestDb } from './db/testDb';
import { answerCard, cardId, seedCards } from './repo/cards';
import { setSetting } from './repo/settings';
import { buildTodayQueue } from './today';
import { words } from './vocab';

const NOW = new Date(2026, 10, 19, 10, 0).getTime();
const scheduler = new AnkiV2Scheduler(DEFAULT_CONFIG, () => 0.5);
let n = 0;

async function freshDb() {
  const db = await createTestDb();
  seedCards(db, words, scheduler, NOW);
  return db;
}

describe('today queue and premium', () => {
  it('without premium, only the free words are introduced', async () => {
    const db = await freshDb();
    const { queue, freeNewLeft } = buildTodayQueue(db, DEFAULT_CONFIG, NOW, 500);
    expect(queue.fresh.length).toBeGreaterThan(0);
    expect(queue.fresh.every((c) => c.rank <= FREE_WORDS)).toBe(true);
    expect(freeNewLeft).toBe(FREE_WORDS);
  });

  it('reports when the free words are all started', async () => {
    const db = await freshDb();
    for (const w of words.filter((x) => x.rank <= FREE_WORDS)) {
      answerCard(db, { cardId: cardId(w.id, 'recognition'), rating: 3, now: NOW, durationMs: 3000, kind: 'review', scheduler, newId: () => `r${++n}` });
    }
    const { queue, freeNewLeft } = buildTodayQueue(db, DEFAULT_CONFIG, NOW, 500);
    expect(freeNewLeft).toBe(0);
    expect(queue.fresh.filter((c) => c.direction === 'recognition')).toHaveLength(0);
  });

  it('with premium, every word can come up', async () => {
    const db = await freshDb();
    setSetting(db, 'premium', true, NOW);
    const { queue, freeNewLeft } = buildTodayQueue(db, DEFAULT_CONFIG, NOW, 500);
    expect(freeNewLeft).toBeNull();
    expect(queue.fresh.some((c) => c.rank > FREE_WORDS)).toBe(true);
  });
});
