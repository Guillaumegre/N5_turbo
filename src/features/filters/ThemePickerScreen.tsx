import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSettings, useUpdateSetting } from '@/data/DataProvider';
import { themes, words } from '@/data/vocab';
import { normalizeFilter } from '@/domain/filters';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/ui/AppText';
import { goBack } from '@/ui/BackHeader';
import { Divider, Row, Section } from '@/ui/Blocks';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';

/** Per theme: its words (by frequency) and a few common ones as a sample line. */
const THEME_INFO = themes.map((th) => {
  const list = words.filter((w) => w.themes.includes(th.id)).sort((a, b) => a.rank - b.rank);
  return { ...th, count: list.length, sample: list.slice(0, 4).map((w) => w.kanji).join('・') };
});

/** Multi-select list of themes (Claude Design "Theme picker"); applies on the button. */
export function ThemePickerScreen() {
  const { colors } = useTheme();
  const settings = useSettings();
  const update = useUpdateSetting();
  const filter = normalizeFilter(settings.customFilter);
  const [picked, setPicked] = useState<string[]>(filter.themes);

  const wordCount = words.filter((w) => w.themes.some((id) => picked.includes(id))).length;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const apply = () => {
    update('customFilter', { ...filter, themes: picked });
    goBack();
  };

  return (
    <Screen
      title={strings.themes.title}
      titleJa={strings.themes.titleJa}
      headerRight={
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setPicked([])} style={styles.headerAction}>
          <AppText style={[styles.headerActionText, { color: colors.accent }]}>{strings.themes.clear}</AppText>
        </Pressable>
      }
      footer={<Button variant="ink" label={strings.themes.apply(picked.length, wordCount)} onPress={apply} />}>
      <Section>
        {THEME_INFO.map((th, i) => {
          const on = picked.includes(th.id);
          return (
            <View key={th.id}>
              {i ? <Divider /> : null}
              <Row
                label={th.name}
                sub={th.sample}
                onPress={() => toggle(th.id)}
                trailing={
                  <View style={styles.trailing}>
                    <AppText muted style={styles.count}>{th.count}</AppText>
                    <View
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      style={[
                        styles.check,
                        { borderColor: on ? colors.accent : colors.borderStrong, backgroundColor: on ? colors.accent : 'transparent' },
                      ]}>
                      {on ? <Icon name="check" size={14} color={colors.onAccent} /> : null}
                    </View>
                  </View>
                }
              />
            </View>
          );
        })}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerAction: { paddingHorizontal: 4, paddingVertical: 6 },
  headerActionText: { fontSize: 15, fontWeight: '600' },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  count: { fontVariant: ['tabular-nums'], fontSize: 14 },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
