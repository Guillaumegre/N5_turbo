import type { StudyCard } from '@/domain/srs/queue';
import { AnkiV2Scheduler } from '@/domain/srs/scheduler';
import { DEFAULT_CONFIG, MINUTE, type CardStatus, type Rating } from '@/domain/srs/types';

import {
  applyAnswer,
  applyUndo,
  createSession,
  interleave,
  nextCard,
  progress,
  remainingCounts,
  sessionStats,
  type Session,
} from './session';

const NOW = new Date(2026, 10, 16, 10, 0).getTime();
const scheduler = new AnkiV2Scheduler(DEFAULT_CONFIG, () => 0.5);

function card(id: string, status: CardStatus = 'new', due = NOW): StudyCard {
  return { ...scheduler.newCard(due), id, wordId: id, direction: 'recognition', rank: 1, status, due, interval: status === 'review' ? 3 : 0 };
}

function answer(s: Session, rating: Rating, at: number): Session {
  const shown = nextCard(s, at)!;
  const updated = { ...shown, ...scheduler.answer(shown, rating, at) };
  return applyAnswer(s, shown, updated, rating, at, 5000);
}

describe('interleave', () => {
  it('spreads new cards evenly among reviews', () => {
    const r = ['r1', 'r2', 'r3', 'r4'].map((id) => card(id, 'review'));
    const n = ['n1', 'n2'].map((id) => card(id));
    expect(interleave(r, n).map((c) => c.id)).toEqual(['r1', 'r2', 'n1', 'r3', 'r4', 'n2']);
    expect(interleave([], n).map((c) => c.id)).toEqual(['n1', 'n2']);
  });
});

describe('review session', () => {
  it('repeats a new card after its learning step, then finishes', () => {
    let s = createSession({ learning: [], review: [], fresh: [card('a'), card('b')] });
    expect(progress(s)).toEqual({ done: 0, total: 2 });

    s = answer(s, 3, NOW); // a → learning, due +10 min
    expect(nextCard(s, NOW)?.id).toBe('b');
    s = answer(s, 4, NOW); // b graduates
    expect(remainingCounts(s)).toEqual({ new: 0, learning: 1, due: 0 });

    // Nothing else left: 'a' is shown early (within 20 minutes), as Anki does.
    expect(nextCard(s, NOW + MINUTE)?.id).toBe('a');
    s = answer(s, 3, NOW + MINUTE); // graduates
    expect(nextCard(s, NOW + MINUTE)).toBeNull();
    expect(progress(s)).toEqual({ done: 3, total: 3 });
  });

  it('shows learning cards as soon as they are due, before other cards', () => {
    let s = createSession({ learning: [], review: [card('r', 'review')], fresh: [card('n')] });
    s = answer(s, 1, NOW); // first card (r) lapses → relearning in 10 min
    expect(nextCard(s, NOW)?.id).toBe('n');
    expect(nextCard(s, NOW + 10 * MINUTE)?.id).toBe('r');
  });

  it('undo puts the card back in front, in its previous state', () => {
    let s = createSession({ learning: [], review: [], fresh: [card('a'), card('b')] });
    s = answer(s, 3, NOW);
    s = applyUndo(s);
    expect(nextCard(s, NOW)).toMatchObject({ id: 'a', status: 'new' });
    expect(s.learning).toHaveLength(0);
    expect(progress(s)).toEqual({ done: 0, total: 2 });
  });

  it('computes end-of-session stats', () => {
    let s = createSession({ learning: [], review: [], fresh: [card('a'), card('b')] });
    s = answer(s, 1, NOW);
    s = answer(s, 3, NOW);
    s = answer(s, 3, NOW + MINUTE);
    expect(sessionStats(s)).toEqual({
      cards: 2,
      answers: 3,
      correctPercent: 67,
      timeMs: 15000,
      byRating: { 1: 1, 2: 0, 3: 2, 4: 0 },
      toRevisit: ['a'],
    });
  });
});
