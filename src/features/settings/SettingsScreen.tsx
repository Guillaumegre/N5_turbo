import { Pressable, StyleSheet, View } from 'react-native';

import { useSettings, useUpdateSetting } from '@/data/DataProvider';
import type { Settings } from '@/data/repo/settings';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { Screen } from '@/ui/Screen';

const THEMES: { value: Settings['theme']; label: string }[] = [
  { value: 'light', label: strings.settings.light },
  { value: 'dark', label: strings.settings.dark },
  { value: 'system', label: strings.settings.system },
];

export function SettingsScreen() {
  const { colors } = useTheme();
  const { theme } = useSettings();
  const update = useUpdateSetting();
  return (
    <Screen>
      <View style={styles.section}>
        <AppText variant="caption" muted style={styles.label}>{strings.settings.appearance}</AppText>
        <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]} accessibilityRole="radiogroup">
          {THEMES.map((t) => {
            const selected = theme === t.value;
            return (
              <Pressable
                key={t.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => update('theme', t.value)}
                style={[styles.option, selected && { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AppText style={[styles.optionText, { color: selected ? colors.text : colors.textMuted }]}>{t.label}</AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
      <AppText variant="caption" muted>{strings.common.comingSoon}</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  label: { letterSpacing: 1, textTransform: 'uppercase' },
  segmented: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: radius.md },
  option: { flex: 1, minHeight: 40, borderRadius: 9, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  optionText: { fontWeight: '600' },
});
