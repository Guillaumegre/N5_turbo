import { addStudyDays, studyDaysBetween } from './time';
import { MINUTE, type CardState, type Rating, type SchedulerConfig } from './types';

/**
 * Everything the app needs from a scheduling algorithm. The Anki v2 implementation below is
 * the default; an FSRS implementation can be dropped in later behind the same interface.
 */
export interface Scheduler {
  readonly id: string;
  newCard(now: number): CardState;
  /** The card's state after answering with `rating` at `now`. Pure: never mutates `card`. */
  answer(card: CardState, rating: Rating, now: number): CardState;
}

/** Returns a number in [0, 1); injectable so tests are deterministic. */
export type Random = () => number;

/**
 * Anki's v2 scheduler (modified SM-2), following the reference implementation:
 * learning steps, graduating/easy intervals, ease penalties and bonus, hard factor,
 * lapses with relearning steps, overdue bonus, and interval fuzz.
 */
export class AnkiV2Scheduler implements Scheduler {
  readonly id = 'anki-v2';

  constructor(
    readonly config: SchedulerConfig,
    private readonly random: Random = Math.random,
  ) {}

  newCard(now: number): CardState {
    return {
      status: 'new',
      due: now,
      interval: 0,
      ease: this.config.startingEase,
      step: 0,
      reps: 0,
      lapses: 0,
      againCount: 0,
    };
  }

  answer(card: CardState, rating: Rating, now: number): CardState {
    const next: CardState = {
      ...card,
      reps: card.reps + 1,
      againCount: card.againCount + (rating === 1 ? 1 : 0),
    };
    if (card.status === 'review') return this.answerReview(next, rating, now, true);
    return this.answerLearning(next, rating, now, true);
  }

  /** Same as `answer` without fuzz: what the grading buttons display. */
  preview(card: CardState, rating: Rating, now: number): CardState {
    const next = { ...card, reps: card.reps + 1 };
    if (card.status === 'review') return this.answerReview(next, rating, now, false);
    return this.answerLearning(next, rating, now, false);
  }

  // ------------------------------------------------------------------ learning / relearning

  private steps(card: CardState): number[] {
    const steps = card.status === 'relearning' ? this.config.relearningSteps : this.config.learningSteps;
    return steps.length ? steps : [1];
  }

  private answerLearning(card: CardState, rating: Rating, now: number, fuzz: boolean): CardState {
    const c = this.config;
    const steps = this.steps(card);
    const relearning = card.status === 'relearning';
    const step = Math.min(card.step, steps.length - 1);

    if (rating === 4) {
      // Easy: graduate immediately.
      const interval = relearning ? card.interval + 1 : c.easyInterval;
      return this.graduate(card, interval, now, fuzz && !relearning);
    }
    if (rating === 3 && step + 1 >= steps.length) {
      // Good on the last step: graduate.
      const interval = relearning ? card.interval : c.graduatingInterval;
      return this.graduate(card, interval, now, fuzz && !relearning);
    }

    let nextStep = step;
    let delay: number;
    if (rating === 1) {
      nextStep = 0;
      delay = steps[0];
    } else if (rating === 2) {
      // Hard repeats the step: halfway between this step and the next (or 1.5× with one step).
      const current = steps[step];
      const after = steps.length > 1 ? (steps[step + 1] ?? current) : current * 2;
      delay = (current + Math.max(current, after)) / 2;
    } else {
      nextStep = step + 1;
      delay = steps[nextStep];
    }
    return {
      ...card,
      status: relearning ? 'relearning' : 'learning',
      step: nextStep,
      due: now + Math.round(delay * MINUTE),
    };
  }

  private graduate(card: CardState, interval: number, now: number, fuzz: boolean): CardState {
    const days = Math.max(this.config.minimumInterval, fuzz ? this.fuzz(interval) : interval);
    return {
      ...card,
      status: 'review',
      step: 0,
      interval: days,
      ease: card.status === 'relearning' ? card.ease : card.ease || this.config.startingEase,
      due: addStudyDays(now, days, this.config.dayStartHour),
    };
  }

  // ------------------------------------------------------------------ review

  private answerReview(card: CardState, rating: Rating, now: number, fuzz: boolean): CardState {
    const c = this.config;
    if (rating === 1) {
      const interval = Math.max(c.minimumInterval, Math.floor(card.interval * c.lapseMultiplier));
      const lapsed: CardState = {
        ...card,
        lapses: card.lapses + 1,
        ease: Math.max(1300, card.ease - 200),
        interval,
      };
      if (c.relearningSteps.length) {
        return { ...lapsed, status: 'relearning', step: 0, due: now + Math.round(c.relearningSteps[0] * MINUTE) };
      }
      return { ...lapsed, status: 'review', due: addStudyDays(now, interval, c.dayStartHour) };
    }

    const days = this.nextReviewInterval(card, rating, now, fuzz);
    const easeDelta = rating === 2 ? -150 : rating === 4 ? 150 : 0;
    return {
      ...card,
      status: 'review',
      interval: days,
      ease: Math.max(1300, card.ease + easeDelta),
      due: addStudyDays(now, days, c.dayStartHour),
    };
  }

  /** Interval in days for Hard / Good / Easy on a review card (Anki v2 `_nextRevIvl`). */
  nextReviewInterval(card: CardState, rating: 2 | 3 | 4, now: number, fuzz = false): number {
    const c = this.config;
    const overdue = Math.max(0, studyDaysBetween(card.due, now, c.dayStartHour));
    const factor = card.ease / 1000;
    // Each interval is at least one day longer than the previous one, fuzz included,
    // so Hard < Good < Easy always holds (as in Anki's _constrainedIvl).
    const hard = this.constrain(card.interval * c.hardFactor, c.hardFactor > 1 ? card.interval : 0, fuzz);
    if (rating === 2) return hard;
    const good = this.constrain((card.interval + overdue / 2) * factor, hard, fuzz);
    if (rating === 3) return good;
    return this.constrain((card.interval + overdue) * factor * c.easyBonus, good, fuzz);
  }

  private constrain(interval: number, previous: number, fuzz: boolean): number {
    const c = this.config;
    let days = Math.round(interval * c.intervalModifier);
    if (fuzz) days = this.fuzz(days);
    return Math.min(c.maximumInterval, Math.max(days, previous + 1, 1));
  }

  /** Anki's fuzz: spreads reviews so cards learned together don't stay together forever. */
  private fuzz(interval: number): number {
    if (interval < 2) return interval;
    if (interval === 2) return 2 + (this.random() < 0.5 ? 0 : 1);
    const spread = interval < 7 ? Math.max(1, Math.round(interval * 0.25)) : interval < 30 ? Math.max(2, Math.round(interval * 0.15)) : Math.max(4, Math.round(interval * 0.05));
    const low = interval - spread;
    const high = interval + spread;
    return Math.min(this.config.maximumInterval, Math.max(1, low + Math.floor(this.random() * (high - low + 1))));
  }
}
