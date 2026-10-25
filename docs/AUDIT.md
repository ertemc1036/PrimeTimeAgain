# MINUS 30 — completion audit (25 Oct 2026)

Internal checklist of what stood between the repository and a commercial release, and what was
done about each item. Status values: DONE (implemented and tested), DONE-UNTESTED (implemented,
needs live services or a real device), EXTERNAL (needs an account, key or approval), OPEN.

## Findings at the start of this pass

| Area | Finding | Resolution |
| --- | --- | --- |
| Accounts | Sign-in/sign-up form only; no session state shared with the app, no password reset, no "I already have an account" on first launch, sign-out kept data | Auth provider, sign-in/up/reset/sign-out flows, welcome-screen sign-in |
| Cloud sync | Not implemented; schema had typed tables nobody wrote to | Outbox-based sync engine + `sync` Edge Function with last-write-wins, tombstones, server-side duplicate protection |
| Local → cloud migration | Missing | First sign-in offers merge or replace; nothing is deleted without confirmation |
| Account switching | Data of one account would stay on the device for the next | Local data is owned by one account; switching clears only after a successful flush or explicit confirmation |
| Database access in functions | Used PostgREST helpers for entitlements/usage | Functions use Postgres directly with RLS (`set local role authenticated`) |
| Rate limiting | Check-then-insert race | Per-user advisory lock, daily + per-minute limits |
| Subscriptions | Paywall showed a "not available" alert; no SDK | RevenueCat SDK, store prices, purchase, restore, customer-info listener, server-side refresh from RevenueCat REST |
| Pro entitlement | Client always Free | Server entitlement (webhook/REST verified) delivered with each sync; RevenueCat customer info for immediate UI; AI still verified server-side |
| AI coach | No streaming, minimal context, no history sync | Streaming (expo/fetch SSE) with non-streaming fallback, consented context summary, history synced, per-minute + daily limits |
| AI scan / photo | Client timeouts missing | 60 s timeouts, retry, manual fallback kept |
| Photos | Device-only | Private bucket upload (`<user id>/…`), signed-URL download on other devices |
| Notifications | Not rescheduled on foreground / time-zone change | Rescheduled on foreground, time-zone change and data change; tap opens the right tab |
| Legal | Draft summaries looked like final documents | Clearly marked "pending legal approval" screens + `npm run release-check` that fails until real URLs exist |
| Data export | Local only | Cloud export via `export` function when signed in |
| Builds | No `eas.json`, no dev client, no build numbers | EAS profiles (development / preview / production), `expo-dev-client`, versioning, prebuild validation |
| Translations | New strings needed for all features | All 5 languages, enforced by tests |
| Performance | History lists rendered every row | Virtualised lists |
| Sessions | A password change ends the sessions on other devices; the old device could only sign out (losing unsynced changes) | "Sign In" on the Account screen; signing in again as the same account resumes syncing with the queue intact |
| Password reset | The recovery session was created in the app before the new password was set | Code check and new password run on a temporary in-memory client, then a normal sign-in |
| Auth navigation | Finishing a nested auth step (reset, verify) could leave the sign-in screen open | All auth screens close together and return to where the flow started |

## What needs the owner (cannot be done from this environment)

See `docs/RELEASE.md` → "Blockers".
