# Testing MINUS 30 on an iPhone

MINUS 30 runs in **Expo Go**. No development build, Apple Developer account or Xcode is needed for
the free app, accounts, sync and the AI features. Every native module it uses ships inside Expo Go
for SDK 58, except **in-app purchases**: in Expo Go, RevenueCat runs in a preview mode and the
paywall says purchases need the installed app. Testing subscriptions requires a development build
(`npx eas-cli@latest build --profile development --platform ios`, Apple Developer account needed).

Accounts and sync need a Supabase project. Set `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` before `npx expo start` (see docs/BACKEND.md). Without
them, the app runs local-only and says so.

## What you need

- An iPhone with **Expo Go** from the App Store (it must support **SDK 58**).
- A Mac or Windows/Linux computer with **Node.js 20 LTS or newer** and **git**.
- The iPhone and the computer on the **same Wi-Fi** (or use tunnel mode, step 5).

## Steps

1. **Get the code** on your computer:
   ```bash
   git clone https://github.com/ertemc1036/PrimeTimeAgain.git minus30
   cd minus30
   git checkout claude/bold-davinci-oohypi
   ```
2. **Install dependencies** (exact versions come from `package-lock.json`):
   ```bash
   npm ci
   ```
3. **Start the dev server:**
   ```bash
   npx expo start
   ```
   A QR code appears in the terminal. Leave the terminal open.
4. **Open on the iPhone:** open the iPhone **Camera** app, point it at the QR code and tap the
   "Open in Expo Go" banner. The first load takes about 30–60 seconds while the JavaScript bundle
   is built.
5. **If the phone can't connect** (different networks, office/hotel Wi-Fi, VPN), stop the server
   with `Ctrl+C` and use tunnel mode:
   ```bash
   npm run start:tunnel
   ```
   Accept the prompt to install `@expo/ngrok`, then scan the new QR code.
6. **Start over at any time:** in the app, Profile (top right on Today) → Privacy and data →
   **Delete all data**. Or delete and reinstall Expo Go.

### Troubleshooting

| Message | What to do |
| --- | --- |
| "Project is incompatible with this version of Expo Go" | Expo Go from the App Store supports one SDK at a time. If it no longer supports SDK 58, you need a development build instead (`npx eas-cli@latest build --profile development --platform ios`, which requires an Apple Developer account). |
| "Could not connect to development server" | Use tunnel mode (step 5), or turn off VPN and check both devices are on the same Wi-Fi. |
| Red error screen after editing code | Press `r` in the terminal to reload. |
| Stuck on the white splash screen | Shake the phone → Reload. Then `npx expo start --clear`. |

## Test checklist

Work through these in order with a fresh install.

**Onboarding**
- [ ] Welcome screen is black with a white status bar; Get Started works.
- [ ] Continuing without a name shows an inline error; the 18+ box must be ticked (otherwise the adults-only screen).
- [ ] Goals: choose "Manage my weight" and enter a very low goal weight → a safety message blocks it.
- [ ] Notifications step: "Turn on reminders" shows the iOS permission prompt.
- [ ] "Start My Journey" opens Today.

**Today**
- [ ] Greeting matches the time of day; streak card, 0/3 mission ring, three cards, calendar below.
- [ ] Tapping a calendar day shows its Food / Workout-Rest / Next-day-planned breakdown.

**3D test first** (Profile → 3D test, or open `exp://<computer-ip>:8081/--/3d-test` in Safari while `npx expo start` runs)
- [ ] 1. Cube: a coloured cube rotates; the log shows "First frame drawn" and no red ✗.
- [ ] 2. Body model: a grey body turns slowly (male, female, neutral).
- [ ] 3. Touch: dragging changes "yaw", pinching changes "zoom".
- [ ] 4. Diet9 look: dark body with neon scan rings; Startform/Zielform switches the body.
- [ ] Note the fps value of each step. If something fails: "Share diagnostics" and send the text.

**3D avatar (Today)**
- [ ] The dark "DIET9 BODY SCAN" card shows a 3D body with moving scan rings; "Loading 3D avatar…" disappears within a few seconds.
- [ ] Drag sideways: the body turns 360° and keeps spinning a little after you let go. Swiping up/down still scrolls the page.
- [ ] Pinch zooms towards the upper body; double-tap (or the scan button) returns to the start view.
- [ ] Body button → Male / Female / Neutral: the body changes; the choice stays after force-quitting and (signed in) appears on a second device.
- [ ] "Startform | Zielform": one tap morphs the body smoothly; start is clearly fuller, goal clearly athletic. Man: sports shorts only; woman: sports pants + sports top.
- [ ] Start, current weight, change, goal with % ring and streak match Journey; add a weight → the card updates.
- [ ] Animation is smooth and the phone doesn't get hot after a minute on Today; switching to another tab stops the animation.
- [ ] Settings → Accessibility → Motion → Reduce Motion: slower scan, particles stand still, no spin after letting go.
- [ ] Profile → Licenses shows the MakeHuman CC0 notice.

**Daily loop** (Today must update by itself after each step)
- [ ] Food → Add Food → search "oat" → add → Save Meal. Then **Finish Today's Food Log** → Today shows **Food Logged**, 1/3.
- [ ] Workout → Gym → Log Workout → pick 45 min, type a description → Save → Today shows **Activity Completed**, 2/3.
- [ ] Plan → Tomorrow → add a meal (or "Keep meals flexible") → choose an activity → Save Tomorrow's Plan → Today shows **Tomorrow Planned**, 3/3, "1 Day Streak", today's calendar dot turns black.
- [ ] Next day: choose **Rest Day** → Save Rest Day (no photo needed) → counts as activity.
- [ ] Skip a day → current streak resets; "Longest" and Journey totals stay.

**iOS-specific**
- [ ] Modal sheets (Add Food, Log Workout, Plan meal, Add Weight, Pro) have no big empty gap at the top and can be swiped down to close.
- [ ] Typing in a form: the Save button stays visible above the keyboard; dragging the form down dismisses the number pad.
- [ ] Swipe-back from the left edge works on Profile, settings and history screens.
- [ ] Nothing is hidden behind the notch, Dynamic Island or home indicator; the tab bar sits above the home indicator.
- [ ] Inter font is used everywhere (not the iOS system font).
- [ ] Haptic tick when choosing options.
- [ ] Force-quit Expo Go and reopen: all data is still there.
- [ ] Leave the app open past midnight (or background it and return the next day): Today switches to the new day.
- [ ] Reminders: Profile → Discipline Mode → turn on, set planning time a few minutes ahead, lock the phone → a notification arrives; it doesn't arrive if tomorrow is already planned.
- [ ] Journey → Progress photos → Add Photo opens the photo library; the photo appears and can be deleted.
- [ ] Privacy and data → Export opens the iOS share sheet.

**Languages and branding**
- [ ] With the iPhone set to German, Turkish, Spanish or French, the app opens in that language; otherwise English.
- [ ] Welcome → globe button → pick a language: every screen switches immediately, including dates and the calendar.
- [ ] Profile → Language shows the current language; the choice is kept after force-quitting.
- [ ] In German, searching "Haferflocken" finds oats; English names ("oats") work too.
- [ ] Long German/French texts aren't cut off in cards, buttons and the tab bar.
- [ ] Welcome screen shows the MINUS 30 logo; Profile → Information → Instagram opens @minus30.app.
- [ ] App icon and black splash screen with the logo appear only in a development/production build (Expo Go shows its own icon and splash).

**Account and sync** (only with Supabase configured)
- [ ] Use the app without an account first, then Profile → Account → Create Account. "This device already has data" appears; Continue (merge) keeps everything.
- [ ] Delete Expo Go (or use a second phone), sign in → all days, meals, workouts, plans, weight and photos come back.
- [ ] Airplane mode: log a meal, then turn the network back on → it syncs (Account shows "Synced"); nothing appears twice.
- [ ] Forgot password → the 6-digit code arrives by email → new password works.
- [ ] Sign Out removes the data from this phone; signing in again restores it.
- [ ] Delete account → you can't sign in with it any more.

**Pro**
- [ ] Without Pro: the coach button, Scan With AI and Photo Check-In open the paywall.
- [ ] Expo Go: the paywall shows the provisional prices and says purchases need the installed app. No purchase is possible.
- [ ] Development build with RevenueCat sandbox: store prices are shown; buy, restore, cancel (Pro stays until the end of the period), and sign in on a second phone → Pro is there too.
- [ ] With Pro and the AI key set up: scan a meal → editable results → save → Today shows the meal; the coach answers word by word.

## What was verified without a phone

- Unit tests (Jest): completion rules, streaks, DST and year boundaries, late-entry window,
  validation, duplicates, reminders, goal-weight safety, persistence, the sync engine (offline
  queue, retries, conflicts, account switching), the coach context, entitlements, and
  translations in all 5 languages.
- Backend tests against a local Supabase stack (real Postgres + RLS, real Supabase Auth, the real
  Edge Functions; AI and RevenueCat replaced by mock servers): see `supabase/tests/README.md`.
- Browser walkthroughs at iPhone size, including two "phones" syncing through the local stack:
  merge on first sign-in, restore on a new device, sync both ways, sign-out, password reset with
  the emailed code, paywall, Pro via webhook unlocking the coach (mock AI), and account deletion.
- The iOS and Android JavaScript bundles build (`expo export`), and `expo prebuild` generates valid
  native projects (bundle ID, permissions, privacy manifest, localized permission texts).

The web build can't show native-only behaviour (keyboard, sheets, notifications, camera/photo
permissions, haptics, safe areas on a real notch), so those items above need the phone.
