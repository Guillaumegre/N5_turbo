import { Platform } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 64,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
} as const;

/** Content never grows wider than this on tablets / desktop browsers. */
export const maxContentWidth = 640;

/** Font family names registered in the root layout via expo-font. */
export const fonts = {
  jp: 'NotoSansJP_400Regular',
  jpBold: 'NotoSansJP_700Bold',
  ui: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }),
} as const;

/** Base font sizes; multiplied by the user's font-scale setting (accessibility). */
export const fontSize = {
  caption: 12,
  body: 16,
  title: 22,
  furigana: 11,
  sentence: 20,
  word: 56,
} as const;
