# MINUS 30 — release plan and blockers

Nothing in this repository deploys, charges or submits anything by itself. Every step below that
touches a live service, money or a store needs the owner's explicit go-ahead.

`npm run release-check` lists the in-repo items and exits with an error while any is missing.

## Blockers (owner action needed)

| # | Blocker | What to do | Unblocks |
| --- | --- | --- | --- |
| 1 | **Supabase project** | Create a project (EU region recommended for EU users). Run `supabase link`, `supabase db push`, deploy the functions and set the secrets (see [BACKEND.md](BACKEND.md)). Put the URL and anon key in EAS environment variables. | Accounts, cloud sync, export, deletion, all AI |
| 2 | **Auth emails** | In Supabase Auth: set the "Confirm signup" and "Reset password" templates to the files in `supabase/templates/` (they show the 6-digit `{{ .Token }}` code). Configure a custom SMTP sender. Decide whether email confirmation is required. | Sign-up confirmation, password reset |
| 3 | **OpenAI API key** | Create a project key at platform.openai.com with a monthly budget limit and run `supabase secrets set OPENAI_API_KEY=…` (optionally `OPENAI_MODEL`, `AI_GLOBAL_DAILY_LIMIT`, see [BACKEND.md](BACKEND.md#ai-provider)). Never put it in the app or in `EXPO_PUBLIC_*`. Then run the budgeted live test (`scripts/ai/live-scan-test.mjs`, max $0.20, needs `--confirm-paid`). | Food scan, workout photo check-in, AI Coach |
| 4 | **Apple Developer + App Store Connect** | Enrol, accept the Paid Apps agreement, add tax and bank details, and create the app with bundle ID `com.minus30.app` (or change it in `app.json`). Create the subscription group "MINUS 30 Pro" with `minus30_pro_monthly` (€4.99 per month, provisional; see [SUBSCRIPTIONS.md](SUBSCRIPTIONS.md)). | iOS builds, TestFlight, purchases |
| 5 | **Google Play Console** | Create the app `com.minus30.app` and the payments profile, then create the same two subscriptions. Upload a first build manually (required before the API can be used). | Android builds, purchases |
| 6 | **RevenueCat** | Create the project, connect both stores, and add the entitlement `pro` plus an offering with the MONTHLY and ANNUAL packages. Set `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY` (public SDK keys). On Supabase, set the secrets `REVENUECAT_SECRET_KEY` (REST v1 secret) and `REVENUECAT_WEBHOOK_SECRET`, then point the webhook at `…/functions/v1/revenuecat-webhook` with header `Authorization: Bearer <secret>`. | Paid Pro, restore, cross-device Pro |
| 7 | **Legal review** | Have a qualified reviewer write or approve the privacy policy, terms (including the subscription terms), and health-data consent wording. Check age gating (18+), the data processing agreements (Supabase, OpenAI, RevenueCat, Expo) and international data transfers. Publish the documents and set `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL` and `EXPO_PUBLIC_SUPPORT_EMAIL`. The in-app texts are marked "pending legal approval" until then. | Store submission |
| 8 | **EAS** | Run `bunx`/`npx eas-cli@latest init` (this writes `extra.eas.projectId`), then `eas credentials`. Add the EXPO_PUBLIC_* variables to the EAS environments (development / preview / production). | Builds |
| 9 | **Real-device QA** | Run the checklist in [IPHONE_TESTING.md](IPHONE_TESTING.md) on a development build on at least one iPhone and one Android phone. Cover sandbox purchases, restore, notifications, camera and photos, and offline then online sync. | Release confidence |
| 10 | **Store listings** | Screenshots, description, App Privacy "nutrition label" / Data safety form (health and fitness data, photos, email, purchase history; no tracking, no ads), age rating, and sign-in details for App Review. | Submission |
| 11 | **Data retention jobs** | Schedule `select public.purge_ai_usage();` daily (pg_cron) in the Supabase project. | Usage-log retention (30 days) |
| 12 | **Pro test accounts** | Keep `PRO_TESTERS` limited to your own and App Review test accounts. Test access is server-side only and shows as "Pro · Test access" in the app. | Testing Pro without purchases |
| 13 | **Founders Edition and friend seat** | Apply the founder migration (`20261030000000_founder_seats.sql`, see [LIVE_SETUP.md](LIVE_SETUP.md)) and turn on "Confirm email" in Supabase Auth. Describe the free founder seats in the App Review notes. Decide the Duo friend-seat model and confirm it with App Review before building it ([SUBSCRIPTIONS.md](SUBSCRIPTIONS.md)). | Free Pro for the first 1,000 accounts |
| 14 | **Sign in with Apple** | Enable the capability for `com.minus30.app`, set the Apple provider in Supabase (client ID `com.minus30.app`; remove `host.exp.Exponent` after Expo Go testing), Magic Link template with code. **Before the App Store release:** Apple requires apps with Sign in with Apple to revoke the user's Apple tokens when an account is deleted (REST API `auth/revoke`, needs a Sign in with Apple key). `delete-account` doesn't do that yet. | Apple login, App Review |

## Builds

| Profile | Use | Command |
| --- | --- | --- |
| `development` | Dev client on a phone (needed for purchases and native modules not in Expo Go) | `npx eas-cli@latest build --profile development --platform ios` |
| `development-simulator` | iOS Simulator dev client | `npx eas-cli@latest build --profile development-simulator --platform ios` |
| `preview` | Internal testing (Android APK, iOS ad hoc) | `npx eas-cli@latest build --profile preview` |
| `production` | Store builds; build numbers are incremented remotely | `npx eas-cli@latest build --profile production` |

- App version: `1.0.0` (`app.json`). Build numbers are managed by EAS (`appVersionSource: remote`).
- Bundle ID / package: `com.minus30.app` (iOS and Android). Change it before the first upload if
  you want a different identifier. It cannot be changed after release.
- Icon and splash come from the MINUS 30 logo (`assets/images/`). The splash background is black.
- iOS `ITSAppUsesNonExemptEncryption: false` (standard HTTPS only); a privacy manifest is included.
- Android blocks `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW` (not used).

### Expo Go vs. development build

Expo Go runs everything except **in-app purchases**: there, RevenueCat runs in "browser mode" and
the paywall says purchases need the installed app. Use a development build for subscriptions.
Notifications also behave more reliably in a development build. The web build is for testing only.

## Submission (only after explicit approval)

1. All blockers above resolved; `npm run release-check` passes.
2. `eas build --profile production` for both platforms.
3. TestFlight / Play internal testing with sandbox purchases; check restore and cancellation.
4. `eas submit` (App Store Connect, then Play). **Do not run without the owner's approval.**
5. Switch RevenueCat and the stores from sandbox to live only after approval.

## Over-the-air updates

`eas update` can ship JavaScript-only fixes to builds that use the same runtime version. Native
changes (new modules, permissions, `app.json` native config) need a new store build.
