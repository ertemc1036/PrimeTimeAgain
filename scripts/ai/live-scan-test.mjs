#!/usr/bin/env node
/**
 * Live test of the AI food scanner with up to three meal photos, under a hard budget.
 *
 * It goes through the real path the app uses: sign in → food-scan Edge Function (session, Pro and
 * limits checked there) → OpenAI. The OpenAI key is never needed here; it stays a Supabase secret.
 *
 * COSTS MONEY against a deployed project: it only runs with --confirm-paid. Against a local test
 * gateway (127.0.0.1 / localhost, mock OpenAI) it runs without the flag.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_ANON_KEY=… \
 *   TEST_EMAIL=… TEST_PASSWORD=… \
 *   node scripts/ai/live-scan-test.mjs --confirm-paid meal1.jpg meal2.jpg meal3.jpg
 *
 * Options (env): BUDGET_USD (default 0.20), PRICE_INPUT_PER_M / PRICE_OUTPUT_PER_M in USD per
 * 1M tokens (default 0.75 / 4.50 — conservative for gpt-5.4-mini; check the current OpenAI price
 * list), WORST_INPUT_TOKENS / WORST_OUTPUT_TOKENS (default 4000 / 2500) for the pre-check, LANGUAGE.
 * Photos: JPEG, ideally ≤ 1024 px on the long side (the app sends 1024 px). On a Mac: sips -Z 1024 x.jpg
 */
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const confirmed = args.includes('--confirm-paid');
const photos = args.filter((a) => !a.startsWith('--')).slice(0, 3);
const url = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const anon = process.env.SUPABASE_ANON_KEY ?? '';
const budget = Number(process.env.BUDGET_USD ?? 0.2);
const priceIn = Number(process.env.PRICE_INPUT_PER_M ?? 0.75);
const priceOut = Number(process.env.PRICE_OUTPUT_PER_M ?? 4.5);
const worstIn = Number(process.env.WORST_INPUT_TOKENS ?? 4000);
const worstOut = Number(process.env.WORST_OUTPUT_TOKENS ?? 2500);
const MAX_BASE64 = 2_800_000; // same limit as the Edge Function

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};
if (!url || !anon || !process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) fail('Set SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EMAIL and TEST_PASSWORD.');
if (!photos.length) fail('Pass one to three JPEG photos.');
if (!(budget > 0 && budget <= 0.2)) fail('BUDGET_USD must be > 0 and at most 0.20.');
const local = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url);
if (!local && !confirmed) fail('This sends real, paid AI requests. Re-run with --confirm-paid once that is approved.');

const cost = (input, output) => (input * priceIn + output * priceOut) / 1_000_000;
const worstPerScan = cost(worstIn, worstOut);
console.log(`Backend: ${url}${local ? ' (local test gateway)' : ''}`);
console.log(`Budget $${budget.toFixed(2)} · prices $${priceIn}/$${priceOut} per 1M tokens · worst case per scan $${worstPerScan.toFixed(4)}`);

const images = photos.map((file) => {
  const buf = readFileSync(file);
  if (buf[0] !== 0xff || buf[1] !== 0xd8) fail(`${file} is not a JPEG.`);
  const base64 = buf.toString('base64');
  if (base64.length > MAX_BASE64) fail(`${file} is too large (${Math.round(buf.length / 1024)} KB). Scale it to 1024 px first.`);
  return { file, base64 };
});

const signIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: anon, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD }),
});
const session = await signIn.json().catch(() => ({}));
if (!signIn.ok || !session.access_token) fail(`Sign-in failed (${signIn.status}).`);

let spent = 0;
const results = [];
for (const img of images) {
  if (spent + worstPerScan > budget) {
    console.log(`Stopped before ${img.file}: the worst case would exceed the budget.`);
    break;
  }
  const started = Date.now();
  const res = await fetch(`${url}/functions/v1/food-scan`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: img.base64, language: process.env.LANGUAGE ?? 'de' }),
  });
  const body = await res.json().catch(() => ({}));
  const ms = Date.now() - started;
  const tokens = body.meta ? { input: body.meta.inputTokens, output: body.meta.outputTokens } : null;
  // A failed request may still have been billed; count the worst case when the usage is unknown.
  const c = tokens ? cost(tokens.input, tokens.output) : res.status >= 500 ? worstPerScan : 0;
  spent += c;
  results.push({ file: img.file, http: res.status, ms, model: body.meta?.model ?? null, tokens, costUsd: Number(c.toFixed(5)), result: res.ok ? { status: body.status, mealTitle: body.mealTitle, confidence: body.confidence, items: body.items, uncertaintyNotes: body.uncertaintyNotes } : { error: body.error } });
  console.log(`\n${img.file}: HTTP ${res.status} in ${ms} ms${tokens ? ` · ${tokens.input} in / ${tokens.output} out tokens · ≈ $${c.toFixed(5)}` : ''}`);
  if (!res.ok) {
    console.log(`  error: ${body.error ?? 'unknown'}`);
    if (res.status === 401 || res.status === 403 || res.status === 503) break; // nothing more to learn
    continue;
  }
  console.log(`  ${body.status} · ${body.mealTitle || '–'} · confidence ${body.confidence}`);
  for (const i of body.items ?? []) console.log(`  - ${i.name}: ≈ ${i.estimatedGrams} g, ${i.kcal} kcal, P ${i.protein} / C ${i.carbs} / F ${i.fat} (${i.confidence})`);
  for (const n of body.uncertaintyNotes ?? []) console.log(`  note: ${n}`);
}

console.log(`\nEstimated total: $${spent.toFixed(4)} of $${budget.toFixed(2)} (from the token counts the server reported; the OpenAI usage page is authoritative).`);
const out = `live-scan-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(out, JSON.stringify({ url, local, prices: { input: priceIn, output: priceOut }, spentUsd: Number(spent.toFixed(5)), results }, null, 2));
console.log(`Saved ${out} (no photos stored).`);
