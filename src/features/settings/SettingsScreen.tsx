import { router } from 'expo-router';
import { Alert, Linking, Platform, Pressable, StyleSheet } from 'react-native';

import { useData, useSettings, useTodayCounts, useUpdateSetting } from '@/data/DataProvider';
import { resetProgress } from '@/data/repo/cards';
import type { Settings } from '@/data/repo/settings';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/ui/AppText';
import { Chips, Divider, Row, Section, SwitchRow } from '@/ui/Blocks';
import { formatShortDate } from '@/ui/dates';
import { Screen } from '@/ui/Screen';

const SITE = 'https://guillaumegre.github.io/N5_turbo';

const THEMES: { value: Settings['theme']; label: string }[] = [
  { value: 'light', label: strings.settings.light },
  { value: 'dark', label: strings.settings.dark },
  { value: 'system', label: strings.settings.system },
];

/** Settings, laid out like TypeKana's: titled sections of rows in cards, chips, a quiet reset. */
export function SettingsScreen() {
  const { colors } = useTheme();
  const { db, scheduler, notifyChanged } = useData();
  const settings = useSettings();
  const update = useUpdateSetting();
  const { newPerDay } = useTodayCounts();

  const doReset = () => {
    resetProgress(db, scheduler, Date.now());
    notifyChanged();
  };
  const onReset = () => {
    if (Platform.OS === 'web') {
      // Alert has no buttons on the web.
      if (window.confirm(`${strings.settings.resetTitle}\n${strings.settings.resetBody}`)) doReset();
      return;
    }
    Alert.alert(strings.settings.resetTitle, strings.settings.resetBody, [
      { text: strings.settings.cancel, style: 'cancel' },
      { text: strings.settings.resetConfirm, style: 'destructive', onPress: doReset },
    ]);
  };

  return (
    <Screen title={strings.settings.title} titleJa={strings.settings.titleJa}>
      <Section title={strings.settings.study}>
        <Row
          glyph="標"
          label={strings.settings.goal}
          sub={settings.goalDeadline ? strings.settings.goalSub(formatShortDate(settings.goalDeadline), newPerDay) : strings.settings.noGoal}
          onPress={() => router.push('/goal')}
        />
        <Divider />
        <SwitchRow
          glyph="あ"
          label={strings.settings.furigana}
          sub={strings.settings.furiganaSub}
          value={settings.furigana}
          onChange={(v) => update('furigana', v)}
        />
      </Section>

      <Section title={strings.settings.appearance}>
        <Chips options={THEMES} value={settings.theme} onChange={(v) => update('theme', v)} />
      </Section>

      <Section title={strings.settings.app}>
        <Row glyph="情" label={strings.settings.about} sub={strings.settings.aboutSub} onPress={() => router.push('/about')} />
        <Divider />
        <Row glyph="秘" label={strings.settings.privacy} sub={strings.settings.privacySub} onPress={() => Linking.openURL(`${SITE}/privacy-policy.html`).catch(() => {})} />
        <Divider />
        <Row glyph="助" label={strings.settings.support} sub={strings.settings.supportSub} onPress={() => Linking.openURL(`${SITE}/support.html`).catch(() => {})} />
      </Section>

      <AppText variant="caption" faint style={styles.hint}>{strings.settings.hint}</AppText>

      <Pressable accessibilityRole="button" onPress={onReset} style={({ pressed }) => [styles.reset, pressed && styles.pressed]}>
        <AppText style={[styles.resetText, { color: colors.accent }]}>{strings.settings.reset}</AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { textAlign: 'center' },
  reset: { alignItems: 'center', paddingVertical: 12 },
  resetText: { fontSize: 13.5, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
