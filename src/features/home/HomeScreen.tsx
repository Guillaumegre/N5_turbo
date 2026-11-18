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
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';

import { GoalCard } from './GoalCard';

/** Rough session length: new cards come back a few times, reviews are quick. */
function estimateMinutes(fresh: number, learning: number, due: number): number {
  return Math.max(1, Math.round((fresh * 30 + learning * 15 + due * 10) / 60));
}

/**
 * Home, kept to what matters today: the review card with its Start button, the goal at a
 * glance, custom sessions with preset shortcuts, and quiet links at the bottom.
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
  // Lighter tints of the counter colours: they sit on the black card.
  const counters = [
    { n: counts.new, label: strings.review.countNew, color: '#86AEEA' },
    { n: counts.learning, label: strings.review.countLearning, color: '#E99A7F' },
    { n: counts.due, label: strings.review.countDue, color: '#7DC48B' },
  ];
  const links = [
    { label: strings.home.wordList, href: '/words' as const },
    { label: strings.home.about, href: '/about' as const },
  ];

  return (
    <Screen back={false}>
      <View style={styles.topRow}>
        <View style={styles.flex}>
          <AppText style={styles.title}>{strings.home.title}</AppText>
          <AppText muted style={styles.date}>
            {date}
            {days ? <AppText style={[styles.date, { color: colors.accent }]}>{`  ·  ${strings.home.streakLine(days)}`}</AppText> : null}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.home.settings}
          onPress={() => router.push('/settings')}
          hitSlop={8}
          style={({ pressed }) => [styles.gear, { borderColor: colors.border }, pressed && styles.pressed]}>
          {/* U+FE0E: flat text glyph instead of the colour emoji (as TypeKana). */}
          <AppText style={[styles.gearGlyph, { color: colors.text }]}>{'⚙︎'}</AppText>
        </Pressable>
      </View>

      <View style={[styles.today, { backgroundColor: colors.inkCard }]}>
        <AppText style={styles.watermark} accessible={false}>習</AppText>
        <View style={styles.bigRow}>
          <AppText style={[styles.bigNumber, { color: colors.onInk }]}>{total}</AppText>
          <View style={styles.bigSide}>
            <AppText style={[styles.bigLabel, { color: colors.onInk }]}>{total ? strings.home.cardsToday(total) : strings.home.doneTitle}</AppText>
            <AppText style={[styles.bigSub, { color: colors.onInkSoft }]}>
              {total ? strings.home.aboutMinutes(estimateMinutes(counts.new, counts.learning, counts.due)) : strings.home.doneShort}
            </AppText>
          </View>
        </View>
        {total ? (
          <View style={styles.counters}>
            {counters.map((c) => (
              <AppText key={c.label} style={[styles.counter, { color: colors.onInkSoft }]}>
                <AppText style={[styles.counter, { color: c.color }]}>{c.n}</AppText> {c.label}
              </AppText>
            ))}
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/review')}
          style={({ pressed }) => [
            styles.start,
            total ? { backgroundColor: colors.accent } : { borderWidth: 1, borderColor: colors.onInkSoft },
            pressed && styles.pressed,
          ]}>
          <AppText style={[styles.startLabel, { color: total ? colors.onAccent : colors.onInk }]}>
            {total ? strings.home.startReview : strings.review.learnMore}
          </AppText>
          <Icon name="chevronRight" size={20} color={total ? colors.onAccent : colors.onInk} />
        </Pressable>
      </View>

      <GoalCard db={db} deadline={settings.goalDeadline} newPerDay={counts.newPerDay} />

      <View style={styles.custom}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/filters')}
          style={({ pressed }) => [styles.customRow, { borderColor: colors.border }, pressed && styles.pressed]}>
          <View style={[styles.customGlyph, { backgroundColor: colors.surfaceMuted }]}>
            <AppText style={styles.customGlyphText}>選</AppText>
          </View>
          <View style={styles.flex}>
            <AppText style={styles.customTitle}>{strings.home.customTitle}</AppText>
            <AppText variant="caption" muted numberOfLines={1} style={styles.customSub}>{strings.home.customSub}</AppText>
          </View>
          <Icon name="chevronRight" size={15} color={colors.textMuted} />
        </Pressable>
        {presets.length ? (
          <View style={styles.presets}>
            {presets.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={strings.home.startPreset(p.name)}
                onPress={() => startPreset(p)}
                style={({ pressed }) => [styles.preset, { backgroundColor: colors.surfaceMuted }, pressed && styles.pressed]}>
                <AppText style={[styles.presetPlay, { color: colors.accent }]}>▶</AppText>
                <AppText style={styles.presetLabel} numberOfLines={1}>{p.name}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {/* Pushes the links to the bottom of the screen (the body grows to fill it). */}
      <View style={styles.flex} />
      <View style={styles.links}>
        {links.map((l) => (
          <Pressable key={l.href} accessibilityRole="link" onPress={() => router.push(l.href)} hitSlop={6} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <AppText muted style={styles.linkText}>{l.label}</AppText>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  title: { fontSize: 34, fontWeight: '300', letterSpacing: -0.7, lineHeight: 40 },
  date: { fontSize: 14, marginTop: 2 },
  gear: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  gearGlyph: { fontSize: 22, lineHeight: 26 },
  pressed: { opacity: 0.75 },
  today: { position: 'relative', overflow: 'hidden', borderRadius: 28, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 22, gap: 20 },
  watermark: { position: 'absolute', right: -6, top: -30, fontFamily: fonts.mincho, fontSize: 160, lineHeight: 170, color: 'rgba(242,239,232,.055)' },
  bigRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  bigNumber: { fontSize: 72, fontWeight: '300', letterSpacing: -2.8, lineHeight: 74, fontVariant: ['tabular-nums'] },
  bigSide: { paddingBottom: 8, gap: 2, flexShrink: 1 },
  bigLabel: { fontSize: 16 },
  bigSub: { fontSize: 14 },
  counters: { flexDirection: 'row', gap: 18 },
  counter: { fontSize: 14, fontVariant: ['tabular-nums'] },
  start: { minHeight: 64, borderRadius: 18, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  startLabel: { fontSize: 17, fontWeight: '500', letterSpacing: -0.2 },
  custom: { gap: 10 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: radius.lg, paddingVertical: 10, paddingLeft: 10, paddingRight: 16 },
  customGlyph: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  customGlyphText: { fontFamily: fonts.mincho, fontSize: 19 },
  customTitle: { fontSize: 15, fontWeight: '500' },
  customSub: { fontSize: 13, marginTop: 1 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 36, paddingHorizontal: 13, borderRadius: 18, maxWidth: '100%' },
  presetPlay: { fontSize: 9 },
  presetLabel: { fontSize: 13.5, flexShrink: 1 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 28, marginTop: -14 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: 14 },
});
