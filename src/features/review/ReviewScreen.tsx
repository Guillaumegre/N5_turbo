import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings, useTodayCounts, useUpdateSetting } from '@/data/DataProvider';
import { wordById, words } from '@/data/vocab';
import type { StudyCard } from '@/domain/srs/queue';
import type { Rating } from '@/domain/srs/types';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { maxContentWidth, radius, spacing } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { IconButton } from '@/ui/IconButton';

import { UnlockReminder } from '@/features/premium/UnlockReminder';

import { CardBack, CardFront } from './CardContent';
import { GradeButtons, ShowAnswerButton } from './GradeButtons';
import { SessionSummary } from './SessionSummary';
import { useReviewSession } from './useReviewSession';

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function ReviewScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ minutes?: string; custom?: string }>();
  const minutes = params.minutes ? Number(params.minutes) : undefined;
  const custom = params.custom === '1';
  const s = useReviewSession({ timerMinutes: minutes && minutes > 0 ? minutes : undefined, custom });
  const { furigana } = useSettings();
  const updateSetting = useUpdateSetting();
  const toggleFurigana = () => updateSetting('furigana', !furigana);
  const { freeNewLeft } = useTodayCounts();
  // Keyboard hints only where a keyboard is likely: the web version at desktop width.
  const { width } = useWindowDimensions();
  const showKeys = Platform.OS === 'web' && width >= 700;

  useKeyboardShortcuts({
    enabled: !s.finished,
    revealed: s.revealed,
    onReveal: s.reveal,
    onAnswer: s.answer,
    onUndo: s.undo,
    onToggleFurigana: toggleFurigana,
    onEnd: () => (s.canUndo ? s.end() : leave()),
  });

  // Free words all started: "learn more" becomes the way to premium.
  const unlock = freeNewLeft === 0;
  const onMore = custom ? undefined : unlock ? () => router.replace('/premium') : s.learnMore;
  const moreLabel = unlock ? strings.premium.unlockShort(words.length) : undefined;

  const body = (() => {
    if (s.finished && !s.stats.answers) return <NothingToStudy onMore={onMore} moreLabel={moreLabel} />;
    if (s.finished)
      return (
        <SessionSummary
          stats={s.stats}
          reason={s.finished}
          onMore={onMore}
          moreLabel={moreLabel}
          extra={custom ? undefined : <UnlockReminder />}
          onResume={s.resume}
          onDone={leave}
        />
      );
    const card = s.current!;
    const word = wordById.get(card.wordId)!;
    return (
      <>
        <TopBar
          onEnd={() => (s.canUndo ? s.end() : leave())}
          canUndo={s.canUndo}
          onUndo={s.undo}
          furigana={furigana}
          onToggleFurigana={toggleFurigana}
          progress={s.progress}
          remainingMs={s.remainingMs}
          paused={s.paused}
        />
        {s.counts.new + s.counts.learning + s.counts.due || !s.practice ? <Counters counts={s.counts} current={card} /> : null}
        {s.practice ? (
          <View style={[styles.practice, { backgroundColor: colors.surfaceMuted }]}>
            <AppText variant="caption" muted style={styles.practiceText}>{strings.review.practice}</AppText>
          </View>
        ) : null}
        {/* The card is a paper sheet. */}
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* The animated view is the sheet's direct child: nested in a scroll view mounting at the
              same time, the web fade-in stayed stuck at opacity 0. */}
          {s.revealed ? (
            <Animated.View key={`${card.id}-back`} entering={FadeIn.duration(180)} style={styles.flex}>
              <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <CardBack word={word} furigana={furigana} />
              </ScrollView>
            </Animated.View>
          ) : (
            // Only the Show answer button reveals: a tap on the card (or its speaker) must not.
            <Animated.View key={`${card.id}-front`} entering={FadeIn.duration(140)} style={styles.flex}>
              <CardFront word={word} direction={card.direction} furigana={furigana} />
            </Animated.View>
          )}
        </View>
        <View style={styles.actions}>
          {s.revealed && s.labels ? (
            <GradeButtons labels={s.labels} onAnswer={s.answer} showKeys={showKeys} />
          ) : (
            <ShowAnswerButton onPress={s.reveal} showKeys={showKeys} />
          )}
          {showKeys ? (
            <AppText variant="caption" muted style={styles.keys}>
              {strings.review.keys}
            </AppText>
          ) : null}
        </View>
      </>
    );
  })();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.column}>{body}</View>
    </SafeAreaView>
  );
}

// ------------------------------------------------------------------ pieces

type TopBarProps = {
  onEnd: () => void;
  canUndo: boolean;
  onUndo: () => void;
  furigana: boolean;
  onToggleFurigana: () => void;
  progress: { done: number; total: number };
  remainingMs: number | null;
  paused: boolean;
};

function TopBar({ onEnd, canUndo, onUndo, furigana, onToggleFurigana, progress, remainingMs, paused }: TopBarProps) {
  const { colors } = useTheme();
  const pct = progress.total ? Math.min(100, (progress.done / progress.total) * 100) : 0;
  return (
    <View style={styles.topBar}>
      {/* Equal-width sides keep the progress pill centred whatever the buttons. */}
      <View style={styles.side}>
        <IconButton icon="close" label={strings.review.endSession} onPress={onEnd} />
      </View>
      <View style={styles.progress} accessibilityRole="progressbar">
        {remainingMs !== null ? (
          <View style={styles.clock}>
            <Icon name="clock" size={14} color={colors.text} />
            <AppText style={styles.progressText}>{paused ? strings.review.timePaused : formatClock(remainingMs)}</AppText>
          </View>
        ) : (
          <>
            <AppText muted style={styles.progressText}>
              <AppText style={[styles.progressText, { color: colors.text }]}>{progress.done}</AppText> / {progress.total}
            </AppText>
            <View style={[styles.track, { backgroundColor: colors.border }]}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.text }]} />
            </View>
          </>
        )}
      </View>
      <View style={[styles.side, styles.topRight]}>
        <IconButton icon="undo" label={strings.review.undo} onPress={onUndo} disabled={!canUndo} />
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={furigana ? strings.review.furiganaOn : strings.review.furiganaOff}
          accessibilityState={{ checked: furigana }}
          onPress={onToggleFurigana}
          style={[styles.furiToggle, { borderColor: furigana ? colors.accent : colors.border }]}>
          <AppText style={[styles.furiText, { color: furigana ? colors.accent : colors.textMuted }]}>あ</AppText>
        </Pressable>
      </View>
    </View>
  );
}

function Counters({ counts, current }: { counts: { new: number; learning: number; due: number }; current: StudyCard }) {
  const { colors } = useTheme();
  const kind = current.status === 'new' ? 'new' : current.status === 'review' ? 'due' : 'learning';
  const items = [
    { key: 'new', n: counts.new, color: colors.easy, label: strings.review.countNew },
    { key: 'learning', n: counts.learning, color: colors.accent, label: strings.review.countLearning },
    { key: 'due', n: counts.due, color: colors.good, label: strings.review.countDue },
  ];
  return (
    <View style={styles.counters}>
      {items.map((i) => (
        <View key={i.key} style={styles.countItem} accessible accessibilityLabel={`${i.n} ${i.label}`}>
          <View style={[styles.dot, { backgroundColor: i.color }]} />
          <AppText muted style={styles.countLabel}>
            {/* The current card's kind is coloured. */}
            <AppText style={[styles.countLabel, kind === i.key ? { color: i.color, fontWeight: '500' } : { color: colors.textMuted }]}>{i.n}</AppText>{' '}
            {i.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** `onMore` is absent in a custom session: nothing matched the filters. */
function NothingToStudy({ onMore, moreLabel }: { onMore?: () => void; moreLabel?: string }) {
  return (
    <View style={styles.nothing}>
      <AppText variant="title" style={styles.centerText}>
        {onMore ? strings.review.nothingTitle : strings.review.noMatchTitle}
      </AppText>
      <AppText muted style={styles.centerText}>{onMore ? strings.review.nothingBody : strings.review.noMatchBody}</AppText>
      <View style={styles.nothingActions}>
        {onMore ? <Button label={moreLabel ?? strings.review.learnMore} onPress={onMore} /> : null}
        <Button label={onMore ? strings.review.back : strings.review.backToFilters} variant="secondary" onPress={leave} />
      </View>
    </View>
  );
}

function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// ------------------------------------------------------------------ keyboard (desktop / web)

type Shortcuts = {
  enabled: boolean;
  revealed: boolean;
  onReveal: () => void;
  onAnswer: (r: Rating) => void;
  onUndo: () => void;
  onToggleFurigana: () => void;
  onEnd: () => void;
};

function useKeyboardShortcuts(k: Shortcuts) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !k.enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!k.revealed) k.onReveal();
      } else if (k.revealed && ['1', '2', '3', '4'].includes(e.key)) {
        k.onAnswer(Number(e.key) as Rating);
      } else if (e.key === 'z' || e.key === 'Z') {
        k.onUndo();
      } else if (e.key === 'f' || e.key === 'F') {
        k.onToggleFurigana();
      } else if (e.key === 'Escape') {
        k.onEnd();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [k]);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  progress: { alignItems: 'center', gap: 6 },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressText: { fontSize: 13.5, fontVariant: ['tabular-nums'] },
  track: { width: 120, height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
  sheet: { flex: 1, borderWidth: 1, borderRadius: 28, overflow: 'hidden', marginTop: 14 },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  topRight: { justifyContent: 'flex-end', gap: 4 },
  furiToggle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  furiText: { fontSize: 17 },
  practice: { alignSelf: 'center', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  practiceText: { fontWeight: '500' },
  counters: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingTop: 6 },
  countItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  countLabel: { fontSize: 13, fontVariant: ['tabular-nums'] },
  scroll: { flexGrow: 1 },
  actions: { gap: spacing.sm, paddingTop: 14 },
  keys: { textAlign: 'center' },
  nothing: { flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  nothingActions: { gap: spacing.sm, marginTop: spacing.md },
  centerText: { textAlign: 'center' },
});
