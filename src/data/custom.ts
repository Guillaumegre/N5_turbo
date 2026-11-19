import { buildCustomQueue, capQueue, type CustomQueue, type Filter, type FilterWord } from '@/domain/filters';
import { maxRankFor } from '@/domain/premium';
import type { SchedulerConfig } from '@/domain/srs/types';

import type { Db } from './db/client';
import { allCards } from './repo/cards';
import { getSetting } from './repo/settings';
import { words } from './vocab';

const filterWords = new Map<string, FilterWord>(words.map((w) => [w.id, w]));

/** The cards a custom session would show, before the length cap (free words only without premium). */
export function customQueue(db: Db, config: SchedulerConfig, now: number, filter: Filter): CustomQueue {
  return buildCustomQueue(allCards(db), filterWords, filter, { now, config, maxRank: maxRankFor(getSetting(db, 'premium')) });
}

/** The session itself: capped to 10 / 20 / 50 cards when asked. */
export function customSessionQueue(db: Db, config: SchedulerConfig, now: number, filter: Filter): CustomQueue {
  const q = customQueue(db, config, now, filter);
  return typeof filter.length === 'number' ? capQueue(q, filter.length) : q;
}
