import { DAY } from './types';

/**
 * Study days start at `dayStartHour` local time (Anki: 4am), so a late-night session
 * still counts for "today". All helpers take an explicit `now` for testability.
 */

/** Epoch ms of the start of the study day containing `now`. */
export function studyDayStart(now: number, dayStartHour: number): number {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), dayStartHour, 0, 0, 0);
  if (start.getTime() > now) start.setDate(start.getDate() - 1);
  return start.getTime();
}

/** Start of the study day `days` after the one containing `now` (DST-safe: uses calendar days). */
export function addStudyDays(now: number, days: number, dayStartHour: number): number {
  const start = new Date(studyDayStart(now, dayStartHour));
  start.setDate(start.getDate() + days);
  return start.getTime();
}

/** Whole study days from the day containing `from` to the day containing `to`. */
export function studyDaysBetween(from: number, to: number, dayStartHour: number): number {
  const a = new Date(studyDayStart(from, dayStartHour));
  const b = new Date(studyDayStart(to, dayStartHour));
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / DAY);
}
