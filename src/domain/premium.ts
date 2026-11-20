/**
 * Free tier vs premium. Free: the FREE_WORDS most common words (frequency rank 1–100).
 * Premium is a one-time store purchase that unlocks every word.
 */
export const FREE_WORDS = 100;

/** RevenueCat entitlement that the lifetime product grants. */
export const ENTITLEMENT = 'premium';

/** Highest rank studied without premium; undefined = no limit. */
export function maxRankFor(premium: boolean): number | undefined {
  return premium ? undefined : FREE_WORDS;
}

export function isLocked(rank: number, premium: boolean): boolean {
  return !premium && rank > FREE_WORDS;
}

/** Study day (0 = the first one) from which the one-time unlock reminder may show. */
export const REMINDER_DAY = 5;

/**
 * The one-time reminder at the end of a daily session: from day 5 of studying, when the
 * free words aren't used up yet (the limit has its own, stronger message), shown once.
 */
export function shouldRemindUnlock(o: {
  premium: boolean;
  alreadyShown: boolean;
  freeNewLeft: number | null;
  /** Study days since the first answer, null when nothing was answered yet. */
  daysStudying: number | null;
}): boolean {
  return !o.premium && !o.alreadyShown && (o.freeNewLeft ?? 0) > 0 && (o.daysStudying ?? -1) >= REMINDER_DAY;
}
