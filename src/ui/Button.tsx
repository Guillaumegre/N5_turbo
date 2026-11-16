import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ink' | 'secondary';
  disabled?: boolean;
  /** 'large': the screen's main action (Home's Start review). */
  size?: 'normal' | 'large';
};

/** Primary = vermilion, ink = black (TypeKana's two card colours), secondary = outlined card. */
export function Button({ label, onPress, variant = 'primary', disabled, size = 'normal' }: Props) {
  const { colors } = useTheme();
  const bg = variant === 'primary' ? colors.accent : variant === 'ink' ? colors.inkCard : colors.surface;
  const fg = variant === 'primary' ? colors.onAccent : variant === 'ink' ? colors.onInk : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'large' && styles.large,
        { backgroundColor: bg },
        variant === 'secondary' && { borderColor: colors.borderStrong, borderWidth: 1 },
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.4 },
      ]}>
      <AppText style={[styles.label, size === 'large' && styles.largeLabel, { color: fg }]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 54, paddingHorizontal: 24, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  large: { minHeight: 66, borderRadius: radius.lg },
  largeLabel: { fontSize: 19 },
});
