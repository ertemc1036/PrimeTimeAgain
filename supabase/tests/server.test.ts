/**
 * Server integration tests: real Postgres (migration + RLS), real Supabase Auth, the real Edge
 * Function handlers behind tests/local-gateway.ts, and stand-ins for Anthropic and RevenueCat.
 * Run with: deno test -A supabase/tests/server.test.ts (see supabase/tests/README.md).
 */
import { assert, assertEquals, assertNotEquals } from 'jsr:@std/assert@1';
import postgres from 'npm:postgres@3.4.9';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const BASE = Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321';
const ANON = Deno.env.get('ANON_KEY')!;
const DB = postgres(Deno.env.get('SUPABASE_DB_URL') ?? 'postgres://postgres@127.0.0.1:54322/postgres', { prepare: false, max: 4 });
const MAIL_DIR = Deno.env.get('MAIL_DIR');
const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? 'local-webhook-secret';
const JPEG = '/9j/' + 'A'.repeat(400);
const run = crypto.randomUUID().slice(0, 8);

const client = () => createClient(BASE, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
async function newUser(tag: string) {
  const c = client();
  const email = `${tag}-${run}@minus30.test`;
  const { data, error } = await c.auth.signUp({ email, password: 'Str0ng-passw0rd' });
  if (error || !data.session) throw new Error(`signup failed: ${error?.message}`);
  return { c, email, id: data.user!.id, token: data.session.access_token };
}
const call = (fn: string, token: string | null, body: unknown = {}) =>
  fetch(`${BASE}/functions/v1/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
const callJson = async (fn: string, token: string | null, body: unknown = {}) => {
  const res = await call(fn, token, body);
  return { status: res.status, body: await res.json() };
};
const control = (b: unknown) => fetch(`${BASE}/mock/control`, { method: 'POST', body: JSON.stringify(b) }).then((r) => r.json());
const change = (collection: string, id: string, data: unknown, updatedAt: string, deleted = false) => ({ collection, id, data, deleted, updatedAt });
const webhook = (event: unknown, secret = WEBHOOK_SECRET) =>
  fetch(`${BASE}/functions/v1/revenuecat-webhook`, { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ event }) });
const future = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
const proSubscriber = (id: string, expires: string | null, extra: Record<string, unknown> = {}) =>
  control({ subscriber: { id, data: { entitlements: { pro: { expires_date: expires, product_identifier: 'minus30_pro_monthly', ...extra } }, subscriptions: { minus30_pro_monthly: { store: 'app_store', ...extra } } } } });

const opts = { sanitizeOps: false, sanitizeResources: false };
/** Founders Edition capacity for the following tests (0 = no free seats, the default for other tests). */
const founderCapacity = (n: number) => DB`update public.founder_settings set capacity = ${n} where id`;
const seatOf = async (userId: string) => (await DB`select seat_no from public.founder_seats where user_id = ${userId}`)[0]?.seat_no ?? null;
/** An account row created directly in the database (like Supabase Auth does), verified or not. */
async function rawUser(tag: string, opts: { confirmed: boolean; anonymous?: boolean }) {
  const [u] = await DB`insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, is_anonymous, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', ${`${tag}-${crypto.randomUUID().slice(0, 8)}@raw.test`},
      ${opts.confirmed ? new Date() : null}, ${opts.anonymous ?? false}, now(), now()) returning id`;
  return u.id as string;
}

Deno.test({ name: 'setup: no founder seats for the general tests', ...opts, async fn() {
  await founderCapacity(0);
}});

Deno.test({ name: 'row-level security isolates users at the database level', ...opts, async fn() {
  const a = await newUser('rls-a');
  const b = await newUser('rls-b');
  const asUser = (uid: string, q: (tx: postgres.TransactionSql) => Promise<unknown>) =>
    DB.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: uid, role: 'authenticated' })}, true), set_config('request.jwt.claim.sub', ${uid}, true), set_config('role', 'authenticated', true)`;
      return q(tx);
    });
  await asUser(a.id, (tx) => tx`insert into public.user_records (collection, id, data, updated_at, version) values ('weight', 'w1', '{"date":"2026-10-25","kg":80}', now(), 'v')`);
  const seenByB = (await asUser(b.id, (tx) => tx`select * from public.user_records where id = 'w1'`)) as unknown[];
  assertEquals(seenByB.length, 0, 'B must not see A');
  const updated = (await asUser(b.id, (tx) => tx`update public.user_records set data = '{"kg":1}' where id = 'w1' returning id`)) as unknown[];
  assertEquals(updated.length, 0, 'B must not modify A');
  let forged = false;
  try {
    await asUser(b.id, (tx) => tx`insert into public.user_records (user_id, collection, id, data, updated_at, version) values (${a.id}, 'weight', 'w2', '{}', now(), 'v')`);
  } catch {
    forged = true;
  }
  assert(forged, 'B must not insert rows for A');
  let anonBlocked = false;
  try {
    await DB.begin(async (tx) => {
      await tx`set local role anon`;
      await tx`select * from public.user_records`;
    });
  } catch {
    anonBlocked = true;
  }
  assert(anonBlocked, 'anon has no access');
  let otherFolder = false;
  try {
    await asUser(b.id, (tx) => tx`insert into storage.objects (bucket_id, name) values ('progress-photos', ${a.id + '/p.jpg'})`);
  } catch {
    otherFolder = true;
  }
  assert(otherFolder, 'B must not write into A\'s photo folder');
  await asUser(b.id, (tx) => tx`insert into storage.objects (bucket_id, name) values ('progress-photos', ${b.id + '/p.jpg'})`);
  const aCanReadB = (await asUser(a.id, (tx) => tx`select * from storage.objects where name like ${b.id + '%'}`)) as unknown[];
  assertEquals(aCanReadB.length, 0, 'A must not read B\'s photos');
}});

Deno.test({ name: 'sync rejects missing, forged and expired tokens', ...opts, async fn() {
  assertEquals((await callJson('sync', null)).status, 401);
  assertEquals((await callJson('sync', 'not-a-jwt')).status, 401);
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
  const payload = btoa(JSON.stringify({ sub: crypto.randomUUID(), role: 'authenticated', exp: 9999999999 })).replace(/=/g, '');
  assertEquals((await callJson('sync', `${header}.${payload}.forgedsignature`)).status, 401);
}});

Deno.test({ name: 'sync: push, pull, last-write-wins, tombstones, duplicates and isolation', ...opts, async fn() {
  const a = await newUser('sync-a');
  const b = await newUser('sync-b');
  const t1 = '2026-10-25T10:00:00.000Z';
  const t2 = '2026-10-25T11:00:00.000Z';
  const gym = { id: 'act1', date: '2026-10-25', type: 'gym', startTime: '18:00', durationMin: 45, description: 'Upper body' };

  let r = await callJson('sync', a.token, { cursor: 0, changes: [change('activity', 'act1', gym, t1), change('rest', '2026-10-24', { date: '2026-10-24' }, t1), change('food', 'f1', { date: '2026-10-25', mealType: 'lunch', title: 'Salad', items: [] }, t1)] });
  assertEquals(r.status, 200);
  assertEquals(r.body.results.map((x: { status: string }) => x.status), ['applied', 'applied', 'applied']);
  assertEquals(r.body.records.length, 3);
  const cursor = r.body.cursor;

  // Older write loses and the winner is returned; newer write wins.
  r = await callJson('sync', a.token, { cursor, changes: [change('activity', 'act1', { ...gym, description: 'old' }, '2026-10-25T09:00:00.000Z')] });
  assertEquals(r.body.results[0].status, 'stale');
  assertEquals(r.body.winners[0].data.description, 'Upper body');
  r = await callJson('sync', a.token, { cursor, changes: [change('activity', 'act1', { ...gym, description: 'Legs' }, t2)] });
  assertEquals(r.body.results[0].status, 'applied');
  assertEquals(r.body.records.map((x: { id: string }) => x.id), ['act1']);

  // Same timestamp: deterministic winner (content hash), identical on retry.
  const tie1 = await callJson('sync', a.token, { cursor: 0, changes: [change('weight', 'w', { date: '2026-10-25', kg: 80 }, t2)] });
  const tie2 = await callJson('sync', a.token, { cursor: 0, changes: [change('weight', 'w', { date: '2026-10-25', kg: 81 }, t2)] });
  const winner1 = (await callJson('sync', a.token, { cursor: 0, changes: [] })).body.records.find((x: { id: string }) => x.id === 'w').data.kg;
  const tie3 = await callJson('sync', a.token, { cursor: 0, changes: [change('weight', 'w', { date: '2026-10-25', kg: winner1 === 80 ? 81 : 80 }, t2)] });
  assertEquals(tie3.body.results[0].status, 'stale', 'loser stays loser');
  assert(tie1.status === 200 && tie2.status === 200);

  // Another device creates the same workout under a different id → duplicate, existing one is kept.
  r = await callJson('sync', a.token, { cursor: 0, changes: [change('activity', 'act2', { ...gym, id: 'act2', description: 'Legs again' }, t2)] });
  assertEquals(r.body.results[0].status, 'duplicate');
  assertEquals(r.body.results[0].existingId, 'act1');

  // Tombstone deletes; the deletion syncs to other devices.
  r = await callJson('sync', a.token, { cursor, changes: [change('food', 'f1', null, t2, true)] });
  assertEquals(r.body.results[0].status, 'applied');
  const fromScratch = await callJson('sync', a.token, { cursor: 0, changes: [] });
  assert(fromScratch.body.records.find((x: { id: string; deleted: boolean }) => x.id === 'f1').deleted);

  // Invalid data is rejected per record (and reported), the rest of the batch still applies.
  r = await callJson('sync', a.token, { cursor, changes: [change('activity', 'bad', { type: 'gym', date: 'x' }, t2), change('nope', 'x', {}, t2), change('rest', '2026-10-23', { date: '2026-10-23' }, t2)] });
  assertEquals(r.body.results.map((x: { status: string }) => x.status), ['invalid', 'invalid', 'applied']);

  // B sees nothing of A.
  const bView = await callJson('sync', b.token, { cursor: 0, changes: [] });
  assertEquals(bView.body.records.length, 0);
  // Export contains only the caller's live records.
  const ex = await callJson('export', a.token);
  assertEquals(ex.status, 200);
  assert(ex.body.records.every((x: { collection: string }) => x.collection !== 'food'), 'deleted records not exported');
  assertEquals((await callJson('export', b.token)).body.records.length, 0);
}});

Deno.test({ name: 'sync paginates large pulls without losing records', ...opts, async fn() {
  const a = await newUser('page');
  const changes = Array.from({ length: 450 }, (_, i) => change('savedMeal', `m${i}`, { title: `Meal ${i}`, items: [] }, '2026-10-25T10:00:00.000Z'));
  for (let i = 0; i < 3; i++) {
    const r = await callJson('sync', a.token, { cursor: 0, changes: changes.slice(i * 150, (i + 1) * 150) });
    assertEquals(r.status, 200);
  }
  const ids = new Set<string>();
  let cursor = 0;
  for (let guard = 0; guard < 10; guard++) {
    const r = await callJson('sync', a.token, { cursor, changes: [] });
    r.body.records.forEach((x: { id: string }) => ids.add(x.id));
    cursor = r.body.cursor;
    if (!r.body.more) break;
  }
  assertEquals(ids.size, 450);
  assertEquals((await callJson('sync', a.token, { cursor: 0, changes: Array.from({ length: 501 }, () => change('rest', '2026-01-01', {}, '2026-10-25T10:00:00.000Z')) })).status, 413);
}});

Deno.test({ name: 'Pro: entitlement from RevenueCat only, expiry, grace period, billing issue', ...opts, async fn() {
  const u = await newUser('pro');
  await control({ scenario: 'ok' });
  assertEquals((await callJson('food-scan', u.token, { image: JPEG })).status, 403, 'free user blocked');
  assertEquals((await webhook({ type: 'INITIAL_PURCHASE', app_user_id: u.id, entitlement_ids: ['pro'] }, 'wrong')).status, 401);

  await proSubscriber(u.id, future(30));
  assertEquals((await webhook({ type: 'INITIAL_PURCHASE', app_user_id: u.id, entitlement_ids: ['pro'] })).status, 200);
  const scan = await callJson('food-scan', u.token, { image: JPEG, language: 'de' });
  assertEquals(scan.status, 200);
  assertEquals(scan.body.items.length, 2);
  assertEquals((await callJson('sync', u.token)).body.entitlement.tier, 'pro', 'entitlement delivered with sync (cross-device)');

  await proSubscriber(u.id, future(-1), { grace_period_expires_date: future(3), billing_issues_detected_at: future(-1) });
  await webhook({ type: 'BILLING_ISSUE', app_user_id: u.id, entitlement_ids: ['pro'] });
  assertEquals((await callJson('entitlement', u.token)).body.status, 'grace_period');
  assertEquals((await callJson('workout-photo', u.token, { image: JPEG, selected: 'gym' })).status, 200, 'grace period keeps access');

  await proSubscriber(u.id, future(-2), { billing_issues_detected_at: future(-5) });
  await webhook({ type: 'EXPIRATION', app_user_id: u.id, entitlement_ids: ['pro'] });
  const ent = await callJson('entitlement', u.token);
  assertEquals(ent.body.tier, 'free');
  assertEquals((await callJson('food-scan', u.token, { image: JPEG })).status, 403, 'expired subscription blocked');
}});

Deno.test({ name: 'AI: rate limits hold under concurrency; failures are reported, never faked', ...opts, async fn() {
  const u = await newUser('ai');
  await proSubscriber(u.id, future(30));
  await callJson('entitlement', u.token);
  await control({ scenario: 'ok' });

  const results = await Promise.all(Array.from({ length: 10 }, () => call('food-scan', u.token, { image: JPEG }).then((r) => r.status)));
  assertEquals(results.filter((s) => s === 200).length, 6, `per-minute limit: ${results}`);
  assertEquals(results.filter((s) => s === 429).length, 4);

  const v = await newUser('ai2');
  await proSubscriber(v.id, future(30));
  await callJson('entitlement', v.token);
  assertEquals((await callJson('food-scan', v.token, { image: 'not-a-jpeg' })).status, 400);
  await control({ scenario: 'invalid' });
  assertEquals((await callJson('food-scan', v.token, { image: JPEG })).body.error, 'invalid_response');
  await control({ scenario: 'error' });
  assertEquals((await callJson('workout-photo', v.token, { image: JPEG, selected: 'gym' })).body.error, 'provider_error');
  await control({ scenario: 'refusal' });
  assertEquals((await callJson('coach', v.token, { messages: [{ role: 'user', content: 'Hi' }] })).body.error, 'refused');
  await control({ scenario: 'ok' });
}});

Deno.test({ name: 'OpenAI: scan with confidence, unclear photos without numbers, errors reported, key stays on the server', ...opts, async fn() {
  const u = await newUser('oai');
  await proSubscriber(u.id, future(30));
  await callJson('entitlement', u.token);
  await control({ provider: 'openai', scenario: 'ok', reset: true });
  try {
    const scan = await callJson('food-scan', u.token, { image: JPEG, language: 'de' });
    assertEquals(scan.status, 200);
    assertEquals(scan.body.items.length, 2);
    assertEquals(scan.body.confidence, 'medium');
    assertEquals(scan.body.items[0].confidence, 'high');
    assertEquals(scan.body.meta.provider, 'openai');
    assertEquals(scan.body.meta.inputTokens, 812);
    assertEquals(scan.body.meta.outputTokens, 240);
    assert(!JSON.stringify(scan.body).includes('local-openai-key'), 'key never in a response');

    const state = await (await fetch(`${BASE}/mock/control`)).json();
    assertEquals(state.openaiCalls, 1);
    assertEquals(state.anthropicCalls, 0);
    const req = state.lastOpenAI;
    assertEquals(req.store, false);
    assertEquals(req.text.format.type, 'json_schema');
    assertEquals(req.text.format.strict, true);
    assertEquals(req.text.format.name, 'food_scan');
    const image = req.input[0].content.find((c: { type: string }) => c.type === 'input_image');
    assert(image.image_url.startsWith('data:image/jpeg;base64,/9j/'));
    assert(req.input[0].content[0].text.includes('German'));
    assert(req.instructions.includes('Never invent items'));

    await control({ scenario: 'unclear' });
    const unclear = await callJson('food-scan', u.token, { image: JPEG });
    assertEquals(unclear.status, 200);
    assertEquals(unclear.body.status, 'unclear');
    assertEquals(unclear.body.items.length, 0, 'no numbers for an unclear photo, even if the model sent some');
    await control({ scenario: 'not_food' });
    assertEquals((await callJson('food-scan', u.token, { image: JPEG })).body.status, 'not_food');

    const v = await newUser('oai2');
    await proSubscriber(v.id, future(30));
    await callJson('entitlement', v.token);
    await control({ scenario: 'invalid' });
    assertEquals((await callJson('food-scan', v.token, { image: JPEG })).body.error, 'invalid_response');
    await control({ scenario: 'error' });
    assertEquals((await callJson('food-scan', v.token, { image: JPEG })).body.error, 'provider_error');
    await control({ scenario: 'quota' });
    const quota = await callJson('workout-photo', v.token, { image: JPEG, selected: 'gym' });
    assertEquals(quota.body.error, 'provider_error');
    await control({ scenario: 'refusal' });
    assertEquals((await callJson('coach', v.token, { messages: [{ role: 'user', content: 'Hi' }] })).body.error, 'refused');

    await control({ scenario: 'ok' });
    const w = await newUser('oai3');
    await proSubscriber(w.id, future(30));
    await callJson('entitlement', w.token);
    const photo = await callJson('workout-photo', w.token, { image: JPEG, selected: 'gym' });
    assertEquals(photo.status, 200);
    const res = await call('coach', w.token, { stream: true, messages: [{ role: 'user', content: 'Plan my day' }] });
    const events = (await res.text()).split('\n\n').filter(Boolean).map((l) => JSON.parse(l.replace(/^data: /, '')));
    assertEquals(events[events.length - 1].t, 'end');
    assert(events.filter((e) => e.t === 'd').map((e) => e.v).join('').startsWith('Try a simple plan'));
  } finally {
    await control({ provider: 'anthropic', scenario: 'ok' });
  }
}});

Deno.test({ name: 'Pro test access only for allow-listed accounts (server secret), shown as source "test"', ...opts, async fn() {
  const t = await newUser('tester');
  const other = await newUser('not-tester');
  await control({ scenario: 'ok', testers: '' });
  try {
    assertEquals((await callJson('food-scan', t.token, { image: JPEG })).status, 403, 'not unlocked yet');
    await control({ testers: `not-a-uuid, ${t.id.toUpperCase()}` });
    const ent = await callJson('entitlement', t.token);
    assertEquals(ent.body.tier, 'pro');
    assertEquals(ent.body.source, 'test');
    assertEquals((await callJson('sync', t.token)).body.entitlement.source, 'test');
    assertEquals((await callJson('food-scan', t.token, { image: JPEG })).status, 200);
    assertEquals((await callJson('entitlement', other.token)).body.tier, 'free', 'other accounts unaffected');
    assertEquals((await callJson('food-scan', other.token, { image: JPEG })).status, 403);
    const stored = await DB`select * from public.entitlements where user_id = ${t.id} and tier = 'pro'`;
    assertEquals(stored.length, 0, 'test access is never written to the database');
  } finally {
    await control({ testers: '' });
  }
  assertEquals((await callJson('entitlement', t.token)).body.tier, 'free', 'removing the id ends the access');
}});

Deno.test({ name: 'global daily AI limit across all users', ...opts, async fn() {
  const g = await newUser('global');
  await proSubscriber(g.id, future(30));
  await callJson('entitlement', g.token);
  const [{ n }] = await DB`select count(*)::int as n from public.ai_usage where fn = 'food-scan' and created_at > now() - interval '24 hours'`;
  try {
    await control({ scenario: 'ok', globalLimit: String(n) });
    assertEquals((await callJson('food-scan', g.token, { image: JPEG })).status, 429, 'global cap reached');
    await control({ globalLimit: String(n + 1) });
    assertEquals((await callJson('food-scan', g.token, { image: JPEG })).status, 200);
  } finally {
    await control({ globalLimit: '' });
  }
}});

Deno.test({ name: 'Founders: verified accounts get a stored free seat; unverified and anonymous ones do not', ...opts, async fn() {
  await DB`delete from public.founder_seats`;
  await founderCapacity(1000);
  try {
    const pending = await rawUser('unverified', { confirmed: false });
    assertEquals(await seatOf(pending), null, 'unverified account gets no seat');
    const anon = await rawUser('anon', { confirmed: true, anonymous: true });
    assertEquals(await seatOf(anon), null, 'anonymous account gets no seat');
    await DB`update auth.users set email_confirmed_at = now() where id = ${pending}`;
    assertEquals(await seatOf(pending), 1, 'seat handed out when the email is confirmed');

    const f = await newUser('founder'); // sign-up through Supabase Auth (auto-confirm locally)
    assertEquals(await seatOf(f.id), 2);
    const ent = await callJson('entitlement', f.token);
    assertEquals([ent.body.tier, ent.body.source, ent.body.founderSeat], ['pro', 'founder', 2]);
    assertEquals((await callJson('sync', f.token)).body.entitlement.source, 'founder');
    await control({ scenario: 'ok' });
    assertEquals((await callJson('food-scan', f.token, { image: JPEG })).status, 200, 'founders use the Pro features');
    assertEquals((await DB`select * from public.entitlements where user_id = ${f.id} and tier = 'pro'`).length, 0, 'no subscription row');

    // Idempotent: claiming again never creates a second seat.
    const again = await Promise.all(Array.from({ length: 10 }, () => DB`select public.claim_founder_seat(${f.id}::uuid) as s`));
    assert(again.every(([r]) => r.s === 2));
    assertEquals((await DB`select count(*)::int as n from public.founder_seats where user_id = ${f.id}`)[0].n, 1);

    // Signed-in users can read only their own seat and cannot hand out seats (checked as the
    // `authenticated` role with the user's JWT claims, like PostgREST does).
    const asRole = (role: string, uid: string | null, q: (tx: postgres.TransactionSql) => Promise<unknown>) =>
      DB.begin(async (tx) => {
        await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: uid, role })}, true), set_config('role', ${role}, true)`;
        return q(tx);
      }).then((r) => ({ ok: true, r: Array.isArray(r) ? [...r] : r }), (e) => ({ ok: false, r: (e as Error).message }));
    assertEquals((await asRole('authenticated', f.id, (tx) => tx`select seat_no from public.founder_seats`)).r, [{ seat_no: 2 }], 'own seat only');
    assertEquals((await asRole('authenticated', pending, (tx) => tx`select seat_no from public.founder_seats`)).r, [{ seat_no: 1 }]);
    for (const [label, q] of [
      ['insert a seat', (tx: postgres.TransactionSql) => tx`insert into public.founder_seats (seat_no, user_id) values (999, ${f.id})`],
      ['change a seat', (tx: postgres.TransactionSql) => tx`update public.founder_seats set seat_no = 5 where user_id = ${f.id} returning seat_no`],
      ['claim a seat', (tx: postgres.TransactionSql) => tx`select public.claim_founder_seat(${f.id}::uuid)`],
      ['change the capacity', (tx: postgres.TransactionSql) => tx`update public.founder_settings set capacity = 5000 returning capacity`],
      ['read the counter function directly', (tx: postgres.TransactionSql) => tx`select public.founder_seats_status()`],
    ] as const) {
      for (const role of ['authenticated', 'anon']) {
        const r = await asRole(role, role === 'anon' ? null : f.id, q);
        assert(!r.ok || (Array.isArray(r.r) && r.r.length === 0), `${role} must not ${label}: ${JSON.stringify(r.r)}`);
      }
    }
    assertEquals(await seatOf(f.id), 2);

    // Public counter (no sign-in): real numbers from the database.
    const counter = await fetch(`${BASE}/functions/v1/founders`).then((r) => r.json());
    assertEquals(counter, { capacity: 1000, taken: 2, remaining: 998 });

    // Deleting a founder account keeps the seat used; the seat number is never handed out twice.
    assertEquals((await callJson('delete-account', f.token)).status, 200);
    assertEquals((await DB`select count(*)::int as n from public.founder_seats`)[0].n, 2);
    assertEquals((await DB`select user_id from public.founder_seats where seat_no = 2`)[0].user_id, null);
  } finally {
    await founderCapacity(0);
  }
}});

Deno.test({ name: 'Founders: accounts 999, 1000 and 1001; founders keep Pro once all seats are gone', ...opts, async fn() {
  await DB`delete from public.founder_seats`;
  await DB`insert into public.founder_seats (seat_no, user_id) select g, null from generate_series(1, 998) g`;
  await founderCapacity(1000);
  try {
    const u999 = await newUser('seat999');
    const u1000 = await newUser('seat1000');
    const u1001 = await newUser('seat1001');
    assertEquals(await seatOf(u999.id), 999);
    assertEquals(await seatOf(u1000.id), 1000);
    assertEquals(await seatOf(u1001.id), null, 'account 1001 gets no founder seat');
    assertEquals((await callJson('entitlement', u1001.token)).body.tier, 'free');
    assertEquals((await callJson('food-scan', u1001.token, { image: JPEG })).status, 403, 'account 1001 sees the paywall');
    assertEquals(await fetch(`${BASE}/functions/v1/founders`).then((r) => r.json()), { capacity: 1000, taken: 1000, remaining: 0 });
    const later = await newUser('seat-later');
    assertEquals((await callJson('entitlement', later.token)).body.tier, 'free');
    const keep = await callJson('entitlement', u1000.token);
    assertEquals([keep.body.tier, keep.body.source, keep.body.founderSeat], ['pro', 'founder', 1000], 'founder keeps Pro after the seats are gone');
  } finally {
    await founderCapacity(0);
  }
}});

Deno.test({ name: 'Founders: parallel sign-ups never exceed the seats or double-assign them', ...opts, async fn() {
  await DB`delete from public.founder_seats`;
  await DB`insert into public.founder_seats (seat_no, user_id) select g, null from generate_series(1, 990) g`;
  await founderCapacity(1000);
  try {
    const users = await Promise.all(Array.from({ length: 25 }, (_, i) => newUser(`race${i}`)));
    const seats = (await Promise.all(users.map((u) => seatOf(u.id)))).filter((s) => s !== null) as number[];
    assertEquals(seats.length, 10, `exactly the 10 remaining seats: ${seats}`);
    assertEquals(new Set(seats).size, 10);
    assertEquals(Math.min(...seats), 991);
    assertEquals(Math.max(...seats), 1000);
    assertEquals((await DB`select count(*)::int as n from public.founder_seats`)[0].n, 1000);
    // Parallel entitlement checks for the losers do not create seats either.
    const losers = users;
    await Promise.all(losers.map((u) => callJson('entitlement', u.token)));
    assertEquals((await DB`select count(*)::int as n from public.founder_seats`)[0].n, 1000);

    // 60 accounts confirmed at the same moment over 30 connections, 20 seats left.
    await DB`delete from public.founder_seats where seat_no > 980`;
    const pending = await Promise.all(Array.from({ length: 60 }, (_, i) => rawUser(`burst${i}`, { confirmed: false })));
    const pool = postgres(Deno.env.get('SUPABASE_DB_URL') ?? 'postgres://postgres@127.0.0.1:54322/postgres', { prepare: false, max: 30 });
    try {
      await Promise.all(pending.map((id) => pool`update auth.users set email_confirmed_at = now() where id = ${id}`));
    } finally {
      await pool.end();
    }
    const burst = await DB`select seat_no from public.founder_seats where user_id = any(${pending}) order by seat_no`;
    assertEquals(burst.length, 20, 'exactly the 20 remaining seats');
    assertEquals(burst.map((r) => r.seat_no), Array.from({ length: 20 }, (_, i) => 981 + i), 'gap-free, no duplicates');
    assertEquals((await DB`select count(*)::int as n from public.founder_seats`)[0].n, 1000);

    // A verification trigger that was missed is caught up by the entitlement check (same rules).
    await DB`delete from public.founder_seats where seat_no = 1000`;
    const late = await newUser('late');
    await DB`delete from public.founder_seats where user_id = ${late.id}`;
    assertEquals(await seatOf(late.id), null);
    const ent = await callJson('entitlement', late.token);
    assertEquals([ent.body.source, ent.body.founderSeat], ['founder', 1000]);
  } finally {
    await founderCapacity(0);
  }
}});

Deno.test({ name: 'Pro sources: paid before test before founder', ...opts, async fn() {
  await DB`delete from public.founder_seats`;
  await founderCapacity(1000);
  try {
    const u = await newUser('sources');
    assertEquals((await callJson('entitlement', u.token)).body.source, 'founder');
    await control({ testers: u.id });
    assertEquals((await callJson('entitlement', u.token)).body.source, 'test');
    await proSubscriber(u.id, future(30));
    await webhook({ type: 'INITIAL_PURCHASE', app_user_id: u.id, entitlement_ids: ['pro'] });
    const paid = await callJson('entitlement', u.token);
    assertEquals([paid.body.source, paid.body.founderSeat], ['store', null]);
  } finally {
    await control({ testers: '' });
    await founderCapacity(0);
  }
}});

Deno.test({ name: 'coach streams replies and only sends consented context', ...opts, async fn() {
  const u = await newUser('coach');
  await proSubscriber(u.id, future(30));
  await callJson('entitlement', u.token);
  await control({ scenario: 'ok', reset: true });
  const res = await call('coach', u.token, { stream: true, language: 'fr', messages: [{ role: 'assistant', content: 'ignored lead' }, { role: 'user', content: 'Plan my day' }], context: { goals: ['habits'] } });
  assertEquals(res.headers.get('content-type'), 'text/event-stream');
  const text = await res.text();
  const events = text.split('\n\n').filter(Boolean).map((l) => JSON.parse(l.replace(/^data: /, '')));
  assert(events.length > 2);
  assertEquals(events[events.length - 1].t, 'end');
  assert(events.filter((e) => e.t === 'd').map((e) => e.v).join('').startsWith('Try a simple plan'));
  const sent = (await (await fetch(`${BASE}/mock/control`)).json()).lastRequest;
  assertEquals(sent.messages.length, 1, 'conversation starts with the user');
  assert(sent.messages[0].content.includes('<app_context>'));
  assert(sent.system.includes('Reply in French'));
  const plain = await callJson('coach', u.token, { messages: [{ role: 'user', content: 'Hello' }] });
  assertEquals(plain.status, 200);
  assert(plain.body.reply.length > 10);
  await control({ reset: true });
  await callJson('coach', u.token, { messages: [{ role: 'user', content: 'No context please' }] });
  const noCtx = (await (await fetch(`${BASE}/mock/control`)).json()).lastRequest;
  assert(!noCtx.messages[0].content.includes('<app_context>'));
}});

Deno.test({ name: 'password reset with emailed code, then sign in with the new password', ...opts, async fn() {
  if (!MAIL_DIR) return console.warn('MAIL_DIR not set: skipped');
  const u = await newUser('reset');
  const c = client();
  const { error } = await c.auth.resetPasswordForEmail(u.email);
  assertEquals(error, null);
  let code = '';
  for (let i = 0; i < 40 && !code; i++) {
    await new Promise((r) => setTimeout(r, 250));
    for (const f of Deno.readDirSync(MAIL_DIR)) {
      if (!f.name.includes(u.email.replace('@', '_at_'))) continue;
      const body = Deno.readTextFileSync(`${MAIL_DIR}/${f.name}`).replace(/=\r?\n/g, '');
      code = body.match(/>(\d{6})</)?.[1] ?? '';
    }
  }
  assert(code, 'reset email with code received');
  const v = await c.auth.verifyOtp({ email: u.email, token: code, type: 'recovery' });
  assertEquals(v.error, null);
  assertEquals((await c.auth.updateUser({ password: 'New-passw0rd-123' })).error, null);
  assertNotEquals((await client().auth.signInWithPassword({ email: u.email, password: 'Str0ng-passw0rd' })).error, null, 'old password rejected');
  assertEquals((await client().auth.signInWithPassword({ email: u.email, password: 'New-passw0rd-123' })).error, null, 'new password works');
}});

Deno.test({ name: 'account deletion removes files, records and the login', ...opts, async fn() {
  const u = await newUser('delete');
  await callJson('sync', u.token, { cursor: 0, changes: [change('weight', 'w', { date: '2026-10-25', kg: 70 }, '2026-10-25T10:00:00.000Z')] });
  const up = await u.c.storage.from('progress-photos').upload(`${u.id}/p1.jpg`, new Uint8Array([1, 2, 3]), { contentType: 'image/jpeg' });
  assertEquals(up.error, null);
  const other = await u.c.storage.from('progress-photos').upload(`not-me/p1.jpg`, new Uint8Array([1]), { contentType: 'image/jpeg' });
  assertNotEquals(other.error, null, 'cannot upload outside own folder');

  assertEquals((await callJson('delete-account', u.token)).status, 200);
  const rows = await DB`select count(*)::int as n from public.user_records where user_id = ${u.id}`;
  assertEquals(rows[0].n, 0);
  const users = await DB`select count(*)::int as n from auth.users where id = ${u.id}`;
  assertEquals(users[0].n, 0);
  const files = (await (await fetch(`${BASE}/mock/control`)).json()).files as string[];
  assert(!files.some((f) => f.includes(u.id)), 'photo files removed');
  assertNotEquals((await client().auth.signInWithPassword({ email: u.email, password: 'Str0ng-passw0rd' })).error, null);
  assertEquals((await callJson('sync', u.token)).status, 401, 'old session no longer works');
}});

Deno.test({ name: 'cleanup', ...opts, async fn() {
  await DB.end();
} });
