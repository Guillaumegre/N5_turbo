import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { wordStates } from '@/data/repo/cards';
import type { Db } from '@/data/db/client';
import { words } from '@/data/vocab';
import { tallyWords } from '@/domain/progress';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { formatShortDate } from '@/ui/dates';
import { Icon } from '@/ui/Icon';
import { StackedBar } from '@/ui/StackedBar';

const h = strings.home;

/** The goal at a glance: deadline, words started, the daily pace and a progress bar. Opens Stats (which links to the goal). */
export function GoalCard({ db, deadline, newPerDay }: { db: Db; deadline: number | null; newPerDay: number }) {
  'use no memo'; // reads the database: see DataProvider
  const { colors } = useTheme();
  const { all } = tallyWords(words, wordStates(db));
  const started = all.learning + all.mastered;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={h.seeStatsHint}
      onPress={() => router.push('/stats')}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
      <View style={styles.head}>
        <AppText muted style={styles.title} numberOfLines={1}>
          {deadline ? h.goalShort(formatShortDate(deadline)) : h.noGoalTitle}
        </AppText>
        <AppText style={[styles.link, { color: colors.accent }]}>{h.seeStats}</AppText>
        <Icon name="chevronRight" size={14} color={colors.accent} />
      </View>
      <View style={styles.bigRow}>
        <AppText style={styles.big}>{started}</AppText>
        <AppText muted style={styles.bigOf}>/ {all.total} {h.words}</AppText>
        <View style={styles.flex} />
        <AppText style={[styles.pace, { color: colors.good }]}>{h.perDayShort(newPerDay)}</AppText>
      </View>
      <StackedBar tally={all} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.xl, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, gap: 10 },
  pressed: { opacity: 0.85 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 13.5 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  big: { fontSize: 30, fontWeight: '300', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  bigOf: { fontSize: 14 },
  pace: { fontSize: 13.5 },
  link: { fontSize: 13.5, fontWeight: '500' },
});
