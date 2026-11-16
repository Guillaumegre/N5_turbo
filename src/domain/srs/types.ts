/** Spaced-repetition domain types. Pure data: no React, no database. */

export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
export const RATINGS: readonly Rating[] = [1, 2, 3, 4];

export type CardStatus = 'new' | 'learning' | 'review' | 'relearning';

/** recognition = JP → EN, production = EN → JP. */
export type Direction = 'recognition' | 'production';

/** Scheduling state of one card. Times are epoch milliseconds. */
export type CardState = {
  status: CardStatus;
  /** When the card is next due. For review cards: the start of the due day. */
  due: number;
  /** Current interval in days (review / relearning cards). */
  interval: number;
  /** Ease factor in permille, Anki style (2500 = 250%). */
  ease: number;
  /** Index into the learning or relearning steps. */
  step: number;
  reps: number;
  /** Times the card was forgotten after graduating. */
  lapses: number;
  /** Times "Again" was pressed, ever: used for weak-word (leech) detection. */
  againCount: number;
};

export type SchedulerConfig = {
  /** Learning steps in minutes (Anki default 1m, 10m). */
  learningSteps: number[];
  /** Relearning steps in minutes after a lapse. */
  relearningSteps: number[];
  graduatingInterval: number; // days
  easyInterval: number; // days
  startingEase: number; // permille
  easyBonus: number;
  hardFactor: number;
  intervalModifier: number;
  maximumInterval: number; // days
  /** New interval after a lapse = old interval × this (Anki "new interval", default 0). */
  lapseMultiplier: number;
  minimumInterval: number; // days
  /** Hour of the day (local time) when a new study day starts. */
  dayStartHour: number;
};

export const DEFAULT_CONFIG: SchedulerConfig = {
  learningSteps: [1, 10],
  relearningSteps: [10],
  graduatingInterval: 1,
  easyInterval: 4,
  startingEase: 2500,
  easyBonus: 1.3,
  hardFactor: 1.2,
  intervalModifier: 1,
  maximumInterval: 36500,
  lapseMultiplier: 0,
  minimumInterval: 1,
  dayStartHour: 4,
};

export const MINUTE = 60_000;
export const DAY = 86_400_000;
