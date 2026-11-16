import { newWordsPerDay } from '@/domain/goal';
import { buildQueue, type StudyQueue } from '@/domain/srs/queue';
import { studyDayStart } from '@/domain/srs/time';
import type { SchedulerConfig } from '@/domain/srs/types';

import type { Db } from './db/client';
import { allCards, doneToday, startedWords } from './repo/cards';
import { getAllSettings } from './repo/settings';
import { words } from './vocab';

/** Today's study queue from the goal pace and daily limits. `extraNew` = "learn N more words". */
export function buildTodayQueue(db: Db, config: SchedulerConfig, now: number, extraNew = 0) {
  const settings = getAllSettings(db);
  const started = startedWords(db);
  const newPerDay = settings.goalDeadline
    ? newWordsPerDay({ deadline: settings.goalDeadline }, words.length - started, now, config.dayStartHour)
    : settings.newPerDayFallback;
  const queue: StudyQueue = buildQueue(allCards(db), {
    now,
    config,
    limits: { newRecognition: newPerDay + extraNew, newProduction: newPerDay, reviews: settings.reviewsPerDay },
    doneToday: doneToday(db, studyDayStart(now, config.dayStartHour)),
  });
  return { queue, newPerDay, started };
}
