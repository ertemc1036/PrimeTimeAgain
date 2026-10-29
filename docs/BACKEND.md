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
| `founders` | Founders Edition counter: seats taken / total (counts only) | Public (`--no-verify-jwt`) |

The functions talk to Postgres directly (`SUPABASE_DB_URL`, provided by Supabase). Per request,
they set the caller as `authenticated` with their JWT claims, so row-level security applies inside
the functions as well.

## AI provider

The AI functions use **OpenAI** (Responses API, `supabase/functions/_shared/openai.ts`) when
`OPENAI_API_KEY` is set; otherwise Anthropic (`ANTHROPIC_API_KEY`). `AI_PROVIDER=openai|anthropic`
picks one when both keys exist. Without any key the AI functions answer `503 not_configured` and
the app says so; it never makes up results.

Request path for a meal scan: app (photo scaled to 1024 px, JPEG, no EXIF) → `food-scan` Edge
Function → session check → server-side Pro check → per-user and global limits → image size check
(≤ 2.8 MB base64) → OpenAI with a strict JSON schema → schema validation → photos marked
`unclear`/`not_food` lose all numbers (`sanitizeScan`) → app shows the estimate with confidence
→ the user edits → saved only after confirming. Nothing is stored on the server except one
`ai_usage` row (user, function, time); requests use `store: false` at OpenAI. Saved meals are
read from the diary; viewing them never calls the AI again.

| Secret | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | – | Turns on OpenAI. Function secret only, never `EXPO_PUBLIC_*` |
| `OPENAI_MODEL` | `gpt-5.4-mini` | Vision-capable, cost-efficient. `gpt-5.4-nano` is cheaper, but check its quality first |
| `OPENAI_REASONING_EFFORT` | `low` for gpt-5 / o-models | `off` sends no reasoning setting |
| `OPENAI_IMAGE_DETAIL` | `auto` | `low` is cheaper but less precise |
| `AI_PROVIDER` | automatic | `openai` or `anthropic` |
| `AI_GLOBAL_DAILY_LIMIT` | `2000` | Cost brake: max requests per AI function per 24 h across all users |
| `PRO_TESTERS` | empty | Account ids (UUIDs, comma separated) with Pro test access, see below |

Each response carries `meta` (provider, model, input and output tokens) so costs can be checked;
`scripts/ai/live-scan-test.mjs` uses it to stay within a budget. With a much higher global limit,
consider an index on `ai_usage (fn, created_at)` (not needed at the current limits; it would be a
new migration and needs approval).

The output shapes in `supabase/functions/_shared/schemas.ts` must match `src/domain/aiSchemas.ts`;
a Jest test checks this.

### Pro test access (developer accounts)

Pro for your own test accounts without a purchase, decided only on the server:

1. In the app: Settings → Account → **Account ID** → share/copy it.
2. `supabase secrets set PRO_TESTERS=<account-id>` (several: comma separated). Takes effect on the
   next request, no redeploy needed.
3. In the app: pull to sync or reopen the app. Settings and the Pro screen show "Pro · Test access".

Removing the id ends the access. Nothing is written to the database, there is no code, switch or
hidden gesture in the app, and other accounts are unaffected (server test:
`Pro test access only for allow-listed accounts`).

### Founders Edition

Migration `20261030000000_founder_seats.sql` (needs approval before `supabase db push`):

- `public.founder_settings` (capacity 1,000) and `public.founder_seats` (seat number, account, time).
  Users can read only their own seat; nobody but the server can write.
- `public.claim_founder_seat(user)`: gives a verified account the next seat, idempotent, one claim at
  a time (advisory lock), unique seat number and account. Not callable from the app.
- Triggers on `auth.users` call it when an account is verified (at sign-up with auto-confirm, or when
  the email code is confirmed). A trigger error never blocks a sign-up; the entitlement check claims
  the seat later.
- The migration gives existing verified accounts their seats in the order they were verified.
- `public.founder_seats_status()` → `{capacity, taken}` for the `founders` Edge Function.

Every Pro check (`entitlement`, `sync`, AI functions) returns `source: "founder"` and `founderSeat`.
If the functions are deployed before the migration, founder checks simply find no seat (logged as
"founder seat check failed"); nothing else breaks. Details and App Store notes:
[`SUBSCRIPTIONS.md`](SUBSCRIPTIONS.md).

## Deploy (owner, after approval)

```bash
supabase link --project-ref <ref>
supabase db push                                   # supabase/migrations/20261026000000_minus30_init.sql
supabase secrets set OPENAI_API_KEY=… REVENUECAT_SECRET_KEY=… REVENUECAT_WEBHOOK_SECRET=…
supabase secrets set PRO_TESTERS=<your account id>      # optional: your own Pro test access
supabase functions deploy sync export entitlement food-scan workout-photo coach delete-account
supabase functions deploy revenuecat-webhook founders --no-verify-jwt
```

- **Auth → Email templates:** use `supabase/templates/confirmation.html` (Confirm signup) and
  `supabase/templates/recovery.html` (Reset password). Both show `{{ .Token }}`.
- **Auth → Providers → Email:** minimum password length 8. Turn on "Confirm email" if you want
  verified addresses; the app handles both settings.
- **Scheduled job:** `select cron.schedule('purge-ai-usage', '17 3 * * *', 'select public.purge_ai_usage()');`
  (usage rows older than 30 days).
- App env (EAS environment variables): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Secret keys (service role, OpenAI, Anthropic, RevenueCat secret and webhook) exist only as function
secrets, never in the app or in `EXPO_PUBLIC_*`. `npm run release-check` checks the latter.

## Subscriptions (RevenueCat)

- Product: `minus30_pro_monthly` (€4.99 per month, provisional), entitlement `pro`, offering with
  the MONTHLY package. A yearly plan (`minus30_pro_yearly`) appears in the paywall only if the
  store offers it. Plan details: [`SUBSCRIPTIONS.md`](SUBSCRIPTIONS.md).
- The app identifies to RevenueCat with the Supabase user id, so Pro follows the account across
  devices and platforms.
- The paywall shows the store's localized prices. Without a store connection (Expo Go, web, or no
  key), it shows the provisional prices, marked as such, and doesn't offer a purchase.
- Expiration, grace period (billing retry), cancellation (Pro stays active until the period ends),
  refunds and transfers are mapped from RevenueCat events and REST data in
  `supabase/functions/_shared/entitlement.ts`.

## Local test stack

See [`supabase/tests/README.md`](../supabase/tests/README.md). It runs real Postgres with these
migrations, real GoTrue (Supabase Auth), and the Edge Functions under Deno, with mock OpenAI,
Anthropic and RevenueCat servers.
