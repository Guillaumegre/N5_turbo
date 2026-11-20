import { FREE_WORDS, isLocked, maxRankFor, REMINDER_DAY, shouldRemindUnlock } from './premium';

describe('premium', () => {
  it('limits the free version to the most common words', () => {
    expect(maxRankFor(false)).toBe(FREE_WORDS);
    expect(maxRankFor(true)).toBeUndefined();
    expect(isLocked(FREE_WORDS, false)).toBe(false);
    expect(isLocked(FREE_WORDS + 1, false)).toBe(true);
    expect(isLocked(FREE_WORDS + 1, true)).toBe(false);
  });

  it('shows the unlock reminder once, from day 5, while free words are left', () => {
    const base = { premium: false, alreadyShown: false, freeNewLeft: 40, daysStudying: REMINDER_DAY };
    expect(shouldRemindUnlock(base)).toBe(true);
    expect(shouldRemindUnlock({ ...base, daysStudying: REMINDER_DAY - 1 })).toBe(false);
    expect(shouldRemindUnlock({ ...base, daysStudying: null })).toBe(false);
    expect(shouldRemindUnlock({ ...base, alreadyShown: true })).toBe(false);
    expect(shouldRemindUnlock({ ...base, premium: true, freeNewLeft: null })).toBe(false);
    expect(shouldRemindUnlock({ ...base, freeNewLeft: 0 })).toBe(false); // the limit message takes over
  });
});
