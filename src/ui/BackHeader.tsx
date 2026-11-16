import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Icon } from './Icon';

export function goBack(fallback: '/' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/** TypeKana header: square back button, heavy title, small Japanese subtitle. */
export function BackHeader({
  title,
  titleJa,
  onBack = goBack,
  right,
}: {
  title?: string;
  titleJa?: string;
  onBack?: () => void;
  /** Action on the right (e.g. "Reset"). */
  right?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.row, { paddingTop: insets.top + 14 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        hitSlop={12}
        style={({ pressed }) => [
          styles.back,
          { backgroundColor: colors.surface, borderColor: colors.borderStrong },
          pressed && styles.pressed,
        ]}>
        <Icon name="chevronLeft" size={18} color={colors.text} />
      </Pressable>
      {title || titleJa ? (
        <View style={styles.text}>
          {title ? (
            <AppText variant="title" numberOfLines={1}>
              {title}
            </AppText>
          ) : null}
          {titleJa ? <AppText variant="caption" faint>{titleJa}</AppText> : null}
        </View>
      ) : (
        <View style={styles.text} />
      )}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14 },
  back: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  text: { flex: 1 },
});
