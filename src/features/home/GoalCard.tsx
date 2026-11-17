import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { wordStates } from '@/data/repo/cards';
import type { Db } from '@/data/db/client';
import { words } from '@/data/vocab';
import { POS_GROUPS } from '@/domain/filters';
import { tallyWords, type Tally } from '@/domain/progress';
import { DAY } from '@/domain/srs/types';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { formatShortDate } from '@/ui/dates';
import { Icon } from '@/ui/Icon';

const h = strings.home;

/** Two-tone bar: mastered (green) then learning (vermilion) over the rest. */
function StackedBar({ tally, height = 6 }: { tally: Tally; height?: number }) {
  const { colors } = useTheme();
  const pct = (n: number) => `${tally.total ? (n / tally.total) * 100 : 0}%` as const;
  return (
    <View style={[styles.bar, { height, borderRadius: height / 2, backgroundColor: colors.border }]}>
      <View style={{ width: pct(tally.mastered), backgroundColor: colors.good }} />
      <View style={{ width: pct(tally.learning), backgroundColor: colors.accent }} />
    </View>
  );
}

/**
 * The goal, full width: deadline and days left, words started, mastered / learning / to learn,
 * the daily pace, and progress per part of speech. Tapping it changes the goal.
 */
export function GoalCard({ db, now, deadline, newPerDay }: { db: Db; now: number; deadline: number | null; newPerDay: number }) {
  'use no memo'; // reads the database: see DataProvider
  const { colors } = useTheme();
  const { all, byPos } = tallyWords(words, wordStates(db));
  const started = all.learning + all.mastered;
  const daysLeft = deadline ? Math.max(0, Math.ceil((deadline - now) / DAY)) : null;
  const stats = [
    { n: all.mastered, label: h.mastered, color: colors.good },
    { n: all.learning, label: h.learning, color: colors.accent },
    { n: all.new, label: h.toLearn, color: colors.textMuted },
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={h.changeGoal}
      onPress={() => router.push('/goal')}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText variant="label" faint>{h.goalEyebrow}</AppText>
          <AppText style={styles.title}>{deadline ? h.goalBy(formatShortDate(deadline)) : h.noGoalTitle}</AppText>
          <AppText variant="caption" style={{ color: colors.good, fontWeight: '500' }}>{h.perDay(newPerDay)}</AppText>
        </View>
        {daysLeft !== null ? (
          <View style={[styles.badge, { backgroundColor: colors.surfaceMuted }]}>
            <AppText variant="caption" style={styles.badgeText}>{h.daysLeft(daysLeft)}</AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.bigRow}>
        <AppText style={styles.big}>{started}</AppText>
        <AppText muted style={styles.bigOf}>/ {all.total} {h.wordsStarted}</AppText>
      </View>
      <StackedBar tally={all} height={8} />

      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <View style={styles.statHead}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <AppText variant="caption" muted>{s.label}</AppText>
            </View>
            <AppText style={styles.statValue}>{s.n}</AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" faint>{h.masteredLegend}</AppText>

      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <AppText variant="label" faint>{h.byType}</AppText>
      <View style={styles.types}>
        {POS_GROUPS.map((g) => {
          const t = byPos.get(g);
          if (!t) return null;
          return (
            <View key={g} style={styles.type}>
              <AppText style={styles.typeLabel}>{h.posPlural[g]}</AppText>
              <View style={styles.typeBar}>
                <StackedBar tally={t} />
              </View>
              <AppText muted style={styles.typeCount}>
                {t.learning + t.mastered}/{t.total}
              </AppText>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <AppText variant="caption" accent style={styles.footerText}>{h.changeGoal}</AppText>
        <Icon name="chevronRight" size={14} color={colors.accent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.xl, padding: 20, gap: 14 },
  pressed: { opacity: 0.85 },
  flex: { flex: 1, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontWeight: '500' },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  big: { fontSize: 40, fontWeight: '600', letterSpacing: -1.2, lineHeight: 44 },
  bigOf: { fontSize: 15 },
  bar: { flexDirection: 'row', overflow: 'hidden' },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, gap: 2 },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statValue: { fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  rule: { height: 1, marginHorizontal: -20 },
  types: { gap: 10 },
  type: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeLabel: { width: 108, fontSize: 14 },
  typeBar: { flex: 1 },
  typeCount: { width: 64, textAlign: 'right', fontSize: 13, fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  footerText: { fontWeight: '500' },
});
