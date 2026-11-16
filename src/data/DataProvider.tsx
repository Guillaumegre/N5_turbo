import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { newWordsPerDay } from '@/domain/goal';
import { buildQueue, queueCounts } from '@/domain/srs/queue';
import { AnkiV2Scheduler } from '@/domain/srs/scheduler';
import { studyDayStart } from '@/domain/srs/time';
import { DEFAULT_CONFIG, type SchedulerConfig } from '@/domain/srs/types';

import type { Db } from './db/client';
import { openDb } from './db/open';
import { allCards, doneToday, seedCards, startedWords } from './repo/cards';
import { getAllSettings } from './repo/settings';
import { words } from './vocab';

type AppData = {
  db: Db;
  scheduler: AnkiV2Scheduler;
  config: SchedulerConfig;
  /** Increments after every write; hooks recompute from it. */
  revision: number;
  /** Current time, refreshed every minute and after every write. */
  now: number;
  notifyChanged: () => void;
};

const DataContext = createContext<AppData | null>(null);

export function DataProvider({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [db, setDb] = useState<Db | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    openDb()
      .then((opened) => {
        const settings = getAllSettings(opened);
        const scheduler = new AnkiV2Scheduler({ ...DEFAULT_CONFIG, learningSteps: settings.learningSteps });
        seedCards(opened, words, scheduler, Date.now());
        if (!cancelled) setDb(opened);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e : new Error(String(e))));
    return () => {
      cancelled = true;
    };
  }, []);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const notifyChanged = useCallback(() => {
    setRevision((r) => r + 1);
    setNow(Date.now());
  }, []);

  const value = useMemo<AppData | null>(() => {
    if (!db) return null;
    const settings = getAllSettings(db);
    const config = { ...DEFAULT_CONFIG, learningSteps: settings.learningSteps };
    return { db, scheduler: new AnkiV2Scheduler(config), config, revision, now, notifyChanged };
  }, [db, revision, now, notifyChanged]);

  if (error) throw error;
  if (!value) return <>{fallback}</>;
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): AppData {
  const data = useContext(DataContext);
  if (!data) throw new Error('useData must be used inside <DataProvider>');
  return data;
}

/** Today's Anki counters (new / learning / due) and goal pacing. */
export function useTodayCounts() {
  const { db, config, revision, now } = useData();
  return useMemo(() => {
    const settings = getAllSettings(db);
    const started = startedWords(db);
    const newPerDay = settings.goalDeadline
      ? newWordsPerDay({ deadline: settings.goalDeadline }, words.length - started, now, config.dayStartHour)
      : settings.newPerDayFallback;
    const queue = buildQueue(allCards(db), {
      now,
      config,
      limits: { newRecognition: newPerDay, newProduction: newPerDay, reviews: settings.reviewsPerDay },
      doneToday: doneToday(db, studyDayStart(now, config.dayStartHour)),
    });
    return { ...queueCounts(queue), newPerDay, started, totalWords: words.length };
    // `revision` changes after every write, which is what invalidates this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, config, revision, now]);
}
