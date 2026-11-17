import { StyleSheet, View } from 'react-native';

import type { Tally } from '@/domain/progress';
import { useTheme } from '@/theme/ThemeProvider';

/** Word progress bar: mastered (green), then learning (vermilion), over the words still to learn. */
export function StackedBar({ tally, height = 6 }: { tally: Tally; height?: number }) {
  const { colors } = useTheme();
  const pct = (n: number) => `${tally.total ? (n / tally.total) * 100 : 0}%` as const;
  return (
    <View style={[styles.bar, { height, borderRadius: height / 2, backgroundColor: colors.border }]}>
      <View style={{ width: pct(tally.mastered), backgroundColor: colors.good }} />
      <View style={{ width: pct(tally.learning), backgroundColor: colors.accent }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', overflow: 'hidden' },
});
