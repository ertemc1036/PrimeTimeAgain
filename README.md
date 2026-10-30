# Diet9

> Formerly MINUS 30. The visible name is Diet9; bundle ID (`com.minus30.app`), slug, product IDs and the Instagram handle are unchanged for now.

> **Plan Tomorrow. Complete Today.** — Your Transformation Journey.

A health and fitness app for adults (18+) on iOS and Android. The daily loop is
**Plan → Do → Log → Complete → Repeat**: plan tomorrow's meals and activity, log what you eat,
log a workout or take a Rest Day, and watch the Today checklist and streak calendar fill in.

Expo SDK 58 · React Native 0.88 · TypeScript · Expo Router · Inter · i18next · zod.

**Languages:** English, Deutsch, Türkçe, Español, Français. The app starts in the phone's language when it is one of these (otherwise English) and can be changed any time: globe button on the Welcome screen, or Profile → Language. Built-in food names and serving sizes are translated too and can be searched in the app language or in English. Instagram: [@minus30.app](https://www.instagram.com/minus30.app/) (Profile → Information).
Optional backend: Supabase (Postgres + RLS, private storage, Edge Functions with Claude for Pro AI).

## Run it

```bash
npm install
npm start          # scan the QR code with Expo Go (iOS / Android)
npm run web        # or run in a browser
```

Everything in the free tier works fully offline with no configuration. Data is stored on the device.

**Testing on an iPhone:** step-by-step guide and test checklist in [`docs/IPHONE_TESTING.md`](docs/IPHONE_TESTING.md).

## What's in the app

| Area | Free | Pro |
| --- | --- | --- |
| Onboarding | Profile, 18+ confirmation, goals (unsafe goal weights are blocked), activity and food preferences, planning time, reminders | — |
| Today | Interactive 3D body avatar (male / female / neutral, turn, zoom, scan rings) with real start / current / goal weight and streak — see [`docs/AVATAR.md`](docs/AVATAR.md); greeting, streak card, mission ring, 3 automatic cards (Food Logged / Activity Completed / Tomorrow Planned), monthly streak calendar with day breakdown | Floating AI Coach button |
| Plan | Any of the next 7 days (defaults to tomorrow); meals with food search, custom foods, favorites, copy a previous day, "keep meals flexible"; Gym / Outdoor / Home / Rest Day with time and duration | Plan With AI (via the coach) |
| Food | Planned vs logged meals, "Log This Meal", manual Add Food, estimated kcal/protein/carbs/fat (missing estimates are shown as missing, never as zero), Finish / reopen food log, yesterday's late entries | Scan With AI |
| Workout | Planned activity, 4 cards, validated manual log (quick durations, recent descriptions, duplicate protection), Rest Day without photo | Photo check-in (setting only, never proof) |
| Journey | Streaks, completed days, workouts, recovery days, meals, food consistency, optional weight with chart, optional 7-month journey and Maintenance Mode, milestones, private progress photos | — |
| Settings | Health preferences, Discipline Mode reminders (Light / Smart / Focused / Hourly, quiet hours, pause), eating window (informational only), export and delete data, legal/help, account and cloud sync (when Supabase is configured) | — |

### Daily completion rule

A day is complete when **all three** are true:

1. **Food:** at least one meal is logged *and* the food log is finished.
2. **Activity:** a workout *or* a Rest Day is saved.
3. **Planning:** the next day's plan is saved with meals (or "flexible") and an activity (or Rest Day).

Dates are local calendar dates, so time zones and daylight-saving changes never split a day.
Late entries for yesterday are allowed until the end of today; older days are read-only.
Pro gives no extra streak credit. The rules live in [`src/domain/completion.ts`](src/domain/completion.ts).

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` / `npm run web` | Expo dev server |
| `npm run typecheck` | TypeScript (strict, typed routes, typed translation keys) |
| `npm run lint` | ESLint (Expo config + React Compiler rules) |
| `npm run test:server` | Points to the Deno backend tests (they need a local Postgres, Supabase Auth and Deno; see `supabase/tests/README.md`) |
| `npm run release-check` | Lists release-blocking configuration that is still missing |
| `npm test` | Jest: translation completeness for every language, translated food search, completion rules, streaks, DST/year boundaries, grace window, validation, duplicates, reminders, goal-weight safety, photo assessment, entitlements, persistence, AI schema mirror |

## Project layout

```
src/app/          Expo Router screens (onboarding group, 5 tabs, modals, settings)
src/components/ui Monochrome design system (Button, Card, TextField, TimeField, …)
src/features/     Feature components (calendar, food items editor, chart, …)
src/domain/       Pure business logic + tests (no React)
src/data/         Local repository (AsyncStorage, one key per collection)
src/state/        App state, auth, sync and Pro providers
src/sync/         Sync engine, protocol, cloud transport, photo upload
src/services/     Notifications, photos (EXIF stripped), AI client, Supabase, export
supabase/         SQL migration (RLS, private buckets), Edge Functions, local tests
```

More: [`docs/BACKEND.md`](docs/BACKEND.md) (setup for accounts, AI and subscriptions).

## Accounts, sync and Pro

- **Accounts and cloud sync** (Supabase): optional. Sign in with Apple (iOS) or email; sign up,
  sign in, password reset with an emailed code, backup and sync across devices (offline queue, deterministic conflicts, no
  duplicates), merging local data on first sign-in, cloud export and account deletion. Needs a
  Supabase project with the migration and Edge Functions deployed. See
  [`docs/BACKEND.md`](docs/BACKEND.md).
- **AI** (Scan With AI, photo check-in, AI Coach): runs only in Edge Functions with the
  `OPENAI_API_KEY` secret (OpenAI Responses API, default model `gpt-5.4-mini`; Anthropic remains
  as an alternative). The key never ships in the app. Without it, the app says the feature isn't
  set up. Scan results show confidence and are saved only after the user checks them.
- **Founders Edition:** the first 1,000 verified accounts get Pro free for good (stored founder seat,
  live counter on the paywall). **Subscriptions** (RevenueCat): Diet9 Duo €4.99 per month
  (provisional) from account 1,001; the friend seat is planned. See
  [`docs/SUBSCRIPTIONS.md`](docs/SUBSCRIPTIONS.md). Developer test access is a
  server-side allowlist (`PRO_TESTERS`). Pro on the server
  comes only from verified RevenueCat data. Purchases need a development or store build, not
  Expo Go. A developer-only "Pro preview" toggle exists in development builds; it grants no
  server access.
- **Reminders** are local notifications. They work in iOS/Android builds, not on web.

Live setup on your Mac (Supabase + real AI scanner): [`docs/LIVE_SETUP.md`](docs/LIVE_SETUP.md).

Release steps and what still needs the owner (accounts, keys, legal review, store setup):
[`docs/RELEASE.md`](docs/RELEASE.md). Run `npm run release-check` to see the in-repo gaps.

Legal texts in the app are marked "pending legal approval" and must be replaced by reviewed
documents before release. No claim of GDPR or other regulatory compliance is made.
