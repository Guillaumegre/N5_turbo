/**
 * Palette: washi paper, sumi ink, one vermilion (朱色) accent.
 * Contrast checked against WCAG AA (≥ 4.5:1 for body text, accent text and button labels).
 */
export const palette = {
  light: {
    background: '#FAF8F3',
    surface: '#FFFFFF',
    surfaceMuted: '#F1EEE6',
    border: '#E2DDD1',
    text: '#1B1B1F',
    textMuted: '#5F5C55',
    accent: '#C8402C',
    onAccent: '#FFFFFF',
    furigana: '#6B675F',
    // grading buttons
    again: '#B3261E',
    hard: '#8A6100',
    good: '#2E6B3A',
    easy: '#1F5AA6',
  },
  dark: {
    background: '#121214',
    surface: '#1C1C20',
    surfaceMuted: '#26262B',
    border: '#34343A',
    text: '#ECEAE4',
    textMuted: '#A8A59D',
    accent: '#E8664F',
    onAccent: '#121214',
    furigana: '#B4B0A7',
    again: '#F2867E',
    hard: '#E0B252',
    good: '#7DC48B',
    easy: '#86AEEA',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type Colors = { [K in keyof (typeof palette)['light']]: string };
