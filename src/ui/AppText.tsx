import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fontSize, fonts } from '@/theme/tokens';

/**
 * TypeKana type scale: heavy, tightly tracked titles; medium-weight body; small
 * uppercase section labels.
 */
type Variant = 'body' | 'caption' | 'label' | 'title' | 'display' | 'jpWord' | 'jpSentence';

type Props = TextProps & {
  variant?: Variant;
  muted?: boolean;
  faint?: boolean;
  accent?: boolean;
};

const variantStyle: Record<Variant, TextStyle> = {
  body: { fontFamily: fonts.ui, fontSize: fontSize.body, fontWeight: '400' },
  caption: { fontFamily: fonts.ui, fontSize: fontSize.caption, fontWeight: '400' },
  label: { fontFamily: fonts.ui, fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontFamily: fonts.ui, fontSize: 20, fontWeight: '600', letterSpacing: -0.6 },
  display: { fontFamily: fonts.ui, fontSize: 44, fontWeight: '600', letterSpacing: -1.2 },
  jpWord: { fontFamily: fonts.jp, fontSize: fontSize.word },
  jpSentence: { fontFamily: fonts.jp, fontSize: fontSize.sentence },
};

export function AppText({ variant = 'body', muted, faint, accent, style, ...rest }: Props) {
  const { colors, fontScale } = useTheme();
  const base = variantStyle[variant];
  const color = accent ? colors.accent : faint ? colors.textFaint : muted ? colors.textMuted : colors.text;
  return (
    <Text
      {...rest}
      style={[base, { color, fontSize: (base.fontSize ?? fontSize.body) * fontScale }, style]}
    />
  );
}
