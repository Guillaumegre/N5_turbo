import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useData } from '@/data/DataProvider';
import { answerCard, undoLast } from '@/data/repo/cards';
import { buildTodayQueue } from '@/data/today';
import { previewLabels } from '@/domain/srs/format';
import type { Rating } from '@/domain/srs/types';

import { applyAnswer, applyUndo, createSession, nextCard, progress, remainingCounts, sessionStats, type Session } from './session';

export type EndReason = 'done' | 'time' | 'user';

export function useReviewSession({ timerMinutes }: { timerMinutes?: number }) {
  const { db, scheduler, config, notifyChanged } = useData();
  const [session, setSession] = useState<Session>(() => createSession(buildTodayQueue(db, config, Date.now()).queue));
  const [extraNew, setExtraNew] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [revealed, setRevealed] = useState(false);
  const [shownAt, setShownAt] = useState(() => Date.now());
  const [endedBy, setEndedBy] = useState<EndReason | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(timerMinutes ? timerMinutes * 60_000 : null);
  const [paused, setPaused] = useState(false);

  // The timer pauses while the app is in the background (or the browser tab is hidden).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setPaused(state !== 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      setClock(Date.now());
      if (!paused && !endedBy) setRemainingMs((ms) => (ms === null ? null : Math.max(0, ms - 1000)));
    }, 1000);
    return () => clearInterval(tick);
  }, [paused, endedBy]);

  const current = endedBy ? null : nextCard(session, clock);
  const finished: EndReason | null = endedBy ?? (current ? null : 'done');
  const labels = current && revealed ? previewLabels(scheduler, current, clock) : null;

  const reveal = useCallback(() => {
    if (current) setRevealed(true);
  }, [current]);

  const answer = useCallback(
    (rating: Rating) => {
      if (!current || !revealed) return;
      const at = Date.now();
      const durationMs = at - shownAt;
      const { card: updated } = answerCard(db, {
        cardId: current.id,
        rating,
        now: at,
        durationMs,
        kind: 'review',
        scheduler,
        newId: () => Crypto.randomUUID(),
      });
      setSession((s) => applyAnswer(s, current, updated, rating, at, durationMs));
      setRevealed(false);
      setShownAt(at);
      setClock(at);
      // When the sprint timer ran out, the session ends after the card in progress.
      if (remainingMs === 0) setEndedBy('time');
      notifyChanged();
    },
    [current, revealed, shownAt, db, scheduler, remainingMs, notifyChanged],
  );

  const undo = useCallback(() => {
    if (!session.answers.length) return;
    undoLast(db, Date.now());
    setSession(applyUndo);
    setRevealed(false);
    setShownAt(Date.now());
    setEndedBy(null);
    notifyChanged();
  }, [db, session.answers.length, notifyChanged]);

  const end = useCallback(() => setEndedBy('user'), []);

  /** Back to the cards left after ending early or when the sprint timer ran out (no timer). */
  const resume = useCallback(() => {
    setEndedBy(null);
    setRemainingMs(null);
    setRevealed(false);
    setShownAt(Date.now());
  }, []);

  /** "Learn 5 more words": a fresh session with a higher new-word allowance for today. */
  const learnMore = useCallback(() => {
    const more = extraNew + 5;
    setExtraNew(more);
    setSession(createSession(buildTodayQueue(db, config, Date.now(), more).queue));
    setRevealed(false);
    setShownAt(Date.now());
    setEndedBy(null);
    setRemainingMs(null);
  }, [db, config, extraNew]);

  return {
    current,
    revealed,
    labels,
    finished,
    counts: remainingCounts(session),
    progress: progress(session),
    stats: sessionStats(session),
    canUndo: session.answers.length > 0,
    remainingMs,
    paused,
    reveal,
    answer,
    undo,
    end,
    resume,
    learnMore,
  };
}
