import { Pressable, StyleSheet, View } from 'react-native';

import { RATINGS, type Rating } from '@/domain/srs/types';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';

const NAMES: Record<Rating, string> = {
  1: strings.review.again,
  2: strings.review.hard,
  3: strings.review.good,
  4: strings.review.easy,
};

/** Again / Hard / Good / Easy with the next interval under each (and the key on desktop). */
export function GradeButtons({
  labels,
  onAnswer,
  showKeys,
}: {
  labels: Record<Rating, string>;
  onAnswer: (r: Rating) => void;
  showKeys: boolean;
}) {
  const { colors } = useTheme();
  const tint: Record<Rating, string> = { 1: colors.again, 2: colors.hard, 3: colors.good, 4: colors.easy };
  return (
    <View style={styles.row}>
      {RATINGS.map((r) => (
        <Pressable
          key={r}
          accessibilityRole="button"
          accessibilityLabel={`${NAMES[r]}, next in ${labels[r]}`}
          onPress={() => onAnswer(r)}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.border },
          ]}>
          <AppText style={[styles.name, { color: tint[r] }]}>{NAMES[r]}</AppText>
          <AppText variant="caption" muted>
            {labels[r]}
            {showKeys ? ` · ${r}` : ''}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

export function ShowAnswerButton({ onPress, showKeys }: { onPress: () => void; showKeys: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.show, { backgroundColor: colors.text, opacity: pressed ? 0.85 : 1 }]}>
      <AppText style={[styles.showLabel, { color: colors.background }]}>
        {strings.review.showAnswer}
        {showKeys ? '  ·  Space' : ''}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  button: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  name: { fontWeight: '600' },
  show: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  showLabel: { fontWeight: '600' },
});
