# N5 Turbo

Anki-style spaced-repetition app for the full JLPT N5 vocabulary. Expo (React Native + TypeScript) for iOS, Android and web (the web build is the "PC" version).

## Development

```bash
npm install
npm run web        # browser
npm start          # Expo dev server (scan the QR code with a dev build / Expo Go)
npm run check      # typecheck + lint + tests
```

## Test on an iPhone (development build)

A development build is N5 Turbo's own debug app, signed with the Apple Developer account: it stays
installed (about a year, unlike Expo Go's weekly re-download) and supports every native module.

One-time setup:

```bash
npx eas-cli@latest login                     # Expo account
npx eas-cli@latest device:create             # open the link on the iPhone, install the profile
npx eas-cli@latest build --profile development --platform ios   # Apple sign-in, cloud build ~15 min
```

Install the build from the link/QR code EAS gives you, then on the iPhone turn on
Settings → Privacy & Security → Developer Mode (restart when asked).

Every day after that: `npx expo start`, scan the QR code with the Camera app. Code changes reload live;
rebuild only after adding a package with native code.

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

## Could be better (later)

- **Voice:** the app uses the phone's built-in Japanese text-to-speech. A clearly more natural option is
  pre-generated neural audio (Google / Azure Japanese voices) for the 733 words and their sentences,
  bundled with the app (~20 MB, offline, same voice on every device).
