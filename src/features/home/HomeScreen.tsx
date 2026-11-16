import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';

export function HomeScreen() {
  const { colors } = useTheme();
  return (
    <Screen>
      {/* Milestone-1 preview card: checks the Japanese font, palette and dark mode. */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AppText variant="jpWord">赤い</AppText>
        <AppText muted>red</AppText>
      </View>

      <Button label={strings.home.reviewNow} onPress={() => router.push('/review')} />
      <Button label={strings.home.chooseFilters} variant="secondary" onPress={() => router.push('/filters')} />
      <Button label={strings.home.wordList} variant="secondary" onPress={() => router.push('/words')} />
      <Button label={strings.home.stats} variant="secondary" onPress={() => router.push('/stats')} />
      <Button label={strings.home.settings} variant="secondary" onPress={() => router.push('/settings')} />
      <Button label={strings.home.about} variant="secondary" onPress={() => router.push('/about')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
