# PrimeTimeAgain — Architecture (V2)

> **YOUR PRIME ISN'T OVER.** Define your Prime. Build your Plan. Complete your Missions. Track your Comeback.

V2 replaces the v1 wellness prototype (tagged `v0.1-wellness-prototype`) with a personal comeback
platform: a black & white "mission control" design, an interactive 3D avatar, personalised goals and
missions, Prime Streak, Prime Calendar, Prime Journey and Prime Evolution.

## 1. Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | Expo SDK 58, React Native 0.88, React 19, TypeScript strict | Runs in **Expo Go** (no custom native code). |
| Navigation | Expo Router | Native `Stack` + `expo-router/js-tabs`; `Stack.Protected` gates onboarding. |
| 3D | `three` 0.186 on `expo-gl` | Rigged glTF characters, skinning, idle animation, touch orbit/zoom. See `docs/AVATAR_3D.md`. |
| Gestures | react-native-gesture-handler v3 hooks | `usePanGesture` / `usePinchGesture` / `useTapGesture`. |
| Localisation | i18next + react-i18next + expo-localization | Typed keys; EN/DE/TR complete; RTL-ready registry. |
| Storage | AsyncStorage (+ app documents folder for photos) | Behind `AppRepository`. Supabase planned. |
| Graphics | react-native-svg, Reanimated 4 | Rings, charts, micro-animations. |

## 2. Folder structure

```
src/
  app/                      Routes only (Expo Router)
    (onboarding)/           welcome → how → define → remember → starting-point → duration → time → create-avatar → ready
    (tabs)/                 control · missions · journey · evolution · profile
    area/[id]  goal/[id]  goal-edit/[id]  mission/[id]  add-mission  day-summary
    calendar  coach  avatar-studio  goals  plan  settings  language  reflection  measurement  edit-name  pro
  avatar/                   3D system: presets, loaders, stage (lights/floor/camera), AvatarViewer
  components/
    ui/                     Design-system primitives (AppText, Button, Card, Screen, SelectCard, Chip, Stepper, …)
    onboarding/ control/ missions/ calendar/ evolution/ plan/ avatar/ settings/
  domain/                   Pure logic, no React — fully unit tested
    types.ts                Data model (AppData v2)
    catalog.ts              19 goal templates, ~60 actions (ids only; text in i18n)
    plan.ts                 Onboarding → initial plan
    missions.ts             Daily mission generation, replacement
    days.ts                 Day types, Prime Streak, recovery rules, history protection
    program.ts              Durations, phases, weekly themes, milestones
    progress.ts             Goal/area/overall follow-through, weekly tallies, totals
    mutations.ts            Every change as a typed Mutation + pure reducer
    coach.ts                On-device coach preview (rules)
    achievements.ts         Effort-based achievements
  data/                     AppRepository interface, local implementation, demo seed
  state/                    AppStateProvider (dispatch), selectors
  services/                 coach (AI boundary), subscriptions (RevenueCat boundary), photos (private files)
  i18n/                     init, registry, locales/{en,de,tr}.json, content resolvers, upper-casing
  theme/                    Tokens + light/dark ThemeProvider
scripts/avatars/            Reproducible Rocketbox → GLB pipeline (dev tool, not shipped)
assets/avatars/             Generated avatar models, textures, animations (+ MIT licence)
```

## 3. Data flow

```
Screen ──dispatch(Mutation)──▶ AppStateProvider ──applyMutation (pure)──▶ new AppData ──▶ UI (optimistic)
                                      │
                                      └──repository.commit(mutation, next)──▶ LocalRepository (AsyncStorage)
                                                                         └──▶ SupabaseRepository (planned: mutation → row writes)
```

- **One reducer** for UI and storage, so behaviour is identical offline and (later) online.
- **History protection** is enforced in the reducer: mission changes are only accepted for today;
  recovery days only for today/future.
- Today's missions are generated once per day (when the app is first opened that day) and stored,
  so later plan edits never rewrite history.

## 4. Core rules (single source: `src/domain`)

**Missions.** Generated from active goal actions, rotating goals so each gets attention across the
week, keeping total minutes within the user's daily time (carried-over missions count), max
`round(minutes/15)+1` (2–6) core missions, gentler actions for the first two weeks and for low
starting activity. Users can complete, replace, postpone (to tomorrow), skip, adjust duration or add.

**Day types.** Prime (all planned core missions done) · Active (some done) · Recovery (planned rest,
max 2 per Monday-based week) · Open (today, nothing yet; never counts against you) · Missed (past day
with nothing done). Postponed missions don't count for the day they left; skipped ones do.

**Prime Streak.** Consecutive days with Prime, Active or Recovery. A missed day resets the current
streak; totals and the longest streak are never lost.

**Progress %.** Follow-through on planned missions over the last 14 days (per goal, per area,
overall). It measures the user's actions, never body, income or worth. Today's open missions are
excluded.

**Program.** 30/60/90/180/custom (14–365) days, three phases (Reset, Rebuild, Prime) of equal thirds,
13 weekly themes spread over any length, milestones at day 1, 7, each phase end and the finish.
Duration and daily time can be changed at any time without resetting history.

## 5. Localisation

- English is the default and fallback; device language detected on first launch; changeable anytime.
- EN, DE, TR are complete and parity-tested (`src/i18n/translations.test.ts`, `src/domain/catalog.test.ts`).
- `PLANNED_LANGUAGES` lists es/fr/pt/it/ar/hi/ja/ko/zh/id; none is shown until fully translated.
- RTL: languages declare `dir`; switching direction calls `I18nManager.forceRTL` (restart required);
  components use logical `start`/`end` styles and mirror directional icons.
- Upper-casing is done in JS (`i18n/upper.ts`) so Turkish i/İ are correct.
- Brand name and the tagline `YOUR PRIME ISN'T OVER.` stay English (`config/brand.ts`). The
  "WELCOME BACK." hero is also English in every language, matching the brand mockups; change the
  `welcome.headline` key per locale to translate it.

## 6. Security & privacy

- No secrets in the client. Only `EXPO_PUBLIC_*` (public) values may be bundled.
- Data stays on the device in this version. Progress photos are copied into the app's private
  documents folder and never uploaded.
- AI coach (planned) runs server-side; reflections are only shared with explicit consent
  (`preferences.coachUsesReflections`, off by default).
- Supabase (planned) with Row Level Security on every table — see `docs/supabase/schema.sql` (draft,
  not applied).
- Export (share JSON) and delete-all are available in Settings.

## 7. Integration boundaries (prepared, not connected)

| Boundary | File | Needs approval for |
| --- | --- | --- |
| Persistence | `src/data/repository.ts` | Supabase project, auth, migrations |
| AI Coach | `src/services/coach/CoachService.ts` | Claude API via Supabase Edge Function |
| Subscriptions | `src/services/subscriptions/EntitlementService.ts` | RevenueCat (needs a development build) |
| Selfie avatars | `docs/AVATAR_3D.md` §5 | A third-party service + consent flow |
