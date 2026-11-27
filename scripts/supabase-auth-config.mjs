#!/usr/bin/env node
/**
 * Supabase Auth settings for PrimeMe AI (Management API).
 *
 *   SUPABASE_ACCESS_TOKEN=… node scripts/supabase-auth-config.mjs            # check only
 *   SUPABASE_ACCESS_TOKEN=… node scripts/supabase-auth-config.mjs --apply    # set the settings below
 *   SUPABASE_ACCESS_TOKEN=… node scripts/supabase-auth-config.mjs --apply --templates
 *       # also upload the PrimeMe emails (supabase/templates); Supabase allows this only once a
 *       # custom SMTP provider is configured (Dashboard → Authentication → Emails → SMTP Settings)
 *
 * Project ref: SUPABASE_PROJECT_REF or the ref in eas.json's production EXPO_PUBLIC_SUPABASE_URL.
 * The token is a personal access token (supabase.com/dashboard/account/tokens) – never commit it.
 *
 * What the app relies on:
 *   • mailer_autoconfirm = true  → sign-up returns a session at once, no confirmation email is sent
 *   • mailer_otp_length = 6      → the reset code screen expects 6 digits
 *   • password_min_length = 8    → same rule as the app (PASSWORD_MIN)
 *   • recovery email contains {{ .Token }} → the app resets passwords with a code, not a link
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const token = process.env.SUPABASE_ACCESS_TOKEN;
const eas = JSON.parse(readFileSync(join(root, 'eas.json'), 'utf8'));
const ref = process.env.SUPABASE_PROJECT_REF ?? /https:\/\/([a-z0-9]+)\.supabase\.co/.exec(eas.build?.production?.env?.EXPO_PUBLIC_SUPABASE_URL ?? '')?.[1];
if (!token || !ref) {
  console.error('Set SUPABASE_ACCESS_TOKEN (and SUPABASE_PROJECT_REF if eas.json has no Supabase URL).');
  process.exit(2);
}
const url = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const WANTED = { mailer_autoconfirm: true, mailer_otp_length: 6, password_min_length: 8, disable_signup: false, external_email_enabled: true };
const tpl = (f) => readFileSync(join(root, 'supabase', 'templates', f), 'utf8');
const TEMPLATES = {
  mailer_subjects_recovery: 'PrimeMe AI – Code zum Zurücksetzen deines Passworts',
  mailer_templates_recovery_content: tpl('recovery.html'),
  mailer_subjects_magic_link: 'PrimeMe AI – Dein Bestätigungscode',
  mailer_templates_magic_link_content: tpl('magiclink.html'),
};

const apply = process.argv.includes('--apply');
if (apply) {
  const body = { ...WANTED, ...(process.argv.includes('--templates') ? TEMPLATES : {}) };
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    console.error(`PATCH failed (${res.status}):`, (await res.text()).slice(0, 300));
    process.exit(1);
  }
}

const res = await fetch(url, { headers });
if (!res.ok) {
  console.error(`GET failed (${res.status})`);
  process.exit(1);
}
const cfg = await res.json();
let ok = true;
const line = (good, text) => {
  if (!good) ok = false;
  console.log(`${good ? '✓' : '✗'} ${text}`);
};
for (const [k, v] of Object.entries(WANTED)) line(cfg[k] === v, `${k} = ${cfg[k]} (wanted ${v})`);
line((cfg.mailer_templates_recovery_content ?? '').includes('{{ .Token }}'), 'recovery email contains the reset code ({{ .Token }})');
line(!!cfg.smtp_host, `custom SMTP configured${cfg.smtp_host ? ` (${cfg.smtp_host}, sender ${cfg.smtp_admin_email})` : ' – without it Supabase only emails members of your Supabase team'}`);
console.log(`  rate_limit_email_sent = ${cfg.rate_limit_email_sent} per hour, rate_limit_verify = ${cfg.rate_limit_verify}, captcha = ${cfg.security_captcha_enabled}`);
process.exit(ok ? 0 : 1);
