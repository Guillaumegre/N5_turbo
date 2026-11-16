import { eq } from 'drizzle-orm';

import { DEFAULT_FILTER, type Filter } from '@/domain/filters';

import type { Db } from '../db/client';
import { settings } from '../db/schema';

/** Typed settings stored as JSON, one row per key (each key syncs independently). */
export type Settings = {
  furigana: boolean;
  /** Set once the first-launch goal screen was completed (or skipped). */
  onboarded: boolean;
  /** Goal deadline (epoch ms), set on first launch. */
  goalDeadline: number | null;
  /** New words per day used when no goal is set. */
  newPerDayFallback: number;
  reviewsPerDay: number;
  learningSteps: number[];
  theme: 'system' | 'light' | 'dark';
  fontScale: number;
  /** The filter screen's current choices (kept between visits). */
  customFilter: Filter;
};

export const DEFAULT_SETTINGS: Settings = {
  furigana: true,
  onboarded: false,
  goalDeadline: null,
  newPerDayFallback: 20,
  reviewsPerDay: 200,
  learningSteps: [1, 10],
  theme: 'light',
  fontScale: 1,
  customFilter: DEFAULT_FILTER,
};

export function getSetting<K extends keyof Settings>(db: Db, key: K): Settings[K] {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  if (!row) return DEFAULT_SETTINGS[key];
  try {
    return JSON.parse(row.value) as Settings[K];
  } catch {
    return DEFAULT_SETTINGS[key];
  }
}

export function setSetting<K extends keyof Settings>(db: Db, key: K, value: Settings[K], now: number): void {
  const json = JSON.stringify(value);
  db.insert(settings)
    .values({ key, value: json, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: json, updatedAt: now } })
    .run();
}

export function getAllSettings(db: Db): Settings {
  const out = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    (out as Record<string, unknown>)[key] = getSetting(db, key);
  }
  return out;
}
