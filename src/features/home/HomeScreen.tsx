import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useData, useSettings, useTodayCounts, useUpdateSetting } from '@/data/DataProvider';
import { streak } from '@/data/repo/cards';
import { listPresets, type Preset } from '@/data/repo/presets';
import { SPRINT_MINUTES } from '@/domain/filters';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { Divider, Pills, Row, Section } from '@/ui/Blocks';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';

import { GoalCard } from './GoalCard';

/** Rough session length: new cards come back a few times, reviews are quick. */
function estimateMinutes(fresh: number, learning: number, due: number): number {
  return Math.max(1, Math.round((fresh * 30 + learning * 15 + due * 10) / 60));
}

/**
 * Home, in order of importance: today's reviews with the main Start button; a slim custom-session
 * row with preset shortcuts; the goal and progress by part of speech; links. The streak sits
 * quietly under the date.
 */
export function HomeScreen() {
  'use no memo'; // reads the database (streak): see DataProvider
  const { colors } = useTheme();
  const { db, now, config } = useData();
  const settings = useSettings();
  const counts = useTodayCounts();
  const update = useUpdateSetting();
  const presets = listPresets(db);
  // A preset on Home starts its session straight away.
  const startPreset = (p: Preset) => {
    update('customFilter', p.filter);
    router.push(p.filter.length === 'sprint' ? `/review?custom=1&minutes=${SPRINT_MINUTES}` : '/review?custom=1');
  };

  if (!settings.onboarded) return <Redirect href="/goal?first=1" />;

  const days = streak(db, now, config.dayStartHour);
  const total = counts.new + counts.learning + counts.due;
  const date = new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const counters = [
    { n: counts.new, label: strings.review.countNew, color: colors.easy },
    { n: counts.learning, label: strings.review.countLearning, color: colors.accent },
    { n: counts.due, label: strings.review.countDue, color: colors.good },
  ];

  return (
    <Screen back={false}>
      <View style={styles.topRow}>
        <View style={styles.titles}>
          <AppText style={[styles.eyebrow, { color: colors.accent }]}>{strings.home.eyebrow}</AppText>
          <AppText variant="display" style={styles.title}>{strings.home.title}</AppText>
          <AppText muted style={styles.date}>
            {date}
            {days ? <AppText style={[styles.date, { color: colors.accent }]}>{`  ·  ${strings.home.streakLine(days)}`}</AppText> : null}
          </AppText>
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

      <View style={[styles.today, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AppText style={[styles.watermark, { color: colors.surfaceMuted }]} accessible={false}>習</AppText>
        <View style={styles.bigRow}>
          <AppText style={styles.bigNumber}>{total}</AppText>
          <AppText muted style={styles.bigLabel}>{strings.home.cardsToday(total)}</AppText>
        </View>
        <View style={styles.counters}>
          {counters.map((c) => (
            <View key={c.label} style={styles.counter}>
              <AppText style={[styles.counterValue, { color: c.color }]}>{c.n}</AppText>
              <AppText variant="caption" muted style={styles.counterLabel}>{c.label}</AppText>
            </View>
          ))}
        </View>
        {total ? (
          <Button
            size="large"
            label={strings.home.start(estimateMinutes(counts.new, counts.learning, counts.due))}
            onPress={() => router.push('/review')}
          />
        ) : (
          <>
            <AppText muted>{strings.home.doneSub}</AppText>
            <Button label={strings.review.learnMore} variant="secondary" onPress={() => router.push('/review')} />
          </>
        )}
      </View>

      <View style={styles.custom}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/filters')}
          style={({ pressed }) => [styles.customRow, { backgroundColor: colors.inkCard }, pressed && styles.pressed]}>
          <View style={[styles.customGlyph, { backgroundColor: 'rgba(255,255,255,.1)' }]}>
            <AppText style={[styles.customGlyphText, { color: colors.onInk }]}>選</AppText>
          </View>
          <View style={styles.flex}>
            <AppText style={[styles.customTitle, { color: colors.onInk }]}>{strings.home.customTitle}</AppText>
            <AppText variant="caption" style={{ color: colors.onInkSoft }} numberOfLines={1}>{strings.home.customSub}</AppText>
          </View>
          <Icon name="chevronRight" size={16} color={colors.onInkSoft} />
        </Pressable>
        {presets.length ? (
          <Pills
            options={presets.map((p) => ({ value: p.id, label: `▸ ${p.name}` }))}
            selected={[]}
            onToggle={(id) => {
              const p = presets.find((x) => x.id === id);
              if (p) startPreset(p);
            }}
          />
        ) : null}
      </View>

      <GoalCard db={db} now={now} deadline={settings.goalDeadline} newPerDay={counts.newPerDay} />

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
  topRow: { flexDirection: 'row', alignItems: 'flex-start' },
  titles: { flex: 1 },
  eyebrow: { fontFamily: fonts.mincho, fontSize: 15, letterSpacing: 4, marginTop: 6 },
  title: { marginTop: 8 },
  date: { fontSize: 14.5, marginTop: 4 },
  gear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  gearGlyph: { fontSize: 30, lineHeight: 36 },
  pressed: { opacity: 0.7 },
  today: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderRadius: radius.xl, padding: 22, gap: 18 },
  watermark: { position: 'absolute', right: 6, top: -26, fontFamily: fonts.mincho, fontSize: 132, lineHeight: 140 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  bigNumber: { fontSize: 56, fontWeight: '600', letterSpacing: -2, lineHeight: 60 },
  bigLabel: { fontSize: 16 },
  counters: { flexDirection: 'row' },
  counter: { flex: 1, gap: 2 },
  counterValue: { fontSize: 26, fontWeight: '600', letterSpacing: -0.6 },
  counterLabel: { fontWeight: '500', textTransform: 'capitalize' },
  custom: { gap: 10 },
  flex: { flex: 1 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 14 },
  customGlyph: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  customGlyphText: { fontFamily: fonts.mincho, fontSize: 19 },
  customTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
});
