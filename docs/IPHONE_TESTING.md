# Testing MINUS 30 on an iPhone

MINUS 30 runs in **Expo Go**. No development build, Apple Developer account or Xcode is needed for
the free app. Every native module it uses ships inside Expo Go for SDK 58, at the exact versions
Expo Go expects.

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

**Pro (expected to say "not available" in this build)**
- [ ] The floating coach button and the Scan With AI / Photo Check-In buttons open the paywall.
- [ ] Paywall "Continue" and "Restore Purchases" show "Subscriptions aren't available in this build yet". No purchase is made.

## What was verified without a phone

- Unit tests (46): completion rules, streaks, DST and year boundaries, late-entry window, validation, duplicates, reminders, goal-weight safety, persistence.
- Browser walkthroughs at iPhone size, including a 5-day scenario across the 25 Oct 2026 clock change: manual food and workout check-ins update Today, Rest Day counts, the streak grows to 2, a missed day resets it while longest/history stay, older entries lock.
- The iOS JavaScript bundle builds (`expo export --platform ios`), and all native modules match Expo Go SDK 58.

The web build can't show native-only behaviour (keyboard, sheets, notifications, camera/photo
permissions, haptics, safe areas on a real notch), so those items above need the phone.
