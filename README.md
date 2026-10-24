# PrimeTimeAgain

> **Your Prime Isn't Over.**

A wellness and self-improvement app for iOS and Android built around three pillars: **Body**, **Mind** and **Life**.

Built with Expo SDK 58, React Native, TypeScript, Expo Router and i18next. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the architecture, folder structure and roadmap.

## Run it on your iPhone

1. Install **Expo Go** from the App Store.
2. On your computer (Node 20+):
   ```bash
   npm install
   npm start
   ```
3. Scan the QR code with the iPhone Camera app. Your phone and computer need to be on the same Wi-Fi network. If they aren't, run `npx expo start --tunnel`.

On the last onboarding screen, tap **Preview with sample progress** to start on day 19 with example history, so every screen has data. **Begin my journey** gives the real first-day experience with empty states. Settings → **Reset app** starts over.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run web` | Run in a browser |
| `npm run typecheck` | TypeScript (also checks every translation key) |
| `npm test` | Unit tests: Prime Score, journey, dates, translation parity |
| `npm run lint` | ESLint (Expo config) |

## Localization

English (default), German and Turkish. Strings live in `src/i18n/locales/*.json`. The device language is detected on first launch, English is the fallback, and users can change the language in onboarding or Settings. To add a language, add a JSON file and one entry in `src/i18n/languages.ts`. RTL languages are supported by the architecture.

## Not connected yet (each needs your confirmation)

Supabase (accounts and sync), the Claude-powered coach (via a server-side function, so no API key ships in the app), RevenueCat subscriptions, and EAS builds / store publishing.
