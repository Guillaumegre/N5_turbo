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

export type GoalOption = { id: string; label: string; deadline: number; perDay: number; minutes: number };

/** The first Sunday of July or December (JLPT dates) at least `minDays` away. */
export function nextJlptDate(now: number, minDays = 60): number {
  const from = new Date(now);
  for (let year = from.getFullYear(); year < from.getFullYear() + 3; year++) {
    for (const month of [6, 11]) {
      const d = new Date(year, month, 1);
      d.setDate(1 + ((7 - d.getDay()) % 7));
      if ((d.getTime() - now) / 86_400_000 >= minDays) return d.getTime();
    }
  }
  return now + 365 * 86_400_000;
}

/**
 * Deadline choices for the goal screen. `minutes` is a rough estimate of the busiest days:
 * each new word brings about two minutes of reviews once the reviews pile up.
 */
export function goalOptions(now: number, remainingWords: number, dayStartHour: number): GoalOption[] {
  const inMonths = (m: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + m);
    return d.getTime();
  };
  const make = (id: string, label: string, deadline: number): GoalOption => {
    const perDay = newWordsPerDay({ deadline }, remainingWords, now, dayStartHour);
    return { id, label, deadline, perDay, minutes: Math.max(5, Math.round((perDay * 2.2) / 5) * 5) };
  };
  return [
    make('1m', '1 month', inMonths(1)),
    make('2m', '2 months', inMonths(2)),
    make('3m', '3 months', inMonths(3)),
    make('6m', '6 months', inMonths(6)),
    make('jlpt', 'The next JLPT', nextJlptDate(now)),
  ];
}
