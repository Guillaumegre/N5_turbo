import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useData, useSettings, useTodayCounts, useUpdateSetting } from '@/data/DataProvider';
import { firstAnswerAt, startedWords } from '@/data/repo/cards';
import { words } from '@/data/vocab';
import { FREE_WORDS, shouldRemindUnlock } from '@/domain/premium';
import { studyDaysBetween } from '@/domain/srs/time';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';

const t = strings.premium;

/**
 * Shown once, at the end of a daily session from day 5 of studying (see shouldRemindUnlock).
 * Never during reviews; "Not now" just closes it, nothing gets locked.
 */
export function UnlockReminder() {
  'use no memo'; // reads the database: see DataProvider
  const { colors } = useTheme();
  const { db, now, config } = useData();
  const settings = useSettings();
  const { freeNewLeft } = useTodayCounts();
  const update = useUpdateSetting();

  // Decided once when the summary appears: marking it shown must not make it vanish.
  const [shown] = useState(() => {
    const first = firstAnswerAt(db);
    const daysStudying = first === null ? null : studyDaysBetween(first, now, config.dayStartHour);
    if (!shouldRemindUnlock({ premium: settings.premium, alreadyShown: settings.unlockReminderShown, freeNewLeft, daysStudying })) return null;
    return { started: startedWords(db), days: (daysStudying ?? 0) + 1 };
  });
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (shown) update('unlockReminderShown', true);
    // Once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!shown || !open) return null;
  return (
    <View style={[styles.card, { backgroundColor: colors.inkCard }]}>
      <AppText style={styles.watermark} accessible={false}>全</AppText>
      <AppText style={[styles.eyebrow, { color: colors.onInkSoft }]}>{t.reminderEyebrow}</AppText>
      <AppText style={[styles.title, { color: colors.onInk }]}>{t.reminderTitle(shown.started, shown.days)}</AppText>
      <AppText style={[styles.body, { color: colors.onInkSoft }]}>{t.reminderBody(words.length - FREE_WORDS)}</AppText>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/premium')}
          style={({ pressed }) => [styles.cta, { backgroundColor: colors.accent }, pressed && styles.pressed]}>
          <AppText style={[styles.ctaLabel, { color: colors.onAccent }]}>{t.reminderCta}</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} hitSlop={6} style={({ pressed }) => [styles.later, pressed && styles.pressed]}>
          <AppText style={[styles.laterLabel, { color: colors.onInkSoft }]}>{t.reminderLater}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'relative', overflow: 'hidden', borderRadius: radius.xl, padding: 18, gap: 6 },
  watermark: { position: 'absolute', right: -4, top: -24, fontFamily: fonts.mincho, fontSize: 120, lineHeight: 130, color: 'rgba(242,239,232,.06)' },
  eyebrow: { fontSize: 12.5, letterSpacing: 0.3 },
  title: { fontSize: 21, fontWeight: '300', letterSpacing: -0.4 },
  body: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  cta: { minHeight: 44, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center' },
  ctaLabel: { fontSize: 15, fontWeight: '500' },
  later: { minHeight: 44, justifyContent: 'center' },
  laterLabel: { fontSize: 14 },
  pressed: { opacity: 0.8 },
});
