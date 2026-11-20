/**
 * TypeKana's palette: warm paper, ink, vermilion seal accent. The dark palette is sumi ink
 * with lifted cards. Body text keeps ≥ 4.5:1 contrast (muted text is 64% ink).
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
    // Sumi ink rather than brown: near-black with a hint of blue, cards lifted a step at a time.
    background: '#0E0F12',
    surface: '#18191D',
    surfaceMuted: 'rgba(237,234,227,.07)',
    border: 'rgba(237,234,227,.09)',
    borderStrong: 'rgba(237,234,227,.18)',
    text: '#EDEAE3',
    textMuted: 'rgba(237,234,227,.68)',
    textFaint: 'rgba(237,234,227,.45)',
    accent: '#EC6B4C', // brighter vermilion: readable as text on the dark background
    onAccent: '#140C09',
    inkCard: '#212227',
    onInk: '#EDEAE3',
    onInkSoft: 'rgba(237,234,227,.64)',
    watermark: 'rgba(237,234,227,.06)',
    watermarkWarm: 'rgba(255,255,255,.16)',
    furigana: 'rgba(237,234,227,.6)',
    again: '#F2867E',
    hard: '#E0B252',
    good: '#7DC48B',
    easy: '#86AEEA',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type Colors = { [K in keyof (typeof palette)['light']]: string };
