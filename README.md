# N5 Turbo

Anki-style spaced-repetition app for the full JLPT N5 vocabulary. Expo (React Native + TypeScript) for iOS, Android and web (the web build is the "PC" version).

## Development

```bash
npm install
npm run web        # browser
npm start          # Expo dev server (scan the QR code with a dev build / Expo Go)
npm run check      # typecheck + lint + tests
```

## Project structure

```
src/
  app/            routes only (expo-router); each file re-exports a feature screen
  features/       home, review, filters, settings, sync — screens + feature logic
  domain/         pure TypeScript: scheduler, kana helpers, filters (unit-tested)
  data/           SQLite access + bundled vocabulary JSON
  theme/          palette (light/dark), spacing, fonts, ThemeProvider
  ui/             shared components (AppText, Button, Screen…)
  strings.ts      every user-facing string (English only)
tools/            build-time data pipeline (Python): word list, JMdict, Tatoeba, furigana, themes
```

## Data licenses

- JMdict / JmdictFurigana — © EDRDG, CC BY-SA 4.0 (the bundled vocabulary JSON is therefore CC BY-SA 4.0)
- Tatoeba sentences — CC BY 2.0 FR
- N5 word list — Jonathan Waller (tanos.co.uk), CC BY
- Noto Sans JP — SIL Open Font License 1.1
