import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { queueCounts } from '@/domain/srs/queue';
import { AnkiV2Scheduler } from '@/domain/srs/scheduler';
import { DEFAULT_CONFIG, type SchedulerConfig } from '@/domain/srs/types';

import type { Db } from './db/client';
import { openDb } from './db/open';
import { seedCards } from './repo/cards';
import { getAllSettings, setSetting, type Settings } from './repo/settings';
import { buildTodayQueue } from './today';
import { words } from './vocab';

type AppData = {
  db: Db;
  scheduler: AnkiV2Scheduler;
  config: SchedulerConfig;
  settings: Settings;
  /** Increments after every write; hooks recompute from it. */
  revision: number;
  /** Current time, refreshed every minute and after every write. */
  now: number;
  notifyChanged: () => void;
};

const DataContext = createContext<AppData | null>(null);

export function DataProvider({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  // Database reads look like pure calls to React Compiler, which would cache them on `db` alone
  // and never see later writes. `revision` is what invalidates them, so opt out here.
  'use no memo';
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
    return { db, scheduler: new AnkiV2Scheduler(config), config, settings, revision, now, notifyChanged };
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

export function useSettings(): Settings {
  return useData().settings;
}

/** Persists one setting and refreshes every screen that reads it. */
export function useUpdateSetting() {
  const { db, notifyChanged } = useData();
  return useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSetting(db, key, value, Date.now());
      notifyChanged();
    },
    [db, notifyChanged],
  );
}

/** Today's Anki counters (new / learning / due) and goal pacing. */
export function useTodayCounts() {
  'use no memo'; // reads the database: see DataProvider
  const { db, config, revision, now } = useData();
  return useMemo(() => {
    const { queue, newPerDay, started, freeNewLeft } = buildTodayQueue(db, config, now);
    return { ...queueCounts(queue), newPerDay, started, totalWords: words.length, freeNewLeft };
    // `revision` changes after every write, which is what invalidates this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, config, revision, now]);
}
