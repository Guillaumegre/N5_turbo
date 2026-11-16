/**
 * Every user-facing string lives here. English only — no i18n layer.
 */
export const strings = {
  appName: 'N5 Turbo',
  home: {
    title: 'Today',
    reviewNow: 'Review now',
    chooseFilters: 'Custom session',
    wordList: 'Word list',
    stats: 'Stats',
    settings: 'Settings',
    about: 'About',
  },
  review: {
    title: 'Review',
    showAnswer: 'Show answer',
    again: 'Again',
    hard: 'Hard',
    good: 'Good',
    easy: 'Easy',
    undo: 'Undo',
  },
  filters: { title: 'Session filters' },
  words: { title: 'Word list' },
  stats: { title: 'Stats' },
  settings: { title: 'Settings' },
  about: { title: 'About' },
  common: {
    comingSoon: 'Coming in a later milestone.',
    back: 'Back',
  },
} as const;
