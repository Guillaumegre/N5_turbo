import { MAX_NEW_PER_DAY, newWordsPerDay } from './goal';

const NOW = new Date(2026, 10, 16, 10, 0).getTime(); // 16 Nov
const in2Months = new Date(2027, 0, 16, 12, 0).getTime(); // 16 Jan: 62 study days incl. today

describe('goal pacing', () => {
  it('spreads the remaining words over the days left', () => {
    expect(newWordsPerDay({ deadline: in2Months }, 733, NOW, 4)).toBe(12);
  });

  it('catches up after missed days', () => {
    const later = new Date(2026, 11, 16, 10, 0).getTime(); // a month later, nothing learned
    expect(newWordsPerDay({ deadline: in2Months }, 733, later, 4)).toBe(23);
  });

  it('is capped, and never asks for words once done or past the deadline', () => {
    expect(newWordsPerDay({ deadline: NOW }, 733, NOW, 4)).toBe(MAX_NEW_PER_DAY);
    expect(newWordsPerDay({ deadline: in2Months }, 0, NOW, 4)).toBe(0);
    expect(newWordsPerDay({ deadline: NOW - 30 * 86_400_000 }, 10, NOW, 4)).toBe(10);
  });
});
