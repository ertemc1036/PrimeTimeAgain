# PrimeTimeAgain

> **YOUR PRIME ISN'T OVER.** Become the version of yourself you're proud of.

A personal comeback app for iOS and Android: define your Prime, build a realistic plan, complete daily
missions, and track your comeback with your own interactive 3D avatar at the centre.

Expo SDK 58 · React Native · TypeScript · Expo Router · Three.js on expo-gl · i18next (EN / DE / TR).
Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · 3D: [`docs/AVATAR_3D.md`](docs/AVATAR_3D.md).

## Run it on your iPhone

1. Install **Expo Go** from the App Store.
2. `npm install` then `npm start`.
3. Scan the QR code with the iPhone camera (same Wi-Fi, or `npx expo start --tunnel`).

On the last onboarding screen, **Preview with sample progress** starts you on day 27 with realistic
history so the calendar, streaks and charts have data. **Enter Prime Control** starts a real day 1.
Settings → **Delete all data** starts over.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run web` | Run in a browser (WebGL needed for the 3D avatar) |
| `npm run typecheck` | TypeScript, including every translation key |
| `npm test` | Unit tests: missions, streaks, calendar rules, progress, coach, translations |
| `npm run lint` | ESLint (Expo config) |

## 3D avatars

Characters and animations come from the [Microsoft Rocketbox Avatar Library](https://github.com/microsoft/Microsoft-Rocketbox)
(MIT License), converted by `scripts/avatars/build_avatars.py`.

## Not connected yet (each needs approval)

Supabase accounts & sync (draft schema in `docs/supabase/schema.sql`), the AI Prime Coach (server-side
Claude integration), RevenueCat / Prime Pro, local reminder notifications, selfie-based avatars,
EAS builds and store publishing.
