import { previewLabels, formatInterval } from './format';
import { AnkiV2Scheduler } from './scheduler';
import { addStudyDays, studyDayStart, studyDaysBetween } from './time';
import { DAY, DEFAULT_CONFIG, MINUTE, type CardState } from './types';
import { isWeak } from './weak';

// Monday 10:00 local time; a fixed clock keeps every expectation exact.
const NOW = new Date(2026, 10, 16, 10, 0, 0).getTime();
const noFuzz = new AnkiV2Scheduler(DEFAULT_CONFIG, () => 0.5);
const s = noFuzz;

function review(interval: number, ease = 2500, dueDaysAgo = 0): CardState {
  return {
    ...s.newCard(NOW),
    status: 'review',
    interval,
    ease,
    due: addStudyDays(NOW, -dueDaysAgo, DEFAULT_CONFIG.dayStartHour),
    reps: 5,
  };
}

const days = (card: CardState) => studyDaysBetween(NOW, card.due, DEFAULT_CONFIG.dayStartHour);

describe('new and learning cards', () => {
  const fresh = s.newCard(NOW);

  it('shows the Anki defaults on a new card: <1m, 6m, 10m, 4d', () => {
    expect(previewLabels(s, fresh, NOW)).toEqual({ 1: '1m', 2: '6m', 3: '10m', 4: '4d' });
  });

  it('Again restarts the first step', () => {
    const c = s.answer({ ...fresh, status: 'learning', step: 1 }, 1, NOW);
    expect(c).toMatchObject({ status: 'learning', step: 0, due: NOW + MINUTE, againCount: 1 });
  });

  it('Good walks the steps, then graduates with 1 day', () => {
    const a = s.answer(fresh, 3, NOW);
    expect(a).toMatchObject({ status: 'learning', step: 1, due: NOW + 10 * MINUTE });
    const b = s.answer(a, 3, NOW + 10 * MINUTE);
    expect(b).toMatchObject({ status: 'review', interval: 1, ease: 2500 });
    expect(b.due).toBe(addStudyDays(NOW, 1, 4));
  });

  it('Hard repeats the step: halfway between steps, or same delay on the last step', () => {
    expect(s.answer(fresh, 2, NOW).due).toBe(NOW + 5.5 * MINUTE);
    const last = { ...fresh, status: 'learning' as const, step: 1 };
    expect(s.answer(last, 2, NOW)).toMatchObject({ step: 1, due: NOW + 10 * MINUTE });
  });

  it('Hard with a single step waits 1.5× that step', () => {
    const one = new AnkiV2Scheduler({ ...DEFAULT_CONFIG, learningSteps: [10] }, () => 0.5);
    expect(one.answer(one.newCard(NOW), 2, NOW).due).toBe(NOW + 15 * MINUTE);
  });

  it('Easy graduates immediately with the easy interval', () => {
    const c = s.answer(fresh, 4, NOW);
    expect(c).toMatchObject({ status: 'review', interval: 4 });
    expect(days(c)).toBe(4);
  });

  it('never mutates its input', () => {
    const before = JSON.stringify(fresh);
    s.answer(fresh, 3, NOW);
    expect(JSON.stringify(fresh)).toBe(before);
  });
});

describe('review cards', () => {
  it('Hard ×1.2, Good ×ease, Easy ×ease×1.3, with ease changes', () => {
    const card = review(10);
    expect(s.answer(card, 2, NOW)).toMatchObject({ interval: 12, ease: 2350 });
    expect(s.answer(card, 3, NOW)).toMatchObject({ interval: 25, ease: 2500 });
    expect(s.answer(card, 4, NOW)).toMatchObject({ interval: 33, ease: 2650 });
  });

  it('always grows by at least one day, and Hard < Good < Easy', () => {
    const card = review(1, 1300);
    const hard = s.answer(card, 2, NOW).interval;
    const good = s.answer(card, 3, NOW).interval;
    const easy = s.answer(card, 4, NOW).interval;
    expect(hard).toBeGreaterThanOrEqual(2);
    expect(good).toBeGreaterThan(hard);
    expect(easy).toBeGreaterThan(good);
  });

  it('gives overdue cards credit for the extra days they survived', () => {
    const onTime = s.answer(review(10), 3, NOW).interval;
    const late = s.answer(review(10, 2500, 6), 3, NOW).interval;
    expect(late).toBe(Math.round((10 + 3) * 2.5));
    expect(late).toBeGreaterThan(onTime);
  });

  it('Again is a lapse: ease −200, relearn in 10 minutes, then back with 1 day', () => {
    const lapsed = s.answer(review(30), 1, NOW);
    expect(lapsed).toMatchObject({ status: 'relearning', lapses: 1, ease: 2300, interval: 1, due: NOW + 10 * MINUTE });
    const back = s.answer(lapsed, 3, NOW + 10 * MINUTE);
    expect(back).toMatchObject({ status: 'review', interval: 1, ease: 2300 });
  });

  it('ease never drops below 130%', () => {
    let card = review(5, 1400);
    card = s.answer(card, 1, NOW);
    expect(card.ease).toBe(1300);
    expect(s.answer(review(5, 1300), 2, NOW).ease).toBe(1300);
  });

  it('caps intervals at the maximum', () => {
    const capped = new AnkiV2Scheduler({ ...DEFAULT_CONFIG, maximumInterval: 30 }, () => 0.5);
    expect(capped.answer(review(25), 4, NOW).interval).toBe(30);
  });

  it('shows day intervals on review buttons', () => {
    expect(previewLabels(s, review(10), NOW)).toEqual({ 1: '10m', 2: '12d', 3: '25d', 4: '1.1mo' });
  });
});

describe('fuzz', () => {
  it('keeps short intervals exact and spreads long ones within ±15%', () => {
    const lo = new AnkiV2Scheduler(DEFAULT_CONFIG, () => 0);
    const hi = new AnkiV2Scheduler(DEFAULT_CONFIG, () => 0.999);
    expect(lo.answer(lo.newCard(NOW), 3, NOW).status).toBe('learning');
    const card = review(10);
    const a = lo.answer(card, 3, NOW).interval;
    const b = hi.answer(card, 3, NOW).interval;
    expect(a).toBeLessThan(25);
    expect(b).toBeGreaterThan(25);
    expect(a).toBeGreaterThanOrEqual(Math.floor(25 * 0.85));
    expect(b).toBeLessThanOrEqual(Math.ceil(25 * 1.15));
  });
});

describe('study days', () => {
  it('starts the day at 4am: 2am still belongs to yesterday', () => {
    const twoAm = new Date(2026, 10, 17, 2, 0).getTime();
    expect(studyDayStart(twoAm, 4)).toBe(new Date(2026, 10, 16, 4, 0).getTime());
    expect(studyDaysBetween(NOW, twoAm, 4)).toBe(0);
    expect(studyDaysBetween(NOW, twoAm + 3 * 60 * MINUTE, 4)).toBe(1);
  });
});

describe('weak words', () => {
  it('flags 4+ Again or low ease, never new cards', () => {
    expect(isWeak(s.newCard(NOW))).toBe(false);
    expect(isWeak({ ...review(3), againCount: 4 })).toBe(true);
    expect(isWeak(review(3, 1700))).toBe(true);
    expect(isWeak(review(3))).toBe(false);
  });
});

describe('formatInterval', () => {
  it.each([
    [30_000, '<1m'],
    [5.5 * MINUTE, '6m'],
    [90 * MINUTE, '1.5h'],
    [DAY, '1d'],
    [45 * DAY, '1.5mo'],
    [800 * DAY, '2.2y'],
  ])('%d ms → %s', (ms, label) => expect(formatInterval(ms)).toBe(label));
});
