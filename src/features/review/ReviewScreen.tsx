import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings, useUpdateSetting } from '@/data/DataProvider';
import { wordById } from '@/data/vocab';
import type { StudyCard } from '@/domain/srs/queue';
import type { Rating } from '@/domain/srs/types';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { maxContentWidth, radius, spacing } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { IconButton } from '@/ui/IconButton';

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
  const params = useLocalSearchParams<{ minutes?: string }>();
  const minutes = params.minutes ? Number(params.minutes) : undefined;
  const s = useReviewSession({ timerMinutes: minutes && minutes > 0 ? minutes : undefined });
  const { furigana } = useSettings();
  const updateSetting = useUpdateSetting();
  const toggleFurigana = () => updateSetting('furigana', !furigana);
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

  const body = (() => {
    if (s.finished && !s.stats.answers) return <NothingToStudy onMore={s.learnMore} />;
    if (s.finished) return <SessionSummary stats={s.stats} reason={s.finished} onMore={s.learnMore} onResume={s.resume} onDone={leave} />;
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
        <Counters counts={s.counts} current={card} />
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {s.revealed ? (
            <Animated.View key={`${card.id}-back`} entering={FadeIn.duration(180)}>
              <CardBack word={word} furigana={furigana} />
            </Animated.View>
          ) : (
            <Animated.View key={`${card.id}-front`} entering={FadeIn.duration(140)} style={styles.flex}>
              <CardFront word={word} direction={card.direction} />
            </Animated.View>
          )}
        </ScrollView>
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
      <IconButton icon="close" label={strings.review.endSession} onPress={onEnd} />
      <View style={[styles.pill, { backgroundColor: colors.surfaceMuted }]} accessibilityRole="progressbar">
        {remainingMs !== null ? (
          <>
            <Icon name="clock" size={14} color={colors.text} />
            <AppText style={styles.pillText}>{paused ? strings.review.timePaused : formatClock(remainingMs)}</AppText>
          </>
        ) : (
          <>
            <View style={[styles.track, { backgroundColor: colors.border }]}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.accent }]} />
            </View>
            <AppText style={styles.pillText}>
              {progress.done}
              <AppText muted style={styles.pillTotal}> / {progress.total}</AppText>
            </AppText>
          </>
        )}
      </View>
      <View style={styles.topRight}>
        <IconButton icon="undo" label={strings.review.undo} onPress={onUndo} disabled={!canUndo} />
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={furigana ? strings.review.furiganaOn : strings.review.furiganaOff}
          accessibilityState={{ checked: furigana }}
          onPress={onToggleFurigana}
          style={[styles.furiToggle, { backgroundColor: furigana ? colors.accent + '22' : 'transparent' }]}>
          <AppText
            style={[
              styles.furiText,
              { color: furigana ? colors.accent : colors.textMuted, textDecorationLine: furigana ? 'none' : 'line-through' },
            ]}>
            あ
          </AppText>
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
        <AppText
          key={i.key}
          accessibilityLabel={`${i.n} ${i.label}`}
          style={[styles.count, { color: i.color }, kind === i.key && styles.currentCount]}>
          {i.n}
        </AppText>
      ))}
    </View>
  );
}

function NothingToStudy({ onMore }: { onMore: () => void }) {
  return (
    <View style={styles.nothing}>
      <AppText variant="title" style={styles.centerText}>{strings.review.nothingTitle}</AppText>
      <AppText muted style={styles.centerText}>{strings.review.nothingBody}</AppText>
      <View style={styles.nothingActions}>
        <Button label={strings.review.learnMore} onPress={onMore} />
        <Button label={strings.review.back} variant="secondary" onPress={leave} />
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
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  pillText: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  pillTotal: { fontWeight: '400' },
  track: { width: 56, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  topRight: { flexDirection: 'row', gap: 4 },
  furiToggle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  furiText: { fontSize: 18, fontWeight: '500' },
  counters: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, paddingTop: 4 },
  count: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  currentCount: { textDecorationLine: 'underline' },
  scroll: { flexGrow: 1 },
  actions: { gap: spacing.sm, paddingTop: spacing.sm },
  keys: { textAlign: 'center' },
  nothing: { flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  nothingActions: { gap: spacing.sm, marginTop: spacing.md },
  centerText: { textAlign: 'center' },
});
