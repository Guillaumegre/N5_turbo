import { Platform } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 64,
} as const;

/** TypeKana radii. */
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 22,
} as const;

/** Content never grows wider than this on tablets / desktop browsers. */
export const maxContentWidth = 640;

/**
 * Japanese type without bundling webfonts (as TypeKana): iOS ships Hiragino Sans (gothic)
 * and Hiragino Mincho, Android exposes Noto CJK as sans-serif / serif, the web falls back
 * through the usual Japanese system fonts.
 * - gothic: card words and sentences (clear strokes for learners)
 * - mincho: decoration (eyebrows, watermarks)
 */
export const fonts = {
  jp: Platform.select({
    ios: 'Hiragino Sans',
    android: 'sans-serif',
    default: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif',
  }),
  mincho: Platform.select({
    ios: 'Hiragino Mincho ProN',
    android: 'serif',
    default: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif',
  }),
  ui: Platform.select({
    web: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    default: undefined,
  }),
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
