import { studyDaysBetween } from './srs/time';

/**
 * Goal-based pacing: the user picks a deadline, the app spreads the remaining words over
 * the days left. Recomputed every day, so a missed day is absorbed by the following ones.
 */
export type Goal = {
  /** Epoch ms of the target date (inclusive: words should be started by the end of that day). */
  deadline: number;
};

export const MAX_NEW_PER_DAY = 50;

export function newWordsPerDay(goal: Goal, remainingWords: number, now: number, dayStartHour: number): number {
  if (remainingWords <= 0) return 0;
  const daysLeft = Math.max(1, studyDaysBetween(now, goal.deadline, dayStartHour) + 1);
  return Math.min(MAX_NEW_PER_DAY, Math.ceil(remainingWords / daysLeft));
}

/** True when today's pace is above the pace originally planned (the user fell behind). */
export function isBehind(perDayNow: number, perDayPlanned: number): boolean {
  return perDayNow > perDayPlanned;
}
