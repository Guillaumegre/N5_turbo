import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useData, useSettings, useTodayCounts } from '@/data/DataProvider';
import { streak } from '@/data/repo/cards';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { BigCard, Divider, Row, Section, Track } from '@/ui/Blocks';
import { formatShortDate } from '@/ui/dates';
import { Screen } from '@/ui/Screen';

export function HomeScreen() {
  'use no memo'; // reads the database (streak): see DataProvider
  const { colors } = useTheme();
  const { db, now, config } = useData();
  const settings = useSettings();
  const counts = useTodayCounts();

  if (!settings.onboarded) return <Redirect href="/goal?first=1" />;

  const days = streak(db, now, config.dayStartHour);
  const total = counts.new + counts.learning + counts.due;

  return (
    <Screen back={false}>
      <View style={styles.topRow}>
        <View style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText variant="caption" muted style={styles.pillLabel}>{strings.home.streak}</AppText>
          <AppText style={styles.pillValue}>{strings.home.days(days)}</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.home.settings}
          onPress={() => router.push('/settings')}
          hitSlop={10}
          style={({ pressed }) => [styles.gear, pressed && styles.pressed]}>
          {/* U+FE0E: flat text glyph instead of the colour emoji (as TypeKana). */}
          <AppText style={[styles.gearGlyph, { color: colors.text }]}>{'⚙︎'}</AppText>
        </Pressable>
      </View>

      <View>
        <AppText style={[styles.eyebrow, { color: colors.accent }]}>{strings.home.eyebrow}</AppText>
        <AppText variant="display" style={styles.title}>{strings.appName}</AppText>
        <AppText muted style={styles.subtitle}>{strings.home.subtitle}</AppText>
      </View>

      <View style={styles.cards}>
        <BigCard
          tone="ink"
          watermark="習"
          eyebrow={strings.home.todayEyebrow}
          title={total ? strings.home.todayTitle(total) : strings.home.doneTitle}
          sub={total ? strings.home.todaySub(counts.new, counts.learning, counts.due) : strings.home.doneSub}
          onPress={() => router.push('/review')}
        />
        <BigCard
          tone="accent"
          watermark="選"
          eyebrow={strings.home.customEyebrow}
          title={strings.home.customTitle}
          sub={strings.home.customSub}
          onPress={() => router.push('/filters')}
        />
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/goal')} style={({ pressed }) => pressed && styles.pressed}>
        <View style={[styles.goal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.goalHead}>
            <AppText style={styles.goalTitle}>{strings.home.progress(counts.started, counts.totalWords)}</AppText>
            <AppText variant="caption" accent style={styles.goalLink}>
              {settings.goalDeadline ? '' : strings.home.setGoal}
            </AppText>
          </View>
          <Track value={counts.started / counts.totalWords} />
          <AppText variant="caption" faint>
            {settings.goalDeadline ? strings.home.goalLine(formatShortDate(settings.goalDeadline), counts.newPerDay) : strings.home.noGoal}
          </AppText>
        </View>
      </Pressable>

      <Section title={strings.home.more}>
        <Row glyph="語" label={strings.home.wordList} sub={strings.home.wordListSub} onPress={() => router.push('/words')} />
        <Divider />
        <Row glyph="績" label={strings.home.stats} sub={strings.home.statsSub} onPress={() => router.push('/stats')} />
        <Divider />
        <Row glyph="情" label={strings.home.about} sub={strings.home.aboutSub} onPress={() => router.push('/about')} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  pillLabel: { fontWeight: '600' },
  pillValue: { fontSize: 13, fontWeight: '800' },
  gear: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  gearGlyph: { fontSize: 30, lineHeight: 36 },
  pressed: { opacity: 0.7 },
  eyebrow: { fontFamily: fonts.mincho, fontSize: 15, letterSpacing: 4 },
  title: { marginTop: 10 },
  subtitle: { fontSize: 14.5, marginTop: 9 },
  cards: { gap: 12 },
  goal: { borderWidth: 1, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  goalHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  goalTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  goalLink: { fontWeight: '700' },
});
