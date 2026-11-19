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
