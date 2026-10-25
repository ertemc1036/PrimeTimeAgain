# MINUS 30 backend setup

The app is local-first and fully usable without a backend. Supabase adds accounts, cloud backup
and sync across devices, cloud export and deletion, and the server side of AI and Pro. Nothing in
this repository deploys anything by itself; see [RELEASE.md](RELEASE.md) for the owner steps.

## Architecture

- **Auth:** Supabase email + password. Email confirmation and password reset use 6-digit codes
  (no deep links). Sessions are kept in the iOS Keychain / Android Keystore (`expo-secure-store`).
- **Data:** one table, `public.user_records`: one row per app record (`collection`, `id`, `data`,
  `deleted`, `updated_at`, `version`, `server_seq`). Row-level security allows each user only
  their own rows.
- **Sync** (`sync` function): the app keeps an outbox of local changes and pushes up to 500 per
  request. The server applies them with deterministic last-write-wins: the newer `updated_at` wins;
  on a tie, the higher content hash wins. Deletions are kept as tombstones. Every change gets a
  per-record result (`applied` / `stale` / `duplicate` / `invalid`). When the server copy wins, it
  is returned, so nothing is discarded silently. Pulls are paged by `server_seq` (1000 rows per
  page). A unique index stops the same workout being saved twice (same type, date, start time and
  duration) across devices.
- **Photos:** private buckets `progress-photos` and `workout-photos`. Files live under
  `<user id>/…` and are read through signed URLs that expire after 1 hour. There are no public
  URLs. Photos are re-encoded on the device first, which removes EXIF/GPS data.
- **Pro:** `entitlements` holds the verified RevenueCat state, written only by the server
  (webhook or RevenueCat REST refresh). Users can read only their own row. AI functions check it
  themselves; the app's own Pro flag never unlocks anything on the server.
- **AI usage limits:** `ai_usage` (service role only, no content stored) enforces per-minute and
  per-day limits atomically: food scan 6/min and 30/day, workout photo 6/min and 20/day, coach
  10/min and 60/day.

## Edge Functions

| Function | Purpose | Access |
| --- | --- | --- |
| `sync` | Push outbox changes, pull changes since a cursor, return the current entitlement | Signed in |
| `export` | All cloud records of the caller as JSON (data portability) | Signed in |
| `entitlement` | Re-check Pro with RevenueCat (after a purchase or restore) | Signed in |
| `food-scan` | Meal photo → editable nutrition estimate (structured output, validated) | Signed in + Pro + limits |
| `workout-photo` | Photo setting: gym / outdoor / home / unclear (never proof of exercise) | Signed in + Pro + limits |
| `coach` | Safe wellness coaching, streamed (SSE). No medical advice or unsafe diets | Signed in + Pro + limits |
| `revenuecat-webhook` | Updates `entitlements` from RevenueCat events | `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>` |
| `delete-account` | Deletes the caller's photos, records and account | Signed in |

The functions talk to Postgres directly (`SUPABASE_DB_URL`, provided by Supabase). Per request,
they set the caller as `authenticated` with their JWT claims, so row-level security applies inside
the functions as well.

AI: model `claude-opus-5-5` with server-side fallback (`fallbacks: "default"`) and structured
JSON outputs. Without `ANTHROPIC_API_KEY`, the AI functions answer `503 not_configured` and the
app says so; it never makes up results. The output shapes in
`supabase/functions/_shared/schemas.ts` must match `src/domain/aiSchemas.ts`; a Jest test checks
this.

## Deploy (owner, after approval)

```bash
supabase link --project-ref <ref>
supabase db push                                   # supabase/migrations/20261026000000_minus30_init.sql
supabase secrets set ANTHROPIC_API_KEY=… REVENUECAT_SECRET_KEY=… REVENUECAT_WEBHOOK_SECRET=…
supabase functions deploy sync export entitlement food-scan workout-photo coach delete-account
supabase functions deploy revenuecat-webhook --no-verify-jwt
```

- **Auth → Email templates:** use `supabase/templates/confirmation.html` (Confirm signup) and
  `supabase/templates/recovery.html` (Reset password). Both show `{{ .Token }}`.
- **Auth → Providers → Email:** minimum password length 8. Turn on "Confirm email" if you want
  verified addresses; the app handles both settings.
- **Scheduled job:** `select cron.schedule('purge-ai-usage', '17 3 * * *', 'select public.purge_ai_usage()');`
  (usage rows older than 30 days).
- App env (EAS environment variables): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Secret keys (service role, Anthropic, RevenueCat secret and webhook) exist only as function
secrets, never in the app or in `EXPO_PUBLIC_*`. `npm run release-check` checks the latter.

## Subscriptions (RevenueCat)

- Products: `minus30_pro_monthly` (€5.99, provisional) and `minus30_pro_yearly` (€39.99,
  provisional), entitlement `pro`, and an offering with the MONTHLY and ANNUAL packages.
- The app identifies to RevenueCat with the Supabase user id, so Pro follows the account across
  devices and platforms.
- The paywall shows the store's localized prices. Without a store connection (Expo Go, web, or no
  key), it shows the provisional prices, marked as such, and doesn't offer a purchase.
- Expiration, grace period (billing retry), cancellation (Pro stays active until the period ends),
  refunds and transfers are mapped from RevenueCat events and REST data in
  `supabase/functions/_shared/entitlement.ts`.

## Local test stack

See [`supabase/tests/README.md`](../supabase/tests/README.md). It runs real Postgres with these
migrations, real GoTrue (Supabase Auth), and the Edge Functions under Deno, with mock Anthropic
and RevenueCat servers.
