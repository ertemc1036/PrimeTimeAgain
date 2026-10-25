# MINUS 30 backend setup

The app is local-first and works without any backend. This guide connects the optional cloud
pieces. Nothing here is deployed or activated by the repository itself.

## 1. Supabase project

1. Create a Supabase project.
2. Apply the schema: `supabase db push` (or run `supabase/migrations/20261025000000_minus30_init.sql`).
   - Every user table has row-level security: users can only access their own rows.
   - `entitlements` is readable by its owner and written only by the RevenueCat webhook.
   - `ai_usage` is service-role only (rate limiting, no content stored).
   - Buckets `progress-photos` and `workout-photos` are **private**; files must sit under
     `<user id>/…`. No public URLs.
3. Add to `.env` (public values only):
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. Enable email sign-in in Supabase Auth. Sessions are stored in the device keychain/keystore.

## 2. Edge Functions

| Function | Purpose | Auth |
| --- | --- | --- |
| `food-scan` | Meal photo → editable nutrition estimate (structured output, zod-validated) | Signed in + Pro + daily limit |
| `workout-photo` | Classifies the photo setting: gym / outdoor / home / unclear / other | Signed in + Pro + daily limit |
| `coach` | Safe wellness coaching chat (no medical advice, no unsafe diets) | Signed in + Pro + daily limit |
| `revenuecat-webhook` | Writes `entitlements` from verified RevenueCat events | `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>` |
| `delete-account` | Deletes the caller's files and account (rows cascade) | Signed in |

```bash
supabase secrets set ANTHROPIC_API_KEY=... REVENUECAT_WEBHOOK_SECRET=...
supabase functions deploy food-scan workout-photo coach delete-account
supabase functions deploy revenuecat-webhook --no-verify-jwt
```

- Model: `claude-opus-5-5` with server-side refusal fallback enabled (`fallbacks: "default"`).
- Output shapes in `supabase/functions/_shared/schemas.ts` must stay identical to
  `src/domain/aiSchemas.ts` (a Jest test enforces this).
- Photos are downscaled and re-encoded on the device first, which drops EXIF/GPS metadata. The
  functions don't store images or chat text.
- Type-check locally with `deno check supabase/functions/*/index.ts`.

## 3. Subscriptions (RevenueCat)

1. Create products `minus30_pro_monthly` and `minus30_pro_yearly` in App Store Connect and Google
   Play, and an entitlement `pro` in RevenueCat.
2. `npx expo install react-native-purchases`, then build a development build
   (`eas build --profile development`); purchases don't work in Expo Go.
3. Configure RevenueCat with the Supabase user id as the app user id, set
   `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`, and replace the `FREE` entitlement in
   `src/state/ProProvider.tsx` with RevenueCat customer info (`fromRevenueCat` in
   `src/services/subscriptions/entitlements.ts` already maps it, including grace periods).
4. Point the RevenueCat webhook at `revenuecat-webhook` with the shared secret header.

The server never trusts the app for Pro: AI functions read `entitlements` themselves.

## 4. Before release

- Replace placeholder prices with store prices, and the legal summaries with reviewed texts
  (`EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL`).
- Set real bundle identifiers in `app.json` (currently `com.minus30.app` placeholders).
- Cloud sync of local data is not implemented yet: the schema mirrors the local model, and the
  repository interface (`src/data/repository.ts`) is the place to add a syncing implementation.
