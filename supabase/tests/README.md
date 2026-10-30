# Local backend tests

These tests run the real backend code without a Supabase cloud project:

| Piece | Local stand-in |
| --- | --- |
| Postgres + RLS | PostgreSQL 16 on `:54322`, with `bootstrap.sql` (Supabase roles, `auth` / `storage` schemas) and then `../migrations/*.sql` |
| Supabase Auth | GoTrue (`github.com/supabase/auth`) on `:9999`, sending mail to a local SMTP catcher on `:2500` |
| Edge Functions | `local-gateway.ts` (Deno) on `:54321`. It serves the real handlers at `/functions/v1/:fn`, proxies `/auth/v1`, and includes a small Storage emulator |
| OpenAI / Anthropic / RevenueCat | Mock endpoints in the gateway (`/mock/openai`, `/mock/anthropic`, `/mock/revenuecat`), switchable via `POST /mock/control` (scenario, provider, Pro testers, launch phase, global limit) |

The mocks exist only to test our own code paths (auth, limits, validation, streaming, error
handling). They say nothing about the quality of real AI answers or about real store purchases.

## Setup (once)

```bash
# Postgres
initdb -D <dir> -U postgres && pg_ctl -D <dir> -o "-p 54322 -k /tmp" start
psql -h 127.0.0.1 -p 54322 -U postgres -f supabase/tests/bootstrap.sql
psql -h 127.0.0.1 -p 54322 -U postgres -f supabase/migrations/20261026000000_minus30_init.sql
# after GoTrue has created auth.users (auth migrate):
psql -h 127.0.0.1 -p 54322 -U postgres -f supabase/migrations/20261030000000_founder_seats.sql
psql -h 127.0.0.1 -p 54322 -U postgres -f supabase/migrations/20261031000000_identity_proofs.sql

# Keys: one HS256 secret; anon / service_role JWTs signed with it (role claim "anon" / "service_role")
export JWT_SECRET=… ANON_KEY=… SERVICE_ROLE_KEY=…
```

GoTrue environment (then `auth migrate` once, `auth serve` to run):

```
API_EXTERNAL_URL=http://127.0.0.1:54321/auth/v1  PORT=9999
DATABASE_URL=postgres://supabase_auth_admin:auth_admin@127.0.0.1:54322/postgres?search_path=auth
GOTRUE_JWT_SECRET=$JWT_SECRET  GOTRUE_JWT_AUD=authenticated  GOTRUE_JWT_ADMIN_ROLES=service_role
GOTRUE_MAILER_AUTOCONFIRM=true          # false to test the email-code confirmation flow
GOTRUE_SMTP_HOST=127.0.0.1  GOTRUE_SMTP_PORT=2500  GOTRUE_PASSWORD_MIN_LENGTH=8
GOTRUE_MAILER_TEMPLATES_RECOVERY=http://127.0.0.1:54321/templates/recovery.html
GOTRUE_MAILER_TEMPLATES_CONFIRMATION=http://127.0.0.1:54321/templates/confirmation.html
GOTRUE_MAILER_TEMPLATES_MAGIC_LINK=http://127.0.0.1:54321/templates/magiclink.html
```

Gateway (run from `supabase/functions` so `deno.json` applies):

```bash
export SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
  SUPABASE_DB_URL=postgres://postgres@127.0.0.1:54322/postgres GOTRUE_URL=http://127.0.0.1:9999 \
  ANTHROPIC_API_KEY=local-test-key ANTHROPIC_BASE_URL=http://127.0.0.1:54321/mock/anthropic \
  OPENAI_API_KEY=local-openai-key OPENAI_BASE_URL=http://127.0.0.1:54321/mock/openai/v1 AI_PROVIDER=anthropic \
  REVENUECAT_SECRET_KEY=local-rc-secret REVENUECAT_API_URL=http://127.0.0.1:54321/mock/revenuecat \
  REVENUECAT_WEBHOOK_SECRET=local-webhook-secret
deno run -A --config deno.json ../tests/local-gateway.ts
```

## Run

```bash
cd supabase/functions
deno test -A --config deno.json ../tests/logic.test.ts     # pure logic, no services needed
ANON_KEY=… MAIL_DIR=<smtp catcher dir> deno test -A --config deno.json ../tests/server.test.ts

# App ↔ cloud (Jest, the app's real sync engine against the stack)
M30_CLOUD_URL=http://127.0.0.1:54321 M30_CLOUD_ANON_KEY=… npx jest src/sync/cloud.integration.test.ts
```

`server.test.ts` covers:
- sign-up and sign-in;
- RLS isolation between users;
- sync last-write-wins, tombstones and idempotent retries;
- cross-device duplicate workouts;
- pagination;
- export;
- entitlement via webhook and REST, including grace and expiry;
- AI auth, Pro and limit checks, plus the not-configured state;
- the OpenAI path: request format (`store: false`, strict JSON schema, image as data URL), scan
  with confidence, unclear / not-food photos without numbers, invalid answers, provider errors,
  quota errors, refusals and coach streaming; the key never appears in a response;
- Pro test access via `PRO_TESTERS` (only listed accounts, nothing stored) and the global daily AI
  limit;
- Founders Edition: verified vs. unverified/anonymous accounts, accounts 999/1000/1001, 25 parallel
  sign-ups and 60 simultaneous confirmations, double claims, table/function permissions for
  `anon`/`authenticated`, account deletion, the public counter, and the order Paid → Test → Founders;
- proven identities: password sign-ups get no seat, email codes (login and reset) and Apple
  identities do, and Apple can't be linked to an email account whose address isn't proven;
- coach streaming;
- storage folder isolation;
- account deletion.
