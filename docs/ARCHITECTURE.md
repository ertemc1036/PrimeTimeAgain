# PrimeTimeAgain — Architecture

> "Your Prime Isn't Over."

This document describes how the app is organised and why. It is the reference
for every milestone that follows.

## 1. Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | Expo SDK 58, React Native 0.88, React 19, TypeScript (strict) | Runs in Expo Go during the prototype phase. |
| Navigation | Expo Router (file-based) | `Stack` (native) + `expo-router/js-tabs` for the tab bar, `Stack.Protected` for onboarding gating. |
| Localization | i18next + react-i18next + expo-localization | Typed keys, device detection, English fallback, RTL-ready. |
| Local storage | `@react-native-async-storage/async-storage` | Non-sensitive app state only. Auth tokens will go in `expo-secure-store`. |
| Graphics | `react-native-svg`, `expo-linear-gradient` | Prime Score ring and charts are hand-built (no chart library). |
| Animation | `react-native-reanimated` | Gentle entering animations and progress transitions. |
| Fonts | Fraunces (display, Latin scripts) + system font (body) | Non-Latin scripts fall back to the system font automatically. |
| Backend (planned) | Supabase (Auth + Postgres + Edge Functions) | Not connected yet. Needs your confirmation before setup. |
| AI coach (planned) | Claude API via a Supabase Edge Function | The API key lives only on the server. |
| Subscriptions (planned) | RevenueCat | Behind an `EntitlementService` interface. Needs a development build. |
| Builds | EAS Build | `eas.json` will be added when we prepare the first build. |

Dependencies are deliberately few. Each one above is either an Expo-maintained
module or a de-facto standard (i18next).

## 2. Folder structure

```
src/
  app/                     Routes only (Expo Router). Thin screens that compose features.
    _layout.tsx            Root: fonts, providers, onboarding guard
    (onboarding)/          Welcome → language → about you → focus → goals → rhythm → ready
    (tabs)/                Home · Today · Journey · Progress · Profile
    settings.tsx, language.tsx, reflection.tsx, edit-profile.tsx, goals.tsx, prime-score.tsx
  components/
    ui/                    Design-system primitives (Text, Button, Card, Screen, Chip, ProgressRing, …)
    home/ tasks/ journey/ progress/ onboarding/ settings/   Feature components
  theme/                   Design tokens: colors, typography, spacing, radii, shadows
  i18n/
    index.ts               i18next init + language change + RTL handling
    languages.ts           Language registry (code, native name, direction, script)
    locales/{en,de,tr}.json
  domain/                  Pure business logic, no React, fully unit-tested
    types.ts               Profile, Goal, DailyLog, Reflection, …
    catalog.ts             Goal catalogue per pillar (ids + i18n keys, no text)
    primeScore.ts          Prime Score calculation
    journey.ts             90-Day Comeback Journey model
    dates.ts               Local-date helpers
  data/
    repository.ts          `AppRepository` interface — the database boundary
    localRepository.ts     AsyncStorage implementation (prototype)
    demoSeed.ts            Realistic sample history for the prototype
  state/
    AppStateProvider.tsx   App state + actions; the only place UI talks to the repository
  services/
    coach/                 `CoachService` interface + local implementation (future: Claude via Edge Function)
    subscriptions/         `EntitlementService` interface + free-tier implementation (future: RevenueCat)
  config/
    env.ts                 Reads public `EXPO_PUBLIC_*` values only
```

### Boundaries

```
 UI (app/, components/)
        │  hooks: useAppState(), useTranslation()
        ▼
 State (state/AppStateProvider)        ← pure logic from domain/
        │  AppRepository interface
        ▼
 Data (data/localRepository  →  later data/supabaseRepository)
```

- Screens never import storage or network code directly.
- `domain/` has no React or platform imports, so the Prime Score and journey logic are easy to test and could later run on the server too.
- Swapping AsyncStorage for Supabase means adding one `AppRepository` implementation; the screens stay the same.

## 3. Localization

- **Never hardcode user-facing text.** All strings live in `src/i18n/locales/*.json`. Keys are type-checked: a typo in `t('home.greeting')` fails `npm run typecheck`.
- **Detection:** the first launch reads the device locales (`expo-localization`) and picks the first supported language; English is the fallback.
- **User choice:** the language can be changed during onboarding and in Settings. The choice is persisted and wins over the device language.
- **Parity test:** `npm test` fails if German or Turkish are missing a key that English has (or have extra keys), or if `{{placeholders}}` differ.
- **Adding a language:** add `locales/xx.json` and one entry in `languages.ts`. Nothing else changes.
- **RTL:** each language declares `dir: 'ltr' | 'rtl'`. Switching between directions calls `I18nManager.forceRTL` and asks for an app restart (a React Native requirement). Components use logical styles (`marginStart`, `paddingEnd`, `start`/`end`) and direction-aware icons so they mirror correctly.
- **Fonts per script:** the display serif is used only for Latin scripts; other scripts get the system font, which has full glyph coverage.
- **Marketing copy** (store listing, website) is kept outside the app bundle and is primarily English, independent of the app language.

## 4. Prime Score

The Prime Score (0–100) shows **how consistently you followed through on the goals you chose** over the last 7 days. It is not a measure of health, fitness, or personal worth, and the app says so wherever the score is explained.

```
score = completed check-ins / planned check-ins   (rolling 7 days, since start date)
```

- Each active goal plans one check-in per day.
- Days before the user started are not counted, so new users are not penalised.
- A per-pillar breakdown (Body / Mind / Life) uses the same formula.
- Labels are encouraging at every level ("Finding your rhythm", "Building momentum", "In your prime zone"). There are no streak resets or "you failed" messages.

## 5. 90-Day Comeback Journey

Three phases of 30 days: **Reset** (1–30), **Rebuild** (31–60), **Rise** (61–90). Each week has a theme, and milestones are celebrated at days 7, 30, 60 and 90. The current day comes from the user's start date. Missed days never lock content.

## 6. Security and privacy

- No secrets in the app. Only `EXPO_PUBLIC_*` values (Supabase URL and anon key, which are public by design) may be bundled.
- Claude API calls will go through a Supabase Edge Function that holds the key, checks the user's session, and enforces rate limits and entitlements.
- RevenueCat uses its public SDK key in the app; entitlement checks that matter are verified server-side via webhooks.
- Supabase tables will use Row Level Security so users can only read and write their own rows (`auth.uid() = user_id`).
- Auth sessions will be stored in `expo-secure-store` (Keychain / Keystore), not AsyncStorage.
- Reflections are personal. They stay on the device in the prototype, and will never be sent to the AI coach without explicit consent.

## 7. Planned database shape (Supabase, not created yet)

```
profiles     (id = auth.users.id, display_name, language, start_date, daily_minutes, created_at)
user_goals   (id, user_id, goal_id, pillar, active, created_at)
daily_logs   (user_id, date, goal_id, completed_at)   PK (user_id, date, goal_id)
reflections  (id, user_id, date, mood, prompt_key, body, created_at)
```

All tables get RLS policies scoped to `auth.uid()`.

## 8. Milestones

1. **Architecture + first prototype (this milestone):** design system, navigation, localization (EN/DE/TR), onboarding, Home with Prime Score, Today, Journey, Progress and reflections, Profile, Settings, language picker. Local mock data. Runs in Expo Go.
2. **Polish and QA:** device testing feedback, accessibility pass (VoiceOver/TalkBack), animation tuning, licensed photography bundled.
3. **Supabase (needs confirmation):** auth (email + Apple/Google), `supabaseRepository`, migrations with RLS.
4. **AI coach (needs confirmation):** Edge Function proxy to Claude, consent flow, rate limits.
5. **Subscriptions (needs confirmation):** RevenueCat, paywall, development build.
6. **EAS Build and store preparation (needs confirmation).**
