import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

type Props = {
  values: number[];
  /** Index drawn in the accent colour (today). */
  highlight?: number;
  /** Labels under the bars: either one per bar, or [first, last] for long series. */
  labels: string[];
  /** Text for a tapped bar ("14 Nov: 12 answers"). */
  describe: (index: number) => string;
  /** Shown above the chart when no bar is tapped. */
  summary: string;
  height?: number;
};

/**
 * Single-series bar chart from plain views: thin bars with rounded tops on a baseline, 2 px gaps,
 * no grid. Tapping a bar shows its value in the line above (the touch version of a tooltip).
 */
export function BarChart({ values, highlight, labels, describe, summary, height = 96 }: Props) {
  const { colors } = useTheme();
  const [picked, setPicked] = useState<number | null>(null);
  const max = Math.max(1, ...values);
  const perBar = labels.length === values.length;
  return (
    <View style={styles.root}>
      <AppText variant="caption" muted style={styles.summary}>{picked === null ? summary : describe(picked)}</AppText>
      <View style={[styles.plot, { height, borderBottomColor: colors.borderStrong }]}>
        {values.map((v, i) => {
          const active = picked === i;
          const color = active ? colors.text : i === highlight ? colors.accent : colors.textFaint;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={describe(i)}
              onPress={() => setPicked(active ? null : i)}
              style={styles.slot}>
              {v ? <View style={[styles.bar, { height: Math.max(3, (v / max) * height), backgroundColor: color }]} /> : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.labels}>
        {perBar ? (
          labels.map((l, i) => (
            <AppText key={i} variant="caption" muted style={[styles.label, i === highlight && { color: colors.text }]}>
              {l}
            </AppText>
          ))
        ) : (
          <>
            <AppText variant="caption" muted>{labels[0]}</AppText>
            <AppText variant="caption" muted>{labels[labels.length - 1]}</AppText>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  summary: { fontSize: 13 },
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, borderBottomWidth: 1 },
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', gap: 2 },
  label: { flex: 1, textAlign: 'center' },
});
