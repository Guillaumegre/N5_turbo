import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
  bordered?: boolean;
};

/** 44 × 44 touch target with an accessible name (icon-only buttons need one). */
export function IconButton({ icon, label, onPress, disabled, size = 44, bordered }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        bordered && { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
        pressed && { backgroundColor: colors.surfaceMuted },
        disabled && { opacity: 0.35 },
      ]}>
      <Icon name={icon} size={Math.round(size * 0.42)} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
