import type { CardState } from './types';

/** "Weak words" (Anki leeches): low ease or pressed Again 4+ times. */
export const WEAK_AGAIN_THRESHOLD = 4;
export const WEAK_EASE_THRESHOLD = 1800;

export function isWeak(card: CardState): boolean {
  if (card.status === 'new') return false;
  return card.againCount >= WEAK_AGAIN_THRESHOLD || card.ease <= WEAK_EASE_THRESHOLD;
}
