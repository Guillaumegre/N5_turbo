import { posGroup, type PosGroup } from './filters';
import type { CardState } from './srs/types';

/** Interval (days) from which a word counts as mastered (Anki's "mature"). */
export const MASTERED_DAYS = 21;

export type WordState = 'new' | 'learning' | 'mastered';

/** A word's state from its JP → EN card. */
export function wordState(card: Pick<CardState, 'status' | 'interval'> | undefined): WordState {
  if (!card || card.status === 'new') return 'new';
  return card.status === 'review' && card.interval >= MASTERED_DAYS ? 'mastered' : 'learning';
}

export type Tally = Record<WordState, number> & { total: number };

const empty = (): Tally => ({ new: 0, learning: 0, mastered: 0, total: 0 });

/** Word counts per state, overall and per part of speech (for the goal card). */
export function tallyWords(words: { id: string; pos: string }[], states: Map<string, WordState>) {
  const all = empty();
  const byPos = new Map<PosGroup, Tally>();
  for (const w of words) {
    const s = states.get(w.id) ?? 'new';
    const g = posGroup(w.pos);
    const t = byPos.get(g) ?? empty();
    t[s]++;
    t.total++;
    byPos.set(g, t);
    all[s]++;
    all.total++;
  }
  return { all, byPos };
}
