# MINUS 30

> **Plan Tomorrow. Complete Today.** — Your Transformation Journey.

A health and fitness app for adults (18+) on iOS and Android. The daily loop is
**Plan → Do → Log → Complete → Repeat**: plan tomorrow's meals and activity, log what you eat,
log a workout or take a Rest Day, and watch the Today checklist and streak calendar fill in.

Expo SDK 58 · React Native 0.88 · TypeScript · Expo Router · Inter · i18next (English) · zod.
Optional backend: Supabase (Postgres + RLS, private storage, Edge Functions with Claude for Pro AI).

## Run it

```bash
npm install
npm start          # scan the QR code with Expo Go (iOS / Android)
npm run web        # or run in a browser
```

Everything in the free tier works fully offline with no configuration. Data is stored on the device.

## What's in the app

| Area | Free | Pro |
| --- | --- | --- |
| Onboarding | Profile, 18+ confirmation, goals (unsafe goal weights are blocked), activity and food preferences, planning time, reminders | — |
| Today | Greeting, streak card, mission ring, 3 automatic cards (Food Logged / Activity Completed / Tomorrow Planned), monthly streak calendar with day breakdown | Floating AI Coach button |
| Plan | Any of the next 7 days (defaults to tomorrow); meals with food search, custom foods, favorites, copy a previous day, "keep meals flexible"; Gym / Outdoor / Home / Rest Day with time and duration | Plan With AI (via the coach) |
| Food | Planned vs logged meals, "Log This Meal", manual Add Food, estimated kcal/protein/carbs/fat (missing estimates are shown as missing, never as zero), Finish / reopen food log, yesterday's late entries | Scan With AI |
| Workout | Planned activity, 4 cards, validated manual log (quick durations, recent descriptions, duplicate protection), Rest Day without photo | Photo check-in (setting only, never proof) |
| Journey | Streaks, completed days, workouts, recovery days, meals, food consistency, optional weight with chart, optional 7-month journey and Maintenance Mode, milestones, private progress photos | — |
| Settings | Health preferences, Discipline Mode reminders (Light / Smart / Focused / Hourly, quiet hours, pause), eating window (informational only), export and delete data, legal/help | Account sign-in (when Supabase is configured) |

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
| `npm test` | Jest: completion rules, streaks, DST/year boundaries, grace window, validation, duplicates, reminders, goal-weight safety, photo assessment, entitlements, persistence, AI schema mirror |

## Project layout

```
src/app/          Expo Router screens (onboarding group, 5 tabs, modals, settings)
src/components/ui Monochrome design system (Button, Card, TextField, TimeField, …)
src/features/     Feature components (calendar, food items editor, chart, …)
src/domain/       Pure business logic + tests (no React)
src/data/         Local repository (AsyncStorage, one key per collection)
src/state/        App state provider, Pro entitlement, screen hand-off
src/services/     Notifications, photos (EXIF stripped), AI client, Supabase, export
supabase/         SQL migration (RLS, private buckets) and Edge Functions
```

More: [`docs/BACKEND.md`](docs/BACKEND.md) (setup for accounts, AI and subscriptions).

## Status of integrations

These are **built but not connected** in this repository. The app says so on screen instead of
pretending they work:

- **Supabase** (accounts, cloud AI): needs a project, the migration, the Edge Functions and the two
  public env vars. See `docs/BACKEND.md`.
- **AI features** (Scan With AI, photo check-in, AI Coach): need the Edge Functions deployed with an
  `ANTHROPIC_API_KEY` secret. The key never ships in the app.
- **Subscriptions**: the paywall shows placeholder prices (€5.99 / month, €39.99 / year). Purchasing
  needs RevenueCat (`react-native-purchases`), App Store / Google Play products and a development
  build. Pro status is granted only from the server-side `entitlements` table written by the
  RevenueCat webhook. A developer-only "Pro preview" toggle (development builds) opens Pro screens
  but grants no AI access.
- **Push reminders** are local notifications; they work in iOS/Android builds, not on web.

Legal texts in the app are preliminary summaries and must be reviewed before release. No claim of
GDPR or other regulatory compliance is made.
