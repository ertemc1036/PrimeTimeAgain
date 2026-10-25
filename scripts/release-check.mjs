#!/usr/bin/env node
/**
 * Release gate: lists everything that must be configured before a store release and exits with 1
 * while anything release-blocking is missing. Run: npm run release-check
 * Reads EXPO_PUBLIC_* from the environment and from .env / .env.production if present.
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

const checks = [
  ['Supabase URL (EXPO_PUBLIC_SUPABASE_URL)', !!env.EXPO_PUBLIC_SUPABASE_URL?.startsWith('https://')],
  ['Supabase anon key (EXPO_PUBLIC_SUPABASE_ANON_KEY)', !!env.EXPO_PUBLIC_SUPABASE_ANON_KEY],
  ['RevenueCat iOS public key (EXPO_PUBLIC_REVENUECAT_IOS_KEY)', !!env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.startsWith('appl_')],
  ['RevenueCat Android public key (EXPO_PUBLIC_REVENUECAT_ANDROID_KEY)', !!env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.startsWith('goog_')],
  ['Approved privacy policy URL (EXPO_PUBLIC_PRIVACY_URL)', !!env.EXPO_PUBLIC_PRIVACY_URL?.startsWith('https://')],
  ['Approved terms of service URL (EXPO_PUBLIC_TERMS_URL)', !!env.EXPO_PUBLIC_TERMS_URL?.startsWith('https://')],
  ['Support email (EXPO_PUBLIC_SUPPORT_EMAIL)', /@/.test(env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '')],
  ['EAS project linked (expo.extra.eas.projectId in app.json, via `eas init`)', !!app.extra?.eas?.projectId],
  ['eas.json with a production profile', !!eas?.build?.production],
  ['No secret keys in EXPO_PUBLIC_* variables', !Object.entries(env).some(([k, v]) => k.startsWith('EXPO_PUBLIC_') && /service_role|sk_|sk-ant-|whsec/i.test(String(v)))],
];
let blocking = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) blocking++;
}
console.log('\nAlso required outside this repository (see docs/RELEASE.md): legal review, App Store Connect / Play Console products and agreements, Supabase deployment and secrets, RevenueCat webhook, real-device QA.');
if (blocking) {
  console.log(`\n${blocking} release-blocking item(s) missing.`);
  process.exit(1);
}
console.log('\nAll in-repo release checks passed.');
