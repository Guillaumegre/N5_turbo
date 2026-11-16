import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fontSize, fonts } from '@/theme/tokens';

type Variant = 'body' | 'caption' | 'title' | 'jpWord' | 'jpSentence';

type Props = TextProps & {
  variant?: Variant;
  muted?: boolean;
  accent?: boolean;
};

const variantStyle: Record<Variant, TextStyle> = {
  body: { fontFamily: fonts.ui, fontSize: fontSize.body },
  caption: { fontFamily: fonts.ui, fontSize: fontSize.caption },
  title: { fontFamily: fonts.ui, fontSize: fontSize.title, fontWeight: '600' },
  jpWord: { fontFamily: fonts.jp, fontSize: fontSize.word },
  jpSentence: { fontFamily: fonts.jp, fontSize: fontSize.sentence },
};

export function AppText({ variant = 'body', muted, accent, style, ...rest }: Props) {
  const { colors, fontScale } = useTheme();
  const base = variantStyle[variant];
  const color = accent ? colors.accent : muted ? colors.textMuted : colors.text;
  return (
    <Text
      {...rest}
      style={[base, { color, fontSize: (base.fontSize ?? fontSize.body) * fontScale }, style]}
    />
  );
}
