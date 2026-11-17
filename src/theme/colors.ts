/**
 * TypeKana's palette: warm paper, ink, vermilion seal accent. The dark palette is the one
 * TypeKana's website uses. Body text keeps ≥ 4.5:1 contrast (muted text is 64% ink).
 */
export const palette = {
  light: {
    background: '#F2EFE8', // paper
    surface: '#FBF9F5', // card
    surfaceMuted: 'rgba(20,22,26,.06)',
    border: 'rgba(20,22,26,.1)',
    borderStrong: 'rgba(20,22,26,.16)',
    text: '#14161A', // ink
    textMuted: 'rgba(20,22,26,.64)',
    textFaint: 'rgba(20,22,26,.45)',
    accent: '#C8452A',
    onAccent: '#FBF9F5',
    /** Big "ink" cards (TypeKana's black training card). */
    inkCard: '#14161A',
    onInk: '#F2EFE8',
    onInkSoft: 'rgba(242,239,232,.66)',
    watermark: 'rgba(242,239,232,.09)',
    watermarkWarm: 'rgba(255,255,255,.14)',
    furigana: 'rgba(20,22,26,.6)',
    again: '#B3261E',
    hard: '#8A6100',
    good: '#2A7047', // dark enough for 4.5:1 on its own tinted grade button
    easy: '#1F5AA6',
  },
  dark: {
    background: '#18140F',
    surface: '#221C15',
    surfaceMuted: 'rgba(242,239,232,.07)',
    border: 'rgba(242,239,232,.14)',
    borderStrong: 'rgba(242,239,232,.22)',
    text: '#F2EFE8',
    textMuted: 'rgba(242,239,232,.72)',
    textFaint: 'rgba(242,239,232,.5)',
    accent: '#E17750',
    onAccent: '#18140F',
    inkCard: '#2C251C',
    onInk: '#F2EFE8',
    onInkSoft: 'rgba(242,239,232,.66)',
    watermark: 'rgba(242,239,232,.07)',
    watermarkWarm: 'rgba(255,255,255,.16)',
    furigana: 'rgba(242,239,232,.62)',
    again: '#F2867E',
    hard: '#E0B252',
    good: '#7DC48B',
    easy: '#86AEEA',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type Colors = { [K in keyof (typeof palette)['light']]: string };
