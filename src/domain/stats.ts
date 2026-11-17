/**
 * Numbers for the Stats screen, computed from the review log and the cards. Pure functions:
 * the repo reads the rows, these turn them into what the screen shows.
 */
import { addStudyDays, studyDaysBetween } from './srs/time';

export type LogEntry = {
  reviewedAt: number;
  rating: number;
  kind: 'review' | 'practice';
  statusBefore: string;
  durationMs: number;
};

/** Answers per study day, oldest first, the last entry being today. Practice answers count too. */
export function answersPerDay(log: LogEntry[], now: number, dayStartHour: number, days: number): number[] {
  const out = new Array<number>(days).fill(0);
  for (const e of log) {
    const ago = studyDaysBetween(e.reviewedAt, now, dayStartHour);
    if (ago >= 0 && ago < days) out[days - 1 - ago]++;
  }
  return out;
}

/**
 * Retention: the share of reviews of known cards (status "review" before the answer) not
 * answered Again. Learning steps and practice are left out: they say little about memory.
 * Null when there is nothing to measure.
 */
export function retention(log: LogEntry[]): number | null {
  const reviews = log.filter((e) => e.kind === 'review' && e.statusBefore === 'review');
  if (!reviews.length) return null;
  return reviews.filter((e) => e.rating > 1).length / reviews.length;
}

/** Answers in the study day containing `now`. */
export function answeredToday(log: LogEntry[], now: number, dayStartHour: number): number {
  return log.filter((e) => studyDaysBetween(e.reviewedAt, now, dayStartHour) === 0).length;
}

/** Time spent answering, in minutes (each answer is capped at 60 s, as Anki does, so an idle card doesn't count). */
export function minutesStudied(log: LogEntry[]): number {
  return Math.round(log.reduce((sum, e) => sum + Math.min(e.durationMs, 60_000), 0) / 60_000);
}

/**
 * Reviews coming due per study day, today first (today includes anything overdue). New cards
 * aren't counted: they come from the daily new-word pace, not the schedule.
 */
export function dueForecast(cards: { status: string; due: number }[], now: number, dayStartHour: number, days: number): number[] {
  const out = new Array<number>(days).fill(0);
  const end = addStudyDays(now, days, dayStartHour);
  for (const c of cards) {
    if (c.status === 'new' || c.due >= end) continue;
    const ahead = Math.max(0, studyDaysBetween(now, c.due, dayStartHour));
    out[ahead]++;
  }
  return out;
}
