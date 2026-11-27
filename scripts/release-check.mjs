#!/usr/bin/env node
/**
 * Release gate: lists everything that must be configured before a store release and exits with 1
 * while anything release-blocking is missing. Run: npm run release-check
 * Reads EXPO_PUBLIC_* from the environment, from .env / .env.production if present, and from an
 * eas.json build profile (what the store / TestFlight build actually embeds).
 *
 *   npm run release-check                      # profile "production" (mode C, commercial)
 *   npm run release-check -- --profile beta    # mode A: free TestFlight beta
 *   npm run release-check -- --profile subscription-test   # mode B: real paywall, sandbox purchases
 *   add --android to require the Google Play key as well
 */
import { existsSync, readFileSync } from 'node:fs';

const env = { ...process.env };
for (const f of ['.env', '.env.production']) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const app = JSON.parse(readFileSync('app.json', 'utf8')).expo;
const eas = existsSync('eas.json') ? JSON.parse(readFileSync('eas.json', 'utf8')) : null;
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const profileName = arg('--profile') ?? 'production';
const profile = eas?.build?.[profileName];
if (!profile) {
  console.error(`eas.json has no build profile "${profileName}".`);
  process.exit(2);
}
const pEnv = profile.env ?? {};
for (const [k, v] of Object.entries(pEnv)) env[k] = String(v);
const MODE = { beta: '1', 'subscription-test': '0', production: '0' }[profileName];
console.log(`Profile: ${profileName}${MODE ? ` (mode ${profileName === 'beta' ? 'A – free beta' : profileName === 'production' ? 'C – commercial' : 'B – subscription test'})` : ''}\n`);

// The anon key must belong to the configured project: a key from another (or a recreated) project is
// rejected with "401 Invalid API key" on every sign-up and sign-in.
const projectRef = (env.EXPO_PUBLIC_SUPABASE_URL ?? '').match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
const keyRef = (() => {
  const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (key.startsWith('sb_publishable_')) return projectRef; // new-style keys carry no project claim
  try {
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).ref;
  } catch {
    return undefined;
  }
})();

const checks = [
  ['Supabase URL (EXPO_PUBLIC_SUPABASE_URL)', !!env.EXPO_PUBLIC_SUPABASE_URL?.startsWith('https://')],
  ['Supabase anon key (EXPO_PUBLIC_SUPABASE_ANON_KEY)', !!env.EXPO_PUBLIC_SUPABASE_ANON_KEY],
  ['Supabase anon key belongs to the configured project', !!projectRef && keyRef === projectRef],
  [
    'Store build has no Pro test mode (EXPO_PUBLIC_PRO_TEST_MODE unset, EXPO_PUBLIC_APP_ENV=production)',
    pEnv.EXPO_PUBLIC_PRO_TEST_MODE !== '1' && pEnv.EXPO_PUBLIC_APP_ENV === 'production',
  ],
  ...(MODE ? [[`Beta flag matches the mode (EXPO_PUBLIC_BETA_ALL_USERS_PRO=${MODE})`, (pEnv.EXPO_PUBLIC_BETA_ALL_USERS_PRO ?? '0') === MODE]] : []),
  // The free beta (mode A) sells nothing: the RevenueCat key is only needed for modes B and C.
  ...(profileName === 'beta' ? [] : [['RevenueCat iOS public key (EXPO_PUBLIC_REVENUECAT_IOS_KEY)', !!env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.startsWith('appl_')]]),
  ...(process.argv.includes('--android') ? [['RevenueCat Android public key (EXPO_PUBLIC_REVENUECAT_ANDROID_KEY)', !!env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.startsWith('goog_')]] : []),
  ['Approved privacy policy URL (EXPO_PUBLIC_PRIVACY_URL)', !!env.EXPO_PUBLIC_PRIVACY_URL?.startsWith('https://')],
  ['Approved terms of service URL (EXPO_PUBLIC_TERMS_URL)', !!env.EXPO_PUBLIC_TERMS_URL?.startsWith('https://')],
  ['Support email (EXPO_PUBLIC_SUPPORT_EMAIL)', /@/.test(env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '')],
  ['EAS project linked (expo.extra.eas.projectId in app.json, via `eas init`)', !!app.extra?.eas?.projectId],
  ['No secret keys in EXPO_PUBLIC_* variables', !Object.entries(env).some(([k, v]) => k.startsWith('EXPO_PUBLIC_') && /service_role|sk_|sk-|whsec/i.test(String(v)))],
  // The OpenAI key is an Edge Function secret (supabase secrets set OPENAI_API_KEY=…), never an app variable.
  ['No AI provider key in the app (no EXPO_PUBLIC_*OPENAI* / *ANTHROPIC* variable)', !Object.keys(env).some((k) => k.startsWith('EXPO_PUBLIC_') && /OPENAI|ANTHROPIC/i.test(k))],
];
let blocking = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) blocking++;
}
console.log(
  '\nAlso required outside this repository (see docs/RELEASE_STATUS.md): legal review, App Store Connect products and agreements, Supabase secrets (scripts/supabase-auth-config.mjs), RevenueCat webhook, real-device QA.',
);
if (blocking) {
  console.log(`\n${blocking} release-blocking item(s) missing.`);
  process.exit(1);
}
console.log('\nAll in-repo release checks passed.');
