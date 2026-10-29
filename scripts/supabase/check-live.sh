#!/usr/bin/env bash
# Read-only check of the linked Supabase project for Diet9. Changes nothing:
# no migrations are applied, no functions deployed, no secrets set, no AI requests.
#
# Run from the repository root after `supabase login` and `supabase link`:
#   bash scripts/supabase/check-live.sh
set -u
cd "$(dirname "$0")/../.."

if command -v supabase >/dev/null 2>&1; then SB=(supabase); else SB=(npx -y supabase@2); fi
REF=$(cat supabase/.temp/project-ref 2>/dev/null || true)
if [ -z "$REF" ]; then
  echo "No linked project. Run: supabase login && supabase link"
  echo
  "${SB[@]}" projects list
  exit 1
fi

FUNCTIONS=(sync export entitlement food-scan workout-photo coach delete-account revenuecat-webhook founders)
REQUIRED_SECRETS=(OPENAI_API_KEY)
OPTIONAL_SECRETS=(PRO_TESTERS OPENAI_MODEL AI_GLOBAL_DAILY_LIMIT REVENUECAT_SECRET_KEY REVENUECAT_WEBHOOK_SECRET)

echo "== Linked project: $REF (https://$REF.supabase.co)"
echo
echo "== Migrations (Local = this repo, Remote = already in the project)"
"${SB[@]}" migration list --linked
echo
echo "== What 'supabase db push' WOULD apply (dry run, nothing is changed)"
"${SB[@]}" db push --linked --dry-run
echo
echo "== Edge Functions"
if deployed=$("${SB[@]}" functions list --project-ref "$REF" 2>&1); then fn_ok=1; else fn_ok=0; fi
echo "$deployed"
[ $fn_ok = 1 ] || echo "  ? could not read the function list (see the error above)"
[ $fn_ok = 1 ] && for f in "${FUNCTIONS[@]}"; do
  echo "$deployed" | grep -qE "[| ]$f[ |]" && echo "  ✓ $f deployed" || echo "  ✗ $f missing"
done
echo
echo "== Secrets (names only; Supabase shows hashes, never the values)"
if secrets=$("${SB[@]}" secrets list --project-ref "$REF" 2>&1); then sec_ok=1; else sec_ok=0; fi
[ $sec_ok = 1 ] || echo "  ? could not read the secrets: $(echo "$secrets" | tail -1)"
[ $sec_ok = 1 ] && for s in "${REQUIRED_SECRETS[@]}"; do
  echo "$secrets" | grep -qE "[| ]$s[ |]" && echo "  ✓ $s set" || echo "  ✗ $s missing (needed for the real AI scanner)"
done
[ $sec_ok = 1 ] && for s in "${OPTIONAL_SECRETS[@]}"; do
  echo "$secrets" | grep -qE "[| ]$s[ |]" && echo "  ✓ $s set" || echo "  – $s not set (optional)"
done
echo
echo "== App configuration (.env.local / .env; only public values belong there)"
for f in .env.local .env; do
  [ -f "$f" ] || continue
  url=$(grep -E '^EXPO_PUBLIC_SUPABASE_URL=' "$f" | cut -d= -f2-)
  key=$(grep -E '^EXPO_PUBLIC_SUPABASE_ANON_KEY=' "$f" | cut -d= -f2-)
  if [ -n "$key" ]; then keystate=set; else keystate=missing; fi
  echo "  $f: URL ${url:-missing}, anon key $keystate"
  [ -n "$url" ] && [ "$url" != "https://$REF.supabase.co" ] && echo "  ! the URL in $f does not match the linked project"
  grep -qiE '^EXPO_PUBLIC_[A-Z_]*(OPENAI|ANTHROPIC|SERVICE_ROLE)' "$f" && echo "  ! $f contains a secret EXPO_PUBLIC_ variable — remove it"
done
echo
echo "Done. Nothing was changed."
