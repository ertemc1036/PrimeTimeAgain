// Cloud end-to-end in the real UI: two "devices" (separate browser profiles) against the local
// Supabase stack (real Auth, real Edge Functions, Postgres with RLS; mock AI and RevenueCat).
// Start the stack (supabase/tests/README.md) and the web app with
//   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=… npx expo start --web --port 8082
// then: MAIL_DIR=<smtp catcher dir> node e2e/cloud.e2e.js
const { chromium } = require('playwright');
const fs = require('fs');
const { execSync } = require('child_process');
const MAIL = process.env.MAIL_DIR;
const OUT = process.env.OUT_DIR ?? 'e2e/out';
if (!MAIL) throw new Error('Set MAIL_DIR to the SMTP catcher folder');
fs.mkdirSync(OUT, { recursive: true });
const APP = process.env.APP_URL ?? 'http://localhost:8082';
const GW = process.env.GATEWAY_URL ?? 'http://127.0.0.1:54321';
const run = Date.now().toString(36);
const email = `ui-${run}@minus30.test`;
const pass = 'Str0ng-passw0rd';
const results = [];
const errors = [];

async function device(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'en-US' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name} pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${name} console: ${m.text().slice(0, 200)}`));
  page.on('dialog', (d) => d.accept());
  page.on('response', async (r) => { if (process.env.TRACE && r.url().includes('/functions/v1/')) { let t = ''; try { t = (await r.text()).slice(-160); } catch {} console.log(name, 'RESP', r.status(), r.url().split('/v1/')[1], t); } });
  const wait = (ms = 400) => page.waitForTimeout(ms);
  async function clickTop(loc) {
    for (let a = 0; a < 25; a++) {
      const n = await loc.count();
      for (let i = n - 1; i >= 0; i--) {
        try { await loc.nth(i).click({ trial: true, timeout: 400 }); await loc.nth(i).click(); await wait(); return; } catch {}
      }
      await wait(300);
    }
    throw new Error('not clickable: ' + loc);
  }
  return {
    page, ctx, wait,
    tap: (t) => clickTop(page.getByText(t, { exact: true }).locator('visible=true')),
    role: (n) => clickTop(page.getByRole('button', { name: n, exact: true }).locator('visible=true')),
    tab: async (n) => { await clickTop(page.getByRole('tab', { name: new RegExp(n) })); await wait(600); },
    see: (t, timeout = 15000) => page.getByText(t, { exact: true }).locator('visible=true').first().waitFor({ timeout }),
    seeRe: (re, timeout = 15000) => page.getByText(re).locator('visible=true').first().waitFor({ timeout }),
    fill: (label, v) => page.getByLabel(label, { exact: true }).locator('visible=true').first().fill(v),
    shot: async (n) => { await page.setViewportSize({ width: 390, height: 1400 }); await wait(400); await page.screenshot({ path: `${OUT}/${n}.png` }); await page.setViewportSize({ width: 390, height: 844 }); },
  };
}
async function step(label, d, fn) {
  try { await fn(); results.push(`OK   ${label}`); }
  catch (e) { results.push(`FAIL ${label}: ${e.message.split('\n')[0]}`); if (d) await d.shot('fail-' + label.replace(/\W+/g, '_')); throw e; }
}
const latestCode = (to) => {
  const files = fs.readdirSync(MAIL).filter((f) => f.includes(to.replace('@', '_at_'))).sort();
  const body = fs.readFileSync(`${MAIL}/${files[files.length - 1]}`, 'utf8').replace(/=\r?\n/g, '');
  return body.match(/>(\d{6})</)[1];
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const a = await device(browser, 'A');
  await a.page.goto(APP); await a.wait(4000);

  await step('A: local use first, then create account and merge device data', a, async () => {
    await a.see('I already have an account');
    await a.tap('Get Started');
    await a.fill('Preferred name', 'Cloud');
    await a.tap('I confirm I am 18 years or older');
    await a.role('Continue');
    await a.tap('Build healthier habits'); await a.role('Continue');
    await a.tap('Gym'); await a.role('Continue');
    await a.role('Continue'); await a.role('Continue'); await a.role('Not now');
    await a.role('Start My Journey'); await a.see("Today's Mission");
    await a.tab('Food'); await a.role('Add Food');
    await a.fill('Food name', 'Cloud oats');
    await a.role('Save Meal'); await a.wait(600);
    await a.role("Finish Today's Food Log"); await a.see('Food log finished');
    await a.tab('Workout'); await a.tap('Rest Day'); await a.role('Save Rest Day'); await a.see('Rest Day saved');
    await a.tab('Today'); await a.role('Profile and settings'); await a.wait(600);
    await a.tap('Account'); await a.wait(600);
    await a.see('Back up your progress');
    await a.role('Create Account'); await a.wait(800);
    await a.fill('Email', email); await a.fill('Password', pass);
    await a.role('Create Account');
    await a.see('This device already has data');
    await a.shot('a-merge');
    await a.role('Continue');
    await a.seeRe(new RegExp(`Signed in as ${email.replace('.', '\\.')}`));
    await a.see('Synced', 20000);
    await a.shot('a-account');
  });

  const b = await device(browser, 'B');
  await b.page.goto(APP); await b.wait(4000);
  await step('B: new device signs in and gets everything back', b, async () => {
    await b.tap('I already have an account'); await b.wait(800);
    await b.fill('Email', email); await b.fill('Password', pass);
    await b.role('Sign In');
    await b.see("Today's Mission", 20000);
    await b.see('Good ' + ({ m: 'Morning', a: 'Afternoon', e: 'Evening' }[new Date().getHours() < 12 ? 'm' : new Date().getHours() < 18 ? 'a' : 'e']) + ', Cloud');
    await b.see('Food Logged'); await b.see('Rest Day Saved'); await b.see('2 / 3 Completed');
    await b.tab('Food'); await b.see('Cloud oats');
    await b.shot('b-today');
  });

  await step('A → B: a new entry on one phone appears on the other', a, async () => {
    await a.page.goto(`${APP}/plan`); await a.wait(3500);
    await a.page.getByLabel('Keep meals flexible').click(); await a.wait();
    await a.tap('Rest Day');
    await a.role("Save Tomorrow's Plan"); await a.see('Plan saved.');
    await a.wait(2500); // debounce + upload
    await b.page.goto(`${APP}/settings/account`); await b.wait(3500);
    await b.role('Sync Now'); await b.wait(1500);
    await b.page.goto(`${APP}/today`); await b.wait(3500);
    await b.see('3 / 3 Completed'); await b.see('1 Day Streak');
  });

  await step('B: sign out removes the data from that device', b, async () => {
    await b.page.goto(`${APP}/settings/account`); await b.wait(3500);
    await b.role('Sign Out'); await b.wait(2500);
    await b.see('I already have an account');
  });

  await step('B: reset password with the emailed code, then signed in', b, async () => {
    await b.tap('I already have an account'); await b.wait(800);
    await b.fill('Email', email);
    await b.role('Forgot password?'); await b.wait(800);
    await b.role('Send Code'); await b.wait(2500);
    await b.fill('6-digit code', latestCode(email));
    await b.fill('New password', 'Brand-new-passw0rd');
    await b.role('Save');
    await b.see("Today's Mission", 20000);
    await b.see('3 / 3 Completed');
  });

  await step('A: the password change ended the old session; signing in again resumes sync', a, async () => {
    await a.page.goto(`${APP}/settings/account`); await a.wait(3500);
    await a.role('Sync Now').catch(() => {}); await a.wait(1500);
    await a.see('Your session ended. Sign in again to keep syncing.');
    await a.role('Sign In'); await a.wait(800);
    await a.fill('Password', 'Brand-new-passw0rd');
    await a.role('Sign In');
    await a.see('Synced', 20000);
    await a.page.goto(`${APP}/today`); await a.wait(3500);
    await a.see('3 / 3 Completed');
  });

  await step('A: free account is sent to the paywall; Pro via verified subscription unlocks the streaming coach', a, async () => {
    await a.page.goto(`${APP}/today`); await a.wait(3500);
    await a.page.getByRole('button', { name: 'Open AI Coach' }).click(); await a.wait(900);
    await a.see('Unlock MINUS 30 Pro');
    await a.seeRe(/bought in the installed MINUS 30 app/);
    await a.shot('a-paywall');
    const uid = execSync(`psql -h 127.0.0.1 -p 54322 -U postgres -tAc "select id from auth.users where email='${email}'"`).toString().trim();
    await fetch(`${GW}/mock/control`, { method: 'POST', body: JSON.stringify({ scenario: 'ok', subscriber: { id: uid, data: { entitlements: { pro: { expires_date: new Date(Date.now() + 30 * 864e5).toISOString(), product_identifier: 'minus30_pro_yearly' } }, subscriptions: { minus30_pro_yearly: { store: 'app_store' } } } } }) });
    const wh = await fetch(`${GW}/functions/v1/revenuecat-webhook`, { method: 'POST', headers: { Authorization: 'Bearer local-webhook-secret', 'Content-Type': 'application/json' }, body: JSON.stringify({ event: { type: 'INITIAL_PURCHASE', app_user_id: uid, entitlement_ids: ['pro'] } }) });
    if (wh.status !== 200) throw new Error('webhook ' + wh.status);
    await a.page.goto(`${APP}/settings/account`); await a.wait(3500);
    await a.role('Sync Now'); await a.wait(1500);
    if (process.env.TRACE) console.log('A account:', (await a.page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 200));
    await a.page.goto(`${APP}/today`); await a.wait(3500);
    await a.page.getByRole('button', { name: 'Open AI Coach' }).click(); await a.wait(900);
    await a.see('AI Coach');
    await a.page.getByLabel('Ask anything about your plan').fill('Plan my day');
    await a.page.getByRole('button', { name: 'Send' }).click();
    await a.seeRe(/Try a simple plan/, 20000);
    await a.shot('a-coach');
  });

  await step('A: delete account removes it everywhere', a, async () => {
    await a.page.goto(`${APP}/settings/account`); await a.wait(3500);
    await a.role('Delete account'); await a.wait(3000);
    await a.see('I already have an account');
    const n = execSync(`psql -h 127.0.0.1 -p 54322 -U postgres -tAc "select count(*) from auth.users where email='${email}'"`).toString().trim();
    if (n !== '0') throw new Error('user still exists');
    await a.tap('I already have an account'); await a.wait(800);
    await a.fill('Email', email); await a.fill('Password', 'Brand-new-passw0rd');
    await a.role('Sign In');
    await a.see('Email or password is incorrect.');
  });

  console.log(results.join('\n'));
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.log('ABORT', e.message.split('\n')[0]); console.log('ERRORS', errors.join('\n') || 'none'); process.exit(1); });
