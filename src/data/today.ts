import { newWordsPerDay } from '@/domain/goal';
import { maxRankFor } from '@/domain/premium';
import { buildQueue, type StudyQueue } from '@/domain/srs/queue';
import { studyDayStart } from '@/domain/srs/time';
import type { SchedulerConfig } from '@/domain/srs/types';

import type { Db } from './db/client';
import { allCards, doneToday, startedWords } from './repo/cards';
import { getAllSettings } from './repo/settings';
import { words } from './vocab';

/**
 * Today's study queue from the goal pace and daily limits. `extraNew` = "learn N more words".
 * Without premium, only the free words are introduced; `freeNewLeft` says how many of them are
 * still unseen (0 = the free words are all started: time to offer premium).
 */
export function buildTodayQueue(db: Db, config: SchedulerConfig, now: number, extraNew = 0) {
  const settings = getAllSettings(db);
  const started = startedWords(db);
  const maxRank = maxRankFor(settings.premium);
  const newPerDay = settings.goalDeadline
    ? newWordsPerDay({ deadline: settings.goalDeadline }, words.length - started, now, config.dayStartHour)
    : settings.newPerDayFallback;
  const cards = allCards(db);
  const queue: StudyQueue = buildQueue(cards, {
    now,
    config,
    limits: { newRecognition: newPerDay + extraNew, newProduction: newPerDay, reviews: settings.reviewsPerDay },
    doneToday: doneToday(db, studyDayStart(now, config.dayStartHour)),
    maxRank,
  });
  const freeNewLeft =
    maxRank === undefined
      ? null
      : cards.filter((c) => c.direction === 'recognition' && c.status === 'new' && c.rank <= maxRank).length;
  return { queue, newPerDay, started, freeNewLeft };
}
