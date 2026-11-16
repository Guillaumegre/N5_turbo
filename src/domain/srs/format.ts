import type { AnkiV2Scheduler } from './scheduler';
import { DAY, MINUTE, RATINGS, type CardState, type Rating } from './types';

/** Labels under Again / Hard / Good / Easy. Review results show the interval in days, like Anki. */
export function previewLabels(scheduler: AnkiV2Scheduler, card: CardState, now: number): Record<Rating, string> {
  const out = {} as Record<Rating, string>;
  for (const r of RATINGS) {
    const next = scheduler.preview(card, r, now);
    out[r] = formatInterval(next.status === 'review' ? next.interval * DAY : next.due - now);
  }
  return out;
}

/**
 * Human-readable delay for the grading buttons, Anki style: <1m, 6m, 1h, 1d, 4d, 1.5mo, 2.3y.
 */
export function formatInterval(ms: number): string {
  if (ms < MINUTE) return '<1m';
  const minutes = ms / MINUTE;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${trim(hours)}h`;
  const days = ms / DAY;
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${trim(days / 30)}mo`;
  return `${trim(days / 365)}y`;
}

function trim(n: number): string {
  return n < 10 ? n.toFixed(1).replace(/\.0$/, '') : String(Math.round(n));
}
