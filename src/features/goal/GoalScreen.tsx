import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useData, useSettings, useTodayCounts, useUpdateSetting } from '@/data/DataProvider';
import { goalOptions } from '@/domain/goal';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { formatShortDate } from '@/ui/dates';
import { Screen } from '@/ui/Screen';

/** Three months: about 8 new words and 20 minutes a day, a pace most learners can sustain. */
const RECOMMENDED = '3m';

/** First launch (and Settings → Daily goal): pick a deadline, see the daily pace it implies. */
export function GoalScreen() {
  const { colors } = useTheme();
  const { now, config } = useData();
  const settings = useSettings();
  const update = useUpdateSetting();
  const { started, totalWords } = useTodayCounts();
  const first = useLocalSearchParams<{ first?: string }>().first === '1';

  const options = goalOptions(now, totalWords - started, config.dayStartHour);
  const [picked, setPicked] = useState(() => {
    // Preselect the option closest to the current goal, else the recommended one.
    if (!settings.goalDeadline) return RECOMMENDED;
    const closest = [...options].sort((a, b) => Math.abs(a.deadline - settings.goalDeadline!) - Math.abs(b.deadline - settings.goalDeadline!))[0];
    return closest.id;
  });
  const choice = options.find((o) => o.id === picked) ?? options[1];

  const finish = (deadline: number | null) => {
    update('goalDeadline', deadline);
    update('onboarded', true);
    if (first || !router.canGoBack()) router.replace('/');
    else router.back();
  };

  return (
    <Screen
      back={!first}
      title={first ? undefined : strings.goal.title}
      titleJa={first ? undefined : strings.goal.titleJa}
      footer={
        <View style={styles.actions}>
          <Button label={first ? strings.goal.start : strings.goal.save} onPress={() => finish(choice.deadline)} />
          {first ? (
            <Pressable accessibilityRole="button" onPress={() => finish(null)} style={styles.skip}>
              <AppText muted style={styles.skipText}>{strings.goal.skip}</AppText>
            </Pressable>
          ) : null}
        </View>
      }>
      {first ? (
        <View>
          <AppText style={[styles.eyebrow, { color: colors.accent }]}>{strings.goal.eyebrow}</AppText>
          <AppText variant="display" style={styles.heading}>{strings.goal.heading}</AppText>
          <AppText muted style={styles.lede}>{strings.goal.lede(totalWords)}</AppText>
        </View>
      ) : (
        <AppText muted>{strings.goal.lede(totalWords)}</AppText>
      )}

      <View style={styles.options} accessibilityRole="radiogroup">
        {options.map((o) => {
          const active = o.id === picked;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setPicked(o.id)}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: active ? colors.inkCard : colors.surface, borderColor: active ? colors.inkCard : colors.border },
                pressed && styles.pressed,
              ]}>
              <View style={styles.optionText}>
                <View style={styles.optionHead}>
                  <AppText style={[styles.optionLabel, { color: active ? colors.onInk : colors.text }]}>{o.label}</AppText>
                  {o.id === RECOMMENDED ? (
                    <View style={[styles.badge, { backgroundColor: active ? colors.accent : colors.surfaceMuted }]}>
                      <AppText style={[styles.badgeText, { color: active ? colors.onAccent : colors.accent }]}>{strings.goal.recommended}</AppText>
                    </View>
                  ) : null}
                </View>
                <AppText variant="caption" style={{ color: active ? colors.onInkSoft : colors.textMuted }}>
                  {formatShortDate(o.deadline)}
                </AppText>
              </View>
              <View style={styles.optionRight}>
                <AppText style={[styles.optionPerDay, { color: active ? colors.onInk : colors.text }]}>{strings.goal.perDay(o.perDay)}</AppText>
                <AppText variant="caption" style={{ color: active ? colors.onInkSoft : colors.textMuted }}>{strings.goal.minutesPerDay(o.minutes)}</AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
      <AppText variant="caption" muted style={styles.recommendation}>{strings.goal.recommendation}</AppText>

      <View style={[styles.plan, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AppText variant="label" faint>{strings.goal.planLabel}</AppText>
        <AppText style={styles.planTitle}>{strings.goal.plan(choice.perDay)}</AppText>
        <AppText variant="caption" muted style={styles.planSub}>
          {strings.goal.effort(choice.minutes)} {strings.goal.recompute}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: fonts.mincho, fontSize: 15, letterSpacing: 4, marginTop: 14 },
  heading: { fontSize: 38, marginTop: 10 },
  lede: { fontSize: 14.5, marginTop: 9 },
  options: { gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1 },
  optionText: { flex: 1, gap: 2 },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionLabel: { fontSize: 16, fontWeight: '500', letterSpacing: -0.3 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '500' },
  optionRight: { alignItems: 'flex-end', gap: 2 },
  optionPerDay: { fontSize: 14, fontWeight: '500' },
  recommendation: { marginTop: -4, lineHeight: 18 },
  pressed: { opacity: 0.85 },
  plan: { borderWidth: 1, borderRadius: radius.lg, paddingVertical: 16, paddingHorizontal: 18, gap: 6 },
  planTitle: { fontSize: 22, fontWeight: '600', letterSpacing: -0.6 },
  planSub: { lineHeight: 18 },
  actions: { gap: 4 },
  skip: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontWeight: '600' },
});
